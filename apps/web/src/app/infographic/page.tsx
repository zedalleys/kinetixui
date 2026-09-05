import type { Metadata } from "next";
import Link from "next/link";
import { ComingSoon } from "@/components/coming-soon";
import { PipelineInfographic } from "@/components/pipeline-infographic";

export const metadata: Metadata = {
  title: "Infographic",
  description: "The KinetixUI pipeline, drawn to scale — one source, five outputs, four platform libraries. Full interactive version coming soon.",
};

const PLANNED = [
  {
    n: "01",
    label: "Every hop, to scale",
    body: "DTCG source → the Style Dictionary pass → each platform output → every component that rides on it, sized by how much actually changes.",
  },
  {
    n: "02",
    label: "Live numbers",
    body: "Token count, component count per platform, contrast pass rate, bundle size — read straight from the build, not hand-typed.",
  },
  {
    n: "03",
    label: "Change a token, watch it move",
    body: "Pick a semantic token and see the exact set of files, platforms and components a change touches — the kinetics, made literal.",
  },
];

export default function InfographicPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-4">
        <p className="eyebrow">System map</p>
        <ComingSoon />
      </div>

      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">
        Infographic
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        One measured diagram of the whole system: a single design source, the compile step, five
        platform outputs, and the four component libraries that resolve to them. The preview below is
        live — the full, interactive version is next.
      </p>

      {/* live preview */}
      <div className="mt-10">
        <div className="mb-3 flex items-baseline gap-4 border-t border-border pt-3">
          <span className="font-mono text-[11px] font-medium text-primary">[preview]</span>
          <span className="eyebrow">The pipeline, drawn to scale</span>
        </div>
        <PipelineInfographic />
      </div>

      {/* what the full version adds */}
      <div className="mt-14">
        <div className="mb-6 flex items-baseline gap-4 border-t border-border pt-3">
          <span className="font-mono text-[11px] font-medium text-primary">[planned]</span>
          <span className="eyebrow">The full version</span>
        </div>
        <div className="border-t border-border">
          {PLANNED.map((p) => (
            <div
              key={p.n}
              className="grid gap-3 border-b border-border py-7 md:grid-cols-[4rem_1fr] md:gap-8"
            >
              <span className="font-display text-3xl font-bold leading-none text-muted-foreground/40">
                {p.n}
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold">{p.label}</h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        In the meantime, the same story in prose:{" "}
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
