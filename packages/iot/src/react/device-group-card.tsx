"use client";

import * as React from "react";
import type { KinetixDeviceCategory } from "../types/identity";
import { DeviceIcon } from "./device-icon";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * DeviceGroupCard — a room, a zone, a site, a group.
 *
 * The domain word belongs to the product. A home calls it a room, a farm calls it a zone, an
 * operator calls it a site, and a library that picks one is wrong for the other two — so this takes
 * `name` and a caller-supplied `kind` label and stays out of it.
 *
 * What a group has to communicate, and the order it communicates it in: **what it is**, **how much
 * of it is doing something**, **whether anything in it needs you**, and **one action** that applies
 * to all of it. Anything more and it stops being scannable, which is the only reason to group
 * devices in the first place.
 *
 * **Attention outranks activity.** A zone with four running pumps and one fault reads as the fault.
 * Products that render activity first bury the thing the user came to find.
 *
 * The whole card is a button when `onSelect` is given — a group is a navigation target, and a card
 * with a small "View" link inside it wastes the 200px of tap area around the link.
 */
export interface DeviceGroupCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  name: string;
  /** The product's word for this grouping — "Room", "Zone", "Site". Shown quietly above the name. */
  kind?: string;
  deviceCount: number;
  /** How many devices in the group are currently doing something. Drives the active treatment. */
  activeCount?: number;
  /** How many need attention. Any non-zero value takes over the card's state. */
  attentionCount?: number;
  /** Representative icon for the group. Defaults to a neutral device glyph. */
  category?: KinetixDeviceCategory;
  /** One line of context — "21°C · 48% RH", "3 of 8 valves open". */
  summary?: React.ReactNode;
  /** A control applying to the whole group. Rendered outside the button so it stays operable. */
  action?: React.ReactNode;
  onSelect?: () => void;
}

const DeviceGroupCard = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceGroupCardProps>(
  ({ name, kind, deviceCount, activeCount = 0, attentionCount = 0, category = "unknown", summary, action, onSelect, className, ...props }, ref) => {
    const attention = attentionCount > 0;
    const active = !attention && activeCount > 0;

    const countLabel =
      deviceCount === 0
        ? "No devices"
        : `${activeCount} of ${deviceCount} active`;

    const inner = (
      <>
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl border transition-colors duration-300 motion-reduce:transition-none",
              attention && "border-destructive/35 bg-destructive/10 text-destructive",
              active && "border-transparent bg-primary text-primary-foreground",
              !attention && !active && "border-border bg-muted/60 text-muted-foreground",
            )}
          >
            <DeviceIcon category={category} size={20} />
          </span>
          <span className="flex min-w-0 flex-col">
            {kind ? <span className="text-label-sm uppercase tracking-wide text-muted-foreground">{kind}</span> : null}
            <span className="truncate text-title-sm text-foreground">{name}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={cn("text-label-sm tabular-nums", active ? "text-foreground" : "text-muted-foreground")}>{countLabel}</span>
          {attention ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/12 px-2 py-0.5 text-label-sm text-destructive">
              {/* A dot alone would be colour-only; the number carries it without colour. */}
              {attentionCount} need{attentionCount === 1 ? "s" : ""} attention
            </span>
          ) : null}
        </div>

        {summary ? <p className="truncate text-label-sm text-muted-foreground">{summary}</p> : null}
      </>
    );

    return (
      <div
        ref={ref}
        data-attention={attention ? "" : undefined}
        data-active={active ? "" : undefined}
        className={cn(
          "flex flex-col gap-3 rounded-2xl border p-4 font-sans transition-colors duration-300 ease-out motion-reduce:transition-none",
          attention ? "border-destructive/30 bg-destructive/[0.04]" : active ? "border-primary/25 bg-primary/[0.04]" : "border-border bg-card",
          className,
        )}
        {...props}
      >
        {onSelect ? (
          <button
            type="button"
            onClick={onSelect}
            // The button covers the card's informational area; `action` sits outside it so a group
            // control is not a button inside a button.
            className={cn(
              "-m-1 flex flex-col gap-3 rounded-xl p-1 text-start",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "focus-visible:ring-offset-background",
            )}
          >
            {inner}
          </button>
        ) : (
          inner
        )}

        {action ? <div className="flex items-center justify-end border-t border-border/70 pt-3">{action}</div> : null}
      </div>
    );
  },
), "DeviceGroupCard");

export { DeviceGroupCard };
