"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2, Loader2, Search, HelpCircle } from "lucide-react";
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

export function CreateDeliveryChallan({
  orgId,
  onClose,
  onCreated,
  inline = false,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: () => void;
  initialCommand?: string;
  inline?: boolean;
}) {
  const [customer, setCustomer] = useState({ name: "", gstin: "", state: "Telangana", phone: "" });
  const [customerSearch, setCustomerSearch] = useState("");
  const [prefix, setPrefix] = useState("DC/");
  const [challanNo, setChallanNo] = useState("0001");
  const [challanDate, setChallanDate] = useState(new Date().toISOString().slice(0, 10));
  const [placeOfSupply, setPlaceOfSupply] = useState("Telangana");
  const [reference, setReference] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [discountType, setDiscountType] = useState("BEFORE_TAX");
  const [shippingCharges, setShippingCharges] = useState(0);
  const [extraCharges, setExtraCharges] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [terms, setTerms] = useState(
    "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is delayed."
  );
  const [showAddTerm, setShowAddTerm] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch {
      /* ignore */
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
    const finalBeforeRound =
      netAmount + totalTax + totalCess + Number(shippingCharges || 0) + Number(extraCharges || 0);
    const grandTotal = Math.round(finalBeforeRound + Number(roundOff || 0));

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalCess: Math.round(totalCess * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      grandTotal,
    };
  }, [items, shippingCharges, extraCharges, roundOff]);

  const fullChallanNumber = `${prefix}${challanNo}`;

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
        invoiceNo: fullChallanNumber,
        date: challanDate,
        placeOfSupply,
        reference,
        vehicleNumber,
        items,
        total: calculated.grandTotal,
        source: "FORM",
        docType: "DELIVERY_CHALLAN",
      });

      try {
        const newRecord = {
          id: `challan-${Date.now()}`,
          invoice_no: fullChallanNumber,
          customer_name: customer.name,
          doc_type: "Delivery Challan",
          date: challanDate,
          return_period: "09-2026",
          total: calculated.grandTotal,
          status: "ISSUED",
        };
        const existing = JSON.parse(localStorage.getItem("vertofi_local_sales") || "[]");
        localStorage.setItem("vertofi_local_sales", JSON.stringify([newRecord, ...existing]));
      } catch (_err) {}

      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed to create delivery challan");
    } finally {
      setBusy(false);
    }
  }

  const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="w-full overflow-hidden bg-white p-6 space-y-6">
      {/* Top Title Bar */}
      <div className="pb-6">
        <h2 className="text-xl font-bold text-ink">
          Create Delivery Challan
        </h2>
      </div>

      <div className="space-y-6">
        {/* Customer Search Section */}
        <div className="space-y-4">
          <div>
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(true)}
              className="inline-flex items-center gap-1 rounded-full bg-[#229731] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1b7a27] cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add New Customer
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-muted uppercase tracking-wider">Search Customer</label>
            <div className="relative">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => searchCustomer(e.target.value)}
                placeholder="Enter Customer Name or Mobile Number or Company to search"
                className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-[13px] text-ink outline-none focus:border-brand shadow-sm"
              />
              <Search className="absolute right-4 top-3 h-4 w-4 text-muted" />
            </div>
          </div>
        </div>

        {/* Delivery Challan Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-ink">Delivery Challan Details</h3>

          {/* Row 1: Select Prefix */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted flex items-center gap-1">
                Select Prefix <span className="text-danger">*</span> <HelpCircle className="h-3.5 w-3.5 text-muted" />
              </label>
              <select
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 text-[13px] text-ink outline-none focus:border-brand cursor-pointer"
              >
                <option value="DC/">DC/</option>
                <option value="INV/">INV/</option>
                <option value="BILL/">BILL/</option>
              </select>
            </div>
          </div>

          {/* Row 2: Challan Number, Reference, Discount */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[13px] font-medium text-muted">
                Delivery Challan Number <span className="text-danger">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={challanNo}
                  onChange={(e) => setChallanNo(e.target.value)}
                  className="w-1/2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[13px] font-semibold text-ink outline-none focus:border-brand"
                />
                <span className="w-1/2 truncate rounded-full border border-gray-200 bg-slate-100 px-4 py-2 text-[13px] font-bold text-brand">
                  {fullChallanNumber}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted flex items-center gap-1">
                Reference <HelpCircle className="h-3.5 w-3.5 text-muted" />
              </label>
              <input
                type="text"
                placeholder="Reference#"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 text-[13px] text-ink outline-none focus:border-brand"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted">Discount</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 text-[13px] text-ink outline-none focus:border-brand cursor-pointer"
              >
                <option value="BEFORE_TAX">% Discount Before TAX</option>
                <option value="AFTER_TAX">% Discount After TAX</option>
              </select>
            </div>
          </div>

          {/* Row 3: Date, Place of Supply, Vehicle Number */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted">Delivery Challan Date</label>
              <input
                type="date"
                value={challanDate}
                onChange={(e) => setChallanDate(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 text-[13px] text-ink outline-none focus:border-brand"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted">
                Place Of Supply <span className="text-danger">*</span>
              </label>
              <select
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 text-[13px] text-ink outline-none focus:border-brand cursor-pointer"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted">Vehicle Number (Optional)</label>
              <input
                type="text"
                placeholder="Vehicle Number"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 text-[13px] text-ink outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>

        {/* Items Table Section */}
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9FAFB] text-[12px] font-semibold text-[#6B7280] border-b border-gray-100">
                <tr>
                  <th className="px-3 py-3 min-w-[220px]">
                    <div className="flex items-center gap-4">
                      <span>Item Name</span>
                      <button
                        type="button"
                        onClick={() => {
                          const name = prompt("Enter new product name:");
                          if (name) setItems([...items, { ...blankItem(), name }]);
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-[#229731] px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-[#1b7a27] cursor-pointer"
                      >
                        + Add New Product
                      </button>
                    </div>
                  </th>
                  <th className="px-2 py-3 text-center w-16">Quantity</th>
                  <th className="px-2 py-3 text-center">Rate</th>
                  <th className="px-2 py-3 text-right">Amount</th>
                  <th className="px-2 py-3 text-center w-20">HSN/SAC</th>
                  <th className="px-2 py-3 text-center w-16">Tax (%)</th>
                  <th className="px-2 py-3 text-right w-20">Tax (₹)</th>
                  <th className="px-2 py-3 text-center w-16">CESS (%)</th>
                  <th className="px-2 py-3 text-right w-20">CESS (₹)</th>
                  <th className="px-2 py-3 text-center w-16">Discount (%)</th>
                  <th className="px-2 py-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {items.map((it, idx) => {
                  const baseAmt = (it.qty || 0) * (it.rate || 0);
                  const disc = (baseAmt * (it.discount || 0)) / 100;
                  const taxable = Math.max(0, baseAmt - disc);
                  const taxVal = (taxable * (it.taxRate || 0)) / 100;
                  const cessVal = (taxable * (it.cessRate || 0)) / 100;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2 space-y-1">
                        <input
                          value={it.name}
                          onChange={(e) => setItem(idx, { name: e.target.value })}
                          className="w-full rounded-full border border-gray-200 px-3 py-1.5 text-xs text-ink outline-none focus:border-brand"
                          placeholder="Enter Product name"
                        />
                        <input
                          value={it.description || ""}
                          onChange={(e) => setItem(idx, { description: e.target.value })}
                          className="w-full rounded-full border border-gray-200 px-3 py-1 text-[11px] text-muted outline-none focus:border-brand"
                          placeholder="Enter Product description (Optional)"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={it.qty}
                          onChange={(e) => setItem(idx, { qty: Number(e.target.value) })}
                          className="w-14 rounded-full border border-gray-200 px-2 py-1 text-xs text-center text-ink outline-none focus:border-brand"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          value={it.rate || ""}
                          onChange={(e) => setItem(idx, { rate: Number(e.target.value) })}
                          className="w-20 rounded-full border border-gray-200 px-2 py-1 text-xs text-right text-ink outline-none focus:border-brand"
                          placeholder="0.00"
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
                          className="w-16 rounded-full border border-gray-200 px-2 py-1 text-xs text-ink outline-none focus:border-brand"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={it.taxRate}
                          onChange={(e) => setItem(idx, { taxRate: Number(e.target.value) })}
                          className="w-14 rounded-full border border-gray-200 px-1.5 py-1 text-xs text-center text-ink outline-none focus:border-brand"
                        />
                      </td>
                      <td className="p-2 text-right text-muted">{inr(taxVal)}</td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={it.cessRate}
                          onChange={(e) => setItem(idx, { cessRate: Number(e.target.value) })}
                          className="w-14 rounded-full border border-gray-200 px-1.5 py-1 text-xs text-center text-ink outline-none focus:border-brand"
                        />
                      </td>
                      <td className="p-2 text-right text-muted">{inr(cessVal)}</td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={it.discount || ""}
                          onChange={(e) => setItem(idx, { discount: Number(e.target.value) })}
                          className="w-14 rounded-full border border-gray-200 px-1.5 py-1 text-xs text-center text-ink outline-none focus:border-brand"
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
            className="inline-flex items-center gap-1 rounded-full bg-[#229731] px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#1b7a27] cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Row
          </button>
        </div>

        {/* Totals & Terms Container (Peach Highlight Box) */}
        <div className="mt-6">
          <div className="h-2 w-full bg-[#F6A869] rounded-t-lg"></div>
          <div className="rounded-b-lg border border-[#f5dfcc] bg-[#FDF4EB] p-5">
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
                  className="w-full rounded-3xl border border-gray-200 bg-white p-4 text-xs text-ink outline-none focus:border-brand shadow-xs"
                />
              </div>

              {/* Totals breakdown */}
              <div className="space-y-3 text-[13px]">
                <div className="flex items-start justify-between">
                  <span className="font-medium text-ink pt-4">Shipping Charges</span>
                  <div className="flex flex-col w-48">
                    <label className="text-[11px] text-muted mb-0.5">Value</label>
                    <input
                      type="number"
                      value={shippingCharges || ""}
                      onChange={(e) => setShippingCharges(Number(e.target.value))}
                      className="w-full border-b border-gray-400 bg-transparent py-0.5 text-left text-ink outline-none"
                    />
                    <span className="text-[11px] text-ink mt-0.5 font-medium">( Tax ₹ 0 )</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="font-medium text-ink">Amount</span>
                  <span className="text-ink">{inr(calculated.subtotal)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">CESS</span>
                  <span className="text-ink">{inr(calculated.totalCess)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">Total Discount</span>
                  <span className="text-ink">{inr(calculated.totalDiscount)}</span>
                </div>

                <div className="flex items-start justify-between">
                  <span className="font-medium text-ink pt-4">Extra Charges</span>
                  <div className="flex flex-col w-48">
                    <label className="text-[11px] text-muted mb-0.5">Value</label>
                    <input
                      type="number"
                      value={extraCharges || ""}
                      onChange={(e) => setExtraCharges(Number(e.target.value))}
                      className="w-full border-b border-gray-400 bg-transparent py-0.5 text-left text-ink outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 font-bold">
                  <span className="text-ink">Total Amount (₹)</span>
                  <span className="text-ink">{inr(calculated.subtotal + calculated.totalTax)}</span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="font-medium text-ink">Round Off</span>
                  <input
                    type="number"
                    step="0.01"
                    value={roundOff}
                    onChange={(e) => setRoundOff(Number(e.target.value))}
                    className="w-48 rounded-md border border-border bg-white px-3 py-1.5 text-left text-ink outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 font-bold">
                  <span className="text-ink">Grand Total (₹)</span>
                  <input
                    type="text"
                    disabled
                    value={inr(calculated.grandTotal)}
                    className="w-48 rounded-md border border-border bg-slate-100 px-3 py-1.5 text-left font-bold text-ink outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-xs font-semibold text-danger">{error}</p>}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <Button
          variant="ghost"
          onClick={onClose}
          className="rounded-full border border-border bg-white px-6 py-2 text-[13px] font-semibold text-ink"
        >
          Cancel
        </Button>
        <button
          type="button"
          disabled={busy}
          onClick={create}
          className="rounded-full bg-[#E52F39] px-6 py-2 text-[13px] font-bold text-white transition hover:bg-red-700 disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Generate Delivery Challan"}
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
