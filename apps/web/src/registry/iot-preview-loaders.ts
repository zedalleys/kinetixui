/**
 * slug → a dynamic import of that IoT example's live preview: the interactive half of `iot-previews.tsx`.
 *
 * Kept in its own module because it is imported by a **client** component (`LazyPreview`) while
 * `iot-previews.tsx` is imported by a server one. If the two lived together, the three server-rendered
 * examples would be dragged into the client bundle just to sit beside these loaders.
 *
 * Each example is a separate chunk, fetched when its section nears the viewport or its tab is opened, not
 * when the page loads. That is what keeps `/iot` from shipping every simulation to a reader who scrolls
 * halfway down.
 */
import type { ComponentType } from "react";

type Loader = () => Promise<{ default: ComponentType }>;

export const iotPreviewLoaders: Record<string, Loader> = {
  "state-honesty": () => import("@/examples/iot/state-honesty").then((m) => ({ default: m.StateHonestyExample })),
  "smart-space-environment": () => import("@/examples/iot/smart-space-environment").then((m) => ({ default: m.SmartSpaceEnvironmentExample })),
  "agritech-environment": () => import("@/examples/iot/agritech-environment").then((m) => ({ default: m.AgritechEnvironmentExample })),
  "operations-environment": () => import("@/examples/iot/operations-environment").then((m) => ({ default: m.OperationsEnvironmentExample })),
  "automation-builder": () => import("@/examples/iot/automation-builder").then((m) => ({ default: m.AutomationBuilderExample })),
  "pairing-flow": () => import("@/examples/iot/pairing-flow").then((m) => ({ default: m.PairingFlowExample })),
  "telemetry-history": () => import("@/examples/iot/telemetry-history").then((m) => ({ default: m.TelemetryHistoryExample })),
  "alert-center": () => import("@/examples/iot/alert-center").then((m) => ({ default: m.AlertCenterExample })),
  "device-detail": () => import("@/examples/iot/device-detail").then((m) => ({ default: m.DeviceDetailExample })),
  "alert-inbox": () => import("@/examples/iot/alert-inbox").then((m) => ({ default: m.AlertInboxExample })),
  "device-dashboard": () => import("@/examples/iot/device-dashboard").then((m) => ({ default: m.DeviceDashboardExample })),
  "connected-space": () => import("@/examples/iot/connected-space").then((m) => ({ default: m.ConnectedSpaceExample })),
};
