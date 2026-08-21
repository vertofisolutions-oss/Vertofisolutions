import { Injectable } from "@nestjs/common";
import { PgService } from "@vertofi/nest-common";
import { setSystemContext, type Principal } from "@vertofi/tenancy";
import type { EventEnvelope } from "@vertofi/events";

const AI_URL = process.env.AI_GATEWAY_URL ?? "http://localhost:4010";

@Injectable()
export class LegalService {
  constructor(private readonly pg: PgService) {}

  /** Resolve the orgs a lawyer may see (CASES_ONLY grants). */
  private async lawyerOrgs(lawyerId: string): Promise<string[]> {
    const r = await this.pg.query<{ org_id: string }>(
      `SELECT org_id FROM access.access_grants
        WHERE grantee_id=$1 AND scope='CASES_ONLY' AND status='ACTIVE'
          AND (expires_at IS NULL OR expires_at > now())`,
      [lawyerId],
    );
    return r.map((x) => x.org_id);
  }

  // ── Terms & Conditions / Privacy Policy consent (legally auditable) ──────
  /** The current published version of each legal document (TERMS, PRIVACY). */
  async currentDocuments() {
    const r = await this.pg.query<{ id: string; doc_type: string; version: string; title: string; url: string; effective_at: string }>(
      `SELECT DISTINCT ON (doc_type) id, doc_type, version, title, url, effective_at
         FROM legal.legal_documents WHERE published
         ORDER BY doc_type, effective_at DESC`,
    );
    return { documents: r };
  }

  /**
   * Record a user's acceptance of one or more document versions. Append-only —
   * every acceptance (IP + user-agent evidence, bound to the authenticated user
   * and the exact version) is preserved for dispute resolution. Idempotent per
   * (user, document) so a double-submit doesn't duplicate.
   */
  async accept(
    userId: string,
    items: { documentId: string }[],
    meta: { orgId?: string; ip?: string; ua?: string; method?: string },
  ) {
    const out: { documentId: string; version: string; recorded: boolean }[] = [];
    for (const it of items) {
      const doc = (await this.pg.query<{ id: string; doc_type: string; version: string }>(
        "SELECT id, doc_type, version FROM legal.legal_documents WHERE id=$1 AND published",
        [it.documentId],
      ))[0];
      if (!doc) continue;
      const exists =
        (await this.pg.query("SELECT 1 FROM legal.document_acceptances WHERE user_id=$1 AND document_id=$2 LIMIT 1", [userId, doc.id])).length > 0;
      if (!exists) {
        await this.pg.query(
          `INSERT INTO legal.document_acceptances (user_id, org_id, document_id, doc_type, version, ip, user_agent, method)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [userId, meta.orgId ?? null, doc.id, doc.doc_type, doc.version, meta.ip ?? null, meta.ua ?? null, meta.method ?? "CHECKBOX"],
        );
      }
      out.push({ documentId: doc.id, version: doc.version, recorded: !exists });
    }
    return { accepted: out };
  }

  /** Has the user accepted the CURRENT published version of every document? */
  async hasAcceptedCurrent(userId: string): Promise<boolean> {
    const r = await this.pg.query<{ pending: number }>(
      `SELECT count(*)::int pending FROM (
         SELECT DISTINCT ON (doc_type) id FROM legal.legal_documents WHERE published ORDER BY doc_type, effective_at DESC
       ) cur
       WHERE NOT EXISTS (SELECT 1 FROM legal.document_acceptances a WHERE a.user_id=$1 AND a.document_id=cur.id)`,
      [userId],
    );
    return Number(r[0]?.pending ?? 1) === 0;
  }

  /** Create a legal case when Lifeguard escalates a notice/fraud (docs/10). */
  async ingestEscalation(env: EventEnvelope<Record<string, unknown>>): Promise<void> {
    const orgId = env.org_id;
    if (!orgId) return;
    const category = String(env.data.category ?? "OTHER");
    await this.pg.transaction(async (c) => {
      await setSystemContext(c);
      await c.query(
        `INSERT INTO legal.legal_cases (org_id, type, title, source_case_id)
         VALUES ($1,$2,$3,$4)`,
        [orgId, category, `Escalated ${category.replaceAll("_", " ")}`, env.data.case_id ?? null],
      );
    });
  }

  async listForLawyer(lawyer: Principal, status = "OPEN") {
    const orgs = lawyer.role === "ADMIN" ? null : await this.lawyerOrgs(lawyer.userId);
    if (orgs && orgs.length === 0) return [];
    const params: unknown[] = [status];
    let where = "status=$1";
    if (orgs) {
      where += " AND org_id = ANY($2::uuid[])";
      params.push(orgs);
    }
    // legal_cases has RLS → run under system context (SQL constrains to granted orgs).
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const r = await c.query(`SELECT * FROM legal.legal_cases WHERE ${where} ORDER BY created_at DESC LIMIT 200`, params);
      return r.rows;
    });
  }

  /** AI legal analysis of a case (docs/03 #7 — legal AI analytics). */
  async analyze(lawyer: Principal, caseId: string, notice: string) {
    const orgs = lawyer.role === "ADMIN" ? null : await this.lawyerOrgs(lawyer.userId);
    const rows = await this.pg.transaction(async (cl) => {
      await setSystemContext(cl);
      return (
        await cl.query<{ id: string; org_id: string; type: string }>(
          "SELECT id, org_id, type FROM legal.legal_cases WHERE id=$1",
          [caseId],
        )
      ).rows;
    });
    const c = rows[0];
    if (!c || (orgs && !orgs.includes(c.org_id))) return { error: "not_authorized" };

    let analysis: Record<string, unknown> = { degraded: true, summary: "AI analysis unavailable; manual review required." };
    try {
      const res = await fetch(`${AI_URL}/ai/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "analyze",
          plan: "PRO",
          json: true,
          prompt: `Analyze this Indian tax/GST legal notice for a lawyer. Return JSON {summary, key_dates, suggested_actions, risk}. Notice: ${notice}`,
        }),
      });
      const body = (await res.json()) as { degraded?: boolean; content?: Record<string, unknown> };
      if (!body.degraded && body.content) analysis = body.content;
    } catch {
      /* keep degraded fallback */
    }
    await this.pg.transaction(async (cl) => {
      await setSystemContext(cl);
      await cl.query("UPDATE legal.legal_cases SET ai_analysis=$2, updated_at=now() WHERE id=$1", [caseId, JSON.stringify(analysis)]);
    });
    return { caseId, analysis };
  }
}
