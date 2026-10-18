import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analytics } from "./analytics";
import { classifyCommand, classifyNativeInstall, trackFenceCopy } from "./analytics-surfaces";
import { PLATFORM_DEFINITIONS, type Platform } from "./platform-parity";

/**
 * Native install intent is measurable (evaluator audit F-24).
 *
 * The native ports are not on SwiftPM, Maven Central or pub.dev, so their install steps are a Package.swift
 * dependency, a Gradle registration, a pubspec entry and a git pin — none of which is a shell `npm i`, so copying
 * any of them used to emit nothing. The snippets are read from the real setup pages, so a docs edit that changes a
 * snippet's shape fails here instead of going silently unmeasured again.
 */
const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
beforeEach(() => track.mockClear());

type Fence = { language: string; text: string };
const fences = (page: string): Fence[] =>
  [...readFileSync(`src/app/docs/${page}/page.mdx`, "utf8").matchAll(/```(\w+)\n([\s\S]*?)\n```/g)].map((m) => ({ language: m[1]!, text: m[2]! }));

/** Each page's install fences, picked out by what a reader copies to install — not by what the classifier matches. */
const INSTALL_FENCES: { page: string; platform: Platform; id: string; pick: (f: Fence) => boolean; count: number }[] = [
  { page: "swiftui", platform: "SwiftUI", id: "swiftui", pick: (f) => (f.language === "bash" && f.text.includes("submodule add")) || (f.language === "swift" && f.text.includes(".package(path:")), count: 2 },
  { page: "compose", platform: "Compose", id: "compose", pick: (f) => (f.language === "bash" && f.text.includes("git clone")) || (f.language === "kotlin" && f.text.includes('":kinetixui-ui"')), count: 3 },
  { page: "flutter", platform: "Flutter", id: "flutter", pick: (f) => f.language === "yaml" && /^\s+kinetix_ui:\s*$/m.test(f.text), count: 2 },
];

describe("native install snippets on the setup pages", () => {
  it.each(INSTALL_FENCES)("$page: every install snippet reports its port, by manifest package only", ({ page, platform, id, pick, count }) => {
    const install = fences(page).filter(pick);
    expect(install, `${page} lost an install snippet this test reads`).toHaveLength(count);
    for (const f of install) {
      expect(classifyNativeInstall(f.text, f.language, `/docs/${page}`), f.text).toEqual({ package: PLATFORM_DEFINITIONS[platform].package, platform: id });
    }
  });

  // Negative control: the classifier that existed before this change misses every one of them.
  it.each(INSTALL_FENCES)("$page: the npm-only classifier would have missed every snippet", ({ page, pick }) => {
    for (const f of fences(page).filter(pick)) expect(classifyCommand(f.text, f.language)).toBeNull();
  });

  it.each(INSTALL_FENCES)("$page: a non-install snippet on the same page reports no install", ({ page, pick }) => {
    const others = fences(page).filter((f) => !pick(f) && !(f.language === "bash" && f.text.includes("git -C")));
    expect(others.length).toBeGreaterThan(0);
    for (const f of others) expect(classifyNativeInstall(f.text, f.language, `/docs/${page}`), f.text).toBeNull();
  });

  it("emits exactly one install_command_copied with no text from the snippet", () => {
    const yaml = "dependencies:\n  kinetix_ui:\n    git:\n      url: https://github.com/zedalleys/kinetixui.git\n      ref: deadbeefSECRET";
    trackFenceCopy(yaml, "yaml", "/docs/flutter");
    expect(track.mock.calls).toEqual([["install_command_copied", { source: "docs_page", package: "kinetix_ui", platform: "flutter" }]]);
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/SECRET|github\.com|ref/);
  });

  it("does not count a clone of this repository on a page that is not a native setup page", () => {
    expect(classifyNativeInstall("git clone https://github.com/zedalleys/kinetixui.git", "bash", "/docs/contributing")).toBeNull();
    expect(classifyNativeInstall("git clone https://github.com/someone/else.git", "bash", "/docs/swiftui")).toBeNull();
  });

  it("does not count a usage snippet that only names a port", () => {
    expect(classifyNativeInstall("import KinetixUI\nKinetixButton(action: {}) { Text(\"Save\") }", "swift", "/docs/swiftui")).toBeNull();
    expect(classifyNativeInstall("import 'package:kinetix_ui/kinetix_ui.dart';", "dart", "/docs/flutter")).toBeNull();
  });
});

describe("Angular install copies name Angular", () => {
  // Before @kinetixui/angular was a known package, this command reported as an install of @kinetixui/tokens.
  it("attributes `npm i @kinetixui/angular @kinetixui/tokens` to the Angular package", () => {
    expect(classifyCommand("npm i @kinetixui/angular @kinetixui/tokens", "bash")).toEqual({ event: "install_command_copied", package: "@kinetixui/angular", platform: "angular" });
  });
});
