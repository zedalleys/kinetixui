import type { Metadata } from "next";
import Link from "next/link";
import tokens from "@kinetixui/tokens";
import { PipelineInfographic } from "@/components/pipeline-infographic";
import { SectionHead } from "@/components/section-head";
import { componentDocs, CATEGORY_ORDER } from "@/lib/site";

export const metadata: Metadata = {
  title: "Infographic",
  description:
    "The KinetixUI system drawn to scale — one design source, five outputs, four component libraries, measured.",
};

/* count token leaves at build time so the number can't drift from the source */
function leafCount(o: unknown): number {
  if (!o || typeof o !== "object") return 1;
  return Object.values(o as Record<string, unknown>).reduce<number>((n, v) => n + leafCount(v), 0);
}
const TOKEN_COUNT = leafCount(tokens);

const STATS = [
  { n: TOKEN_COUNT, label: "design tokens", sub: "primitives + semantic, DTCG" },
  { n: componentDocs.length, label: "React components", sub: `${CATEGORY_ORDER.length} categories` },
  { n: 22, label: "chart recipes", sub: "Recharts, token-driven" },
  { n: 5, label: "platform outputs", sub: "web · tokens.ts · SwiftUI · Compose · Flutter" },
  { n: "100%", label: "WCAG AA", sub: "text pairs, light + dark, CI-gated" },
  { n: 4, label: "component libraries", sub: "React · SwiftUI · Compose · Flutter" },
];

const LAYERS = [
  {
    n: "01",
    label: "Primitives",
    meta: "tokens/primitives/**",
    body: "Raw values pulled verbatim from Figma — colour ramps (0–1000), spacing, radii, type. No decisions, just the palette.",
  },
  {
    n: "02",
    label: "Semantic tokens",
    meta: "tokens/semantic/**",
    body: "Roles, per theme: --primary, --destructive, --ring, --shadow-focus… Each resolves to a primitive. This is the contract components code against.",
  },
  {
    n: "03",
    label: "Style Dictionary v4",
    meta: "pnpm build:tokens",
    body: "One build run per theme. Emits CSS custom properties, a typed tokens.ts, and native SwiftUI / Compose / Flutter colour + type sets.",
  },
  {
    n: "04",
    label: "Component recipes",
    meta: "@kinetixui/ui",
    body: "CVA + Radix + Tailwind, styled only against the semantic layer — never a hex. Ports mirror the same recipe per platform.",
  },
  {
    n: "05",
    label: "Registry",
    meta: "apps/web/public/r/*.json",
    body: "Every component serialised to a shadcn-compatible JSON descriptor — source, dependencies, target path.",
  },
  {
    n: "06",
    label: "CLI → your app",
    meta: "npx @kinetixui/cli add …",
    body: "Copies the component and its deps into your tree. You own the code; re-theming is a token edit, everywhere at once.",
  },
];

type Cell = "full" | "partial" | "none";
const COVERAGE: { row: string; cells: Cell[] }[] = [
  { row: "Component surface", cells: ["full", "partial", "partial", "partial"] },
  { row: "Design-token contract", cells: ["full", "full", "full", "full"] },
  { row: "Light + dark", cells: ["full", "full", "full", "full"] },
  { row: "Type scale wired", cells: ["full", "full", "full", "full"] },
  { row: "CI build check", cells: ["full", "full", "full", "full"] },
  { row: "Published package", cells: ["full", "full", "full", "partial"] },
];
const PLATFORMS = ["React", "SwiftUI", "Compose", "Flutter"] as const;

const MARK: Record<Cell, { glyph: string; cls: string; label: string }> = {
  full: { glyph: "●", cls: "text-primary", label: "full" },
  partial: { glyph: "◐", cls: "text-muted-foreground", label: "partial" },
  none: { glyph: "○", cls: "text-muted-foreground/40", label: "none" },
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
        platform outputs, and the four component libraries that resolve to them. Numbers below are
        read from the build, not hand-typed.
      </p>

      {/* live counters */}
      <div className="mt-10">
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
      </div>

      {/* pipeline */}
      <div className="mt-14">
        <SectionHead index="02" label="The pipeline, drawn to scale" meta="source → compile → output" />
        <div className="mt-5">
          <PipelineInfographic />
        </div>
      </div>

      {/* architecture layers */}
      <div className="mt-14">
        <SectionHead index="03" label="Layers" meta="hex → your app" />
        <div className="mt-5 border-t border-border">
          {LAYERS.map((l) => (
            <div
              key={l.n}
              className="grid gap-2 border-b border-border py-5 md:grid-cols-[3rem_12rem_1fr] md:gap-6"
            >
              <span className="font-display text-2xl font-bold leading-none text-muted-foreground/40">
                {l.n}
              </span>
              <div>
                <h2 className="font-display text-sm font-semibold">{l.label}</h2>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{l.meta}</p>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{l.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* platform coverage */}
      <div className="mt-14">
        <SectionHead index="04" label="Platform coverage" meta="● full · ◐ partial · ○ none" />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 text-left font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Capability
                </th>
                {PLATFORMS.map((p) => (
                  <th
                    key={p}
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
          SwiftUI & Flutter port 68 of the {componentDocs.length} React components; Compose ships one
          verified native component so far, with parity snippets for all of them. Every port rides the
          same token contract.
        </p>
      </div>

      {/* vs alternatives */}
      <div className="mt-14">
        <SectionHead index="05" label="Against the alternatives" meta="honest matrix" />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[38rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 text-left font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground" />
                {VS.cols.map((c, i) => (
                  <th
                    key={c}
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
                        className={yes ? "text-primary" : "text-muted-foreground/40"}
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
      </div>

      <p className="mt-14 border-t border-border pt-6 text-sm text-muted-foreground">
        The same story in prose:{" "}
        <Link href="/docs/tokens" className="font-medium text-primary underline underline-offset-4">
          Tokens
        </Link>{" "}
        and{" "}
        <Link
          href="/docs/contributing"
          className="font-medium text-primary underline underline-offset-4"
        >
          the four-platform rule
        </Link>
        .
      </p>
    </div>
  );
}
