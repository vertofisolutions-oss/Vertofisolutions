import fs from "fs";
const pkg = {
  "name": "vertofi",
  "version": "0.1.0",
  "private": true,
  "description": "Vertofi — Predictive Accounting & Financial Intelligence Platform",
  "scripts": {
    "build": "pnpm --filter @vertofi/web-landing build",
    "dev": "pnpm --filter @vertofi/web-landing dev",
    "start": "pnpm --filter @vertofi/web-landing start",
    "typecheck": "pnpm --filter @vertofi/web-landing typecheck"
  },
  "devDependencies": {
    "rimraf": "^6.0.1",
    "turbo": "^2.5.0",
    "typescript": "^5.7.3"
  }
};
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n", "utf8");
console.log("Root package.json updated successfully.");
