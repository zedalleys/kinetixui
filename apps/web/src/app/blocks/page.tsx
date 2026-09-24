import type { Metadata } from "next";
import { BlocksContent } from "./blocks-content";
import { blockTotal, everyBlockIsFivePlatform, platformsWithBlocks } from "@/lib/blocks";
import { PLATFORM_DEFINITIONS } from "@/lib/platform-parity";

/** "React, Angular, SwiftUI, Jetpack Compose and Flutter" — from the definitions, never typed out. */
const platformList = platformsWithBlocks.map((p) => PLATFORM_DEFINITIONS[p].label);
const platformSentence =
  platformList.length > 1
    ? `${platformList.slice(0, -1).join(", ")} and ${platformList[platformList.length - 1]}`
    : platformList[0];

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
        <code className="text-foreground">npx @kinetixui/cli add …</code>, and adjust.{" "}
        {everyBlockIsFivePlatform ? (
          <>
            All <span className="text-foreground">{blockTotal}</span> carry real source for{" "}
            <span className="text-foreground">{platformSentence}</span> — each one written in its own
            platform&apos;s idiom and compiled there, not translated from the React version.
          </>
        ) : (
          <>
            Each block&apos;s code tab carries every platform it really implements, composed from the same{" "}
            <code className="text-foreground">Kinetix*</code> primitives.
          </>
        )}
      </p>
      <BlocksContent />
    </div>
  );
}
