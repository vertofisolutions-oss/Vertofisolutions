const fs = require('fs'); 
const apps = ['web-admin', 'web-teams', 'web-associates', 'web-accountants', 'web-legal', 'web-bhs']; 
apps.forEach(app => { 
  const p = 'apps/' + app + '/src/app/login/page.tsx'; 
  let c = fs.readFileSync(p, 'utf8'); 
  c = c.replace('import { api, setTokens, ApiError } from "../../lib/api";', 'import { api, ApiError } from "../../lib/api";\nimport { setTokens } from "../../lib/auth";'); 
  fs.writeFileSync(p, c); 
});
