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
import { dirname, join, resolve } from "node:path";
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

const arg = process.argv[2] ?? "";
if (arg === "--list-negatives") {
  console.log(NEGATIVE_CONTROLS.join("\n"));
} else if (arg.startsWith("--negative=")) {
  runNegative(arg.slice("--negative=".length));
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
