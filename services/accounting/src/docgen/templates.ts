/**
 * Document template registry — the single source of truth for every statutory
 * document Vertofi produces. Layout is DECLARED here (which blocks render, the
 * title, the number series), never hardcoded in the renderer, so adding a new
 * document type is a config change. Matches the conventions in the 19 approved
 * templates under docs/templates/ (header + party blocks + GST line-item table +
 * totals/amount-in-words + signatory).
 */
export type DocType =
  | "TAX_INVOICE"
  | "B2C_INVOICE"
  | "BILL_OF_SUPPLY"
  | "EXPORT_INVOICE"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE"
  | "PROFORMA"
  | "QUOTATION"
  | "RECEIPT_VOUCHER"
  | "PAYMENT_VOUCHER"
  | "SELF_INVOICE"
  | "PURCHASE_ORDER"
  | "PURCHASE_INVOICE"
  | "DELIVERY_CHALLAN"
  | "SHIPPING_LABEL"
  | "JOURNAL_VOUCHER"
  | "CONTRA_VOUCHER"
  | "EXPENSE_VOUCHER"
  | "PETTY_CASH_VOUCHER"
  | "GOODS_TRANSFER_CHALLAN"
  | "RETURN_CHALLAN";

/** Catalog grouping for the UI document picker. */
export type DocCategory = "SALES" | "ADJUSTMENT" | "PRE_SALE" | "VOUCHER" | "PURCHASE" | "LOGISTICS";

export interface DocTemplate {
  type: DocType;
  /** Heading printed at the top of the document. */
  title: string;
  /** Number-series prefix (GST needs consecutive numbers per series). */
  prefix: string;
  /** Render the CGST/SGST/IGST tax table (off for non-tax docs like challan/PO). */
  taxTable: boolean;
  /** "Bill To" vs "Vendor"/"Ship To" wording. */
  partyLabel: string;
  /** Show the transport/vehicle block (challan, e-way oriented). */
  transport: boolean;
  /** Show the authorised-signatory block. */
  signature: boolean;
  /** Statutory declaration line, if any. */
  declaration?: string;
  /** Top-right copy label, e.g. "ORIGINAL FOR RECIPIENT" (per approved templates). */
  originalLabel?: string;
  /** Show the bank-details + payment-QR band (sales-side money documents). */
  bankDetails?: boolean;
  /** Special non-tabular layout (shipping label). */
  layout?: "label";
  /** UI catalog grouping + one-line description (drives the document picker). */
  category: DocCategory;
  description: string;
  /** True when this type is backed by a sales_invoices row (posts to ledger). */
  postsToLedger?: boolean;
}

export const TEMPLATES: Record<DocType, DocTemplate> = {
  TAX_INVOICE: {
    type: "TAX_INVOICE", title: "Tax Invoice", prefix: "INV-", taxTable: true,
    partyLabel: "Bill To", transport: false, signature: true,
    originalLabel: "ORIGINAL FOR RECIPIENT", bankDetails: true,
    category: "SALES", postsToLedger: true,
    description: "GST invoice to a registered buyer (CGST/SGST/IGST).",
    declaration: "We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.",
  },
  B2C_INVOICE: {
    type: "B2C_INVOICE", title: "Invoice", prefix: "INV-", taxTable: true,
    partyLabel: "Bill To", transport: false, signature: true,
    originalLabel: "ORIGINAL FOR RECIPIENT", bankDetails: true,
    category: "SALES", postsToLedger: true,
    description: "Retail invoice to an unregistered consumer.",
  },
  BILL_OF_SUPPLY: {
    type: "BILL_OF_SUPPLY", title: "Bill of Supply", prefix: "BOS-", taxTable: false,
    partyLabel: "Bill To", transport: false, signature: true, bankDetails: true,
    category: "SALES",
    description: "For composition dealers / exempt goods — no GST charged.",
    declaration: "Composition taxable person / exempt supply — not eligible to collect tax on supplies. No tax charged on this bill.",
  },
  EXPORT_INVOICE: {
    type: "EXPORT_INVOICE", title: "Export Invoice", prefix: "EXP-", taxTable: true,
    partyLabel: "Bill To (Consignee)", transport: true, signature: true,
    originalLabel: "ORIGINAL FOR RECIPIENT", bankDetails: true,
    category: "SALES",
    description: "Zero-rated export under LUT/Bond, with shipping details.",
    declaration: "Supply meant for export under Letter of Undertaking (LUT) without payment of IGST. Sec. 16 IGST Act.",
  },
  CREDIT_NOTE: {
    type: "CREDIT_NOTE", title: "Credit Note", prefix: "CRN-", taxTable: true,
    partyLabel: "Bill To", transport: false, signature: true,
    category: "ADJUSTMENT",
    description: "Reduce a buyer's liability against an earlier invoice.",
    declaration: "This credit note adjusts the referenced tax invoice as per CGST Act sec. 34.",
  },
  DEBIT_NOTE: {
    type: "DEBIT_NOTE", title: "Debit Note", prefix: "DBN-", taxTable: true,
    partyLabel: "Billed To", transport: false, signature: true,
    category: "ADJUSTMENT",
    description: "Increase a buyer's liability against an earlier invoice.",
    declaration: "This debit note supplements the referenced tax invoice as per CGST Act sec. 34.",
  },
  PROFORMA: {
    type: "PROFORMA", title: "Proforma Invoice", prefix: "PI-", taxTable: true,
    partyLabel: "Bill To", transport: false, signature: true, bankDetails: true,
    category: "PRE_SALE",
    description: "Advance estimate before the sale is confirmed.",
    declaration: "This is a proforma invoice and not a demand for payment. Prices and taxes are indicative.",
  },
  QUOTATION: {
    type: "QUOTATION", title: "Quotation", prefix: "QTN-", taxTable: true,
    partyLabel: "Quote To", transport: false, signature: true,
    category: "PRE_SALE",
    description: "Price quote you can later convert to an invoice.",
    declaration: "Quotation valid for 15 days from the date above unless otherwise stated.",
  },
  RECEIPT_VOUCHER: {
    type: "RECEIPT_VOUCHER", title: "Receipt Voucher", prefix: "RV-", taxTable: true,
    partyLabel: "Received From", transport: false, signature: true,
    category: "VOUCHER",
    description: "Advance received from a customer (GST on advance).",
    declaration: "Issued on receipt of advance towards supply, per Sec. 31(3)(d) CGST Act.",
  },
  PAYMENT_VOUCHER: {
    type: "PAYMENT_VOUCHER", title: "Payment Voucher", prefix: "PV-", taxTable: false,
    partyLabel: "Paid To", transport: false, signature: true,
    category: "VOUCHER",
    description: "Proof of a payment made to a party.",
    declaration: "Issued as proof of payment made by the company.",
  },
  SELF_INVOICE: {
    type: "SELF_INVOICE", title: "Self Invoice (RCM)", prefix: "SI-", taxTable: true,
    partyLabel: "Supplier (Unregistered)", transport: false, signature: true,
    category: "PURCHASE",
    description: "Reverse-charge self invoice for unregistered purchases.",
    declaration: "Self-invoice raised under reverse charge for inward supply from an unregistered supplier, Sec. 31(3)(f) CGST Act.",
  },
  PURCHASE_ORDER: {
    type: "PURCHASE_ORDER", title: "Purchase Order", prefix: "PO-", taxTable: true,
    partyLabel: "To", transport: false, signature: true,
    category: "PURCHASE",
    description: "Order placed on a vendor for goods/services.",
    declaration: "Please supply the goods/services below per the terms and pricing agreed.",
  },
  PURCHASE_INVOICE: {
    type: "PURCHASE_INVOICE", title: "Purchase Invoice", prefix: "PINV-", taxTable: true,
    partyLabel: "Bill To", transport: false, signature: true,
    category: "PURCHASE",
    description: "Record a vendor's bill against your business.",
  },
  DELIVERY_CHALLAN: {
    type: "DELIVERY_CHALLAN", title: "Delivery Challan", prefix: "DC-", taxTable: false,
    partyLabel: "Ship To", transport: true, signature: true,
    category: "LOGISTICS",
    description: "Goods movement without a tax invoice.",
    declaration: "Goods are dispatched as per the order. Not a tax invoice.",
  },
  SHIPPING_LABEL: {
    type: "SHIPPING_LABEL", title: "Shipping Label", prefix: "SHP-", taxTable: false,
    partyLabel: "Ship To", transport: false, signature: false, layout: "label",
    category: "LOGISTICS",
    description: "Ship-to / from address label for a parcel.",
  },
  JOURNAL_VOUCHER: {
    type: "JOURNAL_VOUCHER", title: "Journal Voucher", prefix: "JV-", taxTable: false,
    partyLabel: "Particulars", transport: false, signature: true,
    category: "VOUCHER",
    description: "Non-cash adjustment / book entry between ledger accounts.",
    declaration: "Recorded as a journal adjustment entry in the books of account.",
  },
  CONTRA_VOUCHER: {
    type: "CONTRA_VOUCHER", title: "Contra Voucher", prefix: "CV-", taxTable: false,
    partyLabel: "Particulars", transport: false, signature: true,
    category: "VOUCHER",
    description: "Cash ↔ bank (or bank ↔ bank) transfer — no external party.",
    declaration: "Contra entry between the company's own cash and bank accounts.",
  },
  EXPENSE_VOUCHER: {
    type: "EXPENSE_VOUCHER", title: "Expense Voucher", prefix: "EV-", taxTable: false,
    partyLabel: "Paid To", transport: false, signature: true,
    category: "VOUCHER",
    description: "Record a business expense paid to a party.",
    declaration: "Issued to record an expense incurred by the company.",
  },
  PETTY_CASH_VOUCHER: {
    type: "PETTY_CASH_VOUCHER", title: "Petty Cash Voucher", prefix: "PCV-", taxTable: false,
    partyLabel: "Paid To", transport: false, signature: true,
    category: "VOUCHER",
    description: "Small cash expense from the petty-cash float.",
    declaration: "Paid from the petty-cash float against the items listed.",
  },
  GOODS_TRANSFER_CHALLAN: {
    type: "GOODS_TRANSFER_CHALLAN", title: "Goods Transfer Challan", prefix: "GTC-", taxTable: false,
    partyLabel: "Transfer To", transport: true, signature: true,
    category: "LOGISTICS",
    description: "Stock transfer between your own branches / warehouses.",
    declaration: "Goods transferred between own locations. Not a supply / not a tax invoice.",
  },
  RETURN_CHALLAN: {
    type: "RETURN_CHALLAN", title: "Return Challan", prefix: "RC-", taxTable: false,
    partyLabel: "Return To", transport: true, signature: true,
    category: "LOGISTICS",
    description: "Goods returned to a supplier / received back from a buyer.",
    declaration: "Goods returned as per the reference document. Not a tax invoice.",
  },
};

export function templateFor(type: DocType): DocTemplate {
  const t = TEMPLATES[type];
  if (!t) throw new Error(`unknown_document_type:${type}`);
  return t;
}

export const DOC_TYPES = Object.keys(TEMPLATES) as DocType[];

/** Lightweight catalog for the UI document picker — single source of truth. */
export function docCatalog() {
  return DOC_TYPES.map((type) => {
    const t = TEMPLATES[type];
    return {
      type,
      title: t.title,
      category: t.category,
      description: t.description,
      taxTable: t.taxTable,
      postsToLedger: !!t.postsToLedger,
      needsReference: type === "CREDIT_NOTE" || type === "DEBIT_NOTE",
    };
  });
}
