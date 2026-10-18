import type { Metadata } from "next";
import { routeMetadata } from "@/lib/route-seo";
import { ColorsContent } from "./colors-content";

/**
 * /docs/colors — the primitive ramps, browsable.
 *
 * This was a top-level product destination until Create replaced it there. The page itself was never a
 * product: it is reference material about the palette, which is what Docs is for, and the semantic notes
 * on each ramp exist nowhere else. Moving it here rather than deleting it keeps that knowledge and leaves
 * exactly one customization surface on the site.
 *
 * Interactive (copy-to-clipboard, colour-format toggle), so the UI is a client component and this server
 * wrapper carries the metadata.
 */
export const metadata: Metadata = routeMetadata("/docs/colors");

export default function ColorsDocsPage() {
  return <ColorsContent />;
}
