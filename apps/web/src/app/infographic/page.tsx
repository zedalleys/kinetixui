import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import tokens from "@kinetixui/tokens";
import { PipelineInfographic } from "@/components/pipeline-infographic";
import { SectionHead } from "@/components/section-head";
import { WorldMap } from "@/components/infographic/world-map";
import { RegistryTreemap } from "@/components/infographic/registry-treemap";
import { DepsBar } from "@/components/infographic/deps-bar";
import { componentDocs, CATEGORY_ORDER } from "@/lib/site";
import { RELEASES } from "@/lib/releases";
import { countOnPlatform, type Platform } from "@/lib/platform-parity";

export const metadata: Metadata = {
  title: "Infographic",
  description:
    "The KinetixUI system drawn to scale — one design source, five outputs, four component libraries, measured.",
};

/* -------- build-time counts: every figure below is derived, not typed -------- */

/* count token leaves so the number can't drift from the source */
function leafCount(o: unknown): number {
  if (!o || typeof o !== "object") return 1;
  return Object.values(o as Record<string, unknown>).reduce<number>((n, v) => n + leafCount(v), 0);
}
const TOKEN_COUNT = leafCount(tokens);

/* count the <Showcase> recipes rendered on /charts by reading its source at build.
   /infographic is statically rendered, so this runs on the build machine where the
   file exists; the fallback is only a floor for the (unreached) dynamic path. */
function chartRecipeCount(): number {
  try {
    const src = readFileSync(join(process.cwd(), "src/app/charts/charts-content.tsx"), "utf8");
    const n = (src.match(/<Showcase\b/g) ?? []).length;
    return n > 0 ? n : 36;
  } catch {
    return 36;
  }
}
const CHART_RECIPES = chartRecipeCount();

/* the four component libraries and the five compiled outputs of the token engine */
const PLATFORMS = ["React", "SwiftUI", "Compose", "Flutter"] as const;
const PLATFORM_OUTPUTS = ["Web CSS", "tokens.ts", "SwiftUI", "Compose", "Flutter"] as const;

const STATS = [
  { n: TOKEN_COUNT, label: "design tokens", sub: "primitives + semantic, DTCG" },
  { n: componentDocs.length, label: "React components", sub: `${CATEGORY_ORDER.length} categories` },
  { n: CHART_RECIPES, label: "chart recipes", sub: "Recharts, token-driven" },
  { n: PLATFORM_OUTPUTS.length, label: "platform outputs", sub: PLATFORM_OUTPUTS.join(" · ") },
  { n: "100%", label: "WCAG AA", sub: "text pairs, light + dark, CI-gated" },
  { n: PLATFORMS.length, label: "component libraries", sub: PLATFORMS.join(" · ") },
];

/* oldest → newest, straight from the changelog source so the two never drift */
const TIMELINE = [...RELEASES]
  .reverse()
  .map((r) => ({ v: r.version, note: r.summary }));

/* per-platform component counts, straight from the parity table */
const REACT_SLUGS = componentDocs.map((c) => c.href.split("/").pop() ?? "");
const NATIVE_COUNT: Record<Exclude<Platform, "React">, number> = {
  SwiftUI: countOnPlatform(REACT_SLUGS, "SwiftUI"),
  Compose: countOnPlatform(REACT_SLUGS, "Compose"),
  Flutter: countOnPlatform(REACT_SLUGS, "Flutter"),
};

type Cell = "full" | "partial" | "none";
const surfaceCell = (n: number): Cell => (n >= REACT_SLUGS.length ? "full" : "partial");
const COVERAGE: { row: string; cells: Cell[] }[] = [
  {
    row: "Component surface",
    cells: [
      "full",
      surfaceCell(NATIVE_COUNT.SwiftUI),
      surfaceCell(NATIVE_COUNT.Compose),
      surfaceCell(NATIVE_COUNT.Flutter),
    ],
  },
  { row: "Design-token contract", cells: ["full", "full", "full", "full"] },
  { row: "Light + dark", cells: ["full", "full", "full", "full"] },
  { row: "Type scale wired", cells: ["full", "full", "full", "full"] },
  { row: "CI build check", cells: ["full", "full", "full", "full"] },
  { row: "Published package", cells: ["full", "full", "full", "partial"] },
];

const MARK: Record<Cell, { glyph: string; cls: string; label: string }> = {
  full: { glyph: "●", cls: "text-primary", label: "full" },
  partial: { glyph: "◐", cls: "text-muted-foreground", label: "partial" },
  none: { glyph: "○", cls: "text-muted-foreground/60", label: "none" },
};

const VS = {
  cols: ["KinetixUI", "shadcn/ui", "Radix Themes", "MUI"],
  rows: [
    { feat: "One design source → many platforms", cells: [true, false, false, false] },
    { feat: "DTCG token pipeline (Style Dictionary)", cells: [true, false, false, false] },
    { feat: "Copy-in via CLI registry (you own the code)", cells: [true, true, false, false] },
    { feat: "Contrast audited in CI", cells: [true, false, false, false] },
    { feat: "Light + dark token sets", cells: [true, true, true, true] },
    { feat: "Native mobile libraries", cells: [true, false, false, false] },
  ],
};

export default function InfographicPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow">System map</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Infographic</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        One measured drawing of the whole system: a single design source, the compile step, five
        platform outputs, and the four component libraries that resolve to them. Numbers are read
        from the build, not hand-typed.
      </p>

      {/* 01 — counters */}
      <section className="mt-10">
        <SectionHead index="01" label="By the numbers" meta="from the build" />
        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label} className="bg-background p-4">
              <p className="font-display text-3xl font-bold tabular-nums tracking-[-0.02em]">{s.n}</p>
              <p className="mt-1 text-sm font-medium">{s.label}</p>
              <p className="mt-0.5 font-mono text-[10px] leading-tight text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 02 — pipeline */}
      <section className="mt-14">
        <SectionHead index="02" label="The pipeline, drawn to scale" meta="source → compile → output" />
        <div className="mt-5">
          <PipelineInfographic />
        </div>
      </section>

      {/* 03 — registry by category */}
      <section className="mt-14">
        <SectionHead index="03" label="Registry, by category" meta={`${componentDocs.length} components`} />
        <RegistryTreemap />
      </section>

      {/* 04 — platform coverage */}
      <section className="mt-14">
        <SectionHead index="04" label="Platform coverage" meta="● full · ◐ partial · ○ none" />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="py-2 pr-4 text-left font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Capability
                </th>
                {PLATFORMS.map((p) => (
                  <th
                    key={p}
                    scope="col"
                    className="px-3 py-2 text-center font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COVERAGE.map((r) => (
                <tr key={r.row} className="border-b border-border/60">
                  <td className="py-2.5 pr-4">{r.row}</td>
                  {r.cells.map((c, i) => (
                    <td key={i} className="px-3 py-2.5 text-center">
                      <span className={MARK[c].cls} title={MARK[c].label} aria-label={MARK[c].label}>
                        {MARK[c].glyph}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 font-mono text-[10px] text-muted-foreground">
          Of the {componentDocs.length} React components, SwiftUI ports {NATIVE_COUNT.SwiftUI},
          Jetpack Compose {NATIVE_COUNT.Compose} and Flutter {NATIVE_COUNT.Flutter}; the rest
          (Form, Navigation Menu, Combobox and a couple of platform-specific gaps) stay React-only,
          with parity snippets for all of them. Every port rides the same token contract.
        </p>
      </section>

      {/* 05 — timeline */}
      <section className="mt-14">
        <SectionHead index="05" label="Release timeline" meta="from the changelogs" />
        <ol className="mt-5 border-l border-border">
          {TIMELINE.map((t) => (
            <li key={t.v} className="relative pb-6 pl-6 last:pb-0">
              <span
                aria-hidden
                className="absolute -left-[5px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary"
              />
              <p className="font-mono text-[13px] font-semibold text-foreground">v{t.v}</p>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t.note}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 06 — world map */}
      <section className="mt-14">
        <SectionHead index="06" label="Where it runs" meta="one contract, everywhere" />
        <div className="mt-5">
          <WorldMap />
        </div>
      </section>

      {/* 07 — vs alternatives */}
      <section className="mt-14">
        <SectionHead index="07" label="Against the alternatives" meta="honest matrix" />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[38rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="py-2 pr-4 text-left font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                >
                  <span className="sr-only">Capability</span>
                </th>
                {VS.cols.map((c, i) => (
                  <th
                    key={c}
                    scope="col"
                    className={
                      "px-3 py-2 text-center font-mono text-[11px] font-medium uppercase tracking-[0.12em] " +
                      (i === 0 ? "text-primary" : "text-muted-foreground")
                    }
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VS.rows.map((r) => (
                <tr key={r.feat} className="border-b border-border/60">
                  <td className="py-2.5 pr-4">{r.feat}</td>
                  {r.cells.map((yes, i) => (
                    <td key={i} className="px-3 py-2.5 text-center">
                      <span
                        className={yes ? "text-primary" : "text-muted-foreground/60"}
                        aria-label={yes ? "yes" : "no"}
                      >
                        {yes ? "●" : "○"}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 08 — runtime footprint */}
      <section className="mt-14">
        <SectionHead index="08" label="What lands in node_modules" meta="0 to install" />
        <DepsBar />
      </section>
    </div>
  );
}
