import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const webLandingNext = path.join(repoRoot, "apps", "web-landing", ".next");
const rootNext = path.join(repoRoot, ".next");
const nestedWebLandingNext = path.join(repoRoot, "apps", "web-landing", "apps", "web-landing", ".next");
const apiWebLandingNext = path.join(repoRoot, "api", "apps", "web-landing", ".next");
const apiNext = path.join(repoRoot, "api", ".next");

console.log("[post-build] Syncing Next.js build artifacts across all target paths...");
console.log("[post-build] repoRoot:", repoRoot);

let sourceNext = null;
if (fs.existsSync(webLandingNext) && fs.existsSync(rootNext)) {
  const mtimeWeb = fs.statSync(webLandingNext).mtimeMs;
  const mtimeRoot = fs.statSync(rootNext).mtimeMs;
  sourceNext = mtimeWeb >= mtimeRoot ? webLandingNext : rootNext;
} else if (fs.existsSync(webLandingNext)) {
  sourceNext = webLandingNext;
} else if (fs.existsSync(rootNext)) {
  sourceNext = rootNext;
}

if (sourceNext) {
  console.log(`[post-build] Using primary source: ${path.relative(repoRoot, sourceNext)}`);
  const destinations = [
    rootNext,
    webLandingNext,
    nestedWebLandingNext,
    apiWebLandingNext,
    apiNext
  ];
  for (const dest of destinations) {
    if (dest !== sourceNext) {
      try {
        fs.mkdirSync(dest, { recursive: true });
        fs.cpSync(sourceNext, dest, { recursive: true });
        console.log(`[post-build] Synced to: ${path.relative(repoRoot, dest)}`);
      } catch (err) {
        console.warn(`[post-build] Warning syncing to ${dest}:`, err.message);
      }
    }
  }
  console.log("[post-build] Build artifacts successfully synced.");

  // Normalize relativeAppDir in required-server-files.json for root vs workspace
  const fixRequiredFiles = (destDir, relAppDir) => {
    const reqFile = path.join(destDir, "required-server-files.json");
    if (fs.existsSync(reqFile)) {
      try {
        const raw = fs.readFileSync(reqFile, "utf-8");
        const data = JSON.parse(raw);
        data.relativeAppDir = relAppDir;
        fs.writeFileSync(reqFile, JSON.stringify(data, null, 2), "utf-8");
      } catch (e) {
        console.warn(`[post-build] Warning normalizing ${reqFile}:`, e.message);
      }
    }
  };

  fixRequiredFiles(rootNext, "");
  fixRequiredFiles(webLandingNext, "apps/web-landing");
  fixRequiredFiles(apiNext, "");
} else {
  console.warn("[post-build] Warning: No Next.js build output (.next) found to sync.");
}

// Sync @swc/helpers with dereference to eliminate any lstat symlink issues on Vercel
const rootNodeModules = path.join(repoRoot, "node_modules");
const swcSrc = path.join(rootNodeModules, "@swc");
if (fs.existsSync(swcSrc)) {
  const targetDirs = [
    path.join(repoRoot, "api", "node_modules", "@swc"),
    path.join(repoRoot, "apps", "web-landing", "node_modules", "@swc")
  ];
  for (const target of targetDirs) {
    const checkFile = path.join(target, "helpers", "_", "_interop_require_default", "package.json");
    if (!fs.existsSync(checkFile)) {
      try {
        fs.mkdirSync(target, { recursive: true });
        fs.cpSync(swcSrc, target, { recursive: true, dereference: true, force: true });
        console.log(`[post-build] Dereferenced and synced @swc to: ${path.relative(repoRoot, target)}`);
      } catch (err) {
        console.warn(`[post-build] Warning syncing @swc to ${target}:`, err.message);
      }
    }
  }
}
