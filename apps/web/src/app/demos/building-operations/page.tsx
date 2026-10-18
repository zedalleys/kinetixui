import type { Metadata } from "next";
import { routeMetadata } from "@/lib/route-seo";
import { BuildingOpsDemo } from "@/components/building-ops/building-ops-demo";

/**
 * /demos/building-operations — a commercial building operations console over simulated data.
 *
 * The page is a server component that renders the demo at the scenario's start time; time only moves after
 * hydration, so the server HTML and the first client render match. `?scenario=` picks one of the five scripted
 * scenarios on the client, which is why the page declares its canonical URL without the query.
 */
export const metadata: Metadata = routeMetadata("/demos/building-operations");

export default function BuildingOperationsPage() {
  return <BuildingOpsDemo />;
}
