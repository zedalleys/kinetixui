import * as React from "react";

/**
 * The token pipeline as a measured drawing: source → compile → platform
 * output, with the flow bars animated (CSS only; static under
 * `prefers-reduced-motion`). Used on /infographic and the home page.
 */
const STAGES = [
  { n: "01", label: "DTCG source", sub: "tokens/**" },
  { n: "02", label: "Style Dictionary v4", sub: "pnpm build:tokens" },
  { n: "03", label: "Platform output", sub: "dist/{web,ios,android,flutter}" },
] as const;

const OUTPUTS = ["Web CSS", "tokens.ts", "SwiftUI", "Compose", "Flutter"] as const;

export function PipelineInfographic() {
  return (
    <div className="kx-frame w-full border border-border bg-background/60 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {STAGES.map((s, i) => (
          <React.Fragment key={s.n}>
            <div className="flex-1 rounded-md border border-border/70 bg-background p-3">
              <p className="font-mono text-[10px] text-primary">[{s.n}]</p>
              <p className="mt-1 font-display text-sm font-semibold text-foreground">{s.label}</p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{s.sub}</p>
              {i === STAGES.length - 1 && (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {OUTPUTS.map((o) => (
                    <span key={o} className="kx-pipe-chip">
                      {o}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {i < STAGES.length - 1 && <span className="kx-flow-bar hidden sm:block" />}
          </React.Fragment>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>one source</span>
        <span className="text-foreground">
          72 components · 4 platform libraries · light + dark
        </span>
      </div>
    </div>
  );
}
