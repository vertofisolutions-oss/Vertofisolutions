import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const checkDirs = ["api", "packages", "services"];

for (const top of checkDirs) {
  const topPath = path.join(repoRoot, top);
  if (!fs.existsSync(topPath)) continue;

  const topPkg = path.join(topPath, "package.json");
  if (fs.existsSync(topPkg)) {
    patchPkg(topPkg);
  }

  for (const child of fs.readdirSync(topPath)) {
    const childPkg = path.join(topPath, child, "package.json");
    if (fs.existsSync(childPkg)) {
      patchPkg(childPkg);
    }
  }
}

function patchPkg(pkgPath) {
  try {
    const data = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (!data.scripts) data.scripts = {};
    if (!data.scripts.build) {
      data.scripts.build = "echo No build required";
      fs.writeFileSync(pkgPath, JSON.stringify(data, null, 2) + "\n", "utf8");
      console.log("Added build script to:", path.relative(repoRoot, pkgPath));
    }
  } catch (e) {
    console.error("Error patching", pkgPath, e.message);
  }
}
