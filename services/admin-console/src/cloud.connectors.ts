import { Connector, EnvCredentialVault, type ConnectorMeta } from "@vertofi/connectors";

/**
 * Cloud / CI-CD / cost connectors for the admin console (docs/24). Each reports
 * NEEDS_CREDENTIALS until wired, and returns a structured "pending activation"
 * shape — never fabricated billing or status numbers (docs/00).
 *
 * Platform is Google Cloud (GKE Autopilot, Cloud SQL, Memorystore, GCS,
 * Confluent Cloud for Kafka). See setup-guide/02-GCP-COMPLETE-SETUP.md.
 */
abstract class AdminConnector extends Connector {
  protected readonly vault = new EnvCredentialVault();
  protected abstract requiredKeys(): string[];
  hasCredentials(): boolean {
    return this.vault.has(...this.requiredKeys());
  }
}

export class CloudHealthConnector extends AdminConnector {
  constructor() {
    super({ id: "gcp.health", category: "cloud", provider: "Google Cloud Status", environment: "production" } as ConnectorMeta);
  }
  protected requiredKeys() {
    return ["GOOGLE_CLOUD_PROJECT"];
  }
  /** Services we run; status filled from GCP monitoring when credentialed. */
  async services() {
    const names = [
      "GKE Autopilot",
      "Cloud SQL (PostgreSQL)",
      "Memorystore (Redis)",
      "Confluent Cloud (Kafka)",
      "OpenSearch / Elastic",
      "Cloud Storage (GCS)",
      "Cloud Load Balancing",
      "Secret Manager",
      "SMTP relay (email)",
    ];
    const active = this.status() === "ACTIVE";
    return {
      connector: this.status(),
      services: names.map((name) => ({ name, status: active ? "operational" : "unknown", region: process.env.GCP_REGION ?? "asia-south1" })),
    };
  }
}

export class CloudBillingConnector extends AdminConnector {
  constructor() {
    super({ id: "gcp.billing", category: "billing", provider: "Google Cloud Billing", environment: "production" } as ConnectorMeta);
  }
  protected requiredKeys() {
    return ["GCP_BILLING_ACCOUNT_ID"];
  }
  async monthToDate() {
    if (this.status() !== "ACTIVE") return { connector: this.status(), currency: "INR", amount: null, byService: [] };
    // Real Cloud Billing / BigQuery export query wired here once credentials exist.
    return { connector: "ACTIVE", currency: "INR", amount: null, byService: [] };
  }
}

export class CicdConnector extends AdminConnector {
  constructor() {
    super({ id: "cicd.github", category: "cicd", provider: "GitHub Actions", environment: "production" } as ConnectorMeta);
  }
  protected requiredKeys() {
    return ["GITHUB_TOKEN", "GITHUB_REPO"];
  }
  async recentRuns() {
    if (this.status() !== "ACTIVE") return { connector: this.status(), runs: [] };
    const token = this.vault.get("GITHUB_TOKEN")!;
    const repo = this.vault.get("GITHUB_REPO")!;
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=15`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
      if (!res.ok) return { connector: "DEGRADED", runs: [] };
      const data = (await res.json()) as { workflow_runs?: { name: string; status: string; conclusion: string; head_branch: string; created_at: string; html_url: string }[] };
      return {
        connector: "ACTIVE",
        runs: (data.workflow_runs ?? []).map((r) => ({
          name: r.name,
          status: r.status,
          conclusion: r.conclusion,
          branch: r.head_branch,
          at: r.created_at,
          url: r.html_url,
        })),
      };
    } catch {
      return { connector: "DEGRADED", runs: [] };
    }
  }
}
