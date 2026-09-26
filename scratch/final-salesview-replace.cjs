const fs = require('fs');

const paths = [
  'apps/web-landing/src/components/SalesView.tsx',
  'src/components/SalesView.tsx'
];

paths.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // We are going to replace everything between:
  // <div className="flex items-center justify-center gap-1.5">
  // and
  // </div> (the one before </td>)
  
  const startStr = '<div className="flex items-center justify-center gap-1.5">';
  
  // Find start index
  const startIdx = content.indexOf(startStr);
  if (startIdx === -1) {
    console.log("Could not find start block in", filePath);
    return;
  }
  
  const endIdx = content.indexOf('</td>', startIdx);
  
  // The actual block ends at the </div> before </td>
  const actualEndIdx = content.lastIndexOf('</div>', endIdx);

  const newDropdownJSX = `<div className="flex items-center justify-center gap-1.5 relative">
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
                            <button onClick={() => { setPreviewingInvoice(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <Eye className="h-4 w-4 text-slate-400" /> View
                            </button>
                            <button onClick={() => { handleDownload && handleDownload(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <Download className="h-4 w-4 text-slate-400" /> Download
                            </button>
                            <button onClick={() => { handleDuplicate && handleDuplicate(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Duplicate Invoice
                            </button>
                            <button onClick={() => { handleEmail && handleEmail(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <Mail className="h-4 w-4 text-slate-400" /> Send Email
                            </button>
                            <button onClick={() => { handleOpenEdit(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Edit Invoice
                            </button>
                            <button onClick={() => { alert("Convert to Sales Return"); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Convert to Sales Return
                            </button>
                            <button onClick={() => { alert("Update Return Period"); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Update Return Period
                            </button>
                            <button onClick={() => { handleDeleteInvoice && handleDeleteInvoice(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-slate-700">
                              <XCircle className="h-4 w-4 text-slate-400" /> Cancel
                            </button>
                          </div>
                        )}
                      </div>`;

  let newContent = content.substring(0, startIdx) + newDropdownJSX + content.substring(actualEndIdx + 6);
  
  if (!newContent.includes('openDropdownId')) {
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
      newContent = newContent.replace('const [editingInvoice, setEditingInvoice] = useState<Record<string, unknown> | null>(null);', 'const [editingInvoice, setEditingInvoice] = useState<Record<string, unknown> | null>(null);' + hooksStr);
  }
  
  // Update icons if needed
  if (!newContent.includes('MoreHorizontal') && newContent.includes('import { Receipt')) {
      newContent = newContent.replace('Trash2', 'Trash2, MoreHorizontal, Eye, RefreshCw, Mail, XCircle, Download');
  }

  fs.writeFileSync(filePath, newContent);
  console.log('Successfully updated', filePath);
});
