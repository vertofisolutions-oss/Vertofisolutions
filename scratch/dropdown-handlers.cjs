const fs = require('fs');

const handlersStr = `
  function handleDownload(r: Record<string, unknown>) {
    setPreviewingInvoice(r);
    setTimeout(() => {
      const el = document.getElementById("printable-invoice-a4");
      if (el) {
        import("@/lib/exportTemplatePdf").then(({ printElementAsPdf }) => {
          printElementAsPdf(el, String(r.invoice_no || "Invoice"));
        });
      }
    }, 500);
  }

  function handleDuplicate(r: Record<string, unknown>) {
    const newId = "sale-" + Date.now();
    const newInvNo = String(r.invoice_no || "INV") + "-COPY";
    const clone = { ...r, id: newId, invoice_no: newInvNo, invoiceNo: newInvNo };
    setLocalRows((prev) => {
      const updated = [clone, ...prev];
      try { localStorage.setItem("vertofi_local_sales", JSON.stringify(updated)); } catch {}
      return updated;
    });
    alert("Successfully duplicated as " + newInvNo);
  }

  function handleEmail(r: Record<string, unknown>) {
    const custEmail = String(r.customer_email || r.customerEmail || "");
    const invNo = String(r.invoice_no || r.invoiceNo || "Invoice");
    const amount = inr(num(r.total));
    const subject = encodeURIComponent("Invoice " + invNo + " from Vertofi");
    const body = encodeURIComponent("Dear Customer,\\n\\nPlease find attached the details for Invoice " + invNo + " amounting to " + amount + ".\\n\\nThank you.");
    window.location.href = "mailto:" + custEmail + "?subject=" + subject + "&body=" + body;
  }

  function handleConvertToSalesReturn(r: Record<string, unknown>) {
    const newId = "return-" + Date.now();
    const newInvNo = "CN-" + String(r.invoice_no || "001");
    const clone = { ...r, id: newId, invoice_no: newInvNo, invoiceNo: newInvNo, doc_type: "Sales Return", status: "ISSUED" };
    setLocalRows((prev) => {
      const updated = [clone, ...prev];
      try { localStorage.setItem("vertofi_local_sales", JSON.stringify(updated)); } catch {}
      return updated;
    });
    alert("Converted to Sales Return as " + newInvNo);
  }

  function handleUpdateReturnPeriod(r: Record<string, unknown>) {
    const current = String(r.return_period || "09-2026");
    const next = prompt("Enter new return period (MM-YYYY):", current);
    if (!next || next === current) return;
    setLocalRows((prev) => {
      const updated = prev.map(item => {
        if (item.id === r.id || item.invoice_no === r.invoice_no) {
          return { ...item, return_period: next };
        }
        return item;
      });
      try { localStorage.setItem("vertofi_local_sales", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  const kpis = useMemo(() => {`;

const oldButtons = `<button onClick={() => setOpenDropdownId(null)} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <Download className="h-4 w-4 text-slate-400" /> Download
                          </button>
                          <button onClick={() => setOpenDropdownId(null)} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <RefreshCw className="h-4 w-4 text-slate-400" /> Duplicate Invoice
                          </button>
                          <button onClick={() => setOpenDropdownId(null)} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <Mail className="h-4 w-4 text-slate-400" /> Send Email
                          </button>
                          <button onClick={() => { handleOpenEdit(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <RefreshCw className="h-4 w-4 text-slate-400" /> Edit Invoice
                          </button>
                          <button onClick={() => setOpenDropdownId(null)} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <RefreshCw className="h-4 w-4 text-slate-400" /> Convert to Sales Return
                          </button>
                          <button onClick={() => setOpenDropdownId(null)} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <RefreshCw className="h-4 w-4 text-slate-400" /> Update Return Period
                          </button>`;

const newButtons = `<button onClick={() => { handleDownload(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <Download className="h-4 w-4 text-slate-400" /> Download
                          </button>
                          <button onClick={() => { handleDuplicate(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <RefreshCw className="h-4 w-4 text-slate-400" /> Duplicate Invoice
                          </button>
                          <button onClick={() => { handleEmail(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <Mail className="h-4 w-4 text-slate-400" /> Send Email
                          </button>
                          <button onClick={() => { handleOpenEdit(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <RefreshCw className="h-4 w-4 text-slate-400" /> Edit Invoice
                          </button>
                          <button onClick={() => { handleConvertToSalesReturn(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <RefreshCw className="h-4 w-4 text-slate-400" /> Convert to Sales Return
                          </button>
                          <button onClick={() => { handleUpdateReturnPeriod(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <RefreshCw className="h-4 w-4 text-slate-400" /> Update Return Period
                          </button>`;

function processFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    if (!content.includes('function handleDuplicate(')) {
        content = content.replace('const kpis = useMemo(() => {', handlersStr);
    }
    
    // Using string replacement carefully due to whitespace
    const contentLines = content.split('\\n');
    let out = [];
    let skipping = false;
    
    for (let i = 0; i < contentLines.length; i++) {
        const line = contentLines[i];
        if (line.includes('<Download className="h-4 w-4 text-slate-400" /> Download')) {
            // Found the start of the block. We replace it.
            // Actually, we replace the line above it too.
            out.pop(); // remove `<button onClick={() => setOpenDropdownId(null)} ...`
            out.push(newButtons);
            // Skip until we find the end of Update Return Period button
            skipping = true;
        }
        
        if (skipping) {
            if (line.includes('Update Return Period')) {
                // Skip this line and the next line (which is `</button>`)
                i++;
                skipping = false;
                continue;
            }
            continue;
        }
        
        out.push(line);
    }

    fs.writeFileSync(filePath, out.join('\\n'));
    console.log("Updated " + filePath);
}

processFile('apps/web-landing/src/components/SalesView.tsx');
processFile('src/components/SalesView.tsx');
