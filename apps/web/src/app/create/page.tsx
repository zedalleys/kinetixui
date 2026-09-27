import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import { CreateWorkspace } from "@/components/create/create-workspace";

/**
 * /create — the customization workspace.
 *
 * Interactive, so the UI is a client component and this server wrapper carries the metadata: the same
 * split /blocks, /charts and the two pages this route replaces already use.
 *
 * The description says what the tool does today: one design, resolved once, exported through the four
 * exporters that exist — web CSS, SwiftUI, Jetpack Compose and Flutter. What it still must not say is
 * that any of this is *previewed* anywhere but the web, or that radius and surface reach a native
 * runtime. They do not, and the Export panel says so per target.
 */
export const metadata: Metadata = {
  title: "Create",
  description:
    "Shape the KinetixUI design language visually — theme colour, neutral, radius and surface — preview it on real web components in light and dark, then export the same theme as web CSS, SwiftUI, Jetpack Compose or Flutter.",
  // Self-referencing, though there is no query state to collapse yet — the URL-serialized presets that
  // make this load-bearing are a later change, and the canonical should already be there when they land.
  ...canonical("/create"),
};

export default function CreatePage() {
  return <CreateWorkspace />;
}
