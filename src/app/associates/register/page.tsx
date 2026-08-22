"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, AuthButton, Field, TextInput, PasswordField, Callout, Stepper } from "@/ui";
import { CheckCircle2, Upload, Loader2, FileCheck2, ShieldCheck, Clock } from "lucide-react";
import { api, ApiError } from "@/lib/panel-api";
import { setTokens } from "@/lib/auth";

type ReqDoc = { type: string; label: string; required: boolean };
type DocState = { uploading?: boolean; documentId?: string; filename?: string; error?: string };

const TYPES = [
  { v: "CA", l: "Chartered Accountant (CA)" },
  { v: "CMA", l: "Cost & Management Accountant (CMA)" },
  { v: "CS", l: "Company Secretary (CS)" },
  { v: "CPA", l: "Certified Public Accountant (CPA)" },
  { v: "ACCA", l: "ACCA" },
  { v: "CFA", l: "CFA" },
];

export default function ProfessionalRegister() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 credentials, 1 documents, 2 done
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    professionalType: "CA", fullName: "", mobile: "", email: "", password: "",
    membershipNo: "", copNo: "", firmName: "", firmRegistrationNo: "", yearsExperience: "",
    specializations: "", officeAddress: "", city: "", state: "", pincode: "",
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [reqDocs, setReqDocs] = useState<ReqDoc[]>([]);
  const [docState, setDocState] = useState<Record<string, DocState>>({});
  const [storageOff, setStorageOff] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.requiredDocs(form.professionalType).then(setReqDocs).catch(() => setReqDocs([]));
  }, [form.professionalType]);

  function validCreds(): string | null {
    if (form.fullName.trim().length < 2) return "Enter your full name.";
    if (!/^[6-9]\d{9}$/.test(form.mobile)) return "Enter a valid 10-digit mobile number.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Enter a valid email.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (form.membershipNo.trim().length < 2) return "Enter your membership number.";
    return null;
  }

  async function submitCreds() {
    const v = validCreds();
    if (v) { setError(v); return; }
    setBusy(true); setError(null);
    try {
      const res = await api.registerProfessional({
        ...form,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
        specializations: form.specializations ? form.specializations.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      });
      setTokens(res.tokens.accessToken, res.tokens.refreshToken);
      setUserId(res.userId);
      setPublicId(res.publicId);
      setStep(1);
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadDoc(type: string, file: File) {
    setDocState((s) => ({ ...s, [type]: { uploading: true } }));
    try {
      const { documentId, uploadUrl } = await api.kycPresign(type, file.name, file.type || "application/octet-stream");
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!put.ok) throw new Error("upload_failed");
      await api.kycCommit(documentId);
      setDocState((s) => ({ ...s, [type]: { documentId, filename: file.name } }));
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "upload_failed";
      if (code === "storage_not_configured") setStorageOff(true);
      setDocState((s) => ({ ...s, [type]: { error: code.replaceAll("_", " ") } }));
    }
  }

  async function finish() {
    setBusy(true); setError(null);
    try {
      const documents = reqDocs
        .filter((d) => docState[d.type]?.documentId)
        .map((d) => ({ type: d.type, filename: docState[d.type]!.filename!, documentId: docState[d.type]!.documentId!, status: "UPLOADED" }));
      if (documents.length) await api.updateProfessionalProfile({ documents });
      setStep(2);
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      accent="associates"
      panelName="Vertofi for Associates"
      eyebrow="Join as a professional"
      tagline="Register as a CA, CMA, CS, CPA, ACCA or CFA. Once verified, business owners can assign you and you get read-write access to their books."
      bullets={["Verified professional profile", "Assigned by clients via your Vertofi ID", "Build your accountant sub-team"]}
      logo={<img src="/logo.jpg" alt="Vertofi for Associates" className="h-full w-full rounded-lg object-contain" />}
    >
      <div className="mx-auto w-full max-w-md">
        <Stepper steps={["Your details", "Documents", "Done"]} current={step} accent="associates" className="mb-6" />

        {step === 0 && (
          <div className="space-y-4">
            <Field label="Professional type">
              <select className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand" value={form.professionalType} onChange={(e) => set("professionalType", e.target.value)}>
                {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </Field>
            <Field label="Full name"><TextInput value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="As on your membership certificate" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mobile"><TextInput value={form.mobile} onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))} placeholder="10-digit" maxLength={10} inputMode="numeric" /></Field>
              <Field label="Email"><TextInput type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@firm.com" /></Field>
            </div>
            <PasswordField label="Password" hint="At least 8 characters" strength value={form.password} onChange={(v) => set("password", v)} placeholder="Create a password" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Membership no."><TextInput value={form.membershipNo} onChange={(e) => set("membershipNo", e.target.value)} placeholder="ICAI/ICMAI/ICSI no." /></Field>
              <Field label="COP no. (optional)"><TextInput value={form.copNo} onChange={(e) => set("copNo", e.target.value)} placeholder="Certificate of Practice" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Firm name (optional)"><TextInput value={form.firmName} onChange={(e) => set("firmName", e.target.value)} placeholder="If practising in a firm" /></Field>
              <Field label="Years of experience (optional)"><TextInput value={form.yearsExperience} onChange={(e) => set("yearsExperience", e.target.value.replace(/\D/g, ""))} placeholder="e.g. 8" inputMode="numeric" /></Field>
            </div>
            <Field label="Specializations (optional)" hint="Comma-separated, e.g. GST, Audit, Tax">
              <TextInput value={form.specializations} onChange={(e) => set("specializations", e.target.value)} placeholder="GST, Audit, Income Tax" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="City"><TextInput value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
              <Field label="State"><TextInput value={form.state} onChange={(e) => set("state", e.target.value)} /></Field>
              <Field label="Pincode"><TextInput value={form.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} maxLength={6} inputMode="numeric" /></Field>
            </div>
            {error && <Callout tone="error">{error}</Callout>}
            <AuthButton accent="associates" busy={busy} busyLabel="Creating your profileâ€¦" onClick={submitCreds}>Continue</AuthButton>
            <p className="text-center text-xs text-muted">Already registered? <a href="/login" className="font-semibold text-brand">Sign in</a></p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Callout tone="info">
              Upload your statutory documents so our team can verify you. {publicId && <>Your Vertofi ID is <b>{publicId}</b> â€” share it with clients to be assigned.</>}
            </Callout>
            {storageOff && (
              <Callout tone="info">Secure document upload isn&apos;t enabled yet. You can finish now â€” our team will request these documents during verification.</Callout>
            )}
            <div className="space-y-2.5">
              {reqDocs.map((d) => {
                const st = docState[d.type] ?? {};
                return (
                  <div key={d.type} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{d.label}{d.required && <span className="text-danger"> *</span>}</p>
                      {st.documentId ? (
                        <p className="flex items-center gap-1 text-xs text-emerald-600"><FileCheck2 className="h-3.5 w-3.5" /> {st.filename}</p>
                      ) : st.error ? (
                        <p className="text-xs text-danger">{st.error}</p>
                      ) : (
                        <p className="text-xs text-muted">PDF, JPG or PNG</p>
                      )}
                    </div>
                    <label className="shrink-0 cursor-pointer">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${st.documentId ? "border-emerald-200 text-emerald-700" : "border-border text-ink hover:border-brand"}`}>
                        {st.uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : st.documentId ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                        {st.documentId ? "Replace" : "Upload"}
                      </span>
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadDoc(d.type, f); }} disabled={st.uploading} />
                    </label>
                  </div>
                );
              })}
            </div>
            {error && <Callout tone="error">{error}</Callout>}
            <AuthButton accent="associates" busy={busy} busyLabel="Savingâ€¦" onClick={finish}>Submit for verification</AuthButton>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><ShieldCheck className="h-8 w-8" /></div>
            <div>
              <h2 className="text-xl font-bold text-ink">Registration submitted</h2>
              <p className="mt-2 text-sm text-muted">Our team will verify your credentials. You&apos;ll be able to sign in and accept client assignments once verified.</p>
            </div>
            {publicId && (
              <div className="rounded-xl border border-border bg-bg2 px-4 py-3 text-sm">
                <span className="text-muted">Your Vertofi ID</span>
                <p className="mt-0.5 text-lg font-bold tracking-tight text-ink">{publicId}</p>
                <p className="mt-1 text-xs text-muted">Share this with business owners so they can assign you.</p>
              </div>
            )}
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted"><Clock className="h-3.5 w-3.5" /> Verification is usually completed within 1â€“2 business days.</p>
            <AuthButton accent="associates" onClick={() => router.replace("/login")}>Go to sign in</AuthButton>
          </div>
        )}
      </div>
    </AuthShell>
  );
}

