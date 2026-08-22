import fs from "fs";
import path from "path";

const src = path.resolve(".next");
const destDir = path.resolve("apps/web-landing");
const dest = path.resolve("apps/web-landing/.next");

if (fs.existsSync(src)) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log("Successfully mirrored .next output to apps/web-landing/.next");
}
