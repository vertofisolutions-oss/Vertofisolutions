import fs from "fs";
import path from "path";

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (full.endsWith(".tsx") || full.endsWith(".ts")) {
      results.push(full);
    }
  }
  return results;
}

const files = walk("apps/web-landing/src");
for (const f of files) {
  let code = fs.readFileSync(f, "utf8");
  let modified = false;

  const isBusiness = !f.includes("\\admin\\") && !f.includes("/admin/") &&
                     !f.includes("\\teams") && !f.includes("/teams") &&
                     !f.includes("\\associates\\") && !f.includes("/associates/") &&
                     !f.includes("\\accountants\\") && !f.includes("/accountants/") &&
                     !f.includes("\\bhs-portal\\") && !f.includes("/bhs-portal/") &&
                     !f.includes("\\bhs\\") && !f.includes("/bhs/") &&
                     !f.includes("\\legal-portal\\") && !f.includes("/legal-portal/") &&
                     !f.includes("\\legal\\") && !f.includes("/legal/");

  const isAdminOrTeam = f.includes("admin") || f.includes("teams");

  // Fix API imports:
  if (isBusiness) {
    code = code.replace(/from ["']@\/lib\/panel-api["']/g, 'from "@/lib/api"');
    code = code.replace(/from ["']@\/lib\/auth["']/g, 'from "@/lib/api"');
  } else if (isAdminOrTeam) {
    code = code.replace(/from ["']@\/lib\/panel-api["']/g, 'from "@/lib/admin-api"');
    code = code.replace(/from ["']@\/lib\/auth["']/g, 'from "@/lib/admin-auth"');
  } else {
    code = code.replace(/from ["']@\/lib\/api["']/g, 'from "@/lib/panel-api"');
  }

  fs.writeFileSync(f, code, "utf8");
}
console.log("Imports mapped cleanly.");
