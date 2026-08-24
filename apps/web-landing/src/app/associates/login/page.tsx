"use client";
import { PanelLogin } from "@/ui";

export default function AssociatesLoginPage() {
  return (
    <PanelLogin
      accent="associates"
      method="password+otp"
      panelName="Vertofi for Associates"
      eyebrow="For Professionals"
      tagline="For CA, CMA, CPA, CS, ACCA & CFA professionals. Read-write access to your assigned clients and your accountant team."
      bullets={["Manage assigned clients", "Create an accountant sub-team", "Client documents & compliance"]}
      identifierLabel="Email"
      logo={<img src="/logo.jpg" alt="Vertofi for Associates" className="h-full w-full rounded-lg object-contain" />}
      redirectTo="/associates"
      footer={<p className="text-center text-xs text-muted">New here? <a href="/associates/register" className="font-semibold text-brand">Register as a professional</a></p>}
    />
  );
}

