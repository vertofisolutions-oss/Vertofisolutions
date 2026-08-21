"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PanelShell } from "../../../components/PanelShell";
import { DataGrid, type GridData } from "../../../components/DataGrid";
import { api } from "../../../lib/api";

const PAGE_SIZE = 50;

/**
 * Generic per-entity DB browser. Every registered entity (Organizations, Users,
 * Invoices, Documents, …) routes here as /db/<key>. Dense grid + full row-detail
 * popup + manual edit of server-permitted columns + document viewer — all backed
 * by the column-secure admin-console tables API.
 */
export default function EntityBrowserPage() {
  const params = useParams();
  const key = String(params.key);

  const [meta, setMeta] = useState<{ label: string; schema: string; table: string } | null>(null);
  const [grid, setGrid] = useState<GridData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (p: number, q: string) => {
      setLoading(true);
      setError(null);
      try {
        setGrid(await api.table(key, PAGE_SIZE, p * PAGE_SIZE, q));
      } catch {
        setError("Failed to load this entity.");
        setGrid(null);
      } finally {
        setLoading(false);
      }
    },
    [key],
  );

  // Reset + load when the entity changes.
  useEffect(() => {
    setPage(0);
    setQuery("");
    void load(0, "");
    api.tables().then((ts) => {
      const t = ts.find((x) => x.key === key);
      setMeta(t ? { label: t.label, schema: t.schema, table: t.table } : null);
    }).catch(() => {});
  }, [key, load]);

  async function viewDoc(row: Record<string, unknown>) {
    try {
      const { url } = await api.viewDocument(String(row.id));
      window.open(url, "_blank", "noopener");
    } catch {
      setError("Could not open the document.");
    }
  }

  return (
    <PanelShell title={meta?.label ?? key} subtitle={meta ? `${meta.schema}.${meta.table} · live Cloud SQL` : "Loading entity…"} allow={["ADMIN"]}>
      {error && <div className="mb-3 rounded-xl border border-danger/30 bg-[#FDECEC] px-4 py-3 text-sm font-medium text-danger">{error}</div>}
      <DataGrid
        data={grid}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        query={query}
        onQuery={(q) => { setQuery(q); setPage(0); void load(0, q); }}
        onPage={(p) => { setPage(p); void load(p, query); }}
        onSave={async (id, patch) => { await api.updateRow(key, id, patch); await load(page, query); }}
        onView={key === "documents" ? viewDoc : undefined}
      />
    </PanelShell>
  );
}
