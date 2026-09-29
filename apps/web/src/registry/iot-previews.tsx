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
import { AgritechEnvironmentExample } from "@/examples/iot/agritech-environment";
import { AlertCenterExample } from "@/examples/iot/alert-center";
import { AutomationBuilderExample } from "@/examples/iot/automation-builder";
import { OperationsEnvironmentExample } from "@/examples/iot/operations-environment";
import { PairingFlowExample } from "@/examples/iot/pairing-flow";
import { SmartSpaceEnvironmentExample } from "@/examples/iot/smart-space-environment";
import { StateHonestyExample } from "@/examples/iot/state-honesty";
import { TelemetryHistoryExample } from "@/examples/iot/telemetry-history";
import { AlertInboxExample } from "@/examples/iot/alert-inbox";
import { ConnectedSpaceExample } from "@/examples/iot/connected-space";
import { ConnectionTroubleshootingExample } from "@/examples/iot/connection-troubleshooting";
import { DeviceDashboardExample } from "@/examples/iot/device-dashboard";
import { DeviceDetailExample } from "@/examples/iot/device-detail";
import { DeviceFleetExample } from "@/examples/iot/device-fleet";
import { TelemetryBoardExample } from "@/examples/iot/telemetry-board";

export const iotPreviews: Record<string, ComponentType> = {
  "state-honesty": StateHonestyExample,
  "smart-space-environment": SmartSpaceEnvironmentExample,
  "agritech-environment": AgritechEnvironmentExample,
  "operations-environment": OperationsEnvironmentExample,
  "automation-builder": AutomationBuilderExample,
  "pairing-flow": PairingFlowExample,
  "telemetry-history": TelemetryHistoryExample,
  "alert-center": AlertCenterExample,
  "device-fleet": DeviceFleetExample,
  "device-detail": DeviceDetailExample,
  "telemetry-board": TelemetryBoardExample,
  "connection-troubleshooting": ConnectionTroubleshootingExample,
  "alert-inbox": AlertInboxExample,
  "device-dashboard": DeviceDashboardExample,
  "connected-space": ConnectedSpaceExample,
};
