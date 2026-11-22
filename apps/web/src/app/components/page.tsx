import type { Metadata } from "next";
import { routeMetadata } from "@/lib/route-seo";
import { Suspense } from "react";
import { ComponentGallery } from "@/components/component-gallery";
import { CatalogueStatic } from "@/components/catalogue-static";
import { catalogueFacets } from "@/lib/business-discovery";

export const metadata: Metadata = routeMetadata("/components");

export default function ComponentsPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow">Registry</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Components</h1>
      {/*
        The fallback is the served document, not a loading state. `ComponentGallery` reads
        `useSearchParams()`, so the static prerender emits this fallback in its place — which means a
        reader without JavaScript, and every crawler, gets exactly what is written here. A "Loading…"
        paragraph left /components with no navigable component link at all; `CatalogueStatic` renders
        the whole catalogue as real links on the server. See catalogue-static.tsx.
      */}
      <Suspense fallback={<CatalogueStatic />}>
        {/* the business facets are computed here, on the server, so the discovery index stays out of the client bundle */}
        <ComponentGallery facets={catalogueFacets()} />
      </Suspense>
    </div>
  );
}
