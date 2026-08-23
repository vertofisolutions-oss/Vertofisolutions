import fs from "fs";
import path from "path";

const dirs = ["apps/web-landing/src/lib", "src/lib"];
for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f.endsWith(".ts")) {
      const fullPath = path.join(dir, f);
      let content = fs.readFileSync(fullPath, "utf8");
      if (content.includes('window.location.href = "/login"') || content.includes("window.location.href = '/login'")) {
        content = content.replace(/if\s*\(\s*typeof window[^}]*window\.location\.href\s*=\s*["']\/login["'];?\s*\}/g, "// Redirect suppressed");
        content = content.replace(/window\.location\.href\s*=\s*["']\/login["'];?/g, "// Redirect suppressed");
        fs.writeFileSync(fullPath, content, "utf8");
        console.log("Suppressed /login redirect in:", fullPath);
      }
    }
  }
}
