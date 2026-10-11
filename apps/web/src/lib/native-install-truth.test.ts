// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NATIVE_PLATFORMS, PLATFORM_DEFINITIONS, type Platform } from "./platform-parity";

/**
 * Native install docs tell the truth about distribution (evaluator audit F-01, docs half).
 *
 * SwiftUI, Compose and Flutter are declared unpublished in the manifest (`distribution.published: false`): there is
 * no SwiftPM release, no Maven Central artifact and no pub.dev package. While that holds, each setup page must
 *   - show no registry-style dependency a reader could paste and expect to resolve, and
 *   - give a way to pin a commit, because "use a checkout" with no pin leaves an app on whatever main is today.
 * When a port is published, its registry snippet becomes legitimate and this guard stops forbidding it on its own.
 */
const read = (p: string) => readFileSync(`../../${p}`, "utf8");

const SETUP_PAGE: Record<Platform, string> = {
  React: "apps/web/src/app/docs/installation/page.mdx",
  Angular: "apps/web/src/app/docs/angular/page.mdx",
  SwiftUI: "apps/web/src/app/docs/swiftui/page.mdx",
  Compose: "apps/web/src/app/docs/compose/page.mdx",
  Flutter: "apps/web/src/app/docs/flutter/page.mdx",
};

/** What a registry install looks like on each native channel. Any of these on an unpublished port's page is a false promise. */
const REGISTRY_INSTALL: Partial<Record<Platform, RegExp[]>> = {
  // a remote SwiftPM dependency: `.package(url: "…kinetixui…", from:/exact:/branch:/revision:)`
  SwiftUI: [/\.package\s*\(\s*url:\s*"[^"]*kinetix/i],
  // a Maven coordinate: `implementation("com.kinetixui:ui-compose:0.1.0")`
  Compose: [/implementation\s*\(\s*"com\.kinetixui:ui-compose:[^"]*"\s*\)/],
  // a hosted pub dependency: `kinetix_ui: ^0.1.0`, `kinetix_ui: 0.1.0`, `kinetix_ui: any`
  Flutter: [/^\s+kinetix_ui:\s*(?:\^|\d|any\b|["'][\^\d])/m],
};

/** Everything wrong with `text` as the setup page of an unpublished native port. Empty means truthful. */
function nativeInstallViolations(platform: Platform, text: string): string[] {
  const out: string[] = [];
  const fenced = [...text.matchAll(/```\w*\n([\s\S]*?)\n```/g)].map((m) => m[1]!).join("\n");
  for (const re of REGISTRY_INSTALL[platform] ?? []) if (re.test(fenced)) out.push(`registry install snippet ${re} while ${platform} is unpublished`);
  if (!fenced.includes("<commit-sha>")) out.push(`no snippet pins a commit (<commit-sha>)`);
  if (!/github\.com\/zedalleys\/kinetixui/.test(fenced)) out.push(`no snippet says where the source comes from`);
  return out;
}

const UNPUBLISHED = NATIVE_PLATFORMS.filter((p) => !PLATFORM_DEFINITIONS[p].distribution.published);

describe("native install truth", () => {
  it("covers the ports the manifest declares unpublished", () => {
    // if one is published, its row leaves this list and the guard stops forbidding its registry snippet
    expect(UNPUBLISHED).toEqual(["SwiftUI", "Compose", "Flutter"]);
  });

  it.each(UNPUBLISHED)("%s setup page shows no registry install and pins a commit", (p) => {
    expect(nativeInstallViolations(p, read(SETUP_PAGE[p]))).toEqual([]);
  });

  it.each(UNPUBLISHED)("Installation names %s as checkout-only", (p) => {
    const line = read(SETUP_PAGE.React).split("\n").find((l) => l.includes(`(/docs/${SETUP_PAGE[p].split("/").at(-2)})`));
    expect(line, `Installation has no ${p} line`).toBeTruthy();
    expect(line).toMatch(/repository checkout/);
  });

  /* Negative controls: each would-be regression is caught. */
  const page = (p: Platform) => read(SETUP_PAGE[p]);
  it.each([
    ["SwiftUI", '```swift\n.package(url: "https://github.com/zedalleys/kinetixui.git", from: "0.1.0")\n```'],
    ["Compose", '```kotlin\nimplementation("com.kinetixui:ui-compose:0.1.0")\n```'],
    ["Flutter", "```yaml\ndependencies:\n  kinetix_ui: ^0.1.0\n```"],
  ] as const)("catches a %s registry snippet added to the real page", (p, snippet) => {
    expect(nativeInstallViolations(p, `${page(p)}\n\n${snippet}\n`).join()).toMatch(/registry install snippet/);
  });

  it.each(UNPUBLISHED)("catches %s losing its commit pin", (p) => {
    expect(nativeInstallViolations(p, page(p).replaceAll("<commit-sha>", "main")).join()).toMatch(/pins a commit/);
  });
});

/**
 * The update steps do what they say (PR #350 review). Each fence is read as the ordered shell lines a reader runs.
 * Compose: replacing a copied module must delete it first (`cp -R` onto an existing folder nests the copy) and must
 * save and re-apply the reader's own edits. SwiftUI: moving a submodule only changes the nested checkout until the
 * parent repository stages and commits the gitlink, at setup and on update alike.
 */
const fences = (text: string, lang: string) => [...text.matchAll(new RegExp("```" + lang + "\\n([\\s\\S]*?)\\n```", "g"))].map((m) => m[1]!.split("\n").map((l) => l.trim()));
const ordered = (lines: string[], steps: RegExp[]) => {
  let at = -1;
  for (const step of steps) {
    const next = lines.findIndex((l, i) => i > at && step.test(l));
    if (next === -1) return false;
    at = next;
  }
  return true;
};

const composeUpdateRefreshes = (text: string) =>
  fences(text, "bash").some((f) =>
    ordered(f, [/^git -C \.\.\/kinetixui checkout <commit-sha>$/, /^diff -ruN .*\.\.\/kinetixui\/packages\/ui-compose\/ui kinetixui-ui > (\S+)$/, /checkout <newer-commit-sha>$/, /^rm -rf kinetixui-ui$/, /^cp -R \.\.\/kinetixui\/packages\/ui-compose\/ui kinetixui-ui$/, /^patch -p1 -d kinetixui-ui < /]),
  );
const swiftPinCommitted = (text: string, sha: string) =>
  fences(text, "bash").some((f) => ordered(f, [new RegExp(`^git -C Vendor/kinetixui checkout ${sha}$`), /^git add (?:\.gitmodules )?Vendor\/kinetixui$/, /^git commit\b/]));

describe("native update steps", () => {
  const compose = read(SETUP_PAGE.Compose);
  const swift = read(SETUP_PAGE.SwiftUI);

  it("Compose replaces the copied module, saving and re-applying local edits, in that order", () => {
    expect(composeUpdateRefreshes(compose)).toBe(true);
  });

  it("SwiftUI commits .gitmodules and the pin at setup, and the moved pin on update", () => {
    expect(swiftPinCommitted(swift, "<commit-sha>")).toBe(true);
    expect(swift).toMatch(/git add \.gitmodules Vendor\/kinetixui/);
    expect(swiftPinCommitted(swift, "<newer-commit-sha>")).toBe(true);
  });

  it("would catch the steps that shipped before the review", () => {
    // copy over the existing folder, no delete, no patch
    expect(composeUpdateRefreshes("```bash\ngit -C ../kinetixui checkout <newer-commit-sha>\ncp -R ../kinetixui/packages/ui-compose/ui kinetixui-ui\n```")).toBe(false);
    // delete-and-copy that throws away local edits
    expect(composeUpdateRefreshes("```bash\ngit -C ../kinetixui checkout <newer-commit-sha>\nrm -rf kinetixui-ui\ncp -R ../kinetixui/packages/ui-compose/ui kinetixui-ui\n```")).toBe(false);
    // moving the submodule without recording it
    expect(swiftPinCommitted("```bash\ngit -C Vendor/kinetixui fetch\ngit -C Vendor/kinetixui checkout <newer-commit-sha>\n```", "<newer-commit-sha>")).toBe(false);
  });
});
