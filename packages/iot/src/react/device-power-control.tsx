"use client";

import * as React from "react";
import type { KinetixControlState, KinetixPowerState } from "../types/control";
import { describePowerState, normalizePowerState } from "../functions/control";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * DevicePowerControl — on/off, without lying about which.
 *
 * The rule this whole component exists for: **pressing it does not change the state it shows.** It
 * renders `state`, which is what the device last confirmed, and `requested`, which is what the user
 * asked for. While those differ it shows the requested value as *requested* — the track moves so the
 * press feels answered, but the knob stays hollow and the label says "Turning on", not "On".
 *
 * A toggle that flips optimistically is right on a fast local network and wrong on a battery sensor
 * behind a gateway, and the failure mode is a user pressing twice because the UI already claimed
 * success. Products that want the optimistic version can pass `requested` equal to the new value and
 * update `state` when the device confirms — the same prop shape, with the honesty still visible.
 *
 * It is a `button` with `aria-pressed`, not a checkbox: this is an action with a result that may not
 * arrive, not a form field that is simply on or off. `aria-pressed` reflects the **confirmed** state,
 * and the pending fact rides in the accessible description, so a screen-reader user is told the same
 * thing a sighted one sees rather than a cleaner story.
 */
// `onToggle` is a real DOM handler on HTMLAttributes (details/popover), so it is omitted rather
// than shadowed, leaving this component the only meaning of the name.
export interface DevicePowerControlProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value" | "onToggle"> {
  /** What the device last confirmed. `unknown` renders as an indeterminate track, never as off. */
  state: KinetixPowerState | boolean | null | undefined;
  /** What the user asked for, while it is unconfirmed. Omit once the device agrees. */
  requested?: KinetixPowerState | boolean | null;
  /** Resolved availability from `resolveControlState`. Drives disabled, styling and the description. */
  control?: KinetixControlState;
  /** Accessible name. Required — "on/off" alone does not say what it powers. */
  label: string;
  /** Called with the state being requested. The component never assumes it succeeded. */
  onToggle?: (next: KinetixPowerState) => void;
  size?: "sm" | "md";
  /** Render the state word beside the track. Off in dense grids where the row already says it. */
  showLabel?: boolean;
}

const TRACK = { sm: "h-7 w-12", md: "h-9 w-16" } as const;
const KNOB = { sm: "size-5", md: "size-7" } as const;
const KNOB_ON = { sm: "translate-x-5 rtl:-translate-x-5", md: "translate-x-7 rtl:-translate-x-7" } as const;

const DevicePowerControl = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLButtonElement, DevicePowerControlProps>(
  ({ state, requested, control, label, onToggle, size = "md", showLabel = true, className, disabled, ...props }, ref) => {
    const confirmed = normalizePowerState(state);
    const wanted = requested === undefined || requested === null ? undefined : normalizePowerState(requested);
    const pending = wanted !== undefined && wanted !== confirmed;

    const interactive = control ? control.interactive : true;
    const isDisabled = disabled || !interactive;

    // The track shows what was asked for so the press feels received; the knob's fill shows what is
    // confirmed. That split is the entire idea — movement is acknowledgement, fill is truth.
    const shown = pending ? wanted! : confirmed;
    const text = describePowerState(confirmed, wanted);

    const descriptionId = React.useId();
    const description = control?.description;

    return (
      <div className="flex items-center gap-3">
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={confirmed === "on"}
          aria-label={label}
          aria-describedby={description ? descriptionId : undefined}
          data-state={confirmed}
          data-pending={pending ? "" : undefined}
          disabled={isDisabled}
          onClick={() => onToggle?.(confirmed === "on" ? "off" : "on")}
          className={cn(
            "relative inline-flex shrink-0 items-center rounded-full border p-1 transition-colors duration-300 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-55",
            TRACK[size],
            shown === "on" ? "border-transparent bg-primary" : "border-border bg-muted",
            // A dashed track is the offline tell that survives greyscale and colour-blindness.
            control?.availability === "offline" && "border-dashed bg-muted/50",
            className,
          )}
          {...props}
        >
          <span
            className={cn(
              "grid place-items-center rounded-full shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none",
              KNOB[size],
              shown === "on" && KNOB_ON[size],
              // Hollow knob = asked for, not confirmed. The one visual that never lies.
              pending
                ? "border-2 border-dashed border-primary-foreground bg-transparent"
                : shown === "on"
                  ? "bg-primary-foreground"
                  : "bg-background",
            )}
          />
        </button>

        {showLabel ? (
          <span className="flex min-w-0 flex-col">
            <span className={cn("truncate text-label-md", pending ? "text-muted-foreground" : "text-foreground")}>{text}</span>
            {description && control?.availability !== "ready" ? (
              <span id={descriptionId} className="truncate text-label-sm text-muted-foreground">
                {description}
              </span>
            ) : null}
          </span>
        ) : description ? (
          <span id={descriptionId} className="sr-only">
            {description}
          </span>
        ) : null}
      </div>
    );
  },
), "DevicePowerControl");

export { DevicePowerControl };
