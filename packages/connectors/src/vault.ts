/**
 * Credential vault abstraction (see docs/09 & docs/15).
 *
 * In production secrets live in GCP Secret Manager and are projected into the
 * pod env by the External Secrets Operator (see vertofi-shared-* secrets).
 * Locally it reads from environment variables. Secrets are NEVER committed,
 * NEVER logged, and fetched at runtime. A blank/absent value means the
 * connector reports NEEDS_CREDENTIALS.
 */
export interface CredentialVault {
  get(key: string): string | undefined;
  /** True only if all keys are present and non-empty. */
  has(...keys: string[]): boolean;
}

export class EnvCredentialVault implements CredentialVault {
  get(key: string): string | undefined {
    const raw = process.env[key];
    if (raw === undefined) return undefined;
    // Trim surrounding whitespace/newlines. Secret-sync pipelines (e.g.
    // PowerShell piping into `gcloud secrets ... --data-file=-`) commonly append
    // a trailing CRLF, which silently breaks host names, auth keys, and — worse —
    // defeats exact-match placeholder checks like value === "NEEDS_CONFIGURATION".
    const v = raw.trim();
    return v.length > 0 ? v : undefined;
  }

  has(...keys: string[]): boolean {
    return keys.every((k) => this.get(k) !== undefined);
  }
}

/** Resilience helper: exponential backoff with jitter (see docs/18). */
export async function retry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number; maxMs?: number; shouldRetry?: (err: unknown) => boolean } = {},
): Promise<T> {
  const retries = opts.retries ?? 4;
  const baseMs = opts.baseMs ?? 200;
  const maxMs = opts.maxMs ?? 5000;
  const shouldRetry = opts.shouldRetry ?? (() => true);
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      // Non-recoverable errors (e.g. auth 401/403) abort immediately.
      if (!shouldRetry(err) || attempt > retries) throw err;
      const backoff = Math.min(maxMs, baseMs * 2 ** attempt);
      const jitter = Math.random() * backoff * 0.3;
      await new Promise((r) => setTimeout(r, backoff + jitter));
    }
  }
}

/** Minimal circuit breaker around a flaky dependency (see docs/18). */
export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private state: "closed" | "open" | "half" = "closed";

  constructor(
    private readonly threshold = 5,
    private readonly cooldownMs = 30_000,
  ) {}

  get isOpen(): boolean {
    if (this.state === "open" && Date.now() - this.openedAt > this.cooldownMs) {
      this.state = "half";
    }
    return this.state === "open";
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen) throw new Error("circuit_open");
    try {
      const result = await fn();
      this.failures = 0;
      this.state = "closed";
      return result;
    } catch (err) {
      this.failures += 1;
      if (this.failures >= this.threshold) {
        this.state = "open";
        this.openedAt = Date.now();
      }
      throw err;
    }
  }
}
