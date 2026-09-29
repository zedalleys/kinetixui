/**
 * `release:notes` describes the core version line, and only that.
 *
 * `RELEASES` in `apps/web/src/lib/releases.ts` is the `@kinetixui/{ui,tokens,cli}` history. Once
 * `@kinetixui/angular` and `@kinetixui/iot` began versioning independently, their numbers started colliding
 * with historical core ones — `0.2.0` is `@kinetixui/iot@0.2.0` today and was the core rebrand release on
 * 2026-09-03. Asking for `0.2.0` printed the rebrand notes and exited 0.
 *
 * That is a silent wrong answer on the way to a public artifact: someone preparing the IoT Release runs the
 * documented command, gets plausible markdown, and pastes three-week-old notes about something else onto it.
 * So the ambiguity is refused, and `--ui` is the way to say you meant the core line.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { escapeRegExp } from "./regexp.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const script = path.join(root, "scripts/release-notes.mjs");
const allowlist = JSON.parse(readFileSync(path.join(root, "release/publish-packages.json"), "utf8"));

const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8", cwd: root, windowsHide: true });

/** The independently versioned packages and the version each is at right now. */
const independent = allowlist.packages
  .filter((pkg) => pkg.releaseGroup !== "core")
  .map((pkg) => ({ ...pkg, current: JSON.parse(readFileSync(path.join(root, pkg.directory, "package.json"), "utf8")).version }));

describe("release:notes and the release cohorts", () => {
  it("has something to be ambiguous about — more than one cohort exists", () => {
    assert.ok(independent.length > 0, "no independently versioned package, so this guard is testing nothing");
  });

  it("produces notes for the core line", () => {
    const core = JSON.parse(readFileSync(path.join(root, "packages/ui/package.json"), "utf8")).version;
    const result = run(core);
    assert.equal(result.status, 0, `expected notes for the core version ${core}, got: ${result.stderr}`);
    assert.match(result.stdout, new RegExp(`^## KinetixUI ${escapeRegExp(core)}`), "notes should head with the version");
  });

  it("refuses a version that is also an independent cohort's current release", () => {
    for (const pkg of independent) {
      const result = run(pkg.current);
      assert.equal(result.status, 1, `${pkg.current} (${pkg.name}) should be refused, not answered`);
      assert.match(result.stderr, new RegExp(escapeRegExp(pkg.name)), "the message must name the colliding package");
      assert.match(result.stderr, /CHANGELOG\.md/, "the message must say where that cohort's real notes live");
    }
  });

  it("answers for the core line when --ui says that is what was meant", () => {
    for (const pkg of independent) {
      const result = run(pkg.current, "--ui");
      // Either it is a real core version (notes) or it never was one (unknown version) — never the wrong
      // cohort's notes presented as that package's.
      if (result.status === 0) {
        assert.match(result.stdout, new RegExp(`^## KinetixUI ${escapeRegExp(pkg.current)}`));
      } else {
        assert.match(result.stderr, /unknown version/, `unexpected failure for --ui ${pkg.current}: ${result.stderr}`);
      }
    }
  });

  it("each independent cohort has its own changelog to take a release body from", () => {
    for (const pkg of independent) {
      const changelog = readFileSync(path.join(root, pkg.directory, "CHANGELOG.md"), "utf8");
      assert.match(
        changelog,
        new RegExp(`^## ${escapeRegExp(pkg.current)}$`, "m"),
        `${pkg.name}: CHANGELOG.md has no "## ${pkg.current}" section, so there is nothing to paste into its Release`,
      );
    }
  });
});
