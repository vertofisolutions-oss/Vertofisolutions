"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { SidebarShell } from "../../components/SidebarShell";
import { DocumentUpload } from "../../components/DocumentUpload";
import { api, getAccess, getOrgId } from "@/lib/api";

/**
 * V3 Enterprise Onboarding — the 10-section business profile wizard. Runs
 * AFTER account creation (/register handles signup + payment); this enriches
 * the org profile so predictions, compliance and documents work at full depth.
 * Every section autosaves to onboarding.onboarding_profiles.sections (jsonb)
 * — leave anytime, resume where you left off.
 */

type Data = Record<string, Record<string, string>>;

const STEPS = [
  { key: "business", title: "Business information" },
  { key: "registration", title: "Registration details" },
  { key: "owner", title: "Owner & management" },
  { key: "tax", title: "Tax profile" },
  { key: "banking", title: "Banking" },
  { key: "accounting", title: "Accounting systems" },
  { key: "documents", title: "Documents" },
  { key: "whatsapp", title: "WhatsApp CFO" },
  { key: "team", title: "Team" },
  { key: "review", title: "Review & submit" },
] as const;

// ── Indian registry validators ──────────────────────────────────────────────

/** GSTIN: 15 chars + mod-36 check digit (the real GSTN algorithm). */
function validGstin(g: string): boolean {
  const s = g.toUpperCase().trim();
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(s)) return false;
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = chars.indexOf(s[i]!);
    const p = v * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(p / 36) + (p % 36);
  }
  return chars[(36 - (sum % 36)) % 36] === s[14];
}

function validPan(p: string): boolean {
  return /^[A-Z]{3}[PCHFATBLJG][A-Z]\d{4}[A-Z]$/.test(p.toUpperCase().trim());
}

const validIfsc = (s: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(s.toUpperCase().trim());
const validPincode = (s: string) => /^[1-9]\d{5}$/.test(s.trim());
const validCin = (s: string) => /^[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(s.toUpperCase().trim());
const validUdyam = (s: string) => /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(s.toUpperCase().trim());
const validMobile = (s: string) => /^[6-9]\d{9}$/.test(s.trim());
const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

const BUSINESS_TYPES = ["Proprietorship", "Partnership", "LLP", "Private Limited", "Public Limited", "HUF", "Trust / Society"];
const INDUSTRIES = ["Manufacturing", "Trading / Retail", "Services", "Construction", "Logistics", "Hospitality", "Healthcare", "Agriculture", "Technology", "Other"];
const SOFTWARE = ["Tally", "Zoho Books", "Busy", "Marg", "Excel / manual", "None"];

/** Entity-type-driven document requirements (docs/07). */
function requiredDocs(businessType: string): { type: string; label: string }[] {
  const common = [
    { type: "PAN_CARD", label: "Business PAN card" },
    { type: "BANK_STATEMENT", label: "Bank statement (last 6 months)" },
    { type: "GST_CERTIFICATE", label: "GST registration certificate" },
  ];
  switch (businessType) {
    case "Private Limited":
    case "Public Limited":
      return [{ type: "COI", label: "Certificate of Incorporation" }, { type: "MOA_AOA", label: "MOA & AOA" }, ...common];
    case "LLP":
      return [{ type: "LLP_AGREEMENT", label: "LLP agreement" }, { type: "COI", label: "Certificate of Incorporation" }, ...common];
    case "Partnership":
      return [{ type: "PARTNERSHIP_DEED", label: "Partnership deed" }, ...common];
    case "Trust / Society":
      return [{ type: "TRUST_DEED", label: "Trust deed / registration" }, ...common];
    default:
      return [{ type: "OWNER_ID", label: "Owner Aadhaar / ID proof" }, ...common];
  }
}

// ── Shared sharp form kit ───────────────────────────────────────────────────

function F({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-ink">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[11px] font-medium text-danger">{error}</span>
        : hint ? <span className="mt-1 block text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

const inputCls = "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-brand";

function Txt(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls} />;
}

function Sel({ options, ...props }: { options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={inputCls}>
      <option value="">Select…</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ── The wizard ──────────────────────────────────────────────────────────────

export default function EnterpriseOnboarding() {
  const router = useRouter();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Data>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ confidence_score: number | null; financial_maturity: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccess()) { router.replace("/login"); return; }
    const oid = getOrgId();
    if (!oid) { router.replace("/register"); return; }
    setOrgId(oid);
    void (async () => {
      try {
        const profile = (await api.onboarding(oid)) as { sections?: Data };
        const sections = profile.sections ?? {};
        setData(sections);
        // Resume at the first section never saved.
        const firstIncomplete = STEPS.findIndex((s) => !sections[s.key]);
        if (firstIncomplete > 0) setStep(firstIncomplete);
      } catch {
        setLoadError("Couldn't load your saved progress — starting fresh. Your answers still save as you go.");
      } finally {
        setReady(true);
      }
    })();
  }, [router]);

  const [gstinBusy, setGstinBusy] = useState(false);
  const [gstinNote, setGstinNote] = useState<string | null>(null);
  const [caMsg, setCaMsg] = useState<string | null>(null);

  const key = STEPS[step]!.key;
  const sec = useMemo(() => data[key] ?? {}, [data, key]);
  const set = (field: string, value: string) => {
    setData((d) => ({ ...d, [key]: { ...(d[key] ?? {}), [field]: value } }));
    setErrors((e) => ({ ...e, [field]: "" }));
    setSaved(false);
  };
  /** Set a field in a specific section (used by GSTIN autofill which spans sections). */
  const setIn = (sectionKey: string, field: string, value: string) => {
    setData((d) => ({ ...d, [sectionKey]: { ...(d[sectionKey] ?? {}), [field]: value } }));
    setSaved(false);
  };

  /** Pull business details from the GST network → autofill registration + business sections. */
  async function fetchFromGstin(gstin: string) {
    const g = (gstin ?? "").trim().toUpperCase();
    if (g.length !== 15) { setGstinNote("Enter a 15-character GSTIN."); return; }
    setGstinBusy(true); setGstinNote(null);
    try {
      const p = await api.gst.lookup(g);
      if (!p.structurallyValid) { setGstinNote("That GSTIN doesn't look valid."); return; }
      set("gstin", g);
      if (p.pan) set("pan", p.pan);
      if (p.legalName) setIn("business", "legalName", p.legalName);
      if (p.tradeName) setIn("business", "tradeName", p.tradeName);
      if (p.address?.city) setIn("business", "city", p.address.city);
      if (p.address?.state || p.state) setIn("business", "state", (p.address?.state || p.state)!);
      if (p.address?.pincode) setIn("business", "pincode", p.address.pincode);
      setGstinNote(
        p.source === "GSP"
          ? `Fetched: ${p.legalName ?? p.tradeName ?? "taxpayer"}${p.status ? ` · ${p.status}` : ""}`
          : `Validated · ${p.state ?? "state"} · PAN ${p.pan ?? "—"}. (Legal name + address fill once the GSP key is live.)`,
      );
    } catch {
      setGstinNote("Couldn't reach the GST network.");
    } finally {
      setGstinBusy(false);
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    const req = (f: string, msg = "Required") => { if (!sec[f]?.trim()) e[f] = msg; };
    if (key === "business") {
      req("legalName"); req("businessType"); req("industry"); req("city"); req("state");
      if (sec.pincode && !validPincode(sec.pincode)) e.pincode = "6-digit Indian pincode";
    }
    if (key === "registration") {
      if (sec.cin && !validCin(sec.cin)) e.cin = "Format: U/L + 5 digits + state + year + type + 6 digits";
      if (sec.udyam && !validUdyam(sec.udyam)) e.udyam = "Format: UDYAM-XX-00-0000000";
    }
    if (key === "owner") {
      req("ownerName");
      if (sec.ownerMobile && !validMobile(sec.ownerMobile)) e.ownerMobile = "10-digit Indian mobile";
      if (sec.ownerEmail && !validEmail(sec.ownerEmail)) e.ownerEmail = "Valid email";
    }
    if (key === "tax") {
      if (sec.gstin && !validGstin(sec.gstin)) e.gstin = "Invalid GSTIN (check digit failed)";
      if (sec.pan && !validPan(sec.pan)) e.pan = "Invalid PAN format";
      if (!sec.gstin && !sec.pan) { e.gstin = "Provide GSTIN or PAN"; e.pan = "Provide GSTIN or PAN"; }
    }
    if (key === "banking") {
      req("bankName"); req("accountNumber");
      if (sec.ifsc && !validIfsc(sec.ifsc)) e.ifsc = "Format: 4 letters + 0 + 6 chars";
      if (!sec.ifsc) e.ifsc = "Required";
      if (sec.accountNumber && !/^\d{9,18}$/.test(sec.accountNumber.trim())) e.accountNumber = "9–18 digits";
    }
    if (key === "accounting") { req("software"); req("fyStart"); }
    if (key === "whatsapp" && sec.optIn === "yes" && !validMobile(sec.number ?? "")) e.number = "10-digit Indian mobile";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function persist(targetStep: number) {
    if (!orgId) return;
    setSaving(true);
    try {
      await api.saveSection(orgId, key, data[key] ?? {});
      setSaved(true);
      setStep(targetStep);
    } catch {
      setErrors({ _save: "Couldn't save — check your connection and try again." });
    } finally {
      setSaving(false);
    }
  }

  async function next() {
    if (!validate()) return;
    await persist(Math.min(step + 1, STEPS.length - 1));
  }

  async function submit() {
    if (!orgId) return;
    setSubmitting(true);
    try {
      await api.saveSection(orgId, "review", { submittedAt: new Date().toISOString() });
      const r = await api.completeOnboarding(orgId);
      setResult({ confidence_score: r.confidence_score, financial_maturity: r.financial_maturity });
    } catch {
      setErrors({ _save: "Submission failed — your answers are saved; try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) return null;

  return (
    <SidebarShell>
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <h1 className="text-[18px] font-semibold tracking-tight text-ink">Enterprise setup</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          Your complete business profile — powers predictions, compliance and documents. Saves automatically at every step.
        </p>
        {loadError && <p className="mt-2 text-[11px] text-muted">{loadError}</p>}

        {/* Step rail — horizontal scroll on mobile */}
        <ol className="mt-5 flex gap-1 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const done = !!data[s.key] && i < step;
            return (
              <li key={s.key} className="shrink-0">
                <button
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-[11px] font-medium transition ${
                    i === step ? "border-brand bg-brand text-white"
                      : done ? "border-borderCard bg-bg2 text-ink"
                      : "border-borderCard bg-white text-muted"
                  } ${i > step ? "cursor-not-allowed" : ""}`}
                >
                  {done ? <Check className="h-3 w-3 text-emerald-600" /> : <span>{i + 1}.</span>}
                  <span className="whitespace-nowrap">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <section className="mt-4 border border-border bg-white p-4 sm:p-6">
          <h2 className="text-[15px] font-semibold text-ink">{STEPS[step]!.title}</h2>

          {result ? (
            <div className="mt-4 space-y-3">
              <p className="text-[13px] text-ink">
                Profile submitted. Vertofi confidence score:{" "}
                <span className="font-semibold">{result.confidence_score ?? "computing"}</span>
                {result.financial_maturity && <> · maturity <span className="font-semibold">{result.financial_maturity}</span></>}
              </p>
              <p className="text-[12px] text-muted">Predictions and compliance tracking now use your full profile.</p>
              <button onClick={() => router.push("/dashboard")} className="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-600">
                Go to dashboard
              </button>
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {key === "business" && (
                  <>
                    <F label="Legal business name" error={errors.legalName}><Txt value={sec.legalName ?? ""} onChange={(e) => set("legalName", e.target.value)} placeholder="As per PAN / incorporation" /></F>
                    <F label="Trade name (if different)"><Txt value={sec.tradeName ?? ""} onChange={(e) => set("tradeName", e.target.value)} /></F>
                    <F label="Business type" error={errors.businessType}><Sel options={BUSINESS_TYPES} value={sec.businessType ?? ""} onChange={(e) => set("businessType", e.target.value)} /></F>
                    <F label="Industry" error={errors.industry}><Sel options={INDUSTRIES} value={sec.industry ?? ""} onChange={(e) => set("industry", e.target.value)} /></F>
                    <F label="Year started"><Txt inputMode="numeric" maxLength={4} value={sec.yearStarted ?? ""} onChange={(e) => set("yearStarted", e.target.value.replace(/\D/g, ""))} placeholder="2018" /></F>
                    <F label="Employees"><Sel options={["1–5", "6–20", "21–50", "51–200", "200+"]} value={sec.employees ?? ""} onChange={(e) => set("employees", e.target.value)} /></F>
                    <F label="City" error={errors.city}><Txt value={sec.city ?? ""} onChange={(e) => set("city", e.target.value)} /></F>
                    <F label="State" error={errors.state}><Txt value={sec.state ?? ""} onChange={(e) => set("state", e.target.value)} /></F>
                    <F label="Pincode" error={errors.pincode}><Txt inputMode="numeric" maxLength={6} value={sec.pincode ?? ""} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} /></F>
                  </>
                )}

                {key === "registration" && (
                  <>
                    <F label="CIN / LLPIN" hint="For companies & LLPs" error={errors.cin}><Txt value={sec.cin ?? ""} onChange={(e) => set("cin", e.target.value.toUpperCase())} placeholder="U12345MH2018PTC123456" /></F>
                    <F label="Udyam (MSME) number" error={errors.udyam}><Txt value={sec.udyam ?? ""} onChange={(e) => set("udyam", e.target.value.toUpperCase())} placeholder="UDYAM-MH-00-0000000" /></F>
                    <F label="MSME classification"><Sel options={["Micro", "Small", "Medium", "Not registered"]} value={sec.msmeClass ?? ""} onChange={(e) => set("msmeClass", e.target.value)} /></F>
                    <F label="Shop & establishment no."><Txt value={sec.shopEstNo ?? ""} onChange={(e) => set("shopEstNo", e.target.value)} /></F>
                  </>
                )}

                {key === "owner" && (
                  <>
                    <F label="Owner / primary director name" error={errors.ownerName}><Txt value={sec.ownerName ?? ""} onChange={(e) => set("ownerName", e.target.value)} /></F>
                    <F label="Designation"><Sel options={["Proprietor", "Partner", "Director", "Managing Director", "Karta", "Trustee"]} value={sec.designation ?? ""} onChange={(e) => set("designation", e.target.value)} /></F>
                    <F label="Owner mobile" error={errors.ownerMobile}><Txt inputMode="numeric" maxLength={10} value={sec.ownerMobile ?? ""} onChange={(e) => set("ownerMobile", e.target.value.replace(/\D/g, ""))} /></F>
                    <F label="Owner email" error={errors.ownerEmail}><Txt type="email" value={sec.ownerEmail ?? ""} onChange={(e) => set("ownerEmail", e.target.value)} /></F>
                    <F label="DIN (directors only)"><Txt inputMode="numeric" maxLength={8} value={sec.din ?? ""} onChange={(e) => set("din", e.target.value.replace(/\D/g, ""))} /></F>
                    <F label="Other partners / directors" hint="Comma-separated names"><Txt value={sec.coOwners ?? ""} onChange={(e) => set("coOwners", e.target.value)} /></F>
                  </>
                )}

                {key === "tax" && (
                  <>
                    <F label="GSTIN" error={errors.gstin} hint={gstinNote ?? "Enter your GSTIN, then Fetch to autofill name, PAN & address"}>
                      <div className="flex gap-1.5">
                        <Txt maxLength={15} value={sec.gstin ?? ""} onChange={(e) => set("gstin", e.target.value.toUpperCase())} placeholder="27ABCDE1234F1Z5" />
                        <button type="button" onClick={() => fetchFromGstin(sec.gstin ?? "")} disabled={gstinBusy || (sec.gstin ?? "").trim().length !== 15} className="shrink-0 whitespace-nowrap rounded-lg border border-border px-3 text-[12px] font-semibold text-brand transition hover:bg-brand/5 disabled:opacity-40">
                          {gstinBusy ? "…" : "Fetch"}
                        </button>
                      </div>
                    </F>
                    <F label="Business PAN" error={errors.pan}><Txt maxLength={10} value={sec.pan ?? ""} onChange={(e) => set("pan", e.target.value.toUpperCase())} placeholder="ABCDE1234F" /></F>
                    <F label="GST scheme"><Sel options={["Regular", "Composition", "Not registered"]} value={sec.gstScheme ?? ""} onChange={(e) => set("gstScheme", e.target.value)} /></F>
                    <F label="GST filing frequency"><Sel options={["Monthly", "Quarterly (QRMP)"]} value={sec.filingFreq ?? ""} onChange={(e) => set("filingFreq", e.target.value)} /></F>
                    <F label="TAN (if deducting TDS)"><Txt maxLength={10} value={sec.tan ?? ""} onChange={(e) => set("tan", e.target.value.toUpperCase())} /></F>
                    <F label="Professional tax state"><Txt value={sec.ptState ?? ""} onChange={(e) => set("ptState", e.target.value)} /></F>
                  </>
                )}

                {key === "banking" && (
                  <>
                    <F label="Bank name" error={errors.bankName}><Txt value={sec.bankName ?? ""} onChange={(e) => set("bankName", e.target.value)} /></F>
                    <F label="Account number" error={errors.accountNumber}><Txt inputMode="numeric" maxLength={18} value={sec.accountNumber ?? ""} onChange={(e) => set("accountNumber", e.target.value.replace(/\D/g, ""))} /></F>
                    <F label="IFSC" error={errors.ifsc}><Txt maxLength={11} value={sec.ifsc ?? ""} onChange={(e) => set("ifsc", e.target.value.toUpperCase())} placeholder="HDFC0001234" /></F>
                    <F label="Account type"><Sel options={["Current", "CC / OD", "Savings"]} value={sec.accountType ?? ""} onChange={(e) => set("accountType", e.target.value)} /></F>
                    <F label="Business UPI ID"><Txt value={sec.upi ?? ""} onChange={(e) => set("upi", e.target.value)} placeholder="business@upi" /></F>
                    <F label="Existing loans / OD limit (₹)"><Txt inputMode="numeric" value={sec.loans ?? ""} onChange={(e) => set("loans", e.target.value.replace(/\D/g, ""))} /></F>
                  </>
                )}

                {key === "accounting" && (
                  <>
                    <F label="Current accounting software" error={errors.software}><Sel options={SOFTWARE} value={sec.software ?? ""} onChange={(e) => set("software", e.target.value)} /></F>
                    <F label="Financial year start" error={errors.fyStart}><Sel options={["April (standard)", "January"]} value={sec.fyStart ?? ""} onChange={(e) => set("fyStart", e.target.value)} /></F>
                    <F label="Books maintained since"><Txt inputMode="numeric" maxLength={4} value={sec.booksSince ?? ""} onChange={(e) => set("booksSince", e.target.value.replace(/\D/g, ""))} placeholder="2020" /></F>
                    <F label="Inventory method"><Sel options={["FIFO", "Weighted average", "No inventory"]} value={sec.inventory ?? ""} onChange={(e) => set("inventory", e.target.value)} /></F>
                    <F label="Who does your accounting today?"><Sel options={["Myself", "In-house accountant", "External CA", "Nobody / irregular"]} value={sec.whoAccounts ?? ""} onChange={(e) => set("whoAccounts", e.target.value)} /></F>
                  </>
                )}

                {key === "whatsapp" && (
                  <>
                    <F label="Enable WhatsApp CFO?"><Sel options={["yes", "no"]} value={sec.optIn ?? ""} onChange={(e) => set("optIn", e.target.value)} /></F>
                    {sec.optIn === "yes" && (
                      <>
                        <F label="WhatsApp number" error={errors.number}><Txt inputMode="numeric" maxLength={10} value={sec.number ?? ""} onChange={(e) => set("number", e.target.value.replace(/\D/g, ""))} /></F>
                        <F label="Daily briefing time"><Sel options={["08:30", "09:00", "18:00", "20:00"]} value={sec.briefingTime ?? ""} onChange={(e) => set("briefingTime", e.target.value)} /></F>
                      </>
                    )}
                  </>
                )}

                {key === "team" && (
                  <>
                    <F label="Member mobile" hint="They sign in with phone OTP — no password to share" error={errors.tmMobile}>
                      <Txt inputMode="numeric" maxLength={10} value={sec.tmMobile ?? ""} onChange={(e) => set("tmMobile", e.target.value.replace(/\D/g, ""))} />
                    </F>
                    <F label="Member email" error={errors.tmEmail}>
                      <Txt type="email" value={sec.tmEmail ?? ""} onChange={(e) => set("tmEmail", e.target.value)} />
                    </F>
                    <F label="Assign your CA / Accountant (optional)" hint={caMsg ?? "Their Vertofi ID (VRU-XXXXXXXX) — they confirm from their panel before getting access"}>
                      <div className="flex gap-1.5">
                        <Txt value={sec.caVru ?? ""} onChange={(e) => set("caVru", e.target.value.toUpperCase())} placeholder="VRU-1A2B3C4D" />
                        <button
                          type="button"
                          disabled={!/^VRU-[A-Z0-9]{8}$/.test(sec.caVru ?? "")}
                          onClick={async () => {
                            setCaMsg(null);
                            try { const r = await api.mod.assignProfessional((sec.caVru ?? "").trim()); setCaMsg(`Request sent to ${r.professional} — awaiting their confirmation.`); set("caVru", ""); }
                            catch (e) { setCaMsg(String((e as Error).message).replaceAll("_", " ")); }
                          }}
                          className="shrink-0 whitespace-nowrap rounded-lg border border-border px-3 text-[12px] font-semibold text-brand transition hover:bg-brand/5 disabled:opacity-40"
                        >
                          Assign
                        </button>
                      </div>
                    </F>
                  </>
                )}
              </div>

              {key === "documents" && orgId && (
                <div className="mt-4 space-y-2">
                  <p className="text-[12px] text-muted">
                    Required for <span className="font-medium text-ink">{data.business?.businessType ?? "your business type"}</span> — uploads go straight into your encrypted document vault and the OCR pipeline.
                  </p>
                  {requiredDocs(data.business?.businessType ?? "").map((d) => (
                    <DocumentUpload key={d.type} orgId={orgId} type={d.type} label={d.label} />
                  ))}
                </div>
              )}

              {key === "team" && (
                <div className="mt-4">
                  <button
                    onClick={async () => {
                      if (!validMobile(sec.tmMobile ?? "")) { setErrors({ tmMobile: "10-digit Indian mobile" }); return; }
                      if (!validEmail(sec.tmEmail ?? "")) { setErrors({ tmEmail: "Valid email" }); return; }
                      setSaving(true);
                      try {
                        await api.registerBusinessUser(sec.tmMobile!, sec.tmEmail!);
                        const added = [...((data.team?.added as unknown as string[]) ?? []), `${sec.tmEmail} (${sec.tmMobile})`];
                        setData((d) => ({ ...d, team: { added: added as unknown as string, tmMobile: "", tmEmail: "" } as Record<string, string> }));
                        setErrors({});
                      } catch (e) {
                        setErrors({ tmMobile: String((e as Error).message).includes("already") ? "Already has a Vertofi account" : "Couldn't add — try again" });
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="rounded-lg border border-brand px-4 py-2 text-[12px] font-semibold text-brand transition hover:bg-brand/5 disabled:opacity-50"
                  >
                    {saving ? "Adding…" : "+ Add to team now"}
                  </button>
                  {Array.isArray(data.team?.added as unknown) && (data.team!.added as unknown as string[]).length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {(data.team!.added as unknown as string[]).map((m) => (
                        <li key={m} className="text-[12px] text-ink">✓ {m} — active, signs in with phone OTP</li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 text-[11px] text-muted">
                    Members get the BUSINESS_USER role in your organisation and sign in immediately at business.vertofi.com with their mobile number.
                  </p>
                </div>
              )}

              {key === "review" && (
                <div className="mt-4 space-y-3">
                  {STEPS.slice(0, -1).map((s) => {
                    const d = data[s.key] ?? {};
                    const filled = Object.entries(d).filter(([, v]) => v?.trim());
                    return (
                      <div key={s.key} className="border border-borderCard bg-bg2 px-3 py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-ink">{s.title}</span>
                          <button onClick={() => setStep(STEPS.findIndex((x) => x.key === s.key))} className="text-[11px] font-medium text-brand hover:underline">Edit</button>
                        </div>
                        {filled.length === 0 ? (
                          <p className="mt-1 text-[11px] text-muted">{s.key === "documents" ? "Uploads tracked in your document vault." : "Skipped"}</p>
                        ) : (
                          <p className="mt-1 text-[11px] text-muted">
                            {filled.slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(" · ")}{filled.length > 5 ? ` · +${filled.length - 5} more` : ""}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {errors._save && <p className="mt-3 text-[12px] font-medium text-danger">{errors._save}</p>}

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => step > 0 && setStep(step - 1)}
                  disabled={step === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-ink transition hover:bg-bg2 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex items-center gap-3">
                  {saved && !saving && <span className="text-[11px] text-muted">Saved ✓</span>}
                  {key === "review" ? (
                    <button onClick={submit} disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Submit profile
                    </button>
                  ) : (
                    <button onClick={next} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save & continue <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </SidebarShell>
  );
}
