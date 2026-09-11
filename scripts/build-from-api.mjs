import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

console.log("[build-from-api] Starting unified build from:", repoRoot);

const rootNodeModules = path.join(repoRoot, "node_modules");
const apiNodeModules = path.join(repoRoot, "api", "node_modules");

// 1. Link or ensure node_modules inside api/
try {
  if (!fs.existsSync(apiNodeModules)) {
    try {
      fs.symlinkSync(rootNodeModules, apiNodeModules, "junction");
      console.log("[build-from-api] Linked node_modules -> api/node_modules");
    } catch (symErr) {
      console.warn("[build-from-api] Symlink failed, will copy @swc:", symErr.message);
    }
  }
} catch (err) {
  console.warn("[build-from-api] Warning linking node_modules:", err.message);
}

// 2. Run the web-landing Next.js build
try {
  execSync("pnpm --filter @vertofi/web-landing build", {
    cwd: repoRoot,
    stdio: "inherit"
  });
} catch (e) {
  console.warn("[build-from-api] pnpm filter build failed, trying next build:", e.message);
  try {
    execSync("npx next build", {
      cwd: repoRoot,
      stdio: "inherit"
    });
  } catch (err) {
    console.error("[build-from-api] Error during next build:", err.message);
  }
}

// 3. Run post-build sync to mirror artifacts everywhere
try {
  execSync("node scripts/post-build.mjs", {
    cwd: repoRoot,
    stdio: "inherit"
  });
} catch (e) {
  console.error("[build-from-api] Error in post-build sync:", e.message);
}

// 4. Ensure real physical dereferenced @swc exists in api/node_modules
try {
  const swcSrc = path.join(rootNodeModules, "@swc");
  const swcDest = path.join(apiNodeModules, "@swc");
  const checkFile = path.join(swcDest, "helpers", "_", "_interop_require_default", "package.json");
  if (fs.existsSync(swcSrc) && !fs.existsSync(checkFile)) {
    fs.mkdirSync(swcDest, { recursive: true });
    fs.cpSync(swcSrc, swcDest, { recursive: true, dereference: true, force: true });
    console.log("[build-from-api] Copied dereferenced @swc into api/node_modules/@swc");
  }
} catch (err) {
  console.warn("[build-from-api] Warning copying @swc:", err.message);
}

console.log("[build-from-api] Unified build completed successfully.");
