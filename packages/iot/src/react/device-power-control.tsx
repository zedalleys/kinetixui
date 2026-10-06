"use client";

import * as React from "react";
import type { KinetixControlState, KinetixPowerState } from "../types/control";
import { describePowerState, normalizePowerState, type DescribeControlOutcomeOptions } from "../functions/control";
import { cn } from "./cn";
import { ControlAnnouncer, ControlOutcomeNote, isDisconnected, useControlContract, type ControlContractProps } from "./control-outcome";
import { withDisplayName } from "./display-name";

/**
 * DevicePowerControl — on/off, without lying about which.
 *
 * The rule this whole component exists for: **pressing it does not change the state it shows.** It
 * renders what the device last reported — `state`, or the `lifecycle`'s reported value — and what the
 * user asked for — `requested`, or the lifecycle's request. How the request is drawn is the
 * `strategy`:
 *
 * - `confirmed` (default): the switch stays where the device reports it, its mark included; the track
 *   is outlined dashed and the label says "Turning on". Nothing claims the device moved.
 * - `hybrid`: the track and the knob move to the request so the press feels answered, but the knob is
 *   hollow, the mark is withheld and the label says "Turning on".
 * - `optimistic`: the switch moves to the request and reads "On", without the confirmed mark. If the
 *   request fails, times out or is cancelled it moves back and says so in words.
 *
 * A toggle that flips optimistically is right on a fast local network and wrong on a battery sensor
 * behind a gateway, and the failure mode is a user pressing twice because the UI already claimed
 * success — which is why `confirmed` is the default.
 *
 * It is a `button` with `aria-pressed`, not a checkbox: this is an action with a result that may not
 * arrive, not a form field that is simply on or off. `aria-pressed` reflects the **confirmed** state,
 * and the pending fact rides in the accessible description, so a screen-reader user is told the same
 * thing a sighted one sees rather than a cleaner story.
 */
// `onToggle` is a real DOM handler on HTMLAttributes (details/popover), so it is omitted rather
// than shadowed, leaving this component the only meaning of the name.
export interface DevicePowerControlProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value" | "onToggle">,
    ControlContractProps<KinetixPowerState | boolean> {
  /**
   * What the device last confirmed. `unknown` renders as an indeterminate track, never as off.
   * Ignored when a `lifecycle` is passed.
   */
  state?: KinetixPowerState | boolean | null;
  /** What the user asked for, while it is unconfirmed. Omit once the device agrees. Ignored with a `lifecycle`. */
  requested?: KinetixPowerState | boolean | null;
  /** Resolved availability from `resolveControlState`. Drives disabled, styling and the description. */
  control?: KinetixControlState;
  /** Accessible name. Required — "on/off" alone does not say what it powers. */
  label: string;
  /** Called with the state being requested. The component never assumes it succeeded. */
  onToggle?: (next: KinetixPowerState) => void;
  /** `lg` is a big tactile switch for a hero control; `sm` is for dense rows. Default `md`. */
  size?: "sm" | "md" | "lg";
  /** Render the state word beside the track. Off in dense grids where the row already says it. */
  showLabel?: boolean;
}

// The button is the 44px hit area (`min-h-11` below `md`); the visible track is drawn inside it, so the
// switch can look as slim as it likes without the target shrinking with it.
const TRACK = { sm: "h-7 w-12", md: "h-9 w-16", lg: "h-12 w-24" } as const;
const KNOB = { sm: "size-5", md: "size-7", lg: "size-10" } as const;
const KNOB_ON = {
  sm: "translate-x-5 rtl:-translate-x-5",
  md: "translate-x-7 rtl:-translate-x-7",
  lg: "translate-x-12 rtl:-translate-x-12",
} as const;
const TICK = { sm: 12, md: 16, lg: 22 } as const;
const POWER_SENTENCE: DescribeControlOutcomeOptions = {
  formatValue: (value) => normalizePowerState(value as KinetixPowerState | boolean),
  pendingPhrase: (value) => (normalizePowerState(value as KinetixPowerState | boolean) === "on" ? "Turning on" : "Turning off"),
  failedPhrase: (value) => (normalizePowerState(value as KinetixPowerState | boolean) === "on" ? "Could not turn on" : "Could not turn off"),
};

const HIT = { sm: "min-h-11 min-w-11 md:min-h-9", md: "min-h-11 min-w-11 md:min-h-9", lg: "min-h-12 min-w-12" } as const;

const DevicePowerControl = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLButtonElement, DevicePowerControlProps>(
  (
    { state, requested, control: controlProp, lifecycle, strategy, announce, label, onToggle, size = "md", showLabel = true, className, disabled, ...props },
    ref,
  ) => {
    const { presentation, control, announcement } = useControlContract<KinetixPowerState | boolean>(
      {
        lifecycle,
        strategy,
        announce,
        control: controlProp,
        reported: normalizePowerState(state),
        requested: requested === undefined || requested === null ? undefined : normalizePowerState(requested),
      },
      POWER_SENTENCE,
    );
    const confirmed = normalizePowerState(presentation.reportedValue);
    const wanted = presentation.pending && presentation.pendingValue !== undefined ? normalizePowerState(presentation.pendingValue) : undefined;
    const pending = wanted !== undefined && wanted !== confirmed;
    // Everything below is read off the presentation, never off the strategy's name, so one function
    // (`presentCommandValue`) decides it for every control.
    // Drawn at the request (`hybrid`, `optimistic`) or at the reported state (`confirmed`).
    const drawsRequest = pending && presentation.valueSource === "requested";
    // Marked = drawn as not yet confirmed. Every strategy but `optimistic` marks an open request.
    const marked = pending && presentation.indicatePending;

    const interactive = control ? control.interactive : true;
    const isDisabled = disabled || !interactive;

    const shown = drawsRequest ? wanted! : confirmed;
    // A marked request is announced at the confirmed state, with the request in words; an unmarked one
    // (`optimistic`) is announced at the state it shows, with `aria-busy` saying it is unsettled.
    const checked = marked ? confirmed : shown;
    const text = pending && !marked ? describePowerState(shown) : describePowerState(confirmed, wanted);

    const descriptionId = React.useId();
    const description = control?.description;

    return (
      // `min-w-0`, because this row is itself a flex item: without it the row's min-content width is the
      // full un-wrapped label, which dragged the whole card 395px wide inside a 288px track on a phone.
      <div className="flex min-w-0 items-center gap-3">
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked === "on"}
          aria-label={label}
          aria-describedby={description ? descriptionId : undefined}
          // Busy while a request is open, under every strategy: the one programmatic hint `optimistic`
          // keeps, since it deliberately draws nothing.
          aria-busy={pending || undefined}
          data-state={confirmed}
          data-shown={shown}
          data-strategy={presentation.strategy}
          data-pending={pending ? "" : undefined}
          data-size={size}
          disabled={isDisabled}
          onClick={() => onToggle?.(checked === "on" ? "off" : "on")}
          className={cn(
            "group relative inline-flex shrink-0 items-center justify-center rounded-full",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            // The focus ring is a box-shadow, which forced-colors strips; an outline is not.
            "forced-colors:focus-visible:outline forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-55",
            HIT[size],
            className,
          )}
          {...props}
        >
          <span
            aria-hidden="true"
            className={cn(
              "relative inline-flex shrink-0 items-center rounded-full border-2 p-1 transition-colors duration-base ease-enter motion-reduce:transition-none",
              TRACK[size],
              shown === "on" ? "border-primary bg-primary" : "border-input bg-muted",
              // A dashed track is the offline tell that survives greyscale and colour-blindness.
              isDisconnected(control?.availability) && "border-dashed border-border bg-muted/50",
              // Asked for, not confirmed: the track is outlined dashed, wherever the strategy puts the knob.
              marked && "border-dashed border-primary",
            )}
          >
            <span
              className={cn(
                "grid place-items-center rounded-full shadow-sm transition-transform duration-base ease-enter motion-reduce:transition-none",
                // In forced-colors the knob is otherwise invisible: its fill is forced to the system
                // background and its shadow is dropped, so the one thing left saying which end it sits
                // at disappears. A border is not overridden away, so the knob keeps its silhouette —
                // and with it the travel — alongside the mark it carries.
                "forced-colors:border-2 forced-colors:border-current",
                KNOB[size],
                shown === "on" && KNOB_ON[size],
                // Hollow knob = asked for, not confirmed (hybrid). Under `confirmed` the knob has not moved, so
                // it keeps its confirmed fill; under `optimistic` it is filled but carries no mark.
                drawsRequest && marked
                  ? "border-2 border-dashed border-primary-foreground bg-transparent"
                  : shown === "on"
                    ? "bg-primary-foreground text-primary"
                    : "bg-background text-muted-foreground",
              )}
            >
              {/* The mark, not the fill, is what says which state this is. A tick when the device
                  CONFIRMED on, a bar when it confirmed off. While a request is open it stays only under
                  `confirmed`, where the knob still sits at the confirmed end; elsewhere it is withheld.
                  Both are stroked in `currentColor`, which forced-colors keeps rather than flattens,
                  so the difference is still there when every fill has collapsed to one system colour.
                  The tick is the `check` glyph's tick, drawn inline: `glyph.tsx` is one binding
                  holding all 25 shapes, so importing it for one path would cost 2.7 KB. */}
              {drawsRequest ? null : confirmed === "on" ? (
                <svg data-mark="on" width={TICK[size]} height={TICK[size]} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" focusable="false">
                  <path d="m3.6 8.4 2.9 2.9 5.9-6.2" />
                </svg>
              ) : confirmed === "off" ? (
                <svg data-mark="off" width={TICK[size]} height={TICK[size]} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" focusable="false">
                  <path d="M4.5 8h7" />
                </svg>
              ) : null}
            </span>
          </span>
        </button>

        {showLabel ? (
          <span className="flex min-w-0 flex-col">
            {/* These wrap rather than truncate. The state word and the reason a change is not yet confirmed
                are the honest part of this control; an ellipsis is the one thing they must never become. */}
            <span className={cn("break-words", size === "lg" ? "text-title-md" : "text-label-lg", marked ? "text-muted-foreground" : "text-foreground")}>{text}</span>
            {description && control?.availability !== "ready" ? (
              <span id={descriptionId} className="break-words text-label-md text-muted-foreground">
                {description}
              </span>
            ) : null}
            <ControlOutcomeNote presentation={presentation} sentence={POWER_SENTENCE} />
          </span>
        ) : (
          <>
            {description ? (
              <span id={descriptionId} className="sr-only">
                {description}
              </span>
            ) : null}
            <ControlOutcomeNote presentation={presentation} sentence={POWER_SENTENCE} className="sr-only" />
          </>
        )}
        <ControlAnnouncer announcement={announcement} />
      </div>
    );
  },
), "DevicePowerControl");

export { DevicePowerControl };
