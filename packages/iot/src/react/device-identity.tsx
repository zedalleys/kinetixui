"use client";

import * as React from "react";
import type { KinetixDevice } from "../types/device";
import type { KinetixDeviceCategory } from "../types/identity";
import { normalizeDeviceStatus } from "../functions/status";
import { needsAttention } from "../functions/status";
import { describeDeviceCategory, resolveDeviceCategory } from "../functions/identity";
import { DeviceIcon } from "./device-icon";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * DeviceIdentity — who this device is, in one glance.
 *
 * The problem this solves is the one every device list has: a user scanning twenty rows is matching
 * on shape and colour, not reading. So identity is carried by an icon tile whose *surface* changes
 * with state — an active device is filled with the primary colour, an idle one is a muted tile, one
 * needing attention is tinted — and the text beneath it is a name and one line of context, not five
 * metadata labels.
 *
 * **The tile is the state indicator.** There is no separate status dot, because two indicators for
 * one fact is how the eye ends up checking both. `DeviceStatusBadge` still exists for surfaces that
 * want the word; this is for surfaces that want the glance.
 *
 * **Colour is never the only signal.** The attention state also changes the icon's ring, and the
 * accessible name carries the status in words, so the distinction survives greyscale and a screen
 * reader alike.
 */
export interface DeviceIdentityProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  device: KinetixDevice;
  /** Override the inferred category. Pass this when the product's own `type` vocabulary is richer. */
  category?: KinetixDeviceCategory;
  /**
   * Whether the device is currently doing its thing — lit, running, open. Drives the tile's fill.
   * Distinct from `status`: a light can be reachable (`online`) and off.
   */
  active?: boolean;
  /** Secondary line. Defaults to the device's location, then its category name. */
  secondary?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** Hide the text and render the tile alone — for dense grids where the name sits elsewhere. */
  iconOnly?: boolean;
}

const TILE_SIZES = { sm: "size-9 rounded-lg", md: "size-11 rounded-xl", lg: "size-14 rounded-2xl" } as const;
const ICON_SIZES = { sm: 18, md: 22, lg: 28 } as const;
const NAME_SIZES = { sm: "text-label-md", md: "text-title-sm", lg: "text-title-md" } as const;

const DeviceIdentity = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceIdentityProps>(
  ({ device, category, active = false, secondary, size = "md", iconOnly = false, className, ...props }, ref) => {
    const resolved = category ?? resolveDeviceCategory(device);
    const status = normalizeDeviceStatus(device?.status);
    const attention = needsAttention(status);
    const unreachable = status === "offline" || status === "disabled";

    // Precedence: unreachable reads as absent, attention as a problem, active as doing something,
    // and the rest as present-but-idle. Attention outranks active because a running device with a
    // fault is a fault first.
    const tone = unreachable ? "offline" : attention ? "attention" : active ? "active" : "idle";

    const secondaryText = secondary ?? device?.locationName ?? describeDeviceCategory(resolved);

    return (
      <div ref={ref} data-category={resolved} data-tone={tone} className={cn("flex items-center gap-3", className)} {...props}>
        <span
          className={cn(
            "grid place-items-center border transition-colors duration-300 ease-out motion-reduce:transition-none",
            TILE_SIZES[size],
            tone === "active" && "border-transparent bg-primary text-primary-foreground",
            tone === "attention" && "border-destructive/35 bg-destructive/10 text-destructive",
            tone === "offline" && "border-dashed border-border bg-muted/40 text-muted-foreground",
            tone === "idle" && "border-border bg-muted/60 text-muted-foreground",
          )}
        >
          <DeviceIcon category={resolved} size={ICON_SIZES[size]} />
        </span>

        {iconOnly ? null : (
          <span className="flex min-w-0 flex-col">
            <span className={cn("truncate text-foreground", NAME_SIZES[size])}>{device?.name}</span>
            {secondaryText ? <span className="truncate text-label-sm text-muted-foreground">{secondaryText}</span> : null}
          </span>
        )}
      </div>
    );
  },
), "DeviceIdentity");

export { DeviceIdentity };
