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
 * **The card surface carries active state.** A lit light, a running pump: the card is tinted and its
 * border warms, so a wall of them reads at a glance. That is the one piece of visual state a device
 * grid genuinely needs and the reason this is a card rather than a row.
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
  /** The primary control. Rendered prominently, at the card's end edge. */
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
}

const DeviceControlCard = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceControlCardProps>(
  (
    { device, category, active = false, control, primaryControl, statusLine, meta, expanded, open, onOpenChange, expandLabel, className, ...props },
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
    const panelId = React.useId();

    return (
      <div
        ref={ref}
        data-active={active ? "" : undefined}
        data-availability={control?.availability}
        className={cn(
          "flex flex-col gap-3 rounded-2xl border p-4 font-sans transition-colors duration-300 ease-out motion-reduce:transition-none",
          active
            ? "border-primary/30 bg-primary/[0.06] text-card-foreground"
            : "border-border bg-card text-card-foreground",
          // Offline is drawn, not just worded: a dashed edge and a muted surface, legible in
          // greyscale and distinguishable from merely-idle.
          unreachable && "border-dashed bg-muted/30",
          className,
        )}
        {...props}
      >
        <div className="flex items-start gap-3">
          <DeviceIdentity device={device} category={resolved} active={active} className="min-w-0 flex-1" />
          {primaryControl ? <div className="ms-auto shrink-0">{primaryControl}</div> : null}
        </div>

        {statusLine ? (
          <p className={cn("text-label-md", active ? "text-foreground" : "text-muted-foreground")}>{statusLine}</p>
        ) : null}

        {meta ? <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">{meta}</div> : null}

        {expanded ? (
          <>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(!isOpen)}
              className={cn(
                "-mx-1 flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-label-sm text-muted-foreground",
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
                className={cn("transition-transform duration-200 motion-reduce:transition-none", isOpen && "rotate-180")}
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
