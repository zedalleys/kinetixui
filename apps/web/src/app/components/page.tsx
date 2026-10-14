import type { Metadata } from "next";
import { routeMetadata } from "@/lib/route-seo";
import { Suspense } from "react";
import { ComponentGallery } from "@/components/component-gallery";
import { catalogueFacets } from "@/lib/business-discovery";

export const metadata: Metadata = routeMetadata("/components");

export default function ComponentsPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow">Registry</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Components</h1>
      <Suspense fallback={<p className="mt-6 font-mono text-body-sm text-muted-foreground">Loading…</p>}>
        {/* the business facets are computed here, on the server, so the discovery index stays out of the client bundle */}
        <ComponentGallery facets={catalogueFacets()} />
      </Suspense>
    </div>
  );
}
