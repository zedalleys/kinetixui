// @vitest-environment node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../../../../components.manifest.json";
import parity from "../../../../platform-parity.json";
import {
  SOURCE_ONLY_PLATFORMS,
  availabilityClause,
  platformSentence,
  stablePlatformSentence,
} from "./platform-prose";
import { PLATFORMS } from "./platform-parity";
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

/* ------------------------------------------------------------------ wearables */

/**
 * Wearables are approved in principle and **nothing is built** — `WEARABLES.md` opens by saying so.
 *
 * The specific way this goes wrong is not someone writing "wearables are supported". It is the word
 * appearing in a list beside five platforms that *are* implemented, where a reader counts six. The IoT
 * docs page has a legitimate reason to say "wearables" — a fitness band is a device its models describe —
 * so a blanket ban would delete a correct technical point. These rules ban the two things that would
 * actually be false instead: a wearable in a derived platform list, and a wearable described as shipping.
 *
 * The internal architecture documents (`WEARABLES.md`, `CORE-AUDIT.md`) are deliberately out of scope.
 * Their job is to record the decision and the plan, factually, and they already say nothing is built.
 */
describe("wearables are never counted as a platform", () => {
  const WEARABLE = /wearables?|watchOS|Wear OS|smartwatch/i;

  /** Everything a prospective user reads, plus the module that feeds the platform pages. */
  const PUBLIC_SURFACES = {
    ...COPY,
    "platform-support.ts": readFileSync("src/lib/platform-support.ts", "utf8"),
    "docs/iot": readFileSync("src/app/docs/iot/page.mdx", "utf8"),
    "docs/platforms": readFileSync("src/app/docs/platforms/page.mdx", "utf8"),
    "site.ts": readFileSync("src/lib/site.ts", "utf8"),
  };

  it("has no wearable platform in the manifest, so no derived list can contain one", () => {
    for (const [name, d] of Object.entries(defs)) {
      expect(WEARABLE.test(name), `${name} is a platform definition and reads as a wearable`).toBe(false);
      expect(WEARABLE.test(d.label), `${d.label} is a platform label and reads as a wearable`).toBe(false);
    }
    // And the sentences built from those definitions, checked directly rather than trusted.
    expect(WEARABLE.test(platformSentence)).toBe(false);
    expect(WEARABLE.test(stablePlatformSentence)).toBe(false);
    expect(WEARABLE.test(availabilityClause)).toBe(false);
  });

  it("never describes a wearable as supported, available, shipping or coming soon", () => {
    // Deliberately includes "coming soon": an unbuilt platform with an implied date is the same promise as
    // a claim, and there is no approved roadmap statement for wearables.
    //
    // The lookbehinds matter more than the word list. Without them this fired on `notSupported` — the
    // correctly named array that lists the platforms with no implementation — and on the phrase "No
    // implementation yet" inside it. A guard that cannot tell a claim from its denial fails on exactly the
    // text that is doing the right thing, and gets deleted for being annoying.
    const NEG = "(?<![A-Za-z])(?<!not)(?<!No )(?<!no )(?<!never )";
    const CLAIM = "(supported|available|implemented|ships|shipping|coming soon|on the roadmap|in progress)";
    const WEAR = "(wearables?|watchOS|Wear OS|smartwatch)";
    const claimed = new RegExp(`${WEAR}[^.]{0,80}${NEG}${CLAIM}`, "i");
    const reversed = new RegExp(`${NEG}${CLAIM}[^.]{0,80}${WEAR}`, "i");
    for (const [where, text] of Object.entries(PUBLIC_SURFACES)) {
      expect(claimed.exec(text)?.[0], `${where} presents a wearable as real`).toBeUndefined();
      expect(reversed.exec(text)?.[0], `${where} presents a wearable as real`).toBeUndefined();
    }
  });

  it("pairs every wearable mention with a statement that nothing is built", () => {
    const disclaimed = /no implementation yet|not implemented|nothing is built|no wearable component library/i;
    for (const [where, text] of Object.entries(PUBLIC_SURFACES)) {
      if (!WEARABLE.test(text)) continue;
      expect(
        disclaimed.test(text),
        `${where} mentions a wearable without saying anywhere that none is implemented`,
      ).toBe(true);
    }
  });

  /** The premise. If a wearable is ever built, this fails and these rules get revisited deliberately. */
  it("still describes wearables as unbuilt in the design spec", () => {
    expect(read("WEARABLES.md")).toMatch(/nothing built|nothing is built/i);
  });
});

/* ------------------------------------------------------------------ maturity claims */

/**
 * "Production ready" is the claim this project is most exposed to and has never made.
 *
 * A search of the whole repository found no assertion of it about KinetixUI: the only matches were a code
 * comment calling `@dnd-kit` battle-tested — a statement about a dependency, and a true one — and a campaign
 * draft that lists the phrase among the things not to write. Nothing needed retracting.
 *
 * The exposure is that it would be *easy* to write and hard to notice, because so much of the evidence looks
 * like it supports it: 2,600-plus tests, roughly 35 CI gates, an empty axe baseline, provenance on every
 * package. None of those is the claim. The claim is about a product being finished, and the project says
 * otherwise in its own voice — every published package is `0.x`, the IoT module is Experimental, Angular is
 * Preview, and the homepage eyebrow reads "Free while in beta". Saying both is the contradiction a reader
 * catches first.
 *
 * So the rule is tied to the evidence rather than to taste, and the premise is asserted: the day a package
 * reaches 1.0.0 this fails, and the claim gets reconsidered deliberately instead of drifting in.
 */
describe("maturity is not overstated", () => {
  const published = Object.values(defs).filter((d) => d.distribution.published);

  /** Read from the release allowlist, so a new package is covered without being listed here. */
  const publishedVersions = (() => {
    const allowlist = JSON.parse(readFileSync(`${root}/release/publish-packages.json`, "utf8")) as {
      packages: { name: string; directory: string }[];
    };
    return allowlist.packages.map((pkg) => ({
      name: pkg.name,
      version: (JSON.parse(readFileSync(`${root}/${pkg.directory}/package.json`, "utf8")) as { version: string }).version,
    }));
  })();

  it("still has every published package below 1.0.0 — the premise of the rule below", () => {
    expect(publishedVersions.length).toBeGreaterThan(0);
    for (const pkg of publishedVersions) {
      expect(
        pkg.version.startsWith("0."),
        `${pkg.name} is at ${pkg.version}. Once a package reaches 1.0.0, revisit the production-readiness ` +
          `wording deliberately rather than leaving this test asserting a premise that no longer holds.`,
      ).toBe(true);
    }
    expect(published.length).toBeGreaterThan(0);
  });

  it("claims no production readiness in public copy", () => {
    // Bare phrases, not "about KinetixUI" phrases: in top-of-funnel copy there is no useful sentence
    // containing these that is not a claim about the product. The component sources, the campaign draft that
    // bans the phrase, and these audits are all outside COPY on purpose.
    const overstated =
      /production[ -]?ready|ready for production|enterprise[ -]?ready|battle[ -]?tested|production[ -]grade|industrial[ -]strength/i;
    for (const [where, text] of Object.entries(COPY)) {
      expect(overstated.exec(text)?.[0], `${where} claims production readiness, which nothing here supports`).toBeUndefined();
    }
  });

  it("keeps saying it is beta where it says anything about maturity", () => {
    // The homepage eyebrow is the one place the product states its own stage. If that ever stops being true,
    // the rule above is the thing to revisit — so it is asserted rather than assumed.
    expect(homepage, "the homepage should still state the product's stage").toMatch(/beta/i);
  });

  it("does not offer a stability guarantee it has no versioning to back", () => {
    for (const [where, text] of Object.entries(COPY)) {
      expect(text, `${where} promises API stability the 0.x line does not support`).not.toMatch(
        /(stable|unchanging|frozen) API|no breaking changes|semver guarantee/i,
      );
    }
  });
});

/* ------------------------------------------------------------------ commercial tiers */

/**
 * No public surface teases a paid tier, because none exists.
 *
 * `marketing/CLAIMS.md` F2 prohibits this outright, and the homepage was breaking it: the closer read
 * "Free today; advanced tooling arrives as KinetixUI Pro" and the docs landing said "deeper tooling will
 * arrive as KinetixUI Pro". The hero eyebrow reinforced it with "Free while in beta" — free *while*, which
 * only means anything if something is expected to stop being free.
 *
 * Why it matters more than it looks: the audience being asked to depend on this is deciding whether the
 * project will still be maintained and still be MIT in three years. A teased commercial tier answers "no,
 * not all of it" — for a product that does not exist and may never. It is the one claim here that costs
 * trust while promising nothing.
 *
 * The rule is a phrase search, which is normally the brittle kind. It is justified here because the
 * prohibited thing IS a phrase — a named future product — rather than a number that drifts. The escape
 * hatch is deliberate: if a tier is ever built, this test fails and the decision gets made in the open
 * instead of arriving in copy.
 *
 * Both this file's own explanation and the comment in `page.tsx` paraphrase rather than quote the banned
 * string, for the reason the wearable rule learned the hard way: a guard that fires on the text explaining
 * it is a guard that gets deleted.
 */
describe("no paid tier is teased, because none exists", () => {
  /** A named commercial tier, in the forms someone would actually write. */
  const TIER = /\b(kinetix\s*ui\s+pro|kinetixui\s+pro)\b|\bpro\s+(tier|plan|version|edition)\b|\b(paid|premium|enterprise)\s+(tier|plan)\b/i;

  /** "free while/during/for now" — a hedge that implies an end. Plain "free" and "MIT" are fine. */
  const CONDITIONAL_FREE = /\bfree\s+(while|during|for now|for the moment|until)\b/i;

  it("names no commercial tier on any public surface", () => {
    for (const [where, text] of Object.entries(COPY)) {
      expect(TIER.exec(text)?.[0], `${where} names a commercial tier that does not exist`).toBeUndefined();
    }
  });

  it("never frames the licence as temporarily free", () => {
    for (const [where, text] of Object.entries(COPY)) {
      expect(
        CONDITIONAL_FREE.exec(text)?.[0],
        `${where} implies the licence is only free for now; it is MIT`,
      ).toBeUndefined();
    }
  });

  it("would catch both, so neither assertion above is vacuous", () => {
    expect(TIER.test("deeper tooling will arrive as KinetixUI Pro")).toBe(true);
    expect(TIER.test("upgrade to the Pro plan")).toBe(true);
    expect(CONDITIONAL_FREE.test("KinetixUI is free while in beta")).toBe(true);
    // And does not fire on the honest statements that replaced them.
    expect(TIER.test("MIT licensed, all of it.")).toBe(false);
    expect(CONDITIONAL_FREE.test("MIT licensed, all of it.")).toBe(false);
    expect(TIER.test("Angular is published and in preview")).toBe(false);
  });
});

/**
 * The global metadata tagline, and the surfaces that carry it.
 *
 * This is the one string that reaches people who never open the site: it is the page `<title>`, it is
 * `og:title` and `og:image:alt`, and it is painted into the generated social card at 72px. Phase 2 retired
 * "One token architecture, in motion across every platform." from the hero and the sentence survived here
 * for six phases, so every shared link kept saying the thing the positioning had rejected.
 *
 * The rules below are deliberately scoped to the tagline and its consumers rather than to all copy: the
 * phrase "every platform" is legitimate elsewhere (token OUTPUT really is generated for every platform),
 * and a repository-wide ban would fire on true sentences.
 */
describe("global metadata cannot drift back to retired positioning", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  const ogImage = readFileSync("src/app/opengraph-image.tsx", "utf8");

  /** Positioning this project has explicitly retired. Not style preferences — each one was a claim problem. */
  const RETIRED: ReadonlyArray<readonly [RegExp, string]> = [
    [/one token architecture/i, "leads with the mechanism, and was retired from the hero in Phase 2"],
    [/in motion across/i, "decorative, and pairs with the parity reading"],
    [/across every platform/i, "invites the cross-platform parity reading the positioning rejects"],
    [/on every platform/i, "same parity reading"],
    [/identical (on|across)/i, "the implementations are native per platform, not identical"],
  ];

  it("names no retired positioning", () => {
    for (const [pattern, why] of RETIRED) {
      expect(siteConfig.tagline, `the tagline ${why}`).not.toMatch(pattern);
    }
  });

  /**
   * The count is derived, so this asserts the ONLY number in the tagline is the real platform count. A
   * future edit that types "five" or freezes "5" while a sixth platform lands fails here rather than
   * shipping a wrong number onto every shared link.
   */
  it("carries the derived platform count and no other number", () => {
    expect(siteConfig.tagline.match(/\d+/g) ?? []).toEqual([String(PLATFORMS.length)]);
  });

  /**
   * Derived rather than duplicated: the tagline's prose, minus its count, must be what the hero renders.
   * Change one without the other and this fails — which is exactly the drift that produced this guard.
   */
  it("is the sentence the homepage hero actually renders", () => {
    for (const fragment of siteConfig.tagline.split(/\s*\d+\s*platforms\.\s*/)) {
      const phrase = fragment.trim();
      if (phrase) expect(COPY.homepage, `the hero no longer renders "${phrase}"`).toContain(phrase);
    }
  });

  it("is read from siteConfig by every metadata consumer, never re-typed", () => {
    expect(layout, "the page title should build on siteConfig.tagline").toContain("siteConfig.tagline");
    expect(ogImage, "the card's alt text should build on siteConfig.tagline").toContain("siteConfig.tagline");
  });

  /**
   * The social card under-counted the product for months — "React · SwiftUI · Jetpack Compose · Flutter",
   * omitting Angular — because no guard could see this file. Asserting the SOURCE types no list is the
   * honest form: re-deriving the strip here and checking it contains every label would assert nothing,
   * since both sides would come from the same array.
   */
  it("derives the social card's platform strip instead of typing a list", () => {
    expect(ogImage, "the card should build its strip from the manifest").toContain("PLATFORM_DEFINITIONS");
    // Comments are stripped first: the file documents the old typed list in order to explain why it went,
    // and a phrase rule cannot tell a claim from its explanation. This fired on that very comment once.
    const code = ogImage.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const typedList = /["'`>][^"'`<]*\b(React|Angular|SwiftUI|Flutter)\b[^"'`<]*\u00b7/;
    expect(
      typedList.exec(code)?.[0],
      "the social card types a platform list; derive it, or it will under-count the next platform",
    ).toBeUndefined();
  });

  it("would catch each of these, so none of the assertions above is vacuous", () => {
    const retired = "One token architecture, in motion across every platform.";
    expect(RETIRED.some(([r]) => r.test(retired))).toBe(true);
    expect(RETIRED.some(([r]) => r.test(siteConfig.tagline))).toBe(false);
    expect("One design language. 4 platforms. Claims you can check.".match(/\d+/g)).not.toEqual([
      String(PLATFORMS.length),
    ]);
  });
});

/** Every site page and component, flattened so a phrase wrapped across lines is still one phrase. */
function siteSources(): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string, keep: (name: string) => boolean) => {
    for (const name of readdirSync(dir)) {
      const full = `${dir}/${name}`;
      if (statSync(full).isDirectory()) walk(full, keep);
      else if (keep(name)) out[full] = readFileSync(full, "utf8").replace(/\s+/g, " ");
    }
  };
  walk("src/app", (n) => /\.(mdx|tsx)$/.test(n));
  walk("src/components", (n) => n.endsWith(".tsx") && !n.includes(".test."));
  out["README.md"] = readme.replace(/\s+/g, " ");
  return out;
}
const SITE = siteSources();
const hitsOf = (re: RegExp) =>
  Object.entries(SITE).flatMap(([f, text]) => {
    const m = re.exec(text);
    return m ? [`${f}: …${text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 20)}…`] : [];
  });

/**
 * CLAIMS.md B2: the catalogue is "98 catalogue entries — 97 components and one documented recipe", and "98
 * components" is a forbidden interpretation. The number is never typed — it renders from `componentTotal` (or the
 * gallery's own item count, or `<ComponentTotalInline />`) — so the guard reads the expression the number comes from
 * and the noun printed after it. The recipe count is read from the manifest, so the day the catalogue has no recipe
 * the total really is a component count and this rule switches itself off.
 */
describe("the catalogue total is not called a component count", () => {
  const recipeCount = Object.values(manifest.components as Record<string, { platformNote?: string }>).filter((c) =>
    /not a component/i.test(c.platformNote ?? ""),
  ).length;
  const total = Object.keys(manifest.components).length;
  const TOTAL_THEN_COMPONENTS = [
    // `{componentTotal} components`, `${ITEMS.length} components`, `{componentDocs.length} React components`
    /\{(?:componentTotal|ITEMS\.length|componentDocs\.length|ALL_SLUGS\.length)\}\s+(?:React\s+|KinetixUI\s+)?components\b/,
    // "{full}/{componentTotal} components", "{n} of {componentTotal} components"
    /(?:\/|\bof\s+)\$?\{componentTotal\}\s+components\b/,
    // `<ComponentTotalInline /> React components`
    /<ComponentTotalInline\s*\/>\s+(?:React\s+|KinetixUI\s+)?components\b/,
    // `{ n: componentTotal, label: "React components" }`
    /n:\s*componentTotal,\s*label:\s*"[^"]*\bcomponents"/,
  ];

  it("has a documented recipe in the manifest, so the total is not a component count", () => {
    expect(recipeCount).toBeGreaterThan(0);
  });

  it.each(TOTAL_THEN_COMPONENTS.map((re) => [re.source, re] as const))("finds no %s", (_name, re) => {
    if (recipeCount === 0) return;
    expect(hitsOf(re)).toEqual([]);
  });

  it(`never types the total followed by "components"`, () => {
    if (recipeCount === 0) return;
    expect(hitsOf(new RegExp(`\\b${total}\\s+(?:React\\s+)?components\\b`))).toEqual([]);
  });

  it("says what the total is where the gallery introduces it", () => {
    const gallery = SITE["src/components/component-gallery.tsx"]!;
    expect(gallery).toMatch(/\{componentTotal\} catalogue entries — \{componentCount\} components and \{recipes\.length\} documented/);
  });

  it("would catch the wording that shipped, so none of the rules above is vacuous", () => {
    const shipped = [
      "{ITEMS.length} components across {CATEGORY_ORDER.length} categories",
      "{fullCoverageCount}/{componentTotal} components on all {catalogPlatformCount} platforms",
      "<ComponentTotalInline /> React components, on the same token contract",
      '{ n: componentTotal, label: "React components", sub: `x` }',
    ];
    for (const s of shipped) expect(TOTAL_THEN_COMPONENTS.some((re) => re.test(s)), s).toBe(true);
  });
});

/**
 * Components copied by the CLI arrive with the npm packages they import (Radix, cva, recharts…), so "no runtime
 * dependency" on its own is false. The accurate claim, which the homepage already made lower down, is "no runtime
 * dependency you cannot patch". `@kinetixui/iot` is the one place an unqualified "no runtime dependencies" is a fact
 * about a package, and it stays allowed only while that package's manifest really declares none.
 */
describe("dependency claims are qualified", () => {
  const unqualified = /\bno runtime dependenc(?:y|ies)\b(?!\s+you\s+cannot\s+patch)|\bnothing here is a runtime dependency\b/i;
  const iot = JSON.parse(read("packages/iot/package.json")) as { dependencies?: Record<string, string> };

  it("never says components carry no runtime dependency without saying which kind", () => {
    const hits = hitsOf(unqualified).filter((h) => !h.startsWith("src/app/docs/iot/page.mdx"));
    expect(hits).toEqual([]);
  });

  it("allows the IoT page's unqualified claim only because the IoT package declares no dependencies", () => {
    expect(Object.keys(iot.dependencies ?? {})).toEqual([]);
  });

  it("would catch the wording that shipped, so the rule above is not vacuous", () => {
    expect("Components install through the kinetixui CLI and land in your repo. No runtime dependency, no lock-in").toMatch(unqualified);
    expect("so it adds no runtime dependency and no version lock").toMatch(unqualified);
    expect("so what lands is yours to edit — no runtime dependency you cannot patch.").not.toMatch(unqualified);
  });
});
