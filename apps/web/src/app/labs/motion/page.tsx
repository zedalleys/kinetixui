import type { Metadata } from "next";
import { MotionLab } from "@/components/motion-lab/motion-lab";
import "./motion-lab.css";

/**
 * /labs/motion — the React Motion Lab.
 *
 * `noindex`, deliberately. This is an engineering surface, not a marketing one: it exists so a premium
 * interaction can be built, interrupted, measured and argued about before anything is promised to a
 * consumer or ported to another platform. Indexing it would put a laboratory in search results beside the
 * documentation, and the SEO contract would then demand a canonical, an og:image, a sitemap entry and an
 * inbound link graph for a page whose whole point is that it is provisional.
 */
export const metadata: Metadata = {
  title: "Motion Lab",
  description:
    "An engineering laboratory for KinetixUI's React motion: selection indicators, variants, interruption and retargeting, under reduced motion and RTL.",
  robots: { index: false, follow: false },
};

export default function MotionLabPage() {
  return (
    <div className="mx-auto max-w-screen-lg px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow">Laboratory</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Motion Lab</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Real components, real interactions, under conditions you choose. Every specimen below is the shipped{" "}
        <code className="text-foreground">@kinetixui/ui</code> component with a laboratory motion layer
        composed over it — nothing here is a screenshot or a recorded clip, and no shipped component file is
        changed to make it work.
      </p>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        The lab exists for the parts of motion that are easy to claim and hard to prove: that an indicator
        interrupted halfway to one item and sent to another continues from where it is currently drawn, that a
        reader who asks for less motion still reaches the same end state, that the geometry mirrors under RTL
        rather than travelling the wrong way, and that none of the variants quietly changes what a screen
        reader is told.
      </p>
      <div className="mt-10">
        <MotionLab />
      </div>
    </div>
  );
}
