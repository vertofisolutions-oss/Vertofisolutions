"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  AuthShell,
  AuthButton,
  Stepper,
  WizardStep,
  useWizard,
  OtpInput,
  PhoneField,
  PasswordField,
  Field,
  TextInput,
  Callout,
  sendPhoneOtp,
  confirmPhoneOtp,
  firebaseConfigured,
  type ConfirmationResult,
} from "@/ui";
import { Search, Loader2, CheckCircle2 } from "lucide-react";
import { api, setTokens, setOrgId, ApiError } from "@/lib/api";
import { DocumentUpload } from "../../components/DocumentUpload";
import { Celebration } from "../../components/Celebration";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const STEPS = ["Mobile", "Verify", "Business", "Setup", "Plan", "Done"];

const PLAN_CARDS = [
  { key: "STARTER", name: "Starter", monthly: 699, blurb: "Solo founders & small businesses" },
  { key: "GROWTH", name: "Growth", monthly: 1999, blurb: "Growing companies & SMEs", popular: true },
  { key: "PRO", name: "Pro", monthly: 4999, blurb: "High-volume operations & firms" },
];

// Annual = 10 months' price (2 months free). Keep in sync with services/billing/plans.ts.
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const RISK_QUESTIONS = [
  { key: "gstNotice", label: "GST notice" },
  { key: "itNotice", label: "Income-Tax notice" },
  { key: "cashflowProblems", label: "Cashflow problems" },
  { key: "pendingGstFilings", label: "Pending GST filings" },
  { key: "vendorDisputes", label: "Vendor disputes" },
  { key: "loanDefaults", label: "Loan defaults" },
];

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function RegisterPage() {
  const router = useRouter();
  const { step, direction, next, back } = useWizard(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // step state
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [code, setCode] = useState("");
  const [orgId, setOrg] = useState<string | null>(null);
  const [plan, setPlan] = useState("GROWTH");
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [legalDocs, setLegalDocs] = useState<{ id: string; doc_type: string; title: string; url: string }[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Load the current T&C / Privacy versions to present for explicit acceptance.
  useEffect(() => {
    api.legalDocuments().then((r) => setLegalDocs(r.documents)).catch(() => {});
  }, []);

  const [biz, setBiz] = useState({ legalName: "", businessType: "PROPRIETORSHIP", industry: "", gstin: "", pan: "", ownerName: "", state: "" });
  const [setup, setSetup] = useState({ bankName: "", ifsc: "", accountNumber: "", revenueRange: "" });
  const [risk, setRisk] = useState<Record<string, boolean>>({});
  const [gstinBusy, setGstinBusy] = useState(false);
  const [gstinNote, setGstinNote] = useState<string | null>(null);

  function fail(e: unknown, fallback: string) {
    setError(e instanceof ApiError ? e.code : fallback);
  }

  /** Map a GST "constitution of business" string onto our business-type options. */
  function mapConstitution(c?: string): string | null {
    if (!c) return null;
    const s = c.toLowerCase();
    if (s.includes("proprietor")) return "PROPRIETORSHIP";
    if (s.includes("limited liability")) return "LLP";
    if (s.includes("partnership")) return "PARTNERSHIP";
    if (s.includes("private")) return "PVT_LTD";
    if (s.includes("public")) return "PVT_LTD";
    return null;
  }

  /** Pull business details from the GST network by GSTIN → autofill the form. */
  async function fetchBizFromGstin() {
    const g = biz.gstin.trim().toUpperCase();
    if (g.length !== 15) { setGstinNote("Enter a 15-character GSTIN."); return; }
    setGstinBusy(true); setGstinNote(null);
    try {
      const p = await api.gst.lookup(g);
      if (!p.structurallyValid) { setGstinNote("That GSTIN doesn't look valid."); return; }
      const bt = mapConstitution(p.constitution);
      setBiz((b) => ({
        ...b,
        gstin: g,
        legalName: p.legalName || p.tradeName || b.legalName,
        pan: p.pan || b.pan,
        businessType: bt ?? b.businessType,
        state: p.address?.state || p.state || b.state,
      }));
      setGstinNote(
        p.source === "GSP"
          ? `Found: ${p.legalName ?? p.tradeName ?? "taxpayer"}${p.status ? ` · ${p.status}` : ""}`
          : `Validated · ${p.state ?? "state"} · PAN ${p.pan ?? "—"}. (Legal name fills automatically once the GSP key is live.)`,
      );
    } catch (e) {
      setGstinNote(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Couldn't reach the GST network.");
    } finally {
      setGstinBusy(false);
    }
  }

  // ── Step 1: mobile + email + password → send phone OTP ──
  // Firebase phone OTP when configured (replaces MSG91/DLT); falls back to the
  // server MSG91 OTP otherwise so the flow keeps working pre-cutover.
  async function startRegister() {
    setBusy(true);
    setError(null);
    try {
      if (firebaseConfigured()) {
        const conf = await sendPhoneOtp(mobile, "recaptcha-container");
        setConfirmation(conf);
      } else {
        // Server-OTP fallback (Firebase not configured): pass the password so
        // it's stored at signup — otherwise the owner can never password-login.
        const { mobileChallengeId } = await api.register(mobile, email, password);
        setChallengeId(mobileChallengeId);
      }
      setCode("");
      next();
    } catch (e) {
      fail(e, "registration_failed");
    } finally {
      setBusy(false);
    }
  }

  // ── Step 2: verify phone OTP → tokens (user is now PENDING_ONBOARDING) ──
  async function verify(otp: string) {
    setBusy(true);
    setError(null);
    try {
      if (confirmation) {
        // Firebase: confirm code → ID token → exchange for Vertofi tokens + set password.
        const idToken = await confirmPhoneOtp(confirmation, otp);
        const { tokens } = await api.firebaseExchange({ idToken, mode: "REGISTER", email, password });
        setTokens(tokens.accessToken, tokens.refreshToken);
      } else {
        const { accessToken, refreshToken } = await api.verifyOtp(challengeId, otp);
        setTokens(accessToken, refreshToken);
      }
      next();
    } catch (e) {
      fail(e, "verification_failed");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  // ── Step 3: business info → create org + link (token now carries org_id) ──
  async function submitBusiness() {
    setBusy(true);
    setError(null);
    try {
      const { id } = await api.createOrg(biz);
      const tokens = await api.linkOrg(id);
      setTokens(tokens.accessToken, tokens.refreshToken);
      setOrgId(id);
      setOrg(id);
      await api.saveStage(id, 1, { ...biz, ownerCompleted: true });
      next();
    } catch (e) {
      fail(e, "business_setup_failed");
    } finally {
      setBusy(false);
    }
  }

  // ── Step 4: financial + intelligence setup ──
  async function submitSetup() {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      await api.saveStage(orgId, 2, { bankName: setup.bankName, ifsc: setup.ifsc, accountNumber: setup.accountNumber });
      await api.saveStage(orgId, 3, { revenueRange: setup.revenueRange });
      await api.saveRiskAnswers(orgId, risk);
      next();
    } catch (e) {
      fail(e, "setup_failed");
    } finally {
      setBusy(false);
    }
  }

  // ── Step 5: plan + autopay mandate → activate (complete onboarding) ──
  async function activate() {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      // Record the legally-auditable acceptance of the exact T&C/Privacy versions
      // the user agreed to (bound to their account; IP + UA captured server-side).
      if (legalDocs.length) {
        try { await api.acceptLegal(legalDocs.map((d) => d.id)); } catch { /* non-fatal; checkbox already gates */ }
      }
      const sub = await api.subscribe(orgId, plan, cycle, {
        legalName: biz.legalName,
        gstin: biz.gstin,
        email,
        phone: mobile,
      });
      const ok = await loadRazorpay();
      const finalize = async () => {
        try {
          await api.completeOnboarding(orgId);
        } catch {
          /* confidence score is best-effort; trial is already live */
        }
        try {
          // Activate the account now that onboarding + autopay are done.
          const t = await api.activate();
          setTokens(t.accessToken, t.refreshToken);
        } catch {
          /* activation is idempotent; safe to retry from dashboard */
        }
        next();
      };
      if (ok && window.Razorpay && sub.keyId) {
        const rzp = new window.Razorpay({
          key: sub.keyId,
          subscription_id: sub.subscriptionId,
          name: "Vertofi",
          description: `${plan} plan · 7-day free trial`,
          theme: { color: "#1378F8" },
          handler: () => void finalize(), // card / UPI-AutoPay mandate authorized
          modal: { ondismiss: () => setBusy(false) },
        });
        rzp.open();
      } else if (sub.shortUrl) {
        window.location.href = sub.shortUrl; // hosted mandate page
      } else {
        await finalize();
      }
    } catch (e) {
      // Payments not configured → the 7-day trial row is already active; proceed.
      if (e instanceof ApiError && (e.code === "payments_not_configured" || e.status === 503)) {
        try {
          if (orgId) await api.completeOnboarding(orgId);
        } catch {
          /* ignore */
        }
        next();
      } else {
        fail(e, "activation_failed");
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Step 6: success ── (fires on the Razorpay mandate response)
  if (step === 5) {
    return (
      <Celebration
        title="Setup successful 🎉"
        subtitle="Welcome to Vertofi! Your trial is live and your WhatsApp CFO is already linked to your registered number — a welcome message is on its way. Say hi and run your business from chat: invoices, cash, GST, everything."
        cta="Enter your dashboard"
        onCta={() => router.push("/dashboard")}
        secondaryCta="💬 Open WhatsApp CFO"
        secondaryHref={`https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER ?? "918712357876"}?text=${encodeURIComponent("hello")}`}
      />
    );
  }

  const heading = [
    "Create your account",
    "Verify your mobile",
    "Tell us about your business",
    "Financial & intelligence setup",
    "Choose a plan & start your trial",
  ][step];
  const sub = [
    "Run your entire business from one place. Takes about 2 minutes.",
    `Enter the 6-digit code sent to +91 ${mobile}.`,
    "This creates your secure Vertofi workspace.",
    "The more we know, the sharper your CFO insights. You can skip uploads for now.",
    "You are not charged today — the first payment is on day 8, and you can cancel anytime.",
  ][step];

  return (
    <AuthShell
      accent="business"
      panelName="Vertofi for Business"
      tagline="Your AI-powered CFO. Invoicing, GST, cashflow, inventory and a 24/7 WhatsApp assistant — in one premium workspace."
      bullets={["Zero data entry — snap a bill, we do the rest", "Real-time Business Health Score", "GST & compliance on autopilot", "Bank-grade security"]}
      eyebrow="Business Owners & Clients"
      logo={<Image src="/logo.jpg" alt="Vertofi" width={36} height={36} className="rounded-lg object-contain" priority />}
      footer={
        <p className="text-center text-xs text-muted">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-brand hover:underline">Sign in</a>
        </p>
      }
    >
      <div className="space-y-7">
        <Stepper steps={STEPS} current={step} accent="business" />

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{heading}</h1>
          <p className="mt-1.5 text-sm text-muted">{sub}</p>
        </div>

        {error && <Callout tone="error">{String(error).replaceAll("_", " ")}</Callout>}

        <WizardStep stepKey={STEPS[step] ?? String(step)} direction={direction}>
          {/* Step 1 — Mobile + email + password */}
          {step === 0 && (
            <div className="space-y-4">
              <PhoneField value={mobile} onChange={setMobile} autoFocus />
              <Field label="Work email">
                <TextInput type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <PasswordField label="Create a password" hint="You'll use this to sign in next time — no OTP needed." value={password} onChange={setPassword} autoComplete="new-password" strength />
              <AuthButton accent="business" busy={busy} busyLabel="Sending code…" disabled={mobile.length !== 10 || !email.includes("@") || password.length < 8} onClick={startRegister}>
                Continue
              </AuthButton>
              {/* Firebase invisible reCAPTCHA mounts here (required for phone auth) */}
              <div id="recaptcha-container" />
            </div>
          )}

          {/* Step 2 — OTP */}
          {step === 1 && (
            <div className="space-y-5">
              <OtpInput value={code} onChange={setCode} onComplete={verify} accent="business" />
              <AuthButton accent="business" busy={busy} busyLabel="Verifying…" disabled={code.length !== 6} onClick={() => verify(code)}>
                Verify & continue
              </AuthButton>
              <button className="w-full text-xs font-semibold text-muted hover:text-ink" onClick={() => { setCode(""); back(); }}>
                ← Change mobile number
              </button>
            </div>
          )}

          {/* Step 3 — Business info */}
          {step === 2 && (
            <div className="space-y-4">
              <Field label="Business legal name">
                <TextInput value={biz.legalName} onChange={(e) => setBiz({ ...biz, legalName: e.target.value })} placeholder="Acme Traders Pvt Ltd" autoFocus />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Business type">
                  <select className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" value={biz.businessType} onChange={(e) => setBiz({ ...biz, businessType: e.target.value })}>
                    <option value="PROPRIETORSHIP">Proprietorship</option>
                    <option value="PARTNERSHIP">Partnership</option>
                    <option value="LLP">LLP</option>
                    <option value="PVT_LTD">Private Limited</option>
                  </select>
                </Field>
                <Field label="Industry">
                  <TextInput value={biz.industry} onChange={(e) => setBiz({ ...biz, industry: e.target.value })} placeholder="Retail, Services…" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="GSTIN (optional)">
                  <div className="flex gap-1.5">
                    <TextInput value={biz.gstin} onChange={(e) => setBiz({ ...biz, gstin: e.target.value.toUpperCase() })} placeholder="29ABCDE1234F2Z5" maxLength={15} />
                    <button type="button" onClick={fetchBizFromGstin} disabled={gstinBusy || biz.gstin.trim().length !== 15} title="Fetch business details from GSTIN" className="shrink-0 grid w-11 place-items-center rounded-xl border border-border text-brand transition hover:bg-brand/5 disabled:opacity-40">
                      {gstinBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="PAN (optional)">
                  <TextInput value={biz.pan} onChange={(e) => setBiz({ ...biz, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" />
                </Field>
              </div>
              {gstinNote && (
                <p className="-mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand" /> {gstinNote}
                </p>
              )}
              <Field label="Owner name">
                <TextInput value={biz.ownerName} onChange={(e) => setBiz({ ...biz, ownerName: e.target.value })} placeholder="Full name" />
              </Field>
              <AuthButton accent="business" busy={busy} busyLabel="Creating workspace…" disabled={biz.legalName.trim().length < 2} onClick={submitBusiness}>
                Continue
              </AuthButton>
            </div>
          )}

          {/* Step 4 — Financial + intelligence setup */}
          {step === 3 && orgId && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bank name"><TextInput value={setup.bankName} onChange={(e) => setSetup({ ...setup, bankName: e.target.value })} /></Field>
                <Field label="IFSC"><TextInput value={setup.ifsc} onChange={(e) => setSetup({ ...setup, ifsc: e.target.value.toUpperCase() })} /></Field>
              </div>
              <Field label="Monthly average revenue">
                <select className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" value={setup.revenueRange} onChange={(e) => setSetup({ ...setup, revenueRange: e.target.value })}>
                  <option value="">Select a range…</option>
                  <option value="UNDER_5L">Under ₹5L</option>
                  <option value="5L_25L">₹5L – ₹25L</option>
                  <option value="25L_1CR">₹25L – ₹1Cr</option>
                  <option value="1CR_PLUS">₹1Cr+</option>
                </select>
              </Field>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Documents (optional)</p>
                <div className="space-y-2">
                  <DocumentUpload orgId={orgId} type="BANK_STATEMENT" label="Last 12 months bank statement" />
                  <DocumentUpload orgId={orgId} type="GST_CERTIFICATE" label="GST certificate" />
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Anything we should watch for?</p>
                <div className="grid grid-cols-2 gap-2">
                  {RISK_QUESTIONS.map((q) => (
                    <label key={q.key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-ink">
                      <input type="checkbox" checked={!!risk[q.key]} onChange={(e) => setRisk({ ...risk, [q.key]: e.target.checked })} />
                      {q.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={back} className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-ink hover:bg-bg2">Back</button>
                <AuthButton accent="business" busy={busy} busyLabel="Saving…" disabled={!setup.revenueRange} onClick={submitSetup}>Continue</AuthButton>
              </div>
            </div>
          )}

          {/* Step 5 — Plan + billing cycle + autopay */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Monthly / Annual toggle */}
              <div className="flex items-center justify-center gap-1 rounded-xl bg-bg2 p-1">
                <button
                  onClick={() => setCycle("MONTHLY")}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${cycle === "MONTHLY" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setCycle("YEARLY")}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${cycle === "YEARLY" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
                >
                  Annual <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">2 MONTHS FREE</span>
                </button>
              </div>

              <div className="grid gap-3">
                {PLAN_CARDS.map((p) => {
                  const yearly = p.monthly * 10;
                  return (
                    <button key={p.key} onClick={() => setPlan(p.key)} className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition ${plan === p.key ? "border-brand bg-brand-50" : "border-border hover:border-brand/40"}`}>
                      <div>
                        <p className="text-sm font-semibold text-ink">{p.name}{p.popular && <span className="ml-2 rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-bold text-gold">POPULAR</span>}</p>
                        <p className="text-xs text-muted">{p.blurb}</p>
                      </div>
                      <div className="text-right">
                        {cycle === "MONTHLY" ? (
                          <p className="text-lg font-bold text-ink">{inr(p.monthly)}<span className="text-xs font-normal text-muted">/mo</span></p>
                        ) : (
                          <>
                            <p className="text-lg font-bold text-ink">{inr(yearly)}<span className="text-xs font-normal text-muted">/yr</span></p>
                            <p className="text-[11px] text-emerald-700">{inr(p.monthly * 12)} <span className="line-through opacity-60">if monthly</span></p>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explicit, auditable T&C / Privacy acceptance — required to proceed. */}
              <label className="flex items-start gap-2.5 rounded-xl border border-border bg-bg2 px-4 py-3 text-xs leading-relaxed text-muted">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#1378F8]"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span>
                  I have read and accept the{" "}
                  {legalDocs.map((d, i) => (
                    <span key={d.id}>
                      <a href={d.url || "#"} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">{d.title}</a>
                      {i < legalDocs.length - 1 ? " and " : ""}
                    </span>
                  ))}
                  {legalDocs.length === 0 && <span className="font-semibold text-brand">Terms &amp; Conditions and Privacy Policy</span>}.
                </span>
              </label>

              <AuthButton accent="business" busy={busy} busyLabel="Opening secure checkout…" disabled={!acceptedTerms} onClick={activate}>
                Set up autopay & start free trial
              </AuthButton>
              <p className="text-center text-[11px] leading-relaxed text-muted">
                7-day free trial, then {cycle === "YEARLY" ? "billed annually" : "billed monthly"} via UPI AutoPay or card. + GST.
                A mandate authorisation may show a ₹0/₹1 verification that is refunded. Per RBI rules you get a
                24-hour notice before each renewal. Cancel anytime. Secured by Razorpay.
              </p>
            </div>
          )}
        </WizardStep>
      </div>
    </AuthShell>
  );
}
