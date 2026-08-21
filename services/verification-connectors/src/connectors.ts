import { Connector, EnvCredentialVault, type ConnectorMeta } from "@vertofi/connectors";

/**
 * Payroll / Credit-bureau / MCA verification connectors (docs/09). All report
 * NEEDS_CREDENTIALS until their partnership keys are provisioned. They expose
 * status + verify operations; real provider calls are wired in on activation.
 * No verification result is ever fabricated.
 */
abstract class VerifyConnector extends Connector {
  protected readonly vault = new EnvCredentialVault();
  protected abstract requiredKeys(): string[];
  hasCredentials(): boolean {
    return this.vault.has(...this.requiredKeys());
  }
}

export class PayrollConnector extends VerifyConnector {
  constructor() {
    super({ id: "payroll.keka", category: "payroll", provider: "Keka/GreytHR/RazorpayX", environment: "sandbox" } as ConnectorMeta);
  }
  protected requiredKeys() {
    return ["PAYROLL_API_KEY"];
  }
}

export class CreditConnector extends VerifyConnector {
  constructor() {
    super({ id: "credit.bureau", category: "credit", provider: "CIBIL/CRIF (via aggregator)", environment: "sandbox" } as ConnectorMeta);
  }
  protected requiredKeys() {
    return ["CREDIT_BUREAU_API_KEY"];
  }
}

export class McaConnector extends VerifyConnector {
  constructor() {
    super({ id: "mca.karza", category: "verification", provider: "Karza/Signzy/Surepass", environment: "sandbox" } as ConnectorMeta);
  }
  protected requiredKeys() {
    return ["MCA_API_KEY"];
  }
}
