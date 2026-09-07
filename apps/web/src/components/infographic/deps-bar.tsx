/**
 * "What lands in node_modules" — KinetixUI ships nothing to install (components
 * are copied into your repo by the CLI), so its runtime footprint is 0. The
 * comparison figures are approximate min+gzip of each library's top-level import
 * (bundlephobia, rounded); they're illustrative, not build-derived like the rest
 * of this page.
 */

type Row = { name: string; kb: number; note?: string; self?: boolean };

const ROWS: Row[] = [
  { name: "antd", kb: 380 },
  { name: "@chakra-ui/react", kb: 118 },
  { name: "@mui/material", kb: 91 },
  { name: "react-bootstrap", kb: 25 },
  { name: "KinetixUI", kb: 0, note: "copy-in — 0 to install", self: true },
];

const MAX = Math.max(...ROWS.map((r) => r.kb));

export function DepsBar() {
  return (
    <figure className="mt-5">
      <div className="space-y-2.5">
        {ROWS.map((r) => (
          <div key={r.name} className="grid grid-cols-[9rem_1fr] items-center gap-3 sm:grid-cols-[11rem_1fr]">
            <span
              className={
                "truncate text-right font-mono text-[11px] " +
                (r.self ? "font-semibold text-foreground" : "text-muted-foreground")
              }
            >
              {r.name}
            </span>
            <div className="flex items-center gap-2">
              <div
                className={
                  "h-5 rounded-sm " + (r.self ? "bg-primary" : "bg-border")
                }
                style={{ width: `${Math.max((r.kb / MAX) * 100, r.self ? 0 : 1.5)}%` }}
              />
              <span
                className={
                  "shrink-0 font-mono text-[11px] tabular-nums " +
                  (r.self ? "font-semibold text-primary" : "text-muted-foreground")
                }
              >
                {r.note ?? `≈ ${r.kb} kB`}
              </span>
            </div>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
        KinetixUI isn&rsquo;t an installed package — the CLI copies component source into your repo,
        so it adds no runtime dependency and no version lock. A pasted component pulls in only its
        own primitives (e.g. Button ≈ 2&nbsp;kB of JSX you own). Other figures: approximate min+gzip
        of the top-level import, via bundlephobia.
      </figcaption>
    </figure>
  );
}
