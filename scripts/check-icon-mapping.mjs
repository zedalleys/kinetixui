/**
 * check-icon-mapping.mjs — drift check for icons/mapping.json.
 *
 *   node scripts/check-icon-mapping.mjs
 *
 * icons/mapping.json records, per component, which icon (or glyph, or
 * custom-drawn shape) each platform's port renders for a React component's
 * own internally-hardcoded icons (its expand chevron, its checkmark, its
 * close button — NOT a caller-supplied icon prop, which is out of scope).
 * That data was hand-verified once by reading source; this script re-checks
 * it stays true, so a component whose native icon changes gets caught in CI
 * instead of the doc silently going stale.
 *
 * Only entries with a "file" + "value" (types icon-ref / glyph / shape) are
 * checked — the literal value must still appear in that file. "absent"
 * entries (no hardcoded icon found on that platform) are informational only
 * in this version: re-verifying a negative reliably, for an arbitrary icon
 * concept, risks false failures on incidental text/wording changes elsewhere
 * in the file, which is worse than not checking it. Positive claims are the
 * ones worth gating CI on.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const mapping = JSON.parse(readFileSync(`${root}/icons/mapping.json`, "utf8"));

let checked = 0;
let failures = 0;

/** value may be a plain string, or (the severity cluster) an object of {IconName: value}. */
function valuesOf(value) {
  return typeof value === "object" && value !== null ? Object.values(value) : [value];
}

for (const icon of mapping.icons) {
  for (const comp of icon.components ?? []) {
    for (const platform of ["flutter", "swiftui", "compose"]) {
      const entry = comp[platform];
      if (!entry || entry.type === "absent") continue;
      if (!entry.file || entry.value === undefined) continue;

      const path = `${root}/${entry.file}`;
      const label = `${icon.name} / ${comp.component} / ${platform}`;
      checked += 1;

      if (!existsSync(path)) {
        console.log(`  ${label.padEnd(48)} ** FAIL ** — file no longer exists: ${entry.file}`);
        failures += 1;
        continue;
      }

      const content = readFileSync(path, "utf8");
      const missing = valuesOf(entry.value).filter((v) => !content.includes(v));
      if (missing.length) {
        console.log(
          `  ${label.padEnd(48)} ** FAIL ** — ${entry.file} no longer contains: ${missing.join(", ")}`,
        );
        failures += 1;
      }
    }
  }
}

console.log(
  `\n${failures === 0 ? "PASS" : `FAIL (${failures})`} — ${checked} recorded icon mappings` +
    (failures === 0 ? " still match source." : "; icons/mapping.json is stale, see above."),
);
process.exit(failures === 0 ? 0 : 1);
