#!/usr/bin/env node
/**
 * check:breakpoints — the shared preset must not take `max-*` or `min-[…]` away from consumers.
 *
 * Tailwind 3.4 emits no rule at all for a `min-*` / `max-*` variant once `theme.screens` mixes
 * units, and it fails silently: no warning, no error, the class is simply absent from the output.
 * KinetixUI needs three `rem` breakpoints (`sm-rem`, `lg-rem`, `xl-rem`) for layouts that have to
 * track the reader's text size, so the mixture is tempting and the damage is invisible. They are
 * registered as variants in `packages/ui/tailwind.config.ts` for exactly that reason.
 *
 * This gate compiles one stub against the published preset and asserts both halves:
 *
 *   1. the three `-rem` variants emit their `rem` media queries, and
 *   2. `max-md:` and an arbitrary `min-[420px]:` still emit theirs.
 *
 * Half 2 is the one that regressed: before the variants existed, apps/web carried the breakpoints
 * in `theme.extend.screens`, and `min-[420px]:grid-cols-2` on the blocks gallery emitted nothing
 * in the built site — that grid never took its two-column step.
 *
 * It also asserts a third thing, at source rather than in CSS: **no element may gate the same
 * property on both a `px` breakpoint and a `-rem` one.** Tailwind registers a plugin variant before
 * its screen variants, so between `md:grid-cols-3` and `lg-rem:grid-cols-12` the `md:` rule is
 * emitted later and wins above 768px — which is not a cascade subtlety but a broken layout. Source
 * order could not resolve it correctly anyway: at 200% text `64rem` is 2048px, so the two queries
 * overlap differently for every reader. One ladder per property is the contract.
 *
 * `--prove` runs the negative controls: it rebuilds with the same breakpoints moved into
 * `theme.extend.screens` and asserts that half 2 then FAILS, and it runs the source scan over a
 * fixture that mixes the two ladders and asserts it is caught. Nothing is written to the
 * repository — the mutated config and the fixture exist only in a temporary directory.
 */
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const presetPath = join(root, "packages/ui/tailwind.config.ts");

// pnpm does not hoist, so tailwindcss lives under .pnpm and is reachable only from a workspace
// that depends on it. apps/docs is the Storybook build this gate is protecting.
const TAILWIND_CLI = createRequire(join(root, "apps/docs/package.json")).resolve("tailwindcss/lib/cli.js");

const PROBE = [
  // half 1 — the -rem variants must work
  { cls: "sm-rem:grid-cols-2", expect: "@media (min-width: 40rem)", half: 1 },
  { cls: "md-rem:grid-cols-3", expect: "@media (min-width: 48rem)", half: 1 },
  { cls: "lg-rem:grid-cols-6", expect: "@media (min-width: 64rem)", half: 1 },
  { cls: "xl-rem:grid-cols-4", expect: "@media (min-width: 80rem)", half: 1 },
  // half 2 — and must not cost the consumer these
  { cls: "max-md:hidden", expect: "@media not all and (min-width: 768px)", half: 2 },
  { cls: "min-[420px]:grid-cols-2", expect: "@media (min-width: 420px)", half: 2 },
  // a plain responsive variant, which survives either way — present so a total failure to
  // compile is told apart from the defect this gate is about
  { cls: "md:flex", expect: "@media (min-width: 768px)", half: 0 },
];

function compile(dir, { asScreens = false } = {}) {
  writeFileSync(join(dir, "stub.html"), `<div class="${PROBE.map((p) => p.cls).join(" ")}"></div>`);
  writeFileSync(join(dir, "in.css"), "@tailwind utilities;\n");
  // The config is TypeScript because the preset is; Tailwind loads a `.ts` config itself.
  const config = asScreens
    ? `export default { content: [${JSON.stringify(join(dir, "stub.html"))}], theme: { extend: { screens: { "sm-rem": "40rem", "md-rem": "48rem", "lg-rem": "64rem", "xl-rem": "80rem" } } } };\n`
    : `import preset from ${JSON.stringify(presetPath)};\n` +
      `export default { presets: [preset], content: [${JSON.stringify(join(dir, "stub.html"))}] };\n`;
  writeFileSync(join(dir, "tw.config.ts"), config);
  execFileSync(
    process.execPath,
    [TAILWIND_CLI, "-c", join(dir, "tw.config.ts"), "-i", join(dir, "in.css"), "-o", join(dir, "out.css")],
    { cwd: join(root, "apps/docs"), stdio: "pipe" },
  );
  return readFileSync(join(dir, "out.css"), "utf8");
}

function check(css) {
  return PROBE.map((p) => ({ ...p, emitted: css.includes(p.expect) }));
}

// ---- half 3: one ladder per property, checked at source -------------------------------------

const PX_SCREENS = new Set(["sm", "md", "lg", "xl", "2xl"]);
const SOURCE_ROOTS = ["apps/web/src", "apps/docs", "packages/ui/src", "packages/iot/src"];
const SOURCE_EXT = /\.(tsx|ts|mdx)$/;
const CLASS_ATTR = /class(?:Name)?=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/gs;

/** The utility family a class belongs to: `md:col-span-3` and `lg-rem:col-span-7` are both `col-span`. */
function family(token) {
  const utility = token.slice(token.lastIndexOf(":") + 1);
  return utility.replace(/-?\[.*$/, "").replace(/-?[0-9.]+$/, "");
}

function mixedLadders(classList) {
  if (!classList.includes("-rem:")) return [];
  const px = new Map();
  const rem = new Map();
  for (const token of classList.split(/\s+/).filter(Boolean)) {
    const variants = token.split(":").slice(0, -1);
    const bucket = variants.some((v) => v.endsWith("-rem"))
      ? rem
      : variants.some((v) => PX_SCREENS.has(v))
        ? px
        : null;
    if (!bucket) continue;
    const key = family(token);
    bucket.set(key, [...(bucket.get(key) ?? []), token]);
  }
  return [...rem.keys()]
    .filter((key) => px.has(key))
    .map((key) => ({ property: key, px: px.get(key), rem: rem.get(key) }));
}

function* sourceFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* sourceFiles(full);
    else if (SOURCE_EXT.test(entry)) yield full;
  }
}

/** `roots` may be repository-relative or absolute; the control passes a temporary directory. */
function scanMixedLadders(roots) {
  const found = [];
  for (const relative of roots) {
    const base = isAbsolute(relative) ? relative : join(root, relative);
    for (const file of sourceFiles(base)) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(CLASS_ATTR)) {
        const classList = match[1] ?? match[2] ?? match[3] ?? "";
        for (const clash of mixedLadders(classList)) {
          found.push({
            file: file.startsWith(root) ? file.slice(root.length) : file,
            line: text.slice(0, match.index).split("\n").length,
            ...clash,
          });
        }
      }
    }
  }
  return found;
}

const dir = mkdtempSync(join(tmpdir(), "kx-breakpoints-"));
let failed = false;
try {
  const results = check(compile(dir));
  const missing = results.filter((r) => !r.emitted);
  for (const r of missing) {
    console.error(`  MISSING  ${r.cls} — expected \`${r.expect}\` in the compiled CSS`);
  }
  if (missing.length > 0) {
    failed = true;
    if (missing.every((r) => r.half === 2)) {
      console.error(
        "\n  Every missing rule is a `max-*` / `min-[…]` variant. That is the signature of `rem`\n" +
          "  breakpoints having been put back into `theme.screens`: Tailwind drops these variants\n" +
          "  wholesale when the screen map mixes units. Register them as variants instead — see\n" +
          "  `remBreakpoints` in packages/ui/tailwind.config.ts.",
      );
    }
  } else {
    const remCount = results.filter((r) => r.half === 1).length;
    console.log(
      `check:breakpoints ok — ${results.length} utilities compiled against the published preset: ` +
        `all ${remCount} \`-rem\` variants emit their rem media queries, and \`max-md\` and \`min-[420px]\` still emit theirs.`,
    );
  }

  const mixed = scanMixedLadders(SOURCE_ROOTS);
  for (const clash of mixed) {
    console.error(
      `  MIXED LADDER  ${clash.file}:${clash.line} — \`${clash.property}\` is gated on both ` +
        `${clash.px.map((t) => "`" + t + "`").join(" ")} and ${clash.rem.map((t) => "`" + t + "`").join(" ")}. ` +
        `The \`px\` rule is emitted later and wins at every width above its own breakpoint. ` +
        `Put the whole ladder in one unit.`,
    );
  }
  if (mixed.length > 0) failed = true;
  else if (missing.length === 0) {
    console.log(
      `  one ladder per property — ${SOURCE_ROOTS.length} source trees scanned, no element gates a property on both a \`px\` and a \`-rem\` breakpoint.`,
    );
  }

  if (process.argv.includes("--prove")) {
    const control = check(compile(dir, { asScreens: true }));
    const half2 = control.filter((r) => r.half === 2);
    const dropped = half2.filter((r) => !r.emitted);
    if (dropped.length === half2.length) {
      console.log(
        `  negative control: with the same breakpoints as \`theme.extend.screens\`, ` +
          `${dropped.map((r) => "`" + r.cls + "`").join(" and ")} emit no rule at all — the gate can fail.`,
      );
    } else {
      console.error(
        "  NEGATIVE CONTROL FAILED — the mutated config still emitted " +
          `${half2.length - dropped.length} of ${half2.length} min/max rules, so this gate is not measuring what it claims.`,
      );
      failed = true;
    }

    // The source scan, proved against a fixture that mixes the ladders the way
    // component-spotlight.tsx did before this gate existed.
    const fixtureDir = join(dir, "fixture");
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(
      join(fixtureDir, "mixed.tsx"),
      'export const M = () => <div className="grid grid-cols-1 md:grid-cols-3 lg-rem:grid-cols-12" />;\n',
    );
    const caught = scanMixedLadders([fixtureDir]);
    if (caught.length === 1 && caught[0].property === "grid-cols") {
      console.log(
        "  negative control: a fixture gating `grid-cols` on both `md:` and `lg-rem:` is caught by the source scan.",
      );
    } else {
      console.error(
        `  NEGATIVE CONTROL FAILED — the source scan found ${caught.length} clash(es) in a fixture built to contain exactly one.`,
      );
      failed = true;
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
