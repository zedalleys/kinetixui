/**
 * slug → how that IoT example's live preview reaches the page.
 *
 * The same manifest (`iot-examples.manifest.json`) names every example; this file says which of them render
 * on the server and which load on demand:
 *
 * - **Static** examples (`iotStaticPreviews`) have no state and no `"use client"`, so they are rendered
 *   here, on the server, and cost the browser no JavaScript.
 * - **Interactive** examples are client components with a simulation clock. They are listed in
 *   `iot-preview-loaders.ts` as dynamic imports and mounted by `LazyPreview` when their section nears the
 *   viewport, so `/iot` does not ship all of them in its first load.
 *
 * `iot-examples.test.ts` checks the union of the two against the manifest, so an example cannot ship without
 * a preview and a preview cannot linger after its example is gone.
 */
import type { ComponentType } from "react";
import { ConnectionTroubleshootingExample } from "@/examples/iot/connection-troubleshooting";
import { DeviceFleetExample } from "@/examples/iot/device-fleet";
import { TelemetryBoardExample } from "@/examples/iot/telemetry-board";

export const iotStaticPreviews: Record<string, ComponentType> = {
  "device-fleet": DeviceFleetExample,
  "telemetry-board": TelemetryBoardExample,
  "connection-troubleshooting": ConnectionTroubleshootingExample,
};

/** Examples driven by the scripted simulation. Their placeholder carries the disclosure until they mount. */
export const IOT_SIMULATED_SLUGS: ReadonlySet<string> = new Set([
  "state-honesty",
  "smart-space-environment",
  "agritech-environment",
  "operations-environment",
  "device-detail",
  "automation-builder",
  "pairing-flow",
  "telemetry-history",
  "alert-center",
]);

/**
 * Reserved height per interactive example at phone, tablet and desktop widths (about 390, 768 and 1440 px),
 * so the placeholder is the size of the mounted example and mounting it moves nothing below it. Measured
 * from the built page in a real browser, not guessed; the tall environments are tall (a whole home, farm or
 * production site). If an example's content changes a lot, re-measure. Full class names so Tailwind sees them.
 */
export const IOT_PREVIEW_HEIGHT: Record<string, string> = {
  "smart-space-environment": "min-h-[240rem] md:min-h-[312rem] lg:min-h-[218rem]",
  "agritech-environment": "min-h-[335rem] md:min-h-[365rem] lg:min-h-[248rem]",
  "operations-environment": "min-h-[295rem] md:min-h-[310rem] lg:min-h-[190rem]",
  "state-honesty": "min-h-[108rem] md:min-h-[80rem] lg:min-h-[65rem]",
  "telemetry-history": "min-h-[134rem] md:min-h-[102rem] lg:min-h-[61rem]",
  "alert-center": "min-h-[84rem] md:min-h-[45rem] lg:min-h-[42rem]",
  "automation-builder": "min-h-[135rem] md:min-h-[92rem] lg:min-h-[84rem]",
  "pairing-flow": "min-h-[48rem] md:min-h-[42rem] lg:min-h-[41rem]",
  "device-detail": "min-h-[118rem] md:min-h-[136rem] lg:min-h-[81rem]",
  "device-dashboard": "min-h-[199rem] md:min-h-[141rem] lg:min-h-[77rem]",
  "connected-space": "min-h-[113rem] md:min-h-[81rem] lg:min-h-[46rem]",
  "alert-inbox": "min-h-[22rem] md:min-h-[20rem] lg:min-h-[20rem]",
};
export const IOT_PREVIEW_HEIGHT_DEFAULT = "min-h-[40rem] lg:min-h-[32rem]";
