// @vitest-environment node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Release isolation (M5.36/M5.37). Production deployment is meant to be a deliberate act — advancing
 * the `release` branch — and `apps/web/vercel.json` is the half of that design which lives in the
 * repository. The Vercel dashboard half can be reverted in a place no diff records; this half cannot,
 * and these tests are what make removing it fail.
 *
 * They live in the web suite rather than as a CI step on purpose: `pnpm --filter @kinetixui/web test`
 * is already a step in `ci.yml`, so the invariant gets hosted execution without a workflow change —
 * the same reason `consumer-gates.test.ts` sits here.
 */
const repo = "../..";
const script = "scripts/check-deploy-isolation.mjs";

const run = (...args: string[]) =>
  execFileSync(process.execPath, [join(repo, script), ...args], { encoding: "utf8" });

describe("deployment isolation", () => {
  // Vercel reads vercel.json from the project's Root Directory, which for this project is
  // apps/web — measured from the Vercel GitHub integration's own payload on PR #673. So
  // apps/web/vercel.json is load-bearing and the root file is inert today; the line is required
  // in both anyway, so that changing the Root Directory cannot silently retire the invariant.
  const configs = ["vercel.json", "apps/web/vercel.json"];

  it.each(configs)("%s excludes main from automatic deployment", (rel) => {
    const config = JSON.parse(readFileSync(join(repo, rel), "utf8"));
    // Asserted here as well as through the script, so the invariant is readable without running it.
    expect(config.git.deploymentEnabled.main).toBe(false);
  });

  it("the gate accepts the tree as it stands", () => {
    expect(run()).toContain("check:deploy-isolation ok");
  });

  it.each(configs)("%s keeps its four historical codex/* exclusions", (rel) => {
    const config = JSON.parse(readFileSync(join(repo, rel), "utf8"));
    const codex = Object.entries(config.git.deploymentEnabled).filter(([branch]) =>
      branch.startsWith("codex/"),
    );
    expect(codex).toHaveLength(4);
    expect(codex.every(([, enabled]) => enabled === false)).toBe(true);
  });

  const controls = run("--list-negatives").trim().split("\n").filter(Boolean);

  it("the negative-control registry is not empty", () => {
    // A loop over an empty listing runs nothing and reports success. Counted here rather than
    // trusted, for the same reason ci.yml's own control loops count before they iterate.
    expect(controls.length).toBeGreaterThan(0);
  });

  it.each(controls)("negative control %s: the gate rejects the injected defect", (control) => {
    // Each control copies the real config, injects one distinct cause, and runs the real check
    // against the copy. It exits non-zero if the check ACCEPTS what it must reject — so a gate
    // that stopped checking fails here rather than passing quietly. Nothing tracked is mutated.
    expect(() => run(`--negative=${control}`)).not.toThrow();
  });

  it("both files are defended by the full set of five causes each", () => {
    // Named rather than counted: a registry that silently lost one file's arms would still be
    // "non-empty", and a loop over the survivors would still report success.
    const causes = [
      "main-key-deleted",
      "main-set-true",
      "main-set-string-false",
      "deployment-enabled-map-deleted",
      "git-key-deleted",
    ];
    expect(controls).toEqual(
      expect.arrayContaining(["root", "web"].flatMap((f) => causes.map((c) => `${f}:${c}`))),
    );
    expect(controls).toHaveLength(10);
  });
  // ---- The control RUNNER (M5.37 repair). ----------------------------------------------------
  // The alias used to be `… --list-negatives | while read c; do … || exit 1; done`, which exited 0
  // on an empty listing, on a lister that failed, and on a lister that printed one name and then
  // failed. These tests are how hosted CI executes the repaired runner and propagates its failures:
  // `pnpm --filter @kinetixui/web test` is already a step in ci.yml.

  it("the repaired runner runs every control and reports the count", () => {
    const out = run("--run-negatives");
    expect(out).toContain("check:deploy-isolation-controls ok");
    // The count is asserted, not just the word ok: "ran 0 controls" must never read as a pass.
    expect(out).toContain(`${controls.length} negative controls ran`);
  });

  const runnerControls = run("--list-runner-controls").trim().split("\n").filter(Boolean);

  it("all three required failure modes have a committed control", () => {
    expect(runnerControls).toEqual([
      "runner-empty-listing",
      "runner-lister-fails",
      "runner-lister-fails-after-partial",
    ]);
  });

  it.each(runnerControls)("runner control %s: the runner rejects the failure mode", (control) => {
    // Each control stages a throwaway copy of the script and both configs, asserts the UNMUTATED
    // copy passes, then mutates the lister branch only — leaving the runner under test intact — and
    // fails if the runner reports success. Measured against the shipped pipe, all three report
    // ACCEPTED (0, 0 and 1 controls run), so these controls can fail.
    expect(() => run(`--runner-control=${control}`)).not.toThrow();
  });

  // ---- The ALIAS, executed rather than described (M5.38 §8). ---------------------------------
  // Everything above runs the script directly. What CI and a human actually invoke is the
  // package.json alias, and a string compare of it is not an execution: a renamed script, a
  // package-manager quirk or a command replaced by `true` would pass the compare below and run
  // nothing. These run the real alias through the package manager, then inject its failure modes.

  it("the real alias runs, through the package manager, and says how many controls ran", () => {
    const out = run("--run-alias");
    expect(out).toContain(`alias ${"check:deploy-isolation-controls"} ran for real`);
    expect(out).toMatch(/\d+ negative controls ran/);
  });

  const aliasControls = run("--list-alias-controls").trim().split("\n").filter(Boolean);

  it("both alias failure modes have a committed control", () => {
    expect(aliasControls).toEqual(["alias-propagates-failure", "alias-neutered"]);
  });

  it.each(aliasControls)("alias control %s: the alias's failure contract holds", (control) => {
    // Each stages a tree carrying the alias string copied VERBATIM out of package.json, proves the
    // unmutated staged alias passes AND prints the runner's success line, then breaks it one way:
    // the runner fails underneath (the alias must exit non-zero), or the alias itself is replaced
    // by `true` (detected by the MISSING success line, since `true` also exits 0).
    //
    // Measured non-vacuity: with the real alias temporarily changed to `… --run-negatives || true`,
    // alias-propagates-failure exits 1. Worth knowing — the positive test above still PASSES against
    // that swallowing alias, because it still prints the line. Only the injected control catches it.
    expect(() => run(`--alias-control=${control}`)).not.toThrow();
  });

  it("the package.json alias drives the runner instead of piping into a shell loop", () => {
    // The defect was the shape, not the words. A reintroduced pipe fails here.
    const scripts = JSON.parse(readFileSync(join(repo, "package.json"), "utf8")).scripts;
    expect(scripts["check:deploy-isolation-controls"]).toBe(
      "node scripts/check-deploy-isolation.mjs --run-negatives",
    );
    expect(scripts["check:deploy-isolation-controls"]).not.toContain("|");
    expect(scripts["check:deploy-isolation-runner-controls"]).not.toContain("|");
    // The alias arms are only meaningful while the alias they measure is the one CI runs.
    expect(scripts["check:deploy-isolation-alias"]).toBe(
      "node scripts/check-deploy-isolation.mjs --run-alias",
    );
    expect(scripts["check:deploy-isolation-alias-controls"]).toBe(
      "node scripts/check-deploy-isolation.mjs --run-alias-controls",
    );
    // `|| true` is the exact shape alias-propagates-failure injects; it must never ship.
    for (const name of Object.keys(scripts).filter((n) => n.startsWith("check:deploy-isolation"))) {
      expect(scripts[name]).not.toContain("||");
    }
  });
});
