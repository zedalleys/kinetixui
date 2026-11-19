// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

/**
 * Mutation tests for `check:native-motion`.
 *
 * That guard is secondary evidence — it checks bookkeeping, not behaviour, and says so in its own
 * header. But a bookkeeping check that cannot fail is worse than none at all: it reports green and
 * licenses the belief that someone is watching. Every clause is a claim that some arrangement of
 * source is wrong, and each clause reachable from a fixture is watched to fire here.
 *
 * The method is the one `verification-guardrails.test.ts` uses: build a fixture repository that
 * PASSES, then break exactly one thing per test and assert the specific complaint. Asserting only
 * "it failed" would pass for any reason at all, including a typo in the fixture.
 *
 * The fixture is generated from `scripts/native-motion-spec.mjs` rather than restated here, so adding
 * a platform, a family or a gap cannot leave these tests describing a guard that no longer exists.
 */

const repoRoot = join(process.cwd(), "../..");
const script = join(repoRoot, "scripts/check-native-motion.mjs");
const specPath = join(repoRoot, "scripts/native-motion-spec.mjs");

type Family = {
  helper: string;
  members: string[];
  test: string;
  directional: boolean;
  strict: boolean;
  trackHelperCalls: boolean;
};
type Platform = { dir: string; ext: string; families: Record<string, Family> };
type Spec = { platforms: Record<string, Platform>; gaps: Record<string, string[]>; kinds: Record<string, string> };

/**
 * The spec, reduced to the plain data these tests need.
 *
 * Read through a subprocess rather than imported: the spec is ESM JavaScript, and importing it from
 * TypeScript would either need a declaration file or silently become `any` under `pnpm typecheck`.
 * The regexes in it are dropped here because none of them survive JSON and none of them are needed —
 * only whether a family declares a direction pair at all.
 */
const spec: Spec = JSON.parse(
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import * as s from ${JSON.stringify(specPath)};
       const platforms = Object.fromEntries(Object.entries(s.PLATFORMS).map(([n, p]) => [n, {
         dir: p.dir, ext: p.ext,
         families: Object.fromEntries(Object.entries(p.families).map(([fn, f]) => [fn, {
           helper: f.helper, members: f.members, test: f.test, directional: Boolean(f.directions),
           strict: Boolean(f.strict), trackHelperCalls: Boolean(f.trackHelperCalls),
         }])),
       }]));
       const gaps = Object.fromEntries(Object.entries(s.KNOWN_GAPS).map(([n, g]) => [n, Object.keys(g)]));
       const kinds = Object.fromEntries(Object.entries(s.DIRECTION_TERMS).map(([k, t]) => [k, t.kind]));
       process.stdout.write(JSON.stringify({ platforms, gaps, kinds }));`,
    ],
    { encoding: "utf8" },
  ),
);

const temps: string[] = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop()!, { recursive: true, force: true });
});

function write(dir: string, rel: string, body: string) {
  const full = join(dir, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, body);
}

/** Source that trips each platform's `animates` pattern. */
const ANIMATES: Record<string, string> = {
  SwiftUI: "withAnimation { }\n",
  Compose: "AnimatedVisibility(true) { }\n",
  Flutter: "AnimatedContainer();\n",
};

/** A wired family member: it animates, reaches its helper, and names both directions if asked to. */
function member(platform: string, p: Platform, family: Family, directions = family.directional) {
  const helper = family.helper.replace(p.ext, "");
  return (
    ANIMATES[platform] +
    (directions ? "// .expanding / .collapsing chosen from state\n" : "") +
    `// routes through ${helper}\n` +
    (family.trackHelperCalls ? `.modifier(${helper}())\n` : "") +
    // A strict family must read the setting and CALL the helper, not just mention it.
    (family.strict ? `${PREFERENCE[platform]}\n${helper}.runs(reduceMotion)\n` : "")
  );
}

/** A line each platform's `preference` pattern matches. */
const PREFERENCE: Record<string, string> = {
  SwiftUI: "@Environment(\\.accessibilityReduceMotion) var reduceMotion",
  Compose: "val reduce = KinetixDisclosureMotion.rememberReduceMotion()",
  Flutter: "final reduce = KinetixDisclosureMotion.reduceMotionOf(context);",
};

/**
 * A name matching BOTH of a family's direction terms — the shape that satisfied both ends of the pair
 * while the clause tested each term against the whole list with `some()`.
 */
const DUAL: Record<string, string> = {
  selectionIndicator: "previousToNextAndNextToPreviousGlide",
  selection: "offToOnAndOnToOffAreSuppressed",
  selectionState: "uncheckedToCheckedAndCheckedToUncheckedAreSuppressed",
  loop: "runsWithNormalMotionAndStopsWithReducedMotion",
  slide: "runsWithNormalMotionAndStopsWithReducedMotion",
  disclosure: "expandsAndCollapsesTheContent",
};

/**
 * Test declarations covering both directions in a family's own vocabulary.
 *
 * `only` emits one direction. `shape: "dual"` emits a single name matching both terms and nothing
 * else; `shape: "dual+pair"` emits that name alongside the two independent ones, which is the benign
 * arrangement six family/platform pairs on `main` are in and which must keep passing.
 */
function suite(
  platform: string,
  familyName: string,
  only?: "forward" | "reverse",
  shape?: "dual" | "dual+pair",
) {
  const pair =
    familyName === "selectionIndicator"
      ? { forward: "previousToNextGlides", reverse: "nextToPreviousRetargets" }
      : familyName === "selection"
      ? { forward: "offToOnIsSuppressed", reverse: "onToOffIsSuppressed" }
      : familyName === "selectionState"
        ? { forward: "uncheckedToCheckedIsSuppressed", reverse: "checkedToUncheckedIsSuppressed" }
        : familyName === "loop" || familyName === "slide"
        ? { forward: "runsWithNormalMotion", reverse: "stopsWithReducedMotion" }
        : { forward: "expandsTheContent", reverse: "collapsesTheContent" };
  const dual = DUAL[familyName];
  const names =
    shape === "dual"
      ? [dual]
      : shape === "dual+pair"
        ? [dual, pair.forward, pair.reverse]
        : only
          ? [pair[only]]
          : [pair.forward, pair.reverse];
  if (platform === "SwiftUI") return names.map((n) => `func test${n[0].toUpperCase()}${n.slice(1)}() { }\n`).join("");
  if (platform === "Compose") return names.map((n) => `fun ${n}() { }\n`).join("");
  return names.map((n) => `testWidgets('${n}', (t) async { });\n`).join("");
}

/** A fixture repository that satisfies every clause. */
function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "kx-native-motion-"));
  temps.push(dir);
  for (const [name, p] of Object.entries(spec.platforms)) {
    mkdirSync(join(dir, p.dir), { recursive: true });
    for (const [familyName, family] of Object.entries(p.families)) {
      write(dir, join(p.dir, family.helper), `// ${familyName} helper\n`);
      for (const m of family.members) write(dir, join(p.dir, m), member(name, p, family));
      write(dir, family.test, suite(name, familyName));
    }
    // Every declared gap must exist and must animate, or the ledger reads as stale.
    for (const f of spec.gaps[name] ?? []) write(dir, join(p.dir, f), ANIMATES[name]);
  }
  return dir;
}

function run(dir: string) {
  try {
    return {
      ok: true,
      output: execFileSync(process.execPath, [script, `--root=${dir}`], { encoding: "utf8", stdio: "pipe" }),
    };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    return { ok: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

/** The first platform/family pair declaring an asymmetric direction pair. */
function directionalFamily(): [string, Platform, string, Family] {
  for (const [name, p] of Object.entries(spec.platforms)) {
    for (const [fn, f] of Object.entries(p.families)) if (f.directional) return [name, p, fn, f];
  }
  throw new Error("no family declares a direction pair");
}

/** The first platform/family pair that is symmetric (a switch). */
function symmetricFamily(): [string, Platform, string, Family] {
  for (const [name, p] of Object.entries(spec.platforms)) {
    for (const [fn, f] of Object.entries(p.families)) if (!f.directional) return [name, p, fn, f];
  }
  throw new Error("no symmetric family");
}

const first = () => Object.entries(spec.platforms)[0] as [string, Platform];

describe("the fixture itself", () => {
  it("passes, so every failure below is caused by the one thing that test breaks", () => {
    const { ok, output } = run(fixture());
    expect(ok, output).toBe(true);
  });

  it("covers every platform and family the spec declares", () => {
    // If a platform were added and this file still only knew about three, the fixtures would be
    // incomplete and the mutations below would be testing less than they appear to.
    expect(Object.keys(spec.platforms).length).toBeGreaterThanOrEqual(3);
    for (const [name, p] of Object.entries(spec.platforms)) {
      // A platform with no `ANIMATES` sample would produce fixture files that do not animate, and
      // several mutations below would then pass for the wrong reason.
      expect(ANIMATES[name], `no ANIMATES sample for ${name}`).toBeTruthy();
      expect(Object.keys(p.families).length, `${name} declares no families`).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("an animated component must be accounted for", () => {
  it("fails when a component animates and is in neither a family nor the ledger", () => {
    const dir = fixture();
    const [name, p] = first();
    write(dir, join(p.dir, `Undeclared${p.ext}`), ANIMATES[name]);
    const { ok, output } = run(dir);
    expect(ok).toBe(false);
    expect(output).toMatch(/Undeclared.*animates, but is in no motion family/s);
  });

  it("ignores a file that does not animate", () => {
    const dir = fixture();
    const [, p] = first();
    write(dir, join(p.dir, `Static${p.ext}`), "// nothing moves here\n");
    expect(run(dir).ok).toBe(true);
  });
});

describe("tracked delegation agrees with the family members", () => {
  it("rejects a declared member without a helper call", () => {
    const dir = fixture();
    const platform = spec.platforms.SwiftUI;
    const family = platform.families.selectionIndicator;
    write(dir, join(platform.dir, family.members[0]), PREFERENCE.SwiftUI);
    const { ok, output } = run(dir);
    expect(ok).toBe(false);
    expect(output).toContain("selectionIndicator helper calls disagree with the declared members");
  });

  it("rejects an unregistered helper call even without local animation", () => {
    const dir = fixture();
    const platform = spec.platforms.SwiftUI;
    const family = platform.families.selectionIndicator;
    const helper = family.helper.replace(platform.ext, "");
    write(dir, join(platform.dir, `Undeclared${platform.ext}`), `.modifier(${helper}())`);
    const { ok, output } = run(dir);
    expect(ok).toBe(false);
    expect(output).toContain("Undeclared.swift: selectionIndicator helper calls disagree with the declared members");
  });
});

describe("a family member must reach the reader's setting", () => {
  it("fails when a member animates but routes to neither the preference nor its helper", () => {
    const dir = fixture();
    const [name, p] = first();
    const family = Object.values(p.families)[0];
    write(dir, join(p.dir, family.members[0]), ANIMATES[name]);
    const { ok, output } = run(dir);
    expect(ok).toBe(false);
    expect(output).toMatch(/reaches neither the platform preference nor/);
  });

  it("fails when a declared helper is missing", () => {
    const dir = fixture();
    const [, p] = first();
    const family = Object.values(p.families)[0];
    rmSync(join(dir, p.dir, family.helper));
    const { ok, output } = run(dir);
    expect(ok).toBe(false);
    expect(output).toMatch(/motion helper .* is missing/);
  });
});

describe("both directions must be named, in the family's own vocabulary", () => {
  it("fails when a suite names only the forward direction", () => {
    const dir = fixture();
    const [name, , familyName, family] = directionalFamily();
    write(dir, family.test, suite(name, familyName, "forward"));
    const { ok, output } = run(dir);
    expect(ok).toBe(false);
    expect(output).toMatch(/is NAMED for the reverse direction/);
  });

  it("fails when a suite names only the reverse direction", () => {
    const dir = fixture();
    const [name, , familyName, family] = directionalFamily();
    write(dir, family.test, suite(name, familyName, "reverse"));
    const { ok, output } = run(dir);
    expect(ok).toBe(false);
    expect(output).toMatch(/is NAMED for the forward direction/);
  });

  it("fails a symmetric suite whose names say only 'off', without naming a transition", () => {
    // The trap this vocabulary was chosen to avoid: a bare /\boff\b/ would match "…with animations
    // off", which is about the preference and not the direction — the same shape of false pass as
    // "disclosed body" satisfying /clos/. Requiring the OFF → ON pairing makes it unambiguous.
    const dir = fixture();
    const [name, , , family] = symmetricFamily();
    const body =
      name === "Flutter"
        ? "testWidgets('is suppressed with animations off', (t) async { });\n"
        : name === "Compose"
          ? "fun isSuppressedWithAnimationsOff() { }\n"
          : "func testIsSuppressedWithAnimationsOff() { }\n";
    write(dir, family.test, body);
    const { ok, output } = run(dir);
    expect(ok).toBe(false);
    expect(output).toMatch(/is NAMED for the (forward|reverse) direction/);
  });

  it("fails a loop suite that names only the running mode, or only the reduced one", () => {
    // A loop has two modes rather than two directions. A suite proving only that it runs says nothing
    // about reduced motion, and one proving only that it stops says nothing about normal motion.
    const dir = fixture();
    const [name, p] = first();
    const family = p.families.loop;
    expect(family, "the spec must declare a loop family").toBeTruthy();
    write(dir, family.test, suite(name, "loop", "forward"));
    let r = run(dir);
    expect(r.ok).toBe(false);
    expect(r.output).toMatch(/is NAMED for the reverse direction/);
    write(dir, family.test, suite(name, "loop", "reverse"));
    r = run(dir);
    expect(r.ok).toBe(false);
    expect(r.output).toMatch(/is NAMED for the forward direction/);
  });

  it("fails a strict family member that names its helper but never calls it, or never reads the setting", () => {
    const dir = fixture();
    const [name, p] = first();
    const family = p.families.loop;
    expect(family.strict, "the loop family must be strict").toBe(true);
    const helper = family.helper.replace(p.ext, "");
    // Mentions the helper in a comment only: the old check accepted exactly this.
    write(dir, join(p.dir, family.members[0]), `${ANIMATES[name]}// routes through ${helper}\n${PREFERENCE[name]}\n`);
    let r = run(dir);
    expect(r.ok).toBe(false);
    expect(r.output).toMatch(/strict loop family but never calls/);
    // Calls the helper but never reads the platform setting.
    write(dir, join(p.dir, family.members[0]), `${ANIMATES[name]}${helper}.runs(reduceMotion)\n`);
    r = run(dir);
    expect(r.ok).toBe(false);
    expect(r.output).toMatch(/strict loop family but never reads the platform preference/);
  });

  it("fails when a suite declares no recognisable tests at all", () => {
    const dir = fixture();
    const [, , , family] = symmetricFamily();
    write(dir, family.test, "// a file with prose about expanding and collapsing, and no tests\n");
    const { ok, output } = run(dir);
    expect(ok).toBe(false);
    expect(output).toMatch(/declares no recognisable tests|is NAMED for the/);
  });

  it("fails when a family's suite does not exist", () => {
    const dir = fixture();
    const [, p] = first();
    const family = Object.values(p.families)[0];
    rmSync(join(dir, family.test));
    const { ok, output } = run(dir);
    expect(ok).toBe(false);
    expect(output).toMatch(/no reduced-motion test for the \w+ family/);
  });
});

/**
 * Run `directionTermDefects` against a vocabulary written out as source, in a subprocess, for the
 * same reason the spec itself is read that way: it is ESM JavaScript and its regexes do not survive
 * JSON. `terms` is a JS object literal, so a regex can be written as a regex.
 */
function termDefects(terms: string): string[] {
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { directionTermDefects } from ${JSON.stringify(specPath)};
         process.stdout.write(JSON.stringify(directionTermDefects("probe", ${terms})));`,
      ],
      { encoding: "utf8" },
    ),
  );
}

describe("the two directions must be covered by DIFFERENT tests", () => {
  // Until M5.9 the clause tested each direction against the whole name list with `some()`, so ONE
  // name matching both terms satisfied both ends of the pair. The gate then printed "tested in both
  // directions" over a suite that had proven one transition. These are the controls for the fix: the
  // first three must fail, and the last must pass, or the clause is measuring something else.

  it("fails when a single test name is the only evidence for both directions", () => {
    const dir = fixture();
    const [name, , familyName, family] = directionalFamily();
    write(dir, family.test, suite(name, familyName, undefined, "dual"));
    const { ok, output } = run(dir);
    expect(ok).toBe(false);
    expect(output).toMatch(/also names the\n\s+(forward|reverse) direction/);
  });

  it("fails a symmetric family the same way — the clause is not specific to one vocabulary", () => {
    const dir = fixture();
    const [name, , familyName, family] = symmetricFamily();
    write(dir, family.test, suite(name, familyName, undefined, "dual"));
    const { ok, output } = run(dir);
    expect(ok).toBe(false);
    expect(output).toMatch(/so no test covers (forward|reverse) on its own/);
  });

  it("fails a mode family the same way, where the second term IS the reduced-motion preference", () => {
    // `loop` and `slide` name two behaviours rather than two ends of a journey, so the preference is
    // one of their terms by design. Distinctness still applies: "runs with normal motion and stops
    // with reduced motion" is one test, and the mode clause stands down only for the vocabulary
    // rule, never for this one.
    const dir = fixture();
    const modeFamily = Object.entries(spec.platforms).flatMap(([n, p]) =>
      Object.entries(p.families).filter(([fn]) => spec.kinds[fn] === "mode").map(([fn, f]) => [n, fn, f] as const),
    )[0];
    expect(modeFamily, "no family declares kind: mode").toBeTruthy();
    const [name, familyName, family] = modeFamily;
    write(dir, family.test, suite(name, familyName, undefined, "dual"));
    const { ok, output } = run(dir);
    expect(ok).toBe(false);
    expect(output).toMatch(/so no test covers (forward|reverse) on its own/);
  });

  it("PASSES when a both-ways name sits alongside two independent ones", () => {
    // The control that keeps the clause honest. Six family/platform pairs on `main` contain a name
    // matching both terms, and in every one each direction also has its own test — benign, and the
    // reason the clause is keyed on "this direction has no independent test" rather than on "a
    // both-ways name exists". A check keyed on the latter would redden all six and be switched off.
    const dir = fixture();
    const [name, , familyName, family] = directionalFamily();
    write(dir, family.test, suite(name, familyName, undefined, "dual+pair"));
    const { ok, output } = run(dir);
    expect(ok, output).toBe(true);
  });
});

describe("a direction's vocabulary must not admit the reduced-motion preference", () => {
  // The upstream half of the fix, and the half that lasts. A direction term that the preference
  // wording can satisfy on its own lets a suite prove a direction it never travels — which is how
  // `selectionIndicator` was written on the three native selection branches:
  //   reverse: /backward|reduced.?motion/i
  // Catching it in the vocabulary catches it once, before any platform's suite is measured.

  it("rejects a direction family whose term matches a preference-only phrase", () => {
    const defects = termDefects("{ kind: 'direction', forward: /forward/i, reverse: /backward|reduced.?motion/i }");
    expect(defects).toHaveLength(1);
    expect(defects[0]).toMatch(/names the reader's preference and not a direction of travel/);
  });

  it("accepts the same term pair when the family declares itself a mode family", () => {
    // The exemption must be reachable, or the rule would push an honest mode family into dishonest
    // vocabulary. `loop` and `slide` depend on this.
    expect(termDefects("{ kind: 'mode', forward: /normal motion/i, reverse: /reduced motion/i }")).toEqual([]);
  });

  it("rejects a family that declares no kind at all", () => {
    // A new family added without a kind would silently opt out of the rule above. The three native
    // selection branches each add `selectionIndicator`, and none of them declares one.
    const defects = termDefects("{ forward: /forward/i, reverse: /backward/i }");
    expect(defects).toHaveLength(1);
    expect(defects[0]).toMatch(/declares no kind/);
  });

  it("finds no defect in any vocabulary the repository ships today", () => {
    // So the rule is provably additive: it reddens nothing on `main`.
    const all: Record<string, string[]> = JSON.parse(
      execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `import { DIRECTION_TERMS, directionTermDefects } from ${JSON.stringify(specPath)};
           process.stdout.write(JSON.stringify(Object.fromEntries(
             Object.entries(DIRECTION_TERMS).map(([k, t]) => [k, directionTermDefects(k, t)]))));`,
        ],
        { encoding: "utf8" },
      ),
    );
    expect(Object.keys(all).length).toBeGreaterThanOrEqual(5);
    for (const [family, defects] of Object.entries(all)) expect(defects, family).toEqual([]);
  });
});

describe("a directional family member must choose its direction from state", () => {
  it("fails when it names the forward direction and never the reverse", () => {
    const dir = fixture();
    const [name, p, , family] = directionalFamily();
    write(
      dir,
      join(p.dir, family.members[0]),
      `${ANIMATES[name]}// .expanding only\n// routes through ${family.helper.replace(p.ext, "")}\n`,
    );
    const { ok, output } = run(dir);
    expect(ok).toBe(false);
    expect(output).toMatch(/names the expanding direction but never the collapsing one/);
  });

  it("does not apply the pair rule to a symmetric family", () => {
    // A switch has one curve. If this clause leaked across families it would demand a `.collapsing`
    // that the selection resolver does not and should not have.
    const dir = fixture();
    const [name, p, , family] = symmetricFamily();
    write(
      dir,
      join(p.dir, family.members[0]),
      `${ANIMATES[name]}// .expanding\n// routes through ${family.helper.replace(p.ext, "")}\n`,
    );
    expect(run(dir).ok).toBe(true);
  });
});

describe("the ledger cannot go stale", () => {
  it("fails when a listed gap no longer exists", () => {
    const dir = fixture();
    const [name, p] = first();
    rmSync(join(dir, p.dir, spec.gaps[name][0]));
    const { ok, output } = run(dir);
    expect(ok).toBe(false);
    expect(output).toMatch(/which does not exist/);
  });

  it("fails when a listed gap no longer animates", () => {
    const dir = fixture();
    const [name, p] = first();
    write(dir, join(p.dir, spec.gaps[name][0]), "// nothing moves here any more\n");
    const { ok, output } = run(dir);
    expect(ok).toBe(false);
    expect(output).toMatch(/no longer animates — remove the entry/);
  });

  // The third staleness clause — a gap that is ALSO a family member — is deliberately not tested
  // here, and it is worth saying why rather than leaving a gap in the coverage unexplained. It is
  // unreachable from a fixture: `KNOWN_GAPS` and the family lists both come from the spec module,
  // which the gate resolves relative to itself rather than to `--root`, so a fixture cannot create
  // the overlap. It is a defensive clause against a future edit that adds a component to a family and
  // forgets to delete its ledger entry — which is exactly what this slice did for Switch, and is the
  // reason the clause exists at all.
});
