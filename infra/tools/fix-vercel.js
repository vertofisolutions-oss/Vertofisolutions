const { execSync } = require('child_process');

const vars = {
  NEXT_PUBLIC_API_URL: 'https://api.vertofi.com/api/v1',
  NEXT_PUBLIC_PANEL_BASE: 'https://panels.vertofi.com',
  NEXT_PUBLIC_BUSINESS_URL: 'https://app.vertofi.com'
};

const apps = ['web-business', 'web-panels', 'web-admin', 'web-landing'];
const envs = ['production', 'preview', 'development'];

for (const app of apps) {
  for (const env of envs) {
    for (const [key, value] of Object.entries(vars)) {
      console.log(`Setting ${key}=${value} in ${app} (${env})...`);
      try {
        execSync(`vercel env rm ${key} ${env} --yes --cwd apps/${app}`, { stdio: 'ignore' });
      } catch (e) {} // ignore if not exists
      execSync(`vercel env add ${key} ${env} --cwd apps/${app}`, { input: value, stdio: 'ignore' });
    }
  }
}
console.log("Clean Vercel env setup completed.");
