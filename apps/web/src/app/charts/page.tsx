import type { Metadata } from "next";
import { ChartsContent } from "./charts-content";

export const metadata: Metadata = {
  title: "Charts",
  description: "Recharts, themed with the KinetixUI token contract.",
};

export default function ChartsPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow">Data viz</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Charts</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        The <code className="text-foreground">Chart</code> component wraps{" "}
        <a
          href="https://recharts.org"
          className="font-medium text-primary underline underline-offset-4"
          target="_blank"
          rel="noreferrer"
        >
          Recharts
        </a>{" "}
        and drives colour from the five <code className="text-foreground">--chart-1…5</code> tokens,
        so a chart re-themes with the rest of the system. Thirteen recipes below — bar (grouped,
        stacked, horizontal), line, step, area, sparkline, composed, pie, donut, radial bar, radar
        and scatter. Copy one and swap the data.{" "}
        <code className="text-foreground">npx @kinetixui/cli add chart</code>. The native ports carry
        the common types too — SwiftUI over the system{" "}
        <code className="text-foreground">Charts</code> framework, Flutter as a hand-drawn bar chart.
      </p>
      <ChartsContent />
    </div>
  );
}
