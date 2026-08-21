"use client";
import { useEffect, useState } from "react";
import { PanelShell, Card, Empty } from "../components/PanelShell";
import { AssignmentInbox } from "../components/AssignmentInbox";
import { api, ApiError } from "../lib/api";

interface ClientRow {
  org_id: string;
  legal_name: string;
  score: number | null;
  rating: string | null;
  professional_name: string | null;
  professional_type: string | null;
}

export default function BhsPanel() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .bhsPortfolio()
      .then((r) => setRows((r.clients as unknown as ClientRow[]) ?? []))
      .catch((e) => setError(e instanceof ApiError ? e.code : "load_failed"))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <PanelShell
      title="BHS Intelligence"
      subtitle="The Business Health Scores of clients you've been granted, and their associated professionals."
      allow={["BHS_ANALYST", "ADMIN"]}
    >
      <div className="mb-6">
        <AssignmentInbox />
      </div>
      <Card>
        {error && <p className="text-sm text-danger">{error.replaceAll("_", " ")}</p>}
        {loaded && rows.length === 0 ? (
          <Empty title="No clients granted yet" hint="Vertofi admin grants you visibility into specific clients' scores." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-borderCard">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Health Score</th>
                  <th className="px-4 py-3 font-semibold">Rating</th>
                  <th className="px-4 py-3 font-semibold">Associated professional</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.org_id} className="border-t border-borderCard">
                    <td className="px-4 py-3 font-medium text-ink">{c.legal_name}</td>
                    <td className="px-4 py-3 text-ink">{c.score ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{c.rating ?? "Insufficient"}</td>
                    <td className="px-4 py-3 text-muted">
                      {c.professional_name ? `${c.professional_name}${c.professional_type ? ` · ${c.professional_type}` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.professional_name && (
                        <button className="rounded-lg border border-gold/40 px-3 py-1 text-xs font-medium text-gold transition hover:bg-gold-50">
                          Ping professional
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PanelShell>
  );
}
