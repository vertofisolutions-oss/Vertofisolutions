"use client";

import React from "react";
import { DocumentFormData, TemplateDefinition } from "../types";
import { numberToWordsRupees } from "../numberToWords";
import { QrCode, CheckCircle, ShieldCheck } from "lucide-react";

interface DocumentRendererProps {
  formData: DocumentFormData;
  templateDef?: TemplateDefinition;
  templateNumber?: number; // 1 | 2 | 3 | 4 | 5 | 6
  zoomLevel?: number; // percentage e.g. 100
}

export const DocumentRenderer: React.FC<DocumentRendererProps> = ({
  formData,
  templateDef,
  templateNumber,
  zoomLevel = 100,
}) => {
  const brandColor = formData.primaryColor || "#0B132B";
  const accentColor = formData.secondaryColor || "#1E60D5";

  // Calculations
  const subtotal = (formData.items || []).reduce(
    (acc, item) => acc + (item.total || 0),
    0
  );

  const discountAmount = (subtotal * (formData.discountOverallPct || 0)) / 100;
  const taxableAmount = subtotal - discountAmount;

  // Calculate average tax or total GST
  const totalTax = (formData.items || []).reduce((acc, item) => {
    const itemNet = (item.quantity * item.rate * (1 - item.discountPct / 100));
    return acc + (itemNet * (item.taxPct || 0)) / 100;
  }, 0);

  const isWithoutGst = Boolean(
    formData.docType === "Bill of Supply" ||
    formData.docType === "BILL_OF_SUPPLY" ||
    String(formData.docNumber || "").toUpperCase().startsWith("BILL/") ||
    (formData.items || []).every((item) => Number(item.taxPct || 0) === 0) ||
    (formData.items || []).some((item) => String(item.description || "").toLowerCase().includes("without gst")) ||
    totalTax === 0
  );

  const effectiveTax = isWithoutGst ? 0 : totalTax;

  const grandTotal =
    taxableAmount +
    effectiveTax +
    (formData.shippingCharges || 0) +
    (formData.extraCharges || 0);

  const amountInWords = numberToWordsRupees(grandTotal);

  // Determine doc type category
  const category = templateDef?.category || "Invoices";
  const templateId = templateDef?.id || "";

  // Render specific layout for Employee Payslip
  if (templateId === "employee-payslip") {
    const totalEarnings = (formData.earnings || []).reduce((a, b) => a + (b.amount || 0), 0);
    const totalDeductions = (formData.deductions || []).reduce((a, b) => a + (b.amount || 0), 0);
    const netSalary = totalEarnings - totalDeductions;

    return (
      <div
        className="mx-auto bg-white shadow-2xl rounded-sm border border-slate-200 p-8 sm:p-12 text-slate-800 font-sans min-h-[1050px] flex flex-col justify-between"
        style={{
          width: "100%",
          maxWidth: "794px", // A4 standard width in px
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: "top center",
        }}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 pb-6" style={{ borderColor: brandColor }}>
            <div className="flex items-center gap-4">
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
              ) : (
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md"
                  style={{ backgroundColor: brandColor }}
                >
                  VER
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{formData.companyName}</h1>
                <p className="text-xs text-slate-500">{formData.companyAddress}, {formData.companyCityState}</p>
                <p className="text-xs text-slate-400">GSTIN: {formData.companyGstin} | Email: {formData.companyEmail}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block text-xs font-bold px-3 py-1 rounded-full text-white uppercase tracking-wider mb-1" style={{ backgroundColor: brandColor }}>
                PAYSLIP
              </span>
              <p className="text-xs font-bold text-slate-700">Pay Period: {formData.payPeriod || "August 2026"}</p>
              <p className="text-[11px] text-slate-400">Ref: {formData.docNumber}</p>
            </div>
          </div>

          {/* Employee & Attendance Info Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
            <div className="space-y-1">
              <p><span className="font-semibold text-slate-500">Employee Name:</span> <strong className="text-slate-900">{formData.employeeName}</strong></p>
              <p><span className="font-semibold text-slate-500">Employee ID:</span> <strong className="text-slate-800">{formData.employeeId}</strong></p>
              <p><span className="font-semibold text-slate-500">Designation:</span> {formData.designation}</p>
              <p><span className="font-semibold text-slate-500">Department:</span> {formData.department}</p>
            </div>
            <div className="space-y-1 text-right sm:text-left">
              <p><span className="font-semibold text-slate-500">Date of Joining:</span> {formData.joiningDate}</p>
              <p><span className="font-semibold text-slate-500">Working Days:</span> {formData.workingDays} Days</p>
              <p><span className="font-semibold text-slate-500">Present / Paid Days:</span> <strong className="text-emerald-700">{formData.paidDays} Days</strong></p>
              <p><span className="font-semibold text-slate-500">Mode of Payout:</span> {formData.paymentMethod}</p>
            </div>
          </div>

          {/* Earnings & Deductions Table */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Earnings */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-800 text-white font-bold p-2 px-3 text-xs flex justify-between">
                <span>EARNINGS</span>
                <span>AMOUNT (₹)</span>
              </div>
              <div className="p-3 space-y-2 divide-y divide-slate-100">
                {(formData.earnings || []).map((earn) => (
                  <div key={earn.id} className="flex justify-between pt-1.5 text-slate-700">
                    <span>{earn.label}</span>
                    <span className="font-semibold">₹{Number(earn.amount || 0).toLocaleString("en-IN")}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 font-bold text-slate-900 border-t border-slate-200">
                  <span>Gross Earnings</span>
                  <span className="text-emerald-700">₹{Number(totalEarnings).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-800 text-white font-bold p-2 px-3 text-xs flex justify-between">
                <span>DEDUCTIONS</span>
                <span>AMOUNT (₹)</span>
              </div>
              <div className="p-3 space-y-2 divide-y divide-slate-100">
                {(formData.deductions || []).map((ded) => (
                  <div key={ded.id} className="flex justify-between pt-1.5 text-slate-700">
                    <span>{ded.label}</span>
                    <span className="font-semibold text-rose-600">₹{Number(ded.amount || 0).toLocaleString("en-IN")}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 font-bold text-slate-900 border-t border-slate-200">
                  <span>Total Deductions</span>
                  <span className="text-rose-700">₹{Number(totalDeductions).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary Highlight Box */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 flex justify-between items-center text-xs">
            <div>
              <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Net Payout Amount</p>
              <p className="text-xl font-black text-emerald-800">₹{Number(netSalary).toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-slate-600 italic font-medium">{numberToWordsRupees(netSalary)}</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-xs">
                <CheckCircle className="h-4 w-4" /> CONFIRMED & CREDITED
              </span>
            </div>
          </div>
        </div>

        {/* Footer & Signature */}
        <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
          <div>
            <p className="font-bold text-slate-700">Vertofi HR Confidential</p>
            <p className="text-[10px]">This payslip is electronically verified. No physical signature required.</p>
          </div>
          <div className="text-right space-y-1">
            <div className="h-8 border-b border-dashed border-slate-300 w-44 ml-auto"></div>
            <p className="font-bold text-slate-800">{formData.signatoryTitle || "Authorized Signatory - HR"}</p>
            <p className="text-[10px] text-slate-400">{formData.companyName}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render specific layout for Employment Certificate
  if (templateId === "employment-certificate") {
    return (
      <div
        className="mx-auto bg-white shadow-2xl rounded-sm border border-slate-200 p-10 sm:p-14 text-slate-800 font-sans min-h-[1050px] flex flex-col justify-between"
        style={{
          width: "100%",
          maxWidth: "794px",
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: "top center",
        }}
      >
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center border-b-2 pb-6" style={{ borderColor: brandColor }}>
            <div className="flex items-center gap-3">
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
              ) : (
                <div className="h-12 w-12 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md" style={{ backgroundColor: brandColor }}>
                  VER
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{formData.companyName}</h1>
                <p className="text-xs text-slate-500">{formData.companyAddress}, {formData.companyCityState}</p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p><strong className="text-slate-800">Date:</strong> {formData.issueDate || formData.docDate}</p>
              <p><strong className="text-slate-800">Ref No:</strong> {formData.docNumber}</p>
            </div>
          </div>

          {/* Certificate Title */}
          <div className="text-center space-y-2 py-4">
            <h2 className="text-2xl font-black tracking-widest text-slate-900 uppercase">EXPERIENCE & EMPLOYMENT CERTIFICATE</h2>
            <div className="h-1 w-24 bg-blue-600 mx-auto rounded-full"></div>
          </div>

          {/* Certificate Body Paragraphs */}
          <div className="space-y-4 text-sm leading-relaxed text-slate-700 text-justify">
            <p>
              This is to certify that <strong>{formData.employeeName}</strong> (Employee ID: <strong>{formData.employeeId}</strong>) was employed with <strong>{formData.companyName}</strong> in our <strong>{formData.department}</strong> department as <strong>{formData.designation}</strong> from <strong>{formData.joiningDate}</strong> to <strong>{formData.lastWorkingDate || formData.docDate}</strong>.
            </p>
            <p>
              During their tenure with us, {formData.employeeName} demonstrated high professional standards, outstanding technical expertise, and commendable commitment toward organizational goals.
            </p>
            <p>
              {formData.notes || "We confirm that their conduct and performance were exemplary throughout their association with Vertofi Technologies."}
            </p>
            <p>
              We express our sincere appreciation for their contributions and wish them every success in all future professional endeavors.
            </p>
          </div>

          {/* Seal / Verification Stamp */}
          <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex items-center gap-3 text-xs text-blue-900">
            <ShieldCheck className="h-6 w-6 text-blue-600 shrink-0" />
            <div>
              <p className="font-bold">Official Document Verification</p>
              <p className="text-[11px] text-slate-500">Verified electronically via Vertofi HR Record Management System.</p>
            </div>
          </div>
        </div>

        {/* Signature Footer */}
        <div className="pt-12 flex justify-between items-end text-xs">
          <div>
            <p className="font-bold text-slate-800">Company Seal & Stamp</p>
            <div className="h-16 w-16 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400 mt-2">
              SEAL
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="h-10 border-b border-slate-400 w-48 ml-auto mb-2"></div>
            <p className="font-bold text-slate-900">{formData.signatoryTitle || "Authorized Signatory"}</p>
            <p className="text-slate-500">{formData.companyName}</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine active template layout configuration
  const activeTemplateNum = templateNumber || 1;

  // Custom colors and styles per template number
  const templateStyles = (() => {
    switch (activeTemplateNum) {
      case 2: // Emerald Compliance Pro
        return {
          primary: formData.primaryColor || "#059669",
          accent: "#10B981",
          badgeBg: "bg-emerald-600",
          badgeText: "text-emerald-700",
          badgeTone: "border-emerald-200 bg-emerald-50",
          tableHeaderBg: "bg-emerald-900",
          headerBorder: "border-emerald-600",
          cardBorder: "border-emerald-200",
          cardBg: "bg-emerald-50/40",
          titleText: "TAX INVOICE",
          complianceWatermark: "ORIGINAL FOR RECIPIENT • GST COMPLIANT",
        };
      case 3: // Executive Purple
        return {
          primary: formData.primaryColor || "#6D28D9",
          accent: "#8B5CF6",
          badgeBg: "bg-purple-700",
          badgeText: "text-purple-700",
          badgeTone: "border-purple-200 bg-purple-50",
          tableHeaderBg: "bg-purple-950",
          headerBorder: "border-purple-600",
          cardBorder: "border-purple-200",
          cardBg: "bg-purple-50/40",
          titleText: "COMMERCIAL TAX INVOICE",
          complianceWatermark: "DUPLICATE FOR TRANSPORTER / RECORD",
        };
      case 4: // Midnight Slate Elite
        return {
          primary: formData.primaryColor || "#0F172A",
          accent: "#D97706",
          badgeBg: "bg-slate-900",
          badgeText: "text-amber-700",
          badgeTone: "border-amber-200 bg-amber-50",
          tableHeaderBg: "bg-slate-900",
          headerBorder: "border-slate-900",
          cardBorder: "border-slate-300",
          cardBg: "bg-slate-100/70",
          titleText: "TAX INVOICE / BILL OF SUPPLY",
          complianceWatermark: "ORIGINAL FOR RECIPIENT",
        };
      case 5: // Minimalist Indigo
        return {
          primary: formData.primaryColor || "#3730A3",
          accent: "#4F46E5",
          badgeBg: "bg-indigo-600",
          badgeText: "text-indigo-700",
          badgeTone: "border-indigo-200 bg-indigo-50",
          tableHeaderBg: "bg-indigo-900",
          headerBorder: "border-indigo-500",
          cardBorder: "border-indigo-100",
          cardBg: "bg-indigo-50/30",
          titleText: "STANDARD TAX INVOICE",
          complianceWatermark: "TRIPLICATE FOR SUPPLIER",
        };
      case 6: // Classic GST Gold & Navy
        return {
          primary: formData.primaryColor || "#1E3A8A",
          accent: "#B45309",
          badgeBg: "bg-blue-900",
          badgeText: "text-amber-800",
          badgeTone: "border-amber-300 bg-amber-50",
          tableHeaderBg: "bg-blue-950",
          headerBorder: "border-amber-500",
          cardBorder: "border-amber-200",
          cardBg: "bg-amber-50/30",
          titleText: "GST TAX INVOICE",
          complianceWatermark: "ORIGINAL FOR BUYER • RULE 46 COMPLIANT",
        };
      case 1:
      default: // Vertofi Modern Blue
        return {
          primary: formData.primaryColor || "#1E60D5",
          accent: "#2563EB",
          badgeBg: "bg-blue-600",
          badgeText: "text-blue-700",
          badgeTone: "border-blue-200 bg-blue-50",
          tableHeaderBg: "bg-slate-900",
          headerBorder: "border-blue-600",
          cardBorder: "border-slate-200",
          cardBg: "bg-slate-50",
          titleText: "TAX INVOICE",
          complianceWatermark: "ORIGINAL FOR RECIPIENT",
        };
    }
  })();

  const isProforma = Boolean(
    formData.isProforma ||
    formData.docTitle?.toUpperCase().includes("PROFORMA") ||
    String(formData.docNumber || "").toUpperCase().startsWith("PI-") ||
    templateDef?.name?.toLowerCase().includes("proforma")
  );

  // Master Standard Document (Invoices, Quotations, Receipts, Billing, Client Statements)
  return (
    <div
      id="vertofi-printable-invoice"
      className="mx-auto bg-white shadow-2xl rounded-sm border border-slate-200 p-8 sm:p-12 text-slate-800 font-sans min-h-[1050px] flex flex-col justify-between print:shadow-none print:border-0 print:p-0 print:m-0 print:w-full print:max-w-none"
      style={{
        width: "100%",
        maxWidth: "794px",
        transform: `scale(${zoomLevel / 100})`,
        transformOrigin: "top center",
      }}
    >
      <div className="space-y-6">
        {/* Template watermark banner */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          <span>{isProforma ? "PROFORMA INVOICE • ESTIMATE" : isWithoutGst ? "BILL OF SUPPLY • 0% GST (TAX EXEMPT)" : templateStyles.complianceWatermark}</span>
          <span>{isProforma ? "NOT A TAX INVOICE" : isWithoutGst ? "EXEMPTED SUPPLY • COMPOSITION / NON-GST" : `Template ${activeTemplateNum} • GST Registered`}</span>
        </div>

        {/* Header Bar */}
        <div className={`flex justify-between items-start border-b-2 pb-6 ${templateStyles.headerBorder}`}>
          {/* Company Brand info */}
          <div className="flex items-start gap-4">
            {formData.logoUrl ? (
              <img src={formData.logoUrl} alt="Logo" className="h-12 w-auto object-contain max-w-[140px]" />
            ) : (
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md shrink-0"
                style={{ backgroundColor: templateStyles.primary }}
              >
                VER
              </div>
            )}
            <div className="space-y-0.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{formData.companyName}</h1>
              {formData.companyTagline && (
                <p className="text-xs font-semibold text-slate-500">{formData.companyTagline}</p>
              )}
              <p className="text-xs text-slate-500">{formData.companyAddress}, {formData.companyCityState}</p>
              <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 pt-0.5">
                {formData.companyGstin && <span>GSTIN: <strong className="text-slate-800">{formData.companyGstin}</strong></span>}
                {formData.companyPan && <span>PAN: <strong className="text-slate-800">{formData.companyPan}</strong></span>}
                {formData.companyEmail && <span>Email: {formData.companyEmail}</span>}
              </div>
            </div>
          </div>

          {/* Document Title & Reference */}
          <div className="text-right space-y-1">
            <span
              className={`inline-block font-black text-xs uppercase px-3 py-1 rounded-full text-white tracking-widest shadow-2xs ${
                isProforma ? "bg-slate-900 text-white" : isWithoutGst ? "bg-emerald-700 text-white" : templateStyles.badgeBg
              }`}
            >
              {isProforma ? "PROFORMA INVOICE" : isWithoutGst ? "BILL OF SUPPLY (0% GST)" : (formData.docTitle || templateDef?.name?.replace("Vertofi ", "").toUpperCase() || templateStyles.titleText)}
            </span>

            {formData.paymentStatus === "PAID" && (
              <div className="pt-1">
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded border border-emerald-300 uppercase tracking-wider">
                  <CheckCircle className="h-3 w-3 text-emerald-600" /> PAID
                </span>
              </div>
            )}

            <p className="text-sm font-bold text-slate-900 pt-1">
              {isProforma ? "Proforma #: " : "Invoice #: "}
              <span className="font-black" style={{ color: templateStyles.primary }}>{formData.docNumber}</span>
            </p>
            <p className="text-xs text-slate-500">{isProforma ? "Proforma Date: " : "Invoice Date: "}<strong className="text-slate-700">{formData.docDate}</strong></p>
            {formData.dueDate && <p className="text-xs text-slate-500">Due Date: <strong className="text-slate-700">{formData.dueDate}</strong></p>}
            {formData.validUntilDate && <p className="text-xs text-amber-700 font-semibold">Valid Until: {formData.validUntilDate}</p>}
          </div>
        </div>

        {/* Billed To & Shipping / Metadata Section */}
        <div className={`grid grid-cols-2 gap-4 p-4 rounded-xl border text-xs ${templateStyles.cardBorder} ${templateStyles.cardBg}`}>
          <div className="space-y-1">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">BILLED TO / CUSTOMER DETAILS:</p>
            <p className="font-extrabold text-slate-900 text-sm">{formData.customerCompany || formData.customerName}</p>
            {formData.customerName && formData.customerCompany && (
              <p className="text-slate-700 font-medium">Contact Person: {formData.customerName}</p>
            )}
            <p className="text-slate-500">{formData.customerAddress}, {formData.customerCityState}</p>
            {formData.customerGstin && <p className="text-slate-700">GSTIN: <strong className="font-mono text-slate-900">{formData.customerGstin}</strong></p>}
            {formData.customerPhone && <p className="text-slate-500">Phone: {formData.customerPhone}</p>}
            {formData.customerEmail && <p className="text-slate-500">Email: {formData.customerEmail}</p>}
          </div>

          <div className="space-y-1 text-right">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">DISPATCH & PLACE OF SUPPLY:</p>
            {formData.placeOfSupply && <p><span className="text-slate-500">Place of Supply:</span> <strong className="text-slate-800">{formData.placeOfSupply}</strong></p>}
            {formData.billingPeriod && <p><span className="text-slate-500">Return / Billing Period:</span> <strong className="text-slate-800">{formData.billingPeriod}</strong></p>}
            {formData.subscriptionPlan && <p><span className="text-slate-500">Plan:</span> <strong className="text-blue-700">{formData.subscriptionPlan}</strong></p>}
            {formData.projectName && <p><span className="text-slate-500">Project / Ref:</span> <strong>{formData.projectName}</strong></p>}
            {formData.paymentMethod && <p><span className="text-slate-500">Payment Mode:</span> <strong className="text-slate-800">{formData.paymentMethod}</strong></p>}
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 mt-4">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className={`text-white font-bold ${templateStyles.tableHeaderBg}`}>
                <th className="p-2 text-center border-r border-slate-300/30">#</th>
                <th className="p-2 border-r border-slate-300/30">Item / Service Description</th>
                <th className="p-2 text-center border-r border-slate-300/30">HSN/SAC</th>
                <th className="p-2 text-center border-r border-slate-300/30">Qty</th>
                <th className="p-2 text-right border-r border-slate-300/30">Rate (₹)</th>
                <th className="p-2 text-right border-r border-slate-300/30">Taxable Value</th>
                {isWithoutGst ? (
                  <th className="p-2 text-center border-r border-slate-300/30">GST Rate</th>
                ) : (
                  <>
                    <th className="p-2 text-center border-r border-slate-300/30" colSpan={2}>CGST</th>
                    <th className="p-2 text-center border-r border-slate-300/30" colSpan={2}>SGST</th>
                  </>
                )}
                <th className="p-2 text-right">Total (₹)</th>
              </tr>
              <tr className={`text-white font-semibold text-[9px] ${templateStyles.tableHeaderBg}`}>
                <th className="border-r border-slate-300/30"></th>
                <th className="border-r border-slate-300/30"></th>
                <th className="border-r border-slate-300/30"></th>
                <th className="border-r border-slate-300/30"></th>
                <th className="border-r border-slate-300/30"></th>
                <th className="border-r border-slate-300/30"></th>
                {isWithoutGst ? (
                  <th className="p-1 text-center border-r border-slate-300/30 border-t border-slate-300/30 bg-black/10">0% (Nil)</th>
                ) : (
                  <>
                    <th className="p-1 text-right border-r border-slate-300/30 border-t border-slate-300/30 bg-black/10">Rate</th>
                    <th className="p-1 text-right border-r border-slate-300/30 border-t border-slate-300/30 bg-black/10">Amt</th>
                    <th className="p-1 text-right border-r border-slate-300/30 border-t border-slate-300/30 bg-black/10">Rate</th>
                    <th className="p-1 text-right border-r border-slate-300/30 border-t border-slate-300/30 bg-black/10">Amt</th>
                  </>
                )}
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {(formData.items || []).map((item, idx) => {
                const itemNet = (item.quantity * item.rate * (1 - item.discountPct / 100));
                const itemTaxPct = isWithoutGst ? 0 : Number(item.taxPct || 0);
                const totalTaxAmt = isWithoutGst ? 0 : (itemNet * itemTaxPct) / 100;
                
                // Assuming intra-state for standard CGST/SGST split (50% each)
                const cgstRate = itemTaxPct / 2;
                const sgstRate = itemTaxPct / 2;
                const cgstAmt = totalTaxAmt / 2;
                const sgstAmt = totalTaxAmt / 2;

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50">
                    <td className="p-2 text-center font-medium text-slate-400 border-r border-slate-100">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-100">
                      <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                      {item.description && <p className="text-[9px] text-slate-500 mt-0.5">{item.description}</p>}
                    </td>
                    <td className="p-2 text-center text-slate-500 font-mono border-r border-slate-100">{item.hsnSac || (isWithoutGst ? "000000" : "998311")}</td>
                    <td className="p-2 text-center font-bold text-slate-800 border-r border-slate-100">{item.quantity}</td>
                    <td className="p-2 text-right font-medium border-r border-slate-100">₹{Number(item.rate || 0).toLocaleString("en-IN")}</td>
                    <td className="p-2 text-right font-semibold text-slate-700 border-r border-slate-100">₹{itemNet.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    {isWithoutGst ? (
                      <td className="p-2 text-center text-slate-500 font-semibold border-r border-slate-100">0% (Nil)</td>
                    ) : (
                      <>
                        <td className="p-2 text-right text-slate-500 border-r border-slate-100">{cgstRate}%</td>
                        <td className="p-2 text-right text-slate-600 border-r border-slate-100">₹{cgstAmt.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right text-slate-500 border-r border-slate-100">{sgstRate}%</td>
                        <td className="p-2 text-right text-slate-600 border-r border-slate-100">₹{sgstAmt.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                      </>
                    )}
                    <td className="p-2 text-right font-bold text-slate-900 text-xs">
                      ₹{Number(isWithoutGst ? itemNet : (item.total || itemNet)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Section: Payment Info & Totals Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 text-xs">
          {/* Left: Bank / UPI Details */}
          <div className="space-y-3">
            {formData.bankName && (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1 text-[11px]">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">BANK TRANSFER DETAILS</p>
                <p><span className="text-slate-500">Bank Name:</span> <strong>{formData.bankName}</strong></p>
                <p><span className="text-slate-500">A/C Number:</span> <strong className="font-mono">{formData.bankAccountNo}</strong></p>
                <p><span className="text-slate-500">IFSC Code:</span> <strong className="font-mono">{formData.bankIfsc}</strong></p>
                {formData.bankBranch && <p><span className="text-slate-500">Branch:</span> {formData.bankBranch}</p>}
              </div>
            )}

            {formData.showUpiQr && (formData.upiId || true) && (
              <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 flex items-center gap-3">
                <div className="h-14 w-14 bg-white border border-slate-300 rounded-lg p-1 flex items-center justify-center shrink-0 shadow-2xs">
                  <QrCode className="h-12 w-12 text-slate-800" />
                </div>
                <div className="text-[11px]">
                  <p className="font-bold text-blue-950">Scan & Pay via UPI</p>
                  <p className="text-blue-700 font-mono font-semibold">{formData.upiId || "vertofi@hdfcbank"}</p>
                  <p className="text-[10px] text-slate-400">Instant Verification & Receipt</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Calculations Summary */}
          <div className="space-y-2 border-t sm:border-t-0 border-slate-200 pt-2 sm:pt-0">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Subtotal:</span>
              <span className="font-semibold">₹{taxableAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            </div>

            {Boolean(formData.discountOverallPct && formData.discountOverallPct > 0) && (
              <div className="flex justify-between text-emerald-700">
                <span>Overall Discount ({formData.discountOverallPct}%):</span>
                <span>- ₹{discountAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
            )}

            {!isWithoutGst && effectiveTax > 0 ? (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>CGST Amount:</span>
                  <span className="font-semibold">₹{(effectiveTax / 2).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                </div>
                
                <div className="flex justify-between text-slate-600">
                  <span>SGST Amount:</span>
                  <span className="font-semibold">₹{(effectiveTax / 2).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>GST Tax (0% Without GST):</span>
                <span className="font-semibold">₹0.00</span>
              </div>
            )}

            {Boolean(formData.shippingCharges && formData.shippingCharges > 0) && (
              <div className="flex justify-between text-slate-600">
                <span>Shipping & Packaging:</span>
                <span>+ ₹{formData.shippingCharges?.toLocaleString("en-IN")}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-900 font-black text-base border-t-2 border-slate-900 pt-2">
              <span>Grand Total Amount:</span>
              <span style={{ color: templateStyles.primary }}>₹{grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            </div>

            <div className="pt-2 text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Amount in Words:</p>
              <p className="text-xs font-semibold text-slate-800 italic">{amountInWords}</p>
            </div>
          </div>
        </div>

        {/* Terms & Notes */}
        {formData.termsAndConditions && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] space-y-1">
            <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">TERMS & CONDITIONS</p>
            <p className="text-slate-600 whitespace-pre-line leading-relaxed">{formData.termsAndConditions}</p>
          </div>
        )}
      </div>

      {/* Footer & Signature */}
      <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
        <div>
          <p className="font-bold text-slate-800">{formData.companyName}</p>
          <p className="text-[10px]">Computer generated invoice. Vertofi Financial Operating System.</p>
        </div>
        <div className="text-right space-y-1">
          <div className="h-8 border-b border-dashed border-slate-300 w-44 ml-auto"></div>
          <p className="font-bold text-slate-800">{formData.signatoryTitle || "Authorized Signatory"}</p>
          <p className="text-[10px] text-slate-400">For {formData.companyName}</p>
        </div>
      </div>
    </div>
  );
};
