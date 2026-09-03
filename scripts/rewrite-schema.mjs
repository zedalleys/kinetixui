/**
 * Rebrand the per-item `$schema` field the registry build tool injects into
 * apps/web/public/r/*.json, so consumers of the built registry only ever see
 * kinetixui.com — never the tool used to generate it.
 *
 *   node scripts/rewrite-schema.mjs   (run after `shadcn build`)
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = `${ROOT}/apps/web/public/r`;

const FROM = "https://ui.shadcn.com/schema/registry-item.json";
const TO = "https://kinetixui.com/schema/registry-item.json";

let rewritten = 0;
for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const path = `${DIR}/${file}`;
  const contents = readFileSync(path, "utf8");
  if (!contents.includes(FROM)) continue;
  writeFileSync(path, contents.replaceAll(FROM, TO));
  rewritten++;
}

console.log(`rewrite-schema — ${rewritten} file(s) rebranded`);
