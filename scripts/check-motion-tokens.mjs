/**
 * check-motion-tokens.mjs — the motion tokens, their generated platform values, and the motion contract
 * agree with each other.
 *
 *   node scripts/check-motion-tokens.mjs
 *   node scripts/check-motion-tokens.mjs --overrides <file.json>   (tests: { "relative/path": "content" })
 *
 * What it proves, and what it does not:
 *
 * 1. Source shape. Every duration is an integer `ms` string and every easing four numbers with x in
 *    [0, 1]. The native formats strip a literal "ms" (style-dictionary/hooks.mjs `motionMs`), so a
 *    DTCG-legal "0.25s" became `Duration.milliseconds(NaN)` in Swift and `NaN` in Kotlin and Dart:
 *    generated, vendored, fixed-point clean, and only a native compiler would have noticed.
 * 2. Value parity. Both web stylesheets (package and registry) and all six native files (dist + vendored) carry exactly the source's
 *    names and values. The CI fixed-point step proves the files are what the generator writes; this
 *    proves what the generator writes is the source.
 * 3. No dead references. A `var(--duration-normal)` in Angular CSS or a `duration-normal` utility in a
 *    React class string is not an error anywhere else: the browser drops the declaration and the
 *    component silently animates on the default. Same for `KinetixDuration.normal` natively, which
 *    only a native compiler in a path-filtered workflow would catch.
 * 4. The contract (tokens/contracts/motion.json) is held to the source: every tier is described, every
 *    MX1 proposal decision still matches the values, every role names real tokens and a known reduced
 *    form, every "proven" role names evidence that exists and consumers on at least two platforms,
 *    every consumer still contains what the role says it uses, and every recorded deviation still
 *    deviates.
 * 5. The set of consumer identities — (role, platform, file) — matches tokens/contracts/motion-consumers.json
 *    exactly, in both directions. Point 4 can only validate the consumers that are present; this is what
 *    notices one that has gone missing, which no other gate in the repository does.
 *
 * It is a static check. It does not prove rendered motion (`check:motion`, `check:loop-motion`) or
 * native runtime behaviour (native-*.yml); native mappings here are validated against generated
 * source only.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const NATIVE_FILES = {
  swift: ["packages/tokens/dist/ios/KinetixMotion.swift", "packages/ui-swiftui/Sources/KinetixUI/KinetixMotion.swift"],
  kotlin: [
    "packages/tokens/dist/android/KinetixMotion.kt",
    "packages/ui-compose/ui/src/main/kotlin/com/kinetixui/tokens/KinetixMotion.kt",
  ],
  dart: ["packages/tokens/dist/flutter/kinetix_motion.dart", "packages/ui-flutter/lib/src/kinetix_motion.dart"],
};
/** The package stylesheet, and the bundled copy the registry `tokens` item ships to CLI consumers. */
const CSS_FILES = ["packages/tokens/dist/web/globals.css", "registry/kinetixui/globals.css"];

/** Library sources that reference motion tokens by name. Tests and stories are excluded on purpose. */
const REFERENCE_DIRS = [
  { dir: "packages/ui/src/components", ext: [".tsx"], kind: "tailwind" },
  { dir: "packages/iot/src", ext: [".tsx", ".css"], kind: "tailwind" },
  { dir: "packages/ui-angular/src", ext: [".css", ".ts"], kind: "css" },
  { dir: "packages/ui-swiftui/Sources", ext: [".swift"], kind: "native" },
  { dir: "packages/ui-compose/ui/src/main", ext: [".kt"], kind: "native" },
  { dir: "packages/ui-flutter/lib", ext: [".dart"], kind: "native" },
];
/** Single files that reference motion variables directly: the preset's animation shorthands. */
const REFERENCE_FILES = [{ f: "packages/ui/tailwind.config.ts", kind: "css" }];

const STATUSES = ["proven", "observed", "proposed"];
const DECISIONS = ["matches", "kept-name", "kept-value", "outside-proposal"];

export function motionErrors(overrides = {}) {
  const read = (p) => (p in overrides ? overrides[p] : readFileSync(join(ROOT, p), "utf8"));
  const exists = (p) => p in overrides || existsSync(join(ROOT, p));
  const errors = [];
  const fail = (msg) => errors.push(msg);

  const motion = JSON.parse(read("tokens/primitives/motion.json"));
  const contract = JSON.parse(read("tokens/contracts/motion.json"));

  // ── 1. source shape ────────────────────────────────────────────────────────────────────────────
  const durations = {};
  for (const [name, t] of Object.entries(motion.duration ?? {})) {
    const m = /^(\d+)ms$/.exec(String(t.$value));
    if (!m) fail(`duration.${name}: "${t.$value}" is not an integer ms value; the native formats only understand "<n>ms"`);
    else durations[name] = Number(m[1]);
    if (!t.$description) fail(`duration.${name}: has no $description; the intent of a tier is part of the token`);
  }
  const easings = {};
  for (const [name, t] of Object.entries(motion.easing ?? {})) {
    const v = t.$value;
    if (!Array.isArray(v) || v.length !== 4 || v.some((n) => typeof n !== "number")) {
      fail(`easing.${name}: $value must be four numbers [x1, y1, x2, y2]`);
      continue;
    }
    if (v[0] < 0 || v[0] > 1 || v[2] < 0 || v[2] > 1) fail(`easing.${name}: x control points must lie in [0, 1]`);
    easings[name] = v;
    if (!t.$description) fail(`easing.${name}: has no $description; the intent of a curve is part of the token`);
  }
  const ordered = Object.entries(durations);
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i][1] <= ordered[i - 1][1]) fail(`duration.${ordered[i][0]} (${ordered[i][1]}ms) is not longer than duration.${ordered[i - 1][0]}; tiers must ascend`);
  }

  // ── 2. value parity across generated outputs ───────────────────────────────────────────────────
  const same = (a, b) => a.length === b.length && a.every((n, i) => Math.abs(n - b[i]) < 1e-9);
  const compare = (file, gotD, gotE) => {
    for (const [n, ms] of Object.entries(durations)) {
      if (!(n in gotD)) fail(`${file}: duration "${n}" is missing`);
      else if (gotD[n] !== ms) fail(`${file}: duration "${n}" is ${gotD[n]}, the source says ${ms}ms`);
    }
    for (const n of Object.keys(gotD)) if (!(n in durations)) fail(`${file}: duration "${n}" is not in the source`);
    for (const [n, v] of Object.entries(easings)) {
      if (!(n in gotE)) fail(`${file}: easing "${n}" is missing`);
      else if (!same(gotE[n], v)) fail(`${file}: easing "${n}" is (${gotE[n].join(", ")}), the source says (${v.join(", ")})`);
    }
    for (const n of Object.keys(gotE)) if (!(n in easings)) fail(`${file}: easing "${n}" is not in the source`);
  };
  const nums = (s) => s.split(",").map((x) => Number(x.trim().replace(/f$/, "")));

  for (const file of CSS_FILES) {
    if (!exists(file)) {
      fail(`${file}: missing; run pnpm build:tokens`);
      continue;
    }
    const css = read(file);
    const d = {}, e = {};
    for (const [, n, v] of css.matchAll(/--duration-([a-z]+):\s*([^;]+);/g)) d[n] = /^\d+ms$/.test(v.trim()) ? Number(v.trim().slice(0, -2)) : v.trim();
    for (const [, n, v] of css.matchAll(/--easing-([a-z]+):\s*cubic-bezier\(([^)]*)\);/g)) e[n] = nums(v);
    compare(file, d, e);
  }
  const NATIVE_PATTERNS = {
    swift: [/static let (\w+) = Duration\.milliseconds\(([^)]*)\)/g, /static let (\w+): \(Double, Double, Double, Double\) = \(([^)]*)\)/g],
    kotlin: [/const val (\w+) = (\S+)/g, /val (\w+) = CubicBezierEasing\(([^)]*)\)/g],
    dart: [/static const Duration (\w+) = Duration\(milliseconds: ([^)]*)\)/g, /static const Curve (\w+) = Cubic\(([^)]*)\)/g],
  };
  for (const [lang, files] of Object.entries(NATIVE_FILES)) {
    for (const file of files) {
      if (!exists(file)) {
        fail(`${file}: missing`);
        continue;
      }
      const src = read(file);
      // Only the KinetixDuration / KinetixEasing blocks: the same files carry opacity and z-index too.
      const block = (name) => {
        const start = src.search(new RegExp(`(enum|object|class) ${name}\\b`));
        if (start < 0) return "";
        const end = src.indexOf("\n}", start);
        return src.slice(start, end < 0 ? undefined : end);
      };
      const [dRe, eRe] = NATIVE_PATTERNS[lang];
      const d = {}, e = {};
      for (const [, n, v] of block("KinetixDuration").matchAll(dRe)) d[n] = Number(v);
      for (const [, n, v] of block("KinetixEasing").matchAll(eRe)) e[n] = nums(v);
      compare(file, d, e);
    }
  }

  // ── 3. no dead references ──────────────────────────────────────────────────────────────────────
  const walk = (dir, ext) => {
    const abs = join(ROOT, dir);
    if (!existsSync(abs)) return [];
    const out = [];
    for (const entry of readdirSync(abs)) {
      const p = join(abs, entry);
      if (statSync(p).isDirectory()) {
        if (entry === "node_modules" || entry === "__tests__" || entry === "test" || entry === "tests") continue;
        out.push(...walk(relative(ROOT, p), ext));
      } else if (ext.some((x) => entry.endsWith(x)) && !/\.(test|spec|stories)\./.test(entry)) out.push(relative(ROOT, p));
    }
    return out;
  };
  const sources = [...REFERENCE_DIRS.flatMap(({ dir, ext, kind }) => walk(dir, ext).map((f) => ({ f, kind }))), ...REFERENCE_FILES];
  for (const p of Object.keys(overrides)) if (!sources.some((s) => s.f === p) && /\.(tsx|css|ts|swift|kt|dart)$/.test(p) && !p.startsWith("packages/tokens/")) {
    const ref = REFERENCE_DIRS.find((r) => p.startsWith(r.dir));
    if (ref) sources.push({ f: p, kind: ref.kind });
  }
  const isGenerated = (f) => Object.values(NATIVE_FILES).flat().includes(f);
  const TAILWIND_EASES = new Set(["linear", "in", "out", "in-out"]);
  for (const { f, kind } of sources) {
    if (isGenerated(f)) continue;
    const src = read(f);
    for (const [, n] of src.matchAll(/--duration-([a-z][\w-]*)/g)) if (!(n in durations)) fail(`${f}: --duration-${n} is not a motion token; the declaration is dropped and the default runs`);
    for (const [, n] of src.matchAll(/--easing-([a-z][\w-]*)/g)) if (!(n in easings)) fail(`${f}: --easing-${n} is not a motion token; the declaration is dropped and the default runs`);
    if (kind === "tailwind") {
      // A tier utility that is not a tier generates no CSS at all. Numeric and arbitrary values are
      // the motion-contract test's job; this only catches names.
      for (const [, n] of src.matchAll(/(?<![\w-])duration-([A-Za-z_][\w-]*)/g)) if (!(n in durations)) fail(`${f}: duration-${n} is not a motion tier; Tailwind emits nothing for it`);
      // Tailwind's own `ease-linear|in|out|in-out` are the motion-contract test's job (Tailwind does emit
      // them); any other name, `ease-smooth` or `ease-standard-extra`, emits nothing at all.
      for (const [, n] of src.matchAll(/(?<![\w-])ease-([A-Za-z_][\w-]*)/g)) if (!(n in easings) && !TAILWIND_EASES.has(n)) fail(`${f}: ease-${n} is not a motion easing; Tailwind emits nothing for it`);
    }
    if (kind === "native") {
      for (const [, n] of src.matchAll(/KinetixDuration\.(\w+)/g)) if (!(n in durations)) fail(`${f}: KinetixDuration.${n} is not a motion token`);
      for (const [, n] of src.matchAll(/KinetixEasing\.(\w+)/g)) if (!(n in easings)) fail(`${f}: KinetixEasing.${n} is not a motion token`);
    }
  }

  // ── 4. the contract ────────────────────────────────────────────────────────────────────────────
  const tiers = contract.tiers ?? {};
  for (const n of Object.keys(durations)) if (!(n in tiers)) fail(`contract: duration tier "${n}" has no entry in tiers`);
  for (const [n, t] of Object.entries(tiers)) {
    if (!(n in durations)) {
      fail(`contract: tier "${n}" is not a duration token`);
      continue;
    }
    if (!DECISIONS.includes(t.decision)) fail(`contract: tier "${n}" decision "${t.decision}" is not one of ${DECISIONS.join(", ")}`);
    const p = t.mx1Proposal;
    if (t.decision === "outside-proposal") {
      if (p) fail(`contract: tier "${n}" is outside the proposal but names one`);
    } else if (!p) fail(`contract: tier "${n}" has no mx1Proposal`);
    else {
      const sameMs = p.ms === durations[n];
      const sameName = p.name === n;
      if (t.decision === "matches" && !(sameMs && sameName)) fail(`contract: tier "${n}" says it matches the MX1 proposal (${p.name} ${p.ms}ms) but is ${n} ${durations[n]}ms; record the difference`);
      if (t.decision === "kept-name" && (sameName || !sameMs)) fail(`contract: tier "${n}" decision kept-name needs the same value and a different proposed name`);
      if (t.decision === "kept-value" && sameMs) fail(`contract: tier "${n}" says it kept its value against the MX1 proposal, but it is now ${p.ms}ms; update the decision`);
      if (t.decision !== "matches" && !t.note) fail(`contract: tier "${n}" departs from the MX1 proposal with no note saying why`);
    }
  }

  const forms = Object.keys(contract.reducedForms ?? {});
  const DUR_REF = /(?:--duration-|(?<![\w-])duration-|KinetixDuration\.)([a-z]+)/g;
  const EASE_REF = /(?:--easing-|(?<![\w-])ease-|KinetixEasing\.)([a-z]+)/g;
  for (const [name, role] of Object.entries(contract.roles ?? {})) {
    const at = `contract: role "${name}"`;
    if (!STATUSES.includes(role.status)) fail(`${at} status "${role.status}" is not one of ${STATUSES.join(", ")}`);
    if (!forms.includes(role.reducedForm)) fail(`${at} reducedForm "${role.reducedForm}" is not a declared reduced form`);
    for (const d of role.duration ?? []) if (!(d in durations)) fail(`${at} names duration "${d}", which is not a token`);
    for (const e of role.easing ?? []) if (!(e in easings)) fail(`${at} names easing "${e}", which is not a token`);
    const isLoop = role.reducedForm === "rest";
    if (!isLoop && (!(role.duration ?? []).length || !(role.easing ?? []).length)) fail(`${at} is a transition but names no duration or no easing`);
    for (const ev of role.evidence ?? []) if (!exists(ev)) fail(`${at} cites evidence ${ev}, which does not exist`);
    const consumers = role.consumers ?? [];
    if (role.status === "proven") {
      if (!(role.evidence ?? []).length) fail(`${at} is proven but cites no evidence`);
      if (!isLoop && new Set(consumers.map((c) => c.platform)).size < 2) fail(`${at} is proven but has consumers on fewer than two platforms`);
    }
    if (role.status === "observed" && !consumers.length) fail(`${at} is observed but lists no consumer`);
    if (role.status === "proposed" && consumers.length) fail(`${at} is proposed but lists consumers; promote it to observed`);
    for (const c of consumers) {
      const cat = `${at}, ${c.platform} consumer ${c.file}`;
      if (!exists(c.file)) {
        fail(`${cat}: file does not exist`);
        continue;
      }
      const src = read(c.file);
      const seenD = new Set(), seenE = new Set();
      for (const ex of c.expects ?? []) {
        if (!src.includes(ex)) fail(`${cat}: no longer contains "${ex}"`);
        for (const [, d] of ex.matchAll(DUR_REF)) {
          if (!(role.duration ?? []).includes(d)) fail(`${cat}: expects duration "${d}", which is not one of the role's (${role.duration.join(", ")})`);
          seenD.add(d);
        }
        for (const [, e] of ex.matchAll(EASE_REF)) {
          if (!(role.easing ?? []).includes(e)) fail(`${cat}: expects easing "${e}", which is not one of the role's (${role.easing.join(", ")})`);
          seenE.add(e);
        }
      }
      if (!isLoop && (!seenD.size || !seenE.size)) fail(`${cat}: names no role duration or no role easing, so it proves nothing about the pairing`);
    }
    for (const dv of role.deviations ?? []) {
      const dat = `${at}, ${dv.platform} deviation in ${dv.file}`;
      if (!dv.reason) fail(`${dat}: has no reason`);
      if (!exists(dv.file)) fail(`${dat}: file does not exist`);
      else if (!read(dv.file).includes(dv.uses)) fail(`${dat}: no longer contains "${dv.uses}"; if it was aligned, remove the deviation`);
      const offRole = [...dv.uses.matchAll(DUR_REF)].some(([, d]) => !(role.duration ?? []).includes(d)) ||
        [...dv.uses.matchAll(EASE_REF)].some(([, e]) => !(role.easing ?? []).includes(e));
      if (!offRole) fail(`${dat}: "${dv.uses}" uses only the role's own tokens, so it is not a deviation`);
    }
  }

  /* Every check above reads the consumers the contract HAS. None of them can notice one that should be
   * there and is not, so a platform can lose its entry with nothing red: delete SwiftUI's from
   * `selection-control` and four platforms remain, which still satisfies "proven needs two". Measured on
   * `a92de6e` — check:motion-tokens and check:native-motion were both green with that object gone.
   * Retyping a consumer's `platform` or `file` is the same hole from the other side: the old identity is
   * gone and the new one was never reviewed.
   *
   * Not hypothetical bookkeeping. The three MX1d branches each add one consumer to the same role at the
   * same position, so git conflicts INSIDE a single consumer object — the `platform` and `file` lines
   * collide while the shared `expects` block sits outside the markers. Resolve that textually rather than
   * structurally and the object silently belongs to one platform only, with every gate passing.
   *
   * So the identities are written down too, and the two must agree in both directions. */
  const register = JSON.parse(read("tokens/contracts/motion-consumers.json"));
  const held = new Set(register.identities ?? []);
  const actual = new Set(
    Object.entries(contract.roles ?? {}).flatMap(([name, role]) =>
      (role.consumers ?? []).map((c) => `${name}|${c.platform}|${c.file}`),
    ),
  );
  for (const id of [...held].sort()) {
    if (!actual.has(id)) {
      fail(
        `contract: motion-consumers.json holds "${id}", which the contract no longer lists. ` +
          `If that consumer was deliberately removed, delete the line from motion-consumers.json in the same commit; ` +
          `if a merge dropped it, restore it to tokens/contracts/motion.json.`,
      );
    }
  }
  for (const id of [...actual].sort()) {
    if (!held.has(id)) {
      fail(
        `contract: the contract lists consumer "${id}", which motion-consumers.json does not hold. ` +
          `Add that exact line to its "identities" so the addition is reviewed.`,
      );
    }
  }

  for (const [dim, u] of Object.entries(contract.untokenised ?? {})) {
    if (!u.decision || !u.reason || !u.addWhen) fail(`contract: untokenised "${dim}" needs decision, reason and addWhen`);
    if (motion[dim]) fail(`contract: "${dim}" is now a token group in motion.json but the contract still lists it as untokenised`);
  }
  for (const [name, p] of Object.entries(contract.platforms ?? {})) {
    if (!exists(p.file)) fail(`contract: platform "${name}" points at ${p.file}, which does not exist`);
  }

  return errors;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const i = process.argv.indexOf("--overrides");
  const overrides = i > 0 ? JSON.parse(readFileSync(process.argv[i + 1], "utf8")) : {};
  const errors = motionErrors(overrides);
  if (errors.length) {
    console.error(`check:motion-tokens — ${errors.length} problem(s):\n` + errors.map((e) => `  ✗ ${e}`).join("\n"));
    process.exit(1);
  }
  const c = JSON.parse(readFileSync(join(ROOT, "tokens/contracts/motion.json"), "utf8"));
  const roles = Object.entries(c.roles);
  const by = (s) => roles.filter(([, r]) => r.status === s).map(([n]) => n).join(", ") || "none";
  const identities = roles.reduce((n, [, r]) => n + (r.consumers ?? []).length, 0);
  console.log(
    `check:motion-tokens — source, 2 web stylesheets and 6 native files agree; no dead motion references; ` +
      `contract holds (proven: ${by("proven")}; observed: ${by("observed")}; proposed: ${by("proposed")}); ` +
      `${identities} consumer identities, all registered.`,
  );
}
