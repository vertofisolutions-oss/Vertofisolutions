"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2, Loader2, Search, HelpCircle, FileText } from "lucide-react";
import { Button } from "@/ui";
import { api, ApiError } from "@/lib/api";

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

export function CreateDebitNoteView({
  orgId,
  onClose,
  onCreated,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [supplier, setSupplier] = useState<{ name: string; gstin: string; phone: string; address: string } | null>(null);
  const [prefix, setPrefix] = useState("DN/");
  const [orderNo, setOrderNo] = useState("0001");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [discountType, setDiscountType] = useState("BEFORE_TAX");
  const [updateStock, setUpdateStock] = useState<"YES" | "NO">("YES");
  const [terms, setTerms] = useState("1. Debit note issued for returned goods / price adjustment.\n2. Amount will be debited from supplier ledger.");

  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [busy, setBusy] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullDebitNoteNo = `${prefix}${orderNo}`;

  async function searchPurchase() {
    if (!purchaseSearch.trim()) return;
    setSearchBusy(true);
    setError(null);
    try {
      const docs = await api.acc.documents(orgId);
      const doc = Array.isArray(docs) ? docs.find((d) => String(d.bill_no ?? d.number ?? "").toLowerCase() === purchaseSearch.trim().toLowerCase()) : null;
      if (doc) {
        setSupplier({
          name: String(doc.vendor_name ?? doc.supplier_name ?? doc.customer_name ?? "Supplier"),
          gstin: String(doc.gstin ?? ""),
          phone: String(doc.phone ?? ""),
          address: String(doc.address ?? ""),
        });
        setReference(String(doc.bill_no ?? purchaseSearch.trim()));
      } else {
        setSupplier({ name: purchaseSearch.trim(), gstin: "", phone: "", address: "" });
        setReference(purchaseSearch.trim());
      }
    } catch {
      setSupplier({ name: purchaseSearch.trim(), gstin: "", phone: "", address: "" });
      setReference(purchaseSearch.trim());
    } finally {
      setSearchBusy(false);
    }
  }

  function setItem(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

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

    const grandTotal = Math.round(subtotal + totalTax + totalCess);

    return {
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
      await api.acc.createSale(orgId, {
        customerName: supplier?.name || "Supplier",
        invoiceNo: fullDebitNoteNo,
        date: orderDate,
        doc_type: "DEBIT_NOTE",
        reference,
        items,
        total: calculated.grandTotal,
        updateStock: updateStock === "YES",
        source: "FORM",
      });
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed to create debit note");
    } finally {
      setBusy(false);
    }
  }

  const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-white shadow-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-xl font-bold text-ink flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand" /> Create Debit Note
        </h2>
      </div>

      {/* Top Search Purchase & Supplier Details */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-ink flex items-center gap-1">
            Fetch Purchase Details by Purchase Number <HelpCircle className="h-3.5 w-3.5 text-brand cursor-pointer" />
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter Purchase Number to search"
              value={purchaseSearch}
              onChange={(e) => setPurchaseSearch(e.target.value)}
              className="flex-1 rounded-xl border border-border px-4 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
            />
            <button
              type="button"
              onClick={searchPurchase}
              disabled={searchBusy}
              className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white hover:bg-brand/90 cursor-pointer disabled:opacity-50"
            >
              {searchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-bg2/40 p-3 text-xs space-y-1">
          <p className="font-semibold text-muted">Supplier Details</p>
          {supplier ? (
            <div>
              <p className="font-bold text-ink">{supplier.name}</p>
              {supplier.gstin && <p className="text-muted">GSTIN: {supplier.gstin}</p>}
              {supplier.phone && <p className="text-muted">Phone: {supplier.phone}</p>}
            </div>
          ) : (
            <p className="text-muted italic">Search purchase above to auto-populate supplier details.</p>
          )}
        </div>
      </div>

      {/* Debit Note Detail Card */}
      <div className="rounded-xl border border-border bg-bg2/40 p-4 space-y-4">
        <h3 className="text-sm font-bold text-ink">Debit Note Detail</h3>
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
              <option value="DN/">DN/</option>
              <option value="DBN/">DBN/</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Debit Note Number <span className="text-danger">*</span></label>
            <div className="mt-1 flex items-center gap-1.5">
              <input
                type="text"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                className="w-1/2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-brand"
              />
              <span className="w-1/2 truncate rounded-lg border border-border bg-slate-100 px-3 py-2 text-xs font-bold text-brand text-center">
                {fullDebitNoteNo}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted flex items-center gap-1">
              Reference <HelpCircle className="h-3 w-3 text-muted" />
            </label>
            <input
              type="text"
              placeholder="Reference #"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Discount</label>
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-muted">Date <span className="text-danger">*</span></label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="space-y-3">
        <div className="w-full overflow-visible rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-bg2 text-[11px] font-semibold text-muted">
              <tr>
                <th className="px-3 py-2.5 min-w-[200px]">Item Name</th>
                <th className="px-2 py-2.5 text-center w-16">Quantity</th>
                <th className="px-2 py-2.5 text-right w-20">Rate</th>
                <th className="px-2 py-2.5 text-right w-20">Amount</th>
                <th className="px-2 py-2.5 w-20">HSN</th>
                <th className="px-2 py-2.5 text-center w-16">Tax(%)</th>
                <th className="px-2 py-2.5 text-right w-20">Tax</th>
                <th className="px-2 py-2.5 text-center w-16">CESS (%)</th>
                <th className="px-2 py-2.5 text-right w-20">CESS (₹)</th>
                <th className="px-2 py-2.5 text-center w-16">Discount(%)</th>
                <th className="px-2 py-2.5 text-right w-24">Total (₹)</th>
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
                const lineTotal = Math.round(taxable + taxVal + cessVal);

                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2 space-y-1">
                      <input
                        type="text"
                        placeholder="Enter Product"
                        value={it.name}
                        onChange={(e) => setItem(idx, { name: e.target.value })}
                        className="w-full rounded-md border border-border px-2.5 py-1 text-xs text-ink font-semibold outline-none focus:border-brand"
                      />
                      <input
                        type="text"
                        placeholder="Enter Product description"
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
                        className="w-16 rounded-md border border-border px-2 py-1 text-xs text-right text-ink outline-none focus:border-brand"
                      />
                    </td>
                    <td className="p-2 text-right font-semibold text-ink">{baseAmt}</td>
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
                    <td className="p-2 text-right text-muted">{taxVal}</td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={it.cessRate}
                        onChange={(e) => setItem(idx, { cessRate: Number(e.target.value) })}
                        className="w-14 rounded-md border border-border px-1.5 py-1 text-xs text-center text-ink outline-none focus:border-brand"
                      />
                    </td>
                    <td className="p-2 text-right text-muted">{cessVal}</td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={it.discount}
                        onChange={(e) => setItem(idx, { discount: Number(e.target.value) })}
                        className="w-14 rounded-md border border-border px-1.5 py-1 text-xs text-center text-ink outline-none focus:border-brand"
                      />
                    </td>
                    <td className="p-2 text-right font-bold text-ink">{lineTotal}</td>
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

      {/* Totals Box (Peach Highlight) */}
      <div className="rounded-xl border border-amber-200 bg-[#FFF9F5] p-5">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-bold text-ink block">Update Stock</label>
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer font-medium">
                <input
                  type="radio"
                  name="updateStockDebit"
                  checked={updateStock === "YES"}
                  onChange={() => setUpdateStock("YES")}
                  className="accent-brand"
                />
                Yes
              </label>
              <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer font-medium">
                <input
                  type="radio"
                  name="updateStockDebit"
                  checked={updateStock === "NO"}
                  onChange={() => setUpdateStock("NO")}
                  className="accent-brand"
                />
                No
              </label>
            </div>
          </div>

          <div className="space-y-2 text-xs md:col-span-1">
            <div className="flex items-center justify-between py-1">
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

            <div className="flex items-center justify-between py-2 border-t-2 border-amber-300 font-bold text-sm bg-white p-2.5 rounded-lg">
              <span className="text-ink">Grand Total(₹)</span>
              <span className="text-brand text-base font-extrabold">{calculated.grandTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-danger">{error}</p>}

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
          {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Generate Debit Note"}
        </button>
      </div>
    </div>
  );
}
