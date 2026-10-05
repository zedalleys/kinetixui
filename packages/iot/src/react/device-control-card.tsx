"use client";

import * as React from "react";
import type { KinetixDevice } from "../types/device";
import type { KinetixControlState } from "../types/control";
import type { KinetixDeviceCategory } from "../types/identity";
import { resolveDeviceCategory } from "../functions/identity";
import { DeviceIdentity } from "./device-identity";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * DeviceControlCard — a device you can operate, not just read.
 *
 * `DeviceCard` answers "what is this device doing". This answers "and what can I do about it", and
 * the difference shows in the layout: the control is the card's centre of gravity rather than a
 * chip in the corner, the whole surface reacts to active state, and secondary facts are one quiet
 * line instead of a metadata grid.
 *
 * **Slots, not props.** `control`, `expanded` and `meta` take nodes. The alternative — `onToggle`,
 * `level`, `onLevelChange`, `mode`, `modes`, `onModeChange`, `setpoint`… — is the thirty-prop
 * component this package is explicitly trying not to become, and it would still not fit the fourth
 * product that turns up with a control nobody predicted.
 *
 * **The card surface carries active state.** A lit light, a running pump: the card is tinted, so a
 * wall of them reads at a glance. That is the one piece of visual state a device grid genuinely needs
 * and the reason this is a card rather than a row.
 *
 * **Three variants.** `surface` (default) is the ordinary tile; `hero` is a device's full presence — a
 * large icon tile, a large *confirmed* value and room for the primary control; `quiet` is a compact
 * row-like tile for secondary devices. None of them has a border: tone is a fill, and the only
 * outline is the dashed one that means "offline" or "requested, not yet confirmed".
 *
 * **The big number is always the confirmed one.** A `requestedValue` is shown separately as a dashed
 * "Requested …, not yet confirmed" chip, and an unreachable device shows its last known value with the
 * word "Offline" and a glyph — never a fresh-looking number. Neither chip is a live region; the
 * control inside the card owns the one announcement.
 *
 * **Expanded content is opt-in and unmounted when closed**, so a grid of twenty cards does not carry
 * twenty sliders it is not showing.
 */
export interface DeviceControlCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  device: KinetixDevice;
  category?: KinetixDeviceCategory;
  /** Whether the device is doing its thing — lit, running, open. Drives the card's surface. */
  active?: boolean;
  control?: KinetixControlState;
  /** The primary control. Rendered prominently, at the card's end edge (below the value in `hero`). */
  primaryControl?: React.ReactNode;
  /** One line of state in the product's own words — "Warming to 21°", "Cycle 2 of 4". */
  statusLine?: React.ReactNode;
  /** Quiet secondary facts. Keep to two or three; this is not a metadata dump. */
  meta?: React.ReactNode;
  /** Secondary controls, revealed on demand. Unmounted while collapsed. */
  expanded?: React.ReactNode;
  /** Controlled disclosure. Omit for uncontrolled. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Label for the disclosure toggle. Defaults to a sentence naming the device. */
  expandLabel?: string;
  /** `surface` (default), `hero` (large presence for a primary device) or `quiet` (compact row-like tile). */
  variant?: "surface" | "hero" | "quiet";
  /** The device's *confirmed* value, drawn large. Omit for a card without a headline number. */
  value?: React.ReactNode;
  /** Unit printed small and muted after `value`. */
  unit?: string;
  /**
   * What the user asked for while it is unconfirmed. Drawn as a dashed "Requested …, not yet
   * confirmed" chip; the confirmed `value` stays the big number.
   */
  requestedValue?: React.ReactNode;
  /**
   * A device illustration, supplied by the caller (so the card imports none). Decorative: it is wrapped
   * `aria-hidden`. In `quiet` it sits at the inline end of the tile; in `hero` it sits beside the value.
   */
  visual?: React.ReactNode;
}

/** The two chip marks, inline so the card does not import the whole glyph set. */
const MARK = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  "aria-hidden": true,
  focusable: false,
  width: 14,
  height: 14,
  viewBox: "0 0 16 16",
  className: "shrink-0",
};

const PAD = { surface: "gap-3 p-4", hero: "gap-5 p-5 sm:p-6", quiet: "gap-2 p-3" } as const;
const VALUE = {
  surface: "text-headline-sm",
  hero: "text-headline-lg sm:text-display-sm",
  quiet: "text-title-lg",
} as const;

const DeviceControlCard = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceControlCardProps>(
  (
    {
      device, category, active = false, control, primaryControl, statusLine, meta, expanded, open, onOpenChange, expandLabel,
      variant = "surface", value, unit, requestedValue, visual, className, ...props
    },
    ref,
  ) => {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const isOpen = open ?? internalOpen;
    const setOpen = (next: boolean) => {
      if (open === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    };

    const resolved = category ?? resolveDeviceCategory(device);
    const unreachable = control?.availability === "offline" || control?.availability === "unavailable";
    const pending = !unreachable && (requestedValue !== undefined || control?.availability === "pending");
    const hasValue = value !== undefined && value !== null;
    const panelId = React.useId();
    const hero = variant === "hero";
    const quiet = variant === "quiet";

    const valueNode = hasValue ? (
      <p
        data-value=""
        className={cn(
          "m-0 flex items-baseline gap-1.5 tabular-nums leading-none",
          VALUE[variant],
          unreachable ? "text-muted-foreground" : "text-foreground",
        )}
      >
        <span>{value}</span>
        {unit ? <span className={cn("text-muted-on-container", hero ? "text-title-md" : "text-title-sm")}>{unit}</span> : null}
      </p>
    ) : null;

    // Words + glyph + dashed outline: none of it depends on colour, and none of it is live (the
    // control beside it owns the one announcement).
    const stateChip = unreachable ? (
      <span
        data-state-chip="unreachable"
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-1 text-label-md text-muted-on-container"
      >
        <svg {...MARK} data-glyph="dash">
          <circle cx="8" cy="8" r="6.25" strokeDasharray="2 2" />
          <path d="M5.5 8h5" />
        </svg>
        {control?.availability === "offline" ? "Offline" : "Unavailable"}
        {hasValue ? " — last known value" : ""}
      </span>
    ) : pending ? (
      <span
        data-state-chip="requested"
        className="inline-flex w-fit max-w-full animate-pulse items-center gap-1.5 rounded-full border border-dashed border-primary bg-primary/10 px-2.5 py-1 text-label-md text-foreground motion-reduce:animate-none"
      >
        <svg {...MARK} data-glyph="circle-dot">
          <circle cx="8" cy="8" r="6.25" />
          <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
        </svg>
        <span className="min-w-0 break-words">
          {requestedValue !== undefined && requestedValue !== null ? (
            <>
              Requested{" "}
              <span className="tabular-nums">
                {requestedValue}
                {unit ? ` ${unit}` : ""}
              </span>
              , not yet confirmed
            </>
          ) : (
            "Requested, not yet confirmed"
          )}
        </span>
      </span>
    ) : null;

    return (
      <div
        ref={ref}
        data-active={active ? "" : undefined}
        data-availability={control?.availability}
        data-variant={variant}
        className={cn(
          "flex flex-col rounded-2xl font-sans text-card-foreground transition-colors duration-base ease-enter motion-reduce:transition-none",
          PAD[variant],
          // No border on an ordinary card: the surface is a tier, not an outline. Active is a tint.
          quiet ? "bg-muted/40" : "bg-card shadow-sm",
          active && (quiet ? "bg-primary/10" : "bg-primary/10 shadow-none"),
          // Offline is drawn, not just worded: a dashed edge and a muted surface, legible in
          // greyscale and distinguishable from merely-idle.
          unreachable && "border border-dashed border-border bg-muted/30 shadow-none",
          className,
        )}
        {...props}
      >
        <div className="flex items-center gap-3">
          <DeviceIdentity
            device={device}
            category={resolved}
            active={active}
            size={hero ? "xl" : quiet ? "sm" : "md"}
            className="min-w-0 flex-1"
          />
          {visual && quiet ? <div aria-hidden="true" className="ms-auto shrink-0">{visual}</div> : null}
          {primaryControl && !hero ? <div className={cn("shrink-0", !(visual && quiet) && "ms-auto")}>{primaryControl}</div> : null}
        </div>

        {valueNode || (hero && visual) ? (
          <div className={cn("flex gap-3", hero ? "items-end justify-between pt-1" : "flex-wrap items-baseline gap-y-1")}>
            {valueNode}
            {hero && visual ? <div aria-hidden="true" className="ms-auto shrink-0">{visual}</div> : null}
          </div>
        ) : null}

        {stateChip}

        {statusLine ? (
          <p className={cn("m-0", hero ? "text-body-md" : "text-body-sm", active ? "text-foreground" : "text-muted-foreground")}>{statusLine}</p>
        ) : null}

        {hero && primaryControl ? (
          <div data-primary-control="" className="min-w-0">
            {primaryControl}
          </div>
        ) : null}

        {meta ? <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-on-container">{meta}</div> : null}

        {expanded ? (
          <>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(!isOpen)}
              className={cn(
                "-mx-1 flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-label-md text-muted-on-container md:min-h-9",
                "transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "motion-reduce:transition-none",
              )}
            >
              {expandLabel ?? (isOpen ? "Fewer controls" : "More controls")}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                // Rotation, not a flipped chevron: vertical disclosure is the same in both
                // directions, so this must NOT be mirrored under RTL.
                className={cn("transition-transform duration-fast motion-reduce:transition-none", isOpen && "rotate-180")}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {isOpen ? (
              <div id={panelId} className="flex flex-col gap-4 border-t border-border/70 pt-3">
                {expanded}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    );
  },
), "DeviceControlCard");

export { DeviceControlCard };
