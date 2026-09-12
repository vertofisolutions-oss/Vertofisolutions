"use client";
import { useState } from "react";
import { Loader2, Play, MinusCircle, PlusCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";

export function AddSupplierView({
  orgId,
  onClose,
  onCreated,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenceNo, setLicenceNo] = useState("");
  const [gstin, setGstin] = useState("");
  const [legalName, setLegalName] = useState("");

  // Billing Details
  const [billingOpen, setBillingOpen] = useState(true);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");

  const [busy, setBusy] = useState(false);
  const [fetchingGst, setFetchingGst] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchGstDetails() {
    if (!gstin.trim()) {
      alert("Please enter GSTIN to fetch details.");
      return;
    }
    setFetchingGst(true);
    try {
      const data = await api.gst.lookup(gstin.trim());
      if (data && data.legalName) {
        setLegalName(data.legalName);
        if (data.address) {
          setAddressLine1(data.address.line || "");
          setCity(data.address.city || "");
          setState(data.address.state || "");
          setPinCode(data.address.pincode || "");
        }
      }
    } catch (e) {
      alert("Failed to fetch GST details.");
    } finally {
      setFetchingGst(false);
    }
  }

  async function create() {
    if (!name.trim()) {
      setError("Supplier name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.acc.addCustomer(orgId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        licenceNo: licenceNo.trim() || undefined,
        gstin: gstin.trim() || undefined,
        legalName: legalName.trim() || undefined,
        address: `${addressLine1} ${addressLine2} ${city} ${state} ${pinCode}`.trim() || undefined,
        // Fallbacks for removed UI fields
        placeOfSupply: "36-TELANGANA",
        taxTreatment: "REGISTERED_REGULAR",
        taxPreference: "TAXABLE",
      });
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed to add supplier");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Header section outside the card (Wait, looking at screenshot, it's inside a white container) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-6">
        
        {/* Header Title & Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
          <h2 className="text-[20px] font-bold text-slate-800 tracking-tight">Add New Supplier Details</h2>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#e2e8f0] px-5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-300 shadow-xs cursor-pointer"
          >
            <Play className="h-3 w-3 fill-slate-700 text-slate-700" /> Tutorial
          </button>
        </div>

        {/* Basic Details */}
        <div className="space-y-4">
          <h3 className="text-[14px] font-bold text-slate-700">Basic Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600">
                Name <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-red-500 shadow-sm transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600">
                Phone <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="text"
                placeholder="Phone"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val && !/^[6-9]/.test(val)) return;
                  setPhone(val);
                }}
                className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-red-500 shadow-sm transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600">
                Email
              </label>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-red-500 shadow-sm transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600">
                Licence No.
              </label>
              <input
                type="text"
                placeholder="Licence No."
                value={licenceNo}
                onChange={(e) => setLicenceNo(e.target.value)}
                className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-red-500 shadow-sm transition"
              />
            </div>
          </div>
        </div>

        {/* Company Details */}
        <div className="space-y-4 pt-2">
          <h3 className="text-[14px] font-bold text-slate-700">Company Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600">
                GSTIN / UIN
              </label>
              <input
                type="text"
                placeholder="GSTIN / UIN"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-red-500 shadow-sm transition uppercase"
              />
            </div>

            <button
              type="button"
              onClick={fetchGstDetails}
              disabled={fetchingGst}
              className="w-full rounded-full bg-[#22c55e] px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-green-600 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {fetchingGst ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Fetch Details"}
            </button>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600">
                Legal Name
              </label>
              <input
                type="text"
                placeholder="Legal Name"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-red-500 shadow-sm transition"
              />
            </div>
          </div>
        </div>

        {/* Billing Details */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setBillingOpen(!billingOpen)}
            className="flex items-center gap-3 text-[14px] font-bold text-slate-700 cursor-pointer w-full text-left"
          >
            {billingOpen ? (
              <div className="bg-[#ef4444] rounded-full p-0.5">
                <MinusCircle className="h-4 w-4 text-white fill-transparent stroke-[3]" />
              </div>
            ) : (
              <div className="bg-[#ef4444] rounded-full p-0.5">
                <PlusCircle className="h-4 w-4 text-white fill-transparent stroke-[3]" />
              </div>
            )}
            Billing Details
          </button>
          
          <div className="h-px bg-slate-200/80 w-full mt-3" />

          {billingOpen && (
            <div className="mt-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-slate-600">
                    Address Line 1 <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Address Line 1"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-red-500 shadow-sm transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-slate-600">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    placeholder="Address Line 2"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-red-500 shadow-sm transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-slate-600">
                    City <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-red-500 shadow-sm transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-slate-600">
                    State <span className="text-[#ef4444]">*</span>
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={`w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-red-500 shadow-sm transition cursor-pointer appearance-none ${
                      state ? "text-slate-800" : "text-slate-400"
                    }`}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: "right 0.5rem center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "1.5em 1.5em",
                      paddingRight: "2.5rem"
                    }}
                  >
                    <option value="" disabled className="text-slate-400">Select State</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Maharashtra">Maharashtra</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-slate-600">
                    Pin Code: <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Pin Code"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-red-500 shadow-sm transition"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-xs font-semibold text-[#ef4444]">{error}</p>}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-6">
          <button
            type="button"
            disabled={busy}
            onClick={create}
            className="inline-flex items-center justify-center rounded-full bg-[#22c55e] px-8 py-2.5 text-[13px] font-bold text-white transition hover:bg-green-600 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Supplier"}
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition shadow-sm cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
