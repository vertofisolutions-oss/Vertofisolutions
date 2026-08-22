"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Inbox, X } from "lucide-react";
import { api, ApiError } from "@/lib/panel-api";
import { Card } from "./PanelShell";

type Incoming = { id: string; scope: string | null; created_at: string; org_name: string; vertofi_id: string };

/**
 * Client assignment inbox: business owners assign this professional by their
 * Vertofi ID (VRU-XXXXXXXX); pending requests land here. Accepting creates a
 * real EDIT access grant on the client's org â€” declining closes the request.
 */
export function AssignmentInbox() {
  const [items, setItems] = useState<Incoming[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api.incomingRequests());
      setError(null);
    } catch (e) {
      setItems([]);
      setError(e instanceof ApiError ? e.code : "load_failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function respond(id: string, accept: boolean) {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      const res = await api.respondRequest(id, accept);
      setNotice(
        res.status === "ACCEPTED"
          ? "Assignment accepted â€” the client now appears in your workspace below."
          : "Assignment declined.",
      );
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "respond_failed");
    } finally {
      setBusyId(null);
    }
  }

  // Nothing pending and nothing to say â€” stay out of the way.
  if (items !== null && items.length === 0 && !notice && !error) return null;

  return (
    <Card className="border-l-2 border-l-[#1378F8]">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#EBF3FE] text-[#1378F8]">
          <Inbox className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-[#0F172A]">Client assignments</h2>
          <p className="text-xs text-[#64748B]">Owners who assigned you with your Vertofi ID.</p>
        </div>
      </div>

      {error && <p className="mt-3 text-xs font-medium text-[#EB1E1E]">{error}</p>}
      {notice && <p className="mt-3 text-xs font-medium text-[#0F172A]">{notice}</p>}

      {items === null ? (
        <p className="mt-3 text-xs text-[#64748B]">Loadingâ€¦</p>
      ) : (
        items.length > 0 && (
          <ul className="mt-4 divide-y divide-[#F1F5F9]">
            {items.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#0F172A]">{r.org_name}</p>
                  <p className="mt-0.5 text-xs text-[#64748B]">
                    {r.vertofi_id} Â· scope {r.scope ?? "FULL"} Â·{" "}
                    {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    disabled={busyId === r.id}
                    onClick={() => respond(r.id, true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1378F8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0E63D6] disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Accept
                  </button>
                  <button
                    disabled={busyId === r.id}
                    onClick={() => respond(r.id, false)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#0F172A] transition hover:bg-[#F8FAFC] disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </Card>
  );
}

