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

function processPurchasesView(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add icons if missing
    if (!content.includes('TrendingUp')) {
        content = content.replace('import { Plus,', 'import { Plus, Receipt, ShieldCheck, AlertTriangle, TrendingUp,');
    }
    
    // Insert KPI component
    if (!content.includes('function Kpi(')) {
        content = content.replace('export function PurchasesView', kpiComponent + '\nexport function PurchasesView');
    }

    // Insert KPI logic
    const kpiLogic = `
  const kpis = useMemo(() => {
    const now = new Date();
    const ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    let monthPurchases = 0, total = 0, unpaidCount = 0, unpaidAmt = 0, localGst = 0;
    for (const r of rows) {
      const t = Number(r.total || r.amount || 0);
      total += t;
      if (String(r.date || "").startsWith(ym)) monthPurchases += t;
      if (String(r.status || "").toUpperCase() !== "PAID") { unpaidCount++; unpaidAmt += t; }
      localGst += Number(r.tax || r.totalTax || 0);
    }
    return { monthPurchases, total, unpaidCount, unpaidAmt, localGst };
  }, [rows]);
`;
    if (!content.includes('const kpis = useMemo(')) {
        content = content.replace('const filteredRows = useMemo(', kpiLogic + '\n  const filteredRows = useMemo(');
    }

    // Insert KPI UI
    const kpiUI = `
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="PURCHASES THIS MONTH" value={inr(kpis.monthPurchases)} icon={TrendingUp} tone="brand" />
        <Kpi label="TOTAL PURCHASED" value={inr(kpis.total)} icon={Receipt} tone="brand" />
        <Kpi label="GST PAID" value={inr(kpis.localGst)} icon={ShieldCheck} tone="gold" />
        <Kpi label="UNPAID BILLS" value={kpis.unpaidCount + " · " + inr(kpis.unpaidAmt)} icon={AlertTriangle} tone="brand" />
      </div>
`;
    if (!content.includes('PURCHASES THIS MONTH')) {
        content = content.replace('<div className="w-full space-y-4">', '<div className="w-full space-y-4">\n' + kpiUI);
    }

    fs.writeFileSync(filePath, content);
    console.log("Updated " + filePath);
}

processPurchasesView('apps/web-landing/src/components/PurchasesView.tsx');
processPurchasesView('src/components/PurchasesView.tsx');

function processProformaView(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add icons if missing
    if (!content.includes('TrendingUp')) {
        content = content.replace('import { Plus,', 'import { Plus, Receipt, ShieldCheck, AlertTriangle, TrendingUp,');
    }
    
    // Insert KPI component
    if (!content.includes('function Kpi(')) {
        content = content.replace('export function ProformaInvoicesView', kpiComponent + '\nexport function ProformaInvoicesView');
    }

    // Insert KPI logic
    const kpiLogic = `
  const kpis = useMemo(() => {
    const now = new Date();
    const ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    let monthProformas = 0, total = 0, convertedCount = 0, localGst = 0;
    for (const r of rows) {
      const t = Number(r.total || r.amount || 0);
      total += t;
      if (String(r.date || "").startsWith(ym)) monthProformas += t;
      if (String(r.status || "").toUpperCase() === "ACCEPTED" || String(r.status || "").toUpperCase() === "CONVERTED") convertedCount++;
      localGst += Number(r.tax || r.totalTax || 0);
    }
    return { monthProformas, total, convertedCount, localGst };
  }, [rows]);
`;
    if (!content.includes('const kpis = useMemo(')) {
        content = content.replace('const filteredRows = useMemo(', kpiLogic + '\n  const filteredRows = useMemo(');
    }

    // Insert KPI UI
    const kpiUI = `
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="PROFORMAS THIS MONTH" value={inr(kpis.monthProformas)} icon={TrendingUp} tone="brand" />
        <Kpi label="TOTAL ESTIMATED" value={inr(kpis.total)} icon={Receipt} tone="brand" />
        <Kpi label="GST AMOUNT" value={inr(kpis.localGst)} icon={ShieldCheck} tone="gold" />
        <Kpi label="CONVERTED TO SALES" value={String(kpis.convertedCount)} icon={AlertTriangle} tone="brand" />
      </div>
`;
    if (!content.includes('PROFORMAS THIS MONTH')) {
        content = content.replace('<div className="w-full space-y-4">', '<div className="w-full space-y-4">\n' + kpiUI);
    }

    fs.writeFileSync(filePath, content);
    console.log("Updated " + filePath);
}

processProformaView('apps/web-landing/src/components/ProformaInvoicesView.tsx');
processProformaView('src/components/ProformaInvoicesView.tsx');
