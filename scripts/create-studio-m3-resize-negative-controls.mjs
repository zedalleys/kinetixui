#!/usr/bin/env node
/**
 * create-studio-m3-resize-negative-controls.mjs — proof that the M3-C resize checks in
 * `scripts/create-studio-canvas-browser.mjs` can actually fail.
 *
 * Six defects were repaired on this branch, and one invariant the last repair depends on is gated too, and the last three are instances of one mistake: a
 * measurement that names the causes which can invalidate it. Three were invisible to the 25 checks
 * the gate already had, and three were invisible to every gate in the repository, so each repair
 * owes a control that reintroduces exactly that defect and shows the REAL gate going red for the
 * reason the repair exists — not merely going red.
 *
 *   effective-props-reverted  the handle reads base `node.props` again, so every keyboard press at
 *                             a breakpoint writes base + step and the frame never advances.
 *   guide-on-the-wrapper      the guide measures the full-width `.studio-node` wrapper again, so on
 *                             a narrow frame it is drawn hundreds of pixels from the edge it claims.
 *   nothing-sees-the-candidate-width
 *                             BOTH invalidation paths stop seeing the candidate width — the effect
 *                             is pinned to a list without it and the section is unobserved — so the
 *                             guide stays at the edge the gesture started from.
 *   measurement-pinned-to-named-causes
 *                             the measurement is pinned to a dependency list that ENUMERATES what
 *                             moves the frame, which is how two reachable cases were missed: a
 *                             camera pan and an editing-viewport change, each of which moves the
 *                             frame while the width and the guide are unchanged.
 *   identity-guard-removed    the guard that lets React bail out is gone, so a measurement with no
 *                             dependency list re-renders itself without ever settling. EVIDENCE
 *                             ONLY: measured, this breaks the editor 22 checks before the settle
 *                             assertion, so no failure can name that behaviour. Its bar is instead
 *                             that the gate fails and the failure is not one another control owes.
 *   canvas-not-observed       the canvas is no longer observed, so geometry that moves with no
 *                             render at all — the window resizing, which restates the canvas's own
 *                             width — is never remeasured.
 *   rtl-logical-property      the guide is placed with `inset-inline-start` again, which resolves to
 *                             `right` in a right-to-left document and mirrors a physical
 *                             measurement twice.
 *   rtl-arrow-direction-flipped
 *                             the direction factor on the keyboard handler becomes a constant, so
 *                             ArrowLeft shrinks a right-anchored RTL frame instead of growing it.
 *                             Before the four RTL arrow checks this control answers, that mutation
 *                             passed all 39 of the gate's checks.
 *
 * Each control is a source mutation, which cannot be injected through a seam the way a stylesheet
 * can: these defects live in React's own reading of the document. So every mutation is applied in a
 * DISPOSABLE git worktree at this exact HEAD, served by its own dev server, and the worktree is
 * destroyed afterwards. The checkout you are sitting in is never modified, which also means an
 * interrupted run cannot leave a mutation behind to be committed by accident.
 *
 * What each control must do to count:
 *   - the gate must exit NONZERO (a grep over its whole output would match the gate's own
 *     diagnostics, which quote these very messages), and
 *   - the terminal failure — everything after the last `PASS ` line — must name the behaviour the
 *     repair protects.
 *
 * Usage: node scripts/create-studio-m3-resize-negative-controls.mjs
 * Env:   PLAYWRIGHT_CHROMIUM_PATH (as the gate itself takes), CONTROL_PORT (default 3171).
 */
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repo = resolve(import.meta.dirname, "..");
const git = (...args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
const head = git("rev-parse", "HEAD");
const out = resolve(process.env.CREATE_ARTIFACTS ?? ".impeccable/review/create-studio-m3-controls");
await mkdir(out, { recursive: true });
const basePort = Number(process.env.CONTROL_PORT ?? 3171);

/**
 * Each control names the one file it touches, the exact replacement, and the failure(s) it owes.
 * `owes` is a list because a defect can surface at more than one assertion, and which one the gate
 * reaches first is an ordering detail of the gate rather than a property of the defect. Every
 * fragment listed must name the behaviour the repair protects — never a generic word that any
 * failure would contain.
 */
const CONTROLS = [
  {
    name: "effective-props-reverted",
    file: "apps/web/src/components/create-studio/node-view.tsx",
    from: [
      'const resizable = !preview && !!resize && node.ref === "layout:section" && effective.widthMode !== "fill" && selection.includes(node.id);',
      "const currentWidth = Number(resize?.active?.nodeId === node.id ? resize.active.width : effective.width);",
    ],
    to: [
      'const resizable = !preview && !!resize && node.ref === "layout:section" && p.widthMode !== "fill" && selection.includes(node.id);',
      "const currentWidth = Number(resize?.active?.nodeId === node.id ? resize.active.width : p.width);",
    ],
    // Either assertion names this defect, and which one the gate reaches first is an ordering
    // detail of the gate, not a property of the defect: with base props the announcement is wrong
    // BEFORE the second press can be wrong. Measured — it stops at the announcement.
    owes: ["must be the effective width at the editing viewport", "must each advance from the RENDERED width"],
  },
  {
    name: "guide-on-the-wrapper",
    file: "apps/web/src/components/create-studio/create-studio.tsx",
    from: ['const section = canvas.querySelector(`[data-studio-node="${nodeId}"]`)?.querySelector(":scope > div > section");'],
    to: ['const section = canvas.querySelector(`[data-studio-node="${nodeId}"]`);'],
    // Controls 2 and 3 trip the SAME assertion, so each needs a discriminator in the measured
    // numbers or neither one's evidence is attributable. A guide drawn on the wrapper is exactly on
    // the wrapper, so its failure reports `off the wrapper by 0px`.
    owes: ["must be drawn on the frame's own rendered edge, not its wrapper's"],
    // |off the wrapper| is ~0 and |off the frame| is huge: the guide IS the wrapper's edge.
    discriminates: ({ frame, wrapper }) => frame !== null && Math.abs(wrapper) <= 3 && Math.abs(frame) > 100,
  },
  {
    name: "nothing-sees-the-candidate-width",
    file: "apps/web/src/components/create-studio/create-studio.tsx",
    // BOTH invalidation paths, because either one alone still catches the candidate width: pinning
    // the effect leaves the observer watching the section, which resizes under the drag. Measured —
    // the single-hunk version of this control reddened four checks later, at another assertion. A
    // defect the repair catches by a second route is no defect at all, and a control that cannot
    // reintroduce one proves nothing.
    from: [
      "  React.useLayoutEffect(() => { measure(); });",
      "    observer.observe(canvas);\n    observer.observe(section);",
    ],
    to: [
      "  React.useLayoutEffect(() => { measure(); }, [canvas, nodeId, guide, rtl]);",
      "    observer.observe(canvas);\n    void section;",
    ],
    owes: ["must be drawn on the frame's own rendered edge"],
    // The mirror image of control 2: the guide lags the frame by a step, so |off the frame| is
    // small but nonzero while |off the wrapper| stays huge. That is what separates the two.
    discriminates: ({ frame, wrapper }) => frame !== null && Math.abs(frame) > 3 && Math.abs(wrapper) > 100,
  },
  {
    name: "measurement-pinned-to-named-causes",
    file: "apps/web/src/components/create-studio/create-studio.tsx",
    from: ["  React.useLayoutEffect(() => { measure(); });"],
    to: ["  React.useLayoutEffect(() => { measure(); }, [canvas, nodeId, width, guide, rtl]);"],
    // The dependency list that enumerates the causes which move the frame. TWO were missed in
    // review this way — a camera pan and an editing-viewport change — so this control carries both
    // messages: which one the gate reaches first is its own ordering, not a property of the defect.
    owes: [
      "a pan during a resize must keep the guide on the frame's rendered edge",
      "a viewport change during a resize must keep the guide on the frame's rendered edge",
    ],
  },
  {
    name: "canvas-not-observed",
    file: "apps/web/src/components/create-studio/create-studio.tsx",
    from: ["    observer.observe(canvas);\n    observer.observe(section);"],
    to: ["    void canvas;\n    observer.observe(section);"],
    // The case neither a commit nor any dependency list can catch: the canvas resizes with no state
    // change to render on. Only the observer sees it.
    owes: ["must be remeasured when the canvas resizes with no render of its own"],
  },
  {
    name: "identity-guard-removed",
    file: "apps/web/src/components/create-studio/create-studio.tsx",
    from: ["    setGeometry(previous => previous && Object.keys(next).every(key => Math.abs(previous[key as keyof typeof next] - next[key as keyof typeof next]) < 0.5) ? previous : next);"],
    to: ["    setGeometry(next);"],
    // The guard is what makes a measurement with no dependency list safe: without it every commit
    // writes a NEW object, which re-renders, which measures again. This control proves the gate can
    // see that, and the measured churn is what distinguishes it.
    // MEASURED, and not what I expected: removing the guard does not make the measurement merely
    // churn, it makes the editor stop responding — the run dies on the inspector's own Width field
    // 22 checks before the settle assertion. So this control cannot name that behaviour, and it is
    // recorded as EVIDENCE rather than proof: the gate must still fail, and the failure must not be
    // one another control owes, or this control would be credited for someone else's cause.
    owes: [],
    evidenceOnly: "removing the guard breaks the editor before the settle assertion is reached, so no failure can name it",
    // So the bar is: the gate ran deep into the editor, and the failure is the editor becoming
    // unusable — not an empty output, a server that never started or a browser that never launched.
    requires: ["locator.inputValue", "getByLabel('Width'"],
    minPasses: 10,
  },
  {
    name: "rtl-logical-property",
    file: "apps/web/src/components/create-studio/create-studio.tsx",
    from: ['style={{ left: edge, top: 0, height }}'],
    to: ['style={{ insetInlineStart: edge, top: 0, height }}'],
    owes: ["the guide must be drawn on the frame's own left edge"],
  },
  {
    name: "rtl-arrow-direction-flipped",
    file: "apps/web/src/components/create-studio/node-view.tsx",
    // The owner's adopted contract, reduced to a constant: arrows would then move the MODEL the way
    // the key is named while the handle they drag moves the opposite way on a right-anchored frame.
    // Before the checks this control answers, this mutation passed all 39 of the gate's checks,
    // because none of them pressed an arrow key in a right-to-left document.
    from: ['const towardsEnd = dir === "rtl" ? -1 : 1;'],
    to: ["const towardsEnd = 1;"],
    // ArrowLeft is what the contract says grows the frame; the assertion that names it is the one
    // this defect must reach. ArrowRight is listed too because which of the two the gate reaches
    // first is its own ordering, not a property of the defect.
    owes: [
      "in an RTL document ArrowLeft must GROW the frame",
      "in an RTL document ArrowRight must SHRINK the frame",
    ],
  },
];

/** The failure a run ended on: everything after the last line the gate reported as a pass. */
const terminalFailure = output => {
  const lines = output.split("\n");
  let last = -1;
  lines.forEach((line, index) => { if (line.startsWith("PASS ")) last = index; });
  return lines.slice(last + 1).join("\n");
};

const workspace = await mkdtemp(join(tmpdir(), "m3-resize-controls-"));
const tree = join(workspace, "tree");
const findings = [];
try {
  // A worktree at the exact HEAD, with `node_modules` and the built package `dist` directories
  // HARD-LINKED in: pnpm's links are relative, so they resolve inside the copy, and `dist` is
  // gitignored but `apps/web`'s test setup rightly refuses an unbuilt one.
  git("worktree", "add", "--detach", tree, head);
  execFileSync("cp", ["-al", join(repo, "node_modules"), join(tree, "node_modules")]);
  execFileSync("cp", ["-al", join(repo, "apps/web/node_modules"), join(tree, "apps/web/node_modules")]);
  for (const name of ["ui", "tokens", "iot", "cli"]) {
    const dist = join(repo, "packages", name, "dist");
    if (existsSync(dist)) execFileSync("cp", ["-al", dist, join(tree, "packages", name, "dist")]);
  }

  for (const [index, control] of CONTROLS.entries()) {
    const path = join(tree, control.file);
    const original = await readFile(path, "utf8");
    let mutated = original;
    control.from.forEach((needle, i) => {
      assert.equal(mutated.split(needle).length - 1, 1, `control "${control.name}" must match its target exactly once in ${control.file}`);
      mutated = mutated.replace(needle, control.to[i]);
    });
    assert.notEqual(mutated, original, `control "${control.name}" changed nothing`);
    await writeFile(path, mutated);

    const port = basePort + index;
    const base = `http://127.0.0.1:${port}`;
    const server = spawn("pnpm", ["--filter", "@kinetixui/web", "exec", "next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: tree, detached: true, stdio: "ignore",
      env: { ...process.env, KINETIX_CREATE_DEV: "1", KINETIX_CREATE_DEV_DIR: join(workspace, `dev-${control.name}`) },
    });
    let result;
    try {
      // Readiness is checked OUTSIDE the catch below, and deliberately: an unready server, a
      // browser that will not launch or a run killed by the timeout are INFRASTRUCTURE failures,
      // and a catch that folded them into `{ status: 1 }` would hand a control a nonzero exit it
      // did not earn — measured on the evidence-only control, whose weaker bar such a failure met
      // with an empty output. These are fatal and stop the run.
      let ready = false;
      for (let attempt = 0; attempt < 120 && !ready; attempt += 1) {
        ready = await fetch(`${base}/create/studio`).then(response => response.ok).catch(() => false);
        if (!ready) await new Promise(done => setTimeout(done, 1000));
      }
      assert.ok(ready, `the control server for "${control.name}" never became ready on ${base}`);
      try {
        const output = execFileSync("node", [join(repo, "scripts/create-studio-canvas-browser.mjs")], {
          cwd: tree, encoding: "utf8", stdio: "pipe", timeout: 900_000,
          env: { ...process.env, CREATE_BASE: base, CREATE_ARTIFACTS: join(workspace, `evidence-${control.name}`) },
        });
        result = { status: 0, output };
      } catch (error) {
        // Only an ordinary nonzero EXIT of the gate is a result. No numeric status means the
        // process could not be spawned, and a signal means it was killed — the timeout sends
        // SIGTERM — so neither says anything about the mutation.
        if (typeof error.status !== "number" || error.signal) {
          throw new Error(`the gate did not run to a verdict for control "${control.name}": ${error.signal ? `killed by ${error.signal}` : String(error.message ?? error)}`);
        }
        result = { status: error.status, output: `${error.stdout ?? ""}\n${error.stderr ?? ""}` };
      }
    } finally {
      // The dev server spawns `next` as a child, so it dies as a process GROUP or it keeps writing
      // into a worktree that is about to be removed.
      try { process.kill(-server.pid, "SIGKILL"); } catch { /* already gone */ }
      await writeFile(path, original);
    }

    const failure = terminalFailure(result.output);
    const matched = control.owes.filter(fragment => failure.includes(fragment));
    // An evidence-only control owes no assertion message, so its bar is threefold: it must not be
    // credited for a failure another control owes, it must name the failure it DID observe, and the
    // gate must have run deep enough to have reached the mutation at all. Excluding the others'
    // fragments alone would also be met by an empty output.
    const borrowed = control.evidenceOnly
      ? CONTROLS.flatMap(other => (other === control ? [] : other.owes)).filter(fragment => failure.includes(fragment))
      : [];
    const passes = (result.output.match(/^PASS /gm) ?? []).length;
    const required = (control.requires ?? []).filter(fragment => failure.includes(fragment));
    const reached = passes >= (control.minPasses ?? 0);
    // Controls 2 and 3 trip the same assertion, so naming it is not enough: the measured offsets
    // have to say WHICH defect produced it, or one control could be credited for the other's cause.
    const offsets = /off the frame by (-?\d+)px, off the wrapper by (-?\d+)px/.exec(failure);
    const measured = { frame: offsets ? Number(offsets[1]) : null, wrapper: offsets ? Number(offsets[2]) : null };
    const discriminated = control.discriminates ? control.discriminates(measured) : true;
    const detected = control.evidenceOnly
      ? result.status !== 0 && borrowed.length === 0 && required.length === (control.requires ?? []).length && reached
      : result.status !== 0 && matched.length > 0 && discriminated;
    findings.push({
      control: control.name, file: control.file, exitStatus: result.status, owes: control.owes, matched,
      classification: control.evidenceOnly ? "evidence" : "proof", evidenceOnly: control.evidenceOnly ?? null, borrowed,
      requires: control.requires ?? null, required, minPasses: control.minPasses ?? null, reached,
      measuredOffsets: measured, discriminated, detected,
      passesBeforeFailure: (result.output.match(/^PASS /gm) ?? []).length,
      failure: failure.split("\n").filter(Boolean).slice(0, 6).join("\n"),
    });
    console.log(`CONTROL ${control.name} → exit ${result.status}, ${detected ? "detected" : "NOT DETECTED"}${control.evidenceOnly ? " (evidence, not proof)" : ""}`);
    console.log(failure.split("\n").filter(Boolean).slice(0, 3).map(line => "  " + line).join("\n"));
  }
} finally {
  git("worktree", "remove", "--force", tree);
  await rm(workspace, { recursive: true, force: true });
}

await writeFile(resolve(out, "m3-resize-controls.json"), JSON.stringify({ head, findings }, null, 2) + "\n");
const missed = findings.filter(finding => !finding.detected);
assert.deepEqual(missed, [], `these controls did not make the gate fail for their own reason:\n${JSON.stringify(missed, null, 2)}`);
console.log(JSON.stringify({ head, controls: findings.length, out }));
