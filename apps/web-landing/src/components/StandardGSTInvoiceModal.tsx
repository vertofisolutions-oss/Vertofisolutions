"use client";
import React, { useEffect, useState } from "react";
import { X, Printer, Download, PlusCircle, FileEdit, IndianRupee, ChevronsLeft } from "lucide-react";
import { printElementAsPdf } from "@/lib/exportTemplatePdf";

const inr = (n: unknown) => `₹ ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function numberToWords(num: number): string {
    if (!num || num === 0) return "Zero";
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const n = ('000000000' + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return "";
    let str = '';
    str += (n[1] != '00') ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
    str += (n[2] != '00') ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
    str += (n[3] != '00') ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
    str += (n[4] != '0') ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
    str += (n[5] != '00') ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
    return str.trim();
}

export function StandardGSTInvoiceModal({
  sale,
  onClose,
  isProforma: isProformaProp,
}: {
  sale: Record<string, any>;
  onClose: () => void;
  isProforma?: boolean;
}) {
  const [companyProfile, setCompanyProfile] = useState<Record<string, any>>({});
  
  useEffect(() => {
    try {
      const p = localStorage.getItem("vertofi_business_profile");
      if (p) setCompanyProfile(JSON.parse(p));
    } catch {}
  }, []);

  const isProforma = Boolean(
    isProformaProp ||
    sale.isProforma ||
    String(sale.doc_type || "").toLowerCase().includes("proforma") ||
    String(sale.invoice_no || sale.invoiceNo || "").toUpperCase().startsWith("PI-")
  );

  const compName = companyProfile.businessName || companyProfile.name || "Company Name";
  const compGstin = companyProfile.gstin || companyProfile.gst || "GSTIN";
  const compAddress = [companyProfile.address, companyProfile.city, companyProfile.state, companyProfile.pincode].filter(Boolean).join(", ");
  const compPhone = companyProfile.phone || companyProfile.mobile || "";
  const compEmail = companyProfile.email || "";
  const logo = companyProfile.logoUrl || null;

  const custName = sale.customer_name || sale.customerName || sale.customer || "Customer Name";
  const custAddress = sale.billing_address || sale.billingAddress || sale.customerAddress || "";
  const custState = sale.state_of_supply || sale.stateOfSupply || sale.state || "";
  const custPhone = sale.customer_phone || sale.customerPhone || "";
  const custEmail = sale.customer_email || sale.customerEmail || "";
  const custGstin = sale.customer_gstin || sale.customerGstin || sale.gstin || "";
  const custPan = sale.customer_pan || sale.customerPan || sale.pan || "";

  const invType = sale.invoice_type || sale.invoiceType || "B2B";
  const invDate = sale.date || sale.invoice_date || sale.invoiceDate || "";
  const invNo = sale.invoice_no || sale.invoiceNo || sale.id || "";
  const pos = sale.place_of_supply || sale.placeOfSupply || sale.state_of_supply || sale.stateOfSupply || custState || "";
  const rcm = sale.rcm || "No";

  const items = Array.isArray(sale.items) ? sale.items : [];
  
  let totalQty = 0;
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalCess = 0;
  
  const hsnMap: Record<string, any> = {};

  const renderedItems = items.map((it: any, idx: number) => {
    const qty = Number(it.qty || it.quantity || 1);
    const rate = Number(it.rate || 0);
    const taxable = qty * rate;
    const cgstPct = Number(it.cgstPct || (it.taxPct ? it.taxPct / 2 : 0));
    const sgstPct = Number(it.sgstPct || (it.taxPct ? it.taxPct / 2 : 0));
    const cessPct = Number(it.cessPct || 0);
    const cgstAmt = (taxable * cgstPct) / 100;
    const sgstAmt = (taxable * sgstPct) / 100;
    const cessAmt = (taxable * cessPct) / 100;
    const total = taxable + cgstAmt + sgstAmt + cessAmt;

    totalQty += qty;
    totalTaxable += taxable;
    totalCgst += cgstAmt;
    totalSgst += sgstAmt;
    totalCess += cessAmt;

    const hsn = it.hsn || it.hsnSac || "8471";
    if (!hsnMap[hsn]) hsnMap[hsn] = { taxable: 0, taxAmt: 0, rate: cgstPct + sgstPct + cessPct };
    hsnMap[hsn].taxable += taxable;
    hsnMap[hsn].taxAmt += cgstAmt + sgstAmt + cessAmt;

    return { ...it, qty, rate, taxable, cgstPct, cgstAmt, sgstPct, sgstAmt, cessPct, cessAmt, total, hsn };
  });

  const totalAmount = totalTaxable + totalCgst + totalSgst + totalCess;
  const paymentStatus = sale.payment_status || sale.paymentStatus || sale.status || "Due";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-100">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10 w-full overflow-x-auto whitespace-nowrap">
        <button onClick={onClose} className="rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><ChevronsLeft className="h-3.5 w-3.5" /> Back</button>
        <button className="rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><IndianRupee className="h-3.5 w-3.5" /> Add Payment</button>
        <button className="rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><FileEdit className="h-3.5 w-3.5" /> Create E-Invoice</button>
        <button className="rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><FileEdit className="h-3.5 w-3.5" /> Create Credit Note</button>
        <button onClick={() => window.print()} className="rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><Printer className="h-3.5 w-3.5" /> Print</button>
        <button onClick={() => {
            const el = document.getElementById("printable-invoice-a4");
            if (el) printElementAsPdf(el, `${String(invNo || "Invoice")}`);
        }} className="rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><Download className="h-3.5 w-3.5" /> PDF Download</button>
        <button onClick={onClose} className="rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 ml-auto"><X className="h-3.5 w-3.5" /> Cancel</button>
      </div>

      {/* Invoice Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center pb-24">
        <div id="printable-invoice-a4" className="w-full max-w-[850px] bg-white shadow-xl p-8 sm:p-10 text-slate-800 text-xs sm:text-[13px] border border-slate-200 print:shadow-none print:border-none print:p-0 leading-relaxed font-sans">
          
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="max-w-[70%]">
              <h1 className="text-xl sm:text-2xl font-bold text-[#1f497d] mb-2 uppercase">{isProforma ? "Proforma Invoice" : "Sales Invoice"}</h1>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{compName}</h2>
              <p className="font-bold text-slate-800 mt-0.5">GSTIN / UIN: {compGstin}</p>
              <p className="text-slate-600 mt-1.5 leading-snug pr-4">{compAddress}</p>
              <p className="mt-1.5"><span className="font-semibold text-slate-700">Name:</span> {compName}</p>
              <p><span className="font-semibold text-slate-700">Phone:</span> {compPhone}</p>
              <p><span className="font-semibold text-slate-700">Email:</span> {compEmail}</p>
            </div>
            <div>
              {logo ? <img src={logo} alt="Logo" className="max-h-24 max-w-[160px] object-contain" /> : <div className="w-24 h-24 bg-[#fdf5e6] flex items-center justify-center font-bold text-[#b8860b] rounded-lg shadow-sm">VERTOFI</div>}
            </div>
          </div>

          {/* Details Row */}
          <div className="flex flex-col sm:flex-row mt-8 gap-6 sm:gap-8">
            <div className="flex-1">
              <p className="text-[11px] text-slate-500 mb-1">Bill To :</p>
              <p className="font-bold text-slate-800 text-sm uppercase">{custName}</p>
              <p className="text-slate-600 mt-1">{custAddress}</p>
              <p className="text-slate-600">{custState}</p>
              <p className="text-slate-600">INDIA</p>
              <div className="mt-3 space-y-0.5">
                <p><span className="font-bold inline-block w-24">Name:</span> {custName}</p>
                <p><span className="font-bold inline-block w-24">Phone:</span> {custPhone}</p>
                <p><span className="font-bold inline-block w-24">Email:</span> {custEmail}</p>
                <p><span className="font-bold inline-block w-24">GSTIN / UIN:</span> {custGstin}</p>
                <p><span className="font-bold inline-block w-24">PAN:</span> {custPan}</p>
                <p><span className="font-bold inline-block w-24">State:</span> {custState}</p>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-slate-500 mb-1">Ship To :</p>
              <p className="font-bold text-slate-800 text-sm uppercase">{custName}</p>
              <p className="text-slate-600 mt-1">{custAddress}</p>
              <p className="text-slate-600">{custState}</p>
              <p className="text-slate-600">INDIA</p>
              <div className="mt-3 space-y-0.5">
                <p><span className="font-bold inline-block w-24">Name:</span> {custName}</p>
                <p><span className="font-bold inline-block w-24">Phone:</span> {custPhone}</p>
                <p><span className="font-bold inline-block w-24">Email:</span> {custEmail}</p>
                <p><span className="font-bold inline-block w-24">GSTIN:</span> {custGstin}</p>
                <p><span className="font-bold inline-block w-24">Pan:</span> {custPan}</p>
                <p><span className="font-bold inline-block w-24">State:</span> {custState}</p>
              </div>
            </div>
            <div className="flex-1 bg-white">
              <table className="w-full text-left">
                <tbody className="space-y-1">
                  <tr><td className="font-bold text-slate-800 py-0.5 pr-2 w-28">Invoice Type:</td><td className="text-slate-600">{invType}</td></tr>
                  <tr><td className="font-bold text-slate-800 py-0.5 pr-2">Invoice Date:</td><td className="text-slate-600">{invDate}</td></tr>
                  <tr><td className="font-bold text-slate-800 py-0.5 pr-2">Invoice No.:</td><td className="text-slate-600">{invNo}</td></tr>
                  <tr><td className="font-bold text-slate-800 py-0.5 pr-2">POS:</td><td className="text-slate-600">{pos}</td></tr>
                  <tr><td className="font-bold text-slate-800 py-0.5 pr-2">RCM:</td><td className="text-slate-600">{rcm}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Items Table */}
          <div className="mt-8 border border-[#9bc2e6] rounded overflow-hidden">
            <table className="w-full text-center border-collapse text-[11px]">
              <thead className="bg-[#e6f2ff] text-slate-800 font-bold border-b border-[#9bc2e6]">
                <tr>
                  <th rowSpan={2} className="border-r border-[#9bc2e6] p-2">Sr. No</th>
                  <th rowSpan={2} className="border-r border-[#9bc2e6] p-2 text-left w-[25%]">Item</th>
                  <th rowSpan={2} className="border-r border-[#9bc2e6] p-2">HSN</th>
                  <th rowSpan={2} className="border-r border-[#9bc2e6] p-2">Qty</th>
                  <th rowSpan={2} className="border-r border-[#9bc2e6] p-2">Unit</th>
                  <th rowSpan={2} className="border-r border-[#9bc2e6] p-2">Rate</th>
                  <th rowSpan={2} className="border-r border-[#9bc2e6] p-2">Taxable Amount</th>
                  <th colSpan={2} className="border-r border-[#9bc2e6] border-b border-[#9bc2e6] p-1.5">CGST</th>
                  <th colSpan={2} className="border-r border-[#9bc2e6] border-b border-[#9bc2e6] p-1.5">SGST</th>
                  <th colSpan={2} className="border-r border-[#9bc2e6] border-b border-[#9bc2e6] p-1.5">CESS</th>
                  <th rowSpan={2} className="p-2">Total</th>
                </tr>
                <tr>
                  <th className="border-r border-[#9bc2e6] p-1.5">Rate</th>
                  <th className="border-r border-[#9bc2e6] p-1.5">Amount</th>
                  <th className="border-r border-[#9bc2e6] p-1.5">Rate</th>
                  <th className="border-r border-[#9bc2e6] p-1.5">Amount</th>
                  <th className="border-r border-[#9bc2e6] p-1.5">Rate</th>
                  <th className="border-r border-[#9bc2e6] p-1.5">Amount</th>
                </tr>
              </thead>
              <tbody>
                {renderedItems.map((it: any, idx: number) => (
                  <tr key={idx} className="border-b border-[#cde0f5]">
                    <td className="border-r border-[#9bc2e6] p-2 align-top">{idx + 1}</td>
                    <td className="border-r border-[#9bc2e6] p-2 text-left uppercase align-top">{it.item || it.name}</td>
                    <td className="border-r border-[#9bc2e6] p-2 align-top">{it.hsn}</td>
                    <td className="border-r border-[#9bc2e6] p-2 align-top">{it.qty}</td>
                    <td className="border-r border-[#9bc2e6] p-2 align-top">{it.unit || "NOS"}</td>
                    <td className="border-r border-[#9bc2e6] p-2 align-top">{inr(it.rate)}</td>
                    <td className="border-r border-[#9bc2e6] p-2 font-bold align-top text-slate-900">{inr(it.taxable)}</td>
                    <td className="border-r border-[#9bc2e6] p-2 align-top">{it.cgstPct.toFixed(2)}</td>
                    <td className="border-r border-[#9bc2e6] p-2 font-bold align-top text-slate-900">{inr(it.cgstAmt)}</td>
                    <td className="border-r border-[#9bc2e6] p-2 align-top">{it.sgstPct.toFixed(2)}</td>
                    <td className="border-r border-[#9bc2e6] p-2 font-bold align-top text-slate-900">{inr(it.sgstAmt)}</td>
                    <td className="border-r border-[#9bc2e6] p-2 align-top">{it.cessPct.toFixed(2)}</td>
                    <td className="border-r border-[#9bc2e6] p-2 font-bold align-top text-slate-900">{inr(it.cessAmt)}</td>
                    <td className="p-2 font-bold align-top text-slate-900">{inr(it.total)}</td>
                  </tr>
                ))}
                <tr className="bg-[#e6f2ff] font-bold text-slate-900">
                  <td colSpan={3} className="text-center border-r border-[#9bc2e6] p-2.5 text-[13px]">Total</td>
                  <td className="border-r border-[#9bc2e6] p-2.5 text-[13px]">{totalQty}</td>
                  <td colSpan={2} className="border-r border-[#9bc2e6] p-2.5"></td>
                  <td className="border-r border-[#9bc2e6] p-2.5 text-[13px]">{inr(totalTaxable)}</td>
                  <td className="border-r border-[#9bc2e6] p-2.5"></td>
                  <td className="border-r border-[#9bc2e6] p-2.5 text-[13px]">{inr(totalCgst)}</td>
                  <td className="border-r border-[#9bc2e6] p-2.5"></td>
                  <td className="border-r border-[#9bc2e6] p-2.5 text-[13px]">{inr(totalSgst)}</td>
                  <td className="border-r border-[#9bc2e6] p-2.5"></td>
                  <td className="border-r border-[#9bc2e6] p-2.5 text-[13px]">{inr(totalCess)}</td>
                  <td className="p-2.5 text-[13px]">{inr(totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="mt-4 border border-[#9bc2e6] flex flex-col sm:flex-row rounded overflow-hidden text-[12px]">
            <div className="flex-1 flex flex-col justify-center items-center border-b sm:border-b-0 sm:border-r border-[#9bc2e6] p-6">
              <p className="font-bold text-slate-800 mb-1.5 text-sm">Total in words</p>
              <p className="text-slate-600 capitalize text-center leading-relaxed font-medium">
                {numberToWords(totalAmount)} Rupees Only.
              </p>
            </div>
            <div className="w-full sm:w-[350px]">
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-[#cde0f5]">
                    <td className="font-bold text-slate-800 p-2.5">Taxable Amount</td>
                    <td className="text-right p-2.5 font-bold text-slate-900">{inr(totalTaxable)}</td>
                  </tr>
                  <tr className="border-b border-[#cde0f5]">
                    <td className="font-bold text-slate-800 p-2.5">Total CGST</td>
                    <td className="text-right p-2.5 font-bold text-slate-900">{inr(totalCgst)}</td>
                  </tr>
                  <tr className="border-b border-[#cde0f5]">
                    <td className="font-bold text-slate-800 p-2.5">Total SGST</td>
                    <td className="text-right p-2.5 font-bold text-slate-900">{inr(totalSgst)}</td>
                  </tr>
                  <tr className="border-b border-[#cde0f5]">
                    <td className="font-bold text-slate-800 p-2.5">Total CESS</td>
                    <td className="text-right p-2.5 font-bold text-slate-900">{inr(totalCess)}</td>
                  </tr>
                  <tr className="border-b border-[#cde0f5]">
                    <td className="font-bold text-slate-800 p-2.5">Extra Charges</td>
                    <td className="text-right p-2.5 font-bold text-slate-900">₹ 0.00</td>
                  </tr>
                  <tr className="bg-[#e6f2ff]">
                    <td className="font-bold text-slate-900 p-3 text-[13px]">Total Amount</td>
                    <td className="text-right p-3 font-bold text-slate-900 text-[13px]">{inr(totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* HSN Tax Table */}
          <div className="mt-4 border border-[#9bc2e6] rounded overflow-hidden">
            <table className="w-full text-center border-collapse text-[11px]">
              <thead className="bg-[#e6f2ff] text-slate-800 font-bold border-b border-[#9bc2e6]">
                <tr>
                  <th rowSpan={2} className="border-r border-[#9bc2e6] p-2">HSN/SAC</th>
                  <th rowSpan={2} className="border-r border-[#9bc2e6] p-2">Taxable Value</th>
                  <th colSpan={2} className="border-r border-[#9bc2e6] border-b border-[#9bc2e6] p-1.5 text-center">Tax</th>
                  <th rowSpan={2} className="p-2">Total Invoice Amount</th>
                </tr>
                <tr>
                  <th className="border-r border-[#9bc2e6] p-1.5">Rate</th>
                  <th className="border-r border-[#9bc2e6] p-1.5">Amount</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(hsnMap).map(([hsn, data]: any) => (
                  <tr key={hsn} className="border-b border-[#cde0f5]">
                    <td className="border-r border-[#9bc2e6] p-2.5">{hsn}</td>
                    <td className="border-r border-[#9bc2e6] p-2.5 text-slate-800 font-medium">{inr(data.taxable)}</td>
                    <td className="border-r border-[#9bc2e6] p-2.5 text-slate-800 font-medium">{data.rate.toFixed(2)}</td>
                    <td className="border-r border-[#9bc2e6] p-2.5 text-slate-800 font-medium">{inr(data.taxAmt)}</td>
                    <td className="p-2.5 text-slate-800 font-medium">{inr(data.taxable + data.taxAmt)}</td>
                  </tr>
                ))}
                <tr className="bg-[#e6f2ff] font-bold text-slate-900">
                  <td className="text-center border-r border-[#9bc2e6] p-2.5">Total</td>
                  <td className="border-r border-[#9bc2e6] p-2.5">{inr(totalTaxable)}</td>
                  <td className="border-r border-[#9bc2e6] p-2.5"></td>
                  <td className="border-r border-[#9bc2e6] p-2.5">{inr(totalCgst + totalSgst + totalCess)}</td>
                  <td className="p-2.5">{inr(totalAmount)}</td>
                </tr>
              </tbody>
            </table>
            <div className="p-2.5 text-[11px] border-t border-[#9bc2e6] bg-white">
              <span className="font-semibold text-slate-700">Tax Amount (in words):</span> <span className="capitalize font-bold text-slate-900 ml-1">{totalCgst + totalSgst + totalCess === 0 ? "Zero" : numberToWords(totalCgst + totalSgst + totalCess) + " Rupees Only"}</span>
            </div>
          </div>

          {/* Footer block */}
          <div className="mt-4 border border-[#9bc2e6] flex flex-col sm:flex-row rounded overflow-hidden">
            <div className="flex-1 border-b sm:border-b-0 sm:border-r border-[#9bc2e6] flex flex-col">
              <div className="border-b border-[#9bc2e6] font-bold text-center py-2.5 text-[12px] bg-slate-50 text-slate-800">
                Terms and Conditions
              </div>
              <div className="p-5 text-[12px] space-y-1.5 flex-1">
                <p><span className="font-bold text-slate-800">Payment Status:</span> {paymentStatus}</p>
                <p><span className="font-bold text-slate-800">vertofi:</span> {sale.notes || "Thank you for doing business with us."}</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col">
              <div className="border-b border-[#9bc2e6] font-bold text-center py-2.5 text-[12px] bg-slate-50 text-slate-800">
                For {compName}
              </div>
              <div className="p-5 flex flex-col items-center justify-end h-36">
                <p className="font-bold text-[13px] text-slate-800">Authorised Signatory</p>
                <p className="text-[12px] text-slate-700 mt-1">{compName}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Business Owner</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center text-[10px] text-slate-400 font-medium pb-2">
            © Powered by <span className="underline cursor-pointer hover:text-slate-600 transition">Prologic Web Solutions</span>. All rights reserved
          </div>
        </div>
      </div>
    </div>
  );
}
