"use client";

import type * as React from "react";

import { CommandLifecycle, DeviceModeControl, DevicePowerControl } from "@kinetixui/iot/react";
import { isLifecyclePending } from "@kinetixui/iot/functions";
import { useIotSimulation } from "@/lib/iot-sim/use-simulation";
import { agritech } from "./scenarios";
import { StateBadge, StateGlyph, type ShowcaseState } from "@/components/iot/showcase";
import { BUTTON, SimNotice, SimTransport, controlOf, type ControlBinding } from "./harness";
import { cn } from "@/lib/utils";

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
const STAGE_WORD: Record<string, { state: ShowcaseState; word: string }> = {
  requested: { state: "pending", word: "Requested, not yet confirmed" },
  retrying: { state: "pending", word: "Retrying, not yet confirmed" },
  acknowledged: { state: "pending", word: "Acknowledged, not yet confirmed" },
  failed: { state: "warning", word: "Failed. The device did not change." },
  "timed-out": { state: "warning", word: "Timed out. No answer yet." },
  unreachable: { state: "offline", word: "Unreachable. Last confirmed value shown." },
};

/** One device, two values side by side: what it REPORTED (big, solid) and what you ASKED for (dashed, worded). */
function Panel({ title, note, binding, children }: { title: string; note: string; binding: ControlBinding; children: React.ReactNode }) {
  const { command, confirmed, requested, format } = binding;
  const stage = command && binding.unsettled ? STAGE_WORD[command.lifecycle.stage] : undefined;
  const asked = requested !== undefined;
  return (
    <article className="grid min-w-0 gap-5 rounded-2xl bg-card p-4 shadow-sm md:grid-cols-2 md:gap-8 md:p-6">
      <div className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h4 className="text-title-lg text-foreground">{binding.device.name}</h4>
        <p className="text-body-md text-muted-foreground">
          <span className="font-medium text-foreground">{title}.</span> {note}
        </p>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2 sm:gap-3">
        <dl className="m-0 flex min-w-0 flex-col gap-1 rounded-xl bg-muted/60 p-3 sm:p-4">
          <dt className="flex items-center gap-1.5 text-label-md text-muted-foreground">
            <StateGlyph state="confirmed" size={14} className="text-success" />
            Device reports
          </dt>
          <dd data-testid={`confirmed-${binding.device.id}`} className="m-0 break-words text-headline-md text-foreground">
            {format(confirmed)}
          </dd>
          <dd className="m-0 text-label-md text-muted-foreground">Confirmed</dd>
        </dl>
        <span aria-hidden="true" className="flex items-center text-muted-foreground rtl:-scale-x-100">
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" focusable="false">
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </span>
        <dl
          className={cn(
            "m-0 flex min-w-0 flex-col gap-1 rounded-xl border-2 p-3 transition-colors duration-fast motion-reduce:transition-none sm:p-4",
            asked ? "border-dashed border-primary bg-primary/10" : "border-transparent bg-muted/30",
          )}
        >
          <dt className="flex items-center gap-1.5 text-label-md text-muted-foreground">
            <StateGlyph state={asked ? "pending" : "offline"} size={14} className={asked ? "text-primary" : "text-muted-foreground"} />
            You asked for
          </dt>
          <dd data-testid={`requested-${binding.device.id}`} className={cn("m-0 break-words", asked ? "text-headline-md text-foreground" : "text-title-md text-muted-foreground")}>
            {asked ? format(requested) : "Nothing pending"}
          </dd>
          <dd className="m-0 text-label-md text-muted-foreground">{asked ? "Requested" : "No open request"}</dd>
        </dl>
      </div>

      <div className="flex min-h-6 items-center">
        {stage ? <StateBadge state={stage.state}>{stage.word}</StateBadge> : <StateBadge state="confirmed">Nothing waiting on the device</StateBadge>}
      </div>

      </div>

      <div className="flex min-w-0 flex-col gap-4 md:justify-center">
        <div className="flex min-w-0 flex-col gap-4 rounded-xl bg-muted/60 p-4">{children}</div>
        {command && binding.unsettled ? <CommandLifecycle lifecycle={command.lifecycle} formatValue={format} onRetry={binding.retry} onCancel={binding.cancel} /> : null}
      </div>
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

      <div className="flex flex-col gap-4">
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

      <p className="text-body-md text-muted-foreground">
        An optimistic interface would already show the new value the moment you pressed. Here the confirmed value never moves until the device
        confirms it, so a lock, a valve or a pump is never shown in a state it has not reported.
      </p>
    </section>
  );
}
// kx-iot:end
