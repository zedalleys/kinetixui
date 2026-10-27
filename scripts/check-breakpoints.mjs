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
 * `--prove` runs the negative control: it rebuilds with the same breakpoints moved into
 * `theme.extend.screens` and asserts that half 2 then FAILS. Nothing is written to the repository
 * — the mutated config exists only in a temporary directory.
 */
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  { cls: "lg-rem:grid-cols-3", expect: "@media (min-width: 64rem)", half: 1 },
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
    ? `export default { content: [${JSON.stringify(join(dir, "stub.html"))}], theme: { extend: { screens: { "sm-rem": "40rem", "lg-rem": "64rem", "xl-rem": "80rem" } } } };\n`
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
    console.log(
      `check:breakpoints ok — ${results.length} utilities compiled against the published preset: ` +
        `the three \`-rem\` variants emit their rem media queries, and \`max-md\` and \`min-[420px]\` still emit theirs.`,
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
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
