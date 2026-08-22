import fs from "fs";
import path from "path";

const src = path.resolve("apps/web-landing/.next");
const dest = path.resolve(".next");

if (fs.existsSync(src)) {
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log("Successfully mirrored apps/web-landing/.next to .next");
}
