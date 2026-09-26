const fs = require('fs');

function processProformaView(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Imports
    if (!content.includes('MoreHorizontal')) {
        content = content.replace('Trash2, CheckCircle2, FileDown', 'Trash2, CheckCircle2, FileDown, MoreHorizontal, Eye, RefreshCw, Mail, XCircle, Download');
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
    setPreviewProforma(r);
    setTimeout(() => {
      const el = document.getElementById("printable-invoice-a4");
      if (el) {
        import("@/lib/exportTemplatePdf").then(({ printElementAsPdf }) => {
          printElementAsPdf(el, String(r.proforma_no ?? "Proforma"));
        });
      }
    }, 500);
  }

  function handleDuplicate(r: Record<string, unknown>) {
    const newId = "prof-" + Date.now();
    const newNo = String(r.proforma_no ?? "PROF") + "-COPY";
    const clone = { ...r, id: newId, proforma_no: newNo };
    setRows((prev) => {
      const updated = [clone, ...prev];
      try { localStorage.setItem("vertofi_local_proforma", JSON.stringify(updated)); } catch {}
      return updated;
    });
    alert("Successfully duplicated as " + newNo);
  }

  function handleEmail(r: Record<string, unknown>) {
    const custEmail = String(r.customer_email ?? "");
    const invNo = String(r.proforma_no ?? "Proforma");
    const amount = Number(r.total ?? 0);
    const subject = encodeURIComponent("Proforma Invoice " + invNo + " from Vertofi");
    const body = encodeURIComponent("Dear Customer,\\n\\nPlease find attached the details for Proforma Invoice " + invNo + " amounting to " + amount + ".\\n\\nThank you.");
    window.location.href = "mailto:" + custEmail + "?subject=" + subject + "&body=" + body;
  }
`;
        content = content.replace('const [autoExportPdf, setAutoExportPdf] = useState(false);', 'const [autoExportPdf, setAutoExportPdf] = useState(false);' + hooksStr);
    }

    // 3. Dropdown Menu
    const dropdownJSX = `
                  <td className="px-3 py-3 text-center relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rowKey = String(r.id || r.proforma_no || "prof");
                          setOpenDropdownId(openDropdownId === rowKey ? null : rowKey);
                        }}
                        className="inline-flex items-center justify-center p-1 text-blue-500 hover:text-blue-700 transition"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                      
                      {openDropdownId === String(r.id || r.proforma_no || "prof") && (
                        <div 
                          className="absolute right-8 top-8 z-50 w-56 rounded-md bg-white shadow-xl border border-slate-200 text-left text-[13px] text-slate-700 font-normal divide-y divide-slate-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button onClick={() => { setSelectedRecord(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <Eye className="h-4 w-4 text-slate-400" /> View
                          </button>
                          <button onClick={() => { handleDownload(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <Download className="h-4 w-4 text-slate-400" /> Download
                          </button>
                          <button onClick={() => { handleDuplicate(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <RefreshCw className="h-4 w-4 text-slate-400" /> Duplicate Proforma
                          </button>
                          <button onClick={() => { handleEmail(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <Mail className="h-4 w-4 text-slate-400" /> Send Email
                          </button>
                          <button onClick={() => { handleDeleteProforma(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-rose-500 hover:bg-rose-50">
                            <XCircle className="h-4 w-4 text-rose-400" /> Delete
                          </button>
                        </div>
                      )}
                  </td>
`;

    const lines = content.split('\\n');
    let out = [];
    let skipping = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<td className="px-3 py-3 text-center">') && lines[i+1] && lines[i+1].includes('<div className="flex items-center justify-center gap-1.5">')) {
            out.push(dropdownJSX);
            skipping = true;
            continue;
        }
        if (skipping) {
            if (lines[i].includes('</td>')) {
                skipping = false;
            }
            continue;
        }
        out.push(lines[i]);
    }

    fs.writeFileSync(filePath, out.join('\\n'));
    console.log('Updated', filePath);
}

processProformaView('apps/web-landing/src/components/ProformaInvoicesView.tsx');
processProformaView('src/components/ProformaInvoicesView.tsx');
