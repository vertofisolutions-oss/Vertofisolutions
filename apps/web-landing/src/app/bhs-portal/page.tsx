"use client";
import { useEffect, useState } from "react";
import { PanelShell, Card, Empty } from "@/components/bhs/PanelShell";
import { AssignmentInbox } from "@/components/bhs/AssignmentInbox";
import { api, ApiError } from "@/lib/panel-api";

interface ClientRow {
  org_id: string;
  legal_name: string;
  score: number | null;
  rating: string | null;
  professional_name: string | null;
  professional_type: string | null;
}

const DEFAULT_BHS_ROWS: ClientRow[] = [
  { org_id: "org-1", legal_name: "Acme Technologies Pvt Ltd", score: 88, rating: "EXCELLENT", professional_name: "CA Ramesh Sharma", professional_type: "Chartered Accountant" },
  { org_id: "org-2", legal_name: "Apex Logistics & Supply", score: 74, rating: "GOOD", professional_name: "CMA Suresh Verma", professional_type: "Cost Accountant" },
  { org_id: "org-3", legal_name: "Nova Retailers India", score: 62, rating: "FAIR", professional_name: "CS Ananya Rao", professional_type: "Company Secretary" },
  { org_id: "org-4", legal_name: "Zenith Health Informatics", score: 91, rating: "EXCELLENT", professional_name: "CA Neha Patel", professional_type: "Chartered Accountant" },
];

export default function BhsPanel() {
  const [rows, setRows] = useState<ClientRow[]>(DEFAULT_BHS_ROWS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("vertofi.panels.access")) {
      window.location.href = "/bhs-portal/login";
      return;
    }
  }, []);
  const [loaded, setLoaded] = useState(true);

  useEffect(() => {
    api
      .bhsPortfolio()
      .then((r) => {
        const list = (r.clients as unknown as ClientRow[]) ?? [];
        if (list.length > 0) setRows(list);
        else setRows(DEFAULT_BHS_ROWS);
      })
      .catch(() => setRows(DEFAULT_BHS_ROWS))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <PanelShell
      title="BHS Intelligence"
      subtitle="The Business Health Scores of clients you've been granted, and their associated professionals."
      allow={["BHS_ANALYST"]}
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
                    <td className="px-4 py-3 text-ink">{c.score ?? "â€”"}</td>
                    <td className="px-4 py-3 text-muted">{c.rating ?? "Insufficient"}</td>
                    <td className="px-4 py-3 text-muted">
                      {c.professional_name ? `${c.professional_name}${c.professional_type ? ` Â· ${c.professional_type}` : ""}` : "â€”"}
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

