import type { Metadata } from "next";
import { BuildingOpsDemo } from "@/components/building-ops/building-ops-demo";
import { canonical } from "@/lib/seo";

/**
 * /demos/building-operations — a commercial building operations console over simulated data.
 *
 * The page is a server component that renders the demo at the scenario's start time; time only moves after
 * hydration, so the server HTML and the first client render match. `?scenario=` picks one of the five scripted
 * scenarios on the client, which is why the page declares its canonical URL without the query.
 */
export const metadata: Metadata = {
  title: "Building Operations demo",
  description:
    "A simulated commercial building operations console built with KinetixUI: floors, an interactive floor plan, occupancy against zone capacity, camera placeholders with connection status and telemetry, and alerts. Five scripted scenarios, including a crowded zone, an offline camera, stale telemetry and recovery after a link failure. No real devices, video or people detection.",
  ...canonical("/demos/building-operations"),
  openGraph: {
    title: "KinetixUI Building Operations demo (simulated)",
    description:
      "Floors, occupancy, camera placeholders and alerts that stay honest when readings go stale or devices drop off. Simulated data only.",
    url: "/demos/building-operations",
    type: "website",
  },
};

export default function BuildingOperationsPage() {
  return <BuildingOpsDemo />;
}
