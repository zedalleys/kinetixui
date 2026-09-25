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
 * something in the repository actually does it.
 */
export const metadata: Metadata = {
  title: "Create",
  description:
    "Customize the KinetixUI design language and preview it on real components: set your own theme colours, check WCAG contrast in light and dark, and copy the CSS.",
  // Self-referencing, though there is no query state to collapse yet — the URL-serialized presets that
  // make this load-bearing are a later change, and the canonical should already be there when they land.
  ...canonical("/create"),
};

export default function CreatePage() {
  return <CreateWorkspace />;
}
