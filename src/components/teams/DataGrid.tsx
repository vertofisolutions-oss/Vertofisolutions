"use client";
import { useState } from "react";
import { Pencil, ChevronLeft, ChevronRight, Search, Loader2 } from "lucide-react";
import { Modal } from "./Modal";

export interface GridData {
  key: string;
  columns: string[];
  editable: string[];
  pk: string;
  total: number;
  rows: Record<string, unknown>[];
}

/**
 * Excel-style data grid with inline edit via a popup. Column-level security is
 * enforced server-side (only safe columns are ever returned). Editing is limited
 * to server-declared editable columns and every change is audited.
 */
export function DataGrid({
  data,
  loading,
  page,
  pageSize,
  query,
  onQuery,
  onPage,
  onSave,
}: {
  data: GridData | null;
  loading: boolean;
  page: number;
  pageSize: number;
  query: string;
  onQuery: (q: string) => void;
  onPage: (p: number) => void;
  onSave: (id: string, patch: Record<string, unknown>) => Promise<void>;
}) {
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const fmt = (v: unknown) => {
    if (v === null || v === undefined) return "â€”";
    if (typeof v === "object") return JSON.stringify(v);
    const s = String(v);
    return s.length > 48 ? `${s.slice(0, 48)}â€¦` : s;
  };

  function openEdit(row: Record<string, unknown>) {
    if (!data || data.editable.length === 0) return;
    setEditing(row);
    const d: Record<string, unknown> = {};
    for (const c of data.editable) d[c] = row[c];
    setDraft(d);
  }

  async function save() {
    if (!data || !editing) return;
    setSaving(true);
    try {
      await onSave(String(editing[data.pk]), draft);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <div className="rounded-2xl border border-borderCard bg-white shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            className="w-full rounded-lg border border-border py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
            placeholder="Searchâ€¦"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {data && <span>{data.total.toLocaleString()} rows</span>}
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-bg2 uppercase tracking-wide text-muted">
            <tr>
              {data?.columns.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2.5 font-semibold">{c}</th>
              ))}
              {data && data.editable.length > 0 && <th className="px-3 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((row, i) => (
              <tr key={i} className="border-t border-borderCard hover:bg-bg2">
                {data.columns.map((c) => (
                  <td key={c} className="whitespace-nowrap px-3 py-2 text-ink" title={String(row[c] ?? "")}>{fmt(row[c])}</td>
                ))}
                {data.editable.length > 0 && (
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => openEdit(row)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-ink hover:bg-white">
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {data && data.rows.length === 0 && (
              <tr>
                <td colSpan={data.columns.length + 1} className="px-3 py-10 text-center text-muted">No rows.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted">
        <span>Page {page + 1} of {totalPages}</span>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => onPage(page - 1)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 disabled:opacity-40">
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <button disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 disabled:opacity-40">
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {editing && data && (
        <Modal title={`Edit ${data.key}`} onClose={() => setEditing(null)}>
          <div className="space-y-4">
            {data.editable.map((c) => (
              <label key={c} className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">{c}</span>
                <input
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-brand"
                  value={String(draft[c] ?? "")}
                  onChange={(e) => setDraft({ ...draft, [c]: e.target.value })}
                />
              </label>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-ink">Cancel</button>
              <button onClick={save} disabled={saving} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? "Savingâ€¦" : "Save changes"}
              </button>
            </div>
            <p className="text-[11px] text-muted">Only server-permitted columns are editable. Every change is written to the immutable admin audit log.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

