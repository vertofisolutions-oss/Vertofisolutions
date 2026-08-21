"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// ─── panel-specific config injected at build time ───────────────────────────
export interface PanelConfig {
  /** Display name shown in the header */
  name: string;
  /** Short tagline below the name */
  tagline: string;
  /** Left-panel accent gradient (Tailwind-safe inline style) */
  accentFrom: string;
  accentTo: string;
  /** Logo path (in /public) */
  logo: string;
  /** URL slug used in the left panel's decorative feature list */
  features: string[];
  /** Audience badge text */
  badge: string;
}

// ─── shared auth helpers ─────────────────────────────────────────────────────
function saveTokens(access: string, refresh: string) {
  localStorage.setItem("vertofi.access", access);
  localStorage.setItem("vertofi.refresh", refresh);
  // also set a lightweight cookie so the middleware can detect a session
  document.cookie = "vertofi.session=1; path=/; max-age=86400; SameSite=Lax";
}

class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function sendOtpRequest(mobile: string) {
  const res = await fetch(`${BASE}/auth/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel: "MOBILE", destination: mobile, purpose: "LOGIN" }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new ApiError(res.status, b?.errors?.[0]?.code ?? b?.message ?? `http_${res.status}`);
  }
  return res.json() as Promise<{ challengeId: string }>;
}

async function verifyOtpRequest(challengeId: string, code: string) {
  const res = await fetch(`${BASE}/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId, code }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new ApiError(res.status, b?.errors?.[0]?.code ?? b?.message ?? `http_${res.status}`);
  }
  return res.json() as Promise<{ accessToken: string; refreshToken: string }>;
}

// ─── Two-panel Login UI ───────────────────────────────────────────────────────
export function TwoPanelLogin({ config }: { config: PanelConfig }) {
  const router = useRouter();
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSendOtp() {
    setError(null);
    setBusy(true);
    try {
      const { challengeId } = await sendOtpRequest(mobile);
      setChallengeId(challengeId);
      setStep("otp");
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed to send OTP. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setBusy(true);
    try {
      const { accessToken, refreshToken } = await verifyOtpRequest(challengeId, code);
      saveTokens(accessToken, refreshToken);
      router.push("/");
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Verification failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Left accent panel ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(145deg, ${config.accentFrom}, ${config.accentTo})` }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10" style={{ background: "rgba(255,255,255,0.3)" }} />
        <div className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] rounded-full opacity-10" style={{ background: "rgba(255,255,255,0.2)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5" style={{ background: "white" }} />

        {/* Logo + name */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <img src={config.logo} alt={config.name} className="w-7 h-7 object-contain rounded-lg" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Vertofi</span>
          </div>
          <span className="text-white/60 text-xs font-medium uppercase tracking-widest ml-1">{config.badge}</span>
        </div>

        {/* Hero content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-3">{config.name}</h1>
            <p className="text-white/75 text-base leading-relaxed max-w-sm">{config.tagline}</p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {config.features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-white/85 text-sm font-medium">
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

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-white/40 text-xs font-medium">© {new Date().getFullYear()} Vertofi Technologies. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right login panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
        {/* Mobile header (only shows on mobile) */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <img src={config.logo} alt={config.name} className="w-8 h-8 object-contain rounded-lg" />
          <span className="font-bold text-slate-800">{config.name}</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Application URL badge */}
          <div className="mb-8 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase">
              {typeof window !== "undefined" ? window.location.hostname : ""}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {step === "mobile" ? "Sign in to your account" : "Enter verification code"}
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            {step === "mobile"
              ? "Enter your registered mobile number to continue."
              : `We sent a 6-digit code to +91 ${mobile}.`}
          </p>

          {step === "mobile" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Mobile Number
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 font-bold select-none">
                    +91
                  </div>
                  <input
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 font-semibold text-base outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                    placeholder="10-digit mobile"
                    inputMode="numeric"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && mobile.length === 10 && !busy && handleSendOtp()}
                    autoFocus
                  />
                </div>
              </div>

              {error && <ErrorBanner message={error} />}

              <button
                onClick={handleSendOtp}
                disabled={busy || mobile.length !== 10}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(135deg, ${config.accentFrom}, ${config.accentTo})` }}
              >
                {busy ? "Sending OTP…" : "Continue →"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">
                  6-Digit Code
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-3xl tracking-[0.6em] text-slate-900 font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                  placeholder="──────"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && code.length === 6 && !busy && handleVerify()}
                  autoFocus
                />
              </div>

              {error && <ErrorBanner message={error} />}

              <button
                onClick={handleVerify}
                disabled={busy || code.length !== 6}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(135deg, ${config.accentFrom}, ${config.accentTo})` }}
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

          <p className="text-center text-xs text-slate-300 mt-10 font-medium tracking-wider uppercase">
            Secured by Vertofi Intelligence
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
      <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="text-xs font-semibold text-red-600">{message}</p>
    </div>
  );
}
