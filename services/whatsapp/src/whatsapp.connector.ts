import { Injectable } from "@nestjs/common";
import { Connector, EnvCredentialVault, retry, type ConnectorMeta } from "@vertofi/connectors";
import { createLogger } from "@vertofi/observability";

const log = createLogger("whatsapp-connector");

export interface TemplateComponent {
  type: "body" | "header" | "button";
  parameters: Array<{ type: "text"; text: string } | { type: "currency"; currency: { fallback_value: string; code: string; amount_1000: number } }>;
  sub_type?: "url" | "quick_reply";
  index?: number;
}

/**
 * Meta WhatsApp Business connector (via Meta Cloud API) — docs/09, docs/10.
 * Inbound webhooks are accepted regardless (so messages are never lost); outbound
 * sends require credentials. NEEDS_CREDENTIALS → no fake sends.
 *
 * sendText()     → session message (user-initiated 24-hour window only)
 * sendTemplate() → pre-approved template message (works anytime, required for
 *                  proactive notifications like GST alerts, invoice reminders)
 */
@Injectable()
export class WhatsappConnector extends Connector {
  private readonly vault = new EnvCredentialVault();

  constructor() {
    const meta: ConnectorMeta = {
      id: "whatsapp.meta",
      category: "whatsapp",
      provider: "Meta WhatsApp Business API",
      environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
    };
    super(meta);
  }

  hasCredentials(): boolean {
    return this.vault.has("WHATSAPP_API_TOKEN", "WHATSAPP_PHONE_ID");
  }

  verifyToken(): string {
    return this.vault.get("WHATSAPP_VERIFY_TOKEN") ?? "";
  }

  private get apiBase(): string {
    const phoneId = this.vault.get("WHATSAPP_PHONE_ID")!;
    return `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  }

  private get authHeader(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.vault.get("WHATSAPP_API_TOKEN")!}`,
    };
  }

  /** Send a free-form text reply within the 24-hour session window. */
  async sendText(to: string, body: string): Promise<{ sent: boolean; status: string }> {
    if (this.status() !== "ACTIVE") return { sent: false, status: this.status() };
    try {
      await retry(async () => {
        const res = await fetch(this.apiBase, {
          method: "POST",
          headers: this.authHeader,
          body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          // 401/403 = bad/expired token or recipient not allowed. Retrying won't
          // help, so fail fast and surface it loudly instead of silently dropping.
          if (res.status === 401 || res.status === 403) {
            throw new WhatsAppAuthError(res.status, errText);
          }
          throw new Error(`whatsapp_http_${res.status}: ${errText}`);
        }
      }, { shouldRetry: (e) => !(e instanceof WhatsAppAuthError) });
    } catch (err) {
      if (err instanceof WhatsAppAuthError) {
        log.error({ status: err.httpStatus, body: err.body, to }, "WhatsApp send rejected by Meta — check access token / recipient allow-list");
        return { sent: false, status: "DEGRADED" };
      }
      throw err;
    }
    return { sent: true, status: "ACTIVE" };
  }

  /** Download inbound media (voice notes, images, PDFs) from Meta by media id. */
  async downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mime: string } | null> {
    if (this.status() !== "ACTIVE") return null;
    try {
      const meta = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
        headers: { Authorization: `Bearer ${this.vault.get("WHATSAPP_API_TOKEN")!}` },
      });
      if (!meta.ok) return null;
      const { url, mime_type } = (await meta.json()) as { url: string; mime_type: string };
      const file = await fetch(url, { headers: { Authorization: `Bearer ${this.vault.get("WHATSAPP_API_TOKEN")!}` } });
      if (!file.ok) return null;
      return { buffer: Buffer.from(await file.arrayBuffer()), mime: mime_type };
    } catch (err) {
      log.error({ err: String(err), mediaId }, "WhatsApp media download failed");
      return null;
    }
  }

  /**
   * Send a PDF (or other file) within the 24-hour session window: uploads the
   * media to Meta, then sends a document message referencing the media id.
   * Used to deliver generated invoices straight into the chat.
   */
  async sendDocument(to: string, file: Buffer, filename: string, caption?: string): Promise<{ sent: boolean; status: string }> {
    if (this.status() !== "ACTIVE") return { sent: false, status: this.status() };
    const phoneId = this.vault.get("WHATSAPP_PHONE_ID")!;
    try {
      const form = new FormData();
      form.append("messaging_product", "whatsapp");
      form.append("type", "application/pdf");
      form.append("file", new Blob([new Uint8Array(file)], { type: "application/pdf" }), filename);
      const up = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.vault.get("WHATSAPP_API_TOKEN")!}` },
        body: form,
      });
      if (!up.ok) throw new Error(`media_upload_http_${up.status}: ${await up.text().catch(() => "")}`);
      const { id } = (await up.json()) as { id: string };

      const res = await fetch(this.apiBase, {
        method: "POST",
        headers: this.authHeader,
        body: JSON.stringify({
          messaging_product: "whatsapp", to, type: "document",
          document: { id, filename, caption },
        }),
      });
      if (!res.ok) throw new Error(`document_send_http_${res.status}: ${await res.text().catch(() => "")}`);
      return { sent: true, status: "ACTIVE" };
    } catch (err) {
      log.error({ err: String(err), to, filename }, "WhatsApp document send failed");
      return { sent: false, status: "DEGRADED" };
    }
  }

  /**
   * GAP-2 fix: Send a pre-approved template message.
   * Required for ALL proactive outbound messages (GST reminders, invoice alerts,
   * payment received, BHS score, daily briefing). Without templates, Meta will
   * block messages sent outside the 24-hour session window.
   *
   * @param to           E.164 number (e.g. "919812345678")
   * @param templateName Exact name registered in Meta Business Manager
   * @param langCode     Template language (default: "en" or "en_IN")
   * @param components   Body/header/button variable substitutions
   */
  async sendTemplate(
    to: string,
    templateName: string,
    langCode: string = "en",
    components: TemplateComponent[] = [],
  ): Promise<{ sent: boolean; status: string }> {
    if (this.status() !== "ACTIVE") return { sent: false, status: this.status() };
    try {
      await retry(async () => {
        const res = await fetch(this.apiBase, {
          method: "POST",
          headers: this.authHeader,
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: templateName,
              language: { code: langCode },
              components: components.length > 0 ? components : undefined,
            },
          }),
        });
        if (!res.ok) {
          const err = await res.text().catch(() => res.status.toString());
          if (res.status === 401 || res.status === 403) {
            throw new WhatsAppAuthError(res.status, err);
          }
          throw new Error(`whatsapp_template_http_${res.status}: ${err}`);
        }
      }, { shouldRetry: (e) => !(e instanceof WhatsAppAuthError) });
    } catch (err) {
      if (err instanceof WhatsAppAuthError) {
        log.error({ status: err.httpStatus, body: err.body, to, template: templateName }, "WhatsApp template rejected by Meta — check access token / template approval / recipient allow-list");
        return { sent: false, status: "DEGRADED" };
      }
      throw err;
    }
    return { sent: true, status: "ACTIVE" };
  }

  /**
   * Helper: build a body component with text variables.
   * Matches the {{1}}, {{2}}, ... placeholders in your Meta template.
   */
  static bodyParams(...texts: string[]): TemplateComponent {
    return {
      type: "body",
      parameters: texts.map((text) => ({ type: "text" as const, text })),
    };
  }

  /**
   * Helper: build a URL button component (for CTA buttons in templates).
   * @param index button index (0-based)
   * @param urlSuffix the dynamic part appended to the button's base URL
   */
  static urlButton(index: number, urlSuffix: string): TemplateComponent {
    return {
      type: "button",
      sub_type: "url",
      index,
      parameters: [{ type: "text", text: urlSuffix }],
    };
  }
}

/**
 * Thrown when Meta rejects a send with 401/403 — typically an expired/invalid
 * access token, an unapproved template, or a recipient not on the test-number
 * allow-list. These are not transient, so callers fail fast (status DEGRADED)
 * rather than retrying and silently dropping the message.
 */
export class WhatsAppAuthError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly body: string,
  ) {
    super(`whatsapp_auth_${httpStatus}: ${body}`);
    this.name = "WhatsAppAuthError";
  }
}
