"use client";

import * as React from "react";
import type { KinetixCommandLifecycle, KinetixCommandStrategy } from "../types/command";
import type { KinetixControlAvailability, KinetixControlPresentation, KinetixControlState } from "../types/control";
import { cn } from "./cn";
import { isLifecyclePending } from "../functions/commands";
import { describeControlOutcome, resolveControlPresentation, resolveControlState, type DescribeControlOutcomeOptions } from "../functions/control";

/**
 * The part of the M2A control contract the four controls share, kept internal to this package.
 *
 * Each control takes the same three optional props — `lifecycle`, `strategy`, `announce` — and turns
 * them into what to draw with {@link useControlContract}. Nothing here decides a rule of its own: the
 * value comes from `resolveControlPresentation`, the sentence from `describeControlOutcome` and the
 * availability from `resolveControlState`.
 */
export type ControlContractProps<T> = {
  /**
   * The change's command lifecycle. When given it is the source of truth: the control's value props
   * are ignored, and the control announces the outcome itself (see `announce`).
   */
  lifecycle?: KinetixCommandLifecycle<T> | null;
  /**
   * How a change in flight is drawn. `confirmed` (default) keeps the device's reported value and marks
   * the request beside it; `hybrid` draws the request, visibly marked as unconfirmed; `optimistic`
   * draws the request as the value and rolls back, in words, if it does not happen. A strategy changes
   * what is displayed, never what the lifecycle says about the hardware.
   */
  strategy?: KinetixCommandStrategy;
  /**
   * Announce the change's progress and outcome in a polite `role="status"` region. Defaults to `true`
   * when a `lifecycle` is passed and is otherwise off. Pass `false` when the same lifecycle is already
   * rendered by `CommandLifecycle`, which has its own region, so a screen reader hears it once.
   */
  announce?: boolean;
};

export function useControlContract<T>(
  props: ControlContractProps<T> & { control?: KinetixControlState; reported?: T | null; requested?: T | null },
  sentence: DescribeControlOutcomeOptions,
): { presentation: KinetixControlPresentation<T>; control: KinetixControlState | undefined; announcement: string | null } {
  const { lifecycle, strategy, announce, control, reported, requested } = props;
  const presentation = resolveControlPresentation<T>({ lifecycle, strategy, reported, requested });
  // Without a `control`, a lifecycle still decides interactivity (a pending change is not pressable) —
  // but it says nothing about the device's own status, so none is assumed: availability is the
  // caller's to supply, and an absent one is not turned into "offline".
  const resolved = control ? withCommand(control, lifecycle) : lifecycle ? resolveControlState({ deviceStatus: "online", lifecycle }) : undefined;
  const announcing = announce ?? !!lifecycle;
  return {
    presentation,
    control: resolved,
    announcement: announcing ? describeControlOutcome(presentation, sentence) : null,
  };
}

/**
 * A device's `control` state with this control's own command folded in. A caller's `control` describes
 * the device; it cannot know about a lifecycle the control was handed separately (a media control has
 * four), so a ready device with a command in flight is `pending` and not pressable, exactly as
 * `resolveControlState` would say given both. Any other availability already decides on its own.
 */
function withCommand(control: KinetixControlState, lifecycle: KinetixCommandLifecycle<unknown> | null | undefined): KinetixControlState {
  if (!lifecycle || control.availability !== "ready" || !isLifecyclePending(lifecycle)) return control;
  return resolveControlState({ deviceStatus: "online", lifecycle });
}

/**
 * The control's single polite status region. Rendered (empty) from the start, because a live region
 * that appears together with its first message is often not announced.
 */
export function ControlAnnouncer({ announcement }: { announcement: string | null }) {
  if (announcement === null) return null;
  return (
    <span role="status" aria-live="polite" aria-atomic="true" data-control-announcer="" className="sr-only">
      {announcement}
    </span>
  );
}

/**
 * A request that ended without happening, said in words where the control is. Not a live region: the
 * announcer already says it once. Shown under every strategy, because "nothing moved" is not the same
 * as "nothing to tell the user".
 */
export function ControlOutcomeNote({ presentation, sentence, className }: { presentation: KinetixControlPresentation; sentence: DescribeControlOutcomeOptions; className?: string }) {
  if (!presentation.unsuccessful) return null;
  return (
    <span
      data-outcome={presentation.outcome}
      data-rolled-back={presentation.rolledBack ? "" : undefined}
      className={cn("break-words text-label-md font-medium text-foreground", className)}
    >
      {describeControlOutcome(presentation, sentence)}
    </span>
  );
}

/**
 * Availabilities where the device cannot be operated because of its link, or because nothing is known
 * about it. Controls draw these muted and dashed; each still has its own word (below), so `unknown` is
 * never shown as `offline`.
 */
export function isDisconnected(availability: KinetixControlAvailability | undefined): boolean {
  return availability === "offline" || availability === "unreachable" || availability === "connecting" || availability === "unknown";
}

/** The short chip word for an inoperable availability. */
export function availabilityWord(availability: KinetixControlAvailability | undefined): string {
  switch (availability) {
    case "offline":
      return "Offline";
    case "unreachable":
      return "Unreachable";
    case "connecting":
      return "Connecting";
    case "unknown":
      return "Status unknown";
    default:
      return "Unavailable";
  }
}

/**
 * What a control renders for a capability the device does not have (`resolveCapabilitySupport` →
 * `unsupported`): one sentence, no disabled widget. A disabled control reads as "not now"; this says
 * "not on this device", which is a different answer and a different next step.
 */
export function SupportNote({ label, nodeRef, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { label: string; nodeRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={nodeRef} data-support="unsupported" className={cn("rounded-xl bg-muted/60 px-3 py-2 text-label-md text-muted-foreground", className)} {...props}>
      {label}: not supported by this device
    </div>
  );
}
