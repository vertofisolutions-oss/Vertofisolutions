"use client";
import { PanelLogin } from "@vertofi/ui";

export default function LegalLoginPage() {
  return (
    <PanelLogin
      accent="legal"
      method="password+otp"
      panelName="Vertofi for Legal Services"
      eyebrow="Legal Services"
      tagline="For lawyers handling client matters. Access all cases and the legal AI analytics that speed up your work."
      bullets={["All assigned cases", "Legal AI analytics", "Secure document access"]}
      identifierLabel="Email"
      logo={<img src="/logo.jpg" alt="Vertofi for Legal Services" className="h-full w-full rounded-lg object-contain" />}
      redirectTo="/"
    />
  );
}
