import fs from "fs";
import path from "path";

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (full.endsWith(".tsx") || full.endsWith(".ts")) {
      results.push(full);
    }
  }
  return results;
}

const files = walk("src");
for (const f of files) {
  let code = fs.readFileSync(f, "utf8");
  if (code.includes("@vertofi/ui")) {
    code = code.replace(/@vertofi\/ui\/styles\.css/g, "@/ui/styles.css");
    code = code.replace(/@vertofi\/ui/g, "@/ui");
    fs.writeFileSync(f, code, "utf8");
    console.log("Updated UI import:", f);
  }
}
console.log("All @vertofi/ui imports updated to @/ui.");
