const fs = require('fs');

const views = [
  'SalesView.tsx',
  'PurchasesView.tsx',
  'ProformaInvoicesView.tsx',
  'CreditNotesView.tsx',
  'DebitNotesView.tsx',
  'DeliveryChallansView.tsx'
];

views.forEach(file => {
  const paths = [
    'apps/web-landing/src/components/' + file,
    'src/components/' + file
  ];
  
  paths.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace overflow-x-auto with overflow-visible on the div just before <table
    // And also ensure any w-full overflow-hidden is fixed to overflow-visible near table
    
    // Specifically looking for the wrapper of the table:
    // <div className="overflow-x-auto rounded-lg border border-border mt-3">
    // or
    // <div className="mt-4 w-full overflow-hidden rounded-lg border border-border">
    
    let original = content;
    
    // Just a broad replacement for the table wrapper class
    content = content.replace(/className="([^"]*)overflow-x-auto([^"]*)"/g, 'className="$1overflow-visible$2"');
    // For PurchasesView it might use `overflow-hidden` before `table`
    // Let's replace 'overflow-hidden' with 'overflow-visible' ONLY if it's right before table
    // A simpler way:
    content = content.replace(/className="(.*?)overflow-hidden(.*?)">\s*<table/g, 'className="$1overflow-visible$2">\n        <table');

    if (original !== content) {
      fs.writeFileSync(filePath, content);
      console.log('Fixed overflow in', filePath);
    }
  });
});
