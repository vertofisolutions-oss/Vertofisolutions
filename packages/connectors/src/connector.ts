/**
 * Connector framework (see docs/09-integrations-and-connectors.md).
 *
 * Every external integration (GST GSP, Account Aggregator, OpenAI, OCR,
 * WhatsApp, payments, ...) implements this interface so the platform is
 * provider-agnostic. When credentials are missing, status() returns
 * NEEDS_CREDENTIALS and the UI renders an empty/onboarding state.
 *
 * GOLDEN RULE: a connector NEVER returns fabricated business data. If it
 * cannot perform real work, it surfaces its status — it does not pretend.
 */
export type ConnectorStatus =
  | "ACTIVE" // credentials present, healthy
  | "NEEDS_CREDENTIALS" // not yet provisioned → UI shows activation CTA
  | "DEGRADED" // credentials present but provider unhealthy / circuit open
  | "DISABLED"; // intentionally turned off

export type ConnectorEnvironment = "sandbox" | "production";

export interface ConnectorHealth {
  status: ConnectorStatus;
  message?: string;
  checkedAt: string;
}

export interface ConnectorMeta {
  /** Stable id, e.g. "gst.mastersindia", "ai.openai". */
  id: string;
  category: string; // banking | gst | ocr | ai | payments | whatsapp | ...
  provider: string;
  environment: ConnectorEnvironment;
}

export abstract class Connector {
  protected constructor(readonly meta: ConnectorMeta) {}

  /** Whether required credentials are present (checked against the vault). */
  abstract hasCredentials(): boolean;

  /** Cheap status without a network call. */
  status(): ConnectorStatus {
    return this.hasCredentials() ? "ACTIVE" : "NEEDS_CREDENTIALS";
  }

  /** Live health probe (may call the provider). Default = derive from status. */
  async healthCheck(): Promise<ConnectorHealth> {
    return { status: this.status(), checkedAt: new Date().toISOString() };
  }

  /** Throw a typed error when code paths require an active connector. */
  protected assertActive(): void {
    if (this.status() !== "ACTIVE") {
      throw new ConnectorNotReadyError(this.meta.id, this.status());
    }
  }
}

export class ConnectorNotReadyError extends Error {
  constructor(
    readonly connectorId: string,
    readonly connectorStatus: ConnectorStatus,
  ) {
    super(`Connector "${connectorId}" is not ready (status=${connectorStatus})`);
    this.name = "ConnectorNotReadyError";
  }
}
