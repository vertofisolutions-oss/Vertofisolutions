"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2, Loader2, Search, Calendar, ChevronDown, Play } from "lucide-react";
import { Button } from "@/ui";
import { api, ApiError } from "@/lib/api";

interface Item {
  name: string;
  description?: string;
  qty: number | "";
  rate: number | "";
  hsn?: string;
  taxRate: number | "";
  cessRate: number | "";
  discount: number | "";
}

const blankItem = (): Item => ({
  name: "",
  description: "",
  qty: 1,
  rate: "",
  hsn: "",
  taxRate: "",
  cessRate: "",
  discount: "",
});

export function CreateCreditNoteView({
  orgId,
  onClose,
  onCreated,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [customer, setCustomer] = useState<{ name: string; gstin: string; phone: string; address: string } | null>(null);
  const [prefix, setPrefix] = useState("vertofi");
  const [orderNo, setOrderNo] = useState("1");
  
  // Format today's date as DD-MM-YYYY
  const getFormattedDate = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const [orderDate, setOrderDate] = useState(getFormattedDate);
  const [reference, setReference] = useState("");
  const [discountType, setDiscountType] = useState("BEFORE_TAX");
  const [updateStock, setUpdateStock] = useState<"YES" | "NO">("YES");
  const [terms, setTerms] = useState("1. Credit note issued for returned / defective goods.\n2. Amount will be adjusted against future invoices.");

  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [busy, setBusy] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayOrderCode = prefix === "vertofi" ? "CN/11" : `${prefix}${orderNo}`;

  // Fetch Invoice Details by Invoice Number
  async function searchInvoice() {
    if (!invoiceSearch.trim()) return;
    setSearchBusy(true);
    setError(null);
    try {
      const docs = await api.acc.documents(orgId);
      const doc = Array.isArray(docs) ? docs.find((d) => String(d.invoice_no ?? d.number ?? "").toLowerCase() === invoiceSearch.trim().toLowerCase()) : null;
      if (doc) {
        setCustomer({
          name: String(doc.customer_name ?? doc.party_name ?? "Customer"),
          gstin: String(doc.gstin ?? ""),
          phone: String(doc.phone ?? ""),
          address: String(doc.address ?? ""),
        });
        setReference(String(doc.invoice_no ?? invoiceSearch.trim()));
        if (Array.isArray(doc.items) && doc.items.length > 0) {
          setItems(
            doc.items.map((it: Record<string, unknown>) => ({
              name: String(it.name ?? it.item_name ?? ""),
              description: String(it.description ?? ""),
              qty: Number(it.qty ?? 1),
              rate: Number(it.rate ?? 0),
              hsn: String(it.hsn ?? ""),
              taxRate: Number(it.tax_rate ?? it.taxRate ?? 18),
              cessRate: Number(it.cess_rate ?? 0),
              discount: Number(it.discount ?? 0),
            }))
          );
        }
      } else {
        setCustomer({ name: invoiceSearch.trim(), gstin: "", phone: "", address: "" });
        setReference(invoiceSearch.trim());
      }
    } catch {
      setCustomer({ name: invoiceSearch.trim(), gstin: "", phone: "", address: "" });
      setReference(invoiceSearch.trim());
    } finally {
      setSearchBusy(false);
    }
  }

  function setItem(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  // Calculations
  const calculated = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    let totalCess = 0;
    let totalDiscount = 0;

    const rowCalcs = items.map((it) => {
      const qtyNum = Number(it.qty) || 0;
      const rateNum = Number(it.rate) || 0;
      const discNum = Number(it.discount) || 0;
      const taxRateNum = Number(it.taxRate) || 0;
      const cessRateNum = Number(it.cessRate) || 0;

      const base = qtyNum * rateNum;
      const disc = (base * discNum) / 100;
      totalDiscount += disc;
      const taxable = Math.max(0, base - disc);
      subtotal += taxable;
      const tax = (taxable * taxRateNum) / 100;
      totalTax += tax;
      const cess = (taxable * cessRateNum) / 100;
      totalCess += cess;
      const rowTotal = Math.round(taxable + tax + cess);

      return {
        base,
        tax,
        cess,
        rowTotal,
      };
    });

    const grandTotal = Math.round(subtotal + totalTax + totalCess);

    return {
      rowCalcs,
      subtotal: Math.round(subtotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalCess: Math.round(totalCess * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      grandTotal,
    };
  }, [items]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        customerName: customer?.name || "Customer",
        invoiceNo: displayOrderCode,
        date: orderDate,
        doc_type: "CREDIT_NOTE",
        reference,
        items: items.map((it) => ({
          ...it,
          qty: Number(it.qty) || 1,
          rate: Number(it.rate) || 0,
          discount: Number(it.discount) || 0,
          taxRate: Number(it.taxRate) || 0,
          cessRate: Number(it.cessRate) || 0,
        })),
        total: calculated.grandTotal,
        updateStock: updateStock === "YES",
        source: "FORM",
      };

      try {
        await api.acc.createSale(orgId, payload);
      } catch (_e) {}

      // Save locally to reflect in table immediately
      try {
        const localCN = {
          id: `cn-${Date.now()}`,
          doc_number: displayOrderCode,
          credit_note_no: displayOrderCode,
          reference: reference || "INV-001",
          customer_name: customer?.name || "Customer",
          party_name: customer?.name || "Customer",
          date: orderDate,
          doc_type: "CREDIT_NOTE",
          total: calculated.grandTotal,
          status: "ISSUED",
          created_at: new Date().toISOString(),
        };
        const existing = JSON.parse(localStorage.getItem("vertofi_local_sales") || "[]");
        localStorage.setItem("vertofi_local_sales", JSON.stringify([localCN, ...existing]));
      } catch (_e) {}

      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed to create credit note");
    } finally {
      setBusy(false);
    }
  }

  const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          Create Credit Note
        </h1>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/90 hover:bg-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-sm"
        >
          <Play className="h-3 w-3 fill-slate-700 text-slate-700" />
          Tutorial
        </button>
      </div>

      {/* Top Invoice Lookup & Customer Details */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 pt-1">
        {/* Left: Fetch Invoice Details */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            Fetch Invoice Details by Invoice Number
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#1e40af] text-white text-[10px] font-bold cursor-pointer"
              title="Search invoice to auto-populate details"
            >
              ?
            </span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Enter Invoice Number to search"
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  searchInvoice();
                }
              }}
              className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 pr-12 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-red-500 shadow-sm transition"
            />
            <button
              type="button"
              onClick={searchInvoice}
              disabled={searchBusy}
              className="absolute right-1.5 grid h-7 w-7 place-items-center rounded-full bg-[#16a34a] text-white hover:bg-[#15803d] cursor-pointer disabled:opacity-50 transition shadow-sm"
            >
              {searchBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Right: Customer Details */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-700 pb-1 border-b border-slate-200">
            Customer Details
          </h3>
          {customer ? (
            <div className="pt-1 text-xs space-y-0.5 text-slate-600">
              <p className="font-bold text-slate-800">{customer.name}</p>
              {customer.gstin && <p>GSTIN: {customer.gstin}</p>}
              {customer.phone && <p>Phone: {customer.phone}</p>}
              {customer.address && <p>Address: {customer.address}</p>}
            </div>
          ) : (
            <div className="min-h-[36px]" />
          )}
        </div>
      </div>

      {/* Credit Note Detail Card */}
      <div className="space-y-4 pt-2">
        <h2 className="text-base font-bold text-slate-800">Credit Note Detail</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {/* Row 1 Left: Select Prefix */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Select Prefix <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-red-500 cursor-pointer appearance-none shadow-sm transition"
              >
                <option value="vertofi">vertofi</option>
                <option value="CN/">CN/</option>
                <option value="CRN/">CRN/</option>
                <option value="RET/">RET/</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-500" />
            </div>
          </div>

          {/* Row 1 Right: Reference */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 block mb-1">
              Reference
              <span
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#1e40af] text-white text-[9px] font-bold cursor-pointer"
                title="Invoice or document reference number"
              >
                ?
              </span>
            </label>
            <input
              type="text"
              placeholder="Reference #"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-red-500 shadow-sm transition"
            />
          </div>

          {/* Row 2 Left: Credit Order Number */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Credit Order Number <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                className="w-1/2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-red-500 shadow-sm transition"
              />
              <div className="w-1/2 rounded-xl border border-slate-200 bg-[#eef2f6] px-3.5 py-2.5 text-xs font-semibold text-slate-700 text-center select-none shadow-sm">
                {displayOrderCode}
              </div>
            </div>
          </div>

          {/* Row 2 Right: Discount */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Discount
            </label>
            <div className="relative">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-red-500 cursor-pointer appearance-none shadow-sm transition"
              >
                <option value="BEFORE_TAX">% Discount Before TAX</option>
                <option value="AFTER_TAX">% Discount After TAX</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-500" />
            </div>
          </div>

          {/* Row 3 Left: Order Date */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Order Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-red-500 shadow-sm transition"
              />
              <Calendar className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Row 3 Right: Empty */}
          <div></div>
        </div>
      </div>

      {/* Items Table */}
      <div className="space-y-3 pt-2">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="border-b border-slate-200 bg-[#f8fafc] text-[11px] font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-3 min-w-[220px]">Item Name</th>
                <th className="px-2 py-3 text-center w-16">Quantity</th>
                <th className="px-2 py-3 text-center w-20">Rate</th>
                <th className="px-2 py-3 text-center w-20">Amount</th>
                <th className="px-2 py-3 text-center w-20">HSN</th>
                <th className="px-2 py-3 text-center w-16">Tax(%)</th>
                <th className="px-2 py-3 text-center w-16">Tax</th>
                <th className="px-2 py-3 text-center w-16">CESS (%)</th>
                <th className="px-2 py-3 text-center w-20">CESS (₹)</th>
                <th className="px-2 py-3 text-center w-20">Discount(%)</th>
                <th className="px-2 py-3 text-center w-20">Total (₹)</th>
                <th className="px-2 py-3 text-center w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it, idx) => {
                const rowCalc = calculated.rowCalcs[idx];
                return (
                  <tr key={idx} className="hover:bg-slate-50/60 transition">
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Enter Product1"
                        value={it.name}
                        onChange={(e) => setItem(idx, { name: e.target.value })}
                        className="w-full rounded-full border border-slate-300 px-3.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-red-500 shadow-sm"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={it.qty}
                        onChange={(e) => setItem(idx, { qty: e.target.value ? Number(e.target.value) : "" })}
                        className="w-16 rounded-full border border-slate-300 px-2 py-1.5 text-xs text-center text-slate-800 outline-none focus:border-red-500 mx-auto block shadow-sm"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        placeholder=""
                        value={it.rate}
                        onChange={(e) => setItem(idx, { rate: e.target.value ? Number(e.target.value) : "" })}
                        className="w-20 rounded-full border border-slate-300 px-2.5 py-1.5 text-xs text-center text-slate-800 outline-none focus:border-red-500 mx-auto block shadow-sm"
                      />
                    </td>
                    <td className="p-2 text-center text-slate-700 font-medium">
                      {rowCalc?.base || 0}
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="text"
                        value={it.hsn || ""}
                        onChange={(e) => setItem(idx, { hsn: e.target.value })}
                        className="w-16 rounded-full border border-slate-200/60 bg-[#eef2f6] px-2 py-1.5 text-xs text-center text-slate-700 outline-none focus:border-red-500 focus:bg-white mx-auto block transition"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={it.taxRate}
                        onChange={(e) => setItem(idx, { taxRate: e.target.value ? Number(e.target.value) : "" })}
                        className="w-14 rounded-full border border-slate-200/60 bg-[#eef2f6] px-1.5 py-1.5 text-xs text-center text-slate-700 outline-none focus:border-red-500 focus:bg-white mx-auto block transition"
                      />
                    </td>
                    <td className="p-2 text-center text-slate-700 font-medium">
                      {rowCalc?.tax || 0}
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={it.cessRate}
                        onChange={(e) => setItem(idx, { cessRate: e.target.value ? Number(e.target.value) : "" })}
                        className="w-14 rounded-full border border-slate-200/60 bg-[#eef2f6] px-1.5 py-1.5 text-xs text-center text-slate-700 outline-none focus:border-red-500 focus:bg-white mx-auto block transition"
                      />
                    </td>
                    <td className="p-2 text-center text-slate-700 font-medium">
                      {rowCalc?.cess || 0}
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={it.discount}
                        onChange={(e) => setItem(idx, { discount: e.target.value ? Number(e.target.value) : "" })}
                        className="w-16 rounded-full border border-slate-200/60 bg-[#eef2f6] px-1.5 py-1.5 text-xs text-center text-slate-700 outline-none focus:border-red-500 focus:bg-white mx-auto block transition"
                      />
                    </td>
                    <td className="p-2 text-center text-slate-800 font-bold">
                      {rowCalc?.rowTotal || 0}
                    </td>
                    <td className="p-2 text-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-500 cursor-pointer transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => setItems([...items, blankItem()])}
          className="inline-flex items-center gap-1 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] px-4 py-2 text-xs font-semibold text-white transition cursor-pointer shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Row
        </button>
      </div>

      {/* Totals & Terms Box (Peach Highlight) */}
      <div className="rounded-xl border border-amber-200 bg-[#FFF9F5] p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Terms and conditions */}
          <div className="space-y-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">Terms and Conditions</span>
              <button
                type="button"
                className="grid h-5 w-5 place-items-center rounded bg-cyan-500 text-white text-xs font-bold hover:bg-cyan-600 cursor-pointer"
              >
                +
              </button>
            </div>
            <textarea
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none focus:border-red-500 shadow-sm"
            />
          </div>

          {/* Update Stock option */}
          <div className="space-y-2 md:col-span-1">
            <label className="text-xs font-bold text-slate-800 block">Update Stock</label>
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="updateStock"
                  checked={updateStock === "YES"}
                  onChange={() => setUpdateStock("YES")}
                  className="accent-[#ea384c]"
                />
                Yes
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="updateStock"
                  checked={updateStock === "NO"}
                  onChange={() => setUpdateStock("NO")}
                  className="accent-[#ea384c]"
                />
                No
              </label>
            </div>
          </div>

          {/* Totals breakdown */}
          <div className="space-y-2 text-xs md:col-span-1">
            <div className="flex items-center justify-between py-1">
              <span className="font-semibold text-slate-500">Amount</span>
              <span className="font-semibold text-slate-800">{inr(calculated.subtotal)}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-amber-100">
              <span className="font-semibold text-slate-500">CESS</span>
              <span className="font-semibold text-slate-800">{inr(calculated.totalCess)}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-amber-100">
              <span className="font-semibold text-slate-500">Total Discount</span>
              <span className="font-semibold text-slate-800">{inr(calculated.totalDiscount)}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-t-2 border-amber-300 font-bold text-sm bg-white p-2.5 rounded-lg shadow-sm">
              <span className="text-slate-800">Grand Total(₹)</span>
              <span className="text-[#ea384c] text-base font-extrabold">{calculated.grandTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
        <Button variant="ghost" onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
          Cancel
        </Button>
        <button
          type="button"
          disabled={busy}
          onClick={create}
          className="rounded-lg bg-[#16a34a] hover:bg-[#15803d] px-6 py-2 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer shadow-md"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Generate Credit Note"}
        </button>
      </div>
    </div>
  );
}
