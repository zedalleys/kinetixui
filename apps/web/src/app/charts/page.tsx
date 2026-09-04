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
        and drives colour from the six <code className="text-foreground">--chart-*</code> tokens, so a
        chart re-themes with the rest of the system. Copy a recipe and swap the data.{" "}
        <code className="text-foreground">npx @kinetixui/cli add chart</code>
      </p>
      <ChartsContent />
    </div>
  );
}
