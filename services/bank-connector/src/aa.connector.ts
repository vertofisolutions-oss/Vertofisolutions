import { Injectable } from "@nestjs/common";
import { Connector, EnvCredentialVault, type ConnectorMeta } from "@vertofi/connectors";

/**
 * Account Aggregator connector (Setu/Perfios/Finvu) — docs/09.
 * Until AA partnership credentials are provisioned it reports
 * NEEDS_CREDENTIALS; the UI shows a "Connect bank" empty/onboarding state and
 * NO transactions are fabricated. Real consent + FI-data flows are wired here
 * once credentials land, emitting `bank.transaction` events.
 */
@Injectable()
export class AaConnector extends Connector {
  private readonly vault = new EnvCredentialVault();

  constructor() {
    const meta: ConnectorMeta = {
      id: "banking.aa",
      category: "banking",
      provider: "Account Aggregator (Setu/Perfios/Finvu)",
      environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
    };
    super(meta);
  }

  hasCredentials(): boolean {
    return this.vault.has("AA_BASE_URL", "AA_CLIENT_ID", "AA_CLIENT_SECRET");
  }

  /** Begin a consent flow — returns a redirect URL when active. */
  async startConsent(_orgId: string): Promise<{ status: string; consentUrl?: string }> {
    if (this.status() !== "ACTIVE") return { status: this.status() };
    // Real AA consent request wired here once credentials exist.
    return { status: "ACTIVE", consentUrl: `${this.vault.get("AA_BASE_URL")}/consent` };
  }
}
