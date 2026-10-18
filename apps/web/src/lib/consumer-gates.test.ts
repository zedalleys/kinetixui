// @vitest-environment node
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The native consumer gates (BD-W5 F-08) run only on their own CI runners, where the toolchains are. These checks run
 * everywhere: every negative control a gate defines is a CI matrix leg, and the fixture a gate builds is made from the
 * docs page itself, so editing the page changes what CI compiles.
 */
const repo = "../..";
const read = (p: string) => readFileSync(join(repo, p), "utf8");
const node = (script: string, ...args: string[]) =>
  execFileSync(process.execPath, [join(repo, script), ...args], { encoding: "utf8" });

const GATES = [
  { script: "scripts/adoption/compose-consumer.mjs", workflow: ".github/workflows/native-compose.yml" },
  { script: "scripts/adoption/swiftui-consumer.mjs", workflow: ".github/workflows/native-swiftui.yml" },
  { script: "scripts/adoption/flutter-consumer.mjs", workflow: ".github/workflows/native-flutter.yml" },
];

const matrix = (workflow: string) => {
  const block = read(workflow).match(/consumer-negative-controls:[\s\S]*?control:\n((?:\s+- [\w-]+\n)+)/)?.[1] ?? "";
  return [...block.matchAll(/- ([\w-]+)/g)].map((m) => m[1]);
};

describe("native consumer gates", () => {
  it.each(GATES)("$script: every negative control is a CI matrix leg, and the gate runs on docs and script changes", ({ script, workflow }) => {
    const controls = node(script, "--list-negatives").trim().split("\n");
    expect(matrix(workflow).sort()).toEqual(controls.sort());
    const text = read(workflow);
    expect(text).toContain(`run: node ${script}\n`);
    expect(text.split(`- "${script}"`)).toHaveLength(3); // in the push and the pull_request path filters
  });

  const fixture = (script: string) => {
    const out = node(script, "--write-only");
    const dir = out.match(/consumer: (\S+)/)?.[1];
    expect(dir).toBeTruthy();
    return dir!;
  };

  it("SwiftUI builds the page's Package.swift lines and ContentView, at the floor the page states", () => {
    const page = read("apps/web/src/app/docs/swiftui/page.mdx");
    const dir = fixture("scripts/adoption/swiftui-consumer.mjs");
    try {
      const manifest = readFileSync(join(dir, "Package.swift"), "utf8");
      expect(manifest).toContain('.package(path: "Vendor/kinetixui/packages/ui-swiftui")');
      expect(manifest).toContain("platforms: [.iOS(.v16), .macOS(.v13)]");
      expect(page).toContain("`.iOS(.v16)` / `.macOS(.v13)`");
      const sample = readFileSync(join(dir, "Sources/App/ContentView.swift"), "utf8").trim();
      expect(page).toContain(sample);
      expect(readFileSync(join(dir, "Vendor/kinetixui/packages/ui-swiftui/Package.swift"), "utf8")).toBe(read("packages/ui-swiftui/Package.swift"));
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("Flutter builds the page's path dependency, Demo and runApp line, with the SDK constraints the page states", () => {
    const page = read("apps/web/src/app/docs/flutter/page.mdx");
    const app = fixture("scripts/adoption/flutter-consumer.mjs");
    try {
      const pubspec = readFileSync(join(app, "pubspec.yaml"), "utf8");
      expect(pubspec).toContain("  kinetix_ui:\n    path: ../kinetixui/packages/ui-flutter\n");
      expect(pubspec).toContain('sdk: ">=3.6.0 <4.0.0"');
      expect(page).toContain(readFileSync(join(app, "lib/demo.dart"), "utf8").trim());
      const main = readFileSync(join(app, "lib/main.dart"), "utf8");
      expect(main).toContain("runApp(const MaterialApp(home: Scaffold(body: Center(child: Demo()))));");
      expect(readFileSync(join(app, "../kinetixui/packages/ui-flutter/pubspec.yaml"), "utf8")).toBe(read("packages/ui-flutter/pubspec.yaml"));
    } finally {
      rmSync(dirname(app), { recursive: true });
    }
  });

  it.each([
    ["scripts/adoption/swiftui-consumer.mjs", "fence-missing"],
    ["scripts/adoption/flutter-consumer.mjs", "fence-missing"],
    ["scripts/adoption/flutter-consumer.mjs", "run-line-missing"],
  ])("%s --negative=%s fails for its named reason without a toolchain", (script, control) => {
    expect(node(script, `--negative=${control}`)).toMatch(/PASS: negative control .* fails the gate as expected/);
  });
});
