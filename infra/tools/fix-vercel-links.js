const fs = require("fs");

const ORG_ID = "team_Mia7hSiuD2spuPd5KJNc5CJS";

// Correct Vercel project IDs (from vercel project ls --json)
const projectMap = [
  { app: "web-associates",  projectId: "prj_bsaLkokAoky0qBTRao8GRuy7uoFo", projectName: "vertofi-web-associates" },
  { app: "web-accountants", projectId: "prj_VGICCAGPFr0ubTWdZj78XwgrzQmk", projectName: "vertofi-platform-web-accountants" },
  { app: "web-bhs",         projectId: "prj_knsAY85NmHjNbe9QRaej6eLH19eT", projectName: "vertofi-platform-web-bhs" },
  { app: "web-legal",       projectId: "prj_fcINIq67OLuxCo1blu5ZBPHDyyk9", projectName: "vertofi-platform-web-legal" },
  { app: "web-teams",       projectId: "prj_vsQ21gY7QiAUgVOZGY7cgh7xE2Nm", projectName: "vertofi-platform-web-teams" },
  { app: "web-admin",       projectId: "prj_E3nyhUCLy8tUiyT5kxMvpSUxlWZb", projectName: "vertofi-admin" },
  { app: "web-business",    projectId: "prj_CodL52gaWRdnhYJ389CQxZURYhQ3", projectName: "vertofi-platform-web-business" },
  { app: "web-landing",     projectId: "prj_D8emMCe8OViltkFrKg5OmasNnZwt", projectName: "vertofi-platform-web-landing" },
];

projectMap.forEach(({ app, projectId, projectName }) => {
  const dir = `apps/${app}/.vercel`;
  fs.mkdirSync(dir, { recursive: true });
  const content = JSON.stringify({ projectId, orgId: ORG_ID, projectName }, null, 2);
  fs.writeFileSync(`${dir}/project.json`, content);
  console.log(`✓ ${app} → ${projectName} (${projectId})`);
});
