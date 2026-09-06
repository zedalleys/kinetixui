import type { Metadata } from "next";
import { BlocksContent } from "./blocks-content";

export const metadata: Metadata = {
  title: "Blocks",
  description: "Ready-made sections assembled from KinetixUI components.",
};

export default function BlocksPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow">Compositions</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Blocks</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Whole sections put together from the registry — sign-in cards, dashboard headers, pricing,
        toolbars. Copy the code, add the components it uses with{" "}
        <code className="text-foreground">npx @kinetixui/cli add …</code>, and adjust. Each block&apos;s
        code tab also carries the <span className="text-foreground">Compose</span> and{" "}
        <span className="text-foreground">Flutter</span> equivalent, composed from the same{" "}
        <code className="text-foreground">Kinetix*</code> primitives.
      </p>
      <BlocksContent />
    </div>
  );
}
