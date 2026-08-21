const https = require("https");
const fs = require("fs");

const TEAM_ID = "team_Mia7hSiuD2spuPd5KJNc5CJS";

// Find token from AppData
function findToken() {
  const { execSync } = require("child_process");
  try {
    const out = execSync(
      `powershell -Command "Get-ChildItem $env:APPDATA -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq 'auth.json' } | ForEach-Object { Get-Content $_.FullName } | Select-Object -First 1"`,
      { encoding: "utf8" }
    ).trim();
    return JSON.parse(out).token;
  } catch {}
}

// Read token from env or find it
const TOKEN = process.env.VERCEL_TOKEN || findToken();
if (!TOKEN) { console.error("No token found"); process.exit(1); }
console.log("Token found:", TOKEN.substring(0, 10) + "...");

// Correct project settings (package name + root dir)
const projects = [
  { id: "prj_bsaLkokAoky0qBTRao8GRuy7uoFo", name: "vertofi-web-associates",          pkg: "vertofi-platform-web-associates",  root: "apps/web-associates" },
  { id: "prj_VGICCAGPFr0ubTWdZj78XwgrzQmk", name: "vertofi-platform-web-accountants", pkg: "vertofi-platform-web-accountants", root: "apps/web-accountants" },
  { id: "prj_knsAY85NmHjNbe9QRaej6eLH19eT", name: "vertofi-platform-web-bhs",         pkg: "vertofi-platform-web-bhs",         root: "apps/web-bhs" },
  { id: "prj_fcINIq67OLuxCo1blu5ZBPHDyyk9", name: "vertofi-platform-web-legal",        pkg: "vertofi-platform-web-legal",        root: "apps/web-legal" },
  { id: "prj_vsQ21gY7QiAUgVOZGY7cgh7xE2Nm", name: "vertofi-platform-web-teams",        pkg: "vertofi-platform-web-teams",        root: "apps/web-teams" },
  { id: "prj_E3nyhUCLy8tUiyT5kxMvpSUxlWZb", name: "vertofi-admin",                    pkg: "@vertofi/web-admin",               root: "apps/web-admin" },
  { id: "prj_CodL52gaWRdnhYJ389CQxZURYhQ3", name: "vertofi-platform-web-business",     pkg: "@vertofi/web-business",            root: "apps/web-business" },
  { id: "prj_D8emMCe8OViltkFrKg5OmasNnZwt", name: "vertofi-platform-web-landing",      pkg: "@vertofi/web-landing",             root: "apps/web-landing" },
];

async function patchProject(proj) {
  const body = JSON.stringify({
    buildCommand: `cd ../.. && pnpm turbo run build --filter=${proj.pkg}...`,
    installCommand: "cd ../.. && pnpm install --no-frozen-lockfile",
    outputDirectory: ".next",
    rootDirectory: proj.root,
    framework: "nextjs",
  });

  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.vercel.com",
      path: `/v9/projects/${proj.id}?teamId=${TEAM_ID}`,
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const j = JSON.parse(data);
          console.log(`✓ ${proj.name} (${res.statusCode})`);
          console.log(`  buildCommand  : ${j.buildCommand}`);
          console.log(`  rootDirectory : ${j.rootDirectory}`);
          resolve();
        } else {
          console.error(`✗ ${proj.name} → ${res.statusCode}: ${data}`);
          resolve();
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  for (const p of projects) {
    await patchProject(p);
  }
  console.log("\nAll projects updated! Triggering redeploys...");
})();
