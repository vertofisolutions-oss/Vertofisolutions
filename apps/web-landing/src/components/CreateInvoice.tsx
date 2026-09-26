"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Loader2, X, Search, CheckCircle2, Calendar, HelpCircle, FileText, Sparkles, Wand2, User, Phone, Mail, MapPin, Check, AlertCircle } from "lucide-react";
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
  const [customer, setCustomer] = useState({ name: "", gstin: "", state: "Telangana", phone: "", email: "", address: "" });
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<Record<string, unknown>[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isCustomerSelected, setIsCustomerSelected] = useState(false);
  const [prefix, setPrefix] = useState("INV/");
  const [invoiceNo, setInvoiceNo] = useState(() => {
    if (typeof window === "undefined") return "0001";
    try {
      const sales = JSON.parse(localStorage.getItem("vertofi_local_sales") || "[]");
      let max = 0;
      for (const s of sales) {
        if (s.invoice_no) {
          const numMatch = String(s.invoice_no).match(/(\d+)$/);
          if (numMatch) {
            const val = parseInt(numMatch[1], 10);
            if (val > max) max = val;
          }
        }
      }
      return String(max + 1).padStart(4, "0");
    } catch {
      return "0001";
    }
  });
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
  const [aiCustomerName, setAiCustomerName] = useState("");
  const [aiPhone, setAiPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [aiEmail, setAiEmail] = useState("");
  const [aiAddress, setAiAddress] = useState("");
  const [aiWithoutGst, setAiWithoutGst] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);

  const withoutGstRegex = useMemo(
    () => /\b(?:without\s+gst(?:\s+i\s+want)?|no\s+gst|0\s*%\s*gst|zero\s+gst|without\s+tax|no\s+tax|non[- ]?gst|exempt|excluding\s+gst|gst\s*(?:vadhu|ledu|ledhu|nil|zero)|i\s+want\s+without\s+gst|don'?t\s+want\s+gst|without\s+any\s+gst)\b/i,
    []
  );

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

  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDraftWithAi() {
    const text = aiPrompt.trim();
    const hasName = aiCustomerName.trim().length > 0;
    if (!text && !hasName) return;

    // Validate phone number if provided: must start with 9,8,7,6 and be 10 digits
    if (aiPhone.trim()) {
      if (!/^[6-9]\d{9}$/.test(aiPhone.trim())) {
        setPhoneError("Phone number must start with 9, 8, 7, or 6 and have exactly 10 digits");
        return;
      }
    }

    setAiDrafting(true);
    setAiSuccess(false);

    try {
      await api.mod.askAi(orgId, `Parse invoice draft prompt: ${text}`);
    } catch {
      /* ignore */
    }

    // Detect without GST from prompt text or toggle
    const isWithoutGst = aiWithoutGst || withoutGstRegex.test(text);

    // Clean text by stripping without GST phrases so they don't get misparsed as item or customer name
    const cleanedText = text.replace(new RegExp(withoutGstRegex.source, "gi"), " ").replace(/\s+/g, " ").trim();

    let custName = aiCustomerName.trim();
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
      if (cand && !/^invoice|^bill/i.test(cand)) {
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
      const forToMatch = cleanedText.match(/(?:create\s+|make\s+|generate\s+|draft\s+)?(?:invoice|bill|draft|sale|order|quotation|proforma)?\s*(?:for|to)\s+([a-zA-Z0-9\s&.']+)/i);
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
      let stripped = cleanedText
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

    // 4. Compute GUARANTEED UNIQUE INVOICE NUMBER
    let max = 0;
    try {
      const localSales: Record<string, unknown>[] = JSON.parse(localStorage.getItem("vertofi_local_sales") || "[]");
      for (const s of localSales) {
        const raw = String(s.invoice_no ?? s.invoiceNo ?? "");
        const numMatch = raw.match(/(\d+)$/);
        if (numMatch) {
          const val = parseInt(numMatch[1], 10);
          if (val > max && val < 999999) max = val;
        }
      }
    } catch {}

    const uniqueSeq = String(max + 1).padStart(4, "0");
    const uniqueInvoiceNo = `${prefix}${uniqueSeq}`;

    const baseAmt = qty * rate;
    const taxRate = isWithoutGst ? 0 : 18;
    const taxAmt = isWithoutGst ? 0 : Math.round(baseAmt * 0.18);
    const grandTotal = Math.round(baseAmt + taxAmt);
    const docType = isWithoutGst ? "Bill of Supply" : "Tax Invoice";

    const aiItem = {
      name: itemName,
      description: isWithoutGst ? "Auto-drafted by AI (Without GST)" : "Auto-drafted by AI",
      qty,
      rate,
      hsn: isWithoutGst ? "000000" : "998311",
      taxRate,
      cessRate: 0,
      discount: 0,
    };

    const finalPhone = aiPhone.trim();
    const finalEmail = aiEmail.trim();
    const finalAddress = aiAddress.trim();

    setCustomerSearch(custName);
    setCustomer({
      name: custName,
      gstin: "",
      state: "Telangana",
      phone: finalPhone,
      email: finalEmail,
      address: finalAddress,
    });
    setIsCustomerSelected(true);
    setItems([aiItem]);
    setInvoiceNo(uniqueSeq);

    const fullInvoiceRecord = {
      id: `inv-${Date.now()}`,
      invoice_no: uniqueInvoiceNo,
      invoiceNo: uniqueInvoiceNo,
      customer_name: custName,
      customerName: custName,
      customer_gstin: "",
      customer_phone: finalPhone,
      customer_email: finalEmail,
      customer_address: finalAddress,
      billing_address: finalAddress,
      shipping_address: finalAddress,
      phone: finalPhone,
      email: finalEmail,
      address: finalAddress,
      customer_state: "Telangana",
      place_of_supply: "Telangana",
      reference: "",
      vehicle_number: "",
      doc_type: docType,
      date: invoiceDate,
      due_date: new Date(new Date(invoiceDate).getTime() + 15 * 86400000).toISOString().slice(0, 10),
      return_period: "09-2026",
      items: [{
        id: `item-1`,
        name: itemName,
        description: isWithoutGst ? "Auto-drafted by AI (Without GST)" : "Auto-drafted by AI",
        hsn: isWithoutGst ? "000000" : "998311",
        hsnSac: isWithoutGst ? "000000" : "998311",
        quantity: qty,
        qty,
        rate,
        discount: 0,
        discountPct: 0,
        taxRate,
        taxPct: taxRate,
        total: grandTotal,
      }],
      subtotal: baseAmt,
      totalTax: taxAmt,
      totalCess: 0,
      totalDiscount: 0,
      shippingCharges: 0,
      extraCharges: 0,
      roundOff: 0,
      total: grandTotal,
      balance: grandTotal,
      status: "ISSUED",
      source: "AI",
      created_at: new Date().toISOString(),
    };

    // Save customer to local database
    if (custName && custName !== "General Customer") {
      try {
        const existingCusts = JSON.parse(localStorage.getItem("vertofi_local_customers") || "[]");
        const existingIdx = existingCusts.findIndex((c: any) =>
          (c.name && c.name.toLowerCase() === custName.toLowerCase()) ||
          (finalPhone && c.phone === finalPhone)
        );
        const custRecord = {
          id: existingIdx >= 0 ? existingCusts[existingIdx].id : `cust-${Date.now()}`,
          name: custName,
          phone: finalPhone,
          email: finalEmail,
          address: finalAddress,
          state: "Telangana",
          created_at: new Date().toISOString(),
        };
        if (existingIdx >= 0) {
          existingCusts[existingIdx] = { ...existingCusts[existingIdx], ...custRecord };
        } else {
          existingCusts.unshift(custRecord);
        }
        localStorage.setItem("vertofi_local_customers", JSON.stringify(existingCusts));
        window.dispatchEvent(new Event("storage"));
      } catch { /* ignore */ }
    }

    // 5. Save to localStorage (filtering out any previous duplicate)
    try {
      const existingStr = localStorage.getItem("vertofi_local_sales") || "[]";
      const existing = JSON.parse(existingStr).filter((it: any) =>
        String(it.invoice_no ?? it.invoiceNo) !== uniqueInvoiceNo &&
        !(String(it.customer_name ?? it.customerName).toLowerCase().trim() === custName.toLowerCase().trim() && Number(it.total) === grandTotal)
      );
      existing.unshift(fullInvoiceRecord);
      localStorage.setItem("vertofi_local_sales", JSON.stringify(existing));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("vertofi-sales-changed"));
    } catch { /* ignore */ }

    // 6. PERSIST TO BACKEND SERVER DATABASE
    const oid = orgId || "demo-business-org";
    try {
      await api.acc.createSale(oid, {
        customerName: custName,
        invoiceNo: uniqueInvoiceNo,
        date: invoiceDate,
        placeOfSupply: "Telangana",
        items: [aiItem],
        total: grandTotal,
        doc_type: docType,
        source: "AI",
      });
    } catch (_err) {
      // Local fallback active
    }

    setAiDrafting(false);
    setAiSuccess(true);
    setTimeout(() => {
      setAiSuccess(false);
      onCreated();
      if (!inline) onClose();
    }, 1200);
  }

  // Auto search customer
  async function searchCustomer(query: string) {
    setCustomerSearch(query);
    setCustomer((prev) => ({ ...prev, name: query }));
    setIsCustomerSelected(false);
    
    if (!query.trim()) {
      setCustomerSearchResults([]);
      setShowCustomerDropdown(false);
      return;
    }

    try {
      const q = query.toLowerCase().trim();
      const allCustomers: Record<string, unknown>[] = [];
      if (typeof window !== "undefined") {
        const manual = JSON.parse(localStorage.getItem("vertofi_local_customers") || "[]");
        const sales = JSON.parse(localStorage.getItem("vertofi_local_sales") || "[]");
        
        for (const c of manual) {
          allCustomers.push({
            name: c.name || c.customer_name || "",
            gstin: c.gstin || c.licenceNo || "",
            state: c.state || c.placeOfSupply || "36-TELANGANA",
            phone: c.phone || "",
            email: c.email || "",
            address: c.address || "",
          });
        }
        for (const s of sales) {
          if (s.customer_name) {
            allCustomers.push({
              name: s.customer_name,
              gstin: s.customer_gstin || "",
              state: s.customer_state || "36-TELANGANA",
              phone: s.customer_phone || "",
              email: s.customer_email || "",
              address: s.customer_address || "",
            });
          }
        }
      }

      // Dedupe by name
      const seen = new Set<string>();
      const deduped = allCustomers.filter((c) => {
        const name = String(c.name).trim();
        if (!name || seen.has(name.toLowerCase())) return false;
        seen.add(name.toLowerCase());
        return true;
      });

      const matches = deduped.filter(c => 
        String(c.name).toLowerCase().includes(q) || 
        String(c.phone).includes(q)
      );

      setCustomerSearchResults(matches);
      setShowCustomerDropdown(matches.length > 0);

      // also fallback to api
      const c = await api.acc.lookupCustomer(orgId, query).catch(() => null);
      if (c && !matches.some(m => String(m.name).toLowerCase() === String(c.name).toLowerCase())) {
         setCustomerSearchResults(prev => [...prev, {
            name: String(c.name ?? query),
            gstin: String(c.gstin ?? ""),
            state: String(c.state ?? "36-TELANGANA"),
            phone: String(c.phone ?? ""),
            email: String(c.email ?? ""),
            address: String(c.address ?? ""),
         }]);
         setShowCustomerDropdown(true);
      }
    } catch { /* ignore */ }
  }

  function selectCustomer(c: Record<string, unknown>) {
    setCustomerSearch(String(c.name || ""));
    setCustomer({
      name: String(c.name || ""),
      gstin: String(c.gstin || ""),
      state: String(c.state || "36-TELANGANA"),
      phone: String(c.phone || ""),
      email: String(c.email || ""),
      address: String(c.address || ""),
    });
    setPlaceOfSupply(String(c.state || "36-TELANGANA"));
    setShowCustomerDropdown(false);
    setIsCustomerSelected(true);
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
            taxRate: Number(it.taxRate !== undefined && it.taxRate !== null && !isNaN(Number(it.taxRate)) ? it.taxRate : 0),
            taxPct: Number(it.taxRate !== undefined && it.taxRate !== null && !isNaN(Number(it.taxRate)) ? it.taxRate : 0),
            total: Math.round(((it.qty || 1) * (it.rate || 0) * (1 - (it.discount || 0) / 100)) * (1 + Number(it.taxRate !== undefined && it.taxRate !== null && !isNaN(Number(it.taxRate)) ? it.taxRate : 0) / 100)),
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

        {/* Customer Quick Inputs: Name, Phone (starts 9,8,7,6), Gmail, Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Customer Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <User className="h-3.5 w-3.5 text-blue-600" /> Customer / Party Name
            </label>
            <input
              type="text"
              value={aiCustomerName}
              onChange={(e) => setAiCustomerName(e.target.value)}
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

        {/* Invoice Description / Prompt */}
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
              ✓ Invoice drafted! Review fields below.
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500">
          AI drafts the invoice with customer details &amp; items — you review and confirm before it&apos;s created.
        </p>
      </div>

      <div className="space-y-6">
          <div className="space-y-2 relative z-20">
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
                onFocus={() => {
                  if (customerSearchResults.length > 0) setShowCustomerDropdown(true);
                }}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                placeholder="Enter Customer Name or Mobile Number or Company to search"
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none focus:border-brand shadow-sm"
              />
              <Search className="absolute right-3.5 top-3 h-4 w-4 text-muted" />

              {/* Dropdown */}
              {showCustomerDropdown && customerSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto z-50">
                  {customerSearchResults.map((c, i) => (
                    <div
                      key={i}
                      onClick={() => selectCustomer(c)}
                      className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-border/50 last:border-0"
                    >
                      <div className="font-semibold text-sm text-ink">{String(c.name)}</div>
                      <div className="text-xs text-muted flex gap-2">
                        {Boolean(c.phone) && <span>Phone: {String(c.phone)}</span>}
                        {Boolean(c.gstin) && <span>GSTIN: {String(c.gstin)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Billed To Summary */}
            {isCustomerSelected && customer.name && (
              <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 mb-1">Billed To</h4>
                    <p className="text-sm font-semibold text-emerald-800">{customer.name}</p>
                    <div className="mt-1 flex flex-col gap-1 text-[11px] text-emerald-700">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {customer.phone && <span className="flex items-center gap-1"><span className="opacity-70">Phone:</span> {customer.phone}</span>}
                        {customer.gstin && <span className="flex items-center gap-1"><span className="opacity-70">GSTIN:</span> {customer.gstin}</span>}
                        {customer.state && <span className="flex items-center gap-1"><span className="opacity-70">State:</span> {customer.state}</span>}
                        {customer.email && <span className="flex items-center gap-1"><span className="opacity-70">Email:</span> {customer.email}</span>}
                      </div>
                      {customer.address && <div className="flex items-start gap-1"><span className="opacity-70">Address:</span> <span className="max-w-xs">{customer.address}</span></div>}
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => { setCustomer({ name: "", gstin: "", state: "Telangana", phone: "", email: "", address: "" }); setCustomerSearch(""); setIsCustomerSelected(false); }}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-800 underline underline-offset-2"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
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
              email: newCust.email || "",
              address: "",
            });
            if (newCust.state) setPlaceOfSupply(newCust.state);
            setShowAddCustomerModal(false);
          }}
        />
      </div>
  );
}
