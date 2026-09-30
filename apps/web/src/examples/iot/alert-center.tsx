"use client";

import * as React from "react";
import { AlertList, DeviceHealthSummary } from "@kinetixui/iot/react";
import { selectAlerts, selectFleetHealth } from "@/lib/iot-sim";
import { useIotSimulation } from "@/lib/iot-sim/use-simulation";
import { operations } from "./scenarios";
import { Panel } from "@/components/iot/showcase";
import { BUTTON, SimNotice, SimTransport, deviceOf } from "./harness";
import { cn } from "@/lib/utils";

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
/** One-line rows need room for the message; below 768px the fuller list rows read better. */
function useWide(): boolean {
  const [wide, setWide] = React.useState(false);
  React.useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(min-width: 768px)");
    const read = () => setWide(media.matches);
    read();
    media.addEventListener?.("change", read);
    return () => media.removeEventListener?.("change", read);
  }, []);
  return wide;
}

export function AlertCenterExample() {
  const wide = useWide();
  const iot = useIotSimulation(operations, { intervalMs: 1000 });
  const { sim } = iot;
  const [showAcknowledged, setShowAcknowledged] = React.useState(true);
  const silent = !sim.devices["s-101"]!.reachable;
  const alerts = selectAlerts(sim, { includeAcknowledged: showAcknowledged });

  return (
    <section aria-label="Alert centre" className="flex flex-col gap-4 sm:gap-6">
      <SimNotice scenario={operations}>
        <SimTransport iot={iot} />
      </SimNotice>

      <Panel title="Site 04 health" description="Rolled up from every device on the site.">
        <DeviceHealthSummary summary={selectFleetHealth(sim)} noun={{ one: "device", other: "devices" }} size="lg" />
      </Panel>

      <Panel title="Alerts" description="Acknowledging says “I have seen this”. It does not resolve the alert.">
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/60 p-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body-md text-foreground md:min-h-9">
            <input type="checkbox" className="size-5" checked={showAcknowledged} onChange={(event) => setShowAcknowledged(event.target.checked)} />
            Show acknowledged
          </label>
          <button type="button" className={cn(BUTTON, "min-h-11 md:min-h-9")} onClick={() => iot.setReachable("s-101", silent)}>
            {silent ? "Vessel sensor S-101 answers again" : "Make Vessel sensor S-101 stop answering"}
          </button>
        </div>
        <AlertList
          alerts={alerts}
          deviceName={(id) => deviceOf(sim, id).name}
          onAcknowledge={(alert) => iot.acknowledgeAlert(alert.id)}
          now={sim.now}
          emptyLabel="Nothing to show."
          variant={wide ? "compact" : "list"}
        />
      </Panel>
    </section>
  );
}
// kx-iot:end
