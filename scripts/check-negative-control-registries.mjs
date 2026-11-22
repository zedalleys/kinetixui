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
 *
 * An entry names a workflow, a job, a step and a script, all four. Keying on the workflow and the
 * script alone was a fail-open that Codex's exact-head review of `a807ea89` reproduced: a second
 * bare loop over the same script in a different job of `ci.yml` inherited this entry silently, and
 * the expiry check searched by the same broad identity, so one entry could grandfather any number
 * of sites. One entry, one site.
 */
const UNGUARDED_LOOP_EXCEPTIONS = [
  { workflow: "ci.yml", job: "build", step: "Native publish preflight: negative controls", script: "scripts/check-native-publish-preflight.mjs", owner: "#542" },
  { workflow: "ci.yml", job: "build", step: "SwiftUI mirror publish route: negative controls", script: "scripts/adoption/swiftui-mirror-consumer.mjs", owner: "#542" },
];

/**
 * Registries that exist and that no workflow drives. One entry today, and it is not a shape defect
 * that can be repaired in a YAML diff: `pm-matrix.mjs` installs `@kinetixui/ui` and
 * `@kinetixui/tokens` into a clean fixture under npm, pnpm, Yarn and Bun, and resolves the CLI
 * through four execute routes, so driving it in CI means network access and a Bun on the runner.
 * Measured 2026-11-22 rather than assumed: the whole four-manager matrix takes 45s, its seven
 * controls under a second each, and the Yarn Classic install cell FAILS — the documented known
 * failure — so a naive wiring would be red forever. The wiring that carries that cell already
 * exists as #482, whose step runs `pm-matrix.mjs --check` against an expectations file, and
 * neither the flag nor the file is on `main`. An owner's call about CI cost and scope, not a
 * defect to fix quietly, so it is recorded here instead.
 *
 * The entry is the opposite of hiding it: `orphans-are-live` fails the moment the script IS driven,
 * naming this line, so the register cannot outlive the question it holds open.
 */
const ORPHANED_REGISTRY_EXCEPTIONS = [
  {
    script: "scripts/adoption/pm-matrix.mjs",
    why: "seven controls over the four package managers the documentation offers. Measured 2026-11-22: all seven pass in under a second each, the whole matrix runs in 45s, and the Yarn Classic install cell FAILS by design, so wiring it needs #482's `--check` and its expectations file, neither of which is on main. Needs runner network and a Bun; Yarn Berry is one npm install, not a network-policy change",
  },
];

const NEGATIVES = {
  "unguarded-loop-appears": {
    breaks: "loop-shape-guarded",
    why: "a bare `for control in $(… --list-negatives)` loop is the #516 shape, and a new one must fail even though two grandfathered sites are listed",
  },
  "warning-only-guard": {
    breaks: "loop-shape-guarded",
    why: "a block that captures the list, only warns when the count is short, and carries an unrelated `exit 1` elsewhere still exits 0 on an empty list, so it must not read as guarded",
  },
  "exception-leaks-to-another-job": {
    breaks: "loop-shape-guarded",
    why: "a second bare loop over an excepted script, in another job, must fail on its own rather than inherit the one entry that names a different site",
  },
  "mentioned-not-invoked": {
    breaks: "registry-has-a-driver",
    why: "an echoed command line is a mention, not an execution, so a step that only prints the invocation must not count as driving the registry",
  },
  "heredoc-payload-counts-as-a-driver": {
    breaks: "registry-has-a-driver",
    why: "a heredoc that prints the invocation executes nothing, so the payload of a `cat <<EOF` must not count as driving the registry either",
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
        const site = { workflow: file, job: jobId, step: step?.name ?? "(unnamed step)" };
        for (const found of invocations(run, /(\S+\.mjs)\s+--list-negatives/g)) {
          loops.push({ ...site, script: found.script, run });
        }
        for (const found of invocations(run, /(\S+\.mjs)\s+--negative=/g)) {
          // Only a literal list is a second copy of the registry. A `fromJSON` matrix computed from a
          // job output is a different failure mode (an empty matrix skips the job) and is not claimed here.
          if (Array.isArray(controls)) matrices.push({ ...site, script: found.script, controls: [...controls] });
        }
      }
    }
  }
  return { loops, matrices };
}

/**
 * The matches in a `run:` block that are COMMANDS rather than mentions.
 *
 * Codex's exact-head review of `a807ea89` reproduced why this distinction is load-bearing: with the
 * naive `matchAll` over the whole block, replacing `native-swiftui.yml`'s invocation with
 * `echo node scripts/adoption/swiftui-consumer.mjs --negative="$CONTROL"` kept both driver discovery
 * and matrix equality intact while executing nothing at all, and a comment merely naming an orphaned
 * registry was enough to expire its exception. Textual occurrence is not execution.
 *
 * So a match counts only when it stands at the start of a command on its own line: preceded by
 * nothing but whitespace, a shell separator, or an interpreter prefix, outside quotes, and not
 * behind `echo`/`printf`/`:`. Comments are stripped first.
 *
 * Codex's review of the first repair, `ab8251b6`, found that line-by-line scanning was not enough:
 * a `cat <<'EOF'` whose payload is the invocation read as a command, because quote and
 * command-position state restarted on every line. Replacing `native-swiftui.yml`'s real call with
 * that block kept driver discovery and matrix equality intact while executing nothing. The scanner
 * now carries two pieces of state across lines -- the open heredoc delimiter and a string left
 * open -- and treats everything inside either as data. Stripping at `#` is cruder than a shell
 * parser and can discard a legitimate `#` inside a quoted argument — which can only make this
 * stricter, turning a real driver into a reported "driven by nothing" rather than a silent pass.
 */
/**
 * The quote a line leaves open, or null. Scanning character by character is what distinguishes a
 * line that merely contains quotes from one that ENDS inside a string; counting quote marks cannot,
 * because a line can hold an odd number of each and still end closed.
 */
function danglingQuote(line) {
  let open = null;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (open === null && (c === '"' || c === "'")) open = c;
    else if (open === c) open = null;
    else if (open === '"' && c === "\\") i += 1; // escapes act only inside double quotes
  }
  return open;
}

/** The delimiter a line's heredoc redirection opens, or null. `<<-` and quoted forms included. */
function heredocDelimiter(line) {
  const m = line.match(/<<-?\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))/);
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
}

function invocations(run, pattern) {
  const found = [];
  let heredoc = null; // inside a heredoc payload: every line is data
  let quoted = null;  // inside a string opened on an earlier line: likewise
  for (const raw of run.split("\n")) {
    if (heredoc !== null) {
      if (raw.trim() === heredoc) heredoc = null;
      continue;
    }
    if (quoted !== null) {
      if (raw.includes(quoted)) quoted = null;
      continue;
    }
    const line = raw.replace(/#.*$/, "");
    for (const m of line.matchAll(pattern)) {
      const before = line.slice(0, m.index);
      const atCommandStart = /(?:^|[;&|(]|\b(?:then|do|else)\b)\s*(?:(?:node|pnpm\s+(?:exec|dlx)|npx)\s+)?$/.test(before);
      const insideQuotes = danglingQuote(before) !== null;
      const echoed = /\b(?:echo|printf)\b|(?:^|\s):\s/.test(before);
      if (atCommandStart && !insideQuotes && !echoed) found.push({ script: m[1], line });
    }
    // State for the lines that follow. A real command can itself open a heredoc, so this runs after
    // the match above rather than instead of it.
    const delimiter = heredocDelimiter(raw);
    if (delimiter !== null) heredoc = delimiter;
    else quoted = danglingQuote(line);
  }
  return found;
}

// ── Rules ────────────────────────────────────────────────────────────────────

const escapeRe = (literal) => literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A loop is `guarded` only when one chain holds end to end: this script's list is captured into a
 * variable, a count is derived from THAT variable, one statement tests THAT count and exits
 * non-zero, and the loop iterates THAT variable. `bare` is the #516 shape, named explicitly. Any
 * other arrangement is `unrecognised` and reported with the link that broke, because a block this
 * cannot follow is a block nobody should be told is safe.
 *
 * The chain replaces two independent regexes over the whole block, which Codex's exact-head review
 * of `a807ea89` reproduced as a fail-open: a step that captured the list, only WARNED under
 * `[ "$count" -lt 1 ]`, and carried an unrelated `exit 1` elsewhere was classified `guarded` while
 * its empty-list path still exited 0. Two true facts about a block do not make them one statement,
 * and only one statement actually fails closed.
 */
function loopShape(run, script) {
  const lines = run.split("\n").map((l) => l.replace(/#.*$/, ""));
  const text = lines.join("\n");
  const self = escapeRe(script);

  if (new RegExp(`for\\s+\\w+\\s+in\\s+\\$\\([^)]*${self}\\s+--list-negatives`).test(text)) return { shape: "bare" };

  const captured = text.match(new RegExp(`^\\s*(\\w+)=\\$\\([^)]*${self}\\s+--list-negatives[^)]*\\)\\s*$`, "m"));
  if (!captured) return { shape: "unrecognised", why: "the list is neither the `for` word list nor captured into a variable of its own" };
  const list = captured[1];

  const counted = text.match(new RegExp(`^\\s*(\\w+)=\\$\\([^)]*\\$(?:\\{${list}\\}|${list}\\b)[^)]*\\)`, "m"));
  if (!counted) return { shape: "unrecognised", why: `no count is derived from $${list}` };
  const count = counted[1];

  const refuses = lines.some((l) =>
    new RegExp(`\\$(?:\\{${count}\\}|${count}\\b)`).test(l)
    && /-lt\s+1|-eq\s+0|-le\s+0|!\s*-gt\s+0/.test(l)
    && /exit\s+[1-9]/.test(l));
  if (!refuses) return { shape: "unrecognised", why: `no single statement both tests $${count} for emptiness and exits non-zero` };

  if (!new RegExp(`for\\s+\\w+\\s+in\\s+\\$(?:\\{${list}\\}|${list}\\b)`).test(text)) {
    return { shape: "unrecognised", why: `the loop does not iterate $${list}, so the guard protects a list the loop does not use` };
  }
  return { shape: "guarded" };
}

function run({ control } = {}) {
  const registries = discoverRegistries();
  const { loops, matrices } = discoverDrivers();
  const exceptions = control === "stale-exception"
    // A site that IS guarded, claimed as an exception. check-create-schema's loop is guarded on
    // `6b1c990e`, so this is the real stale shape and not an invented one.
    ? [...UNGUARDED_LOOP_EXCEPTIONS, { workflow: "ci.yml", job: "build", step: "Create document schema: negative controls", script: "scripts/check-create-schema.mjs", owner: "#542" }]
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
  if (control === "heredoc-payload-counts-as-a-driver") {
    // The shape Codex reproduced against `ab8251b6`: the step prints the command from a heredoc.
    // Asserted through the real detector, so this control fails if `invocations()` ever stops
    // carrying heredoc state across lines.
    const printed = invocations(
      'cat <<\'EOF\'\nnode scripts/check-taxonomy-namespaces.mjs --negative="$CONTROL"\nEOF\n',
      /(\S+\.mjs)\s+--negative=/g,
    );
    if (printed.length === 0) driven.delete("scripts/check-taxonomy-namespaces.mjs");
  }
  if (control === "mentioned-not-invoked") {
    // What `invocations()` must refuse: the step prints the command instead of running it. Asserted
    // through the real detector rather than by deleting from the set, so this control fails if
    // `invocations()` ever goes back to matching text.
    const echoed = invocations('echo node scripts/check-taxonomy-namespaces.mjs --negative="$CONTROL"\n', /(\S+\.mjs)\s+--negative=/g);
    if (echoed.length === 0) driven.delete("scripts/check-taxonomy-namespaces.mjs");
  }
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
  //
  // Each control below injects a SITE into `loops` and lets the rule judge it, rather than
  // recording the expected failure itself. Codex's exact-head review of `a807ea89` found the
  // version that recorded it: `unguarded-loop-appears` passed even with the whole rule deleted, so
  // the central fail-open check had no working control while CI reported that control as green —
  // the exact shape of defect this gate exists to catch, inside the gate.
  if (control === "unguarded-loop-appears") {
    loops.push({
      workflow: "a11y-browser.yml", job: "navigation-negative-controls", step: "A newly added negative-control loop",
      script: "scripts/check-taxonomy-namespaces.mjs",
      run: 'for control in $(node scripts/check-taxonomy-namespaces.mjs --list-negatives); do\n  node scripts/check-taxonomy-namespaces.mjs --negative="$control"\ndone\n',
    });
  }
  if (control === "warning-only-guard") {
    loops.push({
      workflow: "a11y-browser.yml", job: "navigation-negative-controls", step: "A loop that warns instead of exiting",
      script: "scripts/check-taxonomy-namespaces.mjs",
      run: 'controls=$(node scripts/check-taxonomy-namespaces.mjs --list-negatives)\n'
        + 'count=$(printf \'%s\\n\' "$controls" | grep -c . || true)\n'
        + 'if [ "$count" -lt 1 ]; then echo "warning: no negative controls were listed"; fi\n'
        + 'for control in $controls; do\n'
        + '  node scripts/check-taxonomy-namespaces.mjs --negative="$control" || exit 1\n'
        + 'done\n',
    });
  }
  if (control === "exception-leaks-to-another-job") {
    // The SAME script as the first exception entry, bare, in a different job of the same workflow.
    loops.push({
      workflow: "ci.yml", job: "a-second-job", step: "Native publish preflight: negative controls",
      script: "scripts/check-native-publish-preflight.mjs",
      run: 'for control in $(node scripts/check-native-publish-preflight.mjs --list-negatives); do\n  node scripts/check-native-publish-preflight.mjs --negative="$control"\ndone\n',
    });
  }

  const siteKey = (s) => `${s.workflow}::${s.job}::${s.step}::${s.script}`;
  const excepted = new Set(exceptions.map(siteKey));
  for (const loop of loops) {
    const { shape, why } = loopShape(loop.run, loop.script);
    if (shape === "guarded") continue;
    if (shape === "bare" && excepted.has(siteKey(loop))) continue;
    const because = shape === "bare" ? "" : ` — ${why}`;
    fail("loop-shape-guarded", `${loop.workflow} job ${loop.job} step "${loop.step}" drives ${loop.script} with an unguarded loop${because}; capture the list, derive a count from it, exit non-zero in that same statement when it is short, and iterate the captured list, as #542 does`);
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
    const site = loops.find((l) => siteKey(l) === siteKey(e));
    if (!site) {
      fail("exceptions-are-live", `the exception for ${e.script} in ${e.workflow} job ${e.job} step "${e.step}" names a loop that no longer exists there; delete it from UNGUARDED_LOOP_EXCEPTIONS (it was waiting on ${e.owner})`);
      continue;
    }
    if (loopShape(site.run, site.script).shape === "guarded") {
      fail("exceptions-are-live", `${e.script} in ${e.workflow} job ${e.job} step "${e.step}" is guarded now, so its exception has expired; delete that line from UNGUARDED_LOOP_EXCEPTIONS (it was waiting on ${e.owner})`);
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
for (const e of UNGUARDED_LOOP_EXCEPTIONS) console.log(`  unguarded loop: ${e.script} in ${e.workflow} job ${e.job} step "${e.step}", until ${e.owner} merges`);
for (const o of ORPHANED_REGISTRY_EXCEPTIONS) console.log(`  driven by nothing: ${o.script} — ${o.why}`);
