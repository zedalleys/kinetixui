"use client";

import * as React from "react";
import type { KinetixDeviceCategory } from "../types/identity";
import { DeviceIcon } from "./device-icon";
import { Glyph } from "./glyph";
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
 * Two optional slots were added in 0.3 for hierarchies: `path` (a `SpaceBreadcrumb`, above the kind
 * label) and `rollup` (a `SpaceRollup` or any health summary, below the summary line). They are nodes,
 * not data, so this card does not learn what a space tree is; without them it renders exactly as before.
 *
 * ## Two variants (visual pass)
 * - `tile` (default): an elegant room/zone tile on a borderless surface — icon tile, the name, a large
 *   count of active devices with "of N active" beside it, a slim activity bar, then the optional
 *   summary, rollup and action.
 * - `row`: a compact list row for a rail — icon tile (or your own `visual`), name, one line of state, a
 *   `trailing` slot for a state control such as a switch. With `selected` it takes a filled tile, a
 *   tint and a check, so selection is a shape and a tint and never a colour alone; the selecting
 *   button carries `aria-current="true"`.
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
  /** Where this group sits — typically a `SpaceBreadcrumb`. Rendered above the group's name, outside the select button. */
  path?: React.ReactNode;
  /** Health of everything in the group — typically a `SpaceRollup`. Rendered below the summary. */
  rollup?: React.ReactNode;
  /** A control applying to the whole group. Rendered outside the button so it stays operable. */
  action?: React.ReactNode;
  onSelect?: () => void;
  /** `tile` (default) or `row`, a compact list row for a rail. */
  variant?: "tile" | "row";
  /** This group is the one being looked at. Sets `aria-current="true"` on the select button, a check and a tint. */
  selected?: boolean;
  /** Replaces the icon tile — an abstract plan thumbnail, an avatar. Decorative; the name carries identity. */
  visual?: React.ReactNode;
  /** A state control shown at the trailing edge of a `row` (a switch, a menu). Rendered outside the select button. */
  trailing?: React.ReactNode;
}

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const DeviceGroupCard = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceGroupCardProps>(
  (
    {
      name,
      kind,
      deviceCount,
      activeCount = 0,
      attentionCount = 0,
      category = "unknown",
      summary,
      path,
      rollup,
      action,
      onSelect,
      variant = "tile",
      selected = false,
      visual,
      trailing,
      className,
      ...props
    },
    ref,
  ) => {
    const attention = attentionCount > 0;
    const active = !attention && activeCount > 0;
    const row = variant === "row";
    const share = deviceCount > 0 ? Math.min(100, Math.max(0, Math.round((activeCount / deviceCount) * 100))) : 0;

    const tile = visual ? (
      <span aria-hidden="true" className={cn("shrink-0 overflow-hidden", row ? "size-11 rounded-xl" : "size-14 rounded-2xl")}>
        {visual}
      </span>
    ) : (
      <span
        className={cn(
          "grid shrink-0 place-items-center transition-colors duration-base motion-reduce:transition-none",
          row ? "size-11 rounded-xl" : "size-14 rounded-2xl",
          attention && "bg-destructive/10 text-destructive",
          !attention && (selected || active) && "bg-primary text-primary-foreground",
          !attention && !selected && !active && "bg-muted text-muted-foreground",
        )}
      >
        <DeviceIcon category={category} size={row ? 22 : 26} />
      </span>
    );

    const attentionChip = attention ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-label-md text-destructive">
        {/* A tint alone would be colour-only; the glyph, the number and the words carry it. */}
        <Glyph name="octagon" size={12} />
        {attentionCount} need{attentionCount === 1 ? "s" : ""} attention
      </span>
    ) : null;

    const countLabel = deviceCount === 0 ? "No devices" : `${activeCount} of ${deviceCount} active`;

    const inner = row ? (
      <>
        {tile}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-title-sm text-foreground">{name}</span>
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-body-sm text-muted-foreground">
            {kind ? <span>{kind}</span> : null}
            <span className={cn("tabular-nums", active && "text-foreground")}>{countLabel}</span>
            {summary ? <span className="truncate">{summary}</span> : null}
          </span>
          {attentionChip ? <span className="mt-0.5 flex">{attentionChip}</span> : null}
        </span>
        {selected ? <Glyph name="check" size={18} className="text-primary" /> : null}
      </>
    ) : (
      <>
        <div className="flex items-start gap-4">
          {tile}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
            {kind ? <span className="text-label-md text-muted-foreground">{kind}</span> : null}
            <span className="truncate text-title-md text-foreground">{name}</span>
          </span>
          {selected ? <Glyph name="check" size={20} className="mt-1 text-primary" /> : null}
        </div>

        <div className="flex flex-col gap-2">
          <p className="flex flex-wrap items-baseline gap-x-2 text-body-sm text-muted-foreground">
            {deviceCount === 0 ? (
              <span className="text-title-md text-muted-foreground">{countLabel}</span>
            ) : (
              <>
                <span className="text-headline-lg font-semibold tabular-nums text-foreground">{activeCount}</span>
                <span className="tabular-nums">{` of ${deviceCount} active`}</span>
              </>
            )}
          </p>
          {deviceCount > 0 ? (
            <span aria-hidden="true" data-activity-bar="" className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <span className={cn("h-full rounded-full", attention ? "bg-destructive" : "bg-primary")} style={{ inlineSize: `${share}%` }} />
            </span>
          ) : null}
        </div>

        {attentionChip ? <div className="flex">{attentionChip}</div> : null}
        {summary ? <p className="truncate text-body-sm text-muted-foreground">{summary}</p> : null}
      </>
    );

    const select = onSelect ? (
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        // The button covers the card's informational area; `action` and `trailing` sit outside it so a
        // group control is not a button inside a button.
        className={cn(
          "text-start",
          FOCUS,
          row ? "flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl" : "-m-1 flex flex-col gap-4 rounded-2xl p-1",
        )}
      >
        {inner}
      </button>
    ) : row ? (
      <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3">{inner}</div>
    ) : (
      inner
    );

    const surface = attention ? "bg-destructive/5" : selected ? "bg-primary/10" : active ? "bg-primary/5" : "bg-muted/40";

    return (
      <div
        ref={ref}
        data-attention={attention ? "" : undefined}
        data-active={active ? "" : undefined}
        data-selected={selected ? "" : undefined}
        data-variant={variant}
        className={cn(
          "flex flex-col font-sans transition-colors duration-base ease-out motion-reduce:transition-none",
          row ? "gap-2 rounded-2xl px-3 py-2" : "gap-4 rounded-container p-5 shadow-sm",
          surface,
          className,
        )}
        {...props}
      >
        {path ? <div data-slot="path">{path}</div> : null}

        {row ? (
          <div className="flex items-center gap-3">
            {select}
            {trailing ? <span className="shrink-0">{trailing}</span> : null}
          </div>
        ) : (
          select
        )}

        {rollup ? <div data-slot="rollup">{rollup}</div> : null}

        {action ? <div className={cn("flex items-center justify-end", !row && "pt-1")}>{action}</div> : null}
      </div>
    );
  },
), "DeviceGroupCard");

export { DeviceGroupCard };
