import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Vertofi — Accounting that Thinks. Predicts. Protects.",
  description:
    "Vertofi is a Predictive Financial Intelligence Platform that helps businesses automate accounting, monitor compliance, detect financial risks, and make better decisions with AI-powered financial intelligence.",
  metadataBase: new URL("https://vertofi.com"),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Vertofi — Predictive Financial Intelligence",
    description:
      "Automate accounting, monitor compliance, detect financial risks, and make better decisions with AI-powered financial intelligence.",
    type: "website",
    url: "https://vertofi.com",
  },
};

/** Organization structured data — helps crawlers/Meta resolve brand + contacts. */
const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Vertofi",
  url: "https://vertofi.com",
  description:
    "Predictive accounting and financial-intelligence platform for Indian businesses — accounting automation, GST, payroll, banking, AI insights and WhatsApp Business communications.",
  email: "info@vertofi.com",
  contactPoint: [
    { "@type": "ContactPoint", email: "info@vertofi.com", contactType: "customer support" },
    { "@type": "ContactPoint", email: "privacy@vertofi.com", contactType: "privacy" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans text-ink antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
        />
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
