// @vitest-environment node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadReleaseData, renderReleaseNotes } from "../../../../scripts/release-notes.mjs";
import { buildChangelogUrl } from "./changelog-filter";

const script = fileURLToPath(new URL("../../../../scripts/release-notes.mjs", import.meta.url));
const run = (...args: string[]) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });

// A small, fixed dataset so the rendering rules are tested independently of the real release history.
const fixture = {
  RELEASES: [
    {
      version: "1.0.0",
      date: "2027-01-05",
      summary: "The `Button` sizes were renamed.",
      breaking: ["`Button` `size=\"medium\"` was removed."],
      migration: "Replace `size=\"medium\"` with `size=\"md\"`.",
      limitations: ["Native ports keep the old sizes.", "No codemod yet."],
      newComponents: [{ group: "Actions", slugs: ["button"] }],
      changes: [
        { kind: "new", area: "components", title: "Size md", body: "The short form.", href: "/docs/components/button" },
        { kind: "breaking", area: "components", title: "medium removed" },
        { kind: "accessibility", area: "tokens", title: "Focus ring" },
        { title: "Unclassified line", body: "Old entries have no kind." },
      ],
    },
    { version: "0.9.0", date: "2026-12-01", summary: "Quiet patch.", breaking: [], changes: [{ kind: "fixed", area: "cli", title: "doctor" }] },
    { version: "0.1.0", date: "2026-01-01", summary: "First.", changes: [{ title: "Everything" }] },
  ],
  releaseTypeAt: (i: number) => (["Major", "Minor", "Initial"] as const)[i],
  packagesChanged: (v: string) => (v === "1.0.0" ? { ui: true, tokens: false, cli: true } : undefined),
};

describe("renderReleaseNotes", () => {
  const notes: string = renderReleaseNotes(fixture, "1.0.0");

  it("has the version, type, date and summary", () => {
    expect(notes).toContain("## KinetixUI 1.0.0");
    expect(notes).toContain("**Major release · 2027-01-05**");
    expect(notes).toContain("The `Button` sizes were renamed.");
  });

  it("lists which packages changed, from the generated metadata", () => {
    expect(notes).toContain("- `@kinetixui/ui@1.0.0` — changed");
    expect(notes).toContain("- `@kinetixui/tokens@1.0.0` — version bump only");
    expect(notes).toContain("- `@kinetixui/cli@1.0.0` — changed");
  });

  it("groups changes by kind, most important first, with docs links made absolute", () => {
    const order = ["#### Breaking", "#### Accessibility", "#### New"].map((h) => notes.indexOf(h));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(notes).toContain("- **Size md** — The short form. ([docs](https://kinetixui.com/docs/components/button))");
    expect(notes).toContain("- **Unclassified line** — Old entries have no kind.");
  });

  it("renders the breaking-change list", () => {
    expect(notes).toMatch(/### Breaking changes\n\n- `Button` `size="medium"` was removed\.\n/);
  });

  it("renders migration instructions", () => {
    expect(notes).toMatch(/### Migration\n\nReplace `size="medium"` with `size="md"`\.\n/);
  });

  it("renders known limitations", () => {
    expect(notes).toMatch(/### Known limitations\n\n- Native ports keep the old sizes\.\n- No codemod yet\.\n/);
  });

  it("renders new components with their docs link and platforms", () => {
    expect(notes).toMatch(/### New components\n\n- \*\*Actions\*\* — \[Button\]\(https:\/\/kinetixui\.com\/docs\/components\/button\) \(React, SwiftUI, Compose, Flutter\)/);
  });

  it("ends with links to the changelog, npm and the tag", () => {
    expect(notes).toContain("https://kinetixui.com/docs/changelog#1.0.0");
    expect(notes).toContain("https://www.npmjs.com/package/@kinetixui/ui/v/1.0.0");
    expect(notes).toContain("https://github.com/zedalleys/kinetixui/tree/@kinetixui/ui@1.0.0");
  });

  it("says 'None.' when breaking is an explicit empty list", () => {
    expect(renderReleaseNotes(fixture, "0.9.0")).toMatch(/### Breaking changes\n\nNone\.\n/);
  });

  it("does not claim 'None' for an entry that predates breaking-change tracking", () => {
    const old: string = renderReleaseNotes(fixture, "0.1.0");
    expect(old).toContain("Not audited for this release");
    expect(old).not.toMatch(/### Breaking changes\n\nNone\./);
  });

  it("omits sections a release does not have", () => {
    const quiet: string = renderReleaseNotes(fixture, "0.9.0");
    expect(quiet).not.toContain("### Migration");
    expect(quiet).not.toContain("### Known limitations");
    expect(quiet).not.toContain("### New components");
    expect(quiet).not.toContain("### Packages"); // no generated metadata for it
  });

  it("throws a clear error for an unknown version, naming the ones that exist", () => {
    expect(() => renderReleaseNotes(fixture, "9.9.9")).toThrow(/unknown version "9\.9\.9"\. Known versions: 1\.0\.0, 0\.9\.0, 0\.1\.0/);
  });
});

describe("pnpm release:notes (the real script and real data)", () => {
  const data = loadReleaseData();
  const latest: string = data.RELEASES[0].version;

  it("prints notes for a known version and exits 0", () => {
    const r = run(latest);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(`## KinetixUI ${latest}`);
    expect(r.stdout).toContain("### Breaking changes");
    expect(r.stdout).toContain(`https://kinetixui.com/docs/changelog#${latest}`);
  });

  it("accepts a leading v", () => {
    expect(run(`v${latest}`).status).toBe(0);
  });

  it("exits non-zero with a clear message for an unknown version", () => {
    const r = run("9.9.9");
    expect(r.status).toBe(1);
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain('unknown version "9.9.9"');
  });

  it("exits 2 with usage when no version is given", () => {
    const r = run();
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("usage: pnpm release:notes <version>");
  });

  it("renders every curated release without throwing", () => {
    for (const release of data.RELEASES) {
      const notes: string = renderReleaseNotes(data, release.version);
      expect(notes).toContain(`## KinetixUI ${release.version}`);
      expect(notes).toContain(release.summary);
    }
  });

  it("reads the same package metadata the site uses", () => {
    const changed = data.packagesChanged(latest);
    const notes: string = renderReleaseNotes(data, latest);
    expect(notes).toContain(`- \`@kinetixui/ui@${latest}\` — ${changed.ui ? "changed" : "version bump only"}`);
  });
});

describe("buildChangelogUrl parameter order", () => {
  it("is canonical: filter, then q, then anything else", () => {
    expect(buildChangelogUrl({ pathname: "/docs/changelog", search: "?utm=1&q=x", hash: "" }, { filter: "cli", q: "x" })).toBe(
      "/docs/changelog?filter=cli&q=x&utm=1",
    );
  });
});
