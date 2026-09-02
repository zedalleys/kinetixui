import type { Metadata } from "next";
import Link from "next/link";
import { Blocks } from "lucide-react";

export const metadata: Metadata = { title: "Blocks", description: "Composed sections — coming soon." };

export default function BlocksPage() {
  return (
    <div className="mx-auto flex max-w-screen-xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
      <Blocks className="size-8 text-primary" />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Blocks</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Ready-made sections — auth forms, dashboards, marketing headers — assembled from KinetixUI
        components. Nothing to show until more components ship.
      </p>
      <Link
        href="/docs/components/button"
        className="mt-6 text-sm font-medium text-primary underline underline-offset-4"
      >
        Browse components instead
      </Link>
    </div>
  );
}
