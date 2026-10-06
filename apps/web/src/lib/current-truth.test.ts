// @vitest-environment node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
  "marketing/STRATEGY.md": read("marketing/STRATEGY.md"),
  "marketing/MESSAGING.md": read("marketing/MESSAGING.md"),
  "marketing/PERSONAS.md": read("marketing/PERSONAS.md"),
  "marketing/seo.md": read("marketing/seo.md"),
  "marketing/launches.md": read("marketing/launches.md"),
  "marketing/content-calendar.md": read("marketing/content-calendar.md"),
  "marketing/CLAIMS.md": read("marketing/CLAIMS.md"),
  "marketing/CONTENT-PILLARS.md": read("marketing/CONTENT-PILLARS.md"),
  /*
   * The distribution documents make present-tense claims about platforms, coverage, distribution and what
   * may be said in someone else's community, so they belong here for the same reason MESSAGING.md does.
   * They were written outside these rules and added afterwards, which is the wrong order: Phase 0.75 found
   * a guard that had the right rule and could not see the sentence, and a guard that cannot see the FILE is
   * the same defect one level up.
   */
  "marketing/community.md": read("marketing/community.md"),
  "marketing/distribution/README.md": read("marketing/distribution/README.md"),
  "marketing/distribution/first-14-days.md": read("marketing/distribution/first-14-days.md"),
  "marketing/distribution/github.md": read("marketing/distribution/github.md"),
  "marketing/distribution/outreach.md": read("marketing/distribution/outreach.md"),
};

const defs = manifest.platformDefinitions as Record<
  string,
  { label: string; maturity: string; catalogComplete: boolean; distribution: { channel: string; coordinate: string; published: boolean } }
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
  // `program.ts`, not `index.ts`: the command tree moved there in Phase 0.5 so it could be built without
  // being executed, which is what made the CLI testable at all. `index.ts` is now four lines.
  const cli = read("packages/cli/src/program.ts");
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
    /**
     * Prose is unwrapped into paragraphs BEFORE being split into sentences.
     *
     * The third version of this, and the reason for it. Splitting per line first looked equivalent and is
     * not, because every markdown file here hard-wraps at about 80 columns: a sentence that crosses a line
     * break was never seen whole, so the package name and the denial could land in different units and
     * neither unit was a claim. `marketing/STRATEGY.md` (then `positioning.md`) carried exactly that shape for months —
     *
     *     ...and `@kinetixui/tokens` are on npm; `@kinetixui/angular` and the three native
     *     libraries are not.
     *
     * — where line one names the package with no denial in it and line two denies with no name in it. The
     * guard read both and objected to neither.
     *
     * Table rows are still kept whole (a row is one claim across cells) and a blank line still ends a
     * paragraph, so unrelated prose is never joined into one unit.
     */
    let paragraph: string[] = [];
    const flush = () => {
      if (paragraph.length === 0) return;
      units.push(...paragraph.join(" ").split(/(?<=[.!?])/));
      paragraph = [];
    };
    for (const line of text.split("\n")) {
      if (line.trimStart().startsWith("|")) {
        flush();
        units.push(line);
      } else if (line.trim() === "") {
        flush();
      } else {
        paragraph.push(line.trim());
      }
    }
    flush();
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
   * The elliptical denial, which no phrase rule above can see.
   *
   * `marketing/STRATEGY.md` (then `positioning.md`) carried this for months and every guard read it as fine:
   *
   *     Only the npm packages are published. `@kinetixui/ui`, `@kinetixui/cli` and `@kinetixui/tokens`
   *     are on npm; `@kinetixui/angular` and the three native libraries are not.
   *
   * The denial is "are not." — the predicate is elided. None of `not published`, `unpublished` or
   * `not on npm` appears anywhere in it, so searching for those phrases was never going to work, and
   * unwrapping the line break (which was also needed, and is fixed above) does not help either.
   *
   * This looks instead for a negation that *ends* a clause — the shape ellipsis takes — inside a unit
   * that is talking about distribution and names a published package. It deliberately does not fire on
   * "Angular is published, but not stable", because there the negation is followed by its own predicate.
   */
  it.each(published.map(([id, d]) => [id, d.label, d.distribution.coordinate] as const))(
    "never excludes the published %s from a distribution list by ellipsis",
    (_id, label, coordinate) => {
      const aboutDistribution = /\b(npm|registry|distribut|publish)/i;
      const elided = /\b(is|are)\s+not\s*[.;,]/i;
      for (const [where, text] of Object.entries(CURRENT_SURFACES)) {
        for (const unit of claimsNaming(text, label)) {
          if (!aboutDistribution.test(unit)) continue;
          const flat = unit.replace(/\s+/g, " ").trim();
          // Only when the elision comes AFTER the package is named — otherwise an earlier clause about
          // something else would implicate a package merely mentioned later in the same sentence.
          const at = flat.toLowerCase().indexOf(coordinate.toLowerCase());
          const named = at >= 0 ? flat.slice(at) : flat;
          expect(
            elided.exec(named)?.[0],
            `${where} excludes ${coordinate} from a distribution list by ellipsis ("…are not."), and it is published: "${flat.slice(0, 140)}"`,
          ).toBeUndefined();
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

/* ------------------------------------------------------------------ the IoT module */

/**
 * What the site may say about `@kinetixui/iot`.
 *
 * Every number comes from the package's own manifest, so the guard cannot be satisfied by editing a second
 * copy of the truth: if the version moves and a page still names the old one, this fails. The prose rules are
 * the four ways this particular module is easy to oversell — as a platform, as a transport, as a native port,
 * and as a catalogue component — plus the two ways it is easy to undersell now that it has actually shipped.
 */
/**
 * Every sentence in `text` that names `term`.
 *
 * Sentence-scoped for the same reason the platform rules above are: a page may legitimately say "there is no
 * SwiftUI port" while also naming SwiftUI elsewhere, and a whole-file search would call that a contradiction.
 *
 * Split on sentence punctuation and on blank lines — **not** on every newline. Both MDX and JSX wrap prose at a
 * column, so a single newline is usually the middle of a sentence: splitting there tore "there is no SwiftUI,
 * Jetpack Compose or Flutter port" in half and reported the second half as an unqualified claim. Whitespace is
 * collapsed so a wrapped sentence reads as one line in a failure message.
 */
function sentencesMentioning(text: string, term: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n\s*\n/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.includes(term));
}

describe("the IoT module is described as what it is", () => {
  const iotManifest = JSON.parse(read("packages/iot/package.json")) as {
    name: string;
    version: string;
    description: string;
    exports: Record<string, unknown>;
    peerDependencies: Record<string, string>;
    peerDependenciesMeta?: { react?: { optional?: boolean } };
    dependencies?: Record<string, string>;
  };

  /**
   * The IoT-facing surfaces, in present tense: the landing page, the reference, and every composition
   * the site renders.
   *
   * The examples are in here for the same reason the page is. A dashboard is the most persuasive
   * surface on the site and therefore the easiest place for a claim to appear that the package cannot
   * honour — a device that looks discovered, a control that looks connected, a protocol named as
   * though it shipped. A guard that stopped at the page would police the prose and leave the
   * demonstration unpoliced.
   */
  const IOT_SURFACES = {
    "app/iot/page.tsx": readFileSync("src/app/iot/page.tsx", "utf8"),
    "components/iot/module-boundary.tsx": readFileSync("src/components/iot/module-boundary.tsx", "utf8"),
    "components/iot/device-showcase.tsx": readFileSync("src/components/iot/device-showcase.tsx", "utf8"),
    "components/iot/lab/hero-command-strip.tsx": readFileSync("src/components/iot/lab/hero-command-strip.tsx", "utf8"),
    "components/iot/lab/lab-tabs.tsx": readFileSync("src/components/iot/lab/lab-tabs.tsx", "utf8"),
    "components/iot/lab/lab-section.tsx": readFileSync("src/components/iot/lab/lab-section.tsx", "utf8"),
    "components/iot/example-showcase.tsx": readFileSync("src/components/iot/example-showcase.tsx", "utf8"),
    "examples/iot/demo-fleet.ts": readFileSync("src/examples/iot/demo-fleet.ts", "utf8"),
    "examples/iot/device-dashboard.tsx": readFileSync("src/examples/iot/device-dashboard.tsx", "utf8"),
    "examples/iot/device-fleet.tsx": readFileSync("src/examples/iot/device-fleet.tsx", "utf8"),
    "examples/iot/device-detail.tsx": readFileSync("src/examples/iot/device-detail.tsx", "utf8"),
    "examples/iot/telemetry-board.tsx": readFileSync("src/examples/iot/telemetry-board.tsx", "utf8"),
    "examples/iot/connection-troubleshooting.tsx": readFileSync("src/examples/iot/connection-troubleshooting.tsx", "utf8"),
    "examples/iot/alert-inbox.tsx": readFileSync("src/examples/iot/alert-inbox.tsx", "utf8"),
    "lib/iot-examples.ts": readFileSync("src/lib/iot-examples.ts", "utf8"),
    "docs/iot": readFileSync("src/app/docs/iot/page.mdx", "utf8"),
  } as const;

  it("has surfaces to check, so nothing below is vacuous", () => {
    expect(Object.keys(IOT_SURFACES).length).toBeGreaterThan(2);
    for (const [name, text] of Object.entries(IOT_SURFACES)) {
      expect(text.length, `${name} should not be empty`).toBeGreaterThan(200);
    }
    // And the manifest really does carry the fields the rules below read.
    expect(iotManifest.name).toBe("@kinetixui/iot");
    expect(iotManifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  /* ---- derived facts, never typed twice ---- */

  it("never hardcodes the IoT version anywhere on the site", () => {
    /**
     * The whole version string, anywhere in these surfaces, is the failure — not a particular phrasing of it.
     * An earlier version of this rule matched `@kinetixui/iot@0.1.0` and `iot: 0.1.0` and was defeated by the
     * obvious thing: someone writing `Experimental · 0.1.0` by hand. There is no shape of "0.1.0 typed into a
     * page" that is correct, so the rule is now the simple one.
     */
    for (const [name, text] of Object.entries(IOT_SURFACES)) {
      expect(
        text.includes(iotManifest.version),
        `${name} spells out "${iotManifest.version}" — read it from IOT_VERSION, or it goes stale on the next release`,
      ).toBe(false);
    }
    const iotLib = readFileSync("src/lib/iot.ts", "utf8");
    expect(iotLib, "lib/iot.ts must read the version from the manifest").toMatch(/iotPackage\.version/);
  });

  it("exposes exactly the entry points the package exports", () => {
    const declared = Object.keys(iotManifest.exports).filter((s) => s !== "./package.json");
    expect(declared).toEqual([".", "./functions", "./react"]);
    // The page's entry-point list is generated from the same map, so it cannot advertise a subpath that the
    // package does not resolve — which is the failure a hand-written list produces.
    const iotLib = readFileSync("src/lib/iot.ts", "utf8");
    expect(iotLib).toMatch(/Object\.keys\(iotPackage\.exports\)/);
  });

  /* ---- the four ways to oversell it ---- */

  it("never calls IoT a platform", () => {
    for (const [name, text] of Object.entries(IOT_SURFACES)) {
      // "sixth platform", "IoT platform", "platform: IoT" — any framing that puts it beside React/SwiftUI.
      expect(text, `${name} must not call IoT a platform`).not.toMatch(/IoT platform|platform called IoT|sixth platform(?!,| and not)/i);
    }
  });

  /**
   * Two regions name SwiftUI, MQTT and BLE on purpose, and in both the denial lives above the line rather than
   * in it — so a sentence-scoped rule cannot see it:
   *
   *  - the landing page's roadmap, where the unshipped columns carry `state: "excluded"` or `"deferred"`;
   *  - the docs' "Not in this module" list, where the heading negates every bullet under it.
   *
   * Both are excised before the prose rules run, and the test below asserts each excised region really is the
   * negative one. That keeps the layering honest: one test proves the region is marked as not-shipped, and the
   * rules then hold everywhere else with no per-sentence exceptions to remember.
   */
  const EXCISIONS: readonly { from: string; to: string }[] = [
    { from: 'when: "Not in the module, by design"', to: "export default" }, // landing page roadmap: the excluded and deferred columns
    { from: "**Not in this module**", to: "## Generic on purpose" }, // docs: the negated list
    { from: "## Roadmap", to: "\u0000" }, // docs: the roadmap, which runs to the end of the file
  ];

  /** `to` of "\0" means "to the end of the file" — a sentinel, since no source contains a NUL byte. */
  function claimsOnly(text: string): string {
    let out = text;
    for (const { from, to } of EXCISIONS) {
      const start = out.indexOf(from);
      if (start === -1) continue;
      const end = to === "\u0000" ? out.length : out.indexOf(to, start + 1);
      if (end !== -1) out = out.slice(0, start) + out.slice(end);
    }
    return out;
  }

  it("excises only regions that are explicitly not-shipped", () => {
    const page = IOT_SURFACES["app/iot/page.tsx"];
    const roadmap = page.slice(page.indexOf('when: "Not in the module, by design"'), page.indexOf("export default"));
    expect(roadmap, "the excised roadmap region should be the unshipped columns").toMatch(/state:\s*"excluded"/);
    expect(roadmap).toMatch(/state:\s*"deferred"/);
    expect(roadmap, "and must not contain the shipped column").not.toMatch(/state:\s*"shipped"/);

    const docs = IOT_SURFACES["docs/iot"];
    const notInModule = docs.slice(docs.indexOf("**Not in this module**"), docs.indexOf("## Generic on purpose"));
    expect(notInModule, "the excised docs region should be the not-in-this-module list").toMatch(/no transport of any kind/);
    expect(notInModule).toMatch(/native SwiftUI/);

    const docsRoadmap = docs.slice(docs.indexOf("## Roadmap"));
    expect(docsRoadmap, "the excised docs roadmap must say nothing in it has shipped").toMatch(
      /Nothing here is scheduled, and none of it is in the module today/,
    );

    // Both excisions must actually remove something, or the rules below would be checking the whole file and
    // the assertions above would be describing a region nothing uses.
    expect(claimsOnly(page).length).toBeLessThan(page.length);
    expect(claimsOnly(docs).length).toBeLessThan(docs.length);
  });

  it("never claims a native IoT port exists", () => {
    for (const [name, text] of Object.entries(IOT_SURFACES)) {
      for (const native of ["SwiftUI", "Jetpack Compose", "Flutter"]) {
        for (const sentence of sentencesMentioning(claimsOnly(text), native)) {
          // Outside the roadmap, a sentence may name a native platform only to deny a port.
          const denied = /\b(no|not|none|without|neither|nor|planned|intended|later|yet)\b/i.test(sentence);
          expect(denied, `${name}: "${sentence.trim()}" names ${native} without denying a port`).toBe(true);
        }
      }
    }
  });

  it("never claims a protocol or transport is supported", () => {
    for (const [name, text] of Object.entries(IOT_SURFACES)) {
      for (const protocol of ["MQTT", "BLE", "WebSocket", "Zigbee", "Matter", "LoRaWAN", "Modbus"]) {
        const supported = new RegExp(`(?:supports?|ships?|includes?|provides?|built-in)\\s+(?:\\w+\\s+){0,3}${protocol}`, "i");
        expect(supported.test(claimsOnly(text)), `${name} must not claim ${protocol} support`).toBe(false);
      }
    }
  });

  it("never counts IoT primitives in the component catalogue", () => {
    const primitives = ["DeviceStatusBadge", "BatteryIndicator", "SignalStrength", "LastSync", "SensorReading"];
    for (const slug of Object.keys(manifest.components)) {
      expect(primitives.map((p) => p.toLowerCase())).not.toContain(slug.replace(/-/g, ""));
    }
    expect(manifest.platformDefinitions, "IoT must not be a platform in the manifest").not.toHaveProperty("IoT");
  });

  /**
   * The patterns are a second way to inflate the catalogue, and a more tempting one: nine components
   * is a number somebody will eventually want to add to 98.
   */
  it("never counts IoT patterns in the component catalogue either", () => {
    const patterns = [
      "DeviceCard",
      "DeviceListItem",
      "DeviceStateSummary",
      "TelemetryTrend",
      "TelemetryCard",
      "ConnectionHealth",
      "AlertCard",
      "CommandStatus",
      "FirmwareStatus",
    ];
    for (const slug of Object.keys(manifest.components)) {
      expect(patterns.map((p) => p.toLowerCase())).not.toContain(slug.replace(/-/g, ""));
    }
  });

  /**
   * And a third: the examples are not Blocks. A published Block carries every platform, which this
   * React-only module cannot do, so an IoT composition appearing in `blocks.manifest.json` would
   * either be lying about four platforms or sitting in the `draft` status the site never renders.
   */
  it("never lets an IoT example into the Blocks catalogue", () => {
    const blocks = JSON.parse(read("blocks.manifest.json")) as {
      blocks: Record<string, { sources: Record<string, string> }>;
    };
    for (const [slug, block] of Object.entries(blocks.blocks)) {
      for (const [platform, path] of Object.entries(block.sources)) {
        expect(path, `block ${slug} (${platform}) points into the IoT examples directory`).not.toMatch(
          /examples\/iot\//,
        );
      }
    }
    const iotManifestRaw = JSON.parse(read("iot-examples.manifest.json")) as {
      examples: Record<string, unknown>;
    };
    // Both catalogues exist and neither is empty, so the loop above is not passing by having nothing
    // to iterate.
    expect(Object.keys(blocks.blocks).length).toBeGreaterThan(0);
    expect(Object.keys(iotManifestRaw.examples).length).toBeGreaterThan(0);
  });

  /**
   * The dashboard is the most persuasive surface on the site, so it carries the strongest obligation
   * to say what it is. A reader who believes the controls reach a device has been misled by the page,
   * not by the package.
   */
  it("says the showcase controls are demonstration state", () => {
    const dashboard = IOT_SURFACES["examples/iot/device-dashboard.tsx"];
    expect(dashboard, "the dashboard must state that its controls are local demo state").toMatch(
      /LOCAL DEMO STATE|local demo state/,
    );
    expect(dashboard, "and that nothing reaches a device").toMatch(/no transport|nothing here reaches a device/i);
    const page = IOT_SURFACES["app/iot/page.tsx"];
    expect(page, "the page must say the same beside the showcase").toMatch(/local demo state|demo state only/i);
  });

  /* ---- the two ways to undersell it, now that it has shipped ---- */

  it("never describes the functions subpath as needing React", () => {
    expect(iotManifest.peerDependenciesMeta?.react?.optional, "react must still be an optional peer").toBe(true);
    for (const [name, text] of Object.entries(IOT_SURFACES)) {
      expect(text, `${name} must not say the functions subpath requires React`).not.toMatch(
        /functions[^.]{0,80}requires? React|React is required/i,
      );
    }
  });

  it("never says IoT is unpublished or merely planned", () => {
    for (const [name, text] of Object.entries(IOT_SURFACES)) {
      expect(text, `${name} must not say the IoT package is unpublished`).not.toMatch(
        /iot[^.]{0,60}(not (yet )?(published|on npm)|coming soon|unreleased)/i,
      );
    }
  });

  /* ---- planned work stays marked ---- */

  it("marks every roadmap item that has not shipped", () => {
    const page = IOT_SURFACES["app/iot/page.tsx"];
    // The unshipped groups carry `state: "excluded"` or `"deferred"`, and their badges say so.
    expect(page).toMatch(/state:\s*"excluded"/);
    expect(page).toMatch(/state:\s*"deferred"/);
    expect(page).toMatch(/"Excluded"/);
    expect(page).toMatch(/"Deferred"/);
    // Transports, adapters, native ports and engines appear only inside a non-shipped group — never in the shipped one.
    const shippedGroup = page.slice(page.indexOf('state: "shipped"'), page.indexOf('when: "Not in the module, by design"'));
    for (const unshipped of ["adapter", "MQTT", "SwiftUI", "engine", "video", "protocol"]) {
      expect(shippedGroup.toLowerCase(), `"${unshipped}" must not be listed as shipped`).not.toContain(unshipped.toLowerCase());
    }
    // And the roadmap carries no date and no "coming soon".
    const roadmap = page.slice(page.indexOf("const ROADMAP"), page.indexOf("export default"));
    expect(roadmap).not.toMatch(/coming soon|\bQ[1-4]\b|\b20\d\d\b/i);
  });
});

/* ------------------------------------------------------------------ token engine and design provenance */

/**
 * Every present-tense surface that can name the token engine or a component's design provenance: the site's pages
 * and components, the READMEs, `TOKENS.md`, the token build's own sources, and the registry metadata the CLI and
 * kinetixui.com/r serve. Release history (`releases.ts`, CHANGELOGs) and dated audits are not in it — see below.
 */
function provenanceSurfaces(): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string, keep: (name: string) => boolean) => {
    for (const name of readdirSync(`${root}/${dir}`)) {
      const rel = `${dir}/${name}`;
      if (statSync(`${root}/${rel}`).isDirectory()) walk(rel, keep);
      else if (keep(name)) out[rel] = read(rel);
    }
  };
  walk("apps/web/src/app", (n) => /\.(mdx|tsx)$/.test(n));
  walk("apps/web/src/components", (n) => n.endsWith(".tsx") && !n.includes(".test."));
  walk("apps/web/public/r", (n) => n.endsWith(".json"));
  walk("style-dictionary", (n) => n.endsWith(".mjs"));
  // Component source docblocks travel into consumers' repositories through `kinetixui add`, and the stories are the
  // published Storybook's descriptions — both are public prose about provenance.
  walk("packages/ui/src/components", (n) => n.endsWith(".tsx") && !n.includes(".test."));
  walk("packages/ui/src/stories", (n) => n.endsWith(".tsx"));
  walk("registry/kinetixui/ui", (n) => n.endsWith(".tsx"));
  for (const f of ["README.md", "TOKENS.md", "packages/tokens/README.md", "registry/registry.json", "scripts/gen-registry.mjs", "scripts/gen-docs.mjs"]) {
    if (existsSync(`${root}/${f}`)) out[f] = read(f);
  }
  return out;
}
const PROVENANCE = provenanceSurfaces();

describe("the token engine is named at the version that is installed", () => {
  /** `^5.5.5` → 5. Read from both manifests that declare it, which must agree. */
  const declared = [read("package.json"), read("packages/tokens/package.json")].map(
    (pkg) => (JSON.parse(pkg) as { devDependencies?: Record<string, string>; dependencies?: Record<string, string> }),
  );
  const ranges = declared.map((pkg) => pkg.devDependencies?.["style-dictionary"] ?? pkg.dependencies?.["style-dictionary"]);
  const major = Number(/(\d+)\./.exec(ranges[0] ?? "")?.[1]);

  it("reads one Style Dictionary version from the manifests", () => {
    expect(ranges.every(Boolean), "style-dictionary is no longer declared where this guard looks").toBe(true);
    expect(new Set(ranges).size, `the two manifests disagree: ${ranges.join(" vs ")}`).toBe(1);
    expect(major).toBeGreaterThan(0);
  });

  /** "Style Dictionary v4", "Style Dictionary 4.x", "style-dictionary@4": any major that is not the installed one. */
  const versioned = /style[ -]?dictionary(?:\s+v|\s+|@)(\d+)(?:\.\d+)*/gi;

  it("scans a meaningful set of surfaces", () => {
    expect(Object.keys(PROVENANCE).length).toBeGreaterThan(100);
    for (const f of ["README.md", "TOKENS.md", "apps/web/src/app/page.tsx", "apps/web/src/components/site-footer.tsx"]) {
      expect(Object.keys(PROVENANCE)).toContain(f);
    }
  });

  it("never names a Style Dictionary major other than the installed one", () => {
    const stale = Object.entries(PROVENANCE).flatMap(([f, text]) =>
      [...text.matchAll(versioned)].filter((m) => Number(m[1]) !== major).map((m) => `${f}: "${m[0]}"`),
    );
    expect(stale, `Style Dictionary ${major} is installed`).toEqual([]);
  });

  it("would catch the wording that shipped, so the rule above is not vacuous", () => {
    const old = "One DTCG source, compiled by Style Dictionary v4.";
    expect([...old.matchAll(versioned)].some((m) => Number(m[1]) !== major)).toBe(major !== 4);
  });
});

describe("component provenance says reconciled, not generated", () => {
  /**
   * Components are hand-built and reconciled against design source nodes; nothing generates them from Figma. Pages
   * and registry items that cite a node say "Reconciled 1:1 with design source node …". The three oldest pages
   * (button, input, textarea) are hand-written — `scripts/gen-docs.mjs` deliberately skips any page that exists — and
   * the registry descriptions come from `scripts/gen-registry.mjs`, so both are scanned at their source.
   */
  const generated = /generated\s+(?:1:1\s+)?from\s+(?:the\s+)?(?:figma|(?:kinetixui\s+)?design source)/i;

  it("never claims a component was generated from Figma or the design source", () => {
    const hits = Object.entries(PROVENANCE).flatMap(([f, text]) => {
      const m = generated.exec(text);
      return m ? [`${f}: "${m[0]}"`] : [];
    });
    expect(hits).toEqual([]);
  });

  it("still cites the design source node wherever it did, with the honest verb", () => {
    for (const slug of ["button", "input", "textarea"]) {
      const page = PROVENANCE[`apps/web/src/app/docs/components/${slug}/page.mdx`]!;
      expect(page, `${slug} lost its design source node`).toMatch(/\b5\d{4}:\d+\b/);
      expect(page).toMatch(/Reconciled 1:1 with design source node/);
    }
    const registry = JSON.parse(PROVENANCE["registry/registry.json"]!) as { items: { name: string; description: string }[] };
    const cited = registry.items.filter((i) => /node \d+:\d+/.test(i.description));
    expect(cited.length, "the registry no longer cites any design source node").toBeGreaterThan(0);
    for (const i of cited) expect(i.description, i.name).toMatch(/^Reconciled 1:1 with the KinetixUI design source, node /);
  });

  it("would catch the wording that shipped, so the rule above is not vacuous", () => {
    expect("A single-line text field. Generated 1:1 from Figma node 54855:13836.").toMatch(generated);
    expect("Generated 1:1 from the KinetixUI design source, node 54863:351.").toMatch(generated);
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
