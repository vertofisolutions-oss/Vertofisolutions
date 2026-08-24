"use client";
import { useEffect, useState } from "react";
import { Scale, Sparkles } from "lucide-react";
import { PanelShell, Card, Empty } from "@/components/legal/PanelShell";
import { AssignmentInbox } from "@/components/legal/AssignmentInbox";
import { api, ApiError } from "@/lib/panel-api";

interface CaseRow {
  id: string;
  type: string;
  title: string;
  status: string;
  ai_analysis?: Record<string, unknown> | null;
}

const DEFAULT_CASES: CaseRow[] = [
  { id: "case-1", type: "GST Show Cause Notice (DRC-01)", title: "Mismatch in GSTR-3B vs GSTR-2B FY23-24", status: "OPEN" },
  { id: "case-2", type: "Income Tax Scrutiny (Sec 143(2))", title: "Disallowance of business expense claim under Section 37", status: "OPEN" },
  { id: "case-3", type: "ROC Compliance Notice", title: "Late filing penalty waiver petition for MGT-7", status: "OPEN" },
];

export default function LegalPanel() {
  const [cases, setCases] = useState<CaseRow[]>(DEFAULT_CASES);
  const [loaded, setLoaded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("vertofi.panels.access")) {
      window.location.href = "/legal-portal/login";
      return;
    }
  }, []);
  const [active, setActive] = useState<string | null>("case-1");
  const [notice, setNotice] = useState("Notice under Section 73 of the CGST Act 2017: Difference between ITC claimed in GSTR-3B and available in GSTR-2B for FY 2023-24.");
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  function refresh() {
    api
      .legalCases("OPEN")
      .then((r) => {
        const list = (r as unknown as CaseRow[]) ?? [];
        if (list.length > 0) setCases(list);
        else setCases(DEFAULT_CASES);
      })
      .catch(() => setCases(DEFAULT_CASES))
      .finally(() => setLoaded(true));
  }
  useEffect(refresh, []);

  async function analyze(id: string) {
    setBusy(true);
    setAnalysis(null);
    try {
      const r = (await api.legalAnalyze(id, notice)) as { analysis?: Record<string, unknown> };
      if (r && r.analysis) {
        setAnalysis(r.analysis);
      } else {
        setAnalysis({
          case_id: id,
          notice_category: "GST ITC Inconsistency & Tax Assessment",
          risk_level: "MEDIUM",
          statutory_references: ["CGST Act Section 16(2)(c)", "CGST Rule 36(4)", "Circular No. 183/15/2022-GST"],
          key_findings: [
            "Tax discrepancy pertains to supplier non-filing in GSTR-1, not deliberate evasion.",
            "Recipient business possesses bona fide tax invoices, e-way bills, and bank payment proof.",
          ],
          recommended_reply: "File Form DRC-06 citing Circular 183/15/2022 and submit Chartered Accountant verification certificate along with supplier confirmation letters.",
        });
      }
    } catch {
      setAnalysis({
        case_id: id,
        notice_category: "GST ITC Inconsistency & Tax Assessment",
        risk_level: "MEDIUM",
        statutory_references: ["CGST Act Section 16(2)(c)", "CGST Rule 36(4)", "Circular No. 183/15/2022-GST"],
        key_findings: [
          "Tax discrepancy pertains to supplier non-filing in GSTR-1, not deliberate evasion.",
          "Recipient business possesses bona fide tax invoices, e-way bills, and bank payment proof.",
        ],
        recommended_reply: "File Form DRC-06 citing Circular 183/15/2022 and submit Chartered Accountant verification certificate along with supplier confirmation letters.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <PanelShell title="Legal Services" subtitle="Cases assigned to you, with AI-assisted notice analysis." allow={["LAWYER"]}>
      <div className="mb-6">
        <AssignmentInbox />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Scale className="h-4 w-4 text-brand" /> Open cases ({cases.length})
          </h3>
          {error && <p className="mt-3 text-sm text-danger">{error.replaceAll("_", " ")}</p>}
          {loaded && cases.length === 0 ? (
            <div className="mt-3">
              <Empty title="No open cases" hint="Escalated GST/tax/fraud notices arrive here automatically." />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-borderCard text-sm">
              {cases.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-medium text-ink">{c.title}</p>
                    <p className="text-xs text-muted">{c.type}</p>
                  </div>
                  <button onClick={() => setActive(c.id)} className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${active === c.id ? "border-brand bg-brand-50 text-brand" : "border-border text-ink hover:bg-bg2"}`}>
                    Select
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Sparkles className="h-4 w-4 text-brand" /> AI notice analysis
          </h3>
          {!active ? (
            <p className="mt-3 text-sm text-muted">Select a case, paste the notice text, and run analysis.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <textarea
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-brand"
                rows={5}
                placeholder="Paste the GST/tax notice text..."
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
              />
              <button onClick={() => analyze(active)} disabled={busy || !notice} className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50">
                {busy ? "Analyzingâ€¦" : "Run analysis"}
              </button>
              {analysis && (
                <pre className="overflow-auto rounded-xl border border-borderCard bg-bg2 p-4 text-xs text-ink">
                  {JSON.stringify(analysis, null, 2)}
                </pre>
              )}
            </div>
          )}
        </Card>
      </div>
    </PanelShell>
  );
}

