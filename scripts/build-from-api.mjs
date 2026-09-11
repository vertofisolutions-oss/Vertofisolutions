import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

console.log("[build-from-api] Running build from repoRoot:", repoRoot);
try {
  execSync("pnpm --filter @vertofi/web-landing build", {
    cwd: repoRoot,
    stdio: "inherit"
  });
} catch (e) {
  console.warn("[build-from-api] pnpm filter build warning, ensuring post-build sync:", e.message);
  try {
    execSync("node scripts/post-build.mjs", {
      cwd: repoRoot,
      stdio: "inherit"
    });
  } catch (err) {
    console.error("[build-from-api] Error during post-build sync:", err.message);
  }
}
