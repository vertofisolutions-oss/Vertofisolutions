import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import { PgService, PgOutboxStore, assertGrantedScope } from "@vertofi/nest-common";
import { toOutboxEnvelope, type EventEnvelope } from "@vertofi/events";
import { setRlsContext, setSystemContext, type EffectiveScope, type Principal } from "@vertofi/tenancy";

const AMOUNT_TOLERANCE = 1.0; // ₹ tolerance for fuzzy match
const DATE_WINDOW_DAYS = 5;

function scopeFor(p: Principal, orgId: string): EffectiveScope {
  if (p.role === "ADMIN") return { orgIds: "*", permission: "EDIT", scope: "FULL" };
  return { orgIds: [orgId], permission: "VIEW", scope: "FULL" };
}

interface Candidate {
  id: string;
  amount: string;
  item_date: string | null;
  invoice_no: string | null;
}

@Injectable()
export class ReconciliationService {
  private readonly outbox: PgOutboxStore;
  constructor(private readonly pg: PgService) {
    this.outbox = new PgOutboxStore(pg, "reconciliation");
  }

  /** Ingest a categorized item from the pipeline, then attempt a match. */
  async ingestPendingItem(env: EventEnvelope<Record<string, unknown>>): Promise<void> {
    const d = env.data;
    const orgId = env.org_id;
    if (!orgId || d.amount == null) return;
    await this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const r = await c.query<{ id: string }>(
        `INSERT INTO reconciliation.pending_items (org_id, document_id, extraction_id, vendor, category, amount, invoice_no, item_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [orgId, d.document_id ?? null, d.extraction_id ?? null, d.vendor ?? null, d.category ?? null, d.amount, d.invoice_no ?? null, d.invoice_date ?? null],
      );
      await this.tryMatchPending(c, orgId, r.rows[0]!.id);
    });
  }

  /** Ingest a bank transaction, then attempt a match. */
  async ingestBankTxn(env: EventEnvelope<Record<string, unknown>>): Promise<void> {
    const d = env.data;
    const orgId = env.org_id;
    if (!orgId || d.amount == null) return;
    await this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const r = await c.query<{ id: string }>(
        `INSERT INTO reconciliation.bank_txns (org_id, ext_ref, amount, direction, txn_date, raw)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [orgId, d.ref ?? null, d.amount, d.direction ?? "DEBIT", d.txn_date ?? null, JSON.stringify(d.raw ?? {})],
      );
      await this.tryMatchBank(c, orgId, r.rows[0]!.id);
    });
  }

  /** Match a pending item against unmatched bank txns. */
  private async tryMatchPending(c: PoolClient, orgId: string, pendingId: string): Promise<void> {
    const item = (
      await c.query<{ amount: string; item_date: string | null; invoice_no: string | null }>(
        "SELECT amount, item_date, invoice_no FROM reconciliation.pending_items WHERE id=$1",
        [pendingId],
      )
    ).rows[0];
    if (!item) return;
    const cands = (
      await c.query<Candidate>(
        `SELECT id, amount, txn_date AS item_date, ext_ref AS invoice_no FROM reconciliation.bank_txns
         WHERE org_id=$1 AND matched=false AND abs(amount - $2) <= $3
         ORDER BY abs(amount - $2) LIMIT 5`,
        [orgId, item.amount, AMOUNT_TOLERANCE],
      )
    ).rows;
    const best = this.rank(item.amount, item.item_date, cands);
    if (best) await this.confirm(c, orgId, pendingId, best.id, best.confidence, best.method);
  }

  private async tryMatchBank(c: PoolClient, orgId: string, bankId: string): Promise<void> {
    const txn = (
      await c.query<{ amount: string; txn_date: string | null }>(
        "SELECT amount, txn_date FROM reconciliation.bank_txns WHERE id=$1",
        [bankId],
      )
    ).rows[0];
    if (!txn) return;
    const cands = (
      await c.query<Candidate>(
        `SELECT id, amount, item_date, invoice_no FROM reconciliation.pending_items
         WHERE org_id=$1 AND matched=false AND abs(amount - $2) <= $3
         ORDER BY abs(amount - $2) LIMIT 5`,
        [orgId, txn.amount, AMOUNT_TOLERANCE],
      )
    ).rows;
    const best = this.rank(txn.amount, txn.txn_date, cands);
    if (best) await this.confirm(c, orgId, best.id, bankId, best.confidence, best.method);
  }

  /** Deterministic (exact amount + close date) vs fuzzy (within tolerance). */
  private rank(amount: string, date: string | null, cands: Candidate[]): { id: string; confidence: number; method: string } | null {
    let best: { id: string; confidence: number; method: string } | null = null;
    for (const cand of cands) {
      const amtDiff = Math.abs(Number(cand.amount) - Number(amount));
      let confidence = amtDiff === 0 ? 0.9 : 0.6;
      let method = amtDiff === 0 ? "DETERMINISTIC" : "FUZZY";
      if (date && cand.item_date) {
        const days = Math.abs((new Date(date).getTime() - new Date(cand.item_date).getTime()) / 86_400_000);
        if (days <= DATE_WINDOW_DAYS) confidence += 0.08;
      }
      if (!best || confidence > best.confidence) best = { id: cand.id, confidence: Math.min(confidence, 0.99), method };
    }
    return best;
  }

  private async confirm(c: PoolClient, orgId: string, pendingId: string, bankId: string, confidence: number, method: string): Promise<void> {
    await c.query("UPDATE reconciliation.pending_items SET matched=true WHERE id=$1", [pendingId]);
    await c.query("UPDATE reconciliation.bank_txns SET matched=true WHERE id=$1", [bankId]);
    await c.query(
      `INSERT INTO reconciliation.reconciliations (org_id, pending_id, bank_txn_id, match_confidence, method, status)
       VALUES ($1,$2,$3,$4,$5,'CONFIRMED')`,
      [orgId, pendingId, bankId, confidence, method],
    );
    await this.outbox.enqueue(
      c,
      toOutboxEnvelope({
        event: "reconciliation.completed",
        org_id: orgId,
        actor_id: "reconciliation",
        data: { pending_id: pendingId, bank_txn_id: bankId, confidence, method },
      }),
    );
  }

  // ── user-facing reads ──
  async list(p: Principal, orgId: string, status = "CONFIRMED") {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      const r = await c.query(
        "SELECT * FROM reconciliation.reconciliations WHERE org_id=$1 AND status=$2 ORDER BY created_at DESC LIMIT 100",
        [orgId, status],
      );
      return r.rows;
    });
  }

  /** Unmatched items after a grace period are the exception backlog. */
  async unmatched(p: Principal, orgId: string) {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      const items = await c.query("SELECT * FROM reconciliation.pending_items WHERE org_id=$1 AND matched=false ORDER BY created_at LIMIT 100", [orgId]);
      const bank = await c.query("SELECT * FROM reconciliation.bank_txns WHERE org_id=$1 AND matched=false ORDER BY created_at LIMIT 100", [orgId]);
      return { unmatchedItems: items.rows, unmatchedBankTxns: bank.rows };
    });
  }
}
