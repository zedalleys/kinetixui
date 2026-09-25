import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import { CreateWorkspace } from "@/components/create/create-workspace";

/**
 * /create — the customization workspace.
 *
 * Interactive, so the UI is a client component and this server wrapper carries the metadata: the same
 * split /blocks, /charts and the two pages this route replaces already use.
 *
 * The description says what the tool does today. It produces web CSS custom properties; it does not
 * produce SwiftUI, Compose, Flutter or Angular themes, and nothing here should imply otherwise until
 * something in the repository actually does it. "Create once, export everywhere" is the sentence this
 * page exists to not write.
 */
export const metadata: Metadata = {
  title: "Create",
  description:
    "Shape the KinetixUI design language visually — theme colour, neutral, radius and surface — preview it on real components in light and dark, then inspect the semantic tokens and web CSS underneath.",
  // Self-referencing, though there is no query state to collapse yet — the URL-serialized presets that
  // make this load-bearing are a later change, and the canonical should already be there when they land.
  ...canonical("/create"),
};

export default function CreatePage() {
  return <CreateWorkspace />;
}
