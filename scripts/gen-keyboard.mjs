/**
 * gen-keyboard.mjs — each component's keyboard model, derived from the tests that prove it.
 *
 *   node scripts/gen-keyboard.mjs           write the generated module
 *   node scripts/gen-keyboard.mjs --check   fail if it is stale (CI)
 *
 * ── Why this is generated rather than written ───────────────────────────────
 *
 * Every component page said the same thing about keyboard support: nothing. The closest any of the 98 came
 * was a sentence deferring to the primitive — "Keyboard and ARIA behaviour is inherited from Radix" — which
 * sends an evaluator to another project's documentation to answer a question about this one. Meanwhile
 * `components-keyboard.test.tsx` holds 40 assertions that already pin the exact behaviour, run on every
 * commit, in prose a person can read:
 *
 *     it("opens with Enter, walks items with the arrow keys, closes with Escape")
 *
 * That sentence IS the documentation, and it has the one property hand-written keyboard docs never keep:
 * it cannot drift, because if the behaviour changes the test fails and if the test is deleted the entry
 * disappears on the next generation. This is the same trade `gen-verification.mjs` makes — a claim on the
 * website is only as good as the thing that would break if it stopped being true.
 *
 * So this file does NOT describe keyboard behaviour. It reports which behaviours are under test, and the
 * keys those tests actually press. A component with no keyboard test produces no entry and its page shows
 * no keyboard section — an absence is honest, and filler would not be.
 *
 * ── Rules ───────────────────────────────────────────────────────────────────
 *
 * EXPLICIT MAPPING.  A `describe` title is a test-suite name, not a component slug ("DropdownMenu",
 *                    "MultiSelect chips", "Checkbox and Switch"). The mapping below is written out, and an
 *                    unmapped describe FAILS rather than being silently skipped — otherwise renaming a
 *                    suite would quietly drop a component's keyboard documentation.
 * REAL SLUGS.        Every slug must exist in components.manifest.json, so this cannot document a component
 *                    that is not in the catalogue.
 * PAGES IN STEP.    A component with keyboard evidence must render `<ComponentKeyboard>` on its docs page,
 *                    and one without evidence must not. Generating the data is useless if nothing shows it,
 *                    and that is exactly the kind of wiring that is added once and then forgotten the next
 *                    time a component gains a test — so it is checked rather than remembered.
 * KEYS FROM SOURCE.  The key list comes from the `user.keyboard(...)` / `user.tab(...)` calls in the test
 *                    body. It is never typed by hand, so a test that stops pressing Escape stops claiming it.
 *                    These are the keys the test PRESSES, which is not the same as the keys the component
 *                    acts on: "Checkbox toggles with Space, not Enter" presses Enter precisely to prove it
 *                    does nothing. The behaviour sentence carries the meaning; the page labels the list
 *                    "keys exercised" rather than "keys supported" so the two are never confused.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const SOURCE = "packages/ui/src/components-keyboard.test.tsx";
const OUT = "apps/web/src/registry/keyboard.generated.ts";

/**
 * Suite title → the component slugs it documents.
 *
 * A suite covering two components lists both; each `it` is then attributed to whichever of them its title
 * names, which is why those titles start with the component ("Checkbox toggles with Space, not Enter").
 */
const SUITES = {
  Dialog: ["dialog"],
  DropdownMenu: ["dropdown-menu"],
  Popover: ["popover"],
  Tabs: ["tabs"],
  RadioGroup: ["radio-group"],
  "Checkbox and Switch": ["checkbox", "switch"],
  TreeView: ["tree-view"],
  MultiSelect: ["multi-select"],
  "MultiSelect chips": ["multi-select"],
  Tour: ["tour"],
  DataGrid: ["data-grid"],
  ColorPicker: ["color-picker"],
  Slider: ["slider"],
  List: ["list"],
  FileUpload: ["file-upload"],
};

/** `{ArrowDown}` → `Arrow down`, `" "` → `Space`. The words a person would say, not the event codes. */
const KEY_LABEL = {
  Enter: "Enter",
  Escape: "Escape",
  Tab: "Tab",
  Home: "Home",
  End: "End",
  " ": "Space",
  Space: "Space",
  ArrowDown: "Arrow down",
  ArrowUp: "Arrow up",
  ArrowLeft: "Arrow left",
  ArrowRight: "Arrow right",
  PageUp: "Page up",
  PageDown: "Page down",
  Backspace: "Backspace",
  Delete: "Delete",
};

/**
 * Split a source into `describe("Title", …)` blocks by brace depth.
 *
 * Suites are matched at line start only. `DataGrid` groups its cases in nested describes ("range selection
 * (opt-in)"), and those are not suites — they are part of their parent's body, whose `it` scan already picks
 * their cases up. Matching them as suites made the mapping guard reject a title that was never a component.
 */
function blocks(src, pattern) {
  const out = [];
  const re = new RegExp(pattern, "gm");
  let m;
  while ((m = re.exec(src))) {
    let depth = 0;
    let i = src.indexOf("{", m.index);
    const start = i;
    for (; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}" && --depth === 0) break;
    }
    out.push({ title: m[1], body: src.slice(start, i) });
  }
  return out;
}

/** Held modifiers read as a chord prefix: `{Control>}{End}{/Control}` is Ctrl + End, not two keys. */
const MODIFIER_LABEL = { Control: "Ctrl", Shift: "Shift", Alt: "Alt", Meta: "Cmd" };

/**
 * Extract the string argument of every `user.<name>(...)` call, with balanced parentheses.
 *
 * `user.type(within(target).getByRole("textbox"), "x{Escape}")` is why this is not a regex: the first
 * argument contains its own quoted string, so "the text between the first quotes" is `textbox`. The typed
 * sequence is the LAST string literal in the argument list.
 */
function callArguments(body, name) {
  const out = [];
  const re = new RegExp(String.raw`user\.${name}\(`, "g");
  let m;
  while ((m = re.exec(body))) {
    let depth = 0;
    let i = m.index + m[0].length - 1;
    const start = i + 1;
    for (; i < body.length; i++) {
      if (body[i] === "(") depth++;
      else if (body[i] === ")" && --depth === 0) break;
    }
    const args = body.slice(start, i);
    const strings = [...args.matchAll(/"((?:[^"\\]|\\.)*)"/g)];
    if (strings.length) out.push(strings[strings.length - 1][1]);
  }
  return out;
}

/**
 * Tokenise one user-event keyboard sequence into the shortcuts it presses.
 *
 * user-event's syntax is richer than `{Enter}`, and every form it uses here had to be handled or the page
 * would under-report what the tests prove:
 *
 *   {Enter}                       press and release
 *   {ArrowDown>}  …  {/ArrowDown} press and HOLD, then release — Radix needs a real held press for
 *                                 RadioGroup, and the naive `\{(\w+)\}` matched neither half, so that
 *                                 behaviour listed only Tab
 *   {Control>}{End}{/Control}     a chord: Ctrl + End is one shortcut, not two keys
 *   {Shift>}{ArrowLeft}{/Shift}   the same, repeated — deduplicated to one entry
 *
 * `typed` marks a `user.type(…)` sequence, where bare characters are text being typed rather than keys
 * pressed: "ff0000{Enter}" is six characters into a field and then Enter. In a `user.keyboard(…)` sequence
 * a bare space IS the Space key, which is how Checkbox and Switch are tested.
 */
function pressesIn(sequence, { typed }) {
  const presses = [];
  const held = [];
  const re = /\{\/([A-Za-z]+)\}|\{([A-Za-z]+)(>)?\d*\}|(.)/g;

  const emit = (key) => {
    const label = KEY_LABEL[key];
    if (!label) return;
    const mods = held.map((h) => MODIFIER_LABEL[h]).filter(Boolean);
    presses.push([...mods, label].join(" + "));
  };

  for (const t of sequence.matchAll(re)) {
    const [, release, key, hold, bare] = t;
    if (release) {
      const at = held.lastIndexOf(release);
      if (at !== -1) held.splice(at, 1);
      continue;
    }
    if (key) {
      if (hold && key in MODIFIER_LABEL) held.push(key);
      else emit(key);
      continue;
    }
    // A bare character. Only a keyboard() sequence presses it; type() is entering text.
    if (!typed && bare) emit(bare);
  }
  return presses;
}

/** Every shortcut a test body presses, in first-press order and without repeats. */
function keysIn(body) {
  const keys = [];
  const add = (k) => {
    if (k && !keys.includes(k)) keys.push(k);
  };

  for (const seq of callArguments(body, "keyboard")) for (const k of pressesIn(seq, { typed: false })) add(k);
  for (const seq of callArguments(body, "type")) for (const k of pressesIn(seq, { typed: true })) add(k);
  // `user.tab()` and `user.tab({ shift: true })` both press Tab; the shifted form is Shift + Tab.
  for (const m of body.matchAll(/user\.tab\(\s*(\{[^)]*\})?\s*\)/g)) {
    add(/shift:\s*true/.test(m[1] ?? "") ? "Shift + Tab" : "Tab");
  }

  return keys;
}

function build() {
  const src = readFileSync(join(root, SOURCE), "utf8");
  const manifest = JSON.parse(readFileSync(join(root, "components.manifest.json"), "utf8"));
  const known = new Set(Object.keys(manifest.components));

  const suites = blocks(src, String.raw`^describe\(\s*"([^"]+)"`);
  if (suites.length === 0) throw new Error(`${SOURCE}: no describe blocks found — has the file moved?`);

  const bySlug = {};
  for (const suite of suites) {
    const slugs = SUITES[suite.title];
    if (!slugs) {
      throw new Error(
        `${SOURCE}: describe(${JSON.stringify(suite.title)}) is not in SUITES in scripts/gen-keyboard.mjs.\n` +
          `Add it (or its component slugs) — an unmapped suite would silently drop that component's keyboard documentation.`,
      );
    }
    for (const slug of slugs) {
      if (!known.has(slug)) throw new Error(`${SOURCE}: suite ${suite.title} maps to "${slug}", which is not in components.manifest.json.`);
    }

    for (const t of blocks(suite.body, String.raw`\bit\(\s*"((?:[^"\\]|\\.)*)"`)) {
      const keys = keysIn(t.body);
      if (keys.length === 0) continue; // a focus-order test that presses nothing documents no keys
      // When one suite covers several components, an `it` belongs to the one it names.
      const named = slugs.length === 1 ? slugs : slugs.filter((s) => new RegExp(`\\b${s.replace(/-/g, "[- ]?")}\\b`, "i").test(t.title));
      for (const slug of named.length ? named : slugs) {
        (bySlug[slug] ??= []).push({ behaviour: t.title.replace(/\\"/g, '"'), keys });
      }
    }
  }

  const sorted = Object.fromEntries(Object.keys(bySlug).sort().map((k) => [k, bySlug[k]]));
  return `// GENERATED by scripts/gen-keyboard.mjs — do not edit.
//
// Each entry is a behaviour that ${SOURCE} actually asserts, with the keys that test presses. A component
// absent here has no keyboard test, and its page shows no keyboard section rather than inventing one.

export type KeyboardBehaviour = { behaviour: string; keys: string[] };

/** The test file these are derived from, shown on the page so a reader can go and check. */
export const KEYBOARD_SOURCE = ${JSON.stringify(SOURCE)};

export const KEYBOARD: Record<string, KeyboardBehaviour[]> = ${JSON.stringify(sorted, null, 2)};
`;
}

/**
 * Every component with evidence shows the section, and only those. Checked in both directions: a missing
 * section hides work that was done, and a stray one renders nothing and quietly implies it did.
 */
function checkPages(data) {
  const problems = [];
  const withEvidence = new Set(Object.keys(data));

  for (const slug of withEvidence) {
    const page = join(root, `apps/web/src/app/docs/components/${slug}/page.mdx`);
    if (!existsSync(page)) {
      problems.push(`${slug}: has keyboard evidence but no docs page at apps/web/src/app/docs/components/${slug}/page.mdx`);
      continue;
    }
    if (!readFileSync(page, "utf8").includes(`<ComponentKeyboard slug="${slug}"`)) {
      problems.push(`${slug}: has ${data[slug].length} tested behaviour(s) but its page does not render <ComponentKeyboard slug="${slug}" />`);
    }
  }

  const dir = join(root, "apps/web/src/app/docs/components");
  for (const slug of readdirSync(dir)) {
    const page = join(dir, slug, "page.mdx");
    if (!existsSync(page)) continue;
    if (readFileSync(page, "utf8").includes("<ComponentKeyboard") && !withEvidence.has(slug)) {
      problems.push(`${slug}: renders <ComponentKeyboard> but has no keyboard evidence — the section would be empty.`);
    }
  }
  return problems;
}

const next = build();
const path = join(root, OUT);
if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(path, "utf8");
  } catch {
    /* missing counts as stale */
  }
  if (current !== next) {
    console.error(`${OUT} is stale — run \`pnpm gen:keyboard\`.`);
    process.exit(1);
  }
  const data = JSON.parse(next.slice(next.indexOf("= ", next.indexOf("KEYBOARD:")) + 2).trim().replace(/;$/, ""));
  const problems = checkPages(data);
  if (problems.length) {
    console.error("Keyboard documentation is out of step with the evidence:\n  " + problems.join("\n  "));
    process.exit(1);
  }
  console.log(`gen:keyboard ok — ${OUT} is current with ${SOURCE}; ${Object.keys(data).length} component page(s) in step.`);
} else {
  writeFileSync(path, next);
  const count = (next.match(/^  "/gm) ?? []).length;
  console.log(`gen:keyboard — ${count} component(s) documented from ${SOURCE}.`);
}
