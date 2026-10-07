import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CORE_RELEASE_GROUP, LINE_DETAILS, packageLines, packageLinesRoot, parseChangelogReleases } from "./package-lines";

/**
 * Phase 3D: an independently versioned package cannot silently drop out of `/docs/changelog` again.
 *
 * Reproduced before the change: the page listed the core train and linked three changelogs (ui, tokens, cli);
 * `@kinetixui/iot` 0.4.0 and 0.5.0 were on npm and named nowhere on it, and `@kinetixui/angular` only as prose.
 */

const root = packageLinesRoot();
const allowlist = JSON.parse(readFileSync(join(root, "release/publish-packages.json"), "utf8")) as {
  packages: { name: string; releaseGroup: string; directory: string }[];
};
const independent = allowlist.packages.filter((p) => p.releaseGroup !== CORE_RELEASE_GROUP);

describe("/docs/changelog: packages on their own version line", () => {
  it("lists every non-core publishable package, by its own name", () => {
    // The truth is the release allowlist, not a list kept here: a new group added there must appear on the page.
    expect(independent.map((p) => p.name)).toContain("@kinetixui/iot");
    expect(packageLines().map((line) => line.name)).toEqual(independent.map((p) => p.name));
    for (const p of independent) expect(LINE_DETAILS[p.releaseGroup], p.releaseGroup).toBeDefined();
  });

  it("refuses a release group with no entry, rather than leaving it off the page", () => {
    // A repository whose allowlist gained a group nobody described: building the page must fail, not skip it.
    const dir = mkdtempSync(join(tmpdir(), "package-lines-"));
    mkdirSync(join(dir, "release"));
    const extra = { name: "@kinetixui/new", releaseGroup: "new", directory: "packages/new" };
    writeFileSync(join(dir, "release/publish-packages.json"), JSON.stringify({ packages: [extra] }));
    expect(() => packageLines(dir)).toThrow(/release group "new"/);
  });

  it("takes each version from the package and each release from its own changelog", () => {
    for (const line of packageLines()) {
      const p = independent.find((x) => x.name === line.name)!;
      const manifest = JSON.parse(readFileSync(join(root, p.directory, "package.json"), "utf8")) as { version: string };
      expect(line.version, line.name).toBe(manifest.version);
      // The changelog's newest section is the version the package is at: a Version PR writes both together.
      expect(line.releases[0]?.version, line.name).toBe(manifest.version);
      expect(line.changelog).toBe(`https://github.com/zedalleys/kinetixui/blob/main/${p.directory}/CHANGELOG.md`);
    }
    const iot = packageLines().find((line) => line.group === "iot")!;
    // Never merged into the core history: IoT's 0.2.0 is not core's 0.2.0, and the page keeps the names apart.
    expect(iot.releases.map((r) => r.version)).toEqual(expect.arrayContaining(["0.5.0", "0.4.0", "0.3.0", "0.2.0", "0.1.0"]));
    expect(iot.docs).toBe("/docs/iot");
  });

  it("the changelog page renders the lines", () => {
    const page = readFileSync(join(root, "apps/web/src/app/docs/changelog/page.tsx"), "utf8");
    expect(page).toMatch(/const lines = packageLines\(\)/);
    expect(page).toMatch(/<PackageLines lines=\{lines\} \/>/);
  });

  it("reads a Changesets changelog's sections and their kind", () => {
    const md = "# @x/y\n\n## 1.2.0\n\n### Minor Changes\n\n- a\n\n### Patch Changes\n\n- b\n\n## 1.1.1\n\n### Patch Changes\n\n- c\n\n## 1.0.0\n\n- d\n";
    expect(parseChangelogReleases(md, "https://e/CHANGELOG.md")).toEqual([
      { version: "1.2.0", type: "Minor", href: "https://e/CHANGELOG.md#120" },
      { version: "1.1.1", type: "Patch", href: "https://e/CHANGELOG.md#111" },
      { version: "1.0.0", type: "Unclassified", href: "https://e/CHANGELOG.md#100" },
    ]);
  });
});
