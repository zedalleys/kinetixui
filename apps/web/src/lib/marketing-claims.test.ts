// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../../../../components.manifest.json";
import parity from "../../../../platform-parity.json";
import { platformSentence, stablePlatformSentence } from "./platform-prose";
import { siteConfig } from "./site";

/**
 * Marketing copy is the surface that drifts fastest and is checked least. These tests guard the specific
 * claims that were wrong on this repository, not prose style in general — over-testing wording makes copy
 * changes annoying, which is how the guard ends up deleted.
 *
 * Every claim here has a source: the manifest, the generated parity data, or the packages themselves.
 */
const root = "../..";
const read = (p: string) => readFileSync(`${root}/${p}`, "utf8");
const homepage = readFileSync("src/app/page.tsx", "utf8");
const readme = read("README.md");
const defs = manifest.platformDefinitions as Record<string, { maturity: string; label: string }>;

/** Every surface whose prose names platforms or makes a coverage claim. */
const COPY = {
  "homepage": homepage,
  "README.md": readme,
  "docs landing": readFileSync("src/app/docs/page.mdx", "utf8"),
};

describe("platform lists are derived, not typed", () => {
  it("names every platform the manifest has, including preview ones", () => {
    for (const p of Object.keys(defs)) expect(platformSentence).toContain(defs[p]!.label);
  });

  it("marks a non-stable platform as such rather than listing it flatly", () => {
    for (const [name, d] of Object.entries(defs)) {
      if (d.maturity === "stable") continue;
      // e.g. "with Angular in preview" — the maturity word must travel with the name
      expect(platformSentence).toMatch(new RegExp(`${d.label}[^.]*${d.maturity}`));
      expect(stablePlatformSentence).not.toContain(d.label);
    }
  });

  it("uses the derived sentence in the site description, which is the OpenGraph and search snippet", () => {
    expect(siteConfig.description).toContain(platformSentence);
  });

  it("no longer hard-codes the old four-platform list in the copy that drifted", () => {
    // This exact string outlived Angular by several releases in six places.
    for (const [where, text] of Object.entries(COPY)) {
      const stale = /React, SwiftUI, Jetpack Compose,? and Flutter(?![^.]*(preview|Angular))/.exec(text);
      expect(stale?.[0], `${where} still hard-codes a platform list that omits a real platform`).toBeUndefined();
    }
  });
});

describe("no overstated coverage", () => {
  it("does not claim the same components on all platforms, because the manifest says otherwise", () => {
    const full = Object.values(parity.components).filter((ps) => parity.catalogPlatforms.every((p) => (ps as string[]).includes(p))).length;
    const total = Object.keys(parity.components).length;
    expect(full).toBeLessThan(total); // the premise of this test: coverage is genuinely partial
    for (const [where, text] of Object.entries(COPY)) {
      expect(text, `${where} claims blanket parity`).not.toMatch(/same components[^.]*all (four|five)? ?platforms/i);
      expect(text, `${where} claims blanket parity`).not.toMatch(/on all (four|five) platforms/i);
    }
  });

  it("does not describe component code as generated from one source", () => {
    for (const [where, text] of Object.entries(COPY)) {
      expect(text, `${where} implies components are generated`).not.toMatch(/single (design )?source into[^.]*components/i);
      expect(text, `${where} implies transpilation`).not.toMatch(/write once|run everywhere|transpil/i);
    }
  });
});

describe("only real distribution is advertised", () => {
  const published = ["@kinetixui/ui", "@kinetixui/cli", "@kinetixui/tokens"];
  const unpublished = ["@kinetixui/angular"];

  it("shows install commands only for packages that are actually on npm", () => {
    for (const [where, text] of Object.entries(COPY)) {
      for (const pkg of unpublished) {
        // built by concatenation, not a template literal: a backslash escape does not survive one.
        // `/` and `@` need no escaping in a constructed RegExp, and install commands use a literal space.
        const cmd = new RegExp("(npm i(nstall)?|pnpm add|yarn add|bun add) +" + pkg);
        expect(text, `${where} shows an install command for the unpublished ${pkg}`).not.toMatch(cmd);
      }
    }
    // …and the published ones are real, so the CLI copy on the homepage is safe to keep
    expect(published.length).toBeGreaterThan(0);
  });
});
