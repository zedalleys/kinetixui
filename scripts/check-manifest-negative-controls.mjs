/**
 * check-manifest-negative-controls.mjs — prove `check:manifest` actually fails.
 *
 *   node scripts/check-manifest-negative-controls.mjs
 *
 * A gate that has never been seen to fail is a gate nobody can trust. `check:manifest` grew a taxonomy
 * schema, an enum, a duplicate-slug check and a fixed-point check on the generated data (CAT-2), and all of
 * those are invisible while the tree is correct: the command prints "ok" either way, whether it is validating
 * or quietly doing nothing. This harness corrupts `components.manifest.json` one way at a time, runs the real
 * `check:manifest`, and asserts both that it exits non-zero and that it says which entry and which rule — a
 * gate that fails with the wrong message sends the next person to the wrong file.
 *
 * It corrupts the working-tree file in place and restores it in a `finally`, verifying byte-for-byte that the
 * original is back. That is deliberate: the proof has to be the real command on the real path, not a copy run
 * under an override the production gate does not have. Nothing is committed, and the harness refuses to start
 * if the manifest is already dirty, so an interrupted run can never be mistaken for an edit.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const MANIFEST = `${root}/components.manifest.json`;
const original = readFileSync(MANIFEST, "utf8");

/** The gate as CI runs it. Returns its exit code and everything it printed. */
function runGate() {
  try {
    const stdout = execFileSync("node", ["scripts/gen-manifest.mjs", "--check"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, output: stdout };
  } catch (err) {
    return { code: err.status ?? 1, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

/**
 * Each control names the rule it exercises, how to break it, and what the failure must say.
 *
 * `edit` mutates the parsed manifest; `editText` mutates the raw text, for the things JSON cannot express —
 * a duplicate key is lost by `JSON.parse`, which is exactly why the gate has to read the text too.
 */
const CONTROLS = [
  {
    rule: "a component must declare a category",
    expect: /button: has no category/,
    edit: (m) => delete m.components.button.category,
  },
  {
    rule: "a category must be one of the declared ones",
    expect: /button: category "Widgets" is not in categoryDefinitions/,
    edit: (m) => (m.components.button.category = "Widgets"),
  },
  {
    rule: "the taxonomy itself must be declared",
    expect: /missing top-level key "categoryDefinitions"/,
    edit: (m) => delete m.categoryDefinitions,
  },
  {
    rule: "a category needs a rule an assignment can be argued with",
    expect: /categoryDefinitions\["Navigation"\]: needs a "rule"/,
    edit: (m) => (m.categoryDefinitions.Navigation = { rule: "stuff" }),
  },
  {
    rule: "a misspelled key is an error, not a field the gate ignores",
    expect: /button: unknown key "catagory"/,
    edit: (m) => {
      m.components.button.catagory = m.components.button.category;
    },
  },
  {
    rule: "a component must declare a kind",
    expect: /button: has no kind/,
    edit: (m) => delete m.components.button.kind,
  },
  {
    rule: "kind is an enum",
    expect: /button: kind must be "component" or "recipe", not "block"/,
    edit: (m) => (m.components.button.kind = "block"),
  },
  {
    rule: "a facet must be one of the declared ones",
    expect: /button: unknown facet "fancy"/,
    edit: (m) => (m.components.button.facets = ["fancy"]),
  },
  {
    rule: "facets must not repeat a value",
    expect: /button: facets repeats a value/,
    edit: (m) => (m.components.button.facets = ["composed", "composed"]),
  },
  {
    rule: "kind and the published prose must agree",
    expect: /button: is kind "recipe" but its platformNote does not say "not a component"/,
    edit: (m) => (m.components.button.kind = "recipe"),
  },
  {
    rule: "the generated taxonomy must be a fixed point of the manifest",
    expect: /component-taxonomy\.json is stale/,
    // a VALID change, left ungenerated: nothing about the manifest is wrong, only the committed output
    edit: (m) => (m.components.button.category = "Navigation"),
  },
  {
    rule: "a former label must not also be a current category",
    expect: /categoryDefinitions\["Navigation"\]: formerly lists "Overlays", which is itself a current category/,
    edit: (m) => (m.categoryDefinitions.Navigation.formerly = ["Overlays"]),
  },
  {
    rule: "two categories must not claim the same former label",
    expect: /formerly lists "Form Inputs", already claimed by "Forms & Inputs"/,
    edit: (m) => (m.categoryDefinitions.Navigation.formerly = ["Form Inputs"]),
  },
  {
    rule: "a slug declared twice loses one copy, so it must fail",
    expect: /button: appears twice in components/,
    editText: (text) => {
      const start = text.indexOf('    "button": {');
      const end = text.indexOf("\n    },\n", start) + "\n    },\n".length;
      return text.slice(0, end) + text.slice(start, end) + text.slice(end);
    },
  },
  {
    rule: "the manifest and the evidence file must not contradict each other",
    expect: /button: verification\.json records Flutter evidence, but the manifest does not list Flutter/,
    edit: (m) => (m.components.button.platforms = m.components.button.platforms.filter((p) => p !== "Flutter")),
  },
];

const dirty = execFileSync("git", ["status", "--porcelain", "components.manifest.json"], { cwd: root, encoding: "utf8" });
if (dirty.trim()) {
  console.error(
    `  ✗ components.manifest.json has uncommitted changes. This harness rewrites that file and restores it, ` +
      `so it refuses to run when a failure would be indistinguishable from your own edit.`,
  );
  process.exit(1);
}

const failures = [];
try {
  // the control group: the gate must pass on the tree as it stands, or every failure below proves nothing
  const baseline = runGate();
  if (baseline.code !== 0) {
    failures.push(`baseline: check:manifest already fails on an unmodified manifest —\n${baseline.output}`);
  }

  for (const control of CONTROLS) {
    if (control.editText) {
      writeFileSync(MANIFEST, control.editText(original));
    } else {
      const m = JSON.parse(original);
      control.edit(m);
      writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + "\n");
    }
    const { code, output } = runGate();
    if (code === 0) {
      failures.push(`${control.rule}: check:manifest PASSED on a manifest that breaks it`);
    } else if (!control.expect.test(output)) {
      failures.push(
        `${control.rule}: check:manifest failed, but not with the expected message.\n` +
          `    expected ${control.expect}\n    got:\n${output.split("\n").map((l) => `      ${l}`).join("\n")}`,
      );
    } else {
      console.log(`  ✓ ${control.rule}`);
    }
  }
} finally {
  writeFileSync(MANIFEST, original);
  if (readFileSync(MANIFEST, "utf8") !== original) {
    console.error("  ✗ components.manifest.json was NOT restored — run `git checkout components.manifest.json`");
    process.exit(1);
  }
}

if (failures.length) {
  console.error(failures.map((f) => `  ✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log(`check:manifest-controls ok — ${CONTROLS.length} negative controls, each one failing the real gate.`);
