/**
 * check-required-semantics.mjs — a field that must be filled in can say so, and keeps saying it.
 *
 *   node scripts/check-required-semantics.mjs
 *
 * GAP-6. Before this gate, `aria-required` appeared once in the whole repository — in an assertion
 * inside `switch-motion.test.tsx`, where a caller had happened to pass `required` through. `Field`
 * and `Form` wired `id`, `aria-describedby` and `aria-invalid` and had no notion of a required
 * field, so the only way to mark one was an asterisk typed into the label, which no screen reader
 * reads as a requirement.
 *
 * Two different things keep that from coming back, and both are checked here against the sources
 * rather than against a list somebody remembers to update:
 *
 *   1. `Field` and `Form` must wire `aria-required` from their own context. That is the contract:
 *      one declaration moves both the marker and the attribute, so they cannot drift apart.
 *
 *   2. Every control this package ships that is not a native `<input>` / `<textarea>` / `<select>`
 *      must be PROVEN to carry the state — by an assertion in a test that renders it — or be listed
 *      below with the reason it cannot. Checkbox, Switch, Select and RadioGroup get `aria-required`
 *      from Radix rather than from code here, which is exactly the kind of fact that disappears in
 *      a dependency bump: unproven, it is a rumour. An exemption is reported, never silently
 *      tolerated, so the list reads as the debt it is.
 *
 * The control set is derived, not declared: a component counts if it renders a native form element,
 * imports one of the Radix form primitives, or writes an ARIA control role itself. A new control
 * therefore arrives inside this gate on the day it is written, which is the failure mode that let
 * the original gap sit unnoticed.
 *
 * What the derivation cannot see, stated rather than hidden — and corrected on 2026-10-24, because
 * the first version of this note was wrong. `Rating`, `DatePicker`, `InputOTP` and `GuestPicker` are
 * all outside this scan, but not for one reason, and not because they carry no ARIA at all:
 *
 *   Rating       writes `role={readOnly ? "img" : "radiogroup"}`, and the match below is for the
 *                literal `role="radiogroup"`, so a conditional role is invisible here. Its stars
 *                are `aria-pressed` buttons rather than radios, which is the real defect.
 *   InputOTP     renders a native `<input>` through the `input-otp` dependency, so there is no
 *                `<input` in the file to find. `required` already reaches that input today.
 *   DatePicker   has `aria-haspopup="dialog"` and `aria-expanded` from `Popover.Trigger`, and no
 *                control role, because the control is the Calendar inside the popover.
 *   GuestPicker  the same, and its counts are `NumberInput`s — native inputs with a value always
 *                set, so there is nothing for requiredness to describe.
 *
 * Each is measured rather than assumed, and classified in
 * `/mnt/project-files/phase-b-states/aria-role-gap-classification.md`. Teaching this scan to read a
 * conditional role, and to count an `input-otp` import as native, is listed there as work. None of
 * it is fixed here. Adding a literal control role to any of them brings it into this gate
 * automatically.
 *
 * Comments are stripped before matching. A doc comment in `field.tsx` that mentions `<input>` made
 * the first draft of this script classify Field itself as a native control — the same way a doc
 * comment made `gen-registry.mjs` declare a dependency on a package named `Save`.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const COMPONENTS = join(root, "packages/ui/src/components");
const SRC = join(root, "packages/ui/src");

/** Radix primitives that are form controls. Toggle and ToggleGroup are buttons, not fields. */
const RADIX_CONTROLS = [
  "@radix-ui/react-checkbox",
  "@radix-ui/react-switch",
  "@radix-ui/react-select",
  "@radix-ui/react-radio-group",
  "@radix-ui/react-slider",
];

/** ARIA roles that can carry `aria-required`. */
const CONTROL_ROLES = ["checkbox", "switch", "radio", "radiogroup", "combobox", "spinbutton", "slider", "textbox"];

/**
 * Controls that cannot be proven here, each with the reason. Reported on every run.
 * Removing an entry without adding the proof turns the report into a failure, which is the point.
 */
const EXEMPT = {
  slider:
    "Radix's Slider emits no aria-required, and a slider always holds a value, so there is nothing to demand.",
  "comparison-slider": "A viewer control, not a field: it has no value to submit.",
  "color-picker": "No required path yet — the control accepts no such prop. GAP-6 follow-up.",
  "multi-select": "No required path yet — the control accepts no such prop. GAP-6 follow-up.",
  "time-slot-picker": "No required path yet — the control accepts no such prop. GAP-6 follow-up.",
};

const read = (p) => readFileSync(p, "utf8");

/**
 * Blank out comments, keeping string and template bodies verbatim and preserving line count.
 * Walked character by character rather than matched, because the cases that break a comment regex
 * — a `//` inside a string, a quote inside a comment, an apostrophe in prose — are all present in
 * these sources.
 */
function stripComments(code) {
  let out = "";
  for (let i = 0; i < code.length; i += 1) {
    const two = code.slice(i, i + 2);
    if (two === "//") {
      while (i < code.length && code[i] !== "\n") i += 1;
      out += "\n";
      continue;
    }
    if (two === "/*") {
      i += 2;
      while (i < code.length && code.slice(i, i + 2) !== "*/") {
        out += code[i] === "\n" ? "\n" : " ";
        i += 1;
      }
      i += 1;
      continue;
    }
    const q = code[i];
    if (q === '"' || q === "'" || q === "`") {
      out += q;
      i += 1;
      while (i < code.length && code[i] !== q) {
        if (code[i] === "\\") {
          out += code[i] + (code[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += code[i];
        i += 1;
      }
      out += q;
      continue;
    }
    out += q;
  }
  return out;
}

/** Every component source, as { name, code }. */
function components() {
  return readdirSync(COMPONENTS)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => ({ name: f.replace(/\.tsx$/, ""), code: stripComments(read(join(COMPONENTS, f))) }));
}

/**
 * Which components are proven, and by what.
 *
 * The unit of proof is the individual test, not the file: a block that both renders `<Thing>` and
 * asserts `aria-required` proves Thing. File-level matching was the first draft, and deleting one
 * assertion from a file with several left the gate green — the second negative control is that
 * measurement. A skipped test proves nothing, so `it.skip` and `it.todo` are excluded.
 */
function provenComponents() {
  const proven = new Set();
  for (const f of readdirSync(SRC)) {
    if (!/\.test\.tsx$/.test(f)) continue;
    const code = read(join(SRC, f));
    if (!code.includes("aria-required")) continue;
    const blocks = [...code.matchAll(/\bit(\.\w+)?\(/g)];
    for (let i = 0; i < blocks.length; i += 1) {
      const skipped = blocks[i][1] && blocks[i][1] !== ".each";
      const body = code.slice(blocks[i].index, blocks[i + 1]?.index ?? code.length);
      if (skipped || !body.includes("aria-required")) continue;
      for (const [, tag] of body.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) proven.add(tag);
    }
  }
  return proven;
}

/** `radio-group` → `RadioGroup`, the tag a test would render. */
const tagOf = (name) => name.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("");

const isNative = (code) => /<(input|textarea|select)\b/.test(code);
const usesRadixControl = (code) => RADIX_CONTROLS.some((mod) => code.includes(mod));
const writesControlRole = (code) =>
  CONTROL_ROLES.some((role) => code.includes(`role="${role}"`) || code.includes(`role: "${role}"`));

const failures = [];
const notes = [];

// 1 — the contract itself.
for (const part of ["field", "form"]) {
  // Stripped: the first draft read the raw file, and a doc comment mentioning the attribute kept
  // the gate green with the wiring deleted. The negative control caught it; the gate reads code.
  const code = stripComments(read(join(COMPONENTS, `${part}.tsx`)));
  if (!code.includes("aria-required")) {
    failures.push(`${part}.tsx does not wire aria-required — the required contract is gone`);
    continue;
  }
  if (!/required/.test(code)) failures.push(`${part}.tsx has no required prop`);
}

// 2 — every derived control is proven, exempt, or a failure.
const proven = provenComponents();
const COMPOSITIONS = new Set(["field", "form"]); // checked above, as the contract itself
const controls = components().filter(
  ({ name, code }) =>
    !COMPOSITIONS.has(name) && (isNative(code) || usesRadixControl(code) || writesControlRole(code)),
);

for (const { name, code } of controls) {
  if (isNative(code)) continue; // the native attribute is the path
  if (proven.has(tagOf(name))) continue;
  if (name in EXEMPT) {
    notes.push(`${name} — ${EXEMPT[name]}`);
    continue;
  }
  failures.push(
    `${name} is a control with no native <input>, no assertion that it carries aria-required, and no exemption`,
  );
}

console.log(`check:required-semantics — ${controls.length} controls derived, ${notes.length} exempt`);
for (const note of notes.sort()) console.log(`  · ${note}`);

if (failures.length) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("ok");
