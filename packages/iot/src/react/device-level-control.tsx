"use client";

import * as React from "react";
import type { KinetixControlState } from "../types/control";
import { clampLevel, snapToStep } from "../functions/control";
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
export interface DeviceLevelControlProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "size"> {
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
  /** `md` (default) reads as a 24px numeral; `lg` as a hero 36px numeral for a primary control. */
  size?: "md" | "lg";
  /**
   * `track` (default) is a slim track with the readout above. `pill` is a fat rounded track (56px) with a
   * big round thumb and the label and value drawn INSIDE it — the fill carries a light copy of the text, so
   * both stay legible on either side of the thumb. The native range input is still what you touch.
   */
  variant?: "track" | "pill";
}

/** The native thumb's diameter in px (track / pill). The drawn fill is inset by it so the fill ends under the thumb's centre. */
const THUMB = 28;
const THUMB_PILL = 44;

const DeviceLevelControl = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLInputElement, DeviceLevelControlProps>(
  (
    { value, target, min = 0, max = 100, step = 1, unit = "%", label, control, onCommit, onPreview, showValue = true, size = "md", variant = "track", className, disabled, ...props },
    ref,
  ) => {
    const confirmed = clampLevel(value, min, max);
    const requested = target === undefined || target === null ? null : clampLevel(target, min, max);
    const pending = requested !== null && requested !== confirmed;

    const interactive = control ? control.interactive : true;
    const isDisabled = disabled || !interactive;

    // A drag is held locally until it is released.
    //
    // The input is controlled, so without this React rewrites its value back to the prop on every
    // change and the release handler reads the *old* number. A product that wired only `onCommit` —
    // which the name invites — would then command 20 every time the user dragged to 80, silently.
    // The draft also keeps the thumb under the finger during the drag.
    const [draft, setDraft] = React.useState<number | null>(null);

    // The slider's own position follows the drag, then the request while one is open, so the thumb
    // sits where the user put it rather than snapping back to the device's older value.
    const position = draft ?? (pending ? requested! : (confirmed ?? min));

    const commit = (raw: string) => {
      const next = snapToStep(Number(raw), min, max, step);
      setDraft(null);
      onCommit?.(next);
    };
    const span = max - min || 1;
    const ratio = (n: number) => (n - min) / span;
    // The native thumb travels `width - THUMB`, not `width`, so a plain percentage drifts away from it at
    // the ends. This lands the fill's edge exactly under the thumb's centre at every position.
    const pill = variant === "pill";
    const thumb = pill ? THUMB_PILL : THUMB;
    const edge = (n: number) => `calc(${(ratio(n) * 100).toFixed(2)}% + ${((0.5 - ratio(n)) * thumb).toFixed(2)}px)`;
    const valueText = confirmed === null ? "—" : `${confirmed}${unit}`;
    // Label and value inside the pill. Drawn twice — dark on the track, light inside the fill — so the text
    // is legible on both sides of the thumb.
    const pillText = (
      <>
        <span className="min-w-0 truncate text-label-lg">{label}</span>
        <span className="shrink-0 text-title-md tabular-nums">{valueText}</span>
      </>
    );

    const descriptionId = React.useId();

    return (
      <div className={cn("flex flex-col gap-1", className)} data-pending={pending ? "" : undefined}>
        {showValue && !pill ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-label-lg text-muted-foreground">{label}</span>
            <span className="ms-auto flex flex-wrap items-baseline justify-end gap-x-2 gap-y-1">
              {/* The confirmed level is the big, solid number. It never shows the request. */}
              <span
                data-confirmed=""
                className={cn(
                  "tabular-nums leading-none",
                  size === "lg" ? "text-display-sm" : "text-headline-sm",
                  confirmed === null ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {confirmed === null ? "—" : confirmed}
                {confirmed === null ? null : <span className="ms-0.5 text-title-md text-muted-foreground">{unit}</span>}
              </span>
              {pending ? (
                // A dashed chip in words, not an arrow: an arrow would flip under RTL and read backwards.
                <span
                  data-requested=""
                  className="inline-flex animate-pulse items-center rounded-full border border-dashed border-primary bg-primary/10 px-2.5 py-0.5 text-label-md tabular-nums text-foreground motion-reduce:animate-none"
                >
                  Requested {requested}
                  {unit}, not yet confirmed
                </span>
              ) : null}
            </span>
          </div>
        ) : null}

        <div className={cn("relative", pill ? "h-14" : "h-11")}>
          {/* Track. `inset-x-0` is logical-safe: both edges, so RTL needs nothing here. */}
          <div
            className={cn(
              "absolute inset-x-0 overflow-hidden rounded-full bg-muted",
              pill ? "inset-y-0" : "top-1/2 h-4 -translate-y-1/2",
            )}
          >
            {pill ? (
              <span
                aria-hidden="true"
                data-pill-text=""
                className={cn(
                  "absolute inset-0 flex items-center justify-between gap-3 ps-14 pe-14",
                  confirmed === null ? "text-muted-foreground" : "text-foreground",
                )}
              >
                <span data-confirmed="" className="contents">
                  {pillText}
                </span>
              </span>
            ) : null}
            {confirmed !== null ? (
              <div
                className="absolute inset-y-0 start-0 overflow-hidden rounded-full bg-primary transition-[width] duration-base ease-out motion-reduce:transition-none"
                style={{ width: edge(confirmed) }}
              >
                {pill && ratio(confirmed) > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 start-0 flex items-center justify-between gap-3 ps-14 pe-14 text-primary-foreground"
                    // Full track width, whatever the fill's own width is: the fill's width is
                    // `p·W + (½−p)·thumb`, so W = (fill − (½−p)·thumb) / p.
                    style={{ width: `calc((100% - ${((0.5 - ratio(confirmed)) * thumb).toFixed(2)}px) / ${ratio(confirmed).toFixed(4)})` }}
                  >
                    {pillText}
                  </span>
                ) : null}
              </div>
            ) : null}
            {pending ? (
              // The requested extension, hatched so it is distinguishable from the confirmed fill
              // without relying on the two blues being told apart.
              <div
                className={cn("absolute inset-y-0 start-0 rounded-full transition-[width] duration-base ease-out motion-reduce:transition-none", pill ? "opacity-30" : "opacity-60")}
                style={{
                  width: edge(requested!),
                  backgroundImage:
                    "repeating-linear-gradient(135deg, hsl(var(--primary)) 0 4px, transparent 4px 8px)",
                }}
              />
            ) : null}
          </div>
          {pending ? (
            // The requested marker: a solid tick standing proud of the track at the asked-for level.
            <span
              aria-hidden="true"
              data-requested-marker=""
              className={cn("pointer-events-none absolute top-1/2 w-1 -translate-y-1/2 rounded-full bg-foreground", pill ? "h-10" : "h-8")}
              style={{ insetInlineStart: `calc(${edge(requested!)} - 2px)` }}
            />
          ) : null}

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
            onChange={(e) => {
              const next = Number(e.currentTarget.value);
              setDraft(next);
              onPreview?.(next);
            }}
            // Commit on release, so a drag across a dimmer is one command and not eighty.
            onMouseUp={(e) => commit(e.currentTarget.value)}
            onTouchEnd={(e) => commit(e.currentTarget.value)}
            onKeyUp={(e) => commit(e.currentTarget.value)}
            onBlur={(e) => {
              // A drag that ends outside the input still has to resolve, or the thumb keeps a draft
              // the device never heard about.
              if (draft !== null) commit(e.currentTarget.value);
              props.onBlur?.(e);
            }}
            className={cn(
              "absolute inset-0 w-full cursor-pointer appearance-none bg-transparent",
              "focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-55",
              // The input fills a 44px-tall box (the touch minimum) around a 16px track; the 28px thumb is
              // drawn by the pseudo-elements below.
              pill ? "[&::-webkit-slider-thumb]:size-11 [&::-moz-range-thumb]:size-11" : "[&::-webkit-slider-thumb]:size-7 [&::-moz-range-thumb]:size-7",
              "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
              // Pseudo-element thumbs are outside Tailwind's preflight, so a border needs its style spelled out.
              "[&::-webkit-slider-thumb]:border-solid [&::-moz-range-thumb]:border-solid",
              "[&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background",
              "[&::-webkit-slider-thumb]:shadow-md",
              "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4",
              "[&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:shadow-md",
              "focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-ring",
              "focus-visible:[&::-webkit-slider-thumb]:ring-offset-2 focus-visible:[&::-webkit-slider-thumb]:ring-offset-background",
              pending && "[&::-webkit-slider-thumb]:border-dashed [&::-moz-range-thumb]:border-dashed",
            )}
            {...props}
          />
        </div>

        {pill && pending ? (
          <span
            data-requested=""
            className="inline-flex w-fit max-w-full animate-pulse items-center rounded-full border border-dashed border-primary bg-primary/10 px-2.5 py-0.5 text-label-md tabular-nums text-foreground motion-reduce:animate-none"
          >
            Requested {requested}
            {unit}, not yet confirmed
          </span>
        ) : null}

        {control?.description && control.availability !== "ready" ? (
          <span id={descriptionId} className="text-label-md text-muted-foreground">
            {control.description}
          </span>
        ) : null}
      </div>
    );
  },
), "DeviceLevelControl");

export { DeviceLevelControl };
