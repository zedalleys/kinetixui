// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Colour-theming Slice 1: the two roles Slice 1 added are not just DEFINED and GENERATED, they are
 * CONSUMED where the audit found the divergence.
 *
 * `token-evidence.test.ts` proves every top-level role reaches all four generated outputs. It cannot see
 * whether a component reads it. These assertions are the other half, and they are the cheap kind on
 * purpose: a source check per consumer, with the sabotage (reverting one consumer to a literal) watched
 * to fail in /mnt/project-files/color-theming-audit/slice-1/negative-controls/.
 *
 * Native code cannot be compiled on this runner, so for Swift, Kotlin and Dart this is the evidence that
 * the role is wired; the platform tests that run on macOS/JVM/Flutter CI cover the rest.
 */
const root = join(process.cwd(), "../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const SWIFT = "packages/ui-swiftui/Sources/KinetixUI";
const KOTLIN = "packages/ui-compose/ui/src/main/kotlin/com/kinetixui/ui";
const DART = "packages/ui-flutter/lib/src";

describe("scrim: every overlay's backdrop reads the one role", () => {
  const web = [
    "packages/ui/src/components/dialog.tsx",
    "packages/ui/src/components/alert-dialog.tsx",
    "packages/ui/src/components/sheet.tsx",
    "packages/ui/src/components/drawer.tsx",
    "apps/web/src/components/command-menu.tsx",
  ];

  it.each(web)("%s paints bg-scrim and not a foreground veil", (file) => {
    const src = read(file);
    expect(src).toMatch(/\bbg-scrim\b/);
    // `bg-foreground/40` is the original defect: foreground is light in dark mode, so the "dim" lightened.
    expect(src).not.toMatch(/bg-foreground\/\d+/);
  });

  it("the Tour spotlight and backdrop read --scrim", () => {
    const src = read("packages/ui/src/components/tour.tsx");
    expect(src.match(/var\(--scrim\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(src).not.toMatch(/rgba\(\s*0\s*,\s*0\s*,\s*0/);
  });

  it("Angular's native <dialog> backdrop reads --scrim", () => {
    const css = read("packages/ui-angular/src/styles.css");
    const block = css.match(/\.kx-dialog::backdrop\s*\{[^}]*\}/)?.[0] ?? "";
    expect(block).toMatch(/var\(--scrim/);
    expect(block).not.toMatch(/--static-black|rgb\(|rgba\(|#0/);
  });

  it.each([`${SWIFT}/Dialog.swift`, `${SWIFT}/Sheet.swift`, `${SWIFT}/Sidebar.swift`])("%s reads colors.scrim", (file) => {
    expect(read(file)).toMatch(/colors\.scrim/);
  });

  it.each([`${KOTLIN}/Sheet.kt`, `${KOTLIN}/Sidebar.kt`])("%s reads colors.scrim", (file) => {
    expect(read(file)).toMatch(/colors\.scrim/);
  });

  it("Compose Dialog keeps the platform window dim (it cannot be recoloured) and says so", () => {
    const src = read(`${KOTLIN}/Dialog.kt`);
    expect(src).not.toMatch(/Color\.Black|Color\(0x/);
    expect(src).toMatch(/dim|scrim/i);
  });

  it.each([`${DART}/dialog.dart`, `${DART}/sheet.dart`, `${DART}/sidebar.dart`])("%s reads c.scrim", (file) => {
    expect(read(file)).toMatch(/\bc\.scrim\b/);
  });
});

describe("scrim: defined for both themes, meaningfully", () => {
  const light = JSON.parse(read("tokens/semantic/color.light.json")).color.scrim.$value as string;
  const dark = JSON.parse(read("tokens/semantic/color.dark.json")).color.scrim.$value as string;

  it("is an alpha colour in both themes, never a palette reference", () => {
    for (const v of [light, dark]) expect(v).toMatch(/^#[0-9a-f]{6}[0-9a-f]{2}$/i);
  });

  it("dims MORE in dark mode: black on a dark page needs more opacity to separate", () => {
    const a = (v: string) => parseInt(v.slice(7, 9), 16) / 255;
    expect(a(dark)).toBeGreaterThan(a(light));
    expect(a(light)).toBeGreaterThan(0.2);
  });

  it("is black in both: a scrim is a shadow over the page, not a tint of it", () => {
    expect(light.slice(0, 7).toLowerCase()).toBe("#000000");
    expect(dark.slice(0, 7).toLowerCase()).toBe("#000000");
  });
});

describe("info container: Banner and Inform read the container foreground on every platform", () => {
  it("web", () => {
    for (const f of ["banner", "inform"]) {
      const src = read(`packages/ui/src/components/${f}.tsx`);
      expect(src).toMatch(/information:[^\n]*text-info-on-container/);
    }
  });

  it("angular", () => {
    const css = read("packages/ui-angular/src/styles.css");
    for (const f of ["banner", "inform"])
      expect(css).toMatch(new RegExp(`\\.kx-${f}--information\\s*\\{[^}]*color:\\s*hsl\\(var\\(--on-info-container\\)\\)`));
  });

  it.each([`${SWIFT}/Banner.swift`, `${SWIFT}/Inform.swift`])("%s uses colors.onInfoContainer", (file) => {
    expect(read(file)).toMatch(/\.information:[^\n]*colors\.onInfoContainer/);
  });

  it.each([`${KOTLIN}/Banner.kt`, `${KOTLIN}/Inform.kt`])("%s uses colors.onInfoContainer", (file) => {
    expect(read(file)).toMatch(/Information ->[^\n]*colors\.onInfoContainer/);
  });

  it.each([`${DART}/banner.dart`, `${DART}/inform.dart`])("%s uses c.onInfoContainer", (file) => {
    expect(read(file)).toMatch(/\.information =>[^\n]*c\.onInfoContainer/);
  });

  it("none of them paints the container text with the plain `info` role", () => {
    for (const [file, re] of [
      [`${SWIFT}/Banner.swift`, /\.information:[^\n]*colors\.info\)/],
      [`${KOTLIN}/Banner.kt`, /Information ->[^\n]*to colors\.info\b(?!\.)/],
      [`${DART}/banner.dart`, /\.information =>[^\n]*, c\.info\)/],
    ] as const)
      expect(read(file), file).not.toMatch(re);
  });
});

describe("native theme structures expose both roles to consumers", () => {
  it("SwiftUI KinetixColors", () => {
    const src = read(`${SWIFT}/Theme.swift`);
    expect(src).toMatch(/public let onInfoContainer: Color/);
    expect(src).toMatch(/public let scrim: Color/);
  });

  it("Compose KinetixColors", () => {
    const src = read(`${KOTLIN}/Theme.kt`);
    expect(src).toMatch(/val onInfoContainer: Color/);
    expect(src).toMatch(/val scrim: Color/);
    expect(src).toMatch(/Generated(Light|Dark)\.colorOnInfoContainer/);
    expect(src).toMatch(/Generated(Light|Dark)\.colorScrim/);
  });

  it("Flutter KinetixColors", () => {
    const src = read(`${DART}/theme.dart`);
    expect(src).toMatch(/final Color onInfoContainer/);
    expect(src).toMatch(/final Color scrim/);
  });
});
