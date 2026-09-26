const fs = require('fs');

function processView(fileName, entityName, prefix, idField, isPurchase=false) {
    const paths = [
        "apps/web-landing/src/components/" + fileName,
        "src/components/" + fileName
    ];

    paths.forEach(filePath => {
        if (!fs.existsSync(filePath)) return;
        let content = fs.readFileSync(filePath, 'utf8');

        // New Dropdown JSX
        const returnText = isPurchase ? "Convert to Purchase Return" : "Convert to Sales Return";
        const newDropdownJSX = `
                        {openDropdownId === String(r.id || r.${idField} || "${prefix}") && (
                          <div 
                            className="absolute right-8 top-8 z-50 w-64 rounded-md bg-white shadow-xl border border-slate-200 text-left text-[13px] text-slate-700 font-normal divide-y divide-slate-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button onClick={() => { setSelectedRecord && setSelectedRecord(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <Eye className="h-4 w-4 text-slate-400" /> View
                            </button>
                            <button onClick={() => { handleDownload && handleDownload(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <Download className="h-4 w-4 text-slate-400" /> Download
                            </button>
                            <button onClick={() => { handleDuplicate && handleDuplicate(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Duplicate ${entityName}
                            </button>
                            <button onClick={() => { handleEmail && handleEmail(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <Mail className="h-4 w-4 text-slate-400" /> Send Email
                            </button>
                            <button onClick={() => { setSelectedRecord && setSelectedRecord(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Edit ${entityName}
                            </button>
                            <button onClick={() => { alert("${returnText}"); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> ${returnText}
                            </button>
                            <button onClick={() => { alert("Update Return Period"); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Update Return Period
                            </button>
                            <button onClick={() => { handleDelete && handleDelete(r); handleDeletePurchase && handleDeletePurchase(r); handleDeleteProforma && handleDeleteProforma(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-slate-700">
                              <XCircle className="h-4 w-4 text-slate-400" /> Cancel
                            </button>
                          </div>
                        )}
`;

        const lines = content.split('\\n');
        let out = [];
        let skipping = false;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('className="absolute right-8 top-8 z-50 w-56 rounded-md bg-white shadow-xl')) {
                // Remove the '{openDropdownId === ' line which was right before this line
                out.pop();
                out.push(newDropdownJSX);
                skipping = true;
                continue;
            }
            if (skipping) {
                if (lines[i].includes('</div>') && lines[i].trim() === '</div>' && lines[i-1] && lines[i-1].includes(')}')) {
                    // Wait, the previous block ended with `)}`. So `</div>` isn't there in the old code.
                    // The old code ended with:
                    // </button>
                    // </div>
                    // )}
                    skipping = false;
                } else if (lines[i].includes(')}')) {
                    skipping = false;
                }
                continue;
            }
            out.push(lines[i]);
        }

        fs.writeFileSync(filePath, out.join('\\n'));
        console.log('Updated', filePath);
    });
}

processView('PurchasesView.tsx', 'Purchase', 'pur', 'bill_no', true);
processView('ProformaInvoicesView.tsx', 'Proforma Invoice', 'prof', 'proforma_no', false);
processView('CreditNotesView.tsx', 'Credit Note', 'cn', 'cn_no', false);
processView('DebitNotesView.tsx', 'Debit Note', 'dn', 'dn_no', false);
processView('DeliveryChallansView.tsx', 'Delivery Challan', 'dc', 'dc_no', false);
