/**
 * check-story-id-negative-controls.mjs — prove `check:story-ids` actually fails.
 *
 *   pnpm build-storybook && node scripts/check-story-id-negative-controls.mjs
 *
 * `check:story-ids` is a gate that prints "ok" whether it is checking anything or not, and it exists
 * because the failure it guards against was invisible for 52 story ids at once. A gate introduced to close
 * a silent hole has to be seen failing, so this corrupts one thing at a time, runs the real command, and
 * asserts both the non-zero exit and the message — a gate that fails with the wrong message sends the next
 * person to the wrong file.
 *
 * It edits the working tree and restores it in a `finally`, verifying byte-for-byte, and refuses to start
 * if either file it touches is already dirty, so an interrupted run cannot be mistaken for an edit.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const TARGETS = {
  manifest: `${root}/components.manifest.json`,
  taxonomy: `${root}/component-taxonomy.json`,
  probe: `${root}/scripts/open-states.mjs`,
};
const original = Object.fromEntries(Object.entries(TARGETS).map(([k, p]) => [k, readFileSync(p, "utf8")]));

function runGate() {
  try {
    return { code: 0, output: execFileSync("node", ["scripts/check-story-ids.mjs"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (err) {
    return { code: err.status ?? 1, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

const CONTROLS = [
  {
    rule: "a story id that addresses nothing fails, naming the component's real stories",
    expect: /open-states\.mjs: storyId\("dialog", "Default"\) resolves to "feedback-status-dialog--default", which is not a story in the built Storybook\. That component's stories are: overlays-dialog--default\./,
    // the drift this gate exists for: the taxonomy says one category, the built Storybook was titled from another
    edit: () => {
      const t = JSON.parse(original.taxonomy);
      t.components.dialog.category = "Feedback & Status";
      writeFileSync(TARGETS.taxonomy, JSON.stringify(t, null, 2) + "\n");
    },
  },
  {
    rule: "a story name nobody wrote fails",
    expect: /storyId\("dialog", "Nonexistent"\) resolves to "overlays-dialog--nonexistent", which is not a story in the built Storybook/,
    edit: () => writeFileSync(TARGETS.probe, original.probe.replace('storyId("dialog", "Default")', 'storyId("dialog", "Nonexistent")')),
  },
  {
    rule: "a slug the manifest does not know fails where it is written",
    expect: /storyId\("dialogue", "Default"\) — No category for component "dialogue"/,
    edit: () => writeFileSync(TARGETS.probe, original.probe.replace('storyId("dialog", "Default")', 'storyId("dialogue", "Default")')),
  },
  {
    rule: "a story id written out in full is rejected, because that is the third copy of the taxonomy",
    expect: /open-states\.mjs: "overlays-dialog--default" is a story id written out in full — use storyId\(slug, story\)/,
    edit: () => writeFileSync(TARGETS.probe, original.probe.replace('storyId("dialog", "Default")', '"overlays-dialog--default"')),
  },
  {
    // The hole this closes: the first version of the check asked `entries[literal]`, so it rejected a
    // written-out id that still worked and accepted the one that had gone stale — the only case a gate is
    // needed for. A renamed category leaves exactly this behind.
    rule: "a written-out id left behind by a category rename is rejected too, and says that it addresses nothing",
    expect: /open-states\.mjs: "feedback-status-dialog--default" is a story id written out in full — use storyId\(slug, story\)\. It no longer addresses a story/,
    edit: () => writeFileSync(TARGETS.probe, original.probe.replace('storyId("dialog", "Default")', '"feedback-status-dialog--default"')),
  },
  {
    // The second hole: ids are spelled into Storybook URLs, where no quote sits beside them, so a check that
    // only reads whole string literals cannot see the place they are most often written.
    rule: "an id spelled inside a URL rather than as a whole string literal is found",
    expect: /open-states\.mjs: "overlays-dialog--default" is a story id written out in full/,
    edit: () => writeFileSync(TARGETS.probe, original.probe.replace('storyId("dialog", "Default")', '`iframe.html?id=overlays-dialog--default&viewMode=story`')),
  },
];

for (const [name, path] of Object.entries(TARGETS)) {
  const dirty = execFileSync("git", ["status", "--porcelain", path], { cwd: root, encoding: "utf8" });
  if (dirty.trim()) {
    console.error(`  ✗ ${name} (${path.replace(root, "")}) has uncommitted changes. This harness rewrites it and restores it, so it refuses to run when a failure would be indistinguishable from your own edit.`);
    process.exit(1);
  }
}

const failures = [];
try {
  const baseline = runGate();
  if (baseline.code !== 0) failures.push(`baseline: check:story-ids already fails on an unmodified tree —\n${baseline.output}`);

  for (const control of CONTROLS) {
    control.edit();
    const { code, output } = runGate();
    if (code === 0) failures.push(`${control.rule}: check:story-ids PASSED on a tree that breaks it`);
    else if (!control.expect.test(output)) {
      failures.push(`${control.rule}: failed, but not with the expected message.\n    expected ${control.expect}\n    got:\n${output.split("\n").map((l) => `      ${l}`).join("\n")}`);
    } else console.log(`  ✓ ${control.rule}`);
    for (const [k, p] of Object.entries(TARGETS)) writeFileSync(p, original[k]);
  }
} finally {
  for (const [k, p] of Object.entries(TARGETS)) writeFileSync(p, original[k]);
  for (const [k, p] of Object.entries(TARGETS)) {
    if (readFileSync(p, "utf8") !== original[k]) {
      console.error(`  ✗ ${p.replace(root, "")} was NOT restored — run \`git checkout ${p.replace(root + "/", "")}\``);
      process.exit(1);
    }
  }
}

if (failures.length) {
  console.error(failures.map((f) => `  ✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log(`check:story-id-controls ok — ${CONTROLS.length} negative controls, each one failing the real gate.`);
