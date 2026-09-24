import type { Metadata } from "next";
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
export const metadata: Metadata = {
  title: "Colors",
  description:
    "Every colour in the KinetixUI palette: the primitive ramps, the semantic tokens they back, and each pair's WCAG contrast in light and dark. Click a swatch to copy its value.",
};

export default function ColorsDocsPage() {
  return <ColorsContent />;
}
