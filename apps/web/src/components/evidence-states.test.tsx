// @vitest-environment node
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import verification from "../../../../verification.json";
import {
  EVIDENCE_COUNTS,
  EVIDENCE_KINDS,
  LIMITED_EVIDENCE_SHARE,
  NATIVE_PLATFORMS,
  PLATFORMS,
  PLATFORM_DEFINITIONS,
  classifyEvidence,
  evidenceStatus,
  type Platform,
} from "@/lib/platform-parity";
import { platformCount } from "@/lib/platform-support";
import { SUMMARY_EVIDENCE, platformEvidence } from "@/lib/systems-in-motion";
import { PlatformAtAGlance, PlatformVerificationTable } from "./foundations-tables";
import { EvidenceColumns } from "./systems/evidence-columns";

/**
 * The platform evidence cards (homepage evidence chapter, /docs/platforms, the guides, each platform page's
 * at-a-glance) must not print a kind no test records yet, or records for only a handful of entries, as "0 / 90"
 * or "1 / 90" over a near-empty meter: that reads as a measured failure of the platform. These hold the state
 * model to the generator that produced the counts, and the cards to the state model.
 */

const KINDS = [...new Set([...EVIDENCE_KINDS, ...SUMMARY_EVIDENCE])];
const sources = verification.sources as Record<Platform, { file: string; kinds: string[] }[]>;
const claimable = new Set(verification.claimableKinds);

/** The <div> rows of one card's evidence list, keyed by state. */
function rows(html: string, state: string) {
  return html.match(new RegExp(`<div[^>]*data-evidence-state="${state}"[^>]*>[\\s\\S]*?</div>`, "g")) ?? [];
}

describe("evidenceStatus reads each count by the contract that produced it", () => {
  it.each(PLATFORMS)("%s: every state matches the count and the kind", (platform) => {
    for (const kind of KINDS) {
      const e = evidenceStatus(platform, kind);
      expect(e.count).toBe((EVIDENCE_COUNTS[platform] as Record<string, number>)[kind]);
      expect(e.of).toBe(platformCount(platform));
      const expected =
        kind === "published"
          ? e.count === 0
            ? "source-only"
            : "registry-published"
          : e.count === e.of
            ? "verified"
            : e.count === 0
              ? "not-yet-verified"
              : claimable.has(kind) && e.count / e.of < LIMITED_EVIDENCE_SHARE
                ? "limited"
                : "partial";
      expect(e.state, `${platform} ${kind}`).toBe(expected);
      // a meter only where the fraction is worth drawing
      expect(e.meter, `${platform} ${kind}`).toBe(expected === "verified" || expected === "partial");
    }
  });

  it("says 'no test records' only where verification.json has no passage claiming the kind", () => {
    let seen = 0;
    for (const platform of PLATFORMS) {
      for (const kind of KINDS) {
        if (evidenceStatus(platform, kind).state !== "not-yet-verified") continue;
        seen++;
        const claiming = sources[platform].filter((s) => s.kinds.includes(kind)).map((s) => s.file);
        expect(claiming, `${platform} ${kind} is "not yet verified" but these passages claim it`).toEqual([]);
      }
    }
    // the premise this PR exists for: some card does have such a zero today
    expect(seen).toBeGreaterThan(0);
  });

  it("keeps the limited threshold off today's data boundaries, so one more test cannot flip a card's wording", () => {
    const shares = PLATFORMS.flatMap((p) => KINDS.filter((k) => claimable.has(k)).map((k) => evidenceStatus(p, k)))
      .filter((e) => e.count > 0 && e.count < e.of)
      .map((e) => e.count / e.of);
    const below = Math.max(...shares.filter((x) => x < LIMITED_EVIDENCE_SHARE));
    const above = Math.min(...shares.filter((x) => x >= LIMITED_EVIDENCE_SHARE));
    // the premise: both sides are populated today (Compose RTL 1 of 90 is limited, React RTL 22 of 98 is partial)
    expect(Number.isFinite(below) && Number.isFinite(above)).toBe(true);
    expect(evidenceStatus("Compose", "rtl").state).toBe("limited");
    expect(evidenceStatus("Compose", "rtl").summary).toBe("Tests record it for 1 Jetpack Compose entry so far.");
  });

  it("reads publication from the platform's declared distribution, in factual words rather than maturity words", () => {
    for (const platform of PLATFORMS) {
      const e = evidenceStatus(platform, "published");
      const def = PLATFORM_DEFINITIONS[platform];
      expect(e.state).toBe(def.distribution.published ? "registry-published" : "source-only");
      expect(e.meter, "publication is a fact, not a score: no meter").toBe(false);
      expect(e.label).not.toMatch(/verified|evidence|partial/i);
    }
  });
});

/**
 * Every state, from a count rather than from today's generated data, so these keep testing the rule when a new
 * test moves a platform's numbers. A synthetic platform with a 90-entry catalogue, as the native ones have.
 */
describe("classifyEvidence: each state from a given count", () => {
  const swift = PLATFORM_DEFINITIONS.SwiftUI;
  const react = PLATFORM_DEFINITIONS.React;
  const at = (kind: Parameters<typeof classifyEvidence>[1], count: number, def = swift, of = 90) => classifyEvidence(def, kind, count, of);

  it("1. a test-claimed kind at 0 is 'Not yet verified', with a reason, no meter and no ratio", () => {
    const e = at("interaction", 0);
    expect([e.state, e.label, e.meter]).toEqual(["not-yet-verified", "Not yet verified", false]);
    expect(e.summary).toBe("No SwiftUI test records this yet.");
  });

  it("2. 1 of 90 is limited evidence, singular, no meter", () => {
    const e = at("rtl", 1);
    expect([e.state, e.label, e.meter]).toEqual(["limited", "Limited evidence", false]);
    expect(e.summary).toBe("Tests record it for 1 SwiftUI entry so far.");
  });

  it("3. 7 of 90 is limited evidence, no meter", () => {
    const e = at("reducedMotion", 7);
    expect([e.state, e.label, e.meter]).toEqual(["limited", "Limited evidence", false]);
    expect(e.summary).toBe("Tests record it for 7 SwiftUI entries so far.");
  });

  it("4. from one in ten up to all-but-one is partial, with a meter", () => {
    for (const n of [9, 38, 89]) {
      const e = at("interaction", n);
      expect([e.state, e.label, e.meter], `${n} of 90`).toEqual(["partial", "Partial", true]);
      expect(e.summary).toBe(`${n} of 90 SwiftUI catalogue entries have interaction evidence.`);
    }
    expect(at("interaction", 8).state, "8 of 90 is 8.9%, still limited").toBe("limited");
  });

  it("5. every entry is verified, with a meter, and the sentence says exactly what that means", () => {
    const e = at("accessibility", 90);
    expect([e.state, e.label, e.meter]).toEqual(["verified", "Verified", true]);
    // "Verified" = evidence on file for every catalogue entry for this kind; never a certification or conformance claim
    expect(e.summary).toBe("All 90 SwiftUI catalogue entries have accessibility evidence.");
    expect(e.summary).not.toMatch(/certif|complian|conform|bug-free|fully accessible/i);
  });

  it("6. publication declared false is 'Source checkout only', with what has not happened and what a reader can do", () => {
    const e = at("published", 0);
    expect([e.state, e.label, e.meter]).toEqual(["source-only", "Source checkout only", false]);
    expect(e.summary).toBe("SwiftUI is not published to Swift Package Manager yet; build it from a repository checkout.");
  });

  it("7. publication declared true names the registry, never a maturity word", () => {
    const e = at("published", 98, react, 98);
    expect([e.state, e.label, e.meter]).toEqual(["registry-published", "On npm", false]);
    expect(e.summary).toBe("98 of 98 React catalogue entries are published to npm.");
  });

  it("never turns a missing count into 'not applicable' or a failure", () => {
    for (let n = 0; n <= 90; n++) expect(at("largeText", n).label).not.toMatch(/applicable|unsupported|excluded|fail/i);
  });
});

describe("8. native distribution wording", () => {
  it.each(NATIVE_PLATFORMS)("%s: says the implementation is usable from source and names the registry it is not on", (platform) => {
    const def = PLATFORM_DEFINITIONS[platform];
    expect(def.distribution.published, "premise: the native packages are not on a registry").toBe(false);
    const e = evidenceStatus(platform, "published");
    expect(e.label).toBe("Source checkout only");
    expect(e.summary).toBe(`${def.label} is not published to ${def.distribution.channel} yet; build it from a repository checkout.`);
  });

  it("no surface prints a standalone 'Not published' that could read as 'not available'", () => {
    const surfaces = [
      renderToStaticMarkup(<EvidenceColumns platforms={platformEvidence()} />),
      renderToStaticMarkup(<PlatformVerificationTable />),
      ...PLATFORMS.map((p) => renderToStaticMarkup(<PlatformAtAGlance platform={p} page="/docs/platforms" />)),
    ].join("\n");
    // allowed only as part of a precise phrase, e.g. "not published to Swift Package Manager yet"
    expect(surfaces).not.toMatch(/Not published(?! to )/);
    expect(surfaces).toContain("Source checkout only");
  });
});

describe("homepage evidence columns", () => {
  const html = renderToStaticMarkup(<EvidenceColumns platforms={platformEvidence()} />);
  const cards = html.split("<li>").slice(1);

  it.each(PLATFORMS.map((p, i) => [p, i] as const))("%s: low and zero evidence read as words with a sentence, never as a near-empty score", (platform, i) => {
    const card = cards[i]!;
    const evidence = platformEvidence()[i]!.evidence;
    expect(card).toContain(PLATFORM_DEFINITIONS[platform].label);
    for (const state of ["verified", "partial", "limited", "not-yet-verified"] as const) {
      expect(rows(card, state), `${platform} ${state}`).toHaveLength(evidence.filter((e) => e.state === state).length);
    }
    for (const e of evidence) {
      const row = rows(card, e.state).find((r) => r.includes(e.summary))!;
      expect(row, `${platform} ${e.kind}: its sentence is a dd of the row`).toBeDefined();
      // the state in words leads the value, before any number
      expect(row).toMatch(new RegExp(`<dd>${e.label}(<span|</dd>)`));
      // 10–13. a meter for partial and verified only; 9. the reason is a dd of the same row either way
      if (e.meter) {
        expect(["partial", "verified"]).toContain(e.state);
        expect(row).toContain("kx-meter");
        expect(row).toContain(`<dd class="sr-only">${e.summary}</dd>`);
      } else {
        expect(row, "no meter under a zero or a handful").not.toMatch(/kx-meter|--kx-meter/);
        expect(row, "the sentence is visible where there is no fraction worth reading").toContain(`<dd>${e.summary}</dd>`);
      }
      if (e.count === 0) expect(row).not.toMatch(/\d+ \/ \d+/);
      // a count is secondary detail, hidden from assistive technology, which hears the state and the sentence
      else expect(row).toContain(`<span aria-hidden="true">${e.count} / ${e.of}</span>`);
    }
    expect(card).not.toMatch(/role="(progressbar|meter)"|aria-valuenow/);
  });

  it("labels the metric as evidence, not as the capability", () => {
    for (const label of ["Build verification", "Interaction verification", "Accessibility verification", "RTL verification", "Large-text verification", "Reduced-motion verification"]) {
      expect(html).toContain(`<dt>${label}</dt>`);
    }
    expect(html).not.toMatch(/<dt>(Build|Interaction|Accessibility|RTL|Large text|Reduced motion)<\/dt>/);
  });
});

describe("/docs/platforms verification cards", () => {
  const html = renderToStaticMarkup(<PlatformVerificationTable />);

  it("prints no '0 / N' for a kind no test records, says 'Limited evidence' for a handful, and keeps the real zero of an unpublished package", () => {
    const gaps = rows(html, "not-yet-verified");
    expect(gaps.length).toBeGreaterThan(0);
    for (const row of gaps) {
      expect(row).toContain("<dd>Not yet verified</dd>");
      expect(row).toMatch(/No [^<]+ test records this yet\./);
      expect(row).not.toMatch(/\d+ \/ \d+/);
    }
    const limited = rows(html, "limited");
    expect(limited.length).toBeGreaterThan(0);
    for (const row of limited) expect(row).toMatch(/<dd>Limited evidence<span aria-hidden="true"[^>]*>\d+ \/ \d+<\/span><\/dd><dd class="[^"]*">Tests record it for \d+ [^<]+ so far\.<\/dd>/);
    // 6/8. the real zero of an unpublished package: factual words and the reason, visible and in the same row
    const source = rows(html, "source-only");
    expect(source).toHaveLength(NATIVE_PLATFORMS.length);
    for (const row of source) expect(row).toMatch(/<dd>Source checkout only<\/dd><dd class="[^"]*">[^<]+ is not published to [^<]+ yet; build it from a repository checkout\.<\/dd>/);
    // 7. a published package says where
    for (const row of rows(html, "registry-published")) expect(row).toMatch(/<dd>On npm<span aria-hidden="true"[^>]*>\d+ \/ \d+<\/span><\/dd><dd class="[^"]*">\d+ of \d+ [^<]+ are published to npm\.<\/dd>/);
    expect(html).not.toMatch(/aria-valuenow/);
  });
});

describe("platform at a glance", () => {
  it.each(["SwiftUI", "Compose"] as const)("%s: says which kinds are not yet verified or limited instead of 'Interaction 0/90'", (platform) => {
    const html = renderToStaticMarkup(<PlatformAtAGlance platform={platform} page="/docs/platforms" />);
    expect(html).not.toMatch(/\b0\/\d+/);
    for (const kind of ["interaction", "accessibility", "rtl", "largeText"] as const) {
      const e = evidenceStatus(platform, kind);
      if (e.state === "not-yet-verified") expect(html).toMatch(/not yet verified/);
      if (e.state === "limited") expect(html).toContain(`limited evidence (${e.count}/${e.of})`);
    }
  });
});
