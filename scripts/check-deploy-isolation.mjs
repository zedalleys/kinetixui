#!/usr/bin/env node
/**
 * check:deploy-isolation — asserts that automatic production deployment of `main` stays disabled.
 *
 * Why this exists. Until M5.37 a push to `main` was simultaneously source integration, Version PR
 * regeneration and a production deployment of kinetixui.com: one act, three effects, no separate
 * decision. The release-isolation design splits them, and deployment becomes the deliberate act of
 * advancing a `release` branch to an approved exact commit.
 *
 * The design has two halves. One half is a Vercel dashboard setting (Production Branch), which can be
 * changed back in a place no diff records and no test can read. The other half is this repository's
 * `git.deploymentEnabled`, which is a tracked file — so it is the half that can be defended, and this
 * gate is what makes removing it fail instead of passing quietly.
 *
 * Why two files. Vercel reads `vercel.json` from the project's Root Directory, and for this project
 * that is `apps/web` — measured, from the Vercel GitHub integration's own payload on PR #673
 * (`"rootDirectory": "apps/web"`, project prj_4wL0DZo2xUDDZYxccGsXVRZPflJC). So
 * `apps/web/vercel.json` is the load-bearing file and the root `vercel.json` is inert for this
 * project, including its four `codex/*` exclusions, which have never done anything. The line is
 * required in both anyway, as defence in depth should the Root Directory ever change: a settings
 * change in the dashboard would otherwise silently retire the invariant.
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const REPO = resolve(dirname(SELF), "..");

/** The two places a Root Directory of "." or "apps/web" would make authoritative. */
export const CONFIGS = ["vercel.json", "apps/web/vercel.json"];

const BRANCH = "main";

/** Returns a list of human-readable violations. Empty means the invariant holds. */
export function violations(root = REPO) {
  const found = [];
  for (const rel of CONFIGS) {
    const path = join(root, rel);
    let config;
    try {
      config = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      found.push(`${rel}: cannot be read as JSON (${error.message}).`);
      continue;
    }
    if (!config.git || typeof config.git !== "object") {
      found.push(
        `${rel}: has no "git" key, so no branch is excluded from automatic deployment. ` +
          `Add "git": { "deploymentEnabled": { "${BRANCH}": false } }.`,
      );
      continue;
    }
    const map = config.git.deploymentEnabled;
    if (!map || typeof map !== "object") {
      found.push(`${rel}: "git" has no "deploymentEnabled" map. Add "deploymentEnabled": { "${BRANCH}": false }.`);
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(map, BRANCH)) {
      found.push(
        `${rel}: "git.deploymentEnabled" does not mention "${BRANCH}". Without it every push to ` +
          `${BRANCH} promotes a production deployment, which is the state the release-isolation ` +
          `design exists to end. Add "${BRANCH}": false.`,
      );
      continue;
    }
    const value = map[BRANCH];
    if (value !== false) {
      // The string "false" is the interesting case: it reads correct and does nothing.
      found.push(
        `${rel}: "git.deploymentEnabled.${BRANCH}" is ${JSON.stringify(value)}, not the boolean false. ` +
          `Vercel reads this map for booleans; any other value does not disable the branch.`,
      );
    }
  }
  return found;
}

/**
 * Each control injects ONE cause into a throwaway copy of the real files and requires the real check
 * to reject it. A control that asserted the expected message instead of injecting the defect would
 * still pass with the rule deleted, which is the failure this repository has already paid for twice.
 */
const CAUSES = {
  "main-key-deleted": (config) => {
    delete config.git.deploymentEnabled[BRANCH];
  },
  "main-set-true": (config) => {
    config.git.deploymentEnabled[BRANCH] = true;
  },
  "main-set-string-false": (config) => {
    config.git.deploymentEnabled[BRANCH] = "false";
  },
  "deployment-enabled-map-deleted": (config) => {
    delete config.git.deploymentEnabled;
  },
  "git-key-deleted": (config) => {
    delete config.git;
  },
};

const LABELS = { "vercel.json": "root", "apps/web/vercel.json": "web" };

export const NEGATIVE_CONTROLS = CONFIGS.flatMap((rel) =>
  Object.keys(CAUSES).map((cause) => `${LABELS[rel]}:${cause}`),
);

function runNegative(name) {
  const [label, cause] = name.split(":");
  const rel = CONFIGS.find((candidate) => LABELS[candidate] === label);
  if (!rel || !CAUSES[cause]) {
    console.error(`unknown negative control: ${name}`);
    process.exit(2);
  }

  // Precondition. If the unmutated tree already fails, a later rejection says nothing about the
  // injected cause, and this control proves nothing.
  const before = violations(REPO);
  if (before.length > 0) {
    console.error(
      `control ${name}: precondition unmet — the unmutated tree already fails ` +
        `(${before[0]}), so this control proves nothing.`,
    );
    process.exit(1);
  }

  const dir = mkdtempSync(join(tmpdir(), "deploy-isolation-control-"));
  try {
    for (const candidate of CONFIGS) {
      mkdirSync(join(dir, dirname(candidate)), { recursive: true });
      cpSync(join(REPO, candidate), join(dir, candidate));
    }
    const target = join(dir, rel);
    const config = JSON.parse(readFileSync(target, "utf8"));
    CAUSES[cause](config);
    writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`);

    const after = violations(dir);
    const names = after.map((line) => line.split(":")[0]);
    if (!names.includes(rel)) {
      console.error(
        `control ${name}: the check ACCEPTED ${rel} with the defect injected. ` +
          `It is not defending this file.`,
      );
      process.exit(1);
    }
    console.log(`control ${name}: rejected, as required — ${after.find((line) => line.startsWith(rel))}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The control RUNNER, in-process and fail-closed.
 *
 * It replaces `… --list-negatives | while read c; do … || exit 1; done`, which was a #516-family
 * fail-open: under `bash -e` all three of an empty listing, a lister that fails, and a lister that
 * prints one name and then fails exited 0, the last two having verified almost nothing. A pipe hides
 * the producer's exit status and `while read` over no input runs no iterations, so the loop's own
 * success said nothing about whether any control had run.
 *
 * The lister stays a separate process on purpose. Collapsing it into this function would make two of
 * those three failures unrepresentable rather than handled, and the controls below could not inject
 * them. So the producer's exit status is checked, its output is counted, and zero is a failure.
 */
export function runNegatives({ self = SELF, node = process.execPath } = {}) {
  let listed;
  try {
    listed = execFileSync(node, [self, "--list-negatives"], { encoding: "utf8" });
  } catch (error) {
    // Partial output is NOT partial credit: anything already printed is discarded with the failure.
    return {
      ok: false,
      reason:
        `the control lister failed (exit ${error.status ?? "unknown"}), so the control set is ` +
        `unknown. Refusing to report success on a listing that was never completed.`,
    };
  }

  const names = listed.split(/\s+/).filter(Boolean);
  if (names.length === 0) {
    return {
      ok: false,
      reason:
        "the control listing is empty, so no control ran. An empty control set is a defect in the " +
        "gate, not a clean run — this is the arm that used to exit 0 having verified nothing.",
    };
  }

  for (const name of names) {
    try {
      execFileSync(node, [self, `--negative=${name}`], { encoding: "utf8", stdio: "pipe" });
    } catch (error) {
      const output = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim();
      return { ok: false, reason: `control ${name} did not pass (exit ${error.status ?? "unknown"}). ${output}` };
    }
  }
  return { ok: true, count: names.length };
}

/**
 * One mutation per failure mode the runner must reject, applied to a throwaway copy of THIS file.
 * Each targets the lister branch only, leaving the runner under test untouched, and each is checked
 * to have actually applied — a mutation that changes nothing reads exactly like a working gate.
 */
const LISTER_CALL = 'console.log(NEGATIVE_CONTROLS.join("\\n"));';

export const RUNNER_MUTATIONS = {
  "runner-empty-listing": 'console.log("");',
  "runner-lister-fails": "process.exit(3);",
  "runner-lister-fails-after-partial": "console.log(NEGATIVE_CONTROLS[0]);\n  process.exit(3);",
};

export const RUNNER_CONTROLS = Object.keys(RUNNER_MUTATIONS);

/** Copies this script and both configs into a temp tree so a mutated copy resolves its own REPO. */
function stageTree(dir) {
  mkdirSync(join(dir, "scripts"), { recursive: true });
  cpSync(SELF, join(dir, "scripts", basename(SELF)));
  for (const rel of CONFIGS) {
    mkdirSync(join(dir, dirname(rel)), { recursive: true });
    cpSync(join(REPO, rel), join(dir, rel));
  }
  return join(dir, "scripts", basename(SELF));
}

function runRunnerControl(name) {
  const mutation = RUNNER_MUTATIONS[name];
  if (mutation === undefined) {
    console.error(`unknown runner control: ${name}`);
    process.exit(2);
  }

  const dir = mkdtempSync(join(tmpdir(), "deploy-isolation-runner-"));
  try {
    const copy = stageTree(dir);

    // Precondition, measured rather than assumed: the UNMUTATED copy must pass. Without this a
    // mutated copy could fail for an unrelated reason and the control would credit the repair.
    const before = runNegatives({ self: copy });
    if (!before.ok) {
      console.error(`control ${name}: precondition unmet — the unmutated copy already fails (${before.reason}), so this control proves nothing.`);
      process.exit(1);
    }

    const source = readFileSync(copy, "utf8");
    if (!source.includes(LISTER_CALL)) {
      console.error(`control ${name}: the lister call could not be found, so the mutation would be a no-op.`);
      process.exit(1);
    }
    const mutated = source.replace(LISTER_CALL, mutation);
    if (mutated === source) {
      console.error(`control ${name}: the mutation changed nothing.`);
      process.exit(1);
    }
    writeFileSync(copy, mutated);

    const after = runNegatives({ self: copy });
    if (after.ok) {
      console.error(
        `control ${name}: the runner ACCEPTED the mutated lister and reported ${after.count} ` +
          `control(s). It is fail-open for this mode.`,
      );
      process.exit(1);
    }
    console.log(`control ${name}: rejected, as required — ${after.reason}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const arg = process.argv[2] ?? "";
if (arg === "--list-negatives") {
  console.log(NEGATIVE_CONTROLS.join("\n"));
} else if (arg.startsWith("--negative=")) {
  runNegative(arg.slice("--negative=".length));
} else if (arg === "--run-negatives") {
  const result = runNegatives();
  if (!result.ok) {
    console.error(`check:deploy-isolation-controls FAILED — ${result.reason}`);
    process.exit(1);
  }
  console.log(`check:deploy-isolation-controls ok — ${result.count} negative controls ran and all rejected their injected defect.`);
} else if (arg === "--run-runner-controls") {
  // In-process on purpose: a shell loop here would be the very shape this repair removed.
  if (RUNNER_CONTROLS.length === 0) {
    console.error("check:deploy-isolation-runner-controls FAILED — the runner-control registry is empty.");
    process.exit(1);
  }
  for (const name of RUNNER_CONTROLS) {
    try {
      console.log(execFileSync(process.execPath, [SELF, `--runner-control=${name}`], { encoding: "utf8" }).trim());
    } catch (error) {
      console.error(`check:deploy-isolation-runner-controls FAILED — ${name}: ${`${error.stdout ?? ""}${error.stderr ?? ""}`.trim()}`);
      process.exit(1);
    }
  }
  console.log(`check:deploy-isolation-runner-controls ok — ${RUNNER_CONTROLS.length} runner controls ran and all rejected their injected failure mode.`);
} else if (arg === "--list-runner-controls") {
  console.log(RUNNER_CONTROLS.join("\n"));
} else if (arg.startsWith("--runner-control=")) {
  runRunnerControl(arg.slice("--runner-control=".length));
} else {
  const found = violations(REPO);
  if (found.length > 0) {
    for (const line of found) console.error(`check:deploy-isolation FAILED — ${line}`);
    process.exit(1);
  }
  console.log(
    `check:deploy-isolation ok — ${CONFIGS.join(" and ")} both disable automatic deployment of "${BRANCH}".`,
  );
}
