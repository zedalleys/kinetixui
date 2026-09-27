// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  composeExporter,
  cssExporter,
  flutterExporter,
  swiftuiExporter,
} from "@kinetixui/create-theme";
import manifest from "../../../../components.manifest.json";
import verification from "../../../../verification.json";

/**
 * Statements about *today* have to match the repository as it is today.
 *
 * The failure this exists for: 0.23.1 corrected three shipped CLI strings that claimed native theme
 * output did not exist yet, and `/docs/cli` kept the identical obsolete claim — on the same page that
 * documented `preset swiftui`, `preset compose` and `preset flutter` in full. Fixing the runtime and
 * leaving the documentation is the normal shape of this bug, so the guard has to sit on the prose.
 *
 * ## Who owns which truth
 *
 * Nothing here is a second truth database. Every expectation is derived:
 *
 * | truth                    | canonical source                                              |
 * | ------------------------ | ------------------------------------------------------------- |
 * | component coverage       | `components.manifest.json` → `components[].platforms`          |
 * | platform maturity        | `components.manifest.json` → `platformDefinitions[].maturity`  |
 * | package publication      | `components.manifest.json` → `…distribution.published`         |
 * | package version          | each `package.json`                                            |
 * | verification evidence    | `verification.json` → `totals[platform]`                       |
 * | Create export targets    | each exporter's own `target` in `@kinetixui/create-theme`      |
 * | CLI command availability | `preset .command("…")` registrations in `packages/cli/src`     |
 *
 * `marketing-claims.test.ts` owns the same rules for the homepage, the README and the docs landing
 * page; this file extends the idea to the surfaces that were missed — the CLI reference and the
 * always-current marketing guidance.
 *
 * ## Current versus historical
 *
 * Only surfaces that speak in the present tense are checked. A release entry saying Angular was not
 * yet on npm was true when that release shipped, and rewriting it to match today would be the
 * dishonest fix — so `releases.ts`, every `CHANGELOG.md`, and the dated evidence tables inside the
 * campaign drafts are deliberately absent from the lists below. That exclusion is asserted, not just
 * described, at the end of this file.
 */

const root = "../..";
const read = (p: string) => readFileSync(`${root}/${p}`, "utf8");

/** Surfaces that describe the project as it is now. A claim here is a claim about today. */
const CURRENT_SURFACES = {
  "docs/cli": readFileSync("src/app/docs/cli/page.mdx", "utf8"),
  "docs/angular": readFileSync("src/app/docs/angular/page.mdx", "utf8"),
  "docs/platforms": readFileSync("src/app/docs/platforms/page.mdx", "utf8"),
  "docs/rtl": readFileSync("src/app/docs/rtl/page.mdx", "utf8"),
  "docs/theming": readFileSync("src/app/docs/theming/page.mdx", "utf8"),
  "marketing/README.md": read("marketing/README.md"),
  "marketing/positioning.md": read("marketing/positioning.md"),
  "marketing/messaging.md": read("marketing/messaging.md"),
  "marketing/personas.md": read("marketing/personas.md"),
  "marketing/seo.md": read("marketing/seo.md"),
  "marketing/launches.md": read("marketing/launches.md"),
  "marketing/content-calendar.md": read("marketing/content-calendar.md"),
};

const defs = manifest.platformDefinitions as Record<
  string,
  { label: string; maturity: string; catalogComplete: boolean; distribution: { channel: string; published: boolean } }
>;
const totals = verification.totals as Record<string, Record<string, number>>;

/* ------------------------------------------------------------------ A. CLI capability claims */

/**
 * The exporters that exist, asked for by name rather than listed here, intersected with the `preset`
 * subcommands the CLI actually registers. If a target were dropped from either side this set shrinks
 * and the assertions below follow it — which is the point of deriving rather than restating.
 */
const NATIVE_TARGETS = [swiftuiExporter, composeExporter, flutterExporter].map((e) => e.target);

const presetSubcommands = (() => {
  const cli = read("packages/cli/src/index.ts");
  const section = cli.slice(cli.indexOf("const preset"));
  return [...section.matchAll(/\.command\("([a-z]+)"\)/g)].map((m) => m[1]!);
})();

describe("the CLI reference matches the commands the CLI registers", () => {
  it("finds the canonical targets rather than assuming them", () => {
    expect(cssExporter.target).toBe("web-css");
    expect(NATIVE_TARGETS).toEqual(["swiftui", "compose", "flutter"]);
    for (const target of NATIVE_TARGETS) expect(presetSubcommands).toContain(target);
  });

  it("documents every native preset command that exists", () => {
    for (const target of NATIVE_TARGETS) {
      expect(CURRENT_SURFACES["docs/cli"], `/docs/cli does not document \`preset ${target}\``).toContain(
        `preset ${target}`,
      );
    }
  });

  /**
   * The exact contradiction that shipped. `theme build` really is CSS-only and must stay documented
   * as such — so the phrases below are the ones that deny the *capability*, not the ones that scope a
   * command. Anything matching them while a native preset command exists is a false claim.
   */
  it("never says native theme output does not exist while it does", () => {
    const denials = [
      /not yet built[^.]{0,60}native/i,
      /native[^.]{0,60}(theme )?output[^.]{0,30}(isn't|is not|not yet)\s*(built|available|implemented)/i,
      /no native[^.]{0,40}(theme )?output/i,
      /native theme compilation is not implemented/i,
    ];
    expect(NATIVE_TARGETS.length, "this guard is meaningless if no native target exists").toBeGreaterThan(0);
    for (const [where, text] of Object.entries(CURRENT_SURFACES)) {
      for (const denial of denials) {
        expect(text, `${where} denies native theme output, but ${NATIVE_TARGETS.join(", ")} exist`).not.toMatch(denial);
      }
    }
  });

  /** The limitations are real and must survive any correction of the claim above. */
  it("keeps the limits that are still true", () => {
    const cli = CURRENT_SURFACES["docs/cli"];
    expect(cli, "`theme build` is still CSS-only and the page must say so").toMatch(/theme build[\s\S]{0,400}CSS/i);
    expect(cli, "there is still no Android XML exporter").toMatch(/no Android XML exporter/i);
    expect(cli, "radius and elevation still do not travel to native").toMatch(/radius and (elevation|surface)/i);
    expect(cli, "Compose still has no field for input/ring").toMatch(/`input` and `ring`/);
  });
});

/* ------------------------------------------------------------------ B. distribution claims */

describe("publication claims match the manifest", () => {
  const published = Object.entries(defs).filter(([, d]) => d.distribution.published);
  const notPublished = Object.entries(defs).filter(([, d]) => !d.distribution.published);

  it("has both sides, so neither assertion below is vacuous", () => {
    expect(published.length).toBeGreaterThan(0);
    expect(notPublished.length).toBeGreaterThan(0);
  });

  /**
   * Scoped to the sentence around the platform's name: a document may legitimately say that the
   * SwiftUI port is not distributed while also naming Angular, and a whole-file search would call
   * that a contradiction.
   */
  /**
   * Claims, one per unit of meaning.
   *
   * A markdown table row is a single claim spread across cells, and it must not be chopped up: the
   * objection table names the platform in its first cell and answers "Not published yet" in its
   * third, with a full stop in between. Splitting on `|` hid the contradiction; so did splitting on
   * sentences, because that inner full stop separated the name from the denial. A row is therefore
   * kept whole and everything else is split into sentences.
   *
   * Both earlier versions passed a mutation test that should have failed. Reading the code did not
   * reveal it; re-running the mutation after each fix did.
   */
  const claimsNaming = (text: string, label: string) => {
    const named = new RegExp(`\\b${label}\\b`, "i");
    const units: string[] = [];
    for (const line of text.split("\n")) {
      if (line.trimStart().startsWith("|")) units.push(line);
      else units.push(...line.split(/(?<=[.!?])/));
    }
    return units.filter((unit) => named.test(unit));
  };

  it.each(published.map(([id, d]) => [id, d.label] as const))(
    "never calls the published %s unpublished",
    (_id, label) => {
      const denials = [/\bnot\s+published\b/i, /\bunpublished\b/i, /not (yet )?on npm/i, /returned 404/i];
      for (const [where, text] of Object.entries(CURRENT_SURFACES)) {
        for (const sentence of claimsNaming(text, label)) {
          for (const denial of denials) {
            expect(
              sentence.replace(/\s+/g, " ").trim(),
              `${where} says ${label} is not published, but the manifest says it is`,
            ).not.toMatch(denial);
          }
        }
      }
    },
  );

  /**
   * Publication-implies-stable is *not* re-guarded here. `marketing-claims.test.ts` already owns it
   * — "does not let being on npm imply a platform is stable or complete" — phrased as a negative,
   * which is why it holds where the positive form does not. A rule demanding the maturity word near
   * the package name fails on `@import "@kinetixui/angular/styles.css"` and on `npm i` inside a
   * fenced block, neither of which is a claim about maturity. It was written, found to fire on
   * correct prose, and deleted rather than loosened until it caught nothing.
   */
});

/* ------------------------------------------------------------------ C. verification claims */

describe("RTL claims stay inside the verification evidence", () => {
  const platforms = Object.keys(totals);
  const withoutRtl = platforms.filter((p) => (totals[p]!.rtl ?? 0) === 0);
  const withRtl = platforms.filter((p) => (totals[p]!.rtl ?? 0) > 0);

  it("reads the evidence rather than restating it", () => {
    expect(platforms.length).toBeGreaterThan(0);
    expect(withRtl.length, "some platform should have RTL evidence").toBeGreaterThan(0);
  });

  /**
   * While any platform has no direction-aware evidence at all, no current surface may claim the
   * testing covers platforms generally. If that ever stops being true this test retires itself
   * rather than failing — the claim would have become accurate.
   */
  it("never claims direction-aware testing on every platform while one has none", () => {
    if (withoutRtl.length === 0) return;
    const overreach = [
      /direction-aware[^.]{0,40}\b(per|every|each|all)\s+platform/i,
      /\brtl\b[^.]{0,40}tested[^.]{0,20}\b(per|every|each|all)\s+platform/i,
      /tested per platform/i,
    ];
    for (const [where, text] of Object.entries(CURRENT_SURFACES)) {
      for (const claim of overreach) {
        expect(
          text,
          `${where} claims direction-aware testing across platforms, but ${withoutRtl.join(", ")} has none`,
        ).not.toMatch(claim);
      }
    }
  });

  /**
   * Where a surface *enumerates* the platforms with direction-aware evidence, that list is compared
   * to the set which has any — so naming a platform with none fails, and so does dropping one that
   * has some.
   *
   * This replaced a scan for "<platform> … tested", which could not tell a claim from its denial:
   * `/docs/platforms` says "SwiftUI tests its colour contrast and spacing scale but not yet its
   * views", which is exactly right and exactly what that scan flagged. A guard that fails on honest
   * prose gets deleted, and then nothing is guarded.
   */
  it("never enumerates a platform that has no direction-aware evidence", () => {
    // The clause stops at a full stop, an em dash or a line break, so a following sentence that
    // mentions a platform in order to *exclude* it ("…and SwiftUI has none of them") is not read as
    // part of the list.
    const listPattern = /(?:direction-aware behaviour|RTL behaviour)\s+(?:tests|evidence)\s+on\s+([^.—\n]*)/gi;
    const labelOf = (p: string) => defs[p]?.label ?? p;
    const evidenced = new Set(withRtl.map(labelOf));
    let lists = 0;
    for (const [where, text] of Object.entries(CURRENT_SURFACES)) {
      for (const match of text.matchAll(listPattern)) {
        const span = match[1]!.replace(/\s+/g, " ");
        lists += 1;
        const named = platforms.map(labelOf).filter((l) => new RegExp(`\\b${l}\\b`).test(span));
        expect(named.length, `${where}: "${span.trim()}" names no platform at all`).toBeGreaterThan(0);
        // A subset, not an exact match: React's direction-aware story is told through `check:rtl`
        // rather than in these lists, so requiring every evidenced platform in every list would
        // force copy to say something it deliberately says elsewhere. The invariant that matters is
        // one-directional — a claim may under-sell the evidence, never exceed it.
        for (const label of named) {
          expect(
            evidenced,
            `${where} lists ${label} as having direction-aware evidence; verification.json says it has none`,
          ).toContain(label);
        }
      }
    }
    expect(lists, "no current surface enumerates RTL-tested platforms — this guard saw nothing").toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ the historical exclusion */

/**
 * The rules above must not reach into history. This asserts the exclusion holds — that the release
 * record still contains the statement today's rules would reject — so nobody later "fixes" the
 * changelog to make a guard pass.
 */
describe("history is left alone", () => {
  it("keeps the 0.23.0 record of Angular being unpublished at the time", () => {
    const releases = readFileSync("src/lib/releases.ts", "utf8");
    const entry = releases.slice(releases.indexOf('version: "0.23.0"'), releases.indexOf('version: "0.22.'));
    expect(entry, "the 0.23.0 entry should still say Angular was not on npm then").toMatch(/not (yet )?(on npm|published)/i);
  });

  it("does not check any historical surface", () => {
    for (const name of Object.keys(CURRENT_SURFACES)) {
      expect(name).not.toMatch(/CHANGELOG|releases\.ts|drafts\/a0\d\/sources/);
    }
  });
});
