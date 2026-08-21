"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, setTokens, ApiError } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendOtp() {
    setError(null);
    setBusy(true);
    try {
      const { challengeId } = await api.sendOtp("MOBILE", mobile, "LOGIN");
      setChallengeId(challengeId);
      setStep("otp");
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "failed_to_send_otp");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setError(null);
    setBusy(true);
    try {
      const { accessToken, refreshToken } = await api.verifyOtp(challengeId, code);
      setTokens(accessToken, refreshToken);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "verification_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)" }}
    >
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-400/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />

      <div className="w-full max-w-[440px] relative z-10">
        <div className="backdrop-blur-2xl bg-white/70 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(37,99,235,0.15)] border border-white overflow-hidden transition-all duration-500 hover:shadow-[0_20px_60px_-10px_rgba(37,99,235,0.2)]">
          {/* Top Header Area */}
          <div className="px-10 pt-12 pb-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-3 mb-6 transform transition-transform hover:scale-105 duration-300">
              <Image
                src="/APP_LOGO"
                alt="APP_TITLE"
                width={80}
                height={80}
                className="w-full h-full object-contain rounded-xl"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">APP_TITLE</h1>
            <p className="text-slate-500 font-medium text-sm mt-2">
              {step === "mobile" ? "APP_SUBTITLE" : `Enter the verification code sent to ${mobile}`}
            </p>
          </div>

          {/* Form Body */}
          <div className="px-10 pb-12 space-y-6">
            {step === "mobile" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1">
                    Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-4 rounded-2xl border-2 border-slate-100 bg-white text-sm text-slate-500 font-bold shadow-sm">
                      +91
                    </div>
                    <input
                      className="flex-1 w-full rounded-2xl border-2 border-slate-100 bg-white/50 px-5 py-3.5 text-slate-900 font-semibold text-lg outline-none focus:border-blue-500 focus:bg-white transition-all duration-300 shadow-sm placeholder:text-slate-300 placeholder:font-medium"
                      placeholder="Enter 10 digits"
                      inputMode="numeric"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>
                <button
                  onClick={sendOtp}
                  disabled={busy || mobile.length !== 10}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.4)] transition-all hover:shadow-[0_12px_25px_-6px_rgba(37,99,235,0.5)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {busy ? "Sending…" : "Continue"}
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1 text-center">
                    6-Digit Code
                  </label>
                  <input
                    className="w-full rounded-2xl border-2 border-slate-100 bg-white/50 px-4 py-4 text-center text-3xl tracking-[0.5em] text-slate-900 font-bold outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    placeholder="••••••"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                  />
                </div>
                <button
                  onClick={verify}
                  disabled={busy || code.length !== 6}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.4)] transition-all hover:shadow-[0_12px_25px_-6px_rgba(37,99,235,0.5)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {busy ? "Verifying…" : "Secure Login"}
                </button>
                <button
                  className="w-full text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors py-2"
                  onClick={() => { setStep("mobile"); setCode(""); }}
                >
                  Change mobile number
                </button>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-4 animate-in fade-in zoom-in-95">
                <p className="text-xs font-semibold text-red-600 text-center flex items-center justify-center gap-2">
                  <ShieldAlertIcon className="w-4 h-4" />
                  {error.replaceAll("_", " ")}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <p className="text-center text-xs font-semibold text-slate-400 mt-8 tracking-wide">
          SECURED BY VERTOFI INTELLIGENCE
        </p>
      </div>
    </main>
  );
}

function ShieldAlertIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-2 7-2s5 1 7 2a1 1 0 0 1 1 1v7z"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
