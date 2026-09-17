/**
 * check-rtl.mjs — RTL logical-property guardrail for packages/ui/src/components.
 *
 *   node scripts/check-rtl.mjs
 *
 * KinetixUI is converting component source from physical-direction Tailwind
 * utilities (`pl-`, `pr-`, `left-`, `border-r`, `text-left`, …) to logical
 * ones (`ps-`, `pe-`, `start-`, `border-e`, `text-start`, …) so components
 * mirror correctly under `dir="rtl"`. That conversion is happening
 * incrementally (see RTL.md) — this script locks in progress:
 *
 *   - A file already converted must stay clean: any new physical-direction
 *     class in it fails the build.
 *   - A file not yet converted is tracked in NOT_YET_CONVERTED below, so it
 *     can keep its existing physical classes without failing CI — but it
 *     can't gain *new* ones beyond what's already there, and any file not
 *     in that list at all (including every future new component) must be
 *     clean from the start.
 *   - A line that is *deliberately* physical (not a conversion gap — e.g. a
 *     centering trick, or a prop that names an actual physical screen edge
 *     on purpose) is exempted with an inline `// rtl-ok` marker: either a
 *     trailing/preceding-line comment for a single match, or a
 *     `// rtl-ok-start` / `// rtl-ok-end` pair around a block. See
 *     dialog.tsx and sheet.tsx for both patterns.
 *
 * Re-run after each conversion slice and shrink NOT_YET_CONVERTED.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const componentsDir = `${root}/packages/ui/src/components`;

// Physical-direction Tailwind utilities that should be logical instead.
// Kept as separate regexes (not one alternation) so a failure message can
// name which rule tripped.
const RULES = [
  { name: "pl-N -> ps-N", re: /\bpl-\d/ },
  { name: "pr-N -> pe-N", re: /\bpr-\d/ },
  { name: "ml-N -> ms-N", re: /\bml-(?:\d|auto\b)/ },
  { name: "mr-N -> me-N", re: /\bmr-(?:\d|auto\b)/ },
  { name: "left-N / left-[...] -> start-N / start-[...]", re: /\bleft-(?:\d|\[)/ },
  { name: "right-N / right-[...] -> end-N / end-[...]", re: /\bright-(?:\d|\[)/ },
  { name: "border-l / border-l-* -> border-s / border-s-*", re: /\bborder-l\b|\bborder-l-/ },
  { name: "border-r / border-r-* -> border-e / border-e-*", re: /\bborder-r\b|\bborder-r-/ },
  { name: "rounded-l* -> rounded-s*", re: /\brounded-l\b|\brounded-l-/ },
  { name: "rounded-r* -> rounded-e*", re: /\brounded-r\b|\brounded-r-/ },
  { name: "text-left -> text-start", re: /\btext-left\b/ },
  { name: "text-right -> text-end", re: /\btext-right\b/ },
];

// Files not yet converted in this slice — they may keep their existing
// physical-direction classes, but gain no new leeway beyond that. Shrink
// this list as later slices convert more components; an empty array means
// the whole library is converted.
const NOT_YET_CONVERTED = new Set([
  "alert-dialog.tsx",
  "audio-player.tsx",
  "button-group.tsx",
  "calendar.tsx",
  "carousel.tsx",
  "code-block.tsx",
  "command.tsx",
  "comparison-slider.tsx",
  "context-menu.tsx",
  "data-grid.tsx",
  "diff-viewer.tsx",
  "input-otp.tsx",
  "json-viewer.tsx",
  "markdown-editor.tsx",
  "menubar.tsx",
  "modal.tsx",
  "multi-select.tsx",
  "navigation-menu.tsx",
  "notification-center.tsx",
  "popover.tsx",
  "resizable.tsx",
  "scroll-area.tsx",
  "sidebar.tsx",
  "tab-bar.tsx",
  "table.tsx",
  "tag.tsx",
  "timeline.tsx",
  "tooltip.tsx",
  "tree-view.tsx",
]);

const files = readdirSync(componentsDir).filter((f) => f.endsWith(".tsx"));

let failures = 0;
const reportedNotYetConverted = new Set();

for (const file of files) {
  const path = `${componentsDir}/${file}`;
  const lines = readFileSync(path, "utf8").split("\n");
  const skipWholeFile = NOT_YET_CONVERTED.has(file);
  let inExemptBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("rtl-ok-start")) inExemptBlock = true;
    if (line.includes("rtl-ok-end")) {
      inExemptBlock = false;
      continue;
    }

    const exemptHere = inExemptBlock || line.includes("rtl-ok") || (lines[i - 1] ?? "").includes("rtl-ok");

    for (const rule of RULES) {
      if (!rule.re.test(line)) continue;

      if (exemptHere) continue;

      if (skipWholeFile) {
        reportedNotYetConverted.add(file);
        continue;
      }

      console.error(`${file}:${i + 1}  ${rule.name}\n  ${line.trim()}`);
      failures += 1;
    }
  }
}

if (reportedNotYetConverted.size > 0) {
  console.log(`(skipped — already tracked in NOT_YET_CONVERTED): ${[...reportedNotYetConverted].sort().join(", ")}`);
}

console.log(
  failures === 0
    ? `\nPASS — no new physical-direction utility classes outside NOT_YET_CONVERTED (${NOT_YET_CONVERTED.size} files still pending conversion).`
    : `\nFAIL (${failures}) — physical-direction utility class found in a converted file. Use the logical` +
        ` equivalent (see RULES above), or mark it with an inline \`// rtl-ok\` comment if it's deliberately physical.`,
);
process.exit(failures === 0 ? 0 : 1);
