const fs = require('fs'); 
const apps = ['web-admin', 'web-teams', 'web-associates', 'web-accountants', 'web-legal', 'web-bhs']; 
apps.forEach(app => { 
  const p = 'apps/' + app + '/src/app/login/page.tsx'; 
  let c = fs.readFileSync(p, 'utf8'); 
  c = c.replace('await api.sendOtp("MOBILE", mobile, "LOGIN");', 'await api.sendOtp(mobile);'); 
  fs.writeFileSync(p, c); 
});
