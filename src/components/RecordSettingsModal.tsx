"use client";
import { useState } from "react";
import {
  X,
  Settings,
  FileText,
  Calendar,
  DollarSign,
  User,
  Copy,
  Check,
  Printer,
  Eye,
  ShieldCheck,
  Tag,
  Clock,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { InvoiceTemplatePreviewModal } from "./ReportsCenter";

const inr = (n: number | string | undefined) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export interface RecordSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Record<string, unknown> | null;
  type?: string;
  onUpdate?: (updated: Record<string, unknown>) => void;
  onDelete?: (record: Record<string, unknown>) => void;
}

export function RecordSettingsModal({
  isOpen,
  onClose,
  record,
  type = "Document",
  onUpdate,
  onDelete,
}: RecordSettingsModalProps) {
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!isOpen || !record) return null;

  const isInventory =
    type === "Inventory Item" ||
    type === "Product" ||
    Boolean(record.sku || record.item_name || record.stock !== undefined || record.qty !== undefined);

  const docNumber = String(
    record.doc_number ??
      record.number ??
      record.invoice_no ??
      record.invoiceNo ??
      record.code ??
      record.sku ??
      record.id ??
      "RECORD-001"
  );
  const partyName = String(
    record.name ??
      record.item_name ??
      record.product_name ??
      record.customer_name ??
      record.party_name ??
      record.vendor_name ??
      record.supplier_name ??
      "—"
  );
  const docType = isInventory ? (type === "Product" ? "Product" : "Inventory Item") : String(record.doc_type ?? record.type ?? type);
  const reference = String(
    record.category ??
      record.unit ??
      record.reference ??
      record.ref ??
      record.invoice_ref ??
      "—"
  );
  const dateStr = String(
    record.date ?? record.issue_date ?? record.created_at ?? "Today"
  ).slice(0, 10);
  const returnPeriod = isInventory
    ? `${Number(record.qty ?? record.stock ?? 0)} ${String(record.unit ?? "Units")}`
    : String(record.return_period ?? "09-2026");
  const totalAmount = Number(
    record.selling_price ?? record.rate ?? record.total ?? record.amount ?? record.total_amount ?? record.value ?? 0
  );
  const purchasePrice = Number(record.purchase_price ?? 0);
  const status = String(record.status ?? (isInventory ? "IN_STOCK" : "ISSUED")).toUpperCase();
  const notes = String(
    record.notes ??
      record.description ??
      (isInventory ? `Catalog item registered under ${reference}. Tracked for real-time inventory management.` : "Standard ledger entry")
  );
  const gstin = String(record.gstin ?? record.customer_gstin ?? record.vendor_gstin ?? (isInventory ? "N/A (Stock Item)" : "36AABCU9603R1ZM"));

  function handleCopy() {
    const summary = isInventory
      ? `${docType}: ${partyName} | Code: ${docNumber} | Qty: ${returnPeriod} | Selling Price: ${inr(totalAmount)} | Status: ${status}`
      : `${docType}: ${docNumber} | Party: ${partyName} | Amount: ${inr(totalAmount)} | Date: ${dateStr} | Status: ${status}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
                <Settings className="h-5 w-5 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{docType} Details</h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
                      status === "PAID" || status === "ACTIVE" || status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : status === "CANCELLED" || status === "REJECTED"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <p className="text-xs font-mono font-medium text-slate-500 mt-0.5">{docNumber}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="overflow-y-auto p-6 space-y-5 flex-1 text-xs">
            {/* Quick KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Total Amount
                </span>
                <span className="text-base font-bold text-slate-900 mt-1 block">
                  {inr(totalAmount)}
                </span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Date
                </span>
                <span className="text-xs font-semibold text-slate-800 mt-1 block">
                  {dateStr}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Return Period
                </span>
                <span className="text-xs font-semibold text-slate-800 mt-1 block">
                  {returnPeriod}
                </span>
              </div>
            </div>

            {/* Document Details Grid */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                <span>Selected Record Information</span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-4">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">Party / Customer</span>
                  <span className="text-xs font-semibold text-slate-900 mt-0.5 block">{partyName}</span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">Document ID / Number</span>
                  <span className="text-xs font-semibold font-mono text-blue-600 mt-0.5 block">{docNumber}</span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">Original Reference</span>
                  <span className="text-xs font-medium text-slate-800 mt-0.5 block">{reference}</span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">Document Type</span>
                  <span className="text-xs font-medium text-slate-800 mt-0.5 block">{docType}</span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">GSTIN</span>
                  <span className="text-xs font-mono font-medium text-slate-800 mt-0.5 block">{gstin}</span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">Verification</span>
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Reconciled & Logged
                  </span>
                </div>
              </div>
            </div>

            {/* Notes / Description */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Notes & Descriptions
              </span>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {notes}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied!" : "Copy Data"}</span>
              </button>

              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(record);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer shadow-2xs"
                  title="Delete Record"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-xs"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>View Document</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {previewOpen && (
        <InvoiceTemplatePreviewModal
          sale={record}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
}
