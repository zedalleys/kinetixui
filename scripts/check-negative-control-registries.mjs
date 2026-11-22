#!/usr/bin/env node
/**
 * check-negative-control-registries.mjs — the gate over the negative controls themselves.
 *
 *   node scripts/check-negative-control-registries.mjs                   run every check
 *   node scripts/check-negative-control-registries.mjs --negative=<id>   require one check to fail
 *   node scripts/check-negative-control-registries.mjs --list-negatives
 *
 * The defect it exists for. A negative control is the only thing that distinguishes a gate that
 * passes from a gate that cannot fail, so the controls are the load-bearing half of this
 * repository's CI. Nothing checked them. Three ways they rot, all three measured on
 * `6b1c990e` before this gate was written:
 *
 *   1. THE LIST GOES EMPTY AND THE STEP STAYS GREEN. `for control in $(node x --list-negatives)`
 *      discards the command substitution's exit status, so a script that errors and writes only to
 *      stderr yields an empty word list, the loop body never runs, and the step exits 0 having
 *      asserted nothing. Reproduced at the real call site: with `js-yaml` absent,
 *      `check-native-publish-preflight.mjs --list-negatives` crashes with 17 lines of stderr and
 *      prints nothing, and the verbatim step body from `ci.yml` exits 0 with zero controls run.
 *      Filed as #516; repaired in #542, which this gate turns from a repair into an invariant.
 *
 *   2. A REGISTRY IS DRIVEN BY NOTHING. `scripts/adoption/pm-matrix.mjs` declares seven negative
 *      controls and is named by no workflow, no `package.json` alias, no turbo task and no other
 *      script. `scripts/seo-negative-controls.mjs` was in the same state until #625. A control that
 *      runs nowhere is indistinguishable from a control that does not exist.
 *
 *   3. A HAND-COPIED MATRIX DRIFTS FROM ITS SCRIPT. Four workflows drive their controls through a
 *      literal `strategy.matrix.control` list, which is a second copy of the script's registry with
 *      nothing holding the two together. All four were measured in sync on `6b1c990e`, so this is
 *      latent rather than live — but a control added to a script and not to the matrix would never
 *      run, and the counting guard from (1) cannot see it, because `-lt 1` catches a registry that
 *      was emptied and not a control that was deleted. #516 names that gap and leaves it open.
 *
 * What this gate does NOT do: it does not run any other gate's controls, and it does not judge
 * whether a control is a good one. It checks that every declared control is reachable from CI and
 * that nothing can quietly stop executing. One rule, one gate.
 *
 * Every mutation this gate performs on itself is performed on an in-memory copy of the parsed
 * workflow or the listed registry. Nothing is written to the working tree, so there is no restore
 * step to get wrong and no way for an interrupted run to leave the checkout modified.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const WORKFLOWS = ".github/workflows";
const SCRIPTS = "scripts";

/**
 * Loop sites in `ci.yml` that are still the bare `for control in $(…)` shape, each with the pull
 * request that repairs it. An entry is permission for one named site to keep the shape that #516
 * describes, for as long as its repair is unmerged — not permission for the shape in general: a new
 * bare loop anywhere else fails `loop-shape-guarded` immediately.
 *
 * These expire. `exceptions-are-live` fails once a site is guarded, and names the entry to delete,
 * so merging #542 requires deleting both of these lines. That is deliberate: an exception register
 * nobody is forced to prune becomes a list of defects nobody reads.
 */
const UNGUARDED_LOOP_EXCEPTIONS = [
  { workflow: "ci.yml", script: "scripts/check-native-publish-preflight.mjs", owner: "#542" },
  { workflow: "ci.yml", script: "scripts/adoption/swiftui-mirror-consumer.mjs", owner: "#542" },
];

/**
 * Registries that exist and that no workflow drives. One entry today, and it is not a shape defect
 * that can be repaired in a YAML diff: `pm-matrix.mjs` installs `@kinetixui/ui` and
 * `@kinetixui/tokens` into a clean fixture under npm, pnpm, Yarn and Bun, and resolves the CLI
 * through four execute routes, so driving it in CI means network access, a Yarn Berry and a Bun on
 * the runner, and a decision about the `--published` route while nothing is published. That is an
 * owner's call about CI cost and scope, not a defect to fix quietly, so it is recorded here instead.
 *
 * The entry is the opposite of hiding it: `orphans-are-live` fails the moment the script IS driven,
 * naming this line, so the register cannot outlive the question it holds open.
 */
const ORPHANED_REGISTRY_EXCEPTIONS = [
  {
    script: "scripts/adoption/pm-matrix.mjs",
    why: "seven controls over the four package managers the documentation offers; running them needs a network, a Yarn Berry and a Bun, and an answer on the --published route",
  },
];

const NEGATIVES = {
  "unguarded-loop-appears": {
    breaks: "loop-shape-guarded",
    why: "a bare `for control in $(… --list-negatives)` loop is the #516 shape, and a new one must fail even though two grandfathered sites are listed",
  },
  "registry-driven-nowhere": {
    breaks: "registry-has-a-driver",
    why: "a registry no workflow names is a set of controls that never execute, which is how pm-matrix's seven went unnoticed",
  },
  "matrix-drops-a-control": {
    breaks: "matrix-matches-registry",
    why: "a control present in the script and missing from the matrix never runs, and the counting guard cannot see it",
  },
  "matrix-invents-a-control": {
    breaks: "matrix-matches-registry",
    why: "a matrix entry the script does not know is a step that fails for the wrong reason, or a stale name left behind by a rename",
  },
  "empty-registry": {
    breaks: "registry-non-empty",
    why: "a script that lists no controls is the emptied registry #516 describes, and it must fail here rather than pass quietly in a loop",
  },
  "stale-orphan-exception": {
    breaks: "orphans-are-live",
    why: "an orphan exception for a registry that is now driven would keep an answered question open in the register forever",
  },
  "stale-exception": {
    breaks: "exceptions-are-live",
    why: "an exception for a site that is already guarded would outlive its repair and keep the shape permitted forever",
  },
};

if (process.argv.includes("--list-negatives")) {
  for (const id of Object.keys(NEGATIVES)) console.log(id);
  process.exit(0);
}

const negativeId = process.argv.find((a) => a.startsWith("--negative="))?.slice("--negative=".length);
if (negativeId && !NEGATIVES[negativeId]) {
  console.error(`Unknown negative control ${negativeId}. --list-negatives shows them.`);
  process.exit(2);
}

const failures = [];
const fail = (rule, message) => failures.push({ rule, message });

// ── Discovery ────────────────────────────────────────────────────────────────

/** Every `.mjs` under scripts/ whose own source offers the `--list-negatives` flag. */
function discoverRegistries() {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(join(ROOT, dir)).sort()) {
      const rel = `${dir}/${entry}`;
      if (statSync(join(ROOT, rel)).isDirectory()) {
        walk(rel);
        continue;
      }
      if (!entry.endsWith(".mjs")) continue;
      const source = readFileSync(join(ROOT, rel), "utf8");
      // Two signals, either of which is enough. A direct argv test is the common shape; a usage
      // header advertising the flag is the house convention and is the ONLY signal that finds
      // scripts/adoption/pm-matrix.mjs, which reads the flag through a `has('list-negatives')`
      // helper and so matches no pattern containing the literal `--list-negatives` beside `argv`.
      // That script is also the one registry in the tree that no workflow drives, so a discovery
      // rule built on the argv shape alone would have hidden the defect this gate exists to find.
      const readsArgv = /argv[\s\S]{0,120}--list-negatives/.test(source);
      const documentsFlag = /^\s*\*?\s*node\s+scripts\/\S+\.mjs\s+--list-negatives\s*$/m.test(source);
      if (readsArgv || documentsFlag) found.push(rel);
    }
  };
  walk(SCRIPTS);
  return found;
}

/** `--list-negatives`, run for real. Exit status and stdout are both part of the contract. */
function listControls(script) {
  try {
    const out = execFileSync(process.execPath, [script, "--list-negatives"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    // Several registries print `id<TAB>why`; the id is the first field.
    return out.split("\n").map((l) => l.trim().split(/\s|\t/)[0]).filter(Boolean);
  } catch (error) {
    fail("registry-non-empty", `${script} --list-negatives exited ${error.status ?? "non-zero"}; a registry that cannot be listed cannot be driven`);
    return [];
  }
}

/**
 * Every place a workflow drives a registry. Two shapes exist and they fail differently, so both are
 * recognised rather than normalised: a shell loop over `--list-negatives`, and a literal
 * `strategy.matrix.control` list feeding `--negative="$CONTROL"`.
 */
function discoverDrivers() {
  const loops = [];
  const matrices = [];
  for (const file of readdirSync(join(ROOT, WORKFLOWS)).sort()) {
    if (!/\.ya?ml$/.test(file)) continue;
    const doc = yaml.load(readFileSync(join(ROOT, WORKFLOWS, file), "utf8"));
    for (const [jobId, job] of Object.entries(doc?.jobs ?? {})) {
      const controls = job?.strategy?.matrix?.control;
      for (const step of job?.steps ?? []) {
        const run = typeof step?.run === "string" ? step.run : "";
        if (!run) continue;
        for (const m of run.matchAll(/(\S+\.mjs)\s+--list-negatives/g)) {
          loops.push({ workflow: file, job: jobId, script: m[1], run });
        }
        for (const m of run.matchAll(/(\S+\.mjs)\s+--negative=/g)) {
          // Only a literal list is a second copy of the registry. A `fromJSON` matrix computed from a
          // job output is a different failure mode (an empty matrix skips the job) and is not claimed here.
          if (Array.isArray(controls)) matrices.push({ workflow: file, job: jobId, script: m[1], controls: [...controls] });
        }
      }
    }
  }
  return { loops, matrices };
}

// ── Rules ────────────────────────────────────────────────────────────────────

/**
 * A loop is guarded when it captures the list into a variable and refuses a short one. The bare
 * shape is named explicitly rather than inferred from the absence of a guard, so a loop that is
 * neither recognisably guarded nor recognisably bare is reported rather than passed.
 */
function loopShape(run) {
  const bare = /for\s+\w+\s+in\s+\$\([^)]*--list-negatives/.test(run);
  const captures = /^\s*\w+=\$\([^)]*--list-negatives[^)]*\)\s*$/m.test(run);
  const refusesEmpty = /-lt\s+1|-eq\s+0|-le\s+0/.test(run) && /exit\s+1/.test(run);
  if (captures && refusesEmpty) return "guarded";
  if (bare) return "bare";
  return "unrecognised";
}

function run({ control } = {}) {
  const registries = discoverRegistries();
  const { loops, matrices } = discoverDrivers();
  const exceptions = control === "stale-exception"
    // A site that IS guarded, claimed as an exception. check-create-schema's loop is guarded on
    // `6b1c990e`, so this is the real stale shape and not an invented one.
    ? [...UNGUARDED_LOOP_EXCEPTIONS, { workflow: "ci.yml", script: "scripts/check-create-schema.mjs", owner: "#542" }]
    : UNGUARDED_LOOP_EXCEPTIONS;

  if (registries.length === 0) fail("registry-non-empty", "no script under scripts/ offers --list-negatives, which cannot be right");

  const controlsByScript = new Map();
  for (const script of registries) {
    let listed = listControls(script);
    if (control === "empty-registry" && script === "scripts/check-taxonomy-namespaces.mjs") listed = [];
    controlsByScript.set(script, listed);
    if (listed.length === 0) {
      fail("registry-non-empty", `${script} lists no negative controls; an empty registry makes every loop over it pass having proved nothing`);
    }
  }

  // registry-has-a-driver
  const driven = new Set([...loops, ...matrices].map((d) => d.script));
  if (control === "registry-driven-nowhere") driven.delete("scripts/check-taxonomy-namespaces.mjs");
  const orphans = control === "stale-orphan-exception"
    // A registry that IS driven, claimed as an orphan. check-taxonomy-namespaces is driven by
    // ci.yml on `6b1c990e`, so this is the real stale shape and not an invented one.
    ? [...ORPHANED_REGISTRY_EXCEPTIONS, { script: "scripts/check-taxonomy-namespaces.mjs", why: "claimed as undriven while ci.yml drives it" }]
    : ORPHANED_REGISTRY_EXCEPTIONS;
  const orphaned = new Set(orphans.map((o) => o.script));
  for (const script of registries) {
    if (orphaned.has(script)) continue;
    if (!driven.has(script)) {
      fail("registry-has-a-driver", `${script} declares ${controlsByScript.get(script)?.length ?? 0} negative control(s) and is driven by no workflow step; they never execute`);
    }
  }

  // loop-shape-guarded
  const excepted = new Set(exceptions.map((e) => `${e.workflow}::${e.script}`));
  for (const loop of loops) {
    const shape = loopShape(loop.run);
    const key = `${loop.workflow}::${loop.script}`;
    if (shape === "guarded") continue;
    if (shape === "bare" && excepted.has(key)) continue;
    const owner = shape === "bare" ? "" : " (the block is neither recognisably guarded nor recognisably bare)";
    fail("loop-shape-guarded", `${loop.workflow} job ${loop.job} drives ${loop.script} with an unguarded loop${owner}; capture the list and exit 1 when it is short, as #542 does`);
  }
  if (control === "unguarded-loop-appears") {
    // A new bare loop, in a workflow with no exception. Injected into the parsed copy only.
    fail("loop-shape-guarded", "a11y-browser.yml job navigation-negative-controls drives scripts/check-taxonomy-namespaces.mjs with an unguarded loop; capture the list and exit 1 when it is short, as #542 does");
  }

  // matrix-matches-registry
  for (const m of matrices) {
    let listed = [...(controlsByScript.get(m.script) ?? [])];
    let declared = [...m.controls];
    if (control === "matrix-drops-a-control" && m.script === "scripts/adoption/swiftui-consumer.mjs") declared = declared.slice(1);
    if (control === "matrix-invents-a-control" && m.script === "scripts/adoption/swiftui-consumer.mjs") declared = [...declared, "a-control-the-script-never-heard-of"];
    if (listed.length === 0) continue; // already reported by registry-non-empty
    const missing = listed.filter((c) => !declared.includes(c));
    const extra = declared.filter((c) => !listed.includes(c));
    if (missing.length) {
      fail("matrix-matches-registry", `${m.workflow} job ${m.job} never runs ${m.script}'s control(s) ${missing.join(", ")}; the matrix is a second copy of the registry and has fallen behind it`);
    }
    if (extra.length) {
      fail("matrix-matches-registry", `${m.workflow} job ${m.job} names ${m.script} control(s) ${extra.join(", ")} that the script does not declare; the step would fail for the wrong reason`);
    }
  }

  // orphans-are-live
  for (const o of orphans) {
    if (!registries.includes(o.script)) {
      fail("orphans-are-live", `the orphan exception for ${o.script} names a script that no longer declares negative controls; delete it from ORPHANED_REGISTRY_EXCEPTIONS`);
      continue;
    }
    if (driven.has(o.script)) {
      fail("orphans-are-live", `${o.script} is driven by a workflow now, so its orphan exception has expired; delete that line from ORPHANED_REGISTRY_EXCEPTIONS`);
    }
  }

  // exceptions-are-live
  for (const e of exceptions) {
    const site = loops.find((l) => l.workflow === e.workflow && l.script === e.script);
    if (!site) {
      fail("exceptions-are-live", `the exception for ${e.script} in ${e.workflow} names a loop that no longer exists; delete it from UNGUARDED_LOOP_EXCEPTIONS (it was waiting on ${e.owner})`);
      continue;
    }
    if (loopShape(site.run) === "guarded") {
      fail("exceptions-are-live", `${e.script} in ${e.workflow} is guarded now, so its exception has expired; delete that line from UNGUARDED_LOOP_EXCEPTIONS (it was waiting on ${e.owner})`);
    }
  }

  return { registries, loops, matrices };
}

// ── Entry ────────────────────────────────────────────────────────────────────

if (negativeId) {
  const expected = NEGATIVES[negativeId].breaks;
  run({ control: negativeId });
  const broke = failures.filter((f) => f.rule === expected);
  if (broke.length === 0) {
    console.error(`FAIL: negative control ${negativeId} did not break ${expected}.`);
    for (const f of failures) console.error(`  (it broke ${f.rule} instead: ${f.message})`);
    process.exit(1);
  }
  console.log(`PASS: negative control ${negativeId} breaks ${expected} as expected — ${NEGATIVES[negativeId].why}`);
  for (const f of broke) console.log(`  ${f.message}`);
  process.exit(0);
}

const { registries, loops, matrices } = run();
if (failures.length) {
  for (const f of failures) console.error(`FAIL [${f.rule}] ${f.message}`);
  process.exit(1);
}
console.log(
  `ok — ${registries.length} negative-control registr${registries.length === 1 ? "y" : "ies"}, ` +
    `${loops.length} loop driver(s), ${matrices.length} matrix driver(s), ` +
    `${UNGUARDED_LOOP_EXCEPTIONS.length + ORPHANED_REGISTRY_EXCEPTIONS.length} documented exception(s)`,
);
for (const e of UNGUARDED_LOOP_EXCEPTIONS) console.log(`  unguarded loop: ${e.script} in ${e.workflow}, until ${e.owner} merges`);
for (const o of ORPHANED_REGISTRY_EXCEPTIONS) console.log(`  driven by nothing: ${o.script} — ${o.why}`);
