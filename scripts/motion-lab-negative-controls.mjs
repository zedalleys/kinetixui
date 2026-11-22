/**
 * Negative controls for the Motion Lab's gates: `scripts/motion-lab-browser.mjs`, `scripts/motion-lab-source.mjs`
 * and `apps/web/src/lib/motion-lab/spring.test.ts`.
 *
 * Every claim the lab makes about motion — that an interrupted indicator continues from where it is drawn,
 * that a reduced-motion reader reaches the end state, that RTL mirrors instead of travelling the wrong way,
 * that nothing keeps running once a travel settles — is a claim about behaviour the gates assert. A gate that
 * has never been shown failing is a comment with a test runner attached, so each control here puts one of
 * those defects back and requires the named check to go red.
 *
 * ── How a control is judged ────────────────────────────────────────────────
 *
 * NONZERO EXIT, AND THE NAMED FAILURE.  Grepping the gate's whole output is not enough: the gate PRINTS every
 *     check's label, pass or fail, so "reduced motion" appears in a fully green run. A control counts only
 *     when the gate exits nonzero AND the expected pattern appears in the terminal failure block — the lines
 *     after `motion-lab-browser: N failure(s)` — which is the gate's own list of what actually broke.
 * A BUILD ERROR IS NOT A DETECTION.  A mutation that does not compile proves nothing about the gate, so a
 *     failed build is reported as an ERROR for that control, never as a pass.
 * THE SUBSTRATE IS VALIDATED FIRST.  Before any mutation, the unmutated worktree is built and the full gate
 *     is run over it. If the clean tree is not green, every later "the gate went red" is uninterpretable.
 * THE MUTATION MUST BITE.  Each anchor must occur EXACTLY once in the file. Zero occurrences (the code moved)
 *     or several (the anchor is ambiguous) abort the suite loudly rather than mutating something else.
 *
 * ── Why a worktree ─────────────────────────────────────────────────────────
 *
 * These mutations are in TypeScript and CSS that Next compiles, so unlike the in-memory controls in
 * `motion-identity-negative-controls.mjs` each one costs a rebuild. `docs-column-negative-controls.mjs`
 * mutates the real tree and restores byte-for-byte; this suite instead does its work in a DISPOSABLE
 * `git worktree` at a given commit, so there is no restore path that can lose someone's uncommitted work —
 * the failure mode a sibling session hit by arming a restoring trap before its own clean-tree check. The
 * worktree is created, used and removed; the developer's checkout is never written to.
 *
 *   node scripts/motion-lab-negative-controls.mjs                 # all controls, worktree at HEAD
 *   node scripts/motion-lab-negative-controls.mjs --commit <sha>  # at a specific commit
 *   node scripts/motion-lab-negative-controls.mjs --only 3,7      # just those control ids
 *   node scripts/motion-lab-negative-controls.mjs --keep          # leave the worktree for inspection
 *
 * `PLAYWRIGHT_CHROMIUM_PATH` is honoured and passed through, for hosts whose Chromium revision does not
 * match the one Playwright asks for.
 */
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
};
const COMMIT = arg("--commit", "HEAD");
const PORT = arg("--port", "3141");
const BASE = `http://127.0.0.1:${PORT}`;
const ONLY = new Set((arg("--only", "") || "").split(",").map((s) => s.trim()).filter(Boolean));
const KEEP = process.argv.includes("--keep");

const ENGINE = "apps/web/src/lib/motion-lab/use-track-indicator.ts";
const SPRING = "apps/web/src/lib/motion-lab/spring.ts";
const CSS = "apps/web/src/app/labs/motion/motion-lab.css";
const SHELL = "apps/web/src/components/motion-lab/motion-lab.tsx";
const LAB_SEG = "apps/web/src/components/motion-lab/lab-segmented-control.tsx";

/**
 * The ten defects named in the brief, each as one mutation of the candidate's own source.
 *
 * `sections` keeps a control to the gate sections that can see it: the gate takes `--only`, and running all
 * 90-odd checks for every control would make the suite slow enough that nobody runs it, which is the same as
 * not having one. The cost is that a control proves its sections notice the defect, not that no other section
 * does; `--only` is omitted for the clean baseline, which is where the whole gate is exercised.
 */
const CONTROLS = [
  {
    id: 1,
    brief: "an animation that moves in the wrong direction",
    name: "LTR placement uses the RTL (mirrored) offset",
    file: ENGINE,
    sections: "1",
    from: `        : rtl
          ? track.clientWidth - item.offsetLeft - item.offsetWidth
          : item.offsetLeft;`,
    to: `        : rtl
          ? track.clientWidth - item.offsetLeft - item.offsetWidth
          : track.clientWidth - item.offsetLeft - item.offsetWidth;`,
    expect: /glide forward (settles on the chosen segment|never reverses direction)/,
  },
  {
    id: 2,
    brief: "an indicator that jumps after an interrupted retargeting",
    name: "the spring reseeds from the stale logical origin on every retarget",
    file: ENGINE,
    sections: "2",
    from: `        if (!raf) {
          springStart = { x: start, v: 0 };
          springEnd = { x: end, v: 0 };
        }`,
    to: `        {
          springStart = { x: start, v: 0 };
          springEnd = { x: end, v: 0 };
        }`,
    expect: /spring: (retarget continues from the rendered position|never resets)/,
  },
  {
    id: 3,
    brief: "motion that still animates under reduced motion",
    name: "the reduced-motion term is dropped from the travel decision",
    file: ENGINE,
    sections: "3,4",
    from: `const travels = travel !== "none" && !reduced() && !reframed && chosen !== null && chosen !== item;`,
    to: `const travels = travel !== "none" && !reframed && chosen !== null && chosen !== item;`,
    expect: /reduced motion|the lab's switch|no interpolation/i,
  },
  {
    id: 4,
    brief: "RTL behaviour that uses the LTR geometry",
    name: "the RTL mirror is removed, so RTL places from the left edge",
    file: ENGINE,
    sections: "5",
    from: `      const nextStart = vertical
        ? item.offsetTop
        : rtl
          ? track.clientWidth - item.offsetLeft - item.offsetWidth
          : item.offsetLeft;`,
    to: `      const nextStart = vertical
        ? item.offsetTop
        : item.offsetLeft;`,
    expect: /RTL/,
  },
  {
    id: 5,
    brief: "a disabled control that can still be activated",
    name: "the disabled segment is enabled",
    file: SHELL,
    sections: "7",
    from: `  { value: "year", label: "Year", disabled: true },`,
    to: `  { value: "year", label: "Year" },`,
    expect: /disabled segment/,
  },
  {
    id: 6,
    brief: "focus that disappears during or after the interaction",
    name: "the focus ring is suppressed on the lab's segments",
    file: CSS,
    sections: "7",
    append: `
/* control 6 */
.kx-lab-seg [data-state] { outline: none !important; box-shadow: none !important; }
`,
    expect: /focus ring/,
  },
  {
    id: 7,
    brief: "stale listeners or animation frames left running",
    name: "the spring's frame loop is never released at rest",
    file: ENGINE,
    sections: "10",
    from: `      if (done) {
        raf = 0;
        lastFrameTime = 0;
        settle();
        return;
      }`,
    to: `      if (done) {
        settle();
      }`,
    expect: /no frame loop is still running/,
  },
  {
    id: 8,
    brief: "an unnecessary animation restart",
    name: "a placement of the SAME item animates instead of snapping",
    file: ENGINE,
    sections: "13",
    from: `const travels = travel !== "none" && !reduced() && !reframed && chosen !== null && chosen !== item;`,
    to: `const travels = travel !== "none" && !reduced() && !reframed && chosen !== null;`,
    expect: /resize moves the indicator without interpolating/,
  },
  {
    id: 9,
    brief: "hidden decorative content that is keyboard reachable",
    name: "the aria-hidden indicator is given a tab stop",
    file: LAB_SEG,
    sections: "13",
    from: `      <span ref={barRef} aria-hidden="true" className="kx-lab-bar" data-kx-lab-bar="" />`,
    to: `      <span ref={barRef} tabIndex={0} aria-hidden="true" className="kx-lab-bar" data-kx-lab-bar="" />`,
    expect: /no decoration is keyboard reachable/,
  },
  {
    id: 10,
    brief: "rapid interaction that produces an incorrect final state",
    name: "a placement arriving mid-travel is ignored, so alternation ends on a stale segment",
    file: ENGINE,
    sections: "13",
    from: `      if (!reframed && chosen === item && nextStart === start && nextEnd === end) return;`,
    to: `      if (!reframed && chosen === item && nextStart === start && nextEnd === end) return;
      if (track.getAttribute("data-kx-lab-state") === "travelling") return;`,
    expect: /after rapid alternation/,
  },
  {
    // Not one of the brief's ten. It tests the GATE rather than the lab: the gate must not be able to pass
    // when the element every measurement reads is simply gone. This one is judged on the whole output rather
    // than on the failure block, because a missing indicator stops the gate before it can list failures —
    // which is a refusal to report a pass, and is what the control is for.
    id: 11,
    brief: "(the gate cannot pass over a missing indicator)",
    name: "the indicator element is removed from the segmented strip",
    file: LAB_SEG,
    sections: "13",
    matchOutput: true,
    from: `      <span ref={barRef} aria-hidden="true" className="kx-lab-bar" data-kx-lab-bar="" />`,
    to: `      {null}`,
    // The measured refusal: with no indicator the engine never sets `data-kx-lab-measured`, so the gate's
    // own page-ready wait times out. That is the gate declining to measure rather than passing over nothing.
    expect: /(data-kx-lab-measured|Timeout|empty population|no checks ran)/,
  },
];

/** Controls that need no build: the unit suite and the static gate's clauses. */
const CHEAP = [
  {
    id: 12,
    brief: "(the spring's unit contract)",
    name: "the integrator is fed milliseconds as if they were seconds",
    kind: "vitest",
    file: SPRING,
    from: `    const dt = stepMs / 1000;`,
    to: `    const dt = stepMs;`,
    expect: /settl|rest|t95|diverg/i,
  },
];

// ── Preflight, before anything is created or mutated ───────────────────────────────────────────────────────
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", ...opts });
const head = sh("git", ["-C", ROOT, "rev-parse", COMMIT]).trim();
const dirty = sh("git", ["-C", ROOT, "status", "--porcelain"]).trim();
console.log(`motion-lab controls — worktree at ${head.slice(0, 10)}${dirty ? ` (the checkout has uncommitted changes; they are NOT used)` : ""}`);

const WT = mkdtempSync(join(tmpdir(), "kx-m525-controls-"));
rmSync(WT, { recursive: true, force: true });
sh("git", ["-C", ROOT, "worktree", "add", "-q", "--detach", WT, head]);

const cleanup = () => {
  if (KEEP) {
    console.log(`\nworktree kept at ${WT}`);
    return;
  }
  try {
    rmSync(WT, { recursive: true, force: true });
    sh("git", ["-C", ROOT, "worktree", "prune"]);
  } catch (error) {
    console.error(`could not remove the worktree at ${WT}: ${error.message}`);
  }
};

/**
 * `node_modules` is symlinked rather than installed: the worktree is a second checkout of the same commit on
 * the same machine, and a fresh install would cost minutes per run for an identical tree. pnpm itself refuses
 * to run a task when the root `node_modules` is a symlink, so Next is invoked through its own bin shim.
 */
for (const dir of [".", "apps/web", "packages/ui", "packages/tokens", "packages/iot", "packages/cli"]) {
  const real = join(ROOT, dir, "node_modules");
  if (existsSync(real)) symlinkSync(real, join(WT, dir, "node_modules"));
}
/**
 * Each package's `dist` too, and for a reason the suite ran into: `apps/web`'s vitest `globalSetup`
 * (`test/ui-dist-current.mjs`) refuses to run unless `packages/ui/dist` carries a source stamp matching the
 * tree, because the web suite measures the BUILT library. A worktree has no `dist`, so control 12 failed
 * with a setup error that said nothing about the spring — a control reporting a failure it did not cause.
 * The worktree is the same commit as the checkout, so the checkout's stamp is the correct one for it.
 */
for (const dir of ["packages/ui", "packages/tokens", "packages/iot"]) {
  const real = join(ROOT, dir, "dist");
  if (existsSync(real) && !existsSync(join(WT, dir, "dist"))) symlinkSync(real, join(WT, dir, "dist"));
}

let server = null;
const stopServer = async () => {
  if (!server) return;
  server.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 600));
  if (!server.killed) server.kill("SIGKILL");
  server = null;
};

process.on("exit", () => {
  if (server) server.kill("SIGKILL");
});

const buildWeb = () => {
  const out = spawnSync("./node_modules/.bin/next", ["build"], {
    cwd: join(WT, "apps/web"),
    encoding: "utf8",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    maxBuffer: 64 * 1024 * 1024,
  });
  return { ok: out.status === 0, output: `${out.stdout ?? ""}\n${out.stderr ?? ""}` };
};

const startServer = async () => {
  await stopServer();
  server = spawn("./node_modules/.bin/next", ["start", "-p", PORT], {
    cwd: join(WT, "apps/web"),
    stdio: "ignore",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  for (let i = 0; i < 120; i += 1) {
    try {
      const res = await fetch(`${BASE}/labs/motion`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

/** Runs the browser gate against the worktree's server, from the WORKTREE's copy of the gate. */
const runGate = (sections) => {
  const args = ["scripts/motion-lab-browser.mjs", "--base", BASE];
  if (sections) args.push("--only", sections);
  const out = spawnSync("node", args, { cwd: WT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  // The terminal failure block only — the gate prints every label, pass or fail, so matching the whole
  // output would let a green run satisfy a control's pattern.
  const tail = (out.stderr ?? "").split(/motion-lab-browser: \d+ failure\(s\)/).slice(1).join("\n");
  return { status: out.status, tail, output: `${out.stdout ?? ""}\n${out.stderr ?? ""}` };
};

const readWt = (file) => readFileSync(join(WT, file), "utf8");
const applyMutation = (control) => {
  const source = readWt(control.file);
  if (control.append) {
    writeFileSync(join(WT, control.file), `${source}${control.append}`);
    return;
  }
  const hits = source.split(control.from).length - 1;
  if (hits !== 1) {
    throw new Error(
      `control ${control.id}: its anchor occurs ${hits} time(s) in ${control.file}. ` +
        `An anchor that is not unique would mutate the wrong code or nothing at all. Re-point the control.`,
    );
  }
  writeFileSync(join(WT, control.file), source.replace(control.from, control.to));
};
const restore = () => sh("git", ["-C", WT, "checkout", "--", "."]);

const results = [];
let failed = 0;
const record = (control, verdict, detail) => {
  results.push({ control, verdict, detail });
  if (verdict !== "ok") failed += 1;
  const mark = verdict === "ok" ? "✓" : verdict === "error" ? "!" : "✗";
  console.log(`  ${mark} ${String(control.id).padStart(2)}. ${control.name}\n       ${detail}`);
};

try {
  // ── The substrate: the clean worktree must build and pass the WHOLE gate ────────────────────────────────
  process.stdout.write("  building the unmutated worktree… ");
  const baseline = buildWeb();
  if (!baseline.ok) {
    console.error(`\nthe unmutated worktree does not build, so no control could be interpreted:\n${baseline.output.slice(-3000)}`);
    cleanup();
    process.exit(2);
  }
  process.stdout.write("built; ");
  if (!(await startServer())) {
    console.error(`\nthe unmutated worktree's server never answered on ${BASE}.`);
    cleanup();
    process.exit(2);
  }
  const clean = runGate(null);
  if (clean.status !== 0) {
    console.error(`\nthe unmutated worktree does not pass its own gate, so "the gate went red" would mean nothing:\n${clean.output.slice(-3000)}`);
    cleanup();
    process.exit(2);
  }
  const cleanCount = /ok — (\d+) checks/.exec(clean.output)?.[1] ?? "?";
  console.log(`gate green over ${cleanCount} checks. That is the baseline every control below is measured against.\n`);

  for (const control of CONTROLS) {
    if (ONLY.size && !ONLY.has(String(control.id))) continue;
    restore();
    applyMutation(control);
    const build = buildWeb();
    if (!build.ok) {
      record(control, "error", `the mutation does not compile, so it says nothing about the gate: ${build.output.trim().split("\n").slice(-4).join(" / ").slice(0, 300)}`);
      continue;
    }
    if (!(await startServer())) {
      record(control, "error", `the mutated build's server never answered on ${BASE}`);
      continue;
    }
    const run = runGate(control.sections);
    const judged = control.matchOutput ? run.output : run.tail;
    if (run.status === 0) {
      record(control, "undetected", `the gate PASSED with this defect in place (sections ${control.sections}). The defect is not covered.`);
      continue;
    }
    if (!control.expect.test(judged)) {
      record(
        control,
        "wrong-reason",
        `the gate failed, but not for the named reason — ${control.expect} did not match its ${control.matchOutput ? "output" : "failure block"}: ${judged.trim().slice(0, 300)}`,
      );
      continue;
    }
    const lines = run.tail.trim().split("\n").filter((l) => l.trim().startsWith("-"));
    const refusal = judged.split("\n").find((l) => control.expect.test(l))?.trim();
    record(control, "ok", lines.length ? `caught by ${lines.length} failing check(s): ${lines[0].trim().slice(2, 160)}` : `the gate refused to report a pass: ${(refusal ?? "see output").slice(0, 160)}`);
  }
  await stopServer();
  restore();

  // ── The cheap controls: no build, no server ─────────────────────────────────────────────────────────────
  for (const control of CHEAP) {
    if (ONLY.size && !ONLY.has(String(control.id))) continue;
    restore();
    applyMutation(control);
    const out = spawnSync("./node_modules/.bin/vitest", ["run", "src/lib/motion-lab/spring.test.ts"], {
      cwd: join(WT, "apps/web"),
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    const text = `${out.stdout ?? ""}\n${out.stderr ?? ""}`;
    if (out.status === 0) record(control, "undetected", "the unit suite PASSED with the integrator's units wrong.");
    else if (!control.expect.test(text)) record(control, "wrong-reason", `the suite failed, but ${control.expect} did not match: ${text.trim().slice(-300)}`);
    else {
      const names = [...text.matchAll(/[×✗]\s+(.+)/g)].map((m) => m[1].trim());
      record(control, "ok", `caught by ${names.length} failing test(s): ${names[0]?.slice(0, 140) ?? "see output"}`);
    }
    restore();
  }

  // ── The static gate's clauses, substituted in memory ────────────────────────────────────────────────────
  const SOURCE_CONTROLS = [
    { id: 13, name: "`transition-all` in a lab file", file: CSS, append: `\n.kx-lab-probe { transition: all 300ms; }\n`, expect: /transition-all/ },
    { id: 14, name: "an unnamed transition shorthand", file: CSS, append: `\n.kx-lab-probe { transition: var(--duration-base) var(--easing-standard); }\n`, expect: /unnamed-transition/ },
    { id: 15, name: "an untokenised easing", file: CSS, append: `\n.kx-lab-probe { transition-timing-function: cubic-bezier(0.1, 0.2, 0.3, 0.4); }\n`, expect: /untokenised-easing/ },
    { id: 16, name: "an untokenised duration", file: CSS, append: `\n.kx-lab-probe { transition-duration: 275ms; }\n`, expect: /untokenised-duration/ },
    { id: 17, name: "a layout property animated without an exemption", file: CSS, append: `\n.kx-lab-probe { transition-property: margin-inline-start; }\n`, expect: /layout-property/ },
    { id: 18, name: "the one-way reduced-motion override removed", file: ENGINE, from: `    const reduced = () => reduceQuery.matches || reduceOverride;`, to: `    const reduced = () => reduceOverride;`, expect: /(one-way|reduced)/ },
  ];
  for (const control of SOURCE_CONTROLS) {
    if (ONLY.size && !ONLY.has(String(control.id))) continue;
    const original = readFileSync(join(ROOT, control.file), "utf8");
    let mutated;
    if (control.append) mutated = `${original}${control.append}`;
    else {
      const hits = original.split(control.from).length - 1;
      if (hits !== 1) throw new Error(`control ${control.id}: its anchor occurs ${hits} time(s) in ${control.file}.`);
      mutated = original.replace(control.from, control.to);
    }
    const out = spawnSync("node", ["scripts/motion-lab-source.mjs", "--overrides", JSON.stringify({ [control.file]: mutated })], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const text = `${out.stdout ?? ""}\n${out.stderr ?? ""}`;
    if (out.status === 0) record(control, "undetected", "motion-lab-source PASSED with this clause's defect in place.");
    else if (!control.expect.test(text)) record(control, "wrong-reason", `it failed, but ${control.expect} did not match: ${text.trim().slice(0, 300)}`);
    else record(control, "ok", `caught: ${text.split("\n").find((l) => control.expect.test(l))?.trim().slice(0, 150)}`);
  }
} catch (error) {
  await stopServer();
  console.error(`\nmotion-lab controls aborted: ${error.message}`);
  cleanup();
  process.exit(2);
}

await stopServer();
cleanup();

const ran = results.length;
if (failed) {
  console.error(`\nmotion-lab controls — ${failed} of ${ran} control(s) did not fire for the right reason.`);
  process.exit(1);
}
console.log(
  `\nmotion-lab controls — all ${ran} fire. Each of the brief's ten defects, the gate's own empty-population ` +
    `rule, the spring's units and the static gate's clauses are detected by a named check.`,
);
