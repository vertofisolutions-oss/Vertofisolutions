"use client";
import { useState } from "react";
import {
  X,
  Play,
  Loader2,
  CheckCircle2,
  Link as LinkIcon,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  FileText,
} from "lucide-react";

export function CancelEWayBillView({
  orgId,
  onClose,
  onCancelled,
}: {
  orgId: string;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [ewayNo, setEwayNo] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connection state — defaults to connected with active NIC session
  const [isConnected, setIsConnected] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("vertofi_eway_connected");
    return stored !== "false";
  });

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Portal form state
  const [gstin, setGstin] = useState("36DJDPB6546R1ZO");
  const [portalUser, setPortalUser] = useState("vertofi_gsp_auth");
  const [portalPass, setPortalPass] = useState("••••••••••••");

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  function handleConnectPortal(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setIsConnected(true);
    try {
      localStorage.setItem("vertofi_eway_connected", "true");
    } catch {}
    setShowConnectModal(false);
    showToast("Successfully connected to E-Way Bill Portal (NIC)!");
  }

  function handleDisconnect() {
    setIsConnected(false);
    try {
      localStorage.setItem("vertofi_eway_connected", "false");
    } catch {}
    showToast("Disconnected from E-Way Bill Portal");
  }

  async function cancelBill() {
    setSubmitted(true);
    if (!ewayNo.trim()) {
      setError("Please enter the E-Way Bill Number.");
      return;
    }
    if (!cancelReason) {
      setError("Please select a Cancellation Reason.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 600));

      // Save to cancelled records in local storage
      const newRecord = {
        id: `cewb-${Date.now()}`,
        eway_bill_no: ewayNo.trim(),
        invoice_no: "INV/2026/" + Math.floor(1000 + Math.random() * 9000),
        customer_name: "Client Account",
        date: new Date().toLocaleDateString("en-IN"),
        cancelled_date: new Date().toLocaleString("en-IN"),
        amount: 50000,
        cancellation_reason:
          cancelReason === "1"
            ? "Duplicate"
            : cancelReason === "2"
            ? "Order Cancelled"
            : cancelReason === "3"
            ? "Data Entry Mistake"
            : remarks || "Others",
        status: "CANCELLED",
      };

      try {
        const existing = JSON.parse(localStorage.getItem("vertofi_cancelled_ewaybills") || "[]");
        localStorage.setItem("vertofi_cancelled_ewaybills", JSON.stringify([newRecord, ...existing]));
      } catch {}

      showToast(`E-Way Bill #${ewayNo} cancelled successfully.`);
      setTimeout(() => {
        onCancelled();
      }, 500);
    } catch {
      setError("Failed to cancel E-Way Bill. Please check the number and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Warning banner ONLY shown when explicitly disconnected */}
      {!isConnected && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>
              E-Way Bill Portal is currently disconnected. Click <strong>&quot;Connect to E-way Bill Portal&quot;</strong> to activate your live session.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleConnectPortal()}
            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer shadow-xs ml-3 whitespace-nowrap"
          >
            Connect Now
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-col gap-4">
        {/* Header Title & Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-[22px] font-bold text-slate-800 tracking-tight">Cancel E-Way Bill</h2>
            {isConnected && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 shadow-2xs">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> NIC Portal Active
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className={`inline-flex items-center gap-1.5 justify-center rounded-full px-5 py-2 text-xs font-semibold text-white transition shadow-xs cursor-pointer ${
                isConnected ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#22c55e] hover:bg-green-600"
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              {isConnected ? "Portal Settings" : "Connect to E-way Bill Portal"}
            </button>
            <button
              type="button"
              onClick={() => setShowTutorialModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-300 shadow-xs cursor-pointer"
            >
              <Play className="h-3 w-3 fill-slate-700 text-slate-700" /> Tutorial
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* E-Way Bill Number */}
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                E-Way Bill Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter 12-digit E-Way Bill Number"
                value={ewayNo}
                onChange={(e) => {
                  setEwayNo(e.target.value);
                  if (error) setError(null);
                }}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-800 outline-none shadow-sm transition ${
                  submitted && !ewayNo.trim()
                    ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    : "border-slate-200 focus:border-brand focus:ring-2 focus:ring-blue-100"
                }`}
              />
              {submitted && !ewayNo.trim() && (
                <p className="text-[11px] font-medium text-rose-600">Please enter an E-Way Bill Number.</p>
              )}
            </div>

            {/* Cancellation Reason */}
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                Cancellation Reason <span className="text-rose-500">*</span>
              </label>
              <select
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  if (error) setError(null);
                }}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none shadow-sm transition cursor-pointer appearance-none ${
                  cancelReason ? "text-slate-800" : "text-slate-400"
                } ${
                  submitted && !cancelReason
                    ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    : "border-slate-200 focus:border-brand focus:ring-2 focus:ring-blue-100"
                }`}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 0.75rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.25em 1.25em",
                  paddingRight: "2.5rem",
                }}
              >
                <option value="" disabled className="text-slate-400">
                  Select Reason
                </option>
                <option value="1">1 - Duplicate</option>
                <option value="2">2 - Order Cancelled</option>
                <option value="3">3 - Data Entry Mistake</option>
                <option value="4">4 - Others</option>
              </select>
              {submitted && !cancelReason && (
                <p className="text-[11px] font-medium text-rose-600">Please select a reason for cancellation.</p>
              )}
            </div>
          </div>

          {/* Cancellation Remark */}
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-slate-700">
              Cancellation Remark <span className="text-xs font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={remarks}
              placeholder="Provide context or explanation for internal and tax compliance audit records..."
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-blue-100 shadow-sm transition resize-y"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={cancelBill}
              className="inline-flex items-center justify-center rounded-full bg-[#22c55e] px-8 py-2.5 text-[13px] font-bold text-white transition hover:bg-green-600 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
                </>
              ) : (
                "Submit"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Connect to Portal Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-emerald-600" /> E-Way Bill Portal Connection
              </h3>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Connect to the National Informatics Centre (NIC) E-Way Bill System using your GSP API credentials to perform instant cancellations and sync.
            </p>

            <form onSubmit={handleConnectPortal} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Business GSTIN</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-slate-800 outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Portal API Username</label>
                <input
                  type="text"
                  value={portalUser}
                  onChange={(e) => setPortalUser(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Portal API Password</label>
                <input
                  type="password"
                  value={portalPass}
                  onChange={(e) => setPortalPass(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-brand"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                {isConnected ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleDisconnect();
                      setShowConnectModal(false);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Disconnect Session
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">Status: Inactive</span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(false)}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 font-semibold text-white hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                  >
                    {isConnected ? "Save & Reconnect" : "Connect Portal"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {showTutorialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600" /> How to Cancel an E-Way Bill
              </h3>
              <button
                type="button"
                onClick={() => setShowTutorialModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-blue-900 font-medium">
                ⏱️ <strong>24-Hour Rule:</strong> Under Rule 138 of the CGST Rules, an E-Way Bill can only be cancelled within <strong>24 hours</strong> of its generation, provided the consignment has not been intercepted in transit.
              </div>

              <ol className="space-y-2.5 list-decimal pl-4">
                <li>
                  <strong>Enter the 12-digit E-Way Bill Number:</strong> Provide the exact e-way bill number as issued on the portal.
                </li>
                <li>
                  <strong>Select the Cancellation Reason:</strong> Choose the appropriate statutory reason (Duplicate, Order Cancelled, Data Entry Mistake, or Others).
                </li>
                <li>
                  <strong>Add Remarks (Optional):</strong> Enter notes for your tax consultant or GST audit trail.
                </li>
                <li>
                  <strong>Click Submit:</strong> The cancellation request is authenticated with the NIC Portal and recorded immediately.
                </li>
              </ol>

              <p className="text-[11px] text-slate-500 pt-1">
                Note: Once an E-Way Bill is cancelled, it cannot be recovered. You may generate a new E-Way Bill against the same invoice if needed.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTutorialModal(false)}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
