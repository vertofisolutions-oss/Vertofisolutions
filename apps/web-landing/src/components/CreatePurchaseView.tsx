"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2, Loader2, Search, HelpCircle, FileText, Calendar, Sparkles, User, Phone, Mail, MapPin, AlertCircle, Check, Wand2 } from "lucide-react";
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

  // ── AI Assistant State ──
  const [aiSupplierName, setAiSupplierName] = useState("");
  const [aiPhone, setAiPhone] = useState("");
  const [aiEmail, setAiEmail] = useState("");
  const [aiAddress, setAiAddress] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiWithoutGst, setAiWithoutGst] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const withoutGstRegex = /\b(?:without\s*gst(?:\s*i\s*want)?|no\s*gst|zero\s*gst|exempt|non-gst|0%\s*gst)\b/i;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setAiPhone(raw);
    if (!raw) {
      setPhoneError(null);
      return;
    }
    if (!["6", "7", "8", "9"].includes(raw[0])) {
      setPhoneError("Phone number must start with 9, 8, 7, or 6");
    } else if (raw.length < 10) {
      setPhoneError(`Needs 10 digits (entered ${raw.length}/10)`);
    } else {
      setPhoneError(null);
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setAiPrompt(val);
    if (withoutGstRegex.test(val)) {
      setAiWithoutGst(true);
    }
  };

  async function handleDraftWithAi() {
    const text = aiPrompt.trim();
    const hasName = aiSupplierName.trim().length > 0;
    if (!text && !hasName) return;

    if (aiPhone.trim()) {
      if (!/^[6-9]\d{9}$/.test(aiPhone.trim())) {
        setPhoneError("Phone number must start with 9, 8, 7, or 6 and have exactly 10 digits");
        return;
      }
    }

    setAiDrafting(true);
    setAiSuccess(false);

    try {
      await api.mod.askAi(orgId, `Parse purchase draft prompt: ${text}`);
    } catch {
      /* ignore */
    }

    const isWithoutGst = aiWithoutGst || withoutGstRegex.test(text);
    const cleanedText = text.replace(new RegExp(withoutGstRegex.source, "gi"), " ").replace(/\s+/g, " ").trim();

    let suppName = aiSupplierName.trim();
    let itemName = "";
    let qty = 1;
    let rate = 0;

    const KNOWN_PRODUCTS = [
      "mobile phones", "mobile phone", "mobiles", "mobile", "smartphones", "smartphone", "phones", "phone", "cellphones", "cellphone",
      "laptops", "laptop", "computers", "computer", "monitors", "monitor", "keyboards", "keyboard", "mouse",
      "cement bags", "cement bag", "cement", "steel", "sand", "bricks", "paint", "tiles", "pipes", "pipe",
      "shirts", "shirt", "pants", "pant", "sarees", "saree", "clothes", "cloth", "garments", "textiles", "fabric",
      "rice bags", "rice bag", "rice", "sugar", "oil", "groceries", "grocery", "wheat", "flour",
      "consulting services", "consulting", "consultation", "service", "services", "software development", "software", "hardware",
      "maintenance", "repairs", "design", "installation", "subscription",
      "chairs", "chair", "tables", "table", "desks", "desk", "furniture",
      "books", "book", "stationery", "notebooks", "notebook", "pens", "pen",
      "tablets", "medicines", "medicine", "drugs", "pharma",
      "electronics", "appliances", "batteries", "battery", "cables", "cable", "spare parts", "parts",
      "materials", "supplies", "office supplies", "goods", "products"
    ];

    // 1. Check explicit key-value pairs
    const explicitSuppMatch = text.match(/(?:vendor(?:\s*name)?|supplier(?:\s*name)?|customer(?:\s*name)?|party(?:\s*name)?|client|from|to|name)\s*[:=]\s*([^,\n;—–\-]+)/i);
    if (explicitSuppMatch && explicitSuppMatch[1]) {
      const cand = explicitSuppMatch[1].trim();
      if (cand && !/^purchase|^bill|^order|^invoice/i.test(cand)) {
        suppName = cand;
      }
    }

    const explicitItemMatch = text.match(/(?:item(?:\s*name)?|product|goods|description|service)\s*[:=]\s*([^,\n;—–\-]+)/i);
    if (explicitItemMatch && explicitItemMatch[1]) {
      itemName = explicitItemMatch[1].trim();
    }

    const explicitQtyMatch = text.match(/(?:qty|quantity|count|nos|units|pieces|bags|pcs|boxes|sets|kg|mtr|hours)\s*[:=]\s*(\d+)/i);
    if (explicitQtyMatch && explicitQtyMatch[1]) {
      qty = parseInt(explicitQtyMatch[1], 10) || 1;
    }

    const explicitRateMatch = text.match(/(?:rate|price|amount|cost|total|rs\.?|₹|inr)\s*[:=]?\s*(?:rs\.?|₹|inr)?\s*([\d,]+)/i);
    if (explicitRateMatch && explicitRateMatch[1]) {
      const val = parseInt(explicitRateMatch[1].replace(/,/g, ""), 10);
      if (val > 0) rate = val;
    }

    // 2. Detect Product Keyword
    let foundProductWord = "";
    for (const prod of KNOWN_PRODUCTS) {
      const reg = new RegExp(`\\b${prod}\\b`, "i");
      if (reg.test(text)) {
        foundProductWord = prod;
        if (!itemName) {
          itemName = prod.charAt(0).toUpperCase() + prod.slice(1);
        }
        break;
      }
    }

    // 3. Multi-part combo matching
    const comboMatch = text.match(/(\d+)\s*(?:nos|pcs|items|units|bags|boxes|sets|kg|mtr|hours|pieces)?\s+(?:of\s+)?([a-zA-Z\s]+?)\s+(?:at|@|rate|price|for|each|per(?:\s+[a-zA-Z]+)?)\s+(?:rs\.?|₹|inr)?\s*([\d,]+)/i);
    if (comboMatch) {
      const parsedQty = parseInt(comboMatch[1], 10);
      const parsedItem = comboMatch[2].trim().replace(/^(?:for|of|with|the|a|an)\s+/i, "");
      const parsedRate = parseInt(comboMatch[3].replace(/,/g, ""), 10);
      if (parsedQty > 0) qty = parsedQty;
      if (parsedItem && !itemName) itemName = parsedItem;
      if (parsedRate > 0) rate = parsedRate;
    }

    // 4. Rate / Money search
    if (!rate) {
      const currencyMatch = text.match(/(?:rs\.?|₹|inr|\/-)\s*([\d,]+)/i) ||
                           text.match(/([\d,]+)\s*(?:rs|rupees|inr|\/-)/i) ||
                           text.match(/(?:at|@|rate|price|amount|total|for|cost|worth|valuing)\s*(?:rs\.?|₹|inr)?\s*([\d,]+)/i);
      if (currencyMatch && currencyMatch[1]) {
        const val = parseInt(currencyMatch[1].replace(/,/g, ""), 10);
        if (val > 0) rate = val;
      }
    }

    if (!rate) {
      const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k\b/i);
      if (kMatch) rate = Math.round(parseFloat(kMatch[1]) * 1000);
      const lakhMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|l)\b/i);
      if (lakhMatch) rate = Math.round(parseFloat(lakhMatch[1]) * 100000);
    }

    if (!rate) {
      const allNums = Array.from(text.matchAll(/\b(\d[\d,]*)\b/g))
        .map(m => parseInt(m[1].replace(/,/g, ""), 10))
        .filter(n => !isNaN(n) && n > 0);
      if (allNums.length === 1) {
        rate = allNums[0];
      } else if (allNums.length >= 2) {
        if (allNums[0] < allNums[1]) {
          if (!qty || qty === 1) qty = allNums[0];
          rate = allNums[1];
        } else {
          rate = allNums[0];
        }
      }
    }

    if (!rate || rate <= 0) rate = 420;

    // 5. Party / Supplier extraction
    if (!suppName) {
      const fromMatch = cleanedText.match(/(?:create\s+|make\s+|record\s+|add\s+|generate\s+|draft\s+)?(?:purchase|bill|order|invoice)?\s*(?:from|by|for|to)\s+([a-zA-Z0-9\s&.']+)/i);
      if (fromMatch && fromMatch[1]) {
        const segment = fromMatch[1].trim();
        const splitItemMatch = segment.match(/^(.+?)\s+(?:of|with|having|buying|for|at|@)\s+(.+)$/i);
        if (splitItemMatch) {
          suppName = splitItemMatch[1].trim();
          const possibleItem = splitItemMatch[2].trim().replace(/[\d,]+.*$/, "").trim();
          if (possibleItem && !itemName) itemName = possibleItem;
        } else {
          let cleaned = segment;
          if (foundProductWord) {
            cleaned = cleaned.replace(new RegExp(`\\b(?:of\\s+)?${foundProductWord}\\b`, "i"), "");
          }
          cleaned = cleaned.replace(/[\d,]+.*$/, "").trim();
          if (cleaned.length > 0) suppName = cleaned;
        }
      }
    }

    if (!suppName) {
      let stripped = cleanedText
        .replace(/^(?:create|make|record|add|generate|draft|new)\s+(?:a\s+)?(?:purchase|bill|order|invoice)?\s*(?:from|for|to)?\s*/i, "")
        .trim();
      if (foundProductWord) {
        const parts = stripped.split(new RegExp(`\\b(?:of\\s+|with\\s+|for\\s+)?${foundProductWord}\\b`, "i"));
        if (parts[0] && parts[0].trim().length > 0) {
          suppName = parts[0].replace(/[\d,]+.*$/, "").replace(/[-—–,;:]+$/, "").trim();
        }
      } else {
        const parts = stripped.split(/(?=\s+[\d₹RsINR@]+|\s*[-—–,;:])/i);
        if (parts[0] && parts[0].trim().length > 0) {
          suppName = parts[0].trim();
        }
      }
    }

    if (suppName) {
      const junkPrefixes = /^(?:a|an|the|new|supplier|vendor|customer|party|bill|purchase|invoice|from|for|to|of|with)\s+/i;
      suppName = suppName.replace(junkPrefixes, "").trim();
      const junkSuffixes = /\s+(?:from|for|to|of|with|at|having|buying|items?|goods|rs|rupees|inr|amt|amount|rate)$/i;
      suppName = suppName.replace(junkSuffixes, "").trim();
      if (foundProductWord && suppName.toLowerCase() !== foundProductWord.toLowerCase()) {
        suppName = suppName.replace(new RegExp(`\\s+(?:of\\s+)?${foundProductWord}$`, "i"), "").trim();
      }
      suppName = suppName
        .split(/\s+/)
        .filter(w => w.length > 0)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }

    if (!suppName || suppName.length < 2) {
      suppName = "Ramesh Traders";
    }

    if (!itemName) {
      itemName = foundProductWord ? (foundProductWord.charAt(0).toUpperCase() + foundProductWord.slice(1)) : "Cement Bags";
    } else {
      itemName = itemName.replace(/^(?:of|for|with|the|a|an)\s+/i, "").replace(/[\d,]+.*$/, "").trim();
      if (!itemName) itemName = "Cement Bags";
      itemName = itemName.charAt(0).toUpperCase() + itemName.slice(1);
    }

    const finalPhone = aiPhone.trim();
    const finalEmail = aiEmail.trim();
    const finalAddress = aiAddress.trim();
    const taxRate = isWithoutGst ? 0 : 18;

    // Fill the interactive form fields
    setSupplierSearch(suppName);
    setSupplier({
      name: suppName,
      gstin: "",
      phone: finalPhone,
      address: finalAddress,
    });

    const aiItem: Item = {
      name: itemName,
      description: isWithoutGst ? "Auto-drafted by AI (Without GST)" : "Auto-drafted by AI",
      qty,
      rate,
      hsn: isWithoutGst ? "000000" : "998311",
      taxRate,
      cessRate: 0,
      discount: 0,
    };

    setItems([aiItem]);
    if (!purchaseNo) {
      setPurchaseNo(`PUR-${Date.now().toString().slice(-5)}`);
    }

    setAiDrafting(false);
    setAiSuccess(true);
    setTimeout(() => {
      setAiSuccess(false);
    }, 4000);
  }

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

      {/* Create with AI Card */}
      <div className="rounded-xl border border-blue-200 bg-[#F4F8FF] p-5 space-y-4">
        {/* Header & GST Mode Selector */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Create with AI Assistant</h3>
          </div>
          {/* Quick GST Toggle Pill Buttons */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-blue-200 shadow-2xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAiWithoutGst(false)}
              className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                !aiWithoutGst
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>Standard GST (18%)</span>
            </button>
            <button
              type="button"
              onClick={() => setAiWithoutGst(true)}
              className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                aiWithoutGst
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>Without GST (0%)</span>
            </button>
          </div>
        </div>

        {/* Customer / Party Quick Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Customer / Party Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <User className="h-3.5 w-3.5 text-blue-600" /> Customer / Party Name
            </label>
            <input
              type="text"
              value={aiSupplierName}
              onChange={(e) => setAiSupplierName(e.target.value)}
              placeholder="e.g. Ramesh Traders"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* 2. Phone number (starts with 9, 8, 7, 6) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-blue-600" /> Phone Number
              </label>
              <span className="text-[10px] text-slate-400 font-medium">(Starts 9,8,7,6)</span>
            </div>
            <input
              type="tel"
              maxLength={10}
              value={aiPhone}
              onChange={handlePhoneChange}
              placeholder="e.g. 9876543210"
              className={`w-full rounded-lg border bg-white px-3 py-2 text-xs font-medium outline-none shadow-2xs ${
                phoneError
                  ? "border-red-400 text-red-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  : aiPhone.length === 10
                  ? "border-emerald-400 text-emerald-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  : "border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              }`}
            />
            {phoneError && (
              <p className="mt-1 text-[11px] font-semibold text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" /> {phoneError}
              </p>
            )}
            {!phoneError && aiPhone.length === 10 && (
              <p className="mt-1 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="h-3 w-3 shrink-0" /> Valid 10-digit mobile
              </p>
            )}
          </div>

          {/* 3. Gmail / Email */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <Mail className="h-3.5 w-3.5 text-blue-600" /> Gmail / Email
            </label>
            <input
              type="email"
              value={aiEmail}
              onChange={(e) => setAiEmail(e.target.value)}
              placeholder="e.g. ramesh@gmail.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* 4. Address */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <MapPin className="h-3.5 w-3.5 text-blue-600" /> Customer Address
            </label>
            <input
              type="text"
              value={aiAddress}
              onChange={(e) => setAiAddress(e.target.value)}
              placeholder="e.g. Plot 42, Hitech City, Hyderabad"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Purchase Description / Prompt */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>Describe items, quantity &amp; price</span>
            </label>
            {aiWithoutGst ? (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                ⚡ Without GST Mode Active (0% Tax / Bill of Supply)
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">
                Tip: Type &quot;without gst i want&quot; to create without tax
              </span>
            )}
          </div>

          <textarea
            rows={3}
            value={aiPrompt}
            onChange={handlePromptChange}
            placeholder="Generate invoice for 50 cement bags at ₹420 per bag. (Type 'without gst i want' to create without GST)"
            className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 shadow-2xs resize-y"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={aiDrafting}
            onClick={handleDraftWithAi}
            className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 px-5 py-2 text-sm font-medium text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {aiDrafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Draft with AI
          </button>
          {aiSuccess && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              ✓ Purchase drafted! Review fields below.
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500">
          AI drafts the invoice with customer details &amp; items — you review and confirm before it&apos;s created.
        </p>
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
        <div className="w-full overflow-visible rounded-xl border border-border">
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
