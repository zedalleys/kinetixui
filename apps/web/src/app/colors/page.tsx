import type { Metadata } from "next";
import { ColorsContent } from "./colors-content";

// The page itself is interactive (copy-to-clipboard, colour-format toggle), so the UI lives in a client
// component and this server wrapper carries the metadata — the same split /blocks and /charts use.
export const metadata: Metadata = {
  title: "Colors",
  description:
    "Every colour in the KinetixUI palette: the primitive ramps, the semantic tokens they back, and each pair's WCAG contrast in light and dark. Click a swatch to copy its value.",
};

export default function ColorsPage() {
  return <ColorsContent />;
}
