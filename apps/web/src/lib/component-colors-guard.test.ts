// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

/**
 * Negative controls for `check:component-colors`.
 *
 * A guard that has never been watched to fail is a belief, not a gate. Each test builds a small fixture
 * tree that PASSES, breaks exactly one thing, and asserts the specific complaint — asserting only "it
 * failed" would pass for a typo in the fixture. The fixture is deliberately the shape the real scopes
 * have (same relative paths), because the allowlist and the exclusions are keyed on them.
 */

const repoRoot = join(process.cwd(), "../..");
const script = join(repoRoot, "scripts/check-component-colors.mjs");

const temps: string[] = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop()!, { recursive: true, force: true });
});

const BUTTON = "packages/ui/src/components/button.tsx";
const CLEAN: Record<string, string> = {
  [BUTTON]: `
    // bg-blue-500 and #1d4ed8 in a comment are prose, not a colour
    export const x = "bg-primary text-primary-foreground hover:bg-action-hover border-border ring-ring bg-scrim";
    export const y = "bg-transparent text-current shadow-[0_0_0_2px_hsl(var(--ring))]";
    export const z = "[forced-colors:active]:border-[ButtonText] [forced-colors:active]:bg-[Canvas]";
    export const e = "&#10003; <a href=\\"#add\\">skip</a> <path clip-path=\\"url(#clip)\\" />";
    export const t = "shadow-[0_0_#0000] bg-[#00000000] text-inherit";
  `,
  "packages/ui-angular/src/lib/button.ts": "export const s = 'background: hsl(var(--action)); color: currentColor';",
  "packages/ui-swiftui/Sources/KinetixUI/Button.swift": "let a = colors.action; let b = Color.clear; // Color.white in a comment",
  "packages/ui-compose/ui/src/main/kotlin/com/kinetixui/ui/Button.kt": "val a = colors.action; val b = Color.Transparent",
  "packages/ui-flutter/lib/src/button.dart": "final a = c.action; final b = Colors.transparent; const t = Color(0x00000000);",
};

function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "kx-colors-"));
  temps.push(dir);
  for (const [rel, body] of Object.entries(files)) {
    const path = join(dir, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body);
  }
  return dir;
}

function run(files: Record<string, string>) {
  const dir = fixture(files);
  const r = spawnSync(process.execPath, [script, `--root=${dir}`], { encoding: "utf8" });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

describe("check:component-colors", () => {
  it("passes a fixture of semantic-role, transparent and system-colour usage", () => {
    const r = run(CLEAN);
    expect(r.out).toContain("clean");
    expect(r.status).toBe(0);
  });

  it("passes on this repository", () => {
    const r = spawnSync(process.execPath, [script], { encoding: "utf8" });
    expect(`${r.stdout}${r.stderr}`).toContain("component sources clean");
    expect(r.status).toBe(0);
  });

  describe("negative controls: a literal or a primitive in reusable component source fails", () => {
    const break1 = (rel: string, body: string) => run({ ...CLEAN, [rel]: body });

    it("a Tailwind palette utility", () => {
      const r = break1(BUTTON, `export const x = "bg-blue-500 text-white";`);
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/button\.tsx:1\s+palette-utility\s+`bg-blue-500`/);
      expect(r.out).toMatch(/palette-utility\s+`text-white`/);
    });

    it("a palette custom property", () => {
      const r = break1(BUTTON, `export const x = "bg-[hsl(var(--blue-400))]";`);
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/primitive-var\s+`--blue-400`/);
    });

    it("a hex that equals a shipped role is reported as that role", () => {
      const r = break1(BUTTON, `export const x = { background: "#1d4ed8" };`);
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/equals the shipped `primary`/);
    });

    it("a hex that is not a role is still a raw colour", () => {
      const r = break1(BUTTON, `export const x = { background: "#123456" };`);
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/raw-colour\s+`#123456`.*raw colour literal/);
    });

    it("rgb() and hsl() with numbers, but not with var()", () => {
      const r = break1(BUTTON, `a = "rgba(0, 0, 0, .5)"; b = "hsl(210 40% 50%)"; c = "hsl(var(--ring) / .5)";`);
      expect(r.status).toBe(1);
      expect(r.out.match(/raw-colour/g)).toHaveLength(2);
    });

    it("a literal in an Angular template", () => {
      const r = break1("packages/ui-angular/src/lib/button.ts", "const s = 'color: #ffffff';");
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/packages\/ui-angular\/src\/lib\/button\.ts:1/);
    });

    it("a literal colour in a SwiftUI view", () => {
      for (const body of ["let a = Color.white", "let a = Color(red: 0.1, green: 0.2, blue: 0.3)", "x.foregroundStyle(.black)"]) {
        const r = break1("packages/ui-swiftui/Sources/KinetixUI/Button.swift", body);
        expect(r.status, body).toBe(1);
        expect(r.out, body).toMatch(/Button\.swift:1\s+raw-colour/);
      }
    });

    it("a literal colour in a Compose component", () => {
      for (const body of ["val a = Color.Black", "val a = Color(0xFF1D4ED8)"]) {
        const r = break1("packages/ui-compose/ui/src/main/kotlin/com/kinetixui/ui/Button.kt", body);
        expect(r.status, body).toBe(1);
        expect(r.out, body).toMatch(/Button\.kt:1\s+raw-colour/);
      }
    });

    it("a literal colour in a Flutter widget, and a duplicated role is named", () => {
      const r = break1("packages/ui-flutter/lib/src/button.dart", "final a = Colors.white; final b = Color(0xFF050C11);");
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/button\.dart:1\s+raw-colour\s+`Colors\.white`/);
      expect(r.out).toMatch(/equals the shipped `foreground`/);
    });
  });

  describe("exclusions and the reviewed allowlist", () => {
    it("scans reusable source only: tests, stories, examples and generated files are not component source", () => {
      const r = run({
        ...CLEAN,
        "packages/ui/src/components/button.test.tsx": `x = "bg-blue-500 #fff"`,
        "packages/ui/src/stories/button.stories.tsx": `x = "#ff0000"`,
        "packages/ui-angular/src/examples/a.ts": `x = "#ff0000"`,
        "packages/ui-swiftui/Sources/KinetixUI/Gen.swift": `// Do not edit.\nlet a = Color.white`,
        "packages/ui-flutter/lib/src/gen.dart": `// generated by Style Dictionary\nconst a = Color(0xFFFFFFFF);`,
      });
      expect(r.status).toBe(0);
    });

    it("an allowlisted file may use its allowed kind (the colour picker draws colours)", () => {
      const r = run({
        ...CLEAN,
        "packages/ui/src/components/color-picker.tsx": `x = "linear-gradient(to right, #fff, transparent)"; y = "border-white"`,
      });
      expect(r.status).toBe(0);
    });

    it("the same literal in any other file is a finding", () => {
      const r = run({ ...CLEAN, "packages/ui/src/components/slider.tsx": `x = "border-white"` });
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/slider\.tsx:1\s+palette-utility/);
    });

    it("an allowlist entry covers only the kinds it names", () => {
      const r = run({ ...CLEAN, "packages/ui/src/components/color-picker.tsx": `x = "bg-[hsl(var(--blue-400))]"` });
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/color-picker\.tsx:1\s+primitive-var/);
    });
  });
});
