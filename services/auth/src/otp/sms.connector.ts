import { Injectable } from "@nestjs/common";
import { Connector, EnvCredentialVault, retry, type ConnectorMeta } from "@vertofi/connectors";
import { createLogger } from "@vertofi/observability";
import type { OtpPurpose } from "./otp.service.js";
import { msg91TemplateEnvKey } from "./otp-templates.js";

const log = createLogger("auth:sms");

/**
 * MSG91 SMS connector (docs/09) — provider-neutral, India-first.
 *
 * GCP has no first-party SMS service, so OTP SMS goes through MSG91 (TRAI/DLT
 * registered, the standard for Indian transactional SMS). This keeps the stack
 * cloud-agnostic — nothing here depends on AWS.
 *
 * DLT (TRAI requirement): register the DLT template + sender ID in the MSG91
 * dashboard, then set MSG91_SENDER_ID and MSG91_TEMPLATE_ID.
 *
 * Env (see setup-guide/02-GCP-COMPLETE-SETUP.md):
 *   MSG91_AUTH_KEY, MSG91_SENDER_ID, MSG91_TEMPLATE_ID
 *
 * When MSG91_AUTH_KEY is absent the connector reports NEEDS_CREDENTIALS.
 * In dev mode the OTP is logged so the flow stays testable without real SMS.
 */
@Injectable()
export class SmsConnector extends Connector {
  private readonly vault = new EnvCredentialVault();

  constructor() {
    const meta: ConnectorMeta = {
      id: "sms.msg91",
      category: "sms",
      provider: "MSG91",
      environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
    };
    super(meta);
  }

  hasCredentials(): boolean {
    const key = this.vault.get("MSG91_AUTH_KEY");
    const sender = this.vault.get("MSG91_SENDER_ID");
    const template = this.vault.get("MSG91_TEMPLATE_ID");
    if (!key || !sender || !template) return false;
    if (key === "NEEDS_CONFIGURATION" || sender === "NEEDS_CONFIGURATION" || template === "NEEDS_CONFIGURATION") {
      return false;
    }
    return true;
  }

  async sendOtp(mobile: string, code: string, purpose: OtpPurpose = "MFA"): Promise<void> {
    if (this.status() !== "ACTIVE") {
      // Never silently drop in prod — caller should failover (docs/06).
      if (process.env.NODE_ENV === "production") {
        throw new Error("sms_connector_not_ready");
      }
      log.warn({ mobile, code }, "MSG91 not configured — DEV ONLY: OTP logged, not sent");
      return;
    }

    // MSG91 expects a number without the leading "+" (country code + number).
    const normalized = mobile.replace(/^\+/, "").replace(/^0/, "");
    const recipient = normalized.length === 10 ? `91${normalized}` : normalized;

    // Per-purpose DLT template if registered, else the base template.
    const templateId =
      this.vault.get(msg91TemplateEnvKey(purpose)) ?? this.vault.get("MSG91_TEMPLATE_ID")!;

    await retry(async () => {
      const res = await fetch("https://control.msg91.com/api/v5/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: this.vault.get("MSG91_AUTH_KEY")!,
        },
        body: JSON.stringify({
          template_id: templateId,
          sender: this.vault.get("MSG91_SENDER_ID")!,
          mobile: recipient,
          otp: code,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`msg91_send_failed status=${res.status} body=${body.slice(0, 200)}`);
      }
      const data = (await res.json().catch(() => ({}))) as { type?: string; request_id?: string };
      log.info({ mobile: recipient, purpose, requestId: data.request_id, type: data.type }, "MSG91 OTP dispatched");
    });
  }
}
