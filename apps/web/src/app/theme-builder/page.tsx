import type { Metadata } from "next";
import { ThemeBuilderContent } from "./theme-builder-content";

// Interactive (paste a palette, preview, copy CSS), so the UI is a client component and this server wrapper
// carries the metadata — the same split /blocks and /charts use.
export const metadata: Metadata = {
  title: "Theme builder",
  description:
    "Bring your own palette and get KinetixUI theme CSS back: map your colours onto the semantic tokens, preview components in light and dark, and check the contrast before you copy.",
};

export default function ThemeBuilderPage() {
  return <ThemeBuilderContent />;
}
