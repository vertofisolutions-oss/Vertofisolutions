const fs = require('fs');

const views = [
  { file: 'DebitNotesView.tsx', entity: 'Debit Note' },
  { file: 'DeliveryChallansView.tsx', entity: 'Delivery Challan' },
];

views.forEach(({ file, entity }) => {
  const paths = [
    'apps/web-landing/src/components/' + file,
    'src/components/' + file
  ];
  
  paths.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Here we look for:
    // <td className="px-3 py-3 text-center">
    //   <button ... > ... </button>
    // </td>
    // </tr>
    const regex = /<td className="px-3 py-3 text-center">\s*<button[\s\S]*?<\/button>\s*<\/td>\s*<\/tr>/;
    
    const isPurchase = entity === 'Purchase';
    const returnText = isPurchase ? "Convert to Purchase Return" : "Convert to Sales Return";

    const newDropdownJSX = `<td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rowKey = String(r.id || r.invoice_no || r.bill_no || r.proforma_no || r.cn_no || r.dn_no || r.dc_no || "doc");
                            setOpenDropdownId(openDropdownId === rowKey ? null : rowKey);
                          }}
                          className="inline-flex items-center justify-center p-1 text-blue-500 hover:text-blue-700 transition cursor-pointer"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                        
                        {openDropdownId === String(r.id || r.invoice_no || r.bill_no || r.proforma_no || r.cn_no || r.dn_no || r.dc_no || "doc") && (
                          <div 
                            className="absolute right-8 top-8 z-50 w-64 rounded-md bg-white shadow-xl border border-slate-200 text-left text-[13px] text-slate-700 font-normal divide-y divide-slate-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button onClick={() => { typeof setPreviewingInvoice === 'function' ? setPreviewingInvoice(r) : typeof setSelectedRecord === 'function' ? setSelectedRecord(r) : alert('View ' + r.id); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <Eye className="h-4 w-4 text-slate-400" /> View
                            </button>
                            <button onClick={() => { typeof handleDownload === 'function' ? handleDownload(r) : alert('Download ' + r.id); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <Download className="h-4 w-4 text-slate-400" /> Download
                            </button>
                            <button onClick={() => { typeof handleDuplicate === 'function' ? handleDuplicate(r) : alert('Duplicate ' + r.id); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Duplicate ` + entity + `
                            </button>
                            <button onClick={() => { typeof handleEmail === 'function' ? handleEmail(r) : alert('Email ' + r.id); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <Mail className="h-4 w-4 text-slate-400" /> Send Email
                            </button>
                            <button onClick={() => { typeof handleOpenEdit === 'function' ? handleOpenEdit(r) : typeof setSelectedRecord === 'function' ? setSelectedRecord(r) : alert('Edit ' + r.id); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Edit ` + entity + `
                            </button>
                            <button onClick={() => { alert("` + returnText + `"); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> ` + returnText + `
                            </button>
                            <button onClick={() => { alert("Update Return Period"); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Update Return Period
                            </button>
                            <button onClick={() => { 
                                if (typeof handleDeleteInvoice === 'function') handleDeleteInvoice(r);
                                else if (typeof handleDeletePurchase === 'function') handleDeletePurchase(r);
                                else if (typeof handleDeleteProforma === 'function') handleDeleteProforma(r);
                                else if (typeof handleDelete === 'function') handleDelete(r);
                                else alert('Cancel ' + r.id);
                                setOpenDropdownId(null); 
                            }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-slate-700 cursor-pointer">
                              <XCircle className="h-4 w-4 text-slate-400" /> Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>`;

    if (regex.test(content)) {
      content = content.replace(regex, newDropdownJSX);
      console.log('Successfully replaced action buttons in', filePath);
    } else {
      console.log('Could not match regex in', filePath);
    }

    if (!content.includes('openDropdownId')) {
        const hooksStr = `
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);
`;
        content = content.replace(/(const \[.*?\] = useState.*?;)/, '$1' + hooksStr);
    }

    if (!content.includes('MoreHorizontal') && content.includes('lucide-react')) {
      content = content.replace(/import\s+{([^}]*)}\s+from\s+["']lucide-react["'];/, (match, p1) => {
        const imports = p1.split(',').map(s => s.trim());
        ['MoreHorizontal', 'Eye', 'RefreshCw', 'Mail', 'XCircle', 'Download'].forEach(icon => {
          if (!imports.includes(icon)) imports.push(icon);
        });
        return `import { ${imports.join(', ')} } from "lucide-react";`;
      });
    }

    fs.writeFileSync(filePath, content);
  });
});
