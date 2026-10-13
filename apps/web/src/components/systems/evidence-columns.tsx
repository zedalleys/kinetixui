import type { PlatformEvidence } from "@/lib/systems-in-motion";

// Named for the evidence, not the capability: "Accessibility verification: not yet verified" cannot be read as
// "SwiftUI has no accessibility" the way a bare "Accessibility 0 / 90" can.
const KIND_LABEL: Record<PlatformEvidence["evidence"][number]["kind"], string> = {
  build: "Build verification",
  interaction: "Interaction verification",
  accessibility: "Accessibility verification",
  rtl: "RTL verification",
  largeText: "Large-text verification",
  reducedMotion: "Reduced-motion verification",
};

/**
 * "Parity you can inspect": what `platform-parity.json` records about each platform, in columns.
 *
 * Fractions with their denominators, never ticks and never one percentage for the product: a platform's
 * numbers are out of ITS OWN catalogue entries, which is the only denominator that does not flatter the
 * platforms with fewer entries or punish the ones with more. Nothing here is live; it is the manifest this
 * page was built from, and it says so.
 *
 * Each row says how mature the EVIDENCE is ("Not yet verified", "Limited evidence", "Partial", "Verified"; see
 * `evidenceStatus`), never how capable the platform is. "0 / 90" or "1 / 90" over a near-empty meter reads as a
 * failed score, and the generator only ever records evidence found, so those rows are words and a sentence.
 */
export function EvidenceColumns({ platforms }: { platforms: PlatformEvidence[] }) {
  // Styled by `.kx-evidence` in globals.css rather than per-element utility lists: five cards of nine rows repeat
  // the same few class strings dozens of times, and the page sends every one twice (HTML and component payload).
  return (
    <ul data-evidence-columns="" className="kx-evidence grid grid-cols-1 gap-3 [&>*]:min-w-0 sm-rem:grid-cols-2 xl-rem:grid-cols-5">
      {platforms.map((p) => (
        // flat facts, so an opaque card: glass is kept for surfaces that sit over other system information
        <li key={p.platform}>
          <p>
            {p.label}
            {p.maturity !== "stable" ? <span>{p.maturity}</span> : null}
          </p>
          {/* dt and dd straight in the list: a fact needs no row element of its own */}
          <dl>
            <dt>Catalogue entries</dt>
            <dd>
              {p.entries} of {p.total}
            </dd>
            <dt>Verified to at least</dt>
            <dd>{p.floor ?? "not recorded"}</dd>
            <dt>Distribution</dt>
            <dd>{p.distribution}</dd>
          </dl>
          <dl>
            {p.evidence.map((e) => (
              // The state in words first, the count second, the sentence last. A meter (`.kx-meter`, the row's bottom
              // edge drawn in CSS) only where the fraction is substantial: under a zero or a handful it reads as a
              // failing score. dt and dd sit directly in the row (axe: dlitem), and the sentence is a dd of the same
              // dt, so it belongs to the metric. Assistive technology hears the state and the sentence, not "7 slash 90".
              <div
                key={e.kind}
                className={e.meter ? "kx-meter" : "kx-evidence-gap"}
                data-evidence-state={e.state}
                style={e.meter ? { ["--kx-meter" as string]: `${(e.count / e.of) * 100}%` } : undefined}
              >
                <dt>{KIND_LABEL[e.kind]}</dt>
                <dd>
                  {e.label}
                  {e.count > 0 ? (
                    <span aria-hidden="true">
                      {e.count} / {e.of}
                    </span>
                  ) : null}
                </dd>
                <dd className={e.meter ? "sr-only" : undefined}>{e.summary}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
