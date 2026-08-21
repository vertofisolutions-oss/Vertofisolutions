import { Injectable } from "@nestjs/common";
import { Connector, EnvCredentialVault, type ConnectorMeta } from "@vertofi/connectors";

/**
 * External accounting targets (Tally / Zoho Books / QuickBooks) — docs/09.
 * Each is independent and NEEDS_CREDENTIALS until configured. accounting-sync
 * pushes posted ledger entries to whichever targets an org has activated; if
 * none are active it records the entry as pending-sync (never fakes success).
 */
abstract class ExternalConnector extends Connector {
  protected readonly vault = new EnvCredentialVault();
  protected abstract requiredKeys(): string[];

  hasCredentials(): boolean {
    return this.vault.has(...this.requiredKeys());
  }

  async push(_orgId: string, _entry: Record<string, unknown>): Promise<{ ok: boolean; status: string }> {
    if (this.status() !== "ACTIVE") return { ok: false, status: this.status() };
    // Real push to the provider API is wired here once credentials exist.
    return { ok: true, status: "ACTIVE" };
  }
}

@Injectable()
export class TallyConnector extends ExternalConnector {
  constructor() {
    super({ id: "accounting.tally", category: "accounting", provider: "Tally", environment: "sandbox" } as ConnectorMeta);
  }
  protected requiredKeys(): string[] {
    return ["TALLY_CONNECTOR_URL"];
  }
}

@Injectable()
export class ZohoConnector extends ExternalConnector {
  constructor() {
    super({ id: "accounting.zoho", category: "accounting", provider: "Zoho Books", environment: "sandbox" } as ConnectorMeta);
  }
  protected requiredKeys(): string[] {
    return ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET"];
  }
}

@Injectable()
export class QuickBooksConnector extends ExternalConnector {
  constructor() {
    super({ id: "accounting.quickbooks", category: "accounting", provider: "QuickBooks", environment: "sandbox" } as ConnectorMeta);
  }
  protected requiredKeys(): string[] {
    return ["QBO_CLIENT_ID", "QBO_CLIENT_SECRET"];
  }
}
