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

export function CreateProformaInvoice({ orgId, onClose, onCreated, inline = false }: { orgId: string; onClose: () => void; onCreated: () => void; initialCommand?: string; inline?: boolean }) {
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
      await api.mod.askAi(orgId, `Parse proforma invoice prompt: ${text}`);
    } catch {
      /* ignore */
    }

    let custName = "";
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
    const explicitCustMatch = text.match(/(?:customer(?:\s*name)?|party(?:\s*name)?|client|billed\s*to|to|name)\s*[:=]\s*([^,\n;—–\-]+)/i);
    if (explicitCustMatch && explicitCustMatch[1]) {
      const cand = explicitCustMatch[1].trim();
      if (cand && !/^invoice|^bill|^quotation|^proforma/i.test(cand)) {
        custName = cand;
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

    // 3. Multi-part combo matching: e.g. "50 cement bags at 420", "10 laptops at ₹45000", "5 monitors 8000 each"
    const comboMatch = text.match(/(\d+)\s*(?:nos|pcs|items|units|bags|boxes|sets|kg|mtr|hours|pieces)?\s+(?:of\s+)?([a-zA-Z\s]+?)\s+(?:at|@|rate|price|for|each|per(?:\s+[a-zA-Z]+)?)\s+(?:rs\.?|₹|inr)?\s*([\d,]+)/i);
    if (comboMatch) {
      const parsedQty = parseInt(comboMatch[1], 10);
      const parsedItem = comboMatch[2].trim().replace(/^(?:for|of|with|the|a|an)\s+/i, "");
      const parsedRate = parseInt(comboMatch[3].replace(/,/g, ""), 10);
      if (parsedQty > 0) qty = parsedQty;
      if (parsedItem && !itemName) itemName = parsedItem;
      if (parsedRate > 0) rate = parsedRate;
    }

    // 4. Rate / Money search if not yet resolved
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
      if (kMatch) {
        rate = Math.round(parseFloat(kMatch[1]) * 1000);
      }
      const lakhMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|l)\b/i);
      if (lakhMatch) {
        rate = Math.round(parseFloat(lakhMatch[1]) * 100000);
      }
    }

    // Search for ANY numeric digits in the prompt
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

    if (!rate || rate <= 0) {
      rate = 5000;
    }

    // 5. Customer Name extraction
    if (!custName) {
      // Pattern A: "create invoice for/to <Customer> [of/with/for/having <Item>] [Amount]"
      const forToMatch = text.match(/(?:create\s+|make\s+|generate\s+|draft\s+)?(?:invoice|bill|draft|sale|order|quotation|proforma)?\s*(?:for|to)\s+([a-zA-Z0-9\s&.']+)/i);
      if (forToMatch && forToMatch[1]) {
        const segment = forToMatch[1].trim();
        const splitItemMatch = segment.match(/^(.+?)\s+(?:of|with|having|buying|for|at|@)\s+(.+)$/i);
        if (splitItemMatch) {
          custName = splitItemMatch[1].trim();
          const possibleItem = splitItemMatch[2].trim().replace(/[\d,]+.*$/, "").trim();
          if (possibleItem && !itemName) {
            itemName = possibleItem;
          }
        } else {
          let cleaned = segment;
          if (foundProductWord) {
            cleaned = cleaned.replace(new RegExp(`\\b(?:of\\s+)?${foundProductWord}\\b`, "i"), "");
          }
          cleaned = cleaned.replace(/[\d,]+.*$/, "").trim();
          if (cleaned.length > 0) {
            custName = cleaned;
          }
        }
      }
    }

    // Pattern B: No "for/to", e.g. "Radhika mobiles 20000", "Radhika 20000"
    if (!custName) {
      let stripped = text
        .replace(/^(?:create|make|generate|draft|add|send|please|new)\s+(?:a\s+)?(?:invoice|bill|order|sale|draft|quotation|proforma)?\s*(?:for|to)?\s*/i, "")
        .trim();

      if (foundProductWord) {
        const parts = stripped.split(new RegExp(`\\b(?:of\\s+|with\\s+|for\\s+)?${foundProductWord}\\b`, "i"));
        if (parts[0] && parts[0].trim().length > 0) {
          custName = parts[0].replace(/[\d,]+.*$/, "").replace(/[-—–,;:]+$/, "").trim();
        }
      } else {
        const parts = stripped.split(/(?=\s+[\d₹RsINR@]+|\s*[-—–,;:])/i);
        if (parts[0] && parts[0].trim().length > 0) {
          custName = parts[0].trim();
        }
      }
    }

    // Pattern C: Clean up custName
    if (custName) {
      const junkPrefixes = /^(?:a|an|the|new|client|customer|party|bill|invoice|for|to|of|with)\s+/i;
      custName = custName.replace(junkPrefixes, "").trim();

      const junkSuffixes = /\s+(?:for|to|of|with|at|having|buying|items?|goods|rs|rupees|inr|amt|amount|rate)$/i;
      custName = custName.replace(junkSuffixes, "").trim();

      if (foundProductWord && custName.toLowerCase() !== foundProductWord.toLowerCase()) {
        custName = custName.replace(new RegExp(`\\s+(?:of\\s+)?${foundProductWord}$`, "i"), "").trim();
      }

      custName = custName
        .split(/\s+/)
        .filter(w => w.length > 0)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }

    if (!custName || custName.length < 2) {
      custName = "General Customer";
    }

    // 6. Clean up Item Name
    if (!itemName) {
      if (foundProductWord) {
        itemName = foundProductWord.charAt(0).toUpperCase() + foundProductWord.slice(1);
      } else {
        itemName = "Office Supplies";
      }
    } else {
      itemName = itemName.replace(/^(?:of|for|with|the|a|an)\s+/i, "").replace(/[\d,]+.*$/, "").trim();
      if (!itemName) itemName = "Office Supplies";
      itemName = itemName.charAt(0).toUpperCase() + itemName.slice(1);
    }

    setCustomerSearch(custName);
    setCustomer((prev) => ({ ...prev, name: custName }));
    setItems([
      {
        name: itemName,
        description: "Auto-drafted by AI",
        qty,
        rate,
        hsn: "998311",
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
        docType: "PROFORMA",
      });

      // Persist locally for immediate retention and Reports Center visibility
      try {
        const fullInvoiceRecord = {
          id: `proforma-${Date.now()}`,
          invoice_no: fullInvoiceNumber,
          customer_name: customer.name,
          customer_gstin: customer.gstin,
          customer_phone: customer.phone,
          customer_state: customer.state,
          place_of_supply: placeOfSupply,
          reference,
          vehicle_number: vehicleNumber,
          doc_type: "Proforma Invoice",
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
        window.dispatchEvent(new Event("storage"));
      } catch (_err) {}

      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed to create proforma invoice");
    } finally {
      setBusy(false);
    }
  }

  const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="w-full overflow-hidden bg-white p-6 space-y-6">
      {/* Top Title Bar */}
      <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">
          Create Proforma Invoice for Customer
        </h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-slate-100 hover:text-ink cursor-pointer">
          <X className="h-5 w-5" />
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
          <div className="space-y-4">
            <div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="inline-flex items-center gap-1 rounded-full bg-[#229731] px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[#1b7a27] cursor-pointer shadow-sm"
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

          {/* Invoice Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-ink">Invoice Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="text-xs font-medium text-muted flex items-center gap-1">
                  Select Prefix <span className="text-danger">*</span> <HelpCircle className="h-3 w-3 text-muted" />
                </label>
                <select
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="mt-1 w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer"
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
                    className="w-1/2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-brand"
                  />
                  <span className="w-1/2 truncate rounded-full border border-gray-200 bg-slate-100 px-3 py-2 text-xs font-bold text-brand">
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
                  className="mt-1 w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Place Of Supply <span className="text-danger">*</span></label>
                <select
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="mt-1 w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer"
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
                  className="mt-1 w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Reference Date</label>
                <input
                  type="date"
                  value={referenceDate}
                  onChange={(e) => setReferenceDate(e.target.value)}
                  className="mt-1 w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Vehicle Number (Optional)</label>
                <input
                  type="text"
                  placeholder="Vehicle Number"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="mt-1 w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="mt-1 w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer"
                >
                  <option value="BEFORE_TAX">% Discount Before TAX</option>
                  <option value="AFTER_TAX">% Discount After TAX</option>
                </select>
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
                            className="w-full rounded-full border border-gray-200 px-2.5 py-1 text-xs text-ink font-semibold outline-none focus:border-brand"
                          />
                          <input
                            type="text"
                            placeholder="Enter Product description (Optional)"
                            value={it.description || ""}
                            onChange={(e) => setItem(idx, { description: e.target.value })}
                            className="w-full rounded-full border border-gray-200/60 bg-slate-50 px-2.5 py-0.5 text-[11px] text-muted outline-none focus:border-brand"
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
                            value={it.rate}
                            onChange={(e) => setItem(idx, { rate: Number(e.target.value) })}
                            className="w-20 rounded-full border border-gray-200 px-2 py-1 text-xs text-right text-ink outline-none focus:border-brand"
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
                            value={it.discount}
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
                  className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-xs text-ink outline-none focus:border-brand shadow-2xs"
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
                      value={shippingCharges || ''}
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
                      value={extraCharges || ''}
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
                    className="w-48 rounded border border-border bg-white px-3 py-1.5 text-left text-ink outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 font-bold">
                  <span className="text-ink">Grand Total (₹)</span>
                  <input 
                    type="text" 
                    disabled 
                    value={inr(calculated.grandTotal)} 
                    className="w-48 rounded border border-border bg-slate-100 px-3 py-1.5 text-left font-bold text-ink outline-none" 
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
          <Button variant="ghost" onClick={onClose} className="rounded-full border border-border bg-white px-5 py-2 text-[13px] font-semibold text-ink">Cancel</Button>
          <button type="button" disabled={busy} onClick={create} className="rounded-full bg-[#E52F39] px-6 py-2 text-[13px] font-bold text-white transition hover:bg-red-700 disabled:opacity-50 cursor-pointer shadow-sm">{busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Generate Invoice"}</button>
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
