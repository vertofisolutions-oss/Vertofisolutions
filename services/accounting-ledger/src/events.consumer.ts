/**
 * Ledger posting consumer (docs/27 flaw #6 fix): every sales invoice created
 * in the accounting workspace posts a balanced double-entry here, so P&L /
 * balance sheet / GST summary agree with the invoice list — one book, not two.
 *
 *   Dr  1200 Accounts Receivable      total
 *   Cr  4000 Sales Revenue            taxable
 *   Cr  2300 GST Output Payable       cgst+sgst+igst
 *
 * Subscribes the CANONICAL topic (Topics.accounting) and dispatches by
 * envelope.event (events-wiring convention). Idempotent: an invoice_no that
 * already exists in ledger.invoices for the org is skipped — Kafka redelivery
 * can never double-post.
 */
import { Pool, type PoolClient } from "pg";
import { EventConsumer, Topics, type EventEnvelope } from "@vertofi/events";
import { createLogger } from "@vertofi/observability";

const log = createLogger("ledger-posting");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

interface SalesCreated {
  invoice_no: string;
  total: number;
  sale_id?: string;
  taxable?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  customer_id?: string | null;
  date?: string;
}

const ACCOUNTS: Record<string, { code: string; name: string; type: string }> = {
  AR: { code: "1200", name: "Accounts Receivable", type: "ASSET" },
  SALES: { code: "4000", name: "Sales Revenue", type: "INCOME" },
  GST_OUT: { code: "2300", name: "GST Output Payable", type: "LIABILITY" },
};

async function ensureAccount(c: PoolClient, orgId: string, key: keyof typeof ACCOUNTS): Promise<string> {
  const a = ACCOUNTS[key]!;
  const r = await c.query<{ id: string }>(
    `INSERT INTO ledger.chart_of_accounts (org_id, code, name, type) VALUES ($1,$2,$3,$4)
     ON CONFLICT (org_id, code) DO UPDATE SET name = ledger.chart_of_accounts.name
     RETURNING id`,
    [orgId, a.code, a.name, a.type],
  );
  return r.rows[0]!.id;
}

async function postSale(env: EventEnvelope): Promise<void> {
  const d = env.data as SalesCreated;
  const orgId = env.org_id;
  if (!orgId || !d.invoice_no) return;
  // Old/thin events (pre-enrichment) lack the tax split — without it a
  // balanced entry is impossible, so skip loudly rather than guess.
  if (d.taxable == null) {
    log.warn({ invoice: d.invoice_no }, "sales event missing tax breakdown — skipping ledger post");
    return;
  }
  const gst = (d.cgst ?? 0) + (d.sgst ?? 0) + (d.igst ?? 0);

  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.current_org_ids', $1, true)", [orgId]);

    // Idempotency: one ledger invoice per (org, direction, invoice_no).
    const dup = await c.query(
      "SELECT 1 FROM ledger.invoices WHERE org_id=$1 AND direction='SALES' AND invoice_no=$2",
      [orgId, d.invoice_no],
    );
    if (dup.rows.length > 0) {
      await c.query("COMMIT");
      return;
    }

    const ar = await ensureAccount(c, orgId, "AR");
    const sales = await ensureAccount(c, orgId, "SALES");
    const gstOut = await ensureAccount(c, orgId, "GST_OUT");

    const e = await c.query<{ id: string }>(
      `INSERT INTO ledger.ledger_entries (org_id, txn_date, narration, source)
       VALUES ($1, COALESCE($2::date, current_date), $3, 'SALES') RETURNING id`,
      [orgId, d.date ?? null, `Sales invoice ${d.invoice_no}`],
    );
    const entryId = e.rows[0]!.id;
    const lines: [string, number, number][] = [
      [ar, d.total, 0],
      [sales, 0, d.taxable],
    ];
    if (gst > 0) lines.push([gstOut, 0, gst]);
    for (const [accountId, debit, credit] of lines) {
      await c.query(
        "INSERT INTO ledger.ledger_lines (entry_id, org_id, account_id, debit, credit) VALUES ($1,$2,$3,$4,$5)",
        [entryId, orgId, accountId, debit, credit],
      );
    }

    await c.query(
      `INSERT INTO ledger.invoices (org_id, direction, customer_id, invoice_no, date, taxable, cgst, sgst, igst, total, status)
       VALUES ($1,'SALES',$2,$3,COALESCE($4::date, current_date),$5,$6,$7,$8,$9,'RECORDED')`,
      [orgId, d.customer_id ?? null, d.invoice_no, d.date ?? null, d.taxable, d.cgst ?? 0, d.sgst ?? 0, d.igst ?? 0, d.total],
    );

    await c.query("COMMIT");
    log.warn({ invoice: d.invoice_no, entryId, total: d.total }, "sales invoice posted to ledger");
  } catch (err) {
    await c.query("ROLLBACK").catch(() => {});
    log.error({ err: err instanceof Error ? err.message : String(err), invoice: d.invoice_no }, "ledger post failed");
    throw err; // → consumer retry/DLQ
  } finally {
    c.release();
  }
}

export async function startLedgerPostingConsumer(): Promise<void> {
  const consumer = new EventConsumer({
    clientId: "ledger-posting",
    brokers: (process.env.KAFKA_BROKERS ?? "localhost:19092").split(","),
    groupId: "ledger-posting-consumer",
    topics: [Topics.accounting],
    maxRetries: 3,
  });
  consumer.on("accounting.sales.created", postSale);
  await consumer.start();
  log.warn({}, "ledger posting consumer started (accounting.events)");
}
