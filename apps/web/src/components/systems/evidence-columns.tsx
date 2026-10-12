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
  return (
    <ul className="grid grid-cols-1 gap-3 [&>*]:min-w-0 sm-rem:grid-cols-2 xl-rem:grid-cols-5">
      {platforms.map((p) => (
        <li key={p.platform} className="kx-glass flex flex-col rounded-xl p-4">
          <p className="font-display text-base font-semibold text-foreground">
            {p.label}
            {p.maturity !== "stable" ? <span className="ms-2 font-mono text-xs font-normal text-primary">{p.maturity}</span> : null}
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm">
            <div>
              <dt className="font-mono text-xs text-muted-foreground">Catalogue entries</dt>
              <dd className="text-foreground">
                {p.entries} of {p.total}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs text-muted-foreground">Verified to at least</dt>
              <dd className="text-foreground">{p.floor ?? "not recorded"}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs text-muted-foreground">Distribution</dt>
              <dd className="text-foreground">{p.distribution}</dd>
            </div>
          </dl>
          <dl className="mt-4 grid grid-cols-1 gap-2 border-t border-border pt-3">
            {p.evidence.map((e) => (
              // dt and dd sit directly in the row (axe: dlitem); the bar hangs off the row's bottom edge
              <div key={e.kind} className="relative flex items-baseline justify-between gap-2 pb-2 text-xs">
                <dt className="text-muted-foreground">{KIND_LABEL[e.kind]}</dt>
                <dd className="font-mono text-foreground">
                  {e.count} / {e.of}
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 block h-1 overflow-hidden rounded-full bg-foreground/10">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${e.of ? (e.count / e.of) * 100 : 0}%` }}
                    />
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
