/**
 * check:release-approval-gate — the npm publication is behind a human, and nothing else is.
 *
 *   node scripts/check-release-approval-gate.mjs
 *   node scripts/check-release-approval-gate.mjs --negative=<id>   require one check to fail
 *   node scripts/check-release-approval-gate.mjs --list-negatives
 *
 * `release.yml` is `on: push: branches: [main]`, and until the split this gate guards, its single
 * `release` job did two unrelated things through one `changesets/action` call: with changesets
 * pending it opened the Version PR, with none pending it published to npm. Same job, same npm
 * token, same absence of any approval — so merging the Version PR *was* the publication, because
 * the merge is the push that finds nothing pending.
 *
 * The fix is a protected environment on the publishing job only. That is two requirements pulling
 * in opposite directions, and this check holds both ends:
 *
 *   the publication waits for a person   — the job holding the npm credential declares
 *                                          `environment: publish-npm` and asserts its own approval
 *   nothing else does                    — preflight, the pending-changeset read and the Version PR
 *                                          job stay ungated, hold no publish credential, and
 *                                          cannot publish
 *
 * Why both: a gate on the whole workflow would put an approval in front of opening a pull request,
 * which is the frequent path and not a publication. That failure mode is not hypothetical — a
 * release window was already lost once to an unapproved run sitting for thirteen hours. A gate that
 * stalls the ordinary path gets switched off, and then nothing is gated.
 *
 * It also asserts a property the split created: a job that holds nothing installs nothing, so every
 * script it runs before a `pnpm install` must resolve on a bare checkout. The first version of this
 * PR failed that — `pending.mjs` reached `semver` two files away, through `peers.mjs` — and a `plan`
 * that dies skips both release paths, so every release run would have done nothing.
 *
 * What this check cannot see, stated plainly: whether `publish-npm` exists on GitHub with required
 * reviewers configured. That is settings, not source. An `environment:` naming an environment that
 * does not exist does not fail — GitHub creates it unprotected and the job runs. That gap is closed
 * at run time instead, by scripts/release/approval.mjs reading the run's own approval history, and
 * the presence of that step is check REL-PUBLISH-ASSERTS-APPROVAL below. Neither half is sufficient
 * alone and this file requires both.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const root = fileURLToPath(new URL("..", import.meta.url));
const WORKFLOW = ".github/workflows/release.yml";
const ENVIRONMENT = "publish-npm";
const APPROVAL_COMMAND = "scripts/release/approval.mjs";
const PENDING_OUTPUT = "changesets_pending";

/** Mutations applied to the in-memory copy below, each naming the check it must break. */
const NEGATIVES = {
  "publish-job-loses-its-environment": { from: "    environment: publish-npm\n", to: "", breaks: "REL-PUBLISH-IS-GATED" },
  "publish-job-gated-by-a-different-environment": { from: "    environment: publish-npm\n", to: "    environment: preview\n", breaks: "REL-PUBLISH-IS-GATED" },
  "npm-token-moves-to-the-version-job": { from: "          GITHUB_TOKEN: ${{ secrets.RELEASE_PAT || secrets.GITHUB_TOKEN }}\n", to: "          GITHUB_TOKEN: ${{ secrets.RELEASE_PAT || secrets.GITHUB_TOKEN }}\n          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}\n", breaks: "REL-UNGATED-JOBS-HOLD-NO-CREDENTIAL" },
  "version-job-gains-an-oidc-identity": { from: "      contents: write # changesets pushes the version branch\n      pull-requests: write\n", to: "      contents: write # changesets pushes the version branch\n      pull-requests: write\n      id-token: write\n", breaks: "REL-UNGATED-JOBS-HOLD-NO-CREDENTIAL" },
  "approval-assertion-removed": { from: "        run: node scripts/release/approval.mjs --environment=publish-npm\n", to: "        run: echo approved\n", breaks: "REL-PUBLISH-ASSERTS-APPROVAL" },
  "approval-asserted-for-the-wrong-environment": { from: "--environment=publish-npm", to: "--environment=preview", breaks: "REL-PUBLISH-ASSERTS-APPROVAL" },
  "approval-asserted-after-the-publication": { from: "      - name: A human approved this publication\n        env:\n          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n        run: node scripts/release/approval.mjs --environment=publish-npm\n\n", to: "", also: { from: "      - name: GitHub Releases for what was just published\n", to: "      - name: A human approved this publication\n        env:\n          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n        run: node scripts/release/approval.mjs --environment=publish-npm\n\n      - name: GitHub Releases for what was just published\n" }, breaks: "REL-PUBLISH-ASSERTS-APPROVAL" },
  "version-job-becomes-gated": { from: "  version:\n    needs: [preflight, plan]\n", to: "  version:\n    environment: publish-npm\n    needs: [preflight, plan]\n", breaks: "REL-VERSION-PR-PATH-UNGATED" },
  "version-job-gains-a-publish-command": { from: "          version: pnpm version-packages\n          commit:", to: "          version: pnpm version-packages\n          publish: pnpm release\n          commit:", breaks: "REL-PUBLICATION-ISOLATED" },
  "a-second-job-publishes-unseen": { from: "  publish:\n    needs: [preflight, plan]\n", to: "  shortcut:\n    needs: preflight\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: pnpm release\n  publish:\n    needs: [preflight, plan]\n", breaks: "REL-PUBLICATION-ISOLATED" },
  "both-paths-can-run-at-once": { from: "    if: needs.plan.outputs.changesets_pending == 'false'\n", to: "    if: always()\n", breaks: "REL-PATHS-MUTUALLY-EXCLUSIVE" },
  "publish-runs-when-pending-is-unset": { from: "    if: needs.plan.outputs.changesets_pending == 'false'\n", to: "    if: needs.plan.outputs.changesets_pending != 'true'\n", breaks: "REL-PATHS-MUTUALLY-EXCLUSIVE" },
  "publish-no-longer-needs-preflight": { from: "  publish:\n    needs: [preflight, plan]\n", to: "  publish:\n    needs: [plan]\n", breaks: "REL-PUBLISH-NEEDS-PREFLIGHT" },
  "the-pending-read-gains-a-credential": { from: "      - name: Are there changesets pending?\n        id: pending\n", to: "      - name: Are there changesets pending?\n        id: pending\n        env:\n          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}\n", breaks: "REL-UNGATED-JOBS-HOLD-NO-CREDENTIAL" },
  // The defect this check was added for, reproduced as a control. `plan` runs its reader on a
  // checkout with no dependencies installed; routing that reader back through peers.mjs makes it
  // import `semver` transitively, and a `plan` that dies skips BOTH release paths — so every
  // release run would have done nothing. Found by review on PR #536 and reproduced in a fresh
  // clone before the fix.
  "pending-reader-imports-a-dependency-again": { from: "        run: node scripts/release/pending.mjs >> \"$GITHUB_OUTPUT\"\n", to: "        run: node scripts/release/peers.mjs >> \"$GITHUB_OUTPUT\"\n", breaks: "REL-SCRIPTS-RESOLVE-WITHOUT-INSTALL" },
  // The same class one step along: the approval assertion deliberately runs *before* the install,
  // so it is held to the same rule even though its job installs dependencies later.
  "approval-assertion-swapped-for-a-script-that-needs-dependencies": { from: "        run: node scripts/release/approval.mjs --environment=publish-npm\n", to: "        run: node scripts/release-plan.mjs --environment=publish-npm\n", breaks: "REL-SCRIPTS-RESOLVE-WITHOUT-INSTALL" },
  "workflow-does-not-parse": { from: "jobs:\n", to: "jobs:\n  duplicate: {}\njobs:\n", breaks: "REL-PARSES" },
};

if (process.argv.includes("--list-negatives")) {
  console.log(Object.keys(NEGATIVES).join("\n"));
  process.exit(0);
}

const negativeId = process.argv.find((arg) => arg.startsWith("--negative="))?.slice("--negative=".length);
const negative = negativeId ? NEGATIVES[negativeId] : undefined;
if (negativeId && !negative) {
  console.error(`Unknown negative control ${negativeId}. --list-negatives shows them.`);
  process.exit(1);
}

/**
 * The workflow is read through here so a control mutates what the checks see without touching the
 * working tree. A control whose `from` does not match exactly once is a broken control, not a
 * passing gate — that is how a mutation silently becoming a no-op is caught.
 */
const source = () => {
  let text = readFileSync(`${root}${WORKFLOW}`, "utf8");
  if (negative) {
    for (const edit of [negative, negative.also].filter(Boolean)) {
      const occurrences = text.split(edit.from).length - 1;
      if (occurrences !== 1) {
        console.error(`Negative control ${negativeId}: its \`from\` matches ${occurrences} times in ${WORKFLOW}, expected exactly 1.`);
        process.exit(1);
      }
      text = text.replace(edit.from, edit.to);
    }
  }
  return text;
};

const failures = [];
/** `detail` is what someone fixing this needs to read; it is printed only when the check fails. */
const check = (name, ok, detail) => {
  if (!ok) failures.push(`${name}: ${detail}`);
};

const text = source();
let doc = null;
let parseError = null;
try {
  doc = yaml.load(text);
} catch (error) {
  parseError = error.message;
}

check(
  "REL-PARSES",
  parseError === null && doc !== null && typeof doc === "object" && doc.jobs && typeof doc.jobs === "object",
  `${WORKFLOW} must parse as a workflow with a \`jobs:\` map${parseError ? ` (${parseError})` : ""}. Everything below is a property of the parsed document, so a file this cannot read would otherwise look exactly like a file with nothing wrong in it.`,
);

if (parseError === null && doc?.jobs) {
  const jobs = Object.entries(doc.jobs).map(([name, job]) => ({ name, job: job ?? {} }));

  /** Every string anywhere inside a value, so a credential cannot hide at a depth nobody walks. */
  const strings = (value) => {
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.flatMap(strings);
    if (value && typeof value === "object") return Object.values(value).flatMap(strings);
    return [];
  };
  const steps = ({ job }) => (Array.isArray(job.steps) ? job.steps.filter((step) => step && typeof step === "object") : []);

  /**
   * A job that could reach the registry: it names the npm credential, or it holds the OIDC identity
   * npm trusts for provenance. Either is a publish capability, so either demands the gate.
   */
  const holdsCredential = ({ job }) =>
    strings(job).some((value) => /secrets\.NPM_TOKEN/.test(value)) ||
    (job.permissions && typeof job.permissions === "object" && job.permissions["id-token"] === "write");

  /** A step that performs the publication itself, by either of the two spellings available. */
  const publishes = (step) =>
    (step.with && typeof step.with === "object" && typeof step.with.publish === "string") ||
    (typeof step.run === "string" && /\bpnpm\s+release(?![:\w-])/.test(step.run));

  const credentialed = jobs.filter(holdsCredential);
  const publishingSteps = jobs.flatMap((entry) => steps(entry).map((step, index) => ({ entry, step, index })).filter(({ step }) => publishes(step)));
  const gated = jobs.filter(({ job }) => job.environment !== undefined);
  const gateName = (job) => (typeof job.environment === "string" ? job.environment : job.environment?.name);

  // One job publishes, and it is the gated one. Asserted as a count before anything is concluded
  // from a name, because a second credentialed job is a publication nothing here is checking.
  check(
    "REL-PUBLISH-IS-GATED",
    credentialed.length === 1 && gateName(credentialed[0].job) === ENVIRONMENT,
    credentialed.length !== 1
      ? `exactly one job in ${WORKFLOW} may hold a publish credential; ${credentialed.length} do (${credentialed.map(({ name }) => name).join(", ") || "none"}). The gate identifies the publishing job by the credential it carries, so a second one is an ungated publication.`
      : `job \`${credentialed[0].name}\` holds the npm credential and must declare \`environment: ${ENVIRONMENT}\`; it declares ${gateName(credentialed[0].job) === undefined ? "no environment" : `\`${gateName(credentialed[0].job)}\``}. GitHub withholds an environment's secrets until a required reviewer approves, which is the one property here that does not depend on the rest of this file being right.`,
  );

  const leaky = credentialed.filter((entry) => gateName(entry.job) !== ENVIRONMENT).concat(jobs.filter((entry) => gateName(entry.job) === undefined && holdsCredential(entry)));
  check(
    "REL-UNGATED-JOBS-HOLD-NO-CREDENTIAL",
    leaky.length === 0,
    `${[...new Set(leaky.map(({ name }) => name))].join(", ")} run without the \`${ENVIRONMENT}\` gate and reference \`secrets.NPM_TOKEN\` or hold \`id-token: write\`. A credential in an ungated job is reachable without anyone approving anything, which leaves the gate decorative — and a repository-scoped copy of NPM_TOKEN has the same effect, which is why the token must be an environment secret rather than copied into one.`,
  );

  // The gate's own blind spot, covered at run time. `environment:` on a job whose environment does
  // not exist, or whose required reviewers were removed, does not fail: GitHub creates it
  // unprotected and runs. So the approval is read from the run itself, before anything irreversible.
  const publishJob = credentialed.length === 1 ? credentialed[0] : null;
  const publishSteps = publishJob ? steps(publishJob) : [];
  const approvalAt = publishSteps.findIndex((step) => typeof step.run === "string" && step.run.includes(APPROVAL_COMMAND) && step.run.includes(`--environment=${ENVIRONMENT}`));
  const firstPublicationAt = publishSteps.findIndex((step) => publishes(step));
  check(
    "REL-PUBLISH-ASSERTS-APPROVAL",
    publishJob !== null && approvalAt !== -1 && firstPublicationAt !== -1 && approvalAt < firstPublicationAt,
    publishJob === null
      ? "no single publishing job to check — see REL-PUBLISH-IS-GATED."
      : approvalAt === -1
        ? `job \`${publishJob.name}\` must run \`node ${APPROVAL_COMMAND} --environment=${ENVIRONMENT}\`. \`environment:\` alone does not prove an approval happened: an environment that does not exist is created unprotected on first reference and the job runs immediately, with this file still claiming a gate. That fall-through is invisible from inside the repository, so the run's own approval history is read instead.`
        : firstPublicationAt === -1
          ? `job \`${publishJob.name}\` asserts an approval but no longer publishes anything, so this contract no longer describes the file. Update it with the change rather than around it.`
          : `job \`${publishJob.name}\` asserts its approval at step ${approvalAt + 1}, after the publication at step ${firstPublicationAt + 1}. An approval checked afterwards is a report, not a gate — npm is irreversible by then.`,
  );

  // The other end. Opening a pull request is not a publication and must never wait for a person:
  // an approval on the frequent path is the failure mode that gets gates switched off.
  const versionJobs = jobs.filter((entry) => steps(entry).some((step) => step.with && typeof step.with === "object" && typeof step.with.version === "string"));
  check(
    "REL-VERSION-PR-PATH-UNGATED",
    versionJobs.length === 1 && versionJobs[0].job.environment === undefined && !holdsCredential(versionJobs[0]),
    versionJobs.length !== 1
      ? `exactly one job may carry the Changesets \`version:\` command; ${versionJobs.length} do (${versionJobs.map(({ name }) => name).join(", ") || "none"}).`
      : `job \`${versionJobs[0].name}\` opens the Version PR and must stay ungated and credential-free. It declares ${versionJobs[0].job.environment === undefined ? "no environment" : `\`environment: ${gateName(versionJobs[0].job)}\``}${holdsCredential(versionJobs[0]) ? " and holds a publish credential" : ""}. Gating it would mean every push to main with a changeset pending waits for an approval before a pull request can be opened — the frequent path, for no safety gain.`,
  );

  check(
    "REL-PUBLICATION-ISOLATED",
    publishingSteps.length === 1 && publishJob !== null && publishingSteps[0].entry.name === publishJob.name,
    `${publishingSteps.length} step(s) in ${WORKFLOW} can publish (${publishingSteps.map(({ entry, step }) => `${entry.name} → ${step.name ?? step.run ?? "<unnamed>"}`).join("; ") || "none"}); exactly one is allowed and it must be in the gated job. A publication anywhere else is one no approval stands in front of.`,
  );

  // Complementary positive comparisons against one credential-free fact, so a `plan` that fails or
  // emits nothing skips both jobs rather than selecting one. A stall is the correct direction for an
  // error in a publication gate to fall; `!=` publishes on every value nobody chose, including the
  // empty string a failed job leaves behind.
  const conditionOf = (entry) => (typeof entry?.job?.if === "string" ? entry.job.if.trim() : null);
  const expected = (value) => `needs.plan.outputs.${PENDING_OUTPUT} == '${value}'`;
  check(
    "REL-PATHS-MUTUALLY-EXCLUSIVE",
    versionJobs.length === 1 && publishJob !== null && conditionOf(versionJobs[0]) === expected("true") && conditionOf(publishJob) === expected("false"),
    `the Version PR job must carry \`if: ${expected("true")}\` and the publishing job \`if: ${expected("false")}\`. They carry ${JSON.stringify(conditionOf(versionJobs[0]))} and ${JSON.stringify(conditionOf(publishJob))}. Two positive comparisons against the same credential-free output are what make the paths exclusive and make an unreadable answer skip both: a negated condition publishes on every value nobody chose, the empty string a failed \`plan\` leaves behind included.`,
  );

  const plan = jobs.find(({ job }) => job.outputs && typeof job.outputs === "object" && Object.keys(job.outputs).includes(PENDING_OUTPUT));
  check(
    "REL-PENDING-READ-HOLDS-NOTHING",
    plan !== undefined && plan.job.environment === undefined && !holdsCredential(plan) && !strings(plan.job).some((value) => /secrets\./.test(value)),
    plan === undefined
      ? `no job outputs \`${PENDING_OUTPUT}\`, so the two release paths have nothing to key off.`
      : `job \`${plan.name}\` decides which release path runs and must hold nothing while doing it: no environment, no secrets, no OIDC identity. A job that chooses between versioning and publishing is worth no more trust than the two it chooses between.`,
  );

  // Every `node` script a job runs before it has installed anything must resolve on a bare
  // checkout. Asserted over the real import closure rather than the job's step list, because the
  // import that broke this was transitive: `pending.mjs` → `peers.mjs` → `semver`, two files away
  // from the workflow. Positional, not per-job: the `publish` job does install dependencies, but
  // its approval assertion runs before that step on purpose, so it is held to the same rule.
  const BUILTIN = /^node:/;
  const specifiers = (text) => [...text.matchAll(/(?:^|[\s;}])(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|(?:^|[\s;}])import\s*\(\s*["']([^"']+)["']\s*\)|(?:^|[\s;}])import\s*["']([^"']+)["']/g)].map((match) => match[1] ?? match[2] ?? match[3]);
  /** Every bare (non-builtin, non-relative) specifier reachable from a script, with the file it is in. */
  const bareImports = (entry) => {
    const found = [];
    const seen = new Set();
    const walk = (file) => {
      if (seen.has(file) || !existsSync(`${root}${file}`)) return;
      seen.add(file);
      for (const specifier of specifiers(readFileSync(`${root}${file}`, "utf8"))) {
        if (BUILTIN.test(specifier)) continue;
        if (!specifier.startsWith(".")) {
          found.push({ file, specifier });
          continue;
        }
        walk(path.normalize(path.join(path.dirname(file), specifier)));
      }
    };
    walk(entry);
    return found;
  };

  const unresolvable = [];
  for (const entry of jobs) {
    let installed = false;
    for (const step of steps(entry)) {
      const script = typeof step.run === "string" ? step.run : "";
      if (/\bpnpm\s+install\b/.test(script)) {
        installed = true;
        continue;
      }
      if (installed) continue;
      for (const [, file] of script.matchAll(/\bnode\s+(scripts\/[\w./-]+\.mjs)/g)) {
        if (!existsSync(`${root}${file}`)) {
          unresolvable.push(`${entry.name} → "${step.name ?? file}" runs \`${file}\`, which does not exist`);
          continue;
        }
        for (const { file: holder, specifier } of bareImports(file)) {
          unresolvable.push(`${entry.name} → "${step.name ?? file}" runs \`${file}\` before any \`pnpm install\`, but ${holder === file ? "it" : `\`${holder}\`, which it imports,`} imports \`${specifier}\``);
        }
      }
    }
  }
  check(
    "REL-SCRIPTS-RESOLVE-WITHOUT-INSTALL",
    unresolvable.length === 0,
    `${unresolvable.join("; ")}. A job that has not installed dependencies has none: the import fails with ERR_MODULE_NOT_FOUND at startup, and because \`plan\` decides which release path runs, a \`plan\` that dies skips both of them — every release run doing nothing. Each runner is its own machine, so installing in another job does not help. Keep these scripts to \`node:\` builtins and relative imports, or install dependencies in the job before running them.`,
  );

  check(
    "REL-PUBLISH-NEEDS-PREFLIGHT",
    publishJob !== null && [].concat(publishJob.job.needs ?? []).includes("preflight"),
    `the publishing job must keep \`needs: preflight\`. It needs ${JSON.stringify(publishJob?.job?.needs ?? null)}. The approval is a backstop for the case where a gate is wrong, not a replacement for the gates: a human approving an unverified tree publishes an unverified tree.`,
  );
}

// ---------------------------------------------------------------------------
if (negative) {
  const broke = failures.some((failure) => failure.startsWith(`${negative.breaks}:`));
  if (!broke) {
    console.error(`FAIL: negative control ${negativeId} did not break ${negative.breaks}. The gate reported: ${failures.length ? failures.join(" | ") : "no failures at all"}`);
    process.exit(1);
  }
  console.log(`PASS: negative control ${negativeId} breaks ${negative.breaks} as expected.`);
  process.exit(0);
}

if (failures.length) {
  for (const failure of failures) console.error(`::error::${failure}`);
  console.error(`\n${failures.length} release approval gate check(s) failed.`);
  process.exit(1);
}
console.log(`PASS: release approval gate — the npm publication is the only thing in ${WORKFLOW} behind \`${ENVIRONMENT}\`, it asserts its own approval before publishing, and the preflight, pending-changeset read and Version PR paths stay ungated and credential-free. Workflow structure only; whether \`${ENVIRONMENT}\` has required reviewers configured is GitHub settings and is checked at run time by ${APPROVAL_COMMAND}.`);
