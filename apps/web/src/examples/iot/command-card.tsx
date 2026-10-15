"use client";

/**
 * The parts every command card on /iot shares (smart space, agritech, operations), so a request behaves the same
 * way on a lock, a valve, a thermostat and a pump. Showcase code over the simulation harness, not public API.
 *
 *   Level 1  the confirmed value, and ONE reserved row: the next action at rest, the compact request line while
 *            the device works, a brief confirmation, or the failure with Retry. The row keeps its height, so
 *            asking does not push the card.
 *   Level 2  "Details", closed: requested against reported while a request is open, battery, connection and the
 *            last report.
 *   Level 3  "Request details", closed and nested inside "Details": stage, acknowledgement, attempts, times.
 *
 * Nothing here decides anything about the device: the row reads the lifecycle, the controls read `confirmed`.
 */
import * as React from "react";
import { BatteryIndicator } from "@kinetixui/iot/react";
import { Button } from "@kinetixui/ui";
import { describeDeviceStatus, formatRelativeTime, type KinetixControlState, type KinetixDevice } from "@kinetixui/iot/functions";
import { Disclosure, PendingCommand, RequestDetails, hasRequestRecord, pendingCommandView } from "@/components/iot/showcase";
import { cn } from "@/lib/utils";
import type { ControlBinding } from "./harness";

/** A group nested inside a panel: one tonal step quieter than the card, so it reads as part of it. */
export const SUBGROUP = "bg-muted/40 shadow-none";

/**
 * The control's own "requested, not yet confirmed" sentence under its buttons repeats the command row and adds a
 * line while a request is open. The row says it once; the control keeps its in-place mark (the dashed tile, the
 * ghost thumb) and every other description (offline, unreachable) unchanged.
 */
export function quietPending(control: KinetixControlState): KinetixControlState {
  return control.availability === "pending" ? { ...control, description: "" } : control;
}

/** The reserved command row for one binding. `action` is the next thing to ask for, shown at rest. */
export function CommandRow({ binding, now, action, failureTitle, className }: { binding: ControlBinding; now: string; action?: React.ReactNode; failureTitle?: string; className?: string }) {
  return (
    <PendingCommand
      lifecycle={binding.command?.lifecycle}
      formatValue={binding.format}
      onRetry={binding.retry}
      onCancel={binding.cancel}
      now={now}
      failureTitle={failureTitle}
      subject={binding.device.name}
      action={action}
      reserve
      details={false}
      className={className}
    />
  );
}

/** The one or two named actions that ask for a two-state device's other state: "Unlock", or "Open valve". */
export function NextAction({
  binding,
  verbs,
  actions,
  labels,
  dataAttribute = "data-command-action",
}: {
  binding: ControlBinding;
  /** The command for each value, e.g. `{ unlocked: "Unlock", locked: "Lock" }`; named with the device for assistive technology. */
  verbs: Record<string, string>;
  /** The visible word, when it should differ from the verb ("Open valve"). */
  labels?: Record<string, string>;
  /** What to offer from the confirmed state: the other value, or both when the state is unknown. */
  actions: readonly string[];
  dataAttribute?: string;
}) {
  return (
    <>
      {actions.map((value, i) => (
        <Button
          key={value}
          type="button"
          variant={i === 0 ? "Primary" : "Outline"}
          size="lg"
          {...{ [dataAttribute]: value }}
          aria-label={`${verbs[value]} ${binding.device.name}`}
          disabled={!binding.control.interactive}
          onClick={() => binding.send(value)}
          className="min-h-11 min-w-32 max-w-full flex-1 whitespace-normal rounded-xl px-5 py-2 font-semibold sm:flex-none"
        >
          {labels?.[value] ?? verbs[value]}
        </Button>
      ))}
    </>
  );
}

/**
 * Level 2, closed by default: what was asked against what the device reports (only while a request is open),
 * then battery, connection and when it last reported. Level 3, the request's own record, sits inside it, closed
 * again, so neither the record nor its disclosure row appears beside the control when a request starts.
 */
export function DeviceDetails({
  device,
  now,
  bindings = [],
  extra = [],
  className,
}: {
  device: KinetixDevice;
  now: string;
  bindings?: readonly ControlBinding[];
  extra?: readonly { term: string; value: React.ReactNode }[];
  className?: string;
}) {
  const rows: { term: string; value: React.ReactNode }[] = [...extra];
  for (const b of bindings) {
    if (b.requested === undefined) continue;
    rows.push({ term: `${b.capability.label ?? b.capability.id} requested`, value: b.format(b.requested) });
    rows.push({ term: `${b.capability.label ?? b.capability.id} reported`, value: b.format(b.confirmed) });
  }
  if (device.battery !== undefined) rows.push({ term: "Battery", value: <BatteryIndicator value={device.battery} label={`${device.name} battery`} /> });
  rows.push({ term: "Connection", value: describeDeviceStatus(device.status) });
  if (device.lastSeenAt) rows.push({ term: "Last update", value: formatRelativeTime(device.lastSeenAt, { now }) });
  const records = bindings.filter((b) => b.command && hasRequestRecord(pendingCommandView(b.command.lifecycle, now)));
  return (
    <Disclosure title="Details" defaultOpen={false} className={cn(SUBGROUP, className)}>
      <div className="flex min-w-0 flex-col gap-3">
        <dl className="m-0 grid min-w-0 grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-body-md">
          {rows.map((r) => (
            <React.Fragment key={r.term}>
              <dt className="text-muted-foreground">{r.term}</dt>
              <dd className="m-0 min-w-0 break-words text-foreground">{r.value}</dd>
            </React.Fragment>
          ))}
        </dl>
        {records.map((b) => (
          <RequestDetails key={b.capability.id} lifecycle={b.command!.lifecycle} format={(v) => (v === undefined || v === null ? "Unknown" : b.format(v))} nested />
        ))}
      </div>
    </Disclosure>
  );
}

/**
 * A card with more than one control has still one command row. It shows the binding that needs it: a request
 * in flight or failed first, then a confirmation being shown, then the first binding (at rest, nothing).
 */
export function pickBinding(now: string, ...bindings: readonly ControlBinding[]): ControlBinding {
  const view = (b: ControlBinding) => pendingCommandView(b.command?.lifecycle, now);
  return bindings.find((b) => hasRequestRecord(view(b))) ?? bindings.find((b) => view(b) === "confirmed") ?? bindings[0]!;
}
