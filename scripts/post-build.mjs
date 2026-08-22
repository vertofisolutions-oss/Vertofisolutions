import fs from "fs";
import path from "path";

const src = path.resolve("dist");
const targets = [
  path.resolve("apps/web-landing/dist"),
  path.resolve("apps/web-landing/.next"),
  path.resolve(".next")
];

if (fs.existsSync(src)) {
  for (const t of targets) {
    fs.mkdirSync(t, { recursive: true });
    fs.cpSync(src, t, { recursive: true });
  }
  console.log("Successfully mirrored dist output across all directories.");
}
