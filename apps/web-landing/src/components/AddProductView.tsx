"use client";
import { useState } from "react";
import { PackagePlus, Info, UploadCloud, Loader2 } from "lucide-react";
import { Button } from "@/ui";
import { api, ApiError } from "@/lib/api";

export function AddProductView({
  orgId,
  onClose,
  onCreated,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [itemType, setItemType] = useState<"PRODUCT" | "SERVICE">("PRODUCT");
  const [name, setName] = useState("");
  const [sellingPrice, setSellingPrice] = useState("0.00");
  const [qty, setQty] = useState("");
  const [hsn, setHsn] = useState("");
  const [taxRate, setTaxRate] = useState("18");
  const [code, setCode] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("0.00");
  const [cess, setCess] = useState("0");

  const [category, setCategory] = useState("Default Category");
  const [discountRate, setDiscountRate] = useState("0.00");
  const [unit, setUnit] = useState("OTHERS");
  const [alertQty, setAlertQty] = useState("");
  const [description, setDescription] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.acc.addProduct(orgId, {
        name: name.trim(),
        itemType,
        rate: Number(sellingPrice) || 0,
        purchasePrice: Number(purchasePrice) || 0,
        hsn: hsn.trim() || undefined,
        taxRate: Number(taxRate) || 18,
        code: code.trim() || undefined,
        cess: Number(cess) || 0,
        category,
        unit,
        stock: Number(qty) || 0,
        alertQty: Number(alertQty) || 0,
        description: description.trim() || undefined,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed to add product");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-white shadow-card p-6 space-y-6">
      {/* Header Title */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-xl font-bold text-ink flex items-center gap-2">
          <PackagePlus className="h-5 w-5 text-brand" /> Add New Product
        </h2>
      </div>

      {/* Basic Details Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-ink">Basic Details</h3>

        <div>
          <label className="text-xs font-medium text-muted block mb-1">Select Item Type <span className="text-danger">*</span></label>
          <div className="flex items-center gap-6 mt-1">
            <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer font-medium">
              <input
                type="radio"
                name="itemType"
                checked={itemType === "PRODUCT"}
                onChange={() => setItemType("PRODUCT")}
                className="accent-brand"
              />
              Product
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer font-medium">
              <input
                type="radio"
                name="itemType"
                checked={itemType === "SERVICE"}
                onChange={() => setItemType("SERVICE")}
                className="accent-brand"
              />
              Service
            </label>
          </div>
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-muted">Product Name <span className="text-danger">*</span></label>
            <input
              type="text"
              placeholder="Product Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Selling Price <span className="text-danger">*</span></label>
            <div className="mt-1 flex items-center">
              <span className="grid h-9 w-9 place-items-center rounded-l-lg bg-[#22c55e] text-white font-bold text-xs">₹</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full rounded-r-lg border border-l-0 border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Quantity (Total Items in stock)</label>
            <input
              type="number"
              placeholder="Total Items in stock"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
            />
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
          <div>
            <label className="text-xs font-medium text-muted">HSN/SAC Code <span className="text-danger">*</span></label>
            <input
              type="text"
              placeholder="HSN/SAC Code"
              value={hsn}
              onChange={(e) => setHsn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
            />
            <a href="https://cbic-gst.gov.in/gst-goods-services-rates.html" target="_blank" rel="noreferrer" className="text-[11px] text-emerald-600 underline font-medium mt-1 inline-block">
              Get here to check GST approved HSN/SAC codes
            </a>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted">OR</span>
            <button
              type="button"
              onClick={() => alert("Search HSN list")}
              className="w-full rounded-lg bg-[#22c55e] py-2 px-3 text-xs font-bold text-white transition hover:bg-green-600 shadow-sm cursor-pointer"
            >
              Search in HSN/SAC List
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-muted flex items-center gap-1">
              Default TAX Rate <span className="text-danger">*</span> <Info className="h-3.5 w-3.5 text-muted" />
            </label>
            <select
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer shadow-sm"
            >
              <option value="0">GST 0%</option>
              <option value="5">GST 5%</option>
              <option value="12">GST 12%</option>
              <option value="18">GST 18%</option>
              <option value="28">GST 28%</option>
            </select>
          </div>
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-muted flex items-center gap-1">
              Product Code <Info className="h-3.5 w-3.5 text-muted" />
            </label>
            <input
              type="text"
              placeholder="Enter Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Purchase Price</label>
            <div className="mt-1 flex items-center">
              <span className="grid h-9 w-9 place-items-center rounded-l-lg bg-[#22c55e] text-white font-bold text-xs">₹</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full rounded-r-lg border border-l-0 border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted">CESS</label>
            <div className="mt-1 flex items-center">
              <span className="grid h-9 w-9 place-items-center rounded-l-lg bg-[#22c55e] text-white font-bold text-xs">%</span>
              <input
                type="number"
                placeholder="0"
                value={cess}
                onChange={(e) => setCess(e.target.value)}
                className="w-full rounded-r-lg border border-l-0 border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Details (Optional Fields) */}
      <div className="space-y-4 border-t border-border pt-4">
        <h3 className="text-sm font-bold text-ink">Additional Details (Optional Fields)</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted">Product Category</label>
              <button
                type="button"
                onClick={() => {
                  const cat = prompt("Enter new category:");
                  if (cat) setCategory(cat);
                }}
                className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white transition hover:bg-emerald-700 cursor-pointer"
              >
                Add Category
              </button>
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer shadow-sm"
            >
              <option value="Default Category">Default Category</option>
              <option value="Electronics">Electronics</option>
              <option value="Services">Services</option>
              <option value="Hardware">Hardware</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted flex items-center gap-1">
              Default Discount Rate <Info className="h-3.5 w-3.5 text-muted" />
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={discountRate}
              onChange={(e) => setDiscountRate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted flex items-center gap-1">
              Measurement Unit <Info className="h-3.5 w-3.5 text-muted" />
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer shadow-sm"
            >
              <option value="OTHERS">OTHERS</option>
              <option value="NOS">NOS</option>
              <option value="PCS">PCS</option>
              <option value="KG">KG</option>
              <option value="MTR">MTR</option>
              <option value="BOX">BOX</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted flex items-center gap-1">
              Alert Quantity <Info className="h-3.5 w-3.5 text-muted" />
            </label>
            <input
              type="number"
              placeholder="Low Stock Alert Quantity qty_alert"
              value={alertQty}
              onChange={(e) => setAlertQty(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted">Description</label>
          <textarea
            rows={3}
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border p-3 text-xs text-ink outline-none focus:border-brand shadow-sm"
          />
        </div>

        {/* Drag and Drop Image Box */}
        <div className="w-full sm:w-1/2 border-2 border-dashed border-border/80 rounded-xl bg-amber-50/20 p-6 text-center space-y-2">
          <UploadCloud className="mx-auto h-8 w-8 text-brand" />
          <p className="text-xs text-ink font-medium">
            Drag & Drop or <span className="text-red-500 font-bold underline cursor-pointer">Choose file</span> to upload
          </p>
          <p className="text-[11px] text-muted">
            Allowed: gif, jpeg, png (Use light small weight images for fast loading – 200x200)
          </p>
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
          className="rounded-lg bg-[#22c55e] px-6 py-2 text-xs font-bold text-white transition hover:bg-green-600 disabled:opacity-50 cursor-pointer shadow-md"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Add Product"}
        </button>
      </div>
    </div>
  );
}
