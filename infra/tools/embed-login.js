const fs = require("fs");
const path = require("path");

// Read the template
const template = fs.readFileSync("infra/two-panel-login.tsx", "utf8");

const panels = [
  { app: "web-associates",  file: "src/app/login/page.tsx" },
  { app: "web-accountants", file: "src/app/login/page.tsx" },
  { app: "web-bhs",         file: "src/app/login/page.tsx" },
  { app: "web-legal",       file: "src/app/login/page.tsx" },
  { app: "web-teams",       file: "src/app/login/page.tsx" },
  { app: "web-admin",       file: "src/app/login/page.tsx" },
];

panels.forEach(({ app, file }) => {
  const loginFile = path.join("apps", app, file);
  const pageContent = fs.readFileSync(loginFile, "utf8");
  
  // Extract config from existing page
  const configMatch = pageContent.match(/config=\{(\{[\s\S]*?\})\}/);
  if (!configMatch) {
    console.log(`Skipping ${app} - no config found`);
    return;
  }
  
  // Embed template + page config into single self-contained file
  const combined = `${template}\n\nexport default function LoginPage() {\n  return (\n    <TwoPanelLogin\n      ${pageContent.match(/config=\{[\s\S]*?\}\n    \/>/)?.[0] ?? "config={{name:'',tagline:'',accentFrom:'',accentTo:'',logo:'',badge:'',features:[]}}\n    />"}\n  );\n}\n`;
  
  fs.writeFileSync(loginFile, combined);
  console.log(`✓ ${app} - self-contained login written`);
});
