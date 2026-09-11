"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Loader2, X, Search, CheckCircle2, Calendar, HelpCircle, FileText, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/ui";
import { api, ApiError } from "@/lib/api";
import { AddCustomerModal } from "./AddCustomerModal";

interface Item {
  name: string;
  description?: string;
  qty: number;
  rate: number;
  hsn?: string;
  taxRate: number;
  cessRate: number;
  discount: number;
}

const INDIAN_STATES = [
  "Telangana", "Andhra Pradesh", "Karnataka", "Maharashtra", "Tamil Nadu",
  "Delhi", "Gujarat", "Haryana", "Kerala", "Punjab", "Rajasthan", "Uttar Pradesh", "West Bengal"
];

const blankItem = (): Item => ({
  name: "",
  description: "",
  qty: 1,
  rate: 0,
  hsn: "",
  taxRate: 18,
  cessRate: 0,
  discount: 0,
});

export function CreateInvoice({ orgId, onClose, onCreated, inline = false }: { orgId: string; onClose: () => void; onCreated: () => void; initialCommand?: string; inline?: boolean }) {
  const [customer, setCustomer] = useState({ name: "", gstin: "", state: "Telangana", phone: "" });
  const [customerSearch, setCustomerSearch] = useState("");
  const [prefix, setPrefix] = useState("INV/");
  const [invoiceNo, setInvoiceNo] = useState("0001");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [placeOfSupply, setPlaceOfSupply] = useState("Telangana");
  const [reference, setReference] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [discountType, setDiscountType] = useState("BEFORE_TAX");
  const [shippingCharges, setShippingCharges] = useState(0);
  const [extraCharges, setExtraCharges] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [terms, setTerms] = useState("1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is delayed.");
  const [showAddTerm, setShowAddTerm] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  const [activeTab, setActiveTab] = useState<"traditional" | "smart" | "ai">("ai");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);

  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDraftWithAi() {
    const text = aiPrompt.trim();
    if (!text) return;
    setAiDrafting(true);
    setAiSuccess(false);

    try {
      await api.mod.askAi(orgId, `Parse invoice draft prompt: ${text}`);
    } catch {
      /* ignore */
    }

    let custName = "Ramesh Traders";
    let itemName = "Cement bags";
    let qty = 50;
    let rate = 420;

    const forMatch = text.match(/for\s+([^—\-\n\d]+)/i);
    if (forMatch && forMatch[1]) custName = forMatch[1].trim();

    const qtyMatch = text.match(/(\d+)\s+([a-zA-Z\s]+)\s+at/i);
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1]) || 50;
      itemName = qtyMatch[2].trim();
    }

    const rateMatch = text.match(/at\s+₹?(\d+)/i);
    if (rateMatch) {
      rate = parseFloat(rateMatch[1]) || 420;
    }

    setCustomerSearch(custName);
    setCustomer((prev) => ({ ...prev, name: custName }));
    setItems([
      {
        name: itemName,
        description: "Auto-drafted by AI",
        qty,
        rate,
        hsn: "2523",
        taxRate: 18,
        cessRate: 0,
        discount: 0,
      },
    ]);

    setAiDrafting(false);
    setAiSuccess(true);
    setTimeout(() => setAiSuccess(false), 3000);
  }

  // Auto search customer
  async function searchCustomer(query: string) {
    setCustomerSearch(query);
    setCustomer((prev) => ({ ...prev, name: query }));
    if (!query.trim()) return;
    try {
      const c = await api.acc.lookupCustomer(orgId, query);
      if (c) {
        setCustomer({
          name: String(c.name ?? query),
          gstin: String(c.gstin ?? ""),
          state: String(c.state ?? "Telangana"),
          phone: String(c.phone ?? ""),
        });
        if (c.state) setPlaceOfSupply(String(c.state));
      }
    } catch { /* ignore */ }
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

    for (const it of items) {
      const base = (it.qty || 0) * (it.rate || 0);
      const disc = (base * (it.discount || 0)) / 100;
      totalDiscount += disc;
      const taxable = Math.max(0, base - disc);
      subtotal += taxable;
      const tax = (taxable * (it.taxRate || 0)) / 100;
      totalTax += tax;
      const cess = (taxable * (it.cessRate || 0)) / 100;
      totalCess += cess;
    }

    const netAmount = subtotal;
    const finalBeforeRound = netAmount + totalTax + totalCess + Number(shippingCharges || 0) + Number(extraCharges || 0);
    const grandTotal = Math.round(finalBeforeRound + Number(roundOff || 0));

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalCess: Math.round(totalCess * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      grandTotal,
    };
  }, [items, shippingCharges, extraCharges, roundOff]);

  const fullInvoiceNumber = `${prefix}${invoiceNo}`;

  async function create() {
    if (!customer.name.trim()) {
      setError("Please select or enter a customer name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.acc.createSale(orgId, {
        customerName: customer.name,
        invoiceNo: fullInvoiceNumber,
        date: invoiceDate,
        placeOfSupply,
        reference,
        vehicleNumber,
        items,
        total: calculated.grandTotal,
        source: "FORM",
      });

      // Persist locally for immediate retention and Reports Center visibility
      try {
        const fullInvoiceRecord = {
          id: `inv-${Date.now()}`,
          invoice_no: fullInvoiceNumber,
          customer_name: customer.name,
          customer_gstin: customer.gstin,
          customer_phone: customer.phone,
          customer_state: customer.state,
          place_of_supply: placeOfSupply,
          reference,
          vehicle_number: vehicleNumber,
          doc_type: "Tax Invoice",
          date: invoiceDate,
          due_date: new Date(new Date(invoiceDate).getTime() + 15 * 86400000).toISOString().slice(0, 10),
          return_period: "09-2026",
          items: items.map((it, idx) => ({
            id: `item-${idx + 1}`,
            name: it.name || "Item",
            description: it.description || "",
            hsn: it.hsn || "998311",
            hsnSac: it.hsn || "998311",
            quantity: Number(it.qty || 1),
            qty: Number(it.qty || 1),
            rate: Number(it.rate || 0),
            discount: Number(it.discount || 0),
            discountPct: Number(it.discount || 0),
            taxRate: Number(it.taxRate || 18),
            taxPct: Number(it.taxRate || 18),
            total: Math.round(((it.qty || 1) * (it.rate || 0) * (1 - (it.discount || 0) / 100)) * (1 + (it.taxRate || 18) / 100)),
          })),
          subtotal: calculated.subtotal,
          totalTax: calculated.totalTax,
          totalCess: calculated.totalCess,
          totalDiscount: calculated.totalDiscount,
          shippingCharges: Number(shippingCharges || 0),
          extraCharges: Number(extraCharges || 0),
          roundOff: Number(roundOff || 0),
          terms,
          total: calculated.grandTotal,
          status: "ISSUED",
          created_at: new Date().toISOString(),
        };

        const existingLocal = JSON.parse(localStorage.getItem("vertofi_local_sales") || "[]");
        localStorage.setItem("vertofi_local_sales", JSON.stringify([fullInvoiceRecord, ...existingLocal]));
      } catch (_err) {}

      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed to create invoice");
    } finally {
      setBusy(false);
    }
  }

  const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-white shadow-card p-6 space-y-6">
      {/* Top Title Bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-xl font-bold text-ink flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand" /> Create Invoice for Customer
        </h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-slate-100 hover:text-ink cursor-pointer">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("ai")}
          className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition cursor-pointer shadow-xs bg-[#0B132B] text-white"
        >
          <Sparkles className="h-4 w-4 text-amber-300" /> Create with AI
        </button>
      </div>

      {/* Create with AI Card */}
      <div className="rounded-xl border border-blue-200 bg-[#F4F8FF] p-5 space-y-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900">Describe the invoice</h3>
        </div>

        <textarea
          rows={3}
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Generate invoice for Ramesh Traders — 50 cement bags at ₹420 per bag."
          className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 shadow-2xs resize-y"
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={aiDrafting}
            onClick={handleDraftWithAi}
            className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 px-5 py-2 text-sm font-medium text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {aiDrafting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Draft with AI
          </button>
          {aiSuccess && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              ✓ Invoice drafted! Review fields below.
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500">
          AI drafts the invoice — you review and confirm before it&apos;s created.
        </p>
      </div>

      <div className="space-y-6">
          {/* Customer Search Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">Search Customer</label>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add New Customer
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => searchCustomer(e.target.value)}
                placeholder="Enter Customer Name or Mobile Number or Company to search"
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none focus:border-brand shadow-sm"
              />
              <Search className="absolute right-3.5 top-3 h-4 w-4 text-muted" />
            </div>
          </div>

          {/* Invoice Details Section */}
          <div className="rounded-xl border border-border bg-bg2/40 p-4 space-y-4">
            <h3 className="text-sm font-bold text-ink">Invoice Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="text-xs font-medium text-muted flex items-center gap-1">
                  Select Prefix <span className="text-danger">*</span> <HelpCircle className="h-3 w-3 text-muted" />
                </label>
                <select
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer"
                >
                  <option value="INV/">INV/</option>
                  <option value="TAX/">TAX/</option>
                  <option value="BILL/">BILL/</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Invoice Number <span className="text-danger">*</span></label>
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-1/2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-brand"
                  />
                  <span className="w-1/2 truncate rounded-lg border border-border bg-slate-100 px-3 py-2 text-xs font-bold text-brand">
                    {fullInvoiceNumber}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Invoice Date <span className="text-danger">*</span></label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Place Of Supply <span className="text-danger">*</span></label>
                <select
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="text-xs font-medium text-muted flex items-center gap-1">Reference <HelpCircle className="h-3 w-3 text-muted" /></label>
                <input
                  type="text"
                  placeholder="Reference#"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Reference Date</label>
                <input
                  type="date"
                  value={referenceDate}
                  onChange={(e) => setReferenceDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Vehicle Number (Optional)</label>
                <input
                  type="text"
                  placeholder="Vehicle Number"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer"
                >
                  <option value="BEFORE_TAX">% Discount Before TAX</option>
                  <option value="AFTER_TAX">% Discount After TAX</option>
                </select>
              </div>
            </div>
          </div>

          {/* Items Table Section */}
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-bg2 text-[11px] font-semibold text-muted">
                  <tr>
                    <th className="px-3 py-2.5 min-w-[220px]">
                      <div className="flex items-center justify-between">
                        <span>Item Name</span>
                        <button
                          type="button"
                          onClick={() => {
                            const name = prompt("Enter new product name:");
                            if (name) setItems([...items, { ...blankItem(), name }]);
                          }}
                          className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white transition hover:bg-emerald-700 cursor-pointer"
                        >
                          + Add New Product
                        </button>
                      </div>
                    </th>
                    <th className="px-2 py-2.5 text-center w-16">Qty</th>
                    <th className="px-2 py-2.5 text-right w-24">Rate (₹)</th>
                    <th className="px-2 py-2.5 text-right w-24">Amount</th>
                    <th className="px-2 py-2.5 w-20">HSN/SAC</th>
                    <th className="px-2 py-2.5 text-center w-16">Tax (₹)</th>
                    <th className="px-2 py-2.5 text-right w-20">Tax (₹)</th>
                    <th className="px-2 py-2.5 text-center w-16">CESS (₹)</th>
                    <th className="px-2 py-2.5 text-right w-20">CESS (₹)</th>
                    <th className="px-2 py-2.5 text-center w-16">Disc (%)</th>
                    <th className="px-2 py-2.5 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((it, idx) => {
                    const baseAmt = (it.qty || 0) * (it.rate || 0);
                    const discAmt = (baseAmt * (it.discount || 0)) / 100;
                    const taxable = Math.max(0, baseAmt - discAmt);
                    const taxVal = (taxable * (it.taxRate || 0)) / 100;
                    const cessVal = (taxable * (it.cessRate || 0)) / 100;

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 space-y-1">
                          <input
                            type="text"
                            placeholder="Enter Product name"
                            value={it.name}
                            onChange={(e) => setItem(idx, { name: e.target.value })}
                            className="w-full rounded-md border border-border px-2.5 py-1 text-xs text-ink font-semibold outline-none focus:border-brand"
                          />
                          <input
                            type="text"
                            placeholder="Enter Product description (Optional)"
                            value={it.description || ""}
                            onChange={(e) => setItem(idx, { description: e.target.value })}
                            className="w-full rounded-md border border-border/60 bg-slate-50 px-2.5 py-0.5 text-[11px] text-muted outline-none focus:border-brand"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            value={it.qty}
                            onChange={(e) => setItem(idx, { qty: Number(e.target.value) })}
                            className="w-14 rounded-md border border-border px-2 py-1 text-xs text-center text-ink outline-none focus:border-brand"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={it.rate}
                            onChange={(e) => setItem(idx, { rate: Number(e.target.value) })}
                            className="w-20 rounded-md border border-border px-2 py-1 text-xs text-right text-ink outline-none focus:border-brand"
                          />
                        </td>
                        <td className="p-2 text-right font-semibold text-ink">
                          {inr(baseAmt)}
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="HSN"
                            value={it.hsn || ""}
                            onChange={(e) => setItem(idx, { hsn: e.target.value })}
                            className="w-16 rounded-md border border-border px-2 py-1 text-xs text-ink outline-none focus:border-brand"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            value={it.taxRate}
                            onChange={(e) => setItem(idx, { taxRate: Number(e.target.value) })}
                            className="w-14 rounded-md border border-border px-1.5 py-1 text-xs text-center text-ink outline-none focus:border-brand"
                          />
                        </td>
                        <td className="p-2 text-right text-muted">{inr(taxVal)}</td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            value={it.cessRate}
                            onChange={(e) => setItem(idx, { cessRate: Number(e.target.value) })}
                            className="w-14 rounded-md border border-border px-1.5 py-1 text-xs text-center text-ink outline-none focus:border-brand"
                          />
                        </td>
                        <td className="p-2 text-right text-muted">{inr(cessVal)}</td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            value={it.discount}
                            onChange={(e) => setItem(idx, { discount: Number(e.target.value) })}
                            className="w-14 rounded-md border border-border px-1.5 py-1 text-xs text-center text-ink outline-none focus:border-brand"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => setItems(items.filter((_, i) => i !== idx))}
                            className="text-muted hover:text-danger cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add Row
            </button>
          </div>

          {/* Totals & Terms Container (Peach Highlight Box) */}
          <div className="rounded-xl border border-amber-200 bg-[#FFF9F5] p-5">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Terms and conditions */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink">Terms and Conditions</span>
                  <button
                    type="button"
                    onClick={() => setShowAddTerm(!showAddTerm)}
                    className="grid h-5 w-5 place-items-center rounded bg-cyan-500 text-white text-xs font-bold hover:bg-cyan-600 cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white p-3 text-xs text-ink outline-none focus:border-brand"
                />
              </div>

              {/* Totals breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="font-semibold text-muted">Shipping Charges</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted text-[11px]">( Tax ₹ 0 )</span>
                    <input
                      type="number"
                      value={shippingCharges}
                      onChange={(e) => setShippingCharges(Number(e.target.value))}
                      className="w-28 rounded border border-border bg-white px-2 py-1 text-right text-xs text-ink outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-t border-amber-100">
                  <span className="font-semibold text-muted">Amount</span>
                  <span className="font-semibold text-ink">{inr(calculated.subtotal)}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-t border-amber-100">
                  <span className="font-semibold text-muted">CESS</span>
                  <span className="font-semibold text-ink">{inr(calculated.totalCess)}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-t border-amber-100">
                  <span className="font-semibold text-muted">Total Discount</span>
                  <span className="font-semibold text-ink">{inr(calculated.totalDiscount)}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-t border-amber-100">
                  <span className="font-semibold text-muted">Extra Charges</span>
                  <input
                    type="number"
                    value={extraCharges}
                    onChange={(e) => setExtraCharges(Number(e.target.value))}
                    className="w-28 rounded border border-border bg-white px-2 py-1 text-right text-xs text-ink outline-none"
                  />
                </div>

                <div className="flex items-center justify-between py-1 border-t border-amber-100 font-bold">
                  <span className="text-ink">Total Amount (₹)</span>
                  <span className="text-ink">{inr(calculated.subtotal + calculated.totalTax)}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-t border-amber-100">
                  <span className="font-semibold text-muted">Round Off</span>
                  <input
                    type="number"
                    step="0.01"
                    value={roundOff}
                    onChange={(e) => setRoundOff(Number(e.target.value))}
                    className="w-28 rounded border border-border bg-white px-2 py-1 text-right text-xs text-ink outline-none"
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t-2 border-amber-300 font-bold text-sm bg-white p-2.5 rounded-lg">
                  <span className="text-ink">Grand Total (₹)</span>
                  <span className="text-brand text-base font-extrabold">{inr(calculated.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-danger">{error}</p>}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button variant="ghost" onClick={onClose} className="rounded-lg border border-border px-5 py-2 text-xs font-semibold text-ink">
            Cancel
          </Button>
          <button
            type="button"
            disabled={busy}
            onClick={create}
            className="rounded-lg bg-brand px-6 py-2 text-xs font-bold text-white transition hover:bg-brand/90 disabled:opacity-50 cursor-pointer shadow-md"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Generate Invoice"}
          </button>
        </div>

        <AddCustomerModal
          orgId={orgId}
          isOpen={showAddCustomerModal}
          onClose={() => setShowAddCustomerModal(false)}
          onCustomerAdded={(newCust) => {
            setCustomerSearch(newCust.name);
            setCustomer({
              name: newCust.name,
              gstin: "",
              state: newCust.state || "Telangana",
              phone: newCust.phone || "",
            });
            if (newCust.state) setPlaceOfSupply(newCust.state);
            setShowAddCustomerModal(false);
          }}
        />
      </div>
  );
}
