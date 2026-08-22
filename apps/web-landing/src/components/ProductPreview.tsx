import { cn } from "@/ui";
import { Activity, Radar, AlarmClock, SearchCheck, BrainCircuit, Boxes, LifeBuoy, RefreshCw, type LucideIcon } from "lucide-react";
import { BHS_DIMENSIONS } from "../lib/site";

type State = "connect" | "empty" | "waiting" | "ready";

const STATE_META: Record<State, { label: string; dot: string; text: string }> = {
  connect: { label: "Connect to begin", dot: "bg-brand", text: "text-brand" },
  empty: { label: "No data connected yet", dot: "bg-slate-400", text: "text-muted" },
  waiting: { label: "Waiting for sync", dot: "bg-gold", text: "text-gold" },
  ready: { label: "Ready for analysis", dot: "bg-emerald-500", text: "text-emerald-600" },
};

export function StatusPill({ state }: { state: State }) {
  const m = STATE_META[state];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg2 px-2.5 py-1 text-[11px] font-medium">
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      <span className={m.text}>{m.label}</span>
    </span>
  );
}

/** A window-chrome frame for product showcases. */
export function BrowserFrame({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-white shadow-soft", className)}>
      <div className="flex items-center gap-2 border-b border-border bg-bg2 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-slate-300" />
        <span className="h-3 w-3 rounded-full bg-slate-300" />
        <span className="h-3 w-3 rounded-full bg-slate-300" />
        <span className="ml-3 inline-flex items-center rounded-md border border-border bg-white px-2 py-0.5 text-[11px] text-muted">
          business.vertofi.com
        </span>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

function ModuleShell({
  icon: Icon,
  title,
  state,
  children,
}: {
  icon: LucideIcon;
  title: string;
  state: State;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-borderCard bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand">
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-ink">{title}</span>
        </div>
        <StatusPill state={state} />
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** Business Health Score — shows the 7-dimension framework, NO numeric score. */
export function BhsPreview() {
  return (
    <ModuleShell icon={Activity} title="Business Health Score" state="connect">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tracking-tight text-slate-300">—</span>
        <span className="text-xs text-muted">/ 100 · connect data to generate</span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2">
        {BHS_DIMENSIONS.slice(0, 4).map((d) => (
          <div key={d.name} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-[11px] text-muted">{d.name}</span>
            <span className="h-1.5 flex-1 rounded-full bg-bg2">
              <span className="block h-full w-1/4 rounded-full bg-slate-200" />
            </span>
          </div>
        ))}
      </div>
    </ModuleShell>
  );
}

export function MoneyMapPreview() {
  return (
    <ModuleShell icon={Radar} title="MoneyMap Live" state="empty">
      <div className="grid h-28 place-items-center rounded-lg border border-dashed border-border bg-bg2 text-center">
        <div>
          <p className="text-xs font-medium text-ink">No data connected yet</p>
          <p className="mt-0.5 text-[11px] text-muted">Inflow, outflow and leak zones appear here.</p>
        </div>
      </div>
    </ModuleShell>
  );
}

export function TaxPreview() {
  return (
    <ModuleShell icon={AlarmClock} title="Predictive Tax Warning" state="waiting">
      <div className="rounded-lg border border-border bg-bg2 px-3 py-3">
        <p className="text-xs font-medium text-ink">Waiting for GST synchronization</p>
        <p className="mt-1 text-[11px] text-muted">Forecasts activate once GST data is connected.</p>
      </div>
    </ModuleShell>
  );
}

export function ProfitLeakPreview() {
  return (
    <ModuleShell icon={SearchCheck} title="ProfitLeak Finder" state="ready">
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <span className="text-[11px] text-muted">Duplicate payments</span>
          <span className="text-[11px] font-medium text-ink">Ready to scan</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <span className="text-[11px] text-muted">Subscription waste</span>
          <span className="text-[11px] font-medium text-ink">Ready to scan</span>
        </div>
      </div>
    </ModuleShell>
  );
}

export function VbdPreview() {
  return (
    <ModuleShell icon={BrainCircuit} title="Virtual Business Director" state="connect">
      <div className="rounded-lg border border-dashed border-border bg-bg2 px-3 py-4 text-center">
        <p className="text-xs font-medium text-ink">Connect your accounting system</p>
        <p className="mt-1 text-[11px] text-muted">Simulate hiring, loans and expansion decisions.</p>
      </div>
    </ModuleShell>
  );
}

/** The hero dashboard composition. */
export function HeroShowcase() {
  return (
    <BrowserFrame>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BhsPreview />
        <MoneyMapPreview />
        <TaxPreview />
        <ProfitLeakPreview />
      </div>
    </BrowserFrame>
  );
}

/** Modules used in the Product Experience section. */
export const EXPERIENCE_MODULES = [
  { icon: Activity, title: "Business Health Score", state: "connect" as State, caption: "A 0–100 score across 7 dimensions of financial health." },
  { icon: AlarmClock, title: "Predictive Tax Warnings", state: "waiting" as State, caption: "Forecast GST and tax exposure before deadlines." },
  { icon: SearchCheck, title: "ProfitLeak Finder", state: "ready" as State, caption: "Detect duplicate payments and silent overspend." },
  { icon: Radar, title: "MoneyMap Live", state: "empty" as State, caption: "Real-time inflow, outflow and profit/leak zones." },
  { icon: RefreshCw, title: "Invisible Accounting", state: "connect" as State, caption: "Bank, GST, POS and payroll auto-reconciled." },
  { icon: BrainCircuit, title: "Virtual Business Director", state: "connect" as State, caption: "Simulate decisions before you commit." },
  { icon: Boxes, title: "Financial Black Box", state: "ready" as State, caption: "Full audit trail of every financial change." },
  { icon: LifeBuoy, title: "Business Lifeguard", state: "ready" as State, caption: "Emergency response for notices and disputes." },
];

export function ExperienceModule({
  icon,
  title,
  state,
  caption,
}: {
  icon: LucideIcon;
  title: string;
  state: State;
  caption: string;
}) {
  return (
    <ModuleShell icon={icon} title={title} state={state}>
      <p className="text-xs leading-relaxed text-muted">{caption}</p>
    </ModuleShell>
  );
}
