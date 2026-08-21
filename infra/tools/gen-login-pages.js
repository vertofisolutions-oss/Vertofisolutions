const fs = require("fs");

const BASE_API = `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"`;

function makePage({ name, tagline, accentFrom, accentTo, logo, badge, features }) {
  return `"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// ── helpers ─────────────────────────────────────────────────────────────────
function saveTokens(access: string, refresh: string) {
  localStorage.setItem("vertofi.access", access);
  localStorage.setItem("vertofi.refresh", refresh);
  document.cookie = "vertofi.session=1; path=/; max-age=86400; SameSite=Lax";
}

class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

const BASE = ${BASE_API};

async function sendOtpReq(mobile: string) {
  const res = await fetch(\`\${BASE}/auth/otp/send\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel: "MOBILE", destination: mobile, purpose: "LOGIN" }),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, b?.errors?.[0]?.code ?? b?.message ?? \`http_\${res.status}\`);
  return b as { challengeId: string };
}

async function verifyOtpReq(challengeId: string, code: string) {
  const res = await fetch(\`\${BASE}/auth/otp/verify\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId, code }),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, b?.errors?.[0]?.code ?? b?.message ?? \`http_\${res.status}\`);
  return b as { accessToken: string; refreshToken: string };
}

// ── component ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSendOtp() {
    setError(null); setBusy(true);
    try {
      const { challengeId } = await sendOtpReq(mobile);
      setChallengeId(challengeId);
      setStep("otp");
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed to send OTP. Please try again.");
    } finally { setBusy(false); }
  }

  async function handleVerify() {
    setError(null); setBusy(true);
    try {
      const { accessToken, refreshToken } = await verifyOtpReq(challengeId, code);
      saveTokens(accessToken, refreshToken);
      router.push("/");
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Verification failed. Please try again.");
    } finally { setBusy(false); }
  }

  const features = ${JSON.stringify(features)};

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Left accent panel */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, ${accentFrom}, ${accentTo})" }}
      >
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <img src="${logo}" alt="${name}" className="w-7 h-7 object-contain rounded-lg" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Vertofi</span>
          </div>
          <span className="text-white/50 text-xs font-semibold uppercase tracking-widest ml-1">${badge}</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-[2.2rem] font-bold text-white leading-tight mb-3">${name}</h1>
            <p className="text-white/70 text-[0.95rem] leading-relaxed max-w-[22rem]">${tagline}</p>
          </div>
          <ul className="space-y-3.5">
            {features.map((f: string) => (
              <li key={f} className="flex items-center gap-3 text-white/80 text-sm font-medium">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <p className="text-white/30 text-xs">© {new Date().getFullYear()} Vertofi Technologies. All rights reserved.</p>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <img src="${logo}" alt="${name}" className="w-8 h-8 object-contain rounded-lg" />
          <span className="font-bold text-slate-800">${name}</span>
        </div>

        <div className="w-full max-w-[22rem]">
          <div className="mb-8 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[0.65rem] font-bold text-slate-400 tracking-[0.15em] uppercase">
              {typeof window !== "undefined" ? window.location.hostname : "${name.toLowerCase().replace(/ /g, "")}"}
            </span>
          </div>

          <h2 className="text-[1.6rem] font-bold text-slate-900 mb-1.5">
            {step === "mobile" ? "Sign in" : "Enter your code"}
          </h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            {step === "mobile"
              ? "Enter your registered mobile number to receive a one-time code."
              : \`We sent a 6-digit code to +91 \${mobile}.\`}
          </p>

          {step === "mobile" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[0.7rem] font-bold text-slate-400 uppercase tracking-[0.12em] mb-2">Mobile Number</label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 font-bold select-none">
                    +91
                  </div>
                  <input
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 font-semibold text-base outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                    placeholder="10-digit mobile"
                    inputMode="numeric"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\\D/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && mobile.length === 10 && !busy && handleSendOtp()}
                    autoFocus
                  />
                </div>
              </div>
              {error && <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3"><svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg><p className="text-xs font-semibold text-red-600">{error}</p></div>}
              <button
                onClick={handleSendOtp}
                disabled={busy || mobile.length !== 10}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, ${accentFrom}, ${accentTo})" }}
              >
                {busy ? "Sending OTP…" : "Continue →"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-[0.7rem] font-bold text-slate-400 uppercase tracking-[0.12em] mb-2 text-center">6-Digit Code</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-3xl tracking-[0.6em] text-slate-900 font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:tracking-normal placeholder:text-slate-300"
                  placeholder="──────"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && code.length === 6 && !busy && handleVerify()}
                  autoFocus
                />
              </div>
              {error && <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3"><svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg><p className="text-xs font-semibold text-red-600">{error}</p></div>}
              <button
                onClick={handleVerify}
                disabled={busy || code.length !== 6}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, ${accentFrom}, ${accentTo})" }}
              >
                {busy ? "Verifying…" : "Secure Login →"}
              </button>
              <button
                onClick={() => { setStep("mobile"); setCode(""); setError(null); }}
                className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors py-2 font-semibold"
              >
                ← Change mobile number
              </button>
            </div>
          )}

          <p className="text-center text-[0.65rem] text-slate-300 mt-10 font-semibold tracking-[0.15em] uppercase">
            Secured by Vertofi Intelligence
          </p>
        </div>
      </div>
    </div>
  );
}
`;
}

const panels = [
  {
    app: "web-associates",
    cfg: {
      name: "Vertofi for Associates",
      tagline: "Your unified professional workspace — manage client books, exceptions, reconciliation and compliance all in one secured panel.",
      accentFrom: "#1D4ED8",
      accentTo: "#4F46E5",
      logo: "/logo-associates.jpg",
      badge: "Professional Services",
      features: [
        "Manage your entire client portfolio",
        "Flag & resolve financial exceptions",
        "Real-time bank reconciliation",
        "Register and manage your accountants",
        "Business Health Scores for every client",
      ],
    }
  },
  {
    app: "web-accountants",
    cfg: {
      name: "Accountant Panel",
      tagline: "Your dedicated accounting workspace — access client ledgers, transactions, and compliance tasks assigned by your associate.",
      accentFrom: "#0891B2",
      accentTo: "#0D9488",
      logo: "/logo-accountants.jpg",
      badge: "Accounting Teams",
      features: [
        "Access assigned client ledgers",
        "Review and resolve exception queues",
        "Real-time bank reconciliation",
        "GST filing & compliance tasks",
        "Collaborate with your associate",
      ],
    }
  },
  {
    app: "web-bhs",
    cfg: {
      name: "BHS Intelligence",
      tagline: "Monitor and analyze Business Health Scores across your entire portfolio with deep financial intelligence.",
      accentFrom: "#7C3AED",
      accentTo: "#DB2777",
      logo: "/logo-bhs.jpg",
      badge: "BHS Intelligence",
      features: [
        "Portfolio-wide BHS monitoring",
        "Financial risk heat maps",
        "Predictive cashflow analytics",
        "Benchmark against industry peers",
        "Real-time alerts & notifications",
      ],
    }
  },
  {
    app: "web-legal",
    cfg: {
      name: "Vertofi Legal",
      tagline: "Your secure legal workspace — manage cases, review contracts, and track compliance for your business clients.",
      accentFrom: "#92400E",
      accentTo: "#B45309",
      logo: "/logo-legal.jpg",
      badge: "Legal Services",
      features: [
        "Manage client legal cases",
        "AI-powered notice analysis",
        "Compliance deadline tracking",
        "Secure document management",
        "Escalation & SOS case handling",
      ],
    }
  },
  {
    app: "web-teams",
    cfg: {
      name: "Vertofi Teams",
      tagline: "Internal operations portal for Vertofi staff — manage support queues, escalations, and platform health.",
      accentFrom: "#0F172A",
      accentTo: "#1E3A5F",
      logo: "/logo-teams.jpg",
      badge: "Internal Operations",
      features: [
        "Support & escalation queue management",
        "Platform health monitoring",
        "Client onboarding assistance",
        "Cross-team collaboration",
        "Internal reporting & audit access",
      ],
    }
  },
  {
    app: "web-admin",
    cfg: {
      name: "Admin Console",
      tagline: "Restricted access. Platform governance, audit trail, risk management, and compliance for Vertofi internal staff only.",
      accentFrom: "#111827",
      accentTo: "#991B1B",
      logo: "/logo.jpg",
      badge: "Internal · Admin Only",
      features: [
        "Platform governance & controls",
        "User and access management",
        "Financial Black Box audit trail",
        "Risk monitoring & compliance",
        "System health & observability",
      ],
    }
  },
];

panels.forEach(({ app, cfg }) => {
  const dest = `apps/${app}/src/app/login/page.tsx`;
  fs.writeFileSync(dest, makePage(cfg));
  console.log(`✓ ${app}`);
});
