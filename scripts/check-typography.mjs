/**
 * check-typography.mjs — components must use the type-scale aliases
 * (`text-label-md`, `text-body-md`, …), not re-derive them from literals.
 *
 *   node scripts/check-typography.mjs
 *
 * Flags arbitrary `text-[Npx]` font sizes and `tracking-[…px]` letter-spacing in
 * packages/ui/src/components. The scale lives in tailwind.config.ts (mirrors
 * tokens/semantic/typography.json). A line that genuinely has no scale
 * equivalent is exempted with a trailing `// type-ok` marker or listed in
 * ALLOWED below (existing one-offs; the list may only shrink).
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dir = `${root}/packages/ui/src/components`;
const RE = /text-\[\d+(?:\.\d+)?px\]|tracking-\[[^\]]*px\]/g;

// file → count of pre-existing literals with no matching scale step.
const ALLOWED = {
  "app-bar.tsx": 1, // 15px brand title
  "description-list.tsx": 1, // 10px mono caps term
  "markdown-editor.tsx": 1, // 13px mono editor text
  "tab-bar.tsx": 1, // 10px badge
};

const errors = [];
for (const f of readdirSync(dir).filter((n) => n.endsWith(".tsx"))) {
  const lines = readFileSync(`${dir}/${f}`, "utf8").split("\n");
  let n = 0;
  lines.forEach((line, i) => {
    if (line.includes("type-ok")) return;
    const m = line.match(RE);
    if (m) {
      n += m.length;
      if (n > (ALLOWED[f] ?? 0)) errors.push(`${f}:${i + 1}: ${m.join(" ")} — use a text-<style> alias`);
    }
  });
  if (n < (ALLOWED[f] ?? 0)) errors.push(`${f}: allowlist is stale (${n} literals, allowed ${ALLOWED[f]}) — lower it in check-typography.mjs`);
}
if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log("check:typography ok");
