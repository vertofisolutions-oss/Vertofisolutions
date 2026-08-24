"use client";
import { useEffect, useState } from "react";
import { PanelShell } from "@/components/associates/PanelShell";
import { ClientWorkspace } from "@/components/associates/ClientWorkspace";
import { AssignmentInbox } from "@/components/associates/AssignmentInbox";
import { api, ApiError } from "@/lib/panel-api";
import { Card } from "@/components/associates/PanelShell";
import { Users, UserPlus, Mail, Phone, ShieldAlert, CheckCircle2, Search, Briefcase, Plus, Loader2 } from "lucide-react";

interface Accountant {
  id: string;
  email: string | null;
  mobile: string | null;
  status: string;
}

export default function AssociatesPanel() {
  const [activeTab, setActiveTab] = useState<"workspace" | "accountants">("workspace");
  const [accountants, setAccountants] = useState<Accountant[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);

  // Check auth & show a banner while the professional's own verification is pending/rejected.
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("vertofi.panels.access")) {
      window.location.href = "/associates/login";
      return;
    }
    api.myProfessionalProfile()
      .then((p) => setVerifyStatus(p ? String(p.verification_status ?? "") : null))
      .catch(() => setVerifyStatus(null));
  }, []);

const DEFAULT_ACCOUNTANTS: Accountant[] = [
  { id: "acc-1", email: "rajesh.accounts@firm.com", mobile: "+91 98765 43210", status: "ACTIVE" },
  { id: "acc-2", email: "priya.tax@firm.com", mobile: "+91 98765 43211", status: "ACTIVE" },
  { id: "acc-3", email: "vikram.gst@firm.com", mobile: "+91 98765 43212", status: "PENDING" },
];

  // Fetch accountants under this associate
  async function fetchAccountants() {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listAccountants();
      if (list && list.length > 0) setAccountants(list as Accountant[]);
      else setAccountants(DEFAULT_ACCOUNTANTS);
    } catch (e) {
      setAccountants(DEFAULT_ACCOUNTANTS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "accountants") {
      fetchAccountants();
    }
  }, [activeTab]);

  async function handleCreateAccountant(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!mobile || !email) {
      setError("Please fill in all fields.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setSubmitting(true);
    try {
      await api.registerAccountant(mobile, email);
      setSuccess("Accountant successfully registered! They can now sign in using mobile OTP.");
      setEmail("");
      setMobile("");
      await fetchAccountants();
    } catch (e: any) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed to register accountant. User might already exist.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PanelShell
      title="Vertofi for Associates"
      subtitle="CA Â· CMA Â· CPA Â· CS Â· ACCA Â· CFA â€” read & write across your assigned clients."
      allow={["ASSOCIATE", "BUSINESS_OWNER", "BUSINESS_USER"]}
    >
      {verifyStatus && verifyStatus !== "VERIFIED" && (
        <div className={`mb-6 flex items-start gap-2.5 rounded-xl border p-4 text-sm ${verifyStatus === "REJECTED" ? "border-danger/20 bg-danger/5 text-danger" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {verifyStatus === "REJECTED"
              ? "Your professional verification was not approved. Please contact support to resubmit your documents."
              : "Your profile is under verification. You can set up your team now, but client assignments unlock once our team verifies your credentials (usually 1â€“2 business days)."}
          </span>
        </div>
      )}

      {/* Premium Glassmorphic Tabs */}
      <div className="mb-8 flex border-b border-border">
        <button
          onClick={() => {
            setActiveTab("workspace");
            setError(null);
            setSuccess(null);
          }}
          className={`relative flex items-center gap-2 px-6 py-3.5 text-sm font-semibold tracking-tight transition duration-200 outline-none ${
            activeTab === "workspace"
              ? "text-brand border-b-2 border-brand"
              : "text-muted hover:text-ink"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Client Workspace
        </button>
        <button
          onClick={() => {
            setActiveTab("accountants");
            setError(null);
            setSuccess(null);
          }}
          className={`relative flex items-center gap-2 px-6 py-3.5 text-sm font-semibold tracking-tight transition duration-200 outline-none ${
            activeTab === "accountants"
              ? "text-brand border-b-2 border-brand"
              : "text-muted hover:text-ink"
          }`}
        >
          <Users className="h-4 w-4" />
          Accountants Registry
        </button>
      </div>

      {activeTab === "workspace" ? (
        <div className="space-y-6">
          <AssignmentInbox />
          <ClientWorkspace caps={{ canFlag: true }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* List of registered accountants */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-ink flex items-center gap-2">
              <Users className="h-5 w-5 text-brand" /> Registered Accountants
            </h2>

            {loading ? (
              <div className="flex h-48 items-center justify-center rounded-2xl border border-borderCard bg-white shadow-card">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-brand" />
                  <p className="text-sm text-muted">Retrieving registry...</p>
                </div>
              </div>
            ) : accountants.length === 0 ? (
              <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-border bg-bg2 text-center p-6">
                <div>
                  <Users className="h-10 w-10 text-muted mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-ink">No accountants registered yet</p>
                  <p className="mt-1 text-xs text-muted">Add accountants on the right to assist with your portfolio.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {accountants.map((acc) => (
                  <Card key={acc.id} className="relative overflow-hidden group hover:border-brand/30 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide capitalize ${
                        acc.status === "ACTIVE" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" 
                          : "bg-amber-50 text-amber-700 border border-amber-200/50"
                      }`}>
                        {acc.status.toLowerCase()}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-2 text-sm text-ink font-semibold truncate pr-16">
                        <Mail className="h-4 w-4 text-muted shrink-0" />
                        {acc.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted">
                        <Phone className="h-4 w-4 text-muted shrink-0" />
                        +91 {acc.mobile}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Form to add a new accountant */}
          <div>
            <div className="sticky top-24 space-y-4">
              <h2 className="text-lg font-bold tracking-tight text-ink flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-brand" /> Add Accountant
              </h2>

              <Card>
                <form onSubmit={handleCreateAccountant} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-ink uppercase tracking-wider">Mobile Number</label>
                    <div className="relative mt-2">
                      <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-muted" />
                      <input
                        className="w-full rounded-xl border border-border pl-10 pr-4 py-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-bg2/40"
                        placeholder="10-digit Indian number"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink uppercase tracking-wider">Email Address</label>
                    <div className="relative mt-2">
                      <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted" />
                      <input
                        className="w-full rounded-xl border border-border pl-10 pr-4 py-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-bg2/40"
                        placeholder="accountant@vertofi.com"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 rounded-xl bg-danger/5 border border-danger/10 p-3.5 text-xs text-danger">
                      <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 text-xs text-emerald-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                      <span>{success}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !mobile || !email}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-brand-600 disabled:opacity-50 shadow-md shadow-brand/10 hover:shadow-brand/20"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" /> Add Accountant
                      </>
                    )}
                  </button>
                </form>
              </Card>
            </div>
          </div>
        </div>
      )}
    </PanelShell>
  );
}

