const fs = require('fs');

const paths = [
  'apps/web-landing/src/components/SalesView.tsx',
  'src/components/SalesView.tsx'
];

paths.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Imports
  if (!content.includes('MoreHorizontal')) {
      content = content.replace('Trash2', 'Trash2, MoreHorizontal, Eye, RefreshCw, Mail, XCircle, Download');
  }

  // 2. States & Effects
  if (!content.includes('openDropdownId')) {
      const hooksStr = `
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  function handleDownload(r: Record<string, unknown>) {
    setPreviewingInvoice(r);
    setTimeout(() => {
      const el = document.getElementById("printable-invoice-a4");
      if (el) {
        import("@/lib/exportTemplatePdf").then(({ printElementAsPdf }) => {
          printElementAsPdf(el, String(r.invoice_no ?? "Invoice"));
        });
      }
    }, 500);
  }

  function handleDuplicate(r: Record<string, unknown>) {
    const newId = "inv-" + Date.now();
    const newNo = String(r.invoice_no ?? "INV") + "-COPY";
    const clone = { ...r, id: newId, invoice_no: newNo, number: newNo };
    setLocalRows((prev) => {
      const updated = [clone, ...prev];
      try { localStorage.setItem("vertofi_local_sales", JSON.stringify(updated)); } catch {}
      return updated;
    });
    alert("Successfully duplicated as " + newNo);
  }

  function handleEmail(r: Record<string, unknown>) {
    const custEmail = String(r.customer_email ?? r.customerEmail ?? "");
    const invNo = String(r.invoice_no ?? "Invoice");
    const amount = Number(r.total ?? r.amount ?? 0);
    const subject = encodeURIComponent("Invoice " + invNo + " from Vertofi");
    const body = encodeURIComponent("Dear Customer,\\n\\nPlease find attached the details for Invoice " + invNo + " amounting to " + amount + ".\\n\\nThank you.");
    window.location.href = "mailto:" + custEmail + "?subject=" + subject + "&body=" + body;
  }
`;
      // Insert after const [editingInvoice, setEditingInvoice] = useState
      content = content.replace('const [editingInvoice, setEditingInvoice] = useState<Record<string, unknown> | null>(null);', 'const [editingInvoice, setEditingInvoice] = useState<Record<string, unknown> | null>(null);' + hooksStr);
  }

  // 3. Dropdown Menu
  const dropdownJSX = `
                      <div className="flex items-center justify-center gap-1.5 relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rowKey = String(r.id || r.invoice_no || "inv");
                            setOpenDropdownId(openDropdownId === rowKey ? null : rowKey);
                          }}
                          className="inline-flex items-center justify-center p-1 text-blue-500 hover:text-blue-700 transition"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                        
                        {openDropdownId === String(r.id || r.invoice_no || "inv") && (
                          <div 
                            className="absolute right-8 top-8 z-50 w-64 rounded-md bg-white shadow-xl border border-slate-200 text-left text-[13px] text-slate-700 font-normal divide-y divide-slate-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button onClick={() => { handleOpenEdit(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <Eye className="h-4 w-4 text-slate-400" /> View & Edit
                            </button>
                            <button onClick={() => { handleDownload(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <Download className="h-4 w-4 text-slate-400" /> Download
                            </button>
                            <button onClick={() => { handleDuplicate(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Duplicate Invoice
                            </button>
                            <button onClick={() => { handleEmail(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <Mail className="h-4 w-4 text-slate-400" /> Send Email
                            </button>
                            <button onClick={() => { handleDeleteInvoice(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-rose-500 hover:bg-rose-50">
                              <XCircle className="h-4 w-4 text-rose-400" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
`;

  const lines = content.split('\\n');
  let out = [];
  let skipping = false;
  for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('<div className="flex items-center justify-end gap-1.5">') || lines[i].includes('<div className="flex items-center gap-1.5">') || lines[i].includes('<div className="flex items-center justify-center gap-1.5">')) {
          // If the next line is a button with handleOpenEdit
          if (lines[i+1] && lines[i+2] && lines[i+2].includes('handleOpenEdit')) {
              out.push(dropdownJSX);
              skipping = true;
              continue;
          }
      }
      if (skipping) {
          if (lines[i].includes('</div>')) {
              skipping = false;
          }
          continue;
      }
      out.push(lines[i]);
  }

  fs.writeFileSync(filePath, out.join('\\n'));
  console.log('Updated', filePath);
});
