import { BadRequestException, Injectable } from "@nestjs/common";
import { PgService, PgOutboxStore, assertGrantedScope } from "@vertofi/nest-common";
import { toOutboxEnvelope } from "@vertofi/events";
import { setRlsContext, type EffectiveScope, type Principal } from "@vertofi/tenancy";

function scopeFor(principal: Principal, orgId: string): EffectiveScope {
  if (principal.role === "ADMIN") return { orgIds: "*", permission: "EDIT", scope: "FULL" };
  if (principal.role === "ASSOCIATE") return { orgIds: [orgId], permission: "EDIT", scope: "FULL" };
  return { orgIds: [orgId], permission: "EDIT", scope: "FULL" };
}

export interface LineInput {
  accountId: string;
  debit?: number;
  credit?: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class LedgerService {
  private readonly outbox: PgOutboxStore;
  constructor(private readonly pg: PgService) {
    this.outbox = new PgOutboxStore(pg, "ledger");
  }

  async createAccount(p: Principal, orgId: string, code: string, name: string, type: string) {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      const r = await c.query<{ id: string }>(
        `INSERT INTO ledger.chart_of_accounts (org_id, code, name, type) VALUES ($1,$2,$3,$4)
         ON CONFLICT (org_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [orgId, code, name, type],
      );
      return { id: r.rows[0]!.id };
    });
  }

  /**
   * Post a double-entry. Enforces the fundamental invariant
   * sum(debit) == sum(credit) before committing (docs/00 data integrity).
   * Posting is a sensitive action → requires a Financial Action OTP upstream.
   */
  async postEntry(
    p: Principal,
    orgId: string,
    input: { txnDate: string; narration?: string; source?: string; lines: LineInput[]; approvalOtpId?: string },
  ) {
    const totalDebit = round2(input.lines.reduce((s, l) => s + (l.debit ?? 0), 0));
    const totalCredit = round2(input.lines.reduce((s, l) => s + (l.credit ?? 0), 0));
    if (input.lines.length < 2) throw new BadRequestException("entry_needs_at_least_two_lines");
    if (totalDebit !== totalCredit) {
      throw new BadRequestException({ code: "unbalanced_entry", totalDebit, totalCredit });
    }
    if (totalDebit === 0) throw new BadRequestException("zero_value_entry");

    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      const e = await c.query<{ id: string }>(
        `INSERT INTO ledger.ledger_entries (org_id, txn_date, narration, source, posted_by, approval_otp_id)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [orgId, input.txnDate, input.narration ?? null, input.source ?? "MANUAL", p.userId, input.approvalOtpId ?? null],
      );
      const entryId = e.rows[0]!.id;
      for (const l of input.lines) {
        await c.query(
          `INSERT INTO ledger.ledger_lines (entry_id, org_id, account_id, debit, credit)
           VALUES ($1,$2,$3,$4,$5)`,
          [entryId, orgId, l.accountId, round2(l.debit ?? 0), round2(l.credit ?? 0)],
        );
      }
      await this.outbox.enqueue(
        c,
        toOutboxEnvelope({
          event: "ledger.posted",
          org_id: orgId,
          actor_id: p.userId,
          data: { entry_id: entryId, total: totalDebit, source: input.source ?? "MANUAL" },
        }),
      );
      return { entryId, totalDebit, totalCredit, balanced: true };
    });
  }

  /** Reverse a posted entry by creating a mirrored entry (never hard-delete). */
  async reverseEntry(p: Principal, orgId: string, entryId: string, approvalOtpId?: string) {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      const lines = await c.query<{ account_id: string; debit: string; credit: string }>(
        "SELECT account_id, debit, credit FROM ledger.ledger_lines WHERE entry_id = $1",
        [entryId],
      );
      if (lines.rows.length === 0) throw new BadRequestException("entry_not_found");
      const rev = await c.query<{ id: string }>(
        `INSERT INTO ledger.ledger_entries (org_id, txn_date, narration, source, status, posted_by, approval_otp_id, reverses_id)
         VALUES ($1, current_date, 'Reversal', 'MANUAL', 'POSTED', $2, $3, $4) RETURNING id`,
        [orgId, p.userId, approvalOtpId ?? null, entryId],
      );
      const revId = rev.rows[0]!.id;
      for (const l of lines.rows) {
        // swap debit/credit to reverse
        await c.query(
          `INSERT INTO ledger.ledger_lines (entry_id, org_id, account_id, debit, credit) VALUES ($1,$2,$3,$4,$5)`,
          [revId, orgId, l.account_id, l.credit, l.debit],
        );
      }
      await c.query("UPDATE ledger.ledger_entries SET status='REVERSED' WHERE id=$1 AND org_id=$2", [entryId, orgId]);
      return { reversalEntryId: revId };
    });
  }

  async listEntries(p: Principal, orgId: string, limit = 50) {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      const r = await c.query(
        `SELECT e.id, e.txn_date, e.narration, e.source, e.status,
                coalesce(sum(l.debit),0) AS total
           FROM ledger.ledger_entries e
           JOIN ledger.ledger_lines l ON l.entry_id = e.id
          WHERE e.org_id = $1
          GROUP BY e.id ORDER BY e.txn_date DESC LIMIT $2`,
        [orgId, limit],
      );
      return r.rows;
    });
  }
}
