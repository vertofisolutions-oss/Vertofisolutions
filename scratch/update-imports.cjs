const fs = require('fs'); 
const files = [
    'apps/web-landing/src/components/ProformaInvoicesView.tsx', 
    'apps/web-landing/src/components/PurchasesView.tsx', 
    'apps/web-landing/src/components/SalesView.tsx', 
    'src/components/ProformaInvoicesView.tsx', 
    'src/components/PurchasesView.tsx', 
    'src/components/SalesView.tsx'
]; 
files.forEach(f => { 
    if (fs.existsSync(f)) {
        let content = fs.readFileSync(f, 'utf8'); 
        content = content.replace(/import \{ InvoiceTemplatePreviewModal \} from "\.\/ReportsCenter";/g, 'import { StandardGSTInvoiceModal as InvoiceTemplatePreviewModal } from "./StandardGSTInvoiceModal";'); 
        fs.writeFileSync(f, content); 
        console.log('Updated ' + f);
    }
});
