/**
 * slug → the React composition that renders that IoT example's live preview.
 *
 * The same file is the snippet source: `pnpm gen:iot-examples` extracts its `kx-iot` region, so the
 * preview a visitor sees and the code they copy are one component rather than two hand-maintained
 * copies that drift. The block layer learned that the hard way — its page once showed `id="email"`
 * while rendering `id="bl-email"` — and this is the same mechanism.
 *
 * `iot-examples.test.ts` checks this map against `iot-examples.manifest.json`, so an example cannot
 * ship without a preview and a preview cannot linger after its example is gone.
 */
import type { ComponentType } from "react";
import { AlertInboxExample } from "@/examples/iot/alert-inbox";
import { ConnectionTroubleshootingExample } from "@/examples/iot/connection-troubleshooting";
import { DeviceDashboardExample } from "@/examples/iot/device-dashboard";
import { DeviceDetailExample } from "@/examples/iot/device-detail";
import { DeviceFleetExample } from "@/examples/iot/device-fleet";
import { TelemetryBoardExample } from "@/examples/iot/telemetry-board";

export const iotPreviews: Record<string, ComponentType> = {
  "device-fleet": DeviceFleetExample,
  "device-detail": DeviceDetailExample,
  "telemetry-board": TelemetryBoardExample,
  "connection-troubleshooting": ConnectionTroubleshootingExample,
  "alert-inbox": AlertInboxExample,
  "device-dashboard": DeviceDashboardExample,
};
