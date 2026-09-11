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
} else {
  console.warn("[post-build] Warning: No Next.js build output (.next) found to sync.");
}
