"use client";

import type * as React from "react";

import { CommandLifecycle, DeviceModeControl, DevicePowerControl } from "@kinetixui/iot/react";
import { isLifecyclePending } from "@kinetixui/iot/functions";
import { useIotSimulation } from "@/lib/iot-sim/use-simulation";
import { agritech } from "./scenarios";
import { BUTTON, SimNotice, SimTransport, controlOf, type ControlBinding } from "./harness";

// kx-iot:start
/**
 * Requested is not confirmed.
 *
 * Press a control and watch two values that most device UIs collapse into one: what you ASKED for, and
 * what the device last REPORTED. The confirmed value changes only when the device confirms it. An
 * acknowledgement ("I got that") is not a confirmation, a timeout is not "off", and a device that
 * stopped answering is `unreachable` rather than quietly assumed to have obeyed.
 *
 * Everything here is scripted in the browser. `@kinetixui/iot` has no transport, so no request leaves
 * the page, and no delay below is a real network delay.
 */
function Panel({ title, note, binding, children }: { title: string; note: string; binding: ControlBinding; children: React.ReactNode }) {
  const { command, confirmed, requested, format } = binding;
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <header>
        <h4 className="text-title-sm text-foreground">{binding.device.name}</h4>
        <p className="text-label-sm text-muted-foreground">
          {title}. {note}
        </p>
      </header>
      {children}
      <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-label-md">
        <div className="min-w-0">
          <dt className="text-label-sm text-muted-foreground">Device reports (confirmed)</dt>
          <dd data-testid={`confirmed-${binding.device.id}`} className="font-medium text-foreground">
            {format(confirmed)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-label-sm text-muted-foreground">You asked for (requested)</dt>
          <dd data-testid={`requested-${binding.device.id}`} className="font-medium text-foreground">
            {requested === undefined ? "Nothing pending" : format(requested)}
          </dd>
        </div>
      </dl>
      {command ? <CommandLifecycle lifecycle={command.lifecycle} formatValue={format} onRetry={binding.retry} onCancel={binding.cancel} /> : null}
    </article>
  );
}

export function StateHonestyExample() {
  const iot = useIotSimulation(agritech, { intervalMs: 500 });
  const valve02 = controlOf(iot, "valve-02", "position");
  const valve03 = controlOf(iot, "valve-03", "position");
  const pump = controlOf(iot, "pump-01", "power");
  const pumpGone = !iot.sim.devices["pump-01"]!.reachable;
  const pumpBusy = pump.command ? isLifecyclePending(pump.command.lifecycle) : false;

  return (
    <section aria-label="State honesty demo" className="flex flex-col gap-5">
      <SimNotice scenario={agritech}>
        <SimTransport iot={iot} />
      </SimNotice>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4">
        {([["Reliable valve", "Acknowledges, then confirms.", valve02], ["Flaky valve", "Fails once, then works. Retry is offered, never done for you.", valve03]] as const).map(
          ([title, note, valve]) => (
            <Panel key={valve.device.id} title={title} note={note} binding={valve}>
              <DeviceModeControl
                modes={valve.capability.modes ?? []}
                value={valve.confirmed as string}
                requested={valve.requested as string | undefined}
                control={valve.control}
                label={`${valve.device.name} position`}
                onSelect={valve.send}
              />
            </Panel>
          ),
        )}

        <Panel title="Unreachable device" note="Send a request, then lose the pump: it times out, then is called unreachable." binding={pump}>
          <DevicePowerControl
            state={pump.confirmed as "on" | "off"}
            requested={pump.requested as "on" | "off" | undefined}
            control={pump.control}
            label={`${pump.device.name} power`}
            onToggle={pump.send}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={BUTTON}
              disabled={pumpGone || pumpBusy}
              onClick={() => {
                pump.send(pump.confirmed === "on" ? "off" : "on");
                iot.setReachable("pump-01", false);
              }}
            >
              Request a change, then lose the pump
            </button>
            <button type="button" className={BUTTON} disabled={!pumpGone} onClick={() => iot.setReachable("pump-01", true)}>
              Pump answers again
            </button>
          </div>
        </Panel>
      </div>

      <p className="text-label-sm text-muted-foreground">
        An optimistic interface would already show the new value the moment you pressed. Here the confirmed value never moves until the device
        confirms it, so a lock, a valve or a pump is never shown in a state it has not reported.
      </p>
    </section>
  );
}
// kx-iot:end
