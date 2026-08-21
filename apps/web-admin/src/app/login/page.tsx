"use client";
import { PanelLogin } from "@vertofi/ui";

export default function AdminLoginPage() {
  return (
    <PanelLogin
      accent="admin"
      method="password+otp"
      panelName="Admin Console"
      eyebrow="Internal · Admin Only"
      tagline="Restricted access. Platform governance, audit trail, risk management and compliance for Vertofi internal staff."
      bullets={[
        "Platform governance & controls",
        "User and access management",
        "Financial Black Box audit trail",
        "Risk monitoring & compliance",
      ]}
      identifierLabel="Email"
      logo={<img src="/logo.jpg" alt="Admin Console" className="h-full w-full rounded-lg object-contain" />}
      redirectTo="/"
    />
  );
}
