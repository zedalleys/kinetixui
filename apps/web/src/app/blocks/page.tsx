import type { Metadata } from "next";
import { BlocksContent } from "./blocks-content";

export const metadata: Metadata = {
  title: "Blocks",
  description: "Ready-made sections assembled from KinetixUI components.",
};

export default function BlocksPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Blocks</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Whole sections put together from the registry — sign-in cards, dashboard headers, pricing,
        toolbars. Copy the code, add the components it uses with{" "}
        <code className="text-foreground">npx @kinetixui/cli add …</code>, and adjust.
      </p>
      <BlocksContent />
    </div>
  );
}
