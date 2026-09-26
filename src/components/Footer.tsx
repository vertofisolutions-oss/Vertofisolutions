"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "All Innovations", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Business Health Score", href: "/features#business-health-score" },
      { label: "MoneyMap Live", href: "/features#moneymap-live" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Blog & Updates", href: "/blog" },
      { label: "Contact Sales", href: "/contact" },
      { label: "Careers", href: "/about#careers" },
    ],
  },
  {
    title: "Legal & Trust",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Security Dossier", href: "/legal/security" },
      { label: "Data Deletion", href: "/legal/data-deletion" },
      { label: "Refund Policy", href: "/legal/refunds" },
      { label: "Contact Compliance", href: "/contact" },
    ],
  },
];

const APP_ROUTES = [
  "/workspace",
  "/dashboard",
  "/associates",
  "/accountants",
  "/bhs-portal",
  "/legal-portal",
  "/teams-portal",
  "/admin",
  "/onboarding",
  "/module",
  "/login",
  "/register",
  "/reset",
  "/reactivate",
  "/subscribe",
];

export function Footer() {
  return null;
}
