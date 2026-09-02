import type { Metadata } from "next";
import { LineChart } from "lucide-react";

export const metadata: Metadata = { title: "Charts", description: "Chart primitives — coming soon." };

export default function ChartsPage() {
  return (
    <div className="mx-auto flex max-w-screen-xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
      <LineChart className="size-8 text-primary" />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Charts</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Chart components themed with the KinetixUI token contract. Planned once the core set lands —
        the palette (six ramps) is already in place on the{" "}
        <a href="/colors" className="font-medium text-primary underline underline-offset-4">Colors</a>{" "}
        page.
      </p>
    </div>
  );
}
