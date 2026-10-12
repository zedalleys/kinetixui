import type { PlatformEvidence } from "@/lib/systems-in-motion";

const KIND_LABEL: Record<PlatformEvidence["evidence"][number]["kind"], string> = {
  build: "Build",
  interaction: "Interaction",
  accessibility: "Accessibility",
  rtl: "RTL",
  largeText: "Large text",
  reducedMotion: "Reduced motion",
};

/**
 * "Parity you can inspect": what `platform-parity.json` records about each platform, in columns.
 *
 * Fractions with their denominators, never ticks and never one percentage for the product: a platform's
 * numbers are out of ITS OWN catalogue entries, which is the only denominator that does not flatter the
 * platforms with fewer entries or punish the ones with more. Nothing here is live; it is the manifest this
 * page was built from, and it says so.
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
              // dt and dd sit directly in the row (axe: dlitem); the meter is the row's own bottom edge (`.kx-meter`),
              // drawn in CSS from the fraction, so a row is three elements rather than five
              <div key={e.kind} className="kx-meter" style={{ ["--kx-meter" as string]: `${e.of ? (e.count / e.of) * 100 : 0}%` }}>
                <dt>{KIND_LABEL[e.kind]}</dt>
                <dd>
                  {e.count} / {e.of}
                </dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
