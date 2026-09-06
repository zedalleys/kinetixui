import type { Metadata } from "next";
import Link from "next/link";
import tokens from "@kinetixui/tokens";
import { PipelineInfographic } from "@/components/pipeline-infographic";
import { SectionHead } from "@/components/section-head";
import { WorldMap } from "@/components/infographic/world-map";
import { ContrastGrid } from "@/components/infographic/contrast-grid";
import { TokenExplorer } from "@/components/infographic/token-explorer";
import { RegistryTreemap } from "@/components/infographic/registry-treemap";
import { componentDocs, CATEGORY_ORDER } from "@/lib/site";
import { PRIMITIVE } from "@/lib/component-registry";

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
  { n: 36, label: "chart recipes", sub: "Recharts, token-driven" },
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

const ANATOMY = [
  { prop: "background", token: "--primary" },
  { prop: "text colour", token: "--primary-foreground" },
  { prop: "corner radius", token: "--radius-md" },
  { prop: "padding", token: "--spacing-3 / --spacing-4" },
  { prop: "font", token: "--text-label-lg" },
  { prop: "focus ring", token: "--shadow-focus" },
  { prop: "hover fill (ghost)", token: "--accent" },
  { prop: "disabled", token: "opacity + --muted-foreground" },
];

const TIMELINE = [
  { v: "0.3.0", note: "First public registry — 60-odd components, the token contract, dark mode." },
  { v: "0.3.1", note: "CLI hardening; registry schema settled." },
  { v: "0.4.0", note: "72 components, SwiftUI + Compose + Flutter ports, type scale wired everywhere." },
  { v: "0.4.1", note: "Light --destructive to WCAG AA; repo moved to github.com/zedalleys." },
  {
    v: "0.4.2",
    note: "Dark focus-ring token set, --warning to AA, NumberInput / chart / mobile-nav a11y, --chart-6…8.",
  },
];

const slugOf = (href: string) => href.split("/").pop() ?? "";
const BY_PRIMITIVE = (() => {
  const groups = new Map<string, string[]>();
  for (const c of componentDocs) {
    const key = PRIMITIVE[slugOf(c.href)] ?? "own / composition";
    groups.set(key, [...(groups.get(key) ?? []), c.title]);
  }
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
})();

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

      {/* 03 — layers */}
      <section className="mt-14">
        <SectionHead index="03" label="Layers" meta="hex → your app" />
        <div className="mt-5 border-t border-border">
          {LAYERS.map((l) => (
            <div
              key={l.n}
              className="grid gap-2 border-b border-border py-5 md:grid-cols-[3rem_12rem_1fr] md:gap-6"
            >
              <span className="font-display text-2xl font-bold leading-none text-muted-foreground/60">
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
      </section>

      {/* 04 — anatomy */}
      <section className="mt-14">
        <SectionHead index="04" label="Anatomy of a Button" meta="every property → a token" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {ANATOMY.map((a) => (
            <div
              key={a.prop}
              className="flex items-baseline justify-between gap-3 rounded-md border border-border bg-muted/20 px-3.5 py-2.5"
            >
              <span className="text-sm">{a.prop}</span>
              <code className="font-mono text-[12px] text-primary">{a.token}</code>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing in the recipe is a literal value — the whole component is a wiring diagram over the
          token contract, which is why one edit re-skins it on every platform.
        </p>
      </section>

      {/* 05 — change a token */}
      <section className="mt-14">
        <SectionHead index="05" label="Change a token, watch it move" meta="interactive" />
        <TokenExplorer />
      </section>

      {/* 06 — contrast grid */}
      <section className="mt-14">
        <SectionHead index="06" label="Contrast grid" meta="light + dark, WCAG" />
        <ContrastGrid />
      </section>

      {/* 07 — registry by category */}
      <section className="mt-14">
        <SectionHead index="07" label="Registry, by category" meta={`${componentDocs.length} components`} />
        <RegistryTreemap />
      </section>

      {/* 08 — component → primitive */}
      <section className="mt-14">
        <SectionHead index="08" label="What every component sits on" meta="component → primitive" />
        <div className="mt-5 space-y-4 border-t border-border pt-4">
          {BY_PRIMITIVE.map(([prim, names]) => (
            <div key={prim} className="grid gap-2 md:grid-cols-[14rem_1fr] md:gap-6">
              <div className="font-mono text-[12px]">
                <span className="text-foreground">{prim}</span>
                <span className="ml-2 text-muted-foreground">{names.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {names.map((n) => (
                  <span
                    key={n}
                    className="rounded border border-border/70 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 09 — platform coverage */}
      <section className="mt-14">
        <SectionHead index="09" label="Platform coverage" meta="● full · ◐ partial · ○ none" />
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
          SwiftUI & Flutter port 68 of the {componentDocs.length} React components; Compose ships one
          verified native component so far, with parity snippets for all of them. Every port rides the
          same token contract.
        </p>
      </section>

      {/* 10 — timeline */}
      <section className="mt-14">
        <SectionHead index="10" label="Release timeline" meta="from the changelogs" />
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

      {/* 11 — world map */}
      <section className="mt-14">
        <SectionHead index="11" label="Where it runs" meta="one contract, everywhere" />
        <div className="mt-5">
          <WorldMap />
        </div>
      </section>

      {/* 12 — vs alternatives */}
      <section className="mt-14">
        <SectionHead index="12" label="Against the alternatives" meta="honest matrix" />
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
