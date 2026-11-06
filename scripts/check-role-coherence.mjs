/**
 * check-role-coherence.mjs — a group that claims one choice has to hold choices.
 *
 * The defect this exists for: `Rating` declared `role="radiogroup"` and rendered five independent
 * `<button aria-pressed>` stars inside it. Every piece looked right on its own — the group had a
 * role and a name, each star had a label and a pressed state — and together they said something
 * impossible: a one-of-N group in which nothing is ever checked, and in which a screen reader can
 * announce no position ("3 of 5"). `axe` is green on it, because no individual rule is broken.
 *
 * So the rule is about the PAIR, which is the part no per-element check looks at:
 *
 *   a component that writes a `radiogroup` role must contain radios — `type="radio"` or
 *   `role="radio"` — and must not use `aria-pressed`, which is a toggle button's state and cannot
 *   describe one choice out of several.
 *
 * Deliberately narrow. It is one role pair, the one that was wrong, rather than a general ARIA
 * validator: the point of a gate in this repository is that it fails for a reason someone can act
 * on, and a role matrix nobody maintains fails for reasons nobody reads.
 *
 * What it does not cover, stated rather than implied:
 *
 *   · Only `packages/ui/src/components`, where one file is one component family. The Angular
 *     package bundles several components per file — `forms.ts` holds both a radio group and a
 *     toggle — so a file-level rule there would report a contradiction between two unrelated
 *     components. Angular's `kx-rating` is the implementation this rule was written from, and it is
 *     asserted in a real browser by `scripts/angular-browser.mjs` instead.
 *   · The other role pairs with the same shape (`tablist`/`tab`, `listbox`/`option`,
 *     `menu`/`menuitem`) are not checked. Adding one is a line each, and should be done when a
 *     defect justifies it rather than pre-emptively.
 *
 * Comments are stripped first. `rating.tsx` describes its own old defect in prose — "it used to
 * render `aria-pressed` BUTTONS inside that radiogroup" — and a scanner that reads prose as code
 * would fail the file for documenting the very thing it fixed.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const componentsDir = join(root, "packages/ui/src/components");

/** Strip block and line comments, leaving string contents intact. */
function stripComments(code) {
  let out = "";
  let i = 0;
  let inBlock = false;
  let inLine = false;
  let inString = null;
  while (i < code.length) {
    const two = code.slice(i, i + 2);
    if (inBlock) {
      if (two === "*/") { inBlock = false; i += 2; continue; }
      i += 1; continue;
    }
    if (inLine) {
      if (code[i] === "\n") { inLine = false; out += "\n"; }
      i += 1; continue;
    }
    if (inString) {
      if (code[i] === "\\") { out += code.slice(i, i + 2); i += 2; continue; }
      if (code[i] === inString) inString = null;
      out += code[i]; i += 1; continue;
    }
    if (two === "/*") { inBlock = true; i += 2; continue; }
    if (two === "//") { inLine = true; i += 2; continue; }
    if (code[i] === '"' || code[i] === "'" || code[i] === "`") { inString = code[i]; out += code[i]; i += 1; continue; }
    out += code[i];
    i += 1;
  }
  return out;
}

const failures = [];
let groups = 0;

for (const file of readdirSync(componentsDir).filter((f) => f.endsWith(".tsx"))) {
  const code = stripComments(readFileSync(join(componentsDir, file), "utf8"));
  // The role may be written through a ternary — `role={readOnly ? "img" : "radiogroup"}` — so the
  // quoted role is matched wherever it appears in code, not only as `role="radiogroup"`. Matching
  // the literal attribute is how the required-semantics gate missed this component entirely.
  if (!/["']radiogroup["']/.test(code)) continue;
  groups += 1;
  const hasRadios = /type=["']radio["']/.test(code) || /["']radio["']/.test(code);
  if (!hasRadios) {
    failures.push(
      `${file}: claims a radiogroup but contains no radio — a group of one choice with nothing to choose.`,
    );
  }
  if (/aria-pressed/.test(code)) {
    failures.push(
      `${file}: a radiogroup whose children carry aria-pressed. That is a toggle button's state; it` +
        ` cannot say which one of the group is chosen, and nothing in the group is ever checked.`,
    );
  }
}

if (failures.length > 0) {
  console.error("check:role-coherence failed\n");
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error("");
  process.exit(1);
}

console.log(`role coherence ok — ${groups} component(s) claim a radiogroup, each holding real radios and no aria-pressed.`);
