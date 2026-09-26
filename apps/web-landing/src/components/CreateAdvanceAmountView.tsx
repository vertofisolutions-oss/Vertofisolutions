"use client";

import { useMemo, useState, useEffect } from "react";
import { Calendar, ChevronDown, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { AddCustomerModal } from "./AddCustomerModal";

const INDIAN_STATES = [
  "36-TELANGANA",
  "37-ANDHRA PRADESH",
  "29-KARNATAKA",
  "27-MAHARASHTRA",
  "33-TAMIL NADU",
  "07-DELHI",
  "24-GUJARAT",
  "06-HARYANA",
  "32-KERALA",
  "19-WEST BENGAL",
  "09-UTTAR PRADESH",
  "08-RAJASTHAN",
  "23-MADHYA PRADESH",
  "21-ODISHA",
  "03-PUNJAB",
  "10-BIHAR",
  "18-ASSAM",
  "30-GOA",
  "22-CHHATTISGARH",
  "20-JHARKHAND",
  "05-UTTARAKHAND",
  "02-HIMACHAL PRADESH",
  "01-JAMMU AND KASHMIR",
  "34-PUDUCHERRY",
  "04-CHANDIGARH",
];

const GST_RATES = [
  0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28,
];

interface RateRow {
  rate: number;
  taxable: string;
  cess: string;
}

export function CreateAdvanceAmountView({
  orgId,
  onClose,
  onCreated,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [placeOfSupply, setPlaceOfSupply] = useState("36-TELANGANA");
  
  // Format as 11-09-2026 or DD-MM-YYYY
  const getFormattedDate = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const [advanceDate, setAdvanceDate] = useState(getFormattedDate);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // 12 GST Rate rows with default 0.00
  const [rows, setRows] = useState<RateRow[]>(() =>
    GST_RATES.map((rate) => ({
      rate,
      taxable: "0.00",
      cess: "0.00",
    }))
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch known customers for autocomplete
  useEffect(() => {
    let alive = true;
    api.acc
      .customers(orgId)
      .then((data) => {
        if (!alive) return;
        const names = Array.isArray(data)
          ? data.map((c: Record<string, unknown>) => String(c.name ?? c.customer_name ?? "")).filter(Boolean)
          : [];
        try {
          const local = JSON.parse(localStorage.getItem("vertofi_local_customers") || "[]");
          const localNames = local.map((c: Record<string, unknown>) => String(c.name || "")).filter(Boolean);
          const merged = Array.from(new Set([...names, ...localNames]));
          setCustomerSuggestions(merged);
        } catch {
          setCustomerSuggestions(names);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [orgId]);

  const handleTaxableChange = (index: number, val: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, taxable: val } : r))
    );
  };

  const handleCessChange = (index: number, val: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, cess: val } : r))
    );
  };

  // Calculations
  const calculated = useMemo(() => {
    let totalTaxable = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalCess = 0;

    const rowDetails = rows.map((r) => {
      const taxableNum = parseFloat(r.taxable) || 0;
      const cessNum = parseFloat(r.cess) || 0;
      const halfRate = r.rate / 2;
      const cgst = (taxableNum * halfRate) / 100;
      const sgst = (taxableNum * halfRate) / 100;

      totalTaxable += taxableNum;
      totalCGST += cgst;
      totalSGST += sgst;
      totalCess += cessNum;

      return {
        rate: r.rate,
        taxable: taxableNum,
        cgst: taxableNum > 0 ? (cgst % 1 === 0 ? cgst.toFixed(1) : cgst.toFixed(2)) : "0.0",
        sgst: taxableNum > 0 ? (sgst % 1 === 0 ? sgst.toFixed(1) : sgst.toFixed(2)) : "0.0",
        cess: cessNum,
      };
    });

    return {
      rowDetails,
      totalTaxable: totalTaxable % 1 === 0 ? String(totalTaxable) : totalTaxable.toFixed(2),
      totalCGST: totalCGST % 1 === 0 ? String(totalCGST) : totalCGST.toFixed(2),
      totalSGST: totalSGST % 1 === 0 ? String(totalSGST) : totalSGST.toFixed(2),
      totalCess: totalCess % 1 === 0 ? String(totalCess) : totalCess.toFixed(2),
      grandTotal: Math.round(totalTaxable + totalCGST + totalSGST + totalCess),
    };
  }, [rows]);

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      setError("Please search or enter a customer name.");
      return;
    }

    setBusy(true);
    setError(null);

    const refId = `ADV-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalTaxNum = Number(calculated.totalCGST) + Number(calculated.totalSGST);

    const advanceRecord = {
      id: `adv-${Date.now()}`,
      reference_id: refId,
      customer_name: customerName.trim(),
      place_of_supply: placeOfSupply,
      payment_date: advanceDate,
      date: advanceDate,
      tax_type: "Intra State",
      doc_type: "ADVANCE_AMOUNT",
      taxable: Number(calculated.totalTaxable),
      total_tax: totalTaxNum,
      total_cess: Number(calculated.totalCess),
      total: calculated.grandTotal,
      status: "PENDING",
      created_at: new Date().toISOString(),
      rows: rows.filter((r) => parseFloat(r.taxable) > 0 || parseFloat(r.cess) > 0),
    };

    try {
      try {
        await api.acc.createSale(orgId, {
          customerName: customerName.trim(),
          invoiceNo: refId,
          date: advanceDate,
          doc_type: "ADVANCE_AMOUNT",
          reference: refId,
          total: calculated.grandTotal,
          source: "ADVANCE_FORM",
        });
      } catch (_e) {}

      try {
        const existingLocal = JSON.parse(localStorage.getItem("vertofi_local_advances") || "[]");
        localStorage.setItem("vertofi_local_advances", JSON.stringify([advanceRecord, ...existingLocal]));
      } catch (_e) {}

      onCreated();
    } catch (e) {
      setError("Failed to create advance payment record. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const filteredCustomerSuggestions = customerSuggestions.filter((c) =>
    c.toLowerCase().includes(customerName.toLowerCase())
  );

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
      {/* Title */}
      <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
        Tax Liability (Advance Received)
      </h1>

      {/* Add New Customer Button */}
      <div>
        <button
          type="button"
          onClick={() => setShowAddCustomerModal(true)}
          className="rounded-full bg-[#16a34a] hover:bg-[#15803d] px-5 py-2 text-xs font-semibold text-white transition shadow-sm cursor-pointer"
        >
          Add New Customer
        </button>
      </div>

      {/* Form Fields */}
      <div className="space-y-4 max-w-2xl">
        {/* Search Customer */}
        <div className="space-y-1.5 max-w-sm">
          <label className="text-xs font-semibold text-slate-700 block">
            Search Customer<span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter Customer Name to search"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-red-500 shadow-sm transition"
            />
            {showSuggestions && customerName.trim() && filteredCustomerSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1.5 shadow-lg">
                {filteredCustomerSuggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setCustomerName(name);
                      setShowSuggestions(false);
                    }}
                    className="w-full px-5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Place of Supply and Advance Date in one row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Place of Supply */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Place Of Supply<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                className="w-full rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs text-slate-800 outline-none focus:border-red-500 appearance-none cursor-pointer shadow-sm transition"
              >
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-3.5 h-4 w-4 text-slate-500" />
            </div>
          </div>

          {/* Advance Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Advance Date<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={advanceDate}
                onChange={(e) => setAdvanceDate(e.target.value)}
                className="w-full rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs text-slate-800 outline-none focus:border-red-500 shadow-sm transition"
              />
              <Calendar className="pointer-events-none absolute right-4 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* GST Rates Grid Table with full borders */}
      <div className="w-full overflow-visible rounded-none border border-slate-300 mt-6">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#f8fafc] text-slate-700 font-semibold border-b border-slate-300">
              <th className="px-4 py-3 border-r border-slate-300 w-[120px]">GST Rate</th>
              <th className="px-4 py-3 border-r border-slate-300 w-[240px]">Taxable Amount</th>
              <th className="px-4 py-3 border-r border-slate-300 w-[140px]">Total CGST</th>
              <th className="px-4 py-3 border-r border-slate-300 w-[140px]">Total SGST</th>
              <th className="px-4 py-3 w-[240px]">Cess Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {rows.map((row, idx) => {
              const calcRow = calculated.rowDetails[idx];
              return (
                <tr key={row.rate} className="hover:bg-slate-50/50 transition">
                  {/* GST Rate Column */}
                  <td className="px-4 py-2 text-slate-700 font-normal border-r border-slate-300">
                    {row.rate}
                  </td>

                  {/* Taxable Amount Column */}
                  <td className="px-4 py-2 border-r border-slate-300">
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={row.taxable}
                      onChange={(e) => handleTaxableChange(idx, e.target.value)}
                      className="w-full max-w-[200px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-red-500 transition"
                    />
                  </td>

                  {/* Total CGST Column */}
                  <td className="px-4 py-2 text-slate-700 font-normal border-r border-slate-300">
                    {calcRow.cgst}
                  </td>

                  {/* Total SGST Column */}
                  <td className="px-4 py-2 text-slate-700 font-normal border-r border-slate-300">
                    {calcRow.sgst}
                  </td>

                  {/* Cess Amount Column */}
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={row.cess}
                      onChange={(e) => handleCessChange(idx, e.target.value)}
                      className="w-full max-w-[200px] rounded-md border border-slate-300 bg-[#eef2f6] px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-500 outline-none focus:border-red-500 focus:bg-white transition"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-300 bg-white font-normal text-slate-700 text-xs">
              <td className="px-4 py-3 border-r border-slate-300"></td>
              <td className="px-4 py-3 border-r border-slate-300">Total: {calculated.totalTaxable}</td>
              <td className="px-4 py-3 border-r border-slate-300">Total: {calculated.totalCGST}</td>
              <td className="px-4 py-3 border-r border-slate-300">Total: {calculated.totalSGST}</td>
              <td className="px-4 py-3">Total: {calculated.totalCess}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

      {/* Bottom Submit Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="rounded-full bg-[#16a34a] hover:bg-[#15803d] px-10 py-2.5 text-xs font-semibold text-white transition shadow-sm cursor-pointer disabled:opacity-50"
        >
          {busy ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
            </span>
          ) : (
            "Submit"
          )}
        </button>
      </div>

      {/* Footer Branding matching mockup */}
      <div className="pt-8 pb-2 text-center text-xs text-slate-500 border-t border-slate-100">
        © Powered by <span className="underline cursor-pointer font-medium text-slate-600">Prologic Web Solutions</span>. All rights reserved
      </div>

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <AddCustomerModal
          isOpen={showAddCustomerModal}
          onClose={() => setShowAddCustomerModal(false)}
          onCustomerAdded={(newCustomer: { name: string; phone?: string; email?: string; state?: string; companyName?: string }) => {
            setCustomerName(newCustomer.name);
            setCustomerSuggestions((prev) => Array.from(new Set([newCustomer.name, ...prev])));
            setShowAddCustomerModal(false);
          }}
        />
      )}
    </div>
  );
}
