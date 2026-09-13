"use client";
import { useState, useRef } from "react";
import { Landmark, UploadCloud, CheckCircle2, ArrowUpDown, Search, FileText, Loader2, X, Check, ArrowRight, Trash2 } from "lucide-react";
import { Card } from "@/ui";

interface StatementLine {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  match: string;
  status: "PENDING" | "RECONCILED";
}

export function ReconciliationView({ orgId }: { orgId: string }) {
  const [bankAccount, setBankAccount] = useState("HDFC Bank (Primary Account)");
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [lines, setLines] = useState<StatementLine[]>([
    {
      id: "rec-1",
      date: "2026-09-12",
      description: "UPI/5900.00/GEETHA/PAYMENT-INV0001",
      debit: 0,
      credit: 5900,
      match: "Sales Invoice INV/0001 (geetha)",
      status: "PENDING",
    },
    {
      id: "rec-2",
      date: "2026-09-12",
      description: "NEFT/295000.00/VENDOR-GEETHA/PUR-3774",
      debit: 295000,
      credit: 0,
      match: "Purchase Bill PUR-3774 (geetha)",
      status: "PENDING",
    },
  ]);

  function handleFileUpload(file: File | undefined | null) {
    if (!file) return;
    setUploading(true);
    setUploadedFile({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + " KB",
    });

    setTimeout(() => {
      // Simulate statement extraction
      const newLines: StatementLine[] = [
        {
          id: `rec-${Date.now()}-1`,
          date: new Date().toISOString().slice(0, 10),
          description: `IMPS/TRX-${Math.floor(Math.random() * 90000 + 10000)}/DIRECT-CREDIT`,
          debit: 0,
          credit: 24780,
          match: "Sales Invoice INV/0004 (Vertofi.)",
          status: "PENDING",
        },
        {
          id: `rec-${Date.now()}-2`,
          date: new Date().toISOString().slice(0, 10),
          description: `RTGS/VENDOR-SUPPLIER-SETTLEMENT`,
          debit: 50000,
          credit: 0,
          match: "Vendor Payment Entry",
          status: "PENDING",
        },
      ];
      setLines((prev) => [...newLines, ...prev]);
      setUploading(false);
    }, 600);
  }

  function reconcileRow(id: string) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: "RECONCILED" } : l))
    );
  }

  function deleteRow(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  const filteredLines = lines.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.description.toLowerCase().includes(q) ||
      l.match.toLowerCase().includes(q) ||
      l.date.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
              <Landmark className="h-5 w-5 text-brand" /> Bank Reconciliation
            </h2>
            <p className="text-xs text-muted mt-1">Match bank statement transactions against accounting records automatically.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-brand shadow-sm cursor-pointer"
            >
              <option value="HDFC Bank (Primary Account)">HDFC Bank (Primary Account)</option>
              <option value="ICICI Bank (Current Account)">ICICI Bank (Current Account)</option>
              <option value="SBI (Operations)">SBI (Operations)</option>
            </select>
          </div>
        </div>

        {/* Hidden input to browse laptop files */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.pdf,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileUpload(f);
          }}
        />

        {/* Upload Statement Drag & Drop Box */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFileUpload(f);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-6 border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
            isDragging
              ? "border-brand bg-brand-50/30 scale-[1.01]"
              : uploadedFile
              ? "border-emerald-400 bg-emerald-50/20"
              : "border-border/80 bg-amber-50/20 hover:border-brand/60 hover:bg-amber-50/40"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
              <p className="text-xs font-semibold text-ink">Reading statement lines &amp; auto-matching transactions…</p>
            </div>
          ) : uploadedFile ? (
            <div className="flex items-center justify-between max-w-lg mx-auto bg-white p-3 rounded-xl border border-emerald-200 shadow-sm text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-900 truncate flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    {uploadedFile.name}
                  </p>
                  <p className="text-[11px] text-muted">{uploadedFile.size} • Statement loaded &amp; mapped</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="text-xs font-semibold text-brand underline cursor-pointer hover:text-brand/80"
                >
                  Change
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <UploadCloud className="mx-auto h-8 w-8 text-brand" />
              <p className="text-xs text-ink font-medium">
                Drag &amp; Drop or <span className="text-red-500 font-bold underline cursor-pointer">Upload Bank Statement</span> (CSV / Excel / PDF)
              </p>
              <p className="text-[11px] text-muted">
                Vertofi AI reads statement lines and matches them with sales invoices and purchase bills automatically.
              </p>
            </div>
          )}
        </div>

        {/* Unreconciled Transactions Table */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Pending Reconciliation Lines ({filteredLines.filter((l) => l.status === "PENDING").length})
            </h3>
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search transaction"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 rounded-lg border border-border bg-white pl-3 pr-8 py-1 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
              <Search className="absolute right-2.5 h-3.5 w-3.5 text-muted" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-bg2 text-[11px] font-semibold text-muted">
                <tr>
                  <th className="px-3 py-2.5 text-center w-12">#</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Statement Description</th>
                  <th className="px-3 py-2.5 text-right">Debit (₹)</th>
                  <th className="px-3 py-2.5 text-right">Credit (₹)</th>
                  <th className="px-3 py-2.5">Suggested Match</th>
                  <th className="px-3 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-muted font-medium">
                      No pending bank statement lines. Upload a bank statement above to start matching.
                    </td>
                  </tr>
                ) : (
                  filteredLines.map((l, idx) => (
                    <tr key={l.id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-3 text-center text-muted font-medium">{idx + 1}</td>
                      <td className="px-3 py-3 font-mono text-muted">{l.date}</td>
                      <td className="px-3 py-3 font-medium text-ink">{l.description}</td>
                      <td className="px-3 py-3 text-right font-semibold text-rose-600">
                        {l.debit > 0 ? `₹${l.debit.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-emerald-600">
                        {l.credit > 0 ? `₹${l.credit.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-brand">
                          <ArrowRight className="h-3 w-3 text-brand" /> {l.match}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {l.status === "RECONCILED" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                              <Check className="h-3.5 w-3.5" /> Reconciled
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => reconcileRow(l.id)}
                              className="rounded-lg bg-brand px-3 py-1 text-[11px] font-bold text-white transition hover:bg-brand/90 cursor-pointer shadow-xs"
                            >
                              Match &amp; Confirm
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteRow(l.id)}
                            className="p-1 text-muted hover:text-red-600 transition rounded-md hover:bg-red-50"
                            title="Delete Line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
