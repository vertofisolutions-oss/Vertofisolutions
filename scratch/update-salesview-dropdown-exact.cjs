const fs = require('fs');

const paths = [
  'apps/web-landing/src/components/SalesView.tsx',
  'src/components/SalesView.tsx'
];

paths.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // The dropdown JSX to replace the existing one
  const newDropdownJSX = `
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
                      </div>
`;

  // We need to replace the entire <div className="flex items-center justify-center gap-1.5 relative"> block
  const lines = content.split('\\n');
  let out = [];
  let skipping = false;
  for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('<div className="flex items-center justify-center gap-1.5 relative">')) {
          out.push(newDropdownJSX);
          skipping = true;
          continue;
      }
      if (skipping) {
          // Find the matching closing div for the flex container
          // Our old dropdown had '</div>' at the end of the block.
          // Let's just wait until we see a line that is EXACTLY '                      </div>' or similar
          if (lines[i].includes('</div>') && lines[i].trim() === '</div>' && lines[i-1] && lines[i-1].includes(')}')) {
              skipping = false;
          }
          continue;
      }
      out.push(lines[i]);
  }

  fs.writeFileSync(filePath, out.join('\\n'));
  console.log('Updated', filePath);
});
