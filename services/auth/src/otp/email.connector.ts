import { Injectable } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";
import { Connector, EnvCredentialVault, retry, type ConnectorMeta } from "@vertofi/connectors";
import { createLogger } from "@vertofi/observability";
import type { OtpPurpose } from "./otp.service.js";
import { emailOtpTemplate } from "./otp-templates.js";

const log = createLogger("auth:email");

/**
 * SMTP email connector (docs/09) — provider-neutral, no cloud lock-in.
 * Works with any SMTP relay: SendGrid, Mailgun, Brevo, Amazon SES SMTP, or
 * Google Workspace / Gmail SMTP. On GCP the recommended relay is SendGrid
 * (a GCP Marketplace partner) or any transactional-email SMTP host.
 *
 * Env (see setup-guide/02-GCP-COMPLETE-SETUP.md):
 *   SMTP_HOST, SMTP_PORT (587 STARTTLS / 465 TLS), SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Same NEEDS_CREDENTIALS semantics as SMS: when unconfigured the connector
 * reports its status honestly and (dev only) logs the code — never fakes a send.
 */
@Injectable()
export class EmailConnector extends Connector {
  private readonly vault = new EnvCredentialVault();
  private transporter: Transporter | null = null;

  constructor() {
    const meta: ConnectorMeta = {
      id: "email.smtp",
      category: "email",
      provider: process.env.SMTP_HOST ?? "SMTP",
      environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
    };
    super(meta);
  }

  hasCredentials(): boolean {
    const host = this.vault.get("SMTP_HOST");
    const user = this.vault.get("SMTP_USER");
    const pass = this.vault.get("SMTP_PASS");
    const from = this.vault.get("SMTP_FROM");
    if (!host || !user || !pass || !from) return false;
    if (host === "NEEDS_CONFIGURATION" || user === "NEEDS_CONFIGURATION" || pass === "NEEDS_CONFIGURATION" || from === "NEEDS_CONFIGURATION") {
      return false;
    }
    return true;
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const port = Number(this.vault.get("SMTP_PORT") ?? 587);
      this.transporter = nodemailer.createTransport({
        host: this.vault.get("SMTP_HOST")!,
        port,
        secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
        auth: {
          user: this.vault.get("SMTP_USER")!,
          pass: this.vault.get("SMTP_PASS")!,
        },
      });
    }
    return this.transporter;
  }

  async sendOtp(email: string, code: string, purpose: OtpPurpose = "MFA"): Promise<void> {
    if (this.status() !== "ACTIVE") {
      // In production never silently drop an OTP — the caller must failover.
      // Outside production, log the code so the flow stays testable locally
      // (never the code in prod).
      if (process.env.NODE_ENV === "production") {
        throw new Error("email_connector_not_ready");
      }
      log.warn({ email, code }, "SMTP not configured — DEV ONLY: email OTP logged, not sent");
      return;
    }

    const tpl = emailOtpTemplate(purpose, code);
    await retry(async () => {
      const info = await this.getTransporter().sendMail({
        from: this.vault.get("SMTP_FROM")!,
        to: email,
        subject: tpl.subject,
        text: tpl.text,
        html: tpl.html,
      });
      log.info({ email, purpose, messageId: info.messageId }, "email OTP dispatched via SMTP");
    });
  }
}
