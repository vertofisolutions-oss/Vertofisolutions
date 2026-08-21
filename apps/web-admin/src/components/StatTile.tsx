export function StatTile({ label, value, hint, tone = "ink" }: { label: string; value: React.ReactNode; hint?: string; tone?: "ink" | "brand" | "gold" | "danger" }) {
  const color = tone === "brand" ? "text-brand" : tone === "gold" ? "text-gold" : tone === "danger" ? "text-danger" : "text-ink";
  return (
    <div className="rounded-2xl border border-borderCard bg-white p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
