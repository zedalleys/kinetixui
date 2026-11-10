/**
 * Negative controls for `node scripts/gen-registry.mjs --check`.
 *
 * ## What the gate is for, and why it needs controls
 *
 * `registry/kinetixui/ui/*.tsx` are copies of `packages/ui/src/components/*.tsx`, and the copy is what a
 * consumer receives from `npx @kinetixui/cli add <name>`. CI's `Generated files in sync` step already
 * catches a copy whose content drifted, because the `build` job regenerates and then `git diff`s. It does
 * NOT catch an omission: `git diff` is silent about untracked files, so a new mirror file that was generated
 * and never `git add`ed leaves `registry.json` declaring a path the repository does not carry, with CI green.
 * Reproduced on `25e0bdff` in a scratch worktree before `--check` was written.
 *
 * A gate added for a hole has to be shown failing in that hole, or it is a comment with an exit code. The
 * four controls below are the four distinct ways the committed registry can disagree with its source, and
 * each asserts the gate names the offending FILE — an exit code alone would not tell an author what to fix.
 *
 * ## Why nothing on disk is at risk
 *
 * `--check` writes nothing by construction, and these controls never mutate the repository. Each one copies
 * only the three trees the generator reads — `packages/ui/src/components`, `registry/kinetixui`,
 * `registry/registry.json` — into a fresh directory under the OS temp dir, mutates THAT, and points the
 * generator at it through its injectable root. The copy is removed afterwards whether the control passed or
 * not. So the suite is safe to run over a dirty tree and cannot leave one.
 *
 *   node scripts/registry-fixed-point-negative-controls.mjs
 */
import { cpSync, mkdtempSync, rmSync, readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { registryDrift, buildRegistry } from "./gen-registry.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** A real component with a committed mirror. If it stops being one, every control below is testing nothing. */
const SUBJECT = "tabs.tsx";
const SUBJECT_SRC = `packages/ui/src/components/${SUBJECT}`;
const SUBJECT_MIRROR = `registry/kinetixui/ui/${SUBJECT}`;

/**
 * Control 4 of the brief: the suite must refuse to pass if its own target is gone. Asserted FIRST, against
 * the real repository, because a renamed or deleted `tabs.tsx` would otherwise make controls 1 and 2 mutate
 * a file they created themselves and "catch" drift they invented.
 */
function assertSubjectExists() {
  const missing = [SUBJECT_SRC, SUBJECT_MIRROR].filter((p) => !existsSync(join(ROOT, p)));
  if (missing.length) {
    console.error(
      `registry fixed-point controls — the subject this suite mutates is gone: ${missing.join(", ")}.\n` +
        `Point SUBJECT at a component that still has a committed mirror. Refusing to report a pass: ` +
        `the controls below would be mutating files they invented.`,
    );
    process.exit(1);
  }
  const { outputs } = buildRegistry();
  if (!outputs.has(SUBJECT_MIRROR)) {
    console.error(
      `registry fixed-point controls — the generator no longer produces ${SUBJECT_MIRROR}, so mutating it ` +
        `would prove nothing. Refusing to report a pass.`,
    );
    process.exit(1);
  }
}

/** A throwaway root holding only what the generator reads, so a mutation cannot reach the repository. */
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), "kx-registry-control-"));
  cpSync(join(ROOT, "packages/ui/src/components"), join(dir, "packages/ui/src/components"), { recursive: true });
  cpSync(join(ROOT, "registry/kinetixui"), join(dir, "registry/kinetixui"), { recursive: true });
  cpSync(join(ROOT, "registry/registry.json"), join(dir, "registry/registry.json"));
  return dir;
}

const controls = [
  {
    name: "a generated mirror edited away from its source",
    expect: { status: "stale", path: SUBJECT_MIRROR },
    mutate(dir) {
      const p = join(dir, SUBJECT_MIRROR);
      writeFileSync(p, readFileSync(p, "utf8") + "\n// control: the mirror was edited by hand\n");
    },
  },
  {
    name: "source changed, generated output left stale",
    expect: { status: "stale", path: SUBJECT_MIRROR },
    mutate(dir) {
      const p = join(dir, SUBJECT_SRC);
      writeFileSync(p, readFileSync(p, "utf8") + "\n// control: the source moved on\n");
    },
  },
  {
    // The hole the gate was added for: the mirror exists in the author's worktree and not in the commit.
    name: "a declared mirror absent from the repository (the untracked-file hole)",
    expect: { status: "missing", path: SUBJECT_MIRROR },
    mutate(dir) {
      unlinkSync(join(dir, SUBJECT_MIRROR));
    },
  },
  {
    name: "a mirror no source component accounts for (deleted or renamed component)",
    expect: { status: "orphan", path: "registry/kinetixui/ui/control-orphan.tsx" },
    mutate(dir) {
      writeFileSync(join(dir, "registry/kinetixui/ui/control-orphan.tsx"), "export const Orphan = () => null\n");
    },
  },
];

assertSubjectExists();

// The clean control. A suite of failures proves a gate is noisy, not that it is right: the same gate has to
// pass on the tree as committed, or every failure below is just the gate failing always.
const cleanSandbox = sandbox();
let failures = 0;
try {
  const clean = registryDrift(cleanSandbox);
  if (clean.length === 0) {
    console.log("  ✓ an unmutated copy of the committed trees passes");
  } else {
    failures++;
    console.error(
      `  ✗ an unmutated copy of the committed trees FAILED, reporting ${clean
        .map((d) => `${d.status} ${d.path}`)
        .join(", ")} — the controls below cannot be read as evidence until this passes`,
    );
  }
} finally {
  rmSync(cleanSandbox, { recursive: true, force: true });
}

for (const control of controls) {
  const dir = sandbox();
  try {
    control.mutate(dir);
    const drift = registryDrift(dir);
    const hit = drift.find((d) => d.status === control.expect.status && d.path === control.expect.path);
    if (!hit) {
      failures++;
      console.error(
        `  ✗ ${control.name} — expected \`${control.expect.status} ${control.expect.path}\`, got ` +
          (drift.length ? drift.map((d) => `${d.status} ${d.path}`).join(", ") : "a clean result"),
      );
    } else if (drift.length !== 1) {
      // Not fatal, but worth printing: a control that trips several rules at once is not isolating the one
      // it claims to test.
      console.log(`  ✓ ${control.name} (also reported: ${drift.filter((d) => d !== hit).map((d) => `${d.status} ${d.path}`).join(", ")})`);
    } else {
      console.log(`  ✓ ${control.name}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (failures) {
  console.error(`\nregistry fixed-point controls — ${failures} control(s) did not fire. The gate is not load-bearing.`);
  process.exit(1);
}
console.log(
  "\nregistry fixed-point controls — all 4 fire, and the unmutated tree passes. A mirror cannot be edited by " +
    "hand, fall behind its source, go missing from the repository, or outlive its component without " +
    "`gen-registry.mjs --check` naming the file.",
);
