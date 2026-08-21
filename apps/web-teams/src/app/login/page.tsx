"use client";
import { PanelLogin } from "@vertofi/ui";

export default function TeamsLoginPage() {
  return (
    <PanelLogin
      accent="teams"
      method="password"
      panelName="Vertofi Teams"
      eyebrow="Articleship · Team Access"
      tagline="View-only access to your assigned companies and files. Flag accounting flaws and stay in sync with your firm."
      bullets={["Assigned companies & files", "Flag accounting flaws", "Secure, scoped access"]}
      identifierLabel="Staff ID or email"
      identifierPlaceholder="staff-id or you@firm.com"
      logo={<img src="/logo.jpg" alt="Vertofi Teams" className="h-full w-full rounded-lg object-contain" />}
      redirectTo="/"
    />
  );
}
