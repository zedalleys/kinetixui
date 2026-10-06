"use client";

import * as React from "react";
import type { KinetixCommandLifecycle, KinetixCommandStrategy } from "../types/command";
import type { KinetixControlPresentation, KinetixControlState } from "../types/control";
import { cn } from "./cn";
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
  const resolved = control ?? (lifecycle ? resolveControlState({ deviceStatus: "online", lifecycle }) : undefined);
  const announcing = announce ?? !!lifecycle;
  return {
    presentation,
    control: resolved,
    announcement: announcing ? describeControlOutcome(presentation, sentence) : null,
  };
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
