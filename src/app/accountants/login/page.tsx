"use client";
import { PanelLogin } from "@/ui";

export default function AccountantsLoginPage() {
  return (
    <PanelLogin
      accent="accountants"
      method="password+otp"
      panelName="Accountant Panel"
      eyebrow="ACCOUNTANT TEAMS"
      tagline="The associate's accounts team. View your associate's clients, review the books and flag issues for approval."
      bullets={["Review assigned client books", "Flag accounting issues", "Secure, scoped access"]}
      identifierLabel="Email"
      logo={<img src="/logo.jpg" alt="Accountant Panel" className="h-full w-full rounded-lg object-contain" />}
      redirectTo="/accountants"
    />
  );
}

