/**
 * check-status.mjs — every component must have an explicit lifecycle status.
 *
 *   node scripts/check-status.mjs
 *
 * component-status.json used to treat an absent slug as "stable", so forgetting
 * an entry silently shipped a component as production-ready. Now the file must
 * list every `registry:ui` component in registry/registry.json with one of the
 * allowed states, and may not list slugs that no longer exist.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => JSON.parse(readFileSync(`${root}/${p}`, "utf8"));

const ALLOWED = new Set(["beta", "stable", "deprecated"]);
const { status } = read("component-status.json");
const slugs = read("registry/registry.json")
  .items.filter((i) => i.type === "registry:ui")
  .map((i) => i.name);

const errors = [];
for (const s of slugs) {
  if (!(s in status)) errors.push(`${s}: no lifecycle status — add it to component-status.json`);
}
for (const [s, v] of Object.entries(status)) {
  if (!slugs.includes(s)) errors.push(`${s}: listed in component-status.json but not a component`);
  else if (!ALLOWED.has(v)) errors.push(`${s}: invalid status "${v}" (allowed: ${[...ALLOWED].join(", ")})`);
}

if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  console.error(`\ncheck:status failed (${errors.length}).`);
  process.exit(1);
}
console.log(`check:status ok — ${slugs.length} components, all with an explicit status.`);
