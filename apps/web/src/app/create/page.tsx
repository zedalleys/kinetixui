import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@kinetixui/ui";
import { routeMetadata } from "@/lib/route-seo";
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
export const metadata: Metadata = routeMetadata("/create");

export default function CreatePage() {
  return <>
    {process.env.NODE_ENV === "development" && process.env.KINETIX_CREATE_DEV === "1" && <div className="mx-auto max-w-[96rem] px-4 pt-6 sm:px-6 lg:px-8"><Button asChild variant="Outline"><Link href="/create/studio">Open Create Studio · local development</Link></Button></div>}
    <CreateWorkspace />
  </>;
}
