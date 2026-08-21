import { Injectable } from "@nestjs/common";
import type { EventEnvelope } from "@vertofi/events";
import { TallyConnector, ZohoConnector, QuickBooksConnector } from "./external.connectors.js";

export interface SyncOutcome {
  orgId: string;
  entryId: string;
  results: { target: string; ok: boolean; status: string }[];
  anySynced: boolean;
}

@Injectable()
export class SyncService {
  constructor(
    private readonly tally: TallyConnector,
    private readonly zoho: ZohoConnector,
    private readonly qbo: QuickBooksConnector,
  ) {}

  targets() {
    return [this.tally, this.zoho, this.qbo].map((c) => ({ id: c.meta.id, provider: c.meta.provider, status: c.status() }));
  }

  /** Push a posted ledger entry to every active external target. */
  async syncEntry(env: EventEnvelope<Record<string, unknown>>): Promise<SyncOutcome | null> {
    const orgId = env.org_id;
    const entryId = String(env.data.entry_id ?? "");
    if (!orgId || !entryId) return null;
    const results = await Promise.all(
      [this.tally, this.zoho, this.qbo].map(async (c) => {
        const r = await c.push(orgId, env.data);
        return { target: c.meta.id, ok: r.ok, status: r.status };
      }),
    );
    return { orgId, entryId, results, anySynced: results.some((r) => r.ok) };
  }
}
