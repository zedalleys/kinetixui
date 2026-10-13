/**
 * check-rtl.mjs — RTL logical-property guardrail for packages/ui/src/components, and for the website
 * files listed in WEB_CONVERTED.
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
  // `space-x-*` compiles to a physical margin-left (plus a reverse variable), so under RTL the gap
  // lands on the outside of the pair instead of between them and the children touch. `gap-*` is the
  // direction-agnostic equivalent. This rule exists because a review caught three already-"converted"
  // overlay footers that the guard had been passing.
  { name: "space-x-N -> gap-N", re: /\bspace-x-\d/ },
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
  "audio-player.tsx",
  "button-group.tsx",
  "carousel.tsx",
  "code-block.tsx",
  "comparison-slider.tsx",
  "data-grid.tsx",
  "diff-viewer.tsx",
  "json-viewer.tsx",
  "markdown-editor.tsx",
  "notification-center.tsx",
  "resizable.tsx",
  "scroll-area.tsx",
  "sidebar.tsx",
  "tab-bar.tsx",
  "table.tsx",
  "tree-view.tsx",
]);

/**
 * Website files held to the same rule. Unlike the library, apps/web is not converted file by file on a schedule;
 * a file is listed here once a change has made it direction-correct, so that it stays that way. These are the
 * surfaces the web quality pass touched for RTL — the gallery card and its thumbnails, platform badges, the
 * section and page headers, the docs breadcrumb and the copy button.
 */
const WEB_CONVERTED = [
  "apps/web/src/components/component-gallery.tsx",
  "apps/web/src/components/component-thumbnails.tsx",
  "apps/web/src/components/copy-button.tsx",
  "apps/web/src/components/platform-badges.tsx",
  "apps/web/src/components/site-header.tsx",
  "apps/web/src/components/section-head.tsx",
  "apps/web/src/components/docs-breadcrumb.tsx",
];

const files = readdirSync(componentsDir).filter((f) => f.endsWith(".tsx"));

let failures = 0;
const reportedNotYetConverted = new Set();

function scan(path, label, skipWholeFile) {
  const lines = readFileSync(path, "utf8").split("\n");
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
        reportedNotYetConverted.add(label);
        continue;
      }

      console.error(`${label}:${i + 1}  ${rule.name}\n  ${line.trim()}`);
      failures += 1;
    }
  }
}

for (const file of files) scan(`${componentsDir}/${file}`, file, NOT_YET_CONVERTED.has(file));
for (const rel of WEB_CONVERTED) scan(`${root}/${rel}`, rel, false);

if (reportedNotYetConverted.size > 0) {
  console.log(`(skipped — already tracked in NOT_YET_CONVERTED): ${[...reportedNotYetConverted].sort().join(", ")}`);
}

console.log(
  failures === 0
    ? `\nPASS — no new physical-direction utility classes outside NOT_YET_CONVERTED (${NOT_YET_CONVERTED.size} files still pending conversion), ` +
        `and none in the ${WEB_CONVERTED.length} website files held to the rule.`
    : `\nFAIL (${failures}) — physical-direction utility class found in a converted file. Use the logical` +
        ` equivalent (see RULES above), or mark it with an inline \`// rtl-ok\` comment if it's deliberately physical.`,
);
process.exit(failures === 0 ? 0 : 1);
