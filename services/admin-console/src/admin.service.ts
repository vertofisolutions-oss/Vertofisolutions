import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { Redis } from "ioredis";
import { PgService } from "@vertofi/nest-common";
import { setSystemContext, type Principal } from "@vertofi/tenancy";
import { TABLES, tableKeys, tableGroups, type TableDef } from "./table-registry.js";
import { CloudHealthConnector, CloudBillingConnector, CicdConnector } from "./cloud.connectors.js";
import { StorageConnector } from "./storage.connector.js";

// Rough OpenAI blended rate (USD per 1K tokens) for a real cost estimate from
// the actual metered token counts. Configurable; never a fabricated figure.
const USD_PER_1K_TOKENS = Number(process.env.AI_USD_PER_1K_TOKENS ?? 0.0006);

@Injectable()
export class AdminService {
  private readonly redis: Redis;
  constructor(
    private readonly pg: PgService,
    readonly cloudHealth: CloudHealthConnector,
    readonly cloudBilling: CloudBillingConnector,
    readonly cicd: CicdConnector,
    private readonly storage: StorageConnector,
  ) {
    this.redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", { lazyConnect: true, maxRetriesPerRequest: 2 });
  }

  private async audit(adminId: string, action: string, target?: string, targetId?: string, detail?: unknown) {
    await this.pg.query(
      "INSERT INTO adminconsole.admin_access_log (admin_id, action, target, target_id, detail) VALUES ($1,$2,$3,$4,$5)",
      [adminId, action, target ?? null, targetId ?? null, detail ? JSON.stringify(detail) : null],
    );
  }

  // ── Dashboard overview ──────────────────────────────────────────────
  async overview(admin: Principal) {
    await this.audit(admin.userId, "VIEW_OVERVIEW");
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const orgs = (await c.query<{ n: string }>("SELECT count(*) n FROM tenant.organizations")).rows[0]!.n;
      const active = (await c.query<{ n: string }>("SELECT count(*) n FROM billing.subscriptions WHERE status='ACTIVE'")).rows[0]!.n;
      const trials = (await c.query<{ n: string }>("SELECT count(*) n FROM billing.subscriptions WHERE status='TRIAL'")).rows[0]!.n;
      const openEx = (await c.query<{ n: string }>("SELECT count(*) n FROM exception.exceptions WHERE status='OPEN'")).rows[0]!.n;
      const openLg = (await c.query<{ n: string }>("SELECT count(*) n FROM lifeguard.lifeguard_cases WHERE status='OPEN'")).rows[0]!.n;
      // REAL subscription mix (by org plan) + REAL BHS score distribution.
      const planMix = (await c.query("SELECT plan AS name, count(*)::int AS value FROM tenant.organizations GROUP BY plan ORDER BY value DESC")).rows;
      const bhsDistribution = (await c.query(
        `SELECT bucket AS range, count(*)::int AS count FROM (
           SELECT CASE WHEN score IS NULL THEN 'N/A'
                       WHEN score <= 20 THEN '0-20' WHEN score <= 40 THEN '21-40'
                       WHEN score <= 60 THEN '41-60' WHEN score <= 80 THEN '61-80'
                       ELSE '81-100' END AS bucket
           FROM bhs.bhs_scores
         ) s GROUP BY bucket ORDER BY bucket`,
      )).rows;
      return {
        organizations: Number(orgs),
        activeSubscriptions: Number(active),
        trials: Number(trials),
        openExceptions: Number(openEx),
        openLifeguardCases: Number(openLg),
        planMix,
        bhsDistribution,
        connectors: { cloud: this.cloudHealth.status(), cloudBilling: this.cloudBilling.status(), cicd: this.cicd.status() },
      };
    });
  }

  /** REAL platform time-series for the observability charts (no simulated data). */
  async metrics(admin: Principal) {
    await this.audit(admin.userId, "VIEW_METRICS");
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const orgsByMonth = (await c.query(
        `SELECT to_char(date_trunc('month', created_at), 'Mon YY') AS label, count(*)::int AS orgs
           FROM tenant.organizations WHERE created_at > now() - interval '12 months'
           GROUP BY date_trunc('month', created_at) ORDER BY date_trunc('month', created_at)`,
      )).rows;
      const revenueByMonth = (await c.query(
        `SELECT to_char(date_trunc('month', created_at), 'Mon YY') AS label, coalesce(sum(amount),0)::float AS revenue
           FROM billing.payments WHERE status='CAPTURED' AND created_at > now() - interval '12 months'
           GROUP BY date_trunc('month', created_at) ORDER BY date_trunc('month', created_at)`,
      )).rows;
      const signupsByWeek = (await c.query(
        `SELECT 'W' || to_char(date_trunc('week', created_at), 'IW') AS label, count(*)::int AS signups
           FROM auth.users WHERE created_at > now() - interval '8 weeks'
           GROUP BY date_trunc('week', created_at) ORDER BY date_trunc('week', created_at)`,
      )).rows;
      return { orgsByMonth, revenueByMonth, signupsByWeek };
    });
  }

  // ── Billing dues ────────────────────────────────────────────────────
  async billingDues(admin: Principal) {
    await this.audit(admin.userId, "VIEW_DUES");
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const r = await c.query(
        `SELECT s.org_id, o.legal_name, s.plan, s.amount, s.status, s.trial_ends_at, s.current_period_end
           FROM billing.subscriptions s
           LEFT JOIN tenant.organizations o ON o.id = s.org_id
          WHERE s.status = 'PAST_DUE'
             OR (s.status = 'TRIAL' AND s.trial_ends_at IS NOT NULL AND s.trial_ends_at < now())
          ORDER BY s.current_period_end NULLS FIRST
          LIMIT 500`,
      );
      const totalDue = r.rows.reduce((sum, x) => sum + Number((x as { amount: string }).amount ?? 0), 0);
      return { totalDue, currency: "INR", dues: r.rows };
    });
  }

  // ── AI usage (real metered token counts from Redis) ─────────────────
  async aiUsage(admin: Principal, period?: string) {
    await this.audit(admin.userId, "VIEW_AI_USAGE");
    const p = period ?? new Date().toISOString().slice(0, 7);
    const result: { orgId: string; tokens: number; estimatedUsd: number }[] = [];
    let total = 0;
    try {
      const stream = this.redis.scanStream({ match: `ai:usage:*:${p}`, count: 200 });
      const keys: string[] = [];
      for await (const batch of stream) keys.push(...(batch as string[]));
      for (const key of keys) {
        const tokens = Number((await this.redis.hget(key, "tokens")) ?? 0);
        const orgId = key.split(":")[2] ?? "unknown";
        total += tokens;
        result.push({ orgId, tokens, estimatedUsd: +((tokens / 1000) * USD_PER_1K_TOKENS).toFixed(4) });
      }
    } catch {
      // Redis unreachable → return empty, never fabricated usage.
    }
    return {
      period: p,
      provider: "OpenAI",
      totalTokens: total,
      estimatedUsd: +((total / 1000) * USD_PER_1K_TOKENS).toFixed(2),
      ratePer1kUsd: USD_PER_1K_TOKENS,
      byOrg: result.sort((a, b) => b.tokens - a.tokens).slice(0, 200),
    };
  }

  // ── Risk register ───────────────────────────────────────────────────
  async risks(admin: Principal) {
    await this.audit(admin.userId, "VIEW_RISKS");
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const byCompliance = await c.query(
        "SELECT compliance_risk AS level, count(*) n FROM onboarding.onboarding_profiles WHERE compliance_risk IS NOT NULL GROUP BY compliance_risk",
      );
      const byCashflow = await c.query(
        "SELECT cashflow_risk AS level, count(*) n FROM onboarding.onboarding_profiles WHERE cashflow_risk IS NOT NULL GROUP BY cashflow_risk",
      );
      const topRisk = await c.query(
        `SELECT op.org_id, o.legal_name, op.compliance_risk, op.cashflow_risk, op.confidence_score
           FROM onboarding.onboarding_profiles op
           LEFT JOIN tenant.organizations o ON o.id = op.org_id
          WHERE op.compliance_risk = 'HIGH' OR op.cashflow_risk = 'HIGH'
          ORDER BY op.confidence_score NULLS FIRST
          LIMIT 100`,
      );
      const openExceptions = (await c.query<{ n: string }>("SELECT count(*) n FROM exception.exceptions WHERE status='OPEN'")).rows[0]!.n;
      return {
        complianceRisk: byCompliance.rows,
        cashflowRisk: byCashflow.rows,
        openExceptions: Number(openExceptions),
        highRiskClients: topRisk.rows,
      };
    });
  }

  // ── Excel-style DB browser (column-level security enforced) ─────────
  listTables() {
    return tableKeys().map((key) => {
      const t = TABLES[key]!;
      return { key, label: t.label, group: t.group, schema: t.schema, table: t.table, columns: t.columns, editable: t.editable };
    });
  }

  /** Entities grouped by domain (Organizations, Billing, …) for the sidebar. */
  tableGroups() {
    return tableGroups();
  }

  /** Short-lived presigned URL to view any uploaded document (audited). */
  async viewDocument(admin: Principal, id: string) {
    const r = await this.pg.query<{ s3_key: string; filename: string; content_type: string }>(
      "SELECT s3_key, filename, content_type FROM document.documents WHERE id = $1",
      [id],
    );
    const doc = r[0];
    if (!doc?.s3_key) throw new BadRequestException("document_not_found");
    await this.audit(admin.userId, "VIEW_DOCUMENT", "document.documents", id, { filename: doc.filename });
    const url = await this.storage.presignGet(doc.s3_key);
    return { url, filename: doc.filename, contentType: doc.content_type };
  }

  private def(key: string): TableDef {
    const t = TABLES[key];
    if (!t) throw new BadRequestException("unknown_table");
    return t;
  }

  async getTable(admin: Principal, key: string, opts: { limit: number; offset: number; q?: string }) {
    const t = this.def(key);
    await this.audit(admin.userId, "VIEW_TABLE", `${t.schema}.${t.table}`, undefined, { q: opts.q, offset: opts.offset });
    const cols = t.columns.map((col) => `"${col}"`).join(", ");
    const order = t.orderBy ?? t.pk;
    const params: unknown[] = [];
    let where = "";
    if (opts.q && t.searchable) {
      params.push(`%${opts.q}%`);
      where = `WHERE "${t.searchable}" ILIKE $${params.length}`;
    }
    params.push(Math.min(opts.limit, 200), opts.offset);
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const rows = (
        await c.query(
          `SELECT ${cols} FROM ${t.schema}.${t.table} ${where} ORDER BY "${order}" DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
          params,
        )
      ).rows;
      const totalRow = await c.query<{ n: string }>(`SELECT count(*) n FROM ${t.schema}.${t.table} ${where}`, opts.q && t.searchable ? [params[0]] : []);
      return { key, columns: t.columns, editable: t.editable, pk: t.pk, total: Number(totalRow.rows[0]!.n), rows };
    });
  }

  async updateRow(admin: Principal, key: string, id: string, patch: Record<string, unknown>) {
    const t = this.def(key);
    const fields = Object.keys(patch).filter((k) => t.editable.includes(k));
    if (fields.length === 0) throw new ForbiddenException("no_editable_fields");
    const sets = fields.map((f, i) => `"${f}" = $${i + 2}`).join(", ");
    const values = fields.map((f) => patch[f]);
    await this.audit(admin.userId, "EDIT_ROW", `${t.schema}.${t.table}`, id, patch);
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const r = await c.query(
        `UPDATE ${t.schema}.${t.table} SET ${sets} WHERE "${t.pk}" = $1 RETURNING ${t.columns.map((col) => `"${col}"`).join(", ")}`,
        [id, ...values],
      );
      if (r.rows.length === 0) throw new BadRequestException("row_not_found");
      return { updated: r.rows[0] };
    });
  }

  // ── Cloud / CI-CD / cost ────────────────────────────────────────────
  /**
   * REAL cloud health — live-probes the services the admin-console can actually
   * reach (Cloud SQL via a SELECT, Redis via PING) and derives the rest from
   * actual runtime signals (we're serving this request ⇒ GKE is up; a bucket/
   * brokers env being set ⇒ that integration is configured). No fabricated
   * "operational" statuses.
   */
  async cloudStatus() {
    const region = process.env.GCP_REGION ?? "asia-south1";
    const probe = async (fn: () => Promise<unknown>): Promise<"operational" | "down"> => {
      try { await fn(); return "operational"; } catch { return "down"; }
    };
    const [db, redis] = await Promise.all([
      probe(() => this.pg.query("SELECT 1")),
      probe(async () => { await this.redis.ping(); }),
    ]);
    const cfg = (ok: boolean): "configured" | "not configured" => (ok ? "configured" : "not configured");
    const services = [
      { name: "GKE Autopilot", status: "operational" as const, region }, // serving this request
      { name: "Cloud SQL (PostgreSQL)", status: db, region },
      { name: "Memorystore (Redis)", status: redis, region },
      { name: "Cloud Storage (GCS)", status: cfg(!!(process.env.GCS_BUCKET ?? process.env.S3_BUCKET)), region },
      { name: "Confluent Cloud (Kafka)", status: cfg(!!process.env.KAFKA_BROKERS), region },
      { name: "Secret Manager", status: cfg(!!process.env.JWT_ACCESS_SECRET), region }, // ESO-injected ⇒ working
      { name: "SMTP relay (email)", status: cfg(!!process.env.SMTP_HOST), region },
    ];
    const degraded = services.some((s) => s.status === "down");
    return { connector: degraded ? "DEGRADED" : "ACTIVE", services };
  }
  cloudCost = () => this.cloudBilling.monthToDate();
  pipelines = () => this.cicd.recentRuns();

  async accessLog(admin: Principal) {
    await this.audit(admin.userId, "VIEW_ACCESS_LOG");
    const r = await this.pg.query(
      "SELECT admin_id, action, target, target_id, created_at FROM adminconsole.admin_access_log ORDER BY created_at DESC LIMIT 200",
    );
    return { log: r };
  }
}
