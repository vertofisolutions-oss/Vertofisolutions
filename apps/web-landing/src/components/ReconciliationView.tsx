"use client";
import { useState } from "react";
import { Landmark, UploadCloud, CheckCircle2, ArrowUpDown, Search } from "lucide-react";
import { Card } from "@/ui";

export function ReconciliationView({ orgId }: { orgId: string }) {
  const [bankAccount, setBankAccount] = useState("HDFC Bank (Primary Account)");
  const [search, setSearch] = useState("");

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

        {/* Upload Statement Drag & Drop Box */}
        <div className="mt-6 border-2 border-dashed border-border/80 rounded-xl bg-amber-50/20 p-6 text-center space-y-2">
          <UploadCloud className="mx-auto h-8 w-8 text-brand" />
          <p className="text-xs text-ink font-medium">
            Drag & Drop or <span className="text-red-500 font-bold underline cursor-pointer">Upload Bank Statement</span> (CSV / Excel / PDF)
          </p>
          <p className="text-[11px] text-muted">
            Vertofi AI reads statement lines and matches them with sales invoices and purchase bills automatically.
          </p>
        </div>

        {/* Unreconciled Transactions Table */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Pending Reconciliation Lines
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
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-muted font-medium">
                    No pending bank statement lines. Upload a bank statement above to start matching.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
