"use client";
import { useState } from "react";
import { Loader2, UserPlus, MinusCircle, PlusCircle } from "lucide-react";
import { Button } from "@/ui";
import { api, ApiError } from "@/lib/api";

export function AddCustomerView({
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
  const [placeOfSupply, setPlaceOfSupply] = useState("36-TELANGANA");
  const [taxTreatment, setTaxTreatment] = useState("REGISTERED_REGULAR");
  const [taxPreference, setTaxPreference] = useState<"TAXABLE" | "EXEMPT">("TAXABLE");
  const [licenceNo, setLicenceNo] = useState("");

  const [legalName, setLegalName] = useState("");

  // Billing Details (Open by default)
  const [billingOpen, setBillingOpen] = useState(true);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Telangana");
  const [pinCode, setPinCode] = useState("");

  // Shipping Address (Closed by default)
  const [shippingOpen, setShippingOpen] = useState(false);
  const [shipAddress1, setShipAddress1] = useState("");
  const [shipAddress2, setShipAddress2] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipState, setShipState] = useState("");
  const [shipPin, setShipPin] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) {
      setError("Customer name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.acc.addCustomer(orgId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        placeOfSupply,
        taxTreatment,
        taxPreference,
        licenceNo: licenceNo.trim() || undefined,
        legalName: legalName.trim() || undefined,
        address: `${addressLine1} ${addressLine2} ${city} ${state} ${pinCode}`.trim() || undefined,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed to add customer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-white shadow-card p-6 space-y-6">
      {/* Header Title */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-xl font-bold text-ink flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-brand" /> Add Customer
        </h2>
      </div>

      {/* Basic Details Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-ink">Basic Details</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-muted">Name <span className="text-danger">*</span></label>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Phone</label>
            <input
              type="text"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Email</label>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-muted">Place Of Supply <span className="text-danger">*</span></label>
            <select
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer shadow-sm"
            >
              <option value="36-TELANGANA">36-TELENGANA</option>
              <option value="37-ANDHRA PRADESH">37-ANDHRA PRADESH</option>
              <option value="29-KARNATAKA">29-KARNATAKA</option>
              <option value="27-MAHARASHTRA">27-MAHARASHTRA</option>
              <option value="07-DELHI">07-DELHI</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Tax Treatment <span className="text-danger">*</span></label>
            <select
              value={taxTreatment}
              onChange={(e) => setTaxTreatment(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer shadow-sm"
            >
              <option value="REGISTERED_REGULAR">Registered Business - Regular</option>
              <option value="REGISTERED_COMPOSITION">Registered Business - Composition</option>
              <option value="UNREGISTERED">Unregistered Business</option>
              <option value="CONSUMER">Consumer</option>
              <option value="OVERSEAS">Overseas / SEZ</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1">Tax Preference <span className="text-danger">*</span></label>
            <div className="flex items-center gap-6 mt-2">
              <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer font-medium">
                <input
                  type="radio"
                  name="taxPreference"
                  checked={taxPreference === "TAXABLE"}
                  onChange={() => setTaxPreference("TAXABLE")}
                  className="accent-brand"
                />
                Taxable
              </label>
              <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer font-medium">
                <input
                  type="radio"
                  name="taxPreference"
                  checked={taxPreference === "EXEMPT"}
                  onChange={() => setTaxPreference("EXEMPT")}
                  className="accent-brand"
                />
                Tax Exempt
              </label>
            </div>
          </div>
        </div>

        <div className="w-full sm:w-1/3">
          <label className="text-xs font-medium text-muted">Licence No.</label>
          <input
            type="text"
            placeholder="Licence No."
            value={licenceNo}
            onChange={(e) => setLicenceNo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
          />
        </div>
      </div>

      {/* Company Details Section */}
      <div className="space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-bold text-ink">Company Details</h3>
        <div className="w-full sm:w-1/3">
          <label className="text-xs font-medium text-muted">Legal Name</label>
          <input
            type="text"
            placeholder="Legal Name"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
          />
        </div>
      </div>

      {/* Billing Details (Collapsible) */}
      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setBillingOpen(!billingOpen)}
          className="flex items-center gap-2 text-sm font-bold text-ink hover:text-brand cursor-pointer"
        >
          {billingOpen ? (
            <MinusCircle className="h-5 w-5 text-red-500 fill-red-500 text-white" />
          ) : (
            <PlusCircle className="h-5 w-5 text-red-500 fill-red-500 text-white" />
          )}
          Billing Details
        </button>

        {billingOpen && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted">Address Line 1</label>
                <input
                  type="text"
                  placeholder="Address Line 1"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Address Line 2</label>
                <input
                  type="text"
                  placeholder="Address Line 2"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">City</label>
                <input
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted">State</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand cursor-pointer shadow-sm"
                >
                  <option value="Telangana">Telangana</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Delhi">Delhi</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Pin Code</label>
                <input
                  type="text"
                  placeholder="Pin Code"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shipping Address (Collapsible) */}
      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setShippingOpen(!shippingOpen)}
          className="flex items-center gap-2 text-sm font-bold text-ink hover:text-brand cursor-pointer"
        >
          {shippingOpen ? (
            <MinusCircle className="h-5 w-5 text-red-500 fill-red-500 text-white" />
          ) : (
            <PlusCircle className="h-5 w-5 text-red-500 fill-red-500 text-white" />
          )}
          Shipping Address
        </button>

        {shippingOpen && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted">Address Line 1</label>
                <input
                  type="text"
                  placeholder="Address Line 1"
                  value={shipAddress1}
                  onChange={(e) => setShipAddress1(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Address Line 2</label>
                <input
                  type="text"
                  placeholder="Address Line 2"
                  value={shipAddress2}
                  onChange={(e) => setShipAddress2(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">City</label>
                <input
                  type="text"
                  placeholder="City"
                  value={shipCity}
                  onChange={(e) => setShipCity(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted">State</label>
                <input
                  type="text"
                  placeholder="State"
                  value={shipState}
                  onChange={(e) => setShipState(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Pin Code</label>
                <input
                  type="text"
                  placeholder="Pin Code"
                  value={shipPin}
                  onChange={(e) => setShipPin(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
                />
              </div>
            </div>
          </div>
        )}
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
          {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Add Customer"}
        </button>
      </div>
    </div>
  );
}
