import { inspectAttrs } from "@/lib/analytics-surfaces";
import type { PlatformEvidence } from "@/lib/systems-in-motion";
import { PlatformMark } from "./platform-marks";

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
 * The four evidence states, in descending strength, with the word used when counting dimensions rather than
 * entries. The tally line says "2 verified · 2 partial", never "2 of 6": a fraction of dimensions would be the
 * single score this section exists to refuse, and would weigh a build check the same as an RTL check.
 */
const TALLY_LABEL = [
  ["verified", "verified"],
  ["partial", "partial"],
  ["limited", "limited evidence"],
  ["not-yet-verified", "not yet verified"],
] as const;

/** How many of a platform's dimensions sit in each state, strongest first, states with none left out. */
function tally(evidence: PlatformEvidence["evidence"]) {
  return TALLY_LABEL.map(([state, label]) => ({ state, label, count: evidence.filter((e) => e.state === state).length })).filter(
    (t) => t.count > 0,
  );
}

/**
 * "Claims you can check": what `platform-parity.json` records about each platform, in columns.
 *
 * Fractions with their denominators, never ticks and never one percentage for the product: a platform's
 * numbers are out of ITS OWN catalogue entries, which is the only denominator that does not flatter the
 * platforms with fewer entries or punish the ones with more. Nothing here is live; it is the manifest this
 * page was built from, and it says so.
 *
 * Each row says how mature the EVIDENCE is ("Not yet verified", "Limited evidence", "Partial", "Verified"; see
 * `evidenceStatus`), never how capable the platform is. "0 / 90" or "1 / 90" over a near-empty meter reads as a
 * failed score, and the generator only ever records evidence found, so those rows are words and a sentence.
 *
 * TWO DEPTHS, because five columns of nine rows each is a wall of numbers that is read as decoration rather
 * than as evidence. At rest a card is its platform (mark and name), the three facts that place it (how much of
 * the catalogue it covers, the floor that catalogue is verified to, where you get it), and the shape of its
 * evidence in words. The six dimensions and their sentences live in a native `<details>` — keyboard operable,
 * announced as a disclosure, findable by in-page search, and open-able without JavaScript, so nothing here is
 * hidden from anyone who wants it. The tally line is NOT a score: it keeps the four states apart, which is the
 * whole argument of the section.
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
            {/* decorative: the platform's name is right beside it, so a reader hears "React", not "React logo, React" */}
            <PlatformMark platform={p.platform} className="size-4" />
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
          {/* The shape of the evidence before the evidence itself. Counts of DIMENSIONS, each state named. */}
          <p className="kx-evidence-tally">
            <span className="sr-only">Across {p.evidence.length} verification dimensions: </span>
            {tally(p.evidence).map((t) => (
              <span key={t.state} data-tally-state={t.state}>
                {t.count} {t.label}
              </span>
            ))}
          </p>
          <details className="kx-evidence-more">
            <summary {...inspectAttrs("homepage", "verification_details")}>
              <span aria-hidden="true">›</span>
              All {p.evidence.length} dimensions<span className="sr-only"> of {p.label} evidence</span>
            </summary>
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
          </details>
        </li>
      ))}
    </ul>
  );
}
