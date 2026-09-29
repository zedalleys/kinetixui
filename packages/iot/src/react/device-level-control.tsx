"use client";

import * as React from "react";
import type { KinetixControlState } from "../types/control";
import { clampLevel } from "../functions/control";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * DeviceLevelControl — a bounded level: brightness, fan speed, pump output, valve position.
 *
 * **It is a native `input[type=range]`.** Keyboard stepping, Home/End, touch dragging, pointer
 * capture and the screen-reader slider role all come from the platform and all work correctly. A
 * hand-rolled div-slider would have to reimplement every one of those and would get at least one
 * wrong — most do, and the one they get wrong is usually the keyboard. The native control is made
 * transparent and the visible track is drawn beneath it, so the styling is ours and the behaviour
 * is the platform's.
 *
 * **Two values, drawn differently.** `value` is what the device confirmed; `target` is what the user
 * asked for while it is unconfirmed. The confirmed level is the solid fill, the requested one is a
 * hatched extension with a marker — so a dimmer ramping from 20% to 80% shows both the 20 it is at
 * and the 80 it is going to, which is exactly what a user watching a slow bulb needs to see.
 *
 * `value` may be `null`, meaning the device has never reported a level. That renders as an empty
 * track with "—", not as zero: a dimmer that has not reported is not a dimmer that is off.
 */
export interface DeviceLevelControlProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** The device's confirmed level. `null` means never reported — rendered as unknown, not as 0. */
  value: number | null | undefined;
  /** The requested level while unconfirmed. Omit when there is nothing in flight. */
  target?: number | null;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** Accessible name. Required — "level" does not say what is being levelled. */
  label: string;
  control?: KinetixControlState;
  /** Called on release (`change`), not on every drag frame, so a product does not spam a device. */
  onCommit?: (next: number) => void;
  /** Called on every drag frame, for local preview. Optional — most products only need `onCommit`. */
  onPreview?: (next: number) => void;
  /** Show the numeric readout above the track. */
  showValue?: boolean;
}

const DeviceLevelControl = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLInputElement, DeviceLevelControlProps>(
  (
    { value, target, min = 0, max = 100, step = 1, unit = "%", label, control, onCommit, onPreview, showValue = true, className, disabled, ...props },
    ref,
  ) => {
    const confirmed = clampLevel(value, min, max);
    const requested = target === undefined || target === null ? null : clampLevel(target, min, max);
    const pending = requested !== null && requested !== confirmed;

    const interactive = control ? control.interactive : true;
    const isDisabled = disabled || !interactive;

    // The slider's own position follows the request while one is open, so the thumb sits where the
    // user put it rather than snapping back to the device's older value mid-transition.
    const position = pending ? requested! : (confirmed ?? min);
    const span = max - min || 1;
    const pct = (n: number) => `${(((n - min) / span) * 100).toFixed(2)}%`;

    const descriptionId = React.useId();
    const reading = confirmed === null ? "—" : `${confirmed}${unit}`;

    return (
      <div className={cn("flex flex-col gap-2", className)} data-pending={pending ? "" : undefined}>
        {showValue ? (
          <div className="flex items-baseline gap-2">
            <span className="text-label-sm text-muted-foreground">{label}</span>
            <span className="ms-auto flex items-baseline gap-1.5">
              <span className={cn("text-title-sm tabular-nums", pending ? "text-muted-foreground" : "text-foreground")}>{reading}</span>
              {pending ? (
                <span className="text-label-sm tabular-nums text-primary">
                  {/* An arrow would flip under RTL and read backwards; the word does not. */}
                  to {requested}
                  {unit}
                </span>
              ) : null}
            </span>
          </div>
        ) : null}

        <div className="relative h-9">
          {/* Track. `inset-x-0` is logical-safe: both edges, so RTL needs nothing here. */}
          <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-full bg-muted">
            {confirmed !== null ? (
              <div
                className="absolute inset-y-0 start-0 rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
                style={{ width: pct(confirmed) }}
              />
            ) : null}
            {pending ? (
              // The requested extension, hatched so it is distinguishable from the confirmed fill
              // without relying on the two blues being told apart.
              <div
                className="absolute inset-y-0 start-0 rounded-full opacity-70 transition-[width] duration-300 ease-out motion-reduce:transition-none"
                style={{
                  width: pct(requested!),
                  backgroundImage:
                    "repeating-linear-gradient(135deg, hsl(var(--primary)) 0 4px, transparent 4px 8px)",
                }}
              />
            ) : null}
          </div>

          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            value={position}
            disabled={isDisabled}
            aria-label={label}
            aria-describedby={control?.description ? descriptionId : undefined}
            aria-valuetext={
              pending
                ? `${confirmed ?? "unknown"}${unit}, changing to ${requested}${unit}`
                : confirmed === null
                  ? "Not reported"
                  : `${confirmed}${unit}`
            }
            onChange={(e) => onPreview?.(Number(e.currentTarget.value))}
            // `change` on a range fires on release in every engine; `input` fires per frame. Commit
            // on release so a drag across a dimmer is one command, not eighty.
            onMouseUp={(e) => onCommit?.(Number(e.currentTarget.value))}
            onTouchEnd={(e) => onCommit?.(Number(e.currentTarget.value))}
            onKeyUp={(e) => onCommit?.(Number(e.currentTarget.value))}
            className={cn(
              "absolute inset-0 w-full cursor-pointer appearance-none bg-transparent",
              "focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-55",
              // A 36px-tall thumb hit area: comfortably past the 24px touch minimum, on a track that
              // is visually 10px. The thumb is drawn by the pseudo-elements below.
              "[&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
              "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background",
              "[&::-webkit-slider-thumb]:shadow-sm",
              "[&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
              "[&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background",
              "focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-ring",
              "focus-visible:[&::-webkit-slider-thumb]:ring-offset-2 focus-visible:[&::-webkit-slider-thumb]:ring-offset-background",
              pending && "[&::-webkit-slider-thumb]:border-dashed [&::-moz-range-thumb]:border-dashed",
            )}
            {...props}
          />
        </div>

        {control?.description && control.availability !== "ready" ? (
          <span id={descriptionId} className="text-label-sm text-muted-foreground">
            {control.description}
          </span>
        ) : null}
      </div>
    );
  },
), "DeviceLevelControl");

export { DeviceLevelControl };
