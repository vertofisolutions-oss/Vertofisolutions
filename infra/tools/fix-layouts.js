const fs = require("fs");

const layouts = [
  { app: "web-associates", title: "Vertofi for Associates", desc: "Professional panel for CA, CMA, CPA, CS, ACCA and CFA." },
  { app: "web-accountants", title: "Accountant Panel — Vertofi", desc: "Accounting team workspace — ledgers, exceptions, and compliance tasks." },
  { app: "web-bhs", title: "BHS Intelligence — Vertofi", desc: "Business Health Score intelligence portal." },
  { app: "web-legal", title: "Vertofi Legal Services", desc: "Secure legal workspace for lawyers and legal teams." },
  { app: "web-teams", title: "Vertofi Teams — Internal", desc: "Internal operations portal for Vertofi staff." },
  { app: "web-admin", title: "Vertofi Admin Console", desc: "Restricted internal admin console for platform governance." },
];

layouts.forEach(({ app, title, desc }) => {
  const p = `apps/${app}/src/app/layout.tsx`;
  let c = fs.readFileSync(p, "utf8");
  c = c.replace(/title: ".*?"/, `title: "${title}"`);
  c = c.replace(/description: ".*?"/, `description: "${desc}"`);
  fs.writeFileSync(p, c);
  console.log("✓ " + app);
});
