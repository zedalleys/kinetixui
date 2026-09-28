// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../../../../components.manifest.json";
import parity from "../../../../platform-parity.json";
import {
  SOURCE_ONLY_PLATFORMS,
  availabilityClause,
  platformSentence,
  stablePlatformSentence,
} from "./platform-prose";
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
const defs = manifest.platformDefinitions as Record<
  string,
  { maturity: string; label: string; distribution: { channel: string; coordinate: string; published: boolean } }
>;

/**
 * Every surface whose prose names platforms or makes a coverage claim.
 *
 * Published copy only. The `marketing/*.md` guidance documents were tried here and removed: they
 * *quote* the anti-patterns in order to ban them — `positioning.md` tabulates "Same components on
 * all platforms" so it can be rebutted, and this repository's own marketing README describes the
 * guard as catching "a blanket parity claim, a transpilation implication". Phrase rules cannot tell
 * a claim from its refutation, so pointing them at documents whose job is to list bad claims
 * produces failures on the correct text.
 *
 * Those documents are covered instead by `current-truth.test.ts`, whose rules are narrow enough to
 * survive being quoted at: they compare against a derived set rather than searching for a phrase.
 */
const COPY = {
  "homepage": homepage,
  "README.md": readme,
  "docs landing": readFileSync("src/app/docs/page.mdx", "utf8"),
  // Added in Phase 0.5: its `description` is a search snippet that said components "ship on" four
  // platforms, which a reader hears as four they can install. A snippet is top-of-funnel copy, so it
  // belongs under the same rules as the homepage.
  "components page": readFileSync("src/app/components/page.tsx", "utf8"),
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

  /**
   * The description used to be asserted to contain `platformSentence` verbatim. It now carries
   * `availabilityClause` instead, because a search snippet is a surface someone acts on and
   * `platformSentence` is derived from maturity alone — it names three platforms nobody can install.
   *
   * The rule the old assertion was protecting is unchanged and still enforced: the description must name
   * every platform the manifest has, and must not be hand-typed. Both halves are checked directly rather
   * than through one string, so the description can be reworded without weakening the guard.
   */
  it("names every platform in the site description, which is the OpenGraph and search snippet", () => {
    for (const p of Object.keys(defs)) {
      expect(siteConfig.description, `the site description omits ${defs[p]!.label}`).toContain(defs[p]!.label);
    }
  });

  it("carries the derived availability clause in the site description rather than a typed list", () => {
    expect(siteConfig.description).toContain(availabilityClause);
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
  /**
   * The published set is read from the manifest rather than listed here, so this guard follows the
   * truth instead of having to be remembered. `@kinetixui/angular` moved into it when it was
   * published; the rule did not change, only which side each package is on.
   */
  const escape = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const distribution = Object.values(defs).map((d) => d.distribution);
  const npmPackages = distribution.filter((d) => d.channel === "npm");
  const unpublished = npmPackages.filter((d) => !d.published).map((d) => d.coordinate);

  it("shows install commands only for packages that are actually on npm", () => {
    for (const [where, text] of Object.entries(COPY)) {
      for (const pkg of unpublished) {
        // built by concatenation, not a template literal: a backslash escape does not survive one.
        // `/` and `@` need no escaping in a constructed RegExp, and install commands use a literal space.
        const cmd = new RegExp("(npm i(nstall)?|pnpm add|yarn add|bun add) +" + pkg);
        expect(text, `${where} shows an install command for the unpublished ${pkg}`).not.toMatch(cmd);
      }
    }
    expect(npmPackages.some((d) => d.published), "at least one npm package should be published").toBe(true);
  });

  /**
   * The npm rule above only ever looked at npm-channel packages, and every npm package is published —
   * so `unpublished` was empty and the guard was passing vacuously while three platforms on other
   * channels were undistributed. This is the half that was missing.
   *
   * Each channel gets the syntax a developer would actually paste, built from the coordinate in the
   * manifest rather than listed here, so a platform that later publishes drops out of the guard by
   * changing one boolean.
   */
  const NON_NPM_INSTALL_SYNTAX: Record<string, (coordinate: string) => RegExp[]> = {
    "Maven Central": (c) => [new RegExp("(implementation|api)\\s*[(\'\"]" + escape(c)), new RegExp(escape(c) + ":\\d")],
    "pub.dev": (c) => [new RegExp("(flutter )?pub add " + escape(c)), new RegExp("^\\s*" + escape(c) + ":\\s*[\\^\\d]", "m")],
    "Swift Package Manager": () => [/\.package\(\s*url:/],
  };

  it("shows no dependency snippet for a platform that is not distributed on its own channel", () => {
    expect(SOURCE_ONLY_PLATFORMS.length, "this guard needs at least one undistributed platform to mean anything").toBeGreaterThan(0);
    for (const platform of SOURCE_ONLY_PLATFORMS) {
      const d = defs[platform]!;
      const patterns = NON_NPM_INSTALL_SYNTAX[d.distribution.channel]?.(d.distribution.coordinate) ?? [];
      for (const [where, text] of Object.entries(COPY)) {
        for (const pattern of patterns) {
          expect(
            text,
            `${where} shows a ${d.distribution.channel} dependency for ${d.label}, which is not distributed`,
          ).not.toMatch(pattern);
        }
      }
    }
  });

  /**
   * The positive half. Banning install commands stops the worst version; it does not stop a page naming
   * five platforms in one breath and letting the reader assume all five are installable, which is what
   * the homepage did. So any surface that names an undistributed platform has to say somewhere that it
   * is not distributed.
   */
  it("qualifies every undistributed platform it names", () => {
    const qualifier =
      /not (yet )?(distributed|published|on (npm|Maven Central|pub\.dev|a package registry))|(build|compile) (it )?from source|source you compile|source to copy/i;
    for (const [where, text] of Object.entries(COPY)) {
      const named = SOURCE_ONLY_PLATFORMS.filter((p) => text.includes(defs[p]!.label));
      if (named.length === 0) continue;
      expect(
        qualifier.test(text),
        `${where} names ${named.map((p) => defs[p]!.label).join(", ")} without saying anywhere that they are not distributed`,
      ).toBe(true);
    }
  });

  /**
   * Publication is distribution, not maturity. A package can be installable and still have an API
   * that moves — saying otherwise is the specific claim this repository has to avoid making about
   * a Preview platform.
   */
  it("does not let being on npm imply a platform is stable or complete", () => {
    for (const [name, d] of Object.entries(defs)) {
      if (d.maturity === "stable" || d.distribution.channel !== "npm" || !d.distribution.published) continue;
      for (const [where, text] of Object.entries(COPY)) {
        const claim = new RegExp(`${d.label}[^.]{0,60}(stable|production[- ]ready|full parity)`, "i");
        expect(text, `${where} implies ${d.label} is stable because it is published`).not.toMatch(claim);
      }
    }
  });
});
