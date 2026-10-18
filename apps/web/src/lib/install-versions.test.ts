// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every version a setup page tells a reader to use is the version the package actually builds with (BD-W4 F-01).
 *
 * The Compose page said "compiler plugin 2.4.20" and "Gradle 9.8.0" for weeks after Dependabot moved the module to
 * 2.4.21 (#355) and the wrapper to 9.8.1 (#356): a dependency bump edits the build file, nothing edits the prose, and
 * the consumer gate compiles whatever the page says, so it stayed green on the stale value. This reads each value from
 * the file that owns it and fails on any page that names another one.
 */
const read = (p: string) => readFileSync(`../../${p}`, "utf8");
const one = (text: string, re: RegExp, what: string) => {
  const m = text.match(re);
  if (!m?.[1]) throw new Error(`could not read ${what}`);
  return m[1];
};

type Build = Record<string, string>;

/** The values each platform's own build files declare. */
function buildValues(): Build {
  const composeRoot = read("packages/ui-compose/build.gradle.kts");
  const composeUi = read("packages/ui-compose/ui/build.gradle.kts");
  const wrapper = read("packages/ui-compose/gradle/wrapper/gradle-wrapper.properties");
  const swift = read("packages/ui-swiftui/Package.swift");
  const pubspec = read("packages/ui-flutter/pubspec.yaml");
  const angular = JSON.parse(read("packages/ui-angular/package.json")) as { peerDependencies: Record<string, string> };
  return {
    agp: one(composeRoot, /id\("com\.android\.library"\) version "([^"]+)"/, "AGP"),
    composePlugin: one(composeRoot, /id\("org\.jetbrains\.kotlin\.plugin\.compose"\) version "([^"]+)"/, "Compose plugin"),
    gradle: one(wrapper, /gradle-([\d.]+)-bin\.zip/, "Gradle wrapper"),
    compileSdk: one(composeUi, /compileSdk = (\d+)/, "compileSdk"),
    minSdk: one(composeUi, /minSdk = (\d+)/, "minSdk"),
    composeBom: one(composeUi, /compose-bom:([\d.]+)/, "Compose BOM"),
    swiftTools: one(swift, /swift-tools-version:\s*([\d.]+)/, "swift-tools-version"),
    ios: one(swift, /\.iOS\(\.v(\d+)\)/, "iOS floor"),
    macos: one(swift, /\.macOS\(\.v(\d+)\)/, "macOS floor"),
    dartSdk: one(pubspec, /^\s+sdk:\s*"([^"]+)"/m, "Dart SDK"),
    flutter: one(pubspec, /^\s+flutter:\s*"([^"]+)"/m, "Flutter SDK"),
    angularCore: angular.peerDependencies["@angular/core"]!,
    angularForms: angular.peerDependencies["@angular/forms"]!,
  };
}

/** Each pattern finds every place a page states a value; each capture must equal the build value. */
const CLAIMS: { page: string; key: keyof ReturnType<typeof buildValues>; re: RegExp }[] = [
  { page: "compose", key: "agp", re: /Android Gradle Plugin ([\d.]+)/g },
  { page: "compose", key: "agp", re: /id\("com\.android\.(?:application|library)"\) version "([^"]+)"/g },
  { page: "compose", key: "composePlugin", re: /Compose compiler plugin ([\d.]+)/g },
  { page: "compose", key: "composePlugin", re: /id\("org\.jetbrains\.kotlin\.plugin\.compose"\) version "([^"]+)"/g },
  { page: "compose", key: "gradle", re: /repository uses ([\d.]+)\)/g },
  { page: "compose", key: "compileSdk", re: /compileSdk(?: =)? (\d+)/g },
  { page: "compose", key: "minSdk", re: /minSdk (\d+)/g },
  { page: "compose", key: "composeBom", re: /compose-bom:([\d.]+)/g },
  { page: "swiftui", key: "swiftTools", re: /swift-tools-version: ([\d.]+)/g },
  { page: "swiftui", key: "ios", re: /\.iOS\(\.v(\d+)\)/g },
  { page: "swiftui", key: "macos", re: /\.macOS\(\.v(\d+)\)/g },
  { page: "installation", key: "ios", re: /iOS (\d+) \/ macOS \d+/g },
  { page: "installation", key: "macos", re: /iOS \d+ \/ macOS (\d+)/g },
  { page: "flutter", key: "dartSdk", re: /sdk: "([^"]+)"/g },
  { page: "flutter", key: "flutter", re: /flutter: "([^"]+)"/g },
  { page: "angular", key: "angularCore", re: /`@angular\/core` and\s+`@angular\/forms`, `([^`]+)`/g },
  { page: "angular", key: "angularForms", re: /`@angular\/forms`, `([^`]+)`/g },
];

const PAGES = ["compose", "swiftui", "flutter", "angular", "installation"] as const;
const pageText = (p: string) => read(`apps/web/src/app/docs/${p}/page.mdx`);

/** Everything a set of pages states that its build files contradict, plus any claim pattern that found nothing. */
function versionDrift(pages: Record<string, string>, build: Build): string[] {
  const out: string[] = [];
  for (const { page, key, re } of CLAIMS) {
    const found = [...(pages[page] ?? "").matchAll(re)].map((m) => m[1]!);
    if (found.length === 0) out.push(`${page}: no statement of ${key} matched ${re}`);
    for (const v of found) if (v !== build[key]) out.push(`${page}: says ${key} ${v}, build declares ${build[key]}`);
  }
  return out;
}

describe("setup pages state the versions the packages build with", () => {
  const build = buildValues();
  const pages = Object.fromEntries(PAGES.map((p) => [p, pageText(p)]));

  it("has no drift on main", () => {
    expect(versionDrift(pages, build)).toEqual([]);
  });

  /* Negative controls: the drift that actually shipped, and the same drift on every other platform. */
  it("catches the Compose plugin and Gradle values that shipped before BD-W4", () => {
    const stale = { ...pages, compose: pages.compose!.replaceAll(build.composePlugin!, "2.4.20").replace(`uses ${build.gradle})`, "uses 9.8.0)") };
    const drift = versionDrift(stale, build).join("\n");
    expect(drift).toMatch(/says composePlugin 2\.4\.20/);
    expect(drift).toMatch(/says gradle 9\.8\.0/);
  });

  it("catches a dependency bump that the page does not follow", () => {
    expect(versionDrift(pages, { ...build, composeBom: "2099.01.00" }).join()).toMatch(/composeBom/);
    expect(versionDrift(pages, { ...build, ios: "17" }).join()).toMatch(/swiftui: says ios 16/);
    expect(versionDrift(pages, { ...build, flutter: ">=3.30.0" }).join()).toMatch(/flutter: says flutter/);
    expect(versionDrift(pages, { ...build, angularCore: "^22.0.0" }).join()).toMatch(/angularCore/);
  });

  it("catches a page that stops stating a version at all", () => {
    expect(versionDrift({ ...pages, swiftui: "" }, build).join()).toMatch(/swiftui: no statement of swiftTools/);
  });
});
