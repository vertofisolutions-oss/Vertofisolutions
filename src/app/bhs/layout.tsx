import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BHS Score Assessment — Vertofi",
  description:
    "Measure your real-time Business Credit & Financial Health Score using our pure mathematical engine.",
};

export default function BHSLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
