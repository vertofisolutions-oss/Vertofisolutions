const fs = require('fs');

const files = [
    'CreditNotesView.tsx', 
    'DebitNotesView.tsx', 
    'DeliveryChallansView.tsx',
    'PurchasesView.tsx',
    'ProformaInvoicesView.tsx',
    'SalesView.tsx'
];

files.forEach(f => {
    ['apps/web-landing/src/components/', 'src/components/'].forEach(dir => {
        const path = dir + f;
        if (fs.existsSync(path)) {
            let content = fs.readFileSync(path, 'utf8');
            let lines = content.split('\n');
            let updated = false;

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('from "lucide-react"')) {
                    // Extract the imports between { and }
                    const match = lines[i].match(/import\s+\{\s*(.*?)\s*\}\s+from\s+"lucide-react"/);
                    if (match) {
                        const imports = match[1].split(',').map(s => s.trim()).filter(s => s);
                        // Deduplicate
                        const uniqueImports = [...new Set(imports)];
                        if (uniqueImports.length !== imports.length) {
                            const newImportStr = `import { ${uniqueImports.join(', ')} } from "lucide-react";`;
                            lines[i] = newImportStr;
                            updated = true;
                        }
                    }
                }
            }

            if (updated) {
                fs.writeFileSync(path, lines.join('\n'));
                console.log('Fixed imports in ' + path);
            }
        }
    });
});
