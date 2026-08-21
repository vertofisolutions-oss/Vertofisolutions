import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vertofi — Your Business Brain",
  description: "Vertofi for Business — real-time financial intelligence for your MSME.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg2 text-ink antialiased">{children}</body>
    </html>
  );
}

// Trigger rebuild
