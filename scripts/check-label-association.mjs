/**
 * check-label-association.mjs — a field's visible label has to name the field.
 *
 * The defect this exists for: `DatePicker` rendered its `label` prop as a bare `<label>` with no
 * `htmlFor`, beside a trigger that carried no naming attribute. Visually it was a labelled field;
 * in the accessibility tree the label was associated with nothing, and the trigger's name was
 * "Select date". Nothing caught it — `axe` cannot, because the trigger HAS an accessible name, it
 * is just the wrong one, and a missing association is not a missing name.
 *
 * Two rules, both derived from the sources rather than from a list someone keeps up to date.
 *
 *   1. No component renders a `<label>` without `htmlFor`. A `<label>` with no `for` and no control
 *      nested inside it labels nothing at all; it is a styled <span> that claims to be a label.
 *      This rule has no exemptions, because there is no case for one.
 *
 *   2. A component that declares a visible `label` prop and renders it must be PROVEN to put that
 *      label in its control's accessible name, by a test that renders it with a label and asserts a
 *      role name — or be listed below with the reason it cannot. Proof rather than inspection,
 *      because an association is three pieces (an id, a reference, and the right element) and
 *      reading two of them tells you nothing: `DateRangeInput` and `GuestPicker` were already
 *      correct, and the only way to know that is to read the computed name.
 *
 * The unit of proof is one `it(...)` block, which must both render the component with a `label` and
 * assert a `name:`; `it.skip` proves nothing. What this cannot tell, stated rather than left to be
 * discovered: a block that renders the component with a label and asserts a `name:` for some OTHER
 * element in the same block counts as proof here. The gate's claim is therefore "somebody read a
 * computed name while this component was on screen with a label", which is weaker than "this
 * component's own name contains its label" — the latter is what the test file has to mean, and a
 * reviewer still has to read it. Counting per FILE would let a file with several
 * assertions lose one and stay green — the defect the GAP-6 gate's second negative control found.
 * Comments are stripped before any matching, for the same reason that gate strips them: a doc
 * comment mentioning `<label>` or `aria-labelledby` is prose, not code, and a scanner that reads
 * prose as code is not reading code.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const componentsDir = join(root, "packages/ui/src/components");
const testDir = join(root, "packages/ui/src");

/**
 * Components whose `label` is not a field label. Each needs a reason, not a name on a list.
 */
const EXEMPT = {
  "circular-progress":
    "`label` overrides the visible text INSIDE the ring, which is a `progressbar` named by its own `aria-label` and valued by `aria-valuenow`. It names nothing.",
  metric:
    "the metric's own caption. `Metric` is text — there is no control for a label to name, and the caption is read in document order.",
  "price-breakdown":
    "a line's name in a table of amounts. Text, not a control; the name and the amount are adjacent cells.",
  "tab-bar":
    "the label IS the tab's visible text, so it becomes that tab's accessible name from its contents — there is nothing to associate it with.",
  spinner:
    "the loading status's own name: it is already the `aria-label` of the `role=\"status\"`, and the visible copy is `sr-only`.",
};

/** Strip block and line comments, so prose never matches as code. */
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

const tagOf = (name) => name.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join("");

const componentFiles = readdirSync(componentsDir).filter((f) => f.endsWith(".tsx"));
const failures = [];

// ── Rule 1: a <label> that labels nothing ────────────────────────────────────────────────────────
for (const file of componentFiles) {
  const code = stripComments(readFileSync(join(componentsDir, file), "utf8"));
  for (const match of code.matchAll(/<label\b[^>]*>/g)) {
    const tag = match[0];
    if (/\bhtmlFor=/.test(tag)) continue;
    // A <label> wrapping its own control is also valid association, so allow a nested control.
    const after = code.slice(match.index, code.indexOf("</label>", match.index));
    if (/<(input|select|textarea|button)\b/.test(after)) continue;
    failures.push(
      `${file}: <label> with no htmlFor and no control inside it — it labels nothing:\n      ${tag.trim()}`,
    );
  }
}

// ── Rule 2: a rendered `label` prop must be proven to name the control ───────────────────────────
/** Every `it(...)` block that renders <Tag … label …> and asserts a name. */
function provenTags() {
  const proven = new Set();
  const files = readdirSync(testDir).filter((f) => f.endsWith(".test.tsx"));
  for (const file of files) {
    const code = stripComments(readFileSync(join(testDir, file), "utf8"));
    const starts = [...code.matchAll(/\bit(\.skip|\.todo)?\s*\(/g)];
    for (let i = 0; i < starts.length; i += 1) {
      const skipped = Boolean(starts[i][1]);
      const body = code.slice(starts[i].index, starts[i + 1]?.index ?? code.length);
      if (skipped || !/name:\s*/.test(body)) continue;
      for (const render of body.matchAll(/<([A-Z][A-Za-z]*)\b[^>]*\blabel=/g)) proven.add(render[1]);
    }
  }
  return proven;
}

const proven = provenTags();
const derived = [];

for (const file of componentFiles) {
  const name = file.replace(/\.tsx$/, "");
  const code = stripComments(readFileSync(join(componentsDir, file), "utf8"));
  const declares = /^\s*(?:readonly\s+)?label\??:/m.test(code);
  // `{label}` as CHILDREN, not as an attribute value: `aria-label={label}` is the label already
  // reaching the accessibility tree, and a label that is never rendered visibly is not this rule's
  // subject. Without this, `markdown-editor` — which only ever passes `label` to `aria-label` on a
  // toolbar button — is reported as an unassociated field label, which it is not. `${label}` is
  // excluded for the same reason: in `markdown-editor` it is a capture group inside a link-rendering
  // template string, nothing to do with a field label.
  const renders = /(^|[^=$])\{label\b/.test(code);
  if (!declares || !renders) continue;
  derived.push(name);
  if (EXEMPT[name]) continue;
  if (proven.has(tagOf(name))) continue;
  failures.push(
    `${name} renders a visible \`label\` prop with no test that asserts it reaches the control's accessible name.\n` +
      `      Add an \`it(...)\` that renders <${tagOf(name)} label="…"> and asserts \`{ name: … }\`, or exempt it with a reason.`,
  );
}

if (failures.length > 0) {
  console.error("check:label-association failed\n");
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error("");
  process.exit(1);
}

console.log(
  `label association ok — ${componentFiles.length} components scanned for an unassociated <label>; ` +
    `${derived.length} render a \`label\` prop, ${Object.keys(EXEMPT).length} exempt.`,
);
for (const [name, reason] of Object.entries(EXEMPT)) console.log(`  · ${name} — ${reason}`);
