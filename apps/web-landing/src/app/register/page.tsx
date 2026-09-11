"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import emailjs from "@emailjs/browser";
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
  { key: "FREE", name: "Free Tier", monthly: 0, annual: 0, outcome: "Understand", blurb: "Pre-revenue testing · 1 User · 1 GSTIN · 100 txns/mo · Basic Health Score", badge: "FREE FOREVER" },
  { key: "STARTER", name: "Starter", monthly: 499, annual: 4999, outcome: "Automate", blurb: "Up to ₹40L turnover · 2 Users · 50 bills/mo · 500 txns/mo · WhatsApp & GST sync" },
  { key: "GROWTH", name: "Growth", monthly: 1499, annual: 14999, outcome: "Predict", blurb: "₹40L–₹2Cr turnover · 5 Users · 250 bills/mo · AI Advisor, ProfitLeak & 90-day cashflow", popular: true },
  { key: "SCALE", name: "Scale", monthly: 3999, annual: 39999, outcome: "Control", blurb: "₹2Cr–₹15Cr turnover · 15 Users · 1,000 bills/mo · Multi-branch & Scenario planning" },
  { key: "ENTERPRISE", name: "Enterprise", monthly: 10000, annual: 100000, isCustom: true, outcome: "Scale", blurb: "₹15Cr+ turnover · Unlimited Users · Custom ERP, SAP & dedicated SLA" },
];


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

function formatExpiryTime(expiryTimestampMs: number): string {
  return new Date(expiryTimestampMs).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function RegisterPage() {
  const router = useRouter();
  const { step, direction, next, back } = useWizard(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State — Preserved across all steps
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lastOtpEmail, setLastOtpEmail] = useState("");
  const [activeOtp, setActiveOtp] = useState("");
  const [otpExpiry, setOtpExpiry] = useState<number>(0);
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);

  const [orgId, setOrg] = useState<string | null>(null);
  const [plan, setPlan] = useState("FREE");
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [legalDocs, setLegalDocs] = useState<{ id: string; doc_type: string; title: string; url: string }[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    try {
      emailjs.init({ publicKey: "k6dPl0xrK8jGqSFqZ" });
    } catch { /* ignore */ }
    api.legalDocuments().then((r) => setLegalDocs(Array.isArray(r?.documents) ? r.documents : [])).catch(() => setLegalDocs([]));
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const [biz, setBiz] = useState({ legalName: "", businessType: "PROPRIETORSHIP", industry: "", gstin: "", pan: "", ownerName: "", state: "" });
  const [setup, setSetup] = useState({ bankName: "", ifsc: "", accountNumber: "", revenueRange: "" });
  const [risk, setRisk] = useState<Record<string, boolean>>({});
  const [gstinBusy, setGstinBusy] = useState(false);
  const [gstinNote, setGstinNote] = useState<string | null>(null);

  function fail(e: unknown, fallback: string) {
    setError(e instanceof ApiError ? e.code : e instanceof Error ? e.message : fallback);
  }

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
          : `Validated · ${p.state ?? "state"} · PAN ${p.pan ?? "—"}.`,
      );
    } catch (e) {
      setGstinNote(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Couldn't reach the GST network.");
    } finally {
      setGstinBusy(false);
    }
  }

  // ── Step 1: Validate fields, generate 6-digit OTP, send via EmailJS SDK & move to Step 2 ──
  async function startRegister(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setError(null);

    // 1. Mobile validation
    if (!mobile || mobile.trim().length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    // 2. Email validation
    if (!email || !email.includes("@") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid work email address.");
      return;
    }
    // 3. Password validation
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    // Check if mobile or email is already registered locally or on server
    const targetMobile = mobile.trim();
    const targetEmail = email.trim().toLowerCase();

    // 1. Client-side registry check
    try {
      if (typeof window !== "undefined") {
        const storedUsersRaw = localStorage.getItem("vertofi_registered_users");
        const storedUsers: { mobile?: string; email?: string }[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
        const existingMobile = localStorage.getItem("vertofi_user_mobile");
        const existingEmail = localStorage.getItem("vertofi_user_email");

        const isMobileRegistered =
          (existingMobile && existingMobile.trim() === targetMobile) ||
          storedUsers.some((u) => u.mobile && u.mobile.trim() === targetMobile);

        if (isMobileRegistered) {
          setError("This mobile number is already registered. Please sign in instead.");
          return;
        }

        const isEmailRegistered =
          (existingEmail && existingEmail.trim().toLowerCase() === targetEmail) ||
          storedUsers.some((u) => u.email && u.email.trim().toLowerCase() === targetEmail);

        if (isEmailRegistered) {
          setError("This work email is already registered. Please sign in instead.");
          return;
        }
      }
    } catch { /* ignore */ }

    setBusy(true);
    try {
      // 2. Server-side duplicate check
      const checkRes = await api.checkUser(targetMobile, targetEmail).catch(() => ({ exists: false, message: "" }));
      if (checkRes && checkRes.exists) {
        setError(checkRes.message || "This mobile number or email is already registered. Please sign in instead.");
        setBusy(false);
        return;
      }

      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiryMs = Date.now() + 15 * 60 * 1000;
      const formattedTimeStr = formatExpiryTime(expiryMs);

      // Send OTP via EmailJS Browser SDK
      try {
        const emailRes = await emailjs.send(
          "service_2xm0ybg",
          "template_rw96vxv",
          {
            email: targetEmail,
            passcode: generatedOtp,
            time: formattedTimeStr,
          },
          {
            publicKey: "k6dPl0xrK8jGqSFqZ",
          }
        );
        console.log("[EmailJS Success Response]:", emailRes?.status, emailRes?.text);
      } catch (emailJsErr: unknown) {
        const errObj = emailJsErr as { status?: number; text?: string };
        console.warn("[EmailJS Dispatch Notice]:", errObj?.status, errObj?.text || String(emailJsErr));
      }

      // Also register challenge with server API
      try {
        const res = await api.sendOtp("EMAIL", targetEmail, "EMAIL_VERIFICATION");
        if (res?.challengeId) setChallengeId(res.challengeId);
      } catch {
        setChallengeId(`chal_${Date.now()}`);
      }

      setActiveOtp(generatedOtp);
      setOtpExpiry(expiryMs);
      setLastOtpEmail(targetEmail);
      setResendCooldown(60);
      setAttemptCount(0);
      setCode("");
      next(); // Move to Step 2: Verify screen
    } catch (err) {
      console.warn(err);
      setError("Unable to send verification code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // ── Step 2 Resend OTP via EmailJS ──
  async function handleResendOtp(e?: React.MouseEvent) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (resendCooldown > 0 || !email) return;
    setBusy(true);
    setError(null);
    try {
      const targetEmail = email.trim();
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiryMs = Date.now() + 15 * 60 * 1000;
      const formattedTimeStr = formatExpiryTime(expiryMs);

      try {
        const emailRes = await emailjs.send(
          "service_2xm0ybg",
          "template_rw96vxv",
          {
            email: targetEmail,
            passcode: generatedOtp,
            time: formattedTimeStr,
          },
          {
            publicKey: "k6dPl0xrK8jGqSFqZ",
          }
        );
        console.log("[EmailJS Resend Success Response]:", emailRes?.status, emailRes?.text);
      } catch (emailJsErr: unknown) {
        const errObj = emailJsErr as { status?: number; text?: string };
        console.warn("[EmailJS Resend Notice]:", errObj?.status, errObj?.text || String(emailJsErr));
      }

      setActiveOtp(generatedOtp);
      setOtpExpiry(expiryMs);
      setResendCooldown(60);
      setAttemptCount(0);
      setCode("");
    } catch (e) {
      fail(e, "Unable to resend verification code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // ── Step 2: Verify OTP code ──
  async function verify(submittedOtp: string) {
    const cleanOtp = submittedOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    // 1. Check if OTP has expired (15 minutes)
    if (otpExpiry > 0 && Date.now() > otpExpiry) {
      setError("This verification code has expired. Please request a new code.");
      return;
    }

    // 2. Check maximum 5 incorrect attempts
    if (attemptCount >= 5) {
      setError("Too many incorrect attempts. Please request a new verification code.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      let isVerified = false;

      // Local active OTP check (from EmailJS dispatch)
      if (activeOtp && cleanOtp === activeOtp) {
        isVerified = true;
      } else {
        // Fallback to server API verification
        try {
          const res = await api.verifyOtp(challengeId || email.trim(), cleanOtp, "EMAIL_VERIFICATION");
          if (res && (res.verified || res.accessToken)) {
            isVerified = true;
            if (res.accessToken) setTokens(res.accessToken, res.refreshToken);
          }
        } catch {
          /* fail server fallback */
        }
      }

      if (!isVerified) {
        const newAttempts = attemptCount + 1;
        setAttemptCount(newAttempts);
        if (newAttempts >= 5) {
          setActiveOtp("");
          setError("Too many incorrect attempts. Please request a new verification code.");
        } else {
          setError("Invalid verification code. Please try again.");
        }
        setCode("");
        return;
      }

      // Successful verification
      const cleanMobile = mobile.trim();
      const cleanEmail = email.trim().toLowerCase();
      try {
        if (typeof window !== "undefined") {
          const storedUsersRaw = localStorage.getItem("vertofi_registered_users");
          const storedUsers: { mobile?: string; email?: string; registeredAt?: string }[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
          if (!storedUsers.some((u) => u.mobile === cleanMobile || u.email === cleanEmail)) {
            storedUsers.push({ mobile: cleanMobile, email: cleanEmail, registeredAt: new Date().toISOString() });
            localStorage.setItem("vertofi_registered_users", JSON.stringify(storedUsers));
          }
        }
        api.recordUser(cleanMobile, cleanEmail).catch(() => {});
      } catch { /* ignore */ }

      const mockPayload = { sub: email, role: "BUSINESS_OWNER", orgId: `org-${Date.now()}` };
      const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + btoa(JSON.stringify(mockPayload)) + ".mocksignature";
      setTokens(mockToken, "mock-refresh-token");

      next(); // Step 2 -> Step 3: Business
    } catch (e) {
      fail(e, "Invalid verification code. Please try again.");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  // ── Step 3: Business info → Create Org ──
  async function submitBusiness() {
    setBusy(true);
    setError(null);
    try {
      let id = `org_${Date.now()}`;
      try {
        const res = await api.createOrg(biz);
        if (res?.id) id = res.id;
        try {
          const tokens = await api.linkOrg(id);
          if (tokens?.accessToken) setTokens(tokens.accessToken, tokens.refreshToken);
        } catch { /* ignore */ }
        try {
          await api.saveStage(id, 1, { ...biz, ownerCompleted: true });
        } catch { /* ignore */ }
      } catch (err) {
        console.warn("[Register] API createOrg offline or 500, using local workspace fallback:", err);
      }
      setOrgId(id);
      setOrg(id);
      if (typeof window !== "undefined") {
        const finalName = (biz.ownerName || biz.legalName || (email ? email.split("@")[0] : "Business Owner")).trim();
        localStorage.setItem("vertofi_user_name", finalName);
        if (email) localStorage.setItem("vertofi_user_email", email.trim().toLowerCase());
        if (mobile) localStorage.setItem("vertofi_user_mobile", mobile.trim());
        if (biz.state) localStorage.setItem("vertofi_user_state", biz.state);
        localStorage.setItem("vertofi_business_profile", JSON.stringify({
          name: finalName,
          email: email.trim().toLowerCase(),
          mobile: mobile.trim(),
          altMobile: "",
          aadhaar: "",
          country: "INDIA",
          state: biz.state || "",
          city: "",
          postalCode: "",
          address: "",
          legalName: biz.legalName || finalName,
          tradeName: (biz as any).tradeName || biz.legalName || finalName,
          gstin: biz.gstin || "",
          pan: biz.pan || "",
        }));

        api.recordUser(mobile.trim(), email.trim().toLowerCase(), { name: finalName, orgId: id, plan: "FREE" } as any).catch(() => {});
      }
      next();
    } catch (e) {
      next();
    } finally {
      setBusy(false);
    }
  }

  // ── Step 4: Setup info ──
  async function submitSetup() {
    setBusy(true);
    setError(null);
    try {
      if (orgId) {
        try {
          await api.saveStage(orgId, 2, { bankName: setup.bankName, ifsc: setup.ifsc, accountNumber: setup.accountNumber });
          await api.saveStage(orgId, 3, { revenueRange: setup.revenueRange });
          await api.saveRiskAnswers(orgId, risk);
        } catch { /* ignore */ }
      }
      if (typeof window !== "undefined") {
        const planDerived = setup.revenueRange === "15CR_PLUS"
          ? "ENTERPRISE"
          : setup.revenueRange === "2CR_15CR"
          ? "SCALE"
          : setup.revenueRange === "40L_2CR"
          ? "GROWTH"
          : setup.revenueRange === "UNDER_40L"
          ? "STARTER"
          : "FREE";
        localStorage.setItem("vertofi.plan", planDerived);
        localStorage.setItem("vertofi_user_plan", planDerived);
        localStorage.setItem("vertofi_business_turnover", setup.revenueRange);
        setPlan(planDerived);

        // Initialize primary owner in team accounts
        const ownerMember = {
          id: `usr-owner-${Date.now()}`,
          name: (biz.ownerName || biz.legalName || (email ? email.split("@")[0] : "Business Owner")).trim(),
          email: email.trim().toLowerCase(),
          mobile: mobile.trim(),
          role: "OWNER",
          status: "ACTIVE",
          addedAt: "Primary Account",
        };
        localStorage.setItem("vertofi_team_accounts", JSON.stringify([ownerMember]));
        window.dispatchEvent(new Event("vertofi:users-changed"));
      }
      next();
    } catch (e) {
      next();
    } finally {
      setBusy(false);
    }
  }


  // ── Step 5: Activate ──
  async function activate() {
    setBusy(true);
    setError(null);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("vertofi.plan", plan);
        localStorage.setItem("vertofi_user_plan", plan);
        localStorage.setItem("vertofi_billing_cycle", cycle);
        try {
          const profileRaw = localStorage.getItem("vertofi_business_profile");
          const p = profileRaw ? JSON.parse(profileRaw) : {};
          p.plan = plan;
          localStorage.setItem("vertofi_business_profile", JSON.stringify(p));
        } catch {}
        window.dispatchEvent(new Event("vertofi:plan-changed"));
      }

      if (orgId) {
        if (legalDocs.length) {
          try { await api.acceptLegal(legalDocs.map((d) => d.id)); } catch { /* ignore */ }
        }

        try {
          await api.recordUser(mobile.trim(), email.trim().toLowerCase(), {
            name: (biz.ownerName || biz.legalName || "User").trim(),
            orgId,
            plan,
          } as any);
        } catch { /* ignore */ }

        if (plan === "FREE") {
          try { await api.subscribe(orgId, "FREE", cycle, { legalName: biz.legalName, gstin: biz.gstin, email, phone: mobile }); } catch { /* ignore */ }
          try { await api.completeOnboarding(orgId); } catch { /* ignore */ }
          next();
          return;
        }

        try {
          const sub = await api.subscribe(orgId, plan, cycle, { legalName: biz.legalName, gstin: biz.gstin, email, phone: mobile });
          const ok = await loadRazorpay();
          const finalize = async () => {
            try { await api.completeOnboarding(orgId); } catch { /* ignore */ }
            try {
              const t = await api.activate();
              if (t?.accessToken) setTokens(t.accessToken, t.refreshToken);
            } catch { /* ignore */ }
            next();
          };
          if (ok && window.Razorpay && sub.keyId) {
            const rzp = new window.Razorpay({
              key: sub.keyId,
              subscription_id: sub.subscriptionId,
              name: "Vertofi",
              description: `${plan} plan · 7-day free trial`,
              theme: { color: "#1378F8" },
              handler: () => void finalize(),
              modal: { ondismiss: () => setBusy(false) },
            });
            rzp.open();
            return;
          } else if (sub.shortUrl) {
            window.location.href = sub.shortUrl;
            return;
          }
        } catch { /* ignore */ }
      }
      try { if (orgId) await api.completeOnboarding(orgId); } catch { /* ignore */ }
      next();
    } catch (e) {
      next();
    } finally {
      setBusy(false);
    }
  }

  // ── Step 6: Success Done ──
  if (step === 5) {
    return (
      <Celebration
        title="Setup successful 🎉"
        subtitle="Welcome to Vertofi! Your trial is live and your WhatsApp CFO is already linked to your registered number."
        cta="Enter your dashboard"
        onCta={() => router.push(`/dashboard?plan=${plan.toLowerCase()}`)}
        secondaryCta="💬 Open WhatsApp CFO"
        secondaryHref={`https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER ?? "918712357876"}?text=${encodeURIComponent("hello")}`}
      />
    );
  }

  const heading = [
    "Create your account",
    "Verify your email",
    "Tell us about your business",
    "Financial & intelligence setup",
    "Choose a plan & start your trial",
  ][step];

  const sub = [
    "Run your entire business from one place. Takes about 2 minutes.",
    "Enter the 6-digit verification code sent to your work email.",
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
          {/* Step 1 — Mobile + Work Email + Password */}
          {step === 0 && (
            <div className="space-y-4">
              <PhoneField value={mobile} onChange={setMobile} autoFocus />
              <Field label="Work email">
                <TextInput
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <PasswordField
                label="Create a password"
                hint="At least 8 characters."
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                strength
              />

              <div className="flex items-center gap-2 rounded-xl border border-blue-200/80 bg-blue-50/60 p-3 text-xs text-blue-900">
                <span className="text-base">✉️</span>
                <span>We'll send a 6-digit verification code to your work email.</span>
              </div>

              <AuthButton
                type="button"
                accent="business"
                busy={busy}
                busyLabel="Sending Code..."
                disabled={busy}
                onClick={startRegister}
              >
                Send Verification Code
              </AuthButton>
            </div>
          )}

          {/* Step 2 — Verify Email OTP */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-slate-50/80 p-4 text-center">
                <p className="text-xs text-muted">We sent a verification code to</p>
                <p className="mt-1 text-sm font-bold text-ink">{email}</p>
              </div>

              <OtpInput value={code} onChange={setCode} onComplete={verify} accent="business" autoFocus />

              <AuthButton
                type="button"
                accent="business"
                busy={busy}
                busyLabel="Verifying..."
                disabled={code.length !== 6}
                onClick={() => verify(code)}
              >
                Verify Code
              </AuthButton>

              <div className="flex flex-col items-center gap-2 pt-2 border-t border-border">
                <p className="text-xs text-muted">Didn't receive the code?</p>
                {resendCooldown > 0 ? (
                  <span className="text-xs font-medium text-slate-500">
                    Resend code in <strong className="text-ink">{resendCooldown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleResendOtp}
                    className="text-xs font-bold text-brand hover:underline disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                )}
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-muted hover:text-ink"
                  onClick={() => { setError(null); setCode(""); back(); }}
                >
                  ← Change email address
                </button>
              </div>
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
              <Field label="Annual Business Turnover">
                <select className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 font-medium" value={setup.revenueRange} onChange={(e) => setSetup({ ...setup, revenueRange: e.target.value })}>
                  <option value="">Select your annual turnover…</option>
                  <option value="PRE_REVENUE">Pre-revenue / Testing (Free Plan Recommended)</option>
                  <option value="UNDER_40L">Up to ₹40 Lakhs (Starter Plan Recommended)</option>
                  <option value="40L_2CR">₹40 Lakhs – ₹2 Crore (Growth Plan Recommended ★)</option>
                  <option value="2CR_15CR">₹2 Crore – ₹15 Crore (Scale Plan Recommended)</option>
                  <option value="15CR_PLUS">Above ₹15 Crore (Enterprise Plan Recommended)</option>
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
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPlan(p.key)}
                      className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition cursor-pointer ${
                        plan === p.key ? "border-brand bg-brand-50 shadow-xs" : "border-border hover:border-brand/40"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-ink">{p.name}</p>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-bold text-slate-700 uppercase">
                            {p.outcome}
                          </span>
                          {p.popular && (
                            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9.5px] font-extrabold text-white uppercase">
                              ★ POPULAR
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">{p.blurb}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                         {p.monthly === 0 ? (
                          <p className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">₹0 Free Forever</p>
                        ) : p.isCustom ? (
                          <p className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">Custom Pricing</p>
                        ) : cycle === "MONTHLY" ? (
                          <p className="text-base font-bold text-ink">{inr(p.monthly)}<span className="text-xs font-normal text-muted">/mo</span></p>
                        ) : (
                          <>
                            <p className="text-base font-bold text-ink">{inr(p.annual)}<span className="text-xs font-normal text-muted">/yr</span></p>
                            <p className="text-[10.5px] text-emerald-700 font-medium">({inr(Math.round(p.annual / 12))}/mo equiv)</p>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>


              <label className="flex items-start gap-2.5 rounded-xl border border-border bg-bg2 px-4 py-3 text-xs leading-relaxed text-muted">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#1378F8]"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span>
                  I have read and accept the{" "}
                  {Array.isArray(legalDocs) && legalDocs.length > 0 ? (
                    legalDocs.map((d, i) => (
                      <span key={d.id}>
                        <a href={d.url || "#"} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">{d.title}</a>
                        {i < legalDocs.length - 1 ? " and " : ""}
                      </span>
                    ))
                  ) : (
                    <span className="font-semibold text-brand">Terms &amp; Conditions and Privacy Policy</span>
                  )}.
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
