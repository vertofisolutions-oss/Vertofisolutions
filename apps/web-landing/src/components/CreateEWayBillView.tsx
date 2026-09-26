"use client";
import { useState } from "react";
import { Truck, Link as LinkIcon, Loader2, X } from "lucide-react";
import { Button, Card } from "@/ui";
import { api, ApiError } from "@/lib/api";

const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

export function CreateEWayBillView({
  orgId,
  onClose,
  onCreated,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [showBanner, setShowBanner] = useState(true);
  const [searchDoc, setSearchDoc] = useState("");

  // Transaction Details
  const [supplyType, setSupplyType] = useState("Outward");
  const [subType, setSubType] = useState("Supply");
  const [docType, setDocType] = useState("Tax Invoice");
  const [docPrefix, setDocPrefix] = useState("INV/");
  const [docNumber, setDocNumber] = useState("");
  const [docDate, setDocDate] = useState("04-09-2026");
  const [transactionType, setTransactionType] = useState("Regular");

  // Dispatch From
  const [dispatchName, setDispatchName] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("vertofi_user_name") || "Business Owner" : "Business Owner"));
  const [dispatchGstin, setDispatchGstin] = useState("36DJDPB6546R1ZO");
  const [dispatchAddr1, setDispatchAddr1] = useState("8-13-8/19/A1, SS COMPLEX Ganesh nagar Telangana");
  const [dispatchAddr2, setDispatchAddr2] = useState("");
  const [dispatchCity, setDispatchCity] = useState("Rangareddy");
  const [dispatchPincode, setDispatchPincode] = useState("500077");
  const [dispatchState, setDispatchState] = useState("36-TELANGANA");

  // Ship To
  const [shipName, setShipName] = useState("");
  const [shipGstin, setShipGstin] = useState("");
  const [shipAddr1, setShipAddr1] = useState("");
  const [shipAddr2, setShipAddr2] = useState("");
  const [shipPlace, setShipPlace] = useState("");
  const [shipPincode, setShipPincode] = useState("");
  const [shipState, setShipState] = useState("36-TELANGANA");

  // Items
  const [items, setItems] = useState([
    {
      name: "",
      description: "",
      qty: 1,
      rate: 0,
      hsn: "",
      taxRate: 18,
      cessRate: 0,
      discount: 0,
    },
  ]);

  // Totals
  const [cessAdvol, setCessAdvol] = useState("");
  const [cessNonAdvol, setCessNonAdvol] = useState("");
  const [otherAmount, setOtherAmount] = useState("");

  // Transportation Details
  const [transporterName, setTransporterName] = useState("");
  const [transporterId, setTransporterId] = useState("");
  const [distance, setDistance] = useState("");
  const [mode, setMode] = useState("Road");
  const [vehicleType, setVehicleType] = useState("Regular");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [billOfLading, setBillOfLading] = useState("");
  const [billDate, setBillDate] = useState("04-09-2026");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculated = items.reduce(
    (acc, it) => {
      const base = (it.qty || 0) * (it.rate || 0);
      const disc = (base * (it.discount || 0)) / 100;
      const taxable = Math.max(0, base - disc);
      const taxVal = (taxable * (it.taxRate || 0)) / 100;
      const cessVal = (taxable * (it.cessRate || 0)) / 100;
      return {
        taxable: acc.taxable + taxable,
        tax: acc.tax + taxVal,
        cess: acc.cess + cessVal,
        total: acc.total + taxable + taxVal + cessVal,
      };
    },
    { taxable: 0, tax: 0, cess: 0, total: 0 }
  );

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await api.acc.createSale(orgId, {
        doc_type: "EWAY_BILL",
        invoice_no: `${docPrefix}${docNumber}`,
        date: docDate,
        customer_name: shipName || "Walk-in Customer",
        total: calculated.total,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed to generate E-Way Bill");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Warning Banner */}
      {showBanner && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-sm">
          <span>
            Please connect to E-Way Bill Portal from <strong className="font-semibold text-amber-950">&quot;Connect to E-way Bill Portal&quot;</strong> button.
          </span>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="text-amber-700 hover:text-amber-950 p-0.5 rounded cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Card className="p-6 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <h2 className="text-xl font-bold tracking-tight text-ink">Create E-Way Bill</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => alert("Connect to E-Way Bill Portal")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#22c55e] px-4 py-2 text-xs font-bold text-white transition hover:bg-green-600 cursor-pointer shadow-sm"
            >
              <LinkIcon className="h-3.5 w-3.5" /> Connect to E-way Bill Portal
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-300 cursor-pointer"
            >
              ▶ Tutorial
            </button>
          </div>
        </div>

        {/* Lookup Bar */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-ink">
            Create E-Way Bill by Document/Invoice Number <span className="text-danger">*</span>
          </label>
          <div className="flex gap-3 max-w-lg mt-1">
            <input
              type="text"
              placeholder="Enter Document Number to search"
              value={searchDoc}
              onChange={(e) => setSearchDoc(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
            />
            <button
              type="button"
              onClick={() => alert("Searching document...")}
              className="rounded-xl bg-[#22c55e] px-6 py-2 text-xs font-bold text-white transition hover:bg-green-600 shadow-sm cursor-pointer"
            >
              Submit
            </button>
          </div>
        </div>

        {/* Transaction Details (Peach Card) */}
        <div className="rounded-xl border border-amber-200 bg-[#FFF9F5] p-5 space-y-4">
          <h3 className="text-sm font-bold text-ink">Transaction Details</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-ink">Supply Type <span className="text-danger">*</span></label>
              <select
                value={supplyType}
                onChange={(e) => setSupplyType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer shadow-sm"
              >
                <option value="Outward">Outward</option>
                <option value="Inward">Inward</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink">Sub Type <span className="text-danger">*</span></label>
              <select
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer shadow-sm"
              >
                <option value="Supply">Supply</option>
                <option value="Export">Export</option>
                <option value="Job Work">Job Work</option>
                <option value="SKD/CKD">SKD/CKD</option>
                <option value="Recipient Not Known">Recipient Not Known</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="text-xs font-semibold text-ink">Document Type <span className="text-danger">*</span></label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer shadow-sm"
              >
                <option value="Tax Invoice">Tax Invoice</option>
                <option value="Bill of Supply">Bill of Supply</option>
                <option value="Bill of Entry">Bill of Entry</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink">Document Number <span className="text-danger">*</span></label>
              <div className="mt-1 flex gap-2">
                <select
                  value={docPrefix}
                  onChange={(e) => setDocPrefix(e.target.value)}
                  className="rounded-xl border border-border bg-white px-2 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer shadow-sm w-20"
                >
                  <option value="INV/">INV/</option>
                  <option value="BILL/">BILL/</option>
                </select>
                <input
                  type="text"
                  placeholder=""
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full rounded-xl border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink">Document Date <span className="text-danger">*</span></label>
              <input
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink">Transaction Type <span className="text-danger">*</span></label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer shadow-sm"
              >
                <option value="Regular">Regular</option>
                <option value="Bill To - Ship To">Bill To - Ship To</option>
                <option value="Bill From - Dispatch From">Bill From - Dispatch From</option>
                <option value="Combination of 2 & 3">Combination of 2 & 3</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dispatch From */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-ink">Dispatch From</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-ink">Name</label>
              <input
                type="text"
                value={dispatchName}
                onChange={(e) => setDispatchName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">Address Line 1</label>
              <input
                type="text"
                value={dispatchAddr1}
                onChange={(e) => setDispatchAddr1(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-ink">GSTIN <span className="text-danger">*</span></label>
              <input
                type="text"
                value={dispatchGstin}
                onChange={(e) => setDispatchGstin(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">Address Line 2</label>
              <input
                type="text"
                placeholder="Address Line 2"
                value={dispatchAddr2}
                onChange={(e) => setDispatchAddr2(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">City</label>
              <input
                type="text"
                value={dispatchCity}
                onChange={(e) => setDispatchCity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-ink">Pin Code <span className="text-danger">*</span></label>
              <input
                type="text"
                value={dispatchPincode}
                onChange={(e) => setDispatchPincode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">State <span className="text-danger">*</span></label>
              <select
                value={dispatchState}
                onChange={(e) => setDispatchState(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer shadow-sm"
              >
                <option value="36-TELANGANA">36-TELANGANA</option>
                <option value="37-ANDHRA PRADESH">37-ANDHRA PRADESH</option>
                <option value="01-JAMMU AND KASMIR">01-JAMMU AND KASMIR</option>
                <option value="29-KARNATAKA">29-KARNATAKA</option>
                <option value="27-MAHARASHTRA">27-MAHARASHTRA</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ship To (Peach Card) */}
        <div className="rounded-xl border border-amber-200 bg-[#FFF9F5] p-5 space-y-4">
          <h3 className="text-sm font-bold text-ink">Ship To</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-ink">Name</label>
              <input
                type="text"
                placeholder="Name"
                value={shipName}
                onChange={(e) => setShipName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">Address Line 1</label>
              <input
                type="text"
                placeholder="Address Line 1"
                value={shipAddr1}
                onChange={(e) => setShipAddr1(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-ink">GSTIN <span className="text-danger">*</span></label>
              <input
                type="text"
                placeholder="GSTIN"
                value={shipGstin}
                onChange={(e) => setShipGstin(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">Address Line 2</label>
              <input
                type="text"
                placeholder="Address Line 2"
                value={shipAddr2}
                onChange={(e) => setShipAddr2(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">Place</label>
              <input
                type="text"
                placeholder="Place"
                value={shipPlace}
                onChange={(e) => setShipPlace(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-ink">Pin Code <span className="text-danger">*</span></label>
              <input
                type="text"
                placeholder="Pincode"
                value={shipPincode}
                onChange={(e) => setShipPincode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">State <span className="text-danger">*</span></label>
              <select
                value={shipState}
                onChange={(e) => setShipState(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer shadow-sm"
              >
                <option value="36-TELANGANA">36-TELANGANA</option>
                <option value="37-ANDHRA PRADESH">37-ANDHRA PRADESH</option>
                <option value="29-KARNATAKA">29-KARNATAKA</option>
                <option value="27-MAHARASHTRA">27-MAHARASHTRA</option>
              </select>
            </div>
          </div>
        </div>

        {/* Item Grid Table */}
        <div className="w-full overflow-visible rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-bg2 text-[11px] font-semibold text-muted">
              <tr>
                <th className="px-3 py-2.5 min-w-[180px]">Item Name</th>
                <th className="px-2 py-2.5 text-center w-16">Quantity</th>
                <th className="px-2 py-2.5 text-right w-20">Rate</th>
                <th className="px-2 py-2.5 text-right w-24">Taxable Amount</th>
                <th className="px-2 py-2.5 w-20">HSN</th>
                <th className="px-2 py-2.5 text-center w-16">Tax(%)</th>
                <th className="px-2 py-2.5 text-right w-20">Tax (₹)</th>
                <th className="px-2 py-2.5 text-center w-16">Cess(%)</th>
                <th className="px-2 py-2.5 text-right w-20">Cess(₹)</th>
                <th className="px-2 py-2.5 text-center w-16">Discount</th>
                <th className="px-2 py-2.5 text-right w-24">Amount(₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it, idx) => {
                const base = (it.qty || 0) * (it.rate || 0);
                const disc = (base * (it.discount || 0)) / 100;
                const taxable = Math.max(0, base - disc);
                const taxVal = (taxable * (it.taxRate || 0)) / 100;
                const cessVal = (taxable * (it.cessRate || 0)) / 100;
                const lineTotal = Math.round(taxable + taxVal + cessVal);

                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2 space-y-1">
                      <input
                        type="text"
                        placeholder="Enter Product name"
                        value={it.name}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx].name = e.target.value;
                          setItems(next);
                        }}
                        className="w-full rounded-md border border-border px-2.5 py-1 text-xs text-ink font-semibold outline-none focus:border-brand"
                      />
                      <input
                        type="text"
                        placeholder="Enter Product description (Optional)"
                        value={it.description}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx].description = e.target.value;
                          setItems(next);
                        }}
                        className="w-full rounded-md border border-border/60 bg-slate-50 px-2.5 py-0.5 text-[11px] text-muted outline-none focus:border-brand"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={it.qty}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx].qty = Number(e.target.value);
                          setItems(next);
                        }}
                        className="w-14 rounded-md border border-border px-2 py-1 text-xs text-center text-ink outline-none focus:border-brand"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        value={it.rate}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx].rate = Number(e.target.value);
                          setItems(next);
                        }}
                        className="w-16 rounded-md border border-border px-2 py-1 text-xs text-right text-ink outline-none focus:border-brand"
                      />
                    </td>
                    <td className="p-2 text-right font-medium text-ink">{taxable}</td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={it.hsn}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx].hsn = e.target.value;
                          setItems(next);
                        }}
                        className="w-16 rounded-md border border-border px-2 py-1 text-xs text-ink outline-none focus:border-brand"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={it.taxRate}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx].taxRate = Number(e.target.value);
                          setItems(next);
                        }}
                        className="w-14 rounded-md border border-border px-2 py-1 text-xs text-center text-ink outline-none focus:border-brand"
                      />
                    </td>
                    <td className="p-2 text-right text-muted">{taxVal}</td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={it.cessRate}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx].cessRate = Number(e.target.value);
                          setItems(next);
                        }}
                        className="w-14 rounded-md border border-border px-2 py-1 text-xs text-center text-ink outline-none focus:border-brand"
                      />
                    </td>
                    <td className="p-2 text-right text-muted">{cessVal}</td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={it.discount}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx].discount = Number(e.target.value);
                          setItems(next);
                        }}
                        className="w-14 rounded-md border border-border px-2 py-1 text-xs text-center text-ink outline-none focus:border-brand"
                      />
                    </td>
                    <td className="p-2 text-right font-bold text-ink">{lineTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs font-semibold sm:grid-cols-4 bg-slate-50 p-4 rounded-xl border border-border">
          <div>
            <span className="text-muted block">Total IGST :</span>
            <span className="text-ink text-sm">0</span>
          </div>
          <div>
            <span className="text-muted block">Total CGST :</span>
            <span className="text-ink text-sm">0</span>
          </div>
          <div>
            <span className="text-muted block">Total SGST :</span>
            <span className="text-ink text-sm">0</span>
          </div>
          <div>
            <span className="text-muted block">Total Taxable Amount :</span>
            <span className="text-ink text-sm">₹ 0</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="text-xs font-semibold text-ink">CESS Advol Amount</label>
            <input
              type="number"
              placeholder=""
              value={cessAdvol}
              onChange={(e) => setCessAdvol(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink">CESS Non Advol Amount</label>
            <input
              type="number"
              placeholder=""
              value={cessNonAdvol}
              onChange={(e) => setCessNonAdvol(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink">Other Amount</label>
            <input
              type="number"
              placeholder=""
              value={otherAmount}
              onChange={(e) => setOtherAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink">Grand Total (₹)</label>
            <div className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink font-bold shadow-sm">
              0
            </div>
          </div>
        </div>

        {/* Transportation Details (Peach Card) */}
        <div className="rounded-xl border border-amber-200 bg-[#FFF9F5] p-5 space-y-4">
          <h3 className="text-sm font-bold text-ink">Transportation Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-ink">Transporter Name</label>
              <input
                type="text"
                placeholder="Transporter Name"
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">Transporter ID</label>
              <input
                type="text"
                placeholder=""
                value={transporterId}
                onChange={(e) => setTransporterId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-ink">
                Approximate Distance in (KM) or{" "}
                <button
                  type="button"
                  onClick={() => alert("Calculating distance...")}
                  className="text-brand underline font-bold"
                >
                  Click here to Calculate*
                </button>
              </label>
              <input
                type="number"
                placeholder=""
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink">Mode <span className="text-danger">*</span></label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer shadow-sm"
              >
                <option value="Road">Road</option>
                <option value="Rail">Rail</option>
                <option value="Air">Air</option>
                <option value="Ship">Ship</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-ink">Vehicle Type <span className="text-danger">*</span></label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer shadow-sm"
              >
                <option value="Regular">Regular</option>
                <option value="Over Dimensional Cargo">Over Dimensional Cargo</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink">Vehicle Number <span className="text-danger">*</span></label>
              <input
                type="text"
                placeholder=""
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-ink">Bill of Lading No.</label>
              <input
                type="text"
                placeholder=""
                value={billOfLading}
                onChange={(e) => setBillOfLading(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink">Bill Date <span className="text-danger">*</span></label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-xs font-semibold text-danger">{error}</p>}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            disabled={busy}
            onClick={create}
            className="rounded-lg bg-[#22c55e] px-6 py-2 text-xs font-bold text-white transition hover:bg-green-600 disabled:opacity-50 cursor-pointer shadow-md"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Generate E-Way Bill"}
          </button>
          <Button variant="ghost" onClick={onClose} className="rounded-lg border border-border px-5 py-2 text-xs font-semibold text-ink">
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
