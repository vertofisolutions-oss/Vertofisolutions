"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2, Loader2, Search, HelpCircle, FileText, Calendar } from "lucide-react";
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

export function CreatePurchaseView({
  orgId,
  onClose,
  onCreated,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplier, setSupplier] = useState<{ name: string; gstin: string; phone: string; address: string } | null>(null);
  const [purchaseNo, setPurchaseNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [rcm, setRcm] = useState("No");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [reference, setReference] = useState("");
  const [discountType, setDiscountType] = useState("BEFORE_TAX");
  const [updateStock, setUpdateStock] = useState<"YES" | "NO">("YES");
  const [shippingCharges, setShippingCharges] = useState(0);
  const [roundOff, setRoundOff] = useState(0);

  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto search supplier
  async function searchSupplier(query: string) {
    setSupplierSearch(query);
    if (!query.trim()) return;
    try {
      const c = await api.acc.lookupCustomer(orgId, query);
      if (c) {
        setSupplier({
          name: String(c.name ?? query),
          gstin: String(c.gstin ?? ""),
          phone: String(c.phone ?? ""),
          address: String(c.address ?? ""),
        });
      } else {
        setSupplier({ name: query, gstin: "", phone: "", address: "" });
      }
    } catch {
      setSupplier({ name: query, gstin: "", phone: "", address: "" });
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

    const netBeforeRound = subtotal + totalTax + totalCess + Number(shippingCharges || 0);
    const grandTotal = Math.round(netBeforeRound + Number(roundOff || 0));

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalCess: Math.round(totalCess * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      grandTotal,
    };
  }, [items, shippingCharges, roundOff]);

  async function create() {
    const suppName = (supplier?.name || supplierSearch).trim();
    if (!suppName) {
      setError("Please enter or select a supplier.");
      return;
    }

    const validItems = items.filter((it) => it.name && it.name.trim().length > 0);
    if (validItems.length === 0) {
      setError("Please enter at least one product name in the items list.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const pNo = purchaseNo.trim() || `PUR-${Date.now().toString().slice(-5)}`;
      const pDate = purchaseDate || new Date().toISOString().slice(0, 10);
      const grandTotal = calculated.grandTotal;

      // ── 1. Create & Save Purchase Record ──
      const newPurchase: Record<string, unknown> = {
        id: `pur-${Date.now()}`,
        vendor_name: suppName,
        supplier_name: suppName,
        bill_no: pNo,
        purchase_no: pNo,
        number: pNo,
        date: pDate,
        doc_type: "PURCHASE_BILL",
        rcm,
        vehicleNumber: vehicleNumber.trim() || undefined,
        reference: reference.trim() || undefined,
        items: validItems,
        total: grandTotal,
        amount: grandTotal,
        subtotal: calculated.subtotal,
        tax: calculated.totalTax,
        cess: calculated.totalCess,
        discount: calculated.totalDiscount,
        shipping_charges: Number(shippingCharges || 0),
        round_off: Number(roundOff || 0),
        updateStock: updateStock === "YES",
        source: "FORM",
        status: "PAID",
        created_at: new Date().toISOString(),
      };

      try {
        const existingPurchases = JSON.parse(localStorage.getItem("vertofi_local_purchases") || "[]");
        existingPurchases.unshift(newPurchase);
        localStorage.setItem("vertofi_local_purchases", JSON.stringify(existingPurchases));
      } catch {}

      // ── 2. Add / Update Products in Products List (vertofi_local_products) ──
      try {
        const storedProducts = JSON.parse(localStorage.getItem("vertofi_local_products") || "[]");
        const updatedProducts = Array.isArray(storedProducts) ? [...storedProducts] : [];

        for (const it of validItems) {
          const itName = it.name.trim();
          const itQty = Math.max(1, Number(it.qty || 1));
          const itRate = Number(it.rate || 0);
          const itTax = Number(it.taxRate || 18);
          const itCode = it.hsn?.trim() || `PRD-${itName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
          const sellingPrice = Math.round(itRate > 0 ? itRate * 1.25 : 100);

          const existingIdx = updatedProducts.findIndex(
            (p: Record<string, unknown>) =>
              String(p.name || "").trim().toLowerCase() === itName.toLowerCase() ||
              (it.hsn && String(p.code || p.hsn || "").trim().toLowerCase() === it.hsn.trim().toLowerCase())
          );

          if (existingIdx >= 0) {
            const currentProd = updatedProducts[existingIdx];
            const oldQty = Number(currentProd.qty ?? currentProd.stock ?? 0);
            updatedProducts[existingIdx] = {
              ...currentProd,
              qty: oldQty + itQty,
              stock: oldQty + itQty,
              purchase_price: itRate > 0 ? itRate : Number(currentProd.purchase_price ?? 0),
              selling_price: Number(currentProd.selling_price || sellingPrice),
              tax_rate: itTax,
              hsn: it.hsn?.trim() || String(currentProd.hsn ?? ""),
              updated_at: new Date().toISOString(),
            };
          } else {
            const newProd = {
              id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: itName,
              code: itCode,
              hsn: it.hsn?.trim() || "",
              qty: itQty,
              stock: itQty,
              category: "General Goods",
              purchase_price: itRate,
              selling_price: sellingPrice,
              tax_rate: itTax,
              cess_rate: Number(it.cessRate || 0),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            updatedProducts.unshift(newProd);

            // Background sync product to API
            void fetch(`/api/v1/accounting/${orgId}/products`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newProd),
            }).catch(() => {});
          }
        }
        localStorage.setItem("vertofi_local_products", JSON.stringify(updatedProducts));
      } catch {}

      // ── 3. Add / Update Inventory (vertofi_local_inventory) ──
      try {
        const storedInventory = JSON.parse(localStorage.getItem("vertofi_local_inventory") || "[]");
        const updatedInventory = Array.isArray(storedInventory) ? [...storedInventory] : [];

        for (const it of validItems) {
          const itName = it.name.trim();
          const itQty = Math.max(1, Number(it.qty || 1));
          const itRate = Number(it.rate || 0);
          const itCode = it.hsn?.trim() || `SKU-${itName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
          const sellingPrice = Math.round(itRate > 0 ? itRate * 1.25 : 100);

          const existingIdx = updatedInventory.findIndex(
            (inv: Record<string, unknown>) =>
              String(inv.name || inv.item_name || "").trim().toLowerCase() === itName.toLowerCase() ||
              (it.hsn && String(inv.code || inv.sku || "").trim().toLowerCase() === it.hsn.trim().toLowerCase())
          );

          if (existingIdx >= 0) {
            const currentInv = updatedInventory[existingIdx];
            const oldQty = Number(currentInv.qty ?? currentInv.stock ?? 0);
            const newQty = oldQty + itQty;
            const unitPrice = itRate > 0 ? itRate : Number(currentInv.purchase_price ?? 0);
            updatedInventory[existingIdx] = {
              ...currentInv,
              qty: newQty,
              stock: newQty,
              purchase_price: unitPrice,
              selling_price: Number(currentInv.selling_price || sellingPrice),
              value: newQty * unitPrice,
              updated_at: new Date().toISOString(),
            };
          } else {
            const newInv = {
              id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: itName,
              item_name: itName,
              code: itCode,
              sku: itCode,
              qty: itQty,
              stock: itQty,
              min_stock: 10,
              purchase_price: itRate,
              selling_price: sellingPrice,
              value: itQty * itRate,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            updatedInventory.unshift(newInv);

            // Background sync inventory to API
            void fetch(`/api/v1/accounting/${orgId}/inventory`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newInv),
            }).catch(() => {});
          }
        }
        localStorage.setItem("vertofi_local_inventory", JSON.stringify(updatedInventory));
      } catch {}

      // ── 4. Save Supplier if not already present ──
      try {
        const storedSuppliers = JSON.parse(localStorage.getItem("vertofi_local_suppliers") || "[]");
        const existingSupp = storedSuppliers.find(
          (s: Record<string, unknown>) => String(s.name || "").trim().toLowerCase() === suppName.toLowerCase()
        );
        if (!existingSupp) {
          const newSupp = {
            id: `supp-${Date.now()}`,
            name: suppName,
            gstin: supplier?.gstin || "",
            phone: supplier?.phone || "",
            address: supplier?.address || "",
            created_at: new Date().toISOString(),
          };
          storedSuppliers.unshift(newSupp);
          localStorage.setItem("vertofi_local_suppliers", JSON.stringify(storedSuppliers));
          void fetch(`/api/v1/accounting/${orgId}/suppliers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newSupp),
          }).catch(() => {});
        }
      } catch {}

      // ── 5. Post Purchase to Backend API ──
      const oid = orgId || "demo-business-org";
      void fetch(`/api/v1/accounting/${oid}/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPurchase),
      }).catch(() => {});

      // ── 6. Trigger Real-time Cross-Module Storage Events ──
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("vertofi-purchases-changed"));
      window.dispatchEvent(new Event("vertofi-products-changed"));
      window.dispatchEvent(new Event("vertofi-inventory-changed"));
      window.dispatchEvent(new Event("vertofi-suppliers-changed"));

      onCreated();
    } catch (e) {
      setError("Failed to create purchase. Please check the details.");
    } finally {
      setBusy(false);
    }
  }

  const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-white shadow-card p-6 space-y-6">
      {/* Header Title */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-xl font-bold text-ink flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand" /> Create Purchase
        </h2>
      </div>

      {/* Search Supplier Section */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-ink">Search Supplier</label>
            <button
              type="button"
              onClick={() => {
                const name = prompt("Enter new supplier name:");
                if (name) searchSupplier(name);
              }}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 cursor-pointer"
            >
              Add New Supplier
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter Supplier Name or Mobile Number to search"
              value={supplierSearch}
              onChange={(e) => searchSupplier(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-xs text-ink outline-none focus:border-brand shadow-sm"
            />
            <Search className="absolute right-3.5 top-3 h-4 w-4 text-muted" />
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
            <p className="text-muted italic">Type supplier name above to auto-populate supplier details.</p>
          )}
        </div>
      </div>

      {/* Purchase Details Section */}
      <div className="rounded-xl border border-border bg-bg2/40 p-4 space-y-4">
        <h3 className="text-sm font-bold text-ink">Purchase Details</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-muted">Purchase Number <span className="text-danger">*</span></label>
            <input
              type="text"
              placeholder="Invoice#"
              value={purchaseNo}
              onChange={(e) => setPurchaseNo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Purchase Date</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted">RCM</label>
            <select
              value={rcm}
              onChange={(e) => setRcm(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

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
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                      Add New Product
                    </button>
                  </div>
                </th>
                <th className="px-2 py-2.5 text-center w-16">Quantity</th>
                <th className="px-2 py-2.5 text-right w-20">Rate</th>
                <th className="px-2 py-2.5 text-right w-20">Amount</th>
                <th className="px-2 py-2.5 w-20">HSN/SAC</th>
                <th className="px-2 py-2.5 text-center w-16">Tax (%)</th>
                <th className="px-2 py-2.5 text-right w-20">Tax (₹)</th>
                <th className="px-2 py-2.5 text-center w-16">CESS (%)</th>
                <th className="px-2 py-2.5 text-right w-20">CESS (₹)</th>
                <th className="px-2 py-2.5 text-center w-16">Discount (%)</th>
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
                        className="w-16 rounded-md border border-border px-2 py-1 text-xs text-right text-ink outline-none focus:border-brand"
                      />
                    </td>
                    <td className="p-2 text-right font-semibold text-ink">₹ {baseAmt.toFixed(2)}</td>
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

      {/* Stock Update & Totals Box (Peach Highlight) */}
      <div className="rounded-xl border border-amber-200 bg-[#FFF9F5] p-5">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Update Stock */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-ink block">Update Stock</label>
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer font-medium">
                <input
                  type="radio"
                  name="updateStockPurchase"
                  checked={updateStock === "YES"}
                  onChange={() => setUpdateStock("YES")}
                  className="accent-brand"
                />
                Yes
              </label>
              <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer font-medium">
                <input
                  type="radio"
                  name="updateStockPurchase"
                  checked={updateStock === "NO"}
                  onChange={() => setUpdateStock("NO")}
                  className="accent-brand"
                />
                No
              </label>
            </div>
          </div>

          {/* Totals Breakdown */}
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
          {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Generate Purchase"}
        </button>
      </div>
    </div>
  );
}
