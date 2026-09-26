const fs = require('fs');

const kpiComponent = `
function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: "gold" | "brand" }) {
  return (
    <Card className="py-3 px-4 mb-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
        <Icon className={"h-4 w-4 " + (tone === "gold" ? "text-gold" : "text-brand")} />
      </div>
      <p className="mt-1 text-xl font-bold tracking-tight text-ink">{value}</p>
    </Card>
  );
}
`;

function processView(filename, exportName, kpiLogicStr, kpiUIStr) {
    const paths = [
        "apps/web-landing/src/components/" + filename,
        "src/components/" + filename
    ];

    paths.forEach(filePath => {
        if (!fs.existsSync(filePath)) return;
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Add icons if missing
        if (!content.includes('TrendingUp')) {
            content = content.replace('import { Plus,', 'import { Plus, Receipt, ShieldCheck, AlertTriangle, TrendingUp,');
        }
        
        // Insert KPI component
        if (!content.includes('function Kpi(')) {
            content = content.replace("export function " + exportName, kpiComponent + "\\nexport function " + exportName);
        }

        // Insert KPI logic
        if (!content.includes('const kpis = useMemo(')) {
            content = content.replace('const filteredRows = useMemo(', kpiLogicStr + '\\n  const filteredRows = useMemo(');
        }

        // Insert KPI UI
        if (!content.includes('grid grid-cols-2 gap-3 lg:grid-cols-4')) {
            content = content.replace('<div className="w-full space-y-4">', '<div className="w-full space-y-4">\\n' + kpiUIStr);
        }

        fs.writeFileSync(filePath, content);
        console.log("Updated " + filePath);
    });
}

const cnLogic = `
  const kpis = useMemo(() => {
    const now = new Date();
    const ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    let monthCount = 0, totalAmt = 0, gstAmt = 0, pendingCount = 0;
    for (const r of rows) {
      const t = Number(r.total || r.amount || 0);
      totalAmt += t;
      if (String(r.date || "").startsWith(ym)) monthCount++;
      if (String(r.status || "").toUpperCase() === "PENDING") pendingCount++;
      gstAmt += Number(r.tax || r.totalTax || 0);
    }
    return { monthCount, totalAmt, pendingCount, gstAmt };
  }, [rows]);
`;
const cnUI = `
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="NOTES THIS MONTH" value={String(kpis.monthCount)} icon={TrendingUp} tone="brand" />
        <Kpi label="TOTAL REFUNDED" value={inr(kpis.totalAmt)} icon={Receipt} tone="brand" />
        <Kpi label="GST REVERSED" value={inr(kpis.gstAmt)} icon={ShieldCheck} tone="gold" />
        <Kpi label="PENDING REFUNDS" value={String(kpis.pendingCount)} icon={AlertTriangle} tone="brand" />
      </div>
`;
processView('CreditNotesView.tsx', 'CreditNotesView', cnLogic, cnUI);

const dnLogic = `
  const kpis = useMemo(() => {
    const now = new Date();
    const ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    let monthCount = 0, totalAmt = 0, gstAmt = 0, pendingCount = 0;
    for (const r of rows) {
      const t = Number(r.total || r.amount || 0);
      totalAmt += t;
      if (String(r.date || "").startsWith(ym)) monthCount++;
      if (String(r.status || "").toUpperCase() === "PENDING") pendingCount++;
      gstAmt += Number(r.tax || r.totalTax || 0);
    }
    return { monthCount, totalAmt, pendingCount, gstAmt };
  }, [rows]);
`;
const dnUI = `
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="NOTES THIS MONTH" value={String(kpis.monthCount)} icon={TrendingUp} tone="brand" />
        <Kpi label="TOTAL DEBITED" value={inr(kpis.totalAmt)} icon={Receipt} tone="brand" />
        <Kpi label="GST REVERSED" value={inr(kpis.gstAmt)} icon={ShieldCheck} tone="gold" />
        <Kpi label="PENDING DEBITS" value={String(kpis.pendingCount)} icon={AlertTriangle} tone="brand" />
      </div>
`;
processView('DebitNotesView.tsx', 'DebitNotesView', dnLogic, dnUI);

const dcLogic = `
  const kpis = useMemo(() => {
    const now = new Date();
    const ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    let monthCount = 0, totalAmt = 0, deliveredCount = 0, transitCount = 0;
    for (const r of rows) {
      const t = Number(r.total || r.amount || 0);
      totalAmt += t;
      if (String(r.date || "").startsWith(ym)) monthCount++;
      const s = String(r.status || "").toUpperCase();
      if (s === "DELIVERED") deliveredCount++;
      else if (s === "IN TRANSIT" || s === "ISSUED") transitCount++;
    }
    return { monthCount, totalAmt, deliveredCount, transitCount };
  }, [rows]);
`;
const dcUI = `
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="CHALLANS THIS MONTH" value={String(kpis.monthCount)} icon={TrendingUp} tone="brand" />
        <Kpi label="TOTAL VALUE" value={inr(kpis.totalAmt)} icon={Receipt} tone="brand" />
        <Kpi label="IN TRANSIT" value={String(kpis.transitCount)} icon={AlertTriangle} tone="gold" />
        <Kpi label="DELIVERED" value={String(kpis.deliveredCount)} icon={ShieldCheck} tone="brand" />
      </div>
`;
processView('DeliveryChallansView.tsx', 'DeliveryChallansView', dcLogic, dcUI);
