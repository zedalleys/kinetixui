/**
 * tsup's shared React chunk drops source-level "use client" directives.
 * Restore the boundary on emitted modules that import React and on the React barrel.
 * The mixed root and pure /functions graph remain usable from server components.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

const dist = fileURLToPath(new URL("../packages/iot/dist/", import.meta.url));
const reactImport = /\bfrom\s+["']react(?:\/[^"']+)?["']/;
let marked = 0;
function visit(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { visit(path); continue; }
    if (!entry.name.endsWith(".js")) continue;
    const code = readFileSync(path, "utf8");
    if (relative(dist, path).replaceAll("\\", "/") !== "react/index.js" && !reactImport.test(code)) continue;
    if (!/^\s*["']use client["'];/.test(code)) writeFileSync(path, '"use client";\n' + code);
    marked++;
  }
}
visit(dist);
if (marked === 0) throw new Error("IoT build has no React boundary to preserve");
console.log(`Preserved ${marked} IoT client module boundaries.`);
