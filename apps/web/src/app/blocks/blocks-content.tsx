"use client";

import { Showcase } from "@/components/showcase";
import { blocks } from "@/lib/blocks";
import { PLATFORM_DEFINITIONS } from "@/lib/platform-parity";
import { blockPreviews } from "@/registry/block-previews";
import { blockExampleSource } from "@/registry/block-examples.generated";

/**
 * Every block on the page, driven by blocks.manifest.json.
 *
 * This file used to be 952 lines: each block's preview written out as JSX, and next to it a hand-typed copy of
 * the "same" code for React, Compose and Flutter. Nothing checked the copies, and they had already drifted.
 * Now the preview renders the fixture and the code tab shows that fixture's own extracted source, so the two
 * cannot disagree — and a platform only appears if `blocks.manifest.json` points at a real file for it, which
 * `check:block-source` verifies and the native workflows compile.
 */
export function BlocksContent() {
  return (
    <div className="mt-10 grid gap-12">
      {blocks.map((block) => {
        const Preview = blockPreviews[block.slug];
        const sources = blockExampleSource[block.slug as keyof typeof blockExampleSource] as Record<string, string> | undefined;
        if (!Preview || !sources) return null; // unreachable: blocks.test.tsx fails if either is missing
        return (
          <Showcase
            key={block.slug}
            // a per-block anchor so a single block can be linked to (the page had none before)
            id={block.slug}
            title={block.title}
            description={block.description}
            contentClassName={block.contentClassName}
            sources={sources}
            platforms={block.platforms.map((p) => PLATFORM_DEFINITIONS[p].label)}
          >
            <Preview />
          </Showcase>
        );
      })}
    </div>
  );
}
