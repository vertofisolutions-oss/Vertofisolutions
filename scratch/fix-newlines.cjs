const fs = require('fs');
const files = ['CreditNotesView.tsx', 'DebitNotesView.tsx', 'DeliveryChallansView.tsx'];
files.forEach(f => {
    ['apps/web-landing/src/components/', 'src/components/'].forEach(dir => {
        const path = dir + f;
        if (fs.existsSync(path)) {
            let c = fs.readFileSync(path, 'utf8');
            c = c.replace('\\n  const filteredRows', '\n  const filteredRows');
            c = c.replace('<div className="w-full space-y-4">\\n', '<div className="w-full space-y-4">\n');
            fs.writeFileSync(path, c);
            console.log('Fixed ' + path);
        }
    })
});
