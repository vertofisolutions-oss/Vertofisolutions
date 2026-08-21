"use client";
import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";

const SALES_EMAIL = "info@vertofi.com";

export function ContactForm() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", company: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const valid = form.firstName && form.lastName && form.email.includes("@") && form.company;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError("Please complete the required fields with a valid work email.");
      return;
    }
    setError(null);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://api.vertofi.com/api/v1"}/onboarding/landing-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch (err) {
      setError("Failed to submit request. Please try again or email us directly.");
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-borderCard bg-white p-10 text-center shadow-card">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h3 className="text-lg font-semibold text-ink">Your email is ready to send.</h3>
        <p className="max-w-sm text-sm text-muted">
          Your request has been securely submitted. Our team will review your details and reach out shortly to schedule a demo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-borderCard bg-white p-8 shadow-card">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name">
          <input className="vf-input" placeholder="Anika" value={form.firstName} onChange={set("firstName")} />
        </Field>
        <Field label="Last name">
          <input className="vf-input" placeholder="Mehta" value={form.lastName} onChange={set("lastName")} />
        </Field>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Work email">
          <input className="vf-input" type="email" placeholder="anika@company.com" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Company">
          <input className="vf-input" placeholder="Northline Apparel" value={form.company} onChange={set("company")} />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="How can we help?">
          <textarea
            className="vf-input min-h-[120px] resize-y"
            placeholder="Tell us a bit about your business..."
            value={form.message}
            onChange={set("message")}
          />
        </Field>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <button
        type="submit"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
        disabled={!valid}
      >
        Book a demo <Send className="h-4 w-4" />
      </button>

      <style>{`.vf-input{width:100%;border:1px solid #E5E7EB;border-radius:12px;padding:10px 14px;font-size:14px;color:#0F172A;outline:none;background:#fff}.vf-input::placeholder{color:#94A3B8}.vf-input:focus{border-color:#1378F8;box-shadow:0 0 0 3px rgba(19,120,248,.12)}`}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
