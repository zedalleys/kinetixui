import type { Metadata } from "next";
import { routeMetadata } from "@/lib/route-seo";
import { Suspense } from "react";
import { ComponentGallery, ComponentGalleryFallback } from "@/components/component-gallery";
import { catalogueFacets } from "@/lib/business-discovery";

export const metadata: Metadata = routeMetadata("/components");

export default function ComponentsPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow">Registry</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Components</h1>
      {/*
        The filters live in the URL, and a static page cannot read a query string on the server, so the gallery
        renders client-side from the URL inside Suspense. Its fallback is the same gallery with no filters, which is
        what the HTML carries: every entry, not a "Loading…" line — the one-line fallback cost this page CLS 0.67.
        The business facets are computed here, on the server, so the discovery index stays out of the client bundle.
      */}
      <Suspense fallback={<ComponentGalleryFallback facets={catalogueFacets()} />}>
        <ComponentGallery facets={catalogueFacets()} />
      </Suspense>
    </div>
  );
}
