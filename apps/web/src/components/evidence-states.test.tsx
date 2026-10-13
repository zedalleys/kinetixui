// @vitest-environment node
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import verification from "../../../../verification.json";
import {
  EVIDENCE_COUNTS,
  EVIDENCE_KINDS,
  LIMITED_EVIDENCE_SHARE,
  PLATFORMS,
  PLATFORM_DEFINITIONS,
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
        e.count === e.of
          ? "verified"
          : e.count === 0
            ? claimable.has(kind)
              ? "not-yet-verified"
              : "none"
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

  it("names a real zero as a real zero: an unpublished package is 'none', with its channel in the reason", () => {
    for (const platform of PLATFORMS) {
      const e = evidenceStatus(platform, "published");
      const def = PLATFORM_DEFINITIONS[platform];
      if (def.distribution.published) expect(e.state).not.toBe("none");
      else {
        expect(e.state).toBe("none");
        expect(e.summary).toContain(def.distribution.channel);
      }
    }
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
      if (e.meter) {
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
    for (const row of rows(html, "none")) expect(row).toMatch(/Not published.*is not on .+ yet\./);
    expect(html).not.toMatch(/aria-valuenow/);
  });
});

describe("platform at a glance", () => {
  it.each(["SwiftUI", "Compose"] as const)("%s: says which kinds are not yet verified or limited instead of 'Interaction 0/90'", (platform) => {
    const html = renderToStaticMarkup(<PlatformAtAGlance platform={platform} />);
    expect(html).not.toMatch(/\b0\/\d+/);
    for (const kind of ["interaction", "accessibility", "rtl", "largeText"] as const) {
      const e = evidenceStatus(platform, kind);
      if (e.state === "not-yet-verified") expect(html).toMatch(/not yet verified/);
      if (e.state === "limited") expect(html).toContain(`limited evidence (${e.count}/${e.of})`);
    }
  });
});
