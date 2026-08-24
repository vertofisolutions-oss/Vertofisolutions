"use client";
import { PanelLogin } from "@/ui";

export default function BhsLoginPage() {
  return (
    <PanelLogin
      accent="bhs"
      method="password+otp"
      panelName="Vertofi BHS Intelligence"
      eyebrow="BUSINESS HEALTH INTELLIGENCE"
      tagline="View Business Health Scores for your granted clients, advise the businesses you work with, and act on early signals."
      bullets={["Business Health Scores", "Granted-client access", "Advisory & alerts"]}
      identifierLabel="Email"
      logo={<img src="/logo.jpg" alt="Vertofi BHS Intelligence" className="h-full w-full rounded-lg object-contain" />}
      redirectTo="/bhs-portal"
    />
  );
}

