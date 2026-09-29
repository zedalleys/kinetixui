"use client";

import * as React from "react";
import { AlertList, DeviceHealthSummary } from "@kinetixui/iot/react";
import { selectAlerts, selectFleetHealth } from "@/lib/iot-sim";
import { useIotSimulation } from "@/lib/iot-sim/use-simulation";
import { operations } from "./scenarios";
import { BUTTON, Section, SimNotice, SimTransport, deviceOf } from "./harness";

// kx-iot:start
/**
 * An alert centre over Site 04: fleet health above, the alert list below, and an acknowledge flow.
 *
 * Acknowledged is not resolved. Acknowledging says "I have seen this"; the alert stays in the list and
 * the device keeps counting against health until the condition itself clears. Use the button to make
 * another sensor stop answering and watch the counts and the list change together.
 *
 * SIMULATED: nothing is sent to a device, and acknowledging changes only this component's state.
 */
export function AlertCenterExample() {
  const iot = useIotSimulation(operations, { intervalMs: 1000 });
  const { sim } = iot;
  const [showAcknowledged, setShowAcknowledged] = React.useState(true);
  const silent = !sim.devices["s-101"]!.reachable;
  const alerts = selectAlerts(sim, { includeAcknowledged: showAcknowledged });

  return (
    <section aria-label="Alert centre" className="flex flex-col gap-6">
      <SimNotice scenario={operations}>
        <SimTransport iot={iot} />
      </SimNotice>

      <Section title="Site 04 health">
        <DeviceHealthSummary summary={selectFleetHealth(sim)} noun={{ one: "device", other: "devices" }} />
      </Section>

      <Section title="Alerts">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-9 cursor-pointer items-center gap-2 text-label-sm text-foreground">
            <input type="checkbox" className="size-4" checked={showAcknowledged} onChange={(event) => setShowAcknowledged(event.target.checked)} />
            Show acknowledged
          </label>
          <button type="button" className={BUTTON} onClick={() => iot.setReachable("s-101", silent)}>
            {silent ? "Vessel sensor S-101 answers again" : "Make Vessel sensor S-101 stop answering"}
          </button>
        </div>
        <AlertList
          alerts={alerts}
          deviceName={(id) => deviceOf(sim, id).name}
          onAcknowledge={(alert) => iot.acknowledgeAlert(alert.id)}
          now={sim.now}
          emptyLabel="Nothing to show."
        />
      </Section>
    </section>
  );
}
// kx-iot:end
