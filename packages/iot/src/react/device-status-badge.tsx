"use client";

import * as React from "react";
import type { KinetixDeviceStatus } from "../types/device";
import { describeDeviceStatus, normalizeDeviceStatus } from "../functions/status";
import { Glyph, type GlyphName } from "./glyph";
import { cn } from "./cn";
import { resolveLabel } from "./label";
import { withDisplayName } from "./display-name";

/**
 * DeviceStatusBadge — a device's state, as a word.
 *
 * The status text is always rendered. The glyph beside it (a shape per state) is decoration
 * (`aria-hidden`), and the tint is a second encoding of something already written down, so the badge reads correctly in greyscale,
 * in forced-colors mode, and to a screen reader. That is the whole reason the label is not optional.
 *
 * The raw `status` is also emitted as `data-status`, so a product can restyle per state without
 * needing this component to grow a variant API.
 */
export interface DeviceStatusBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** A `KinetixDeviceStatus`, or any string a backend produced — it is normalised. */
  status: KinetixDeviceStatus | string | null | undefined;
  /**
   * Override the visible text. Use for translation; it replaces the label, never removes it — a blank or
   * whitespace-only string falls back to the status text, so the state is never conveyed by colour alone.
   */
  label?: string;
  /** Hide the decorative glyph. */
  hideIndicator?: boolean;
}

/**
 * Per-status emphasis, on the token contract.
 *
 * `error` is the only one that takes the destructive container: a fleet where four states are red is
 * a fleet where nobody reads any of them.
 */
const STATUS_CLASS: Record<KinetixDeviceStatus, string> = {
  online: "bg-primary/10 text-primary",
  offline: "bg-muted text-muted-foreground",
  stale: "bg-muted text-foreground",
  syncing: "bg-secondary text-secondary-foreground",
  pairing: "bg-secondary text-secondary-foreground",
  updating: "bg-secondary text-secondary-foreground",
  warning: "bg-warning/15 text-warning",
  error: "bg-destructive/10 text-destructive",
  disabled: "bg-muted text-muted-foreground",
};

/** A silhouette per state, so the badge separates in greyscale as well as by tint. */
const STATUS_GLYPH: Record<KinetixDeviceStatus, GlyphName> = {
  online: "circle-dot",
  offline: "slash",
  stale: "clock",
  syncing: "swap",
  pairing: "circle-half",
  updating: "chip",
  warning: "triangle",
  error: "octagon",
  disabled: "dash",
};

const DeviceStatusBadge = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLSpanElement, DeviceStatusBadgeProps>(
  ({ status, label, hideIndicator = false, className, ...props }, ref) => {
    const resolved = normalizeDeviceStatus(status);
    return (
      <span
        ref={ref}
        data-status={resolved}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-md font-sans",
          STATUS_CLASS[resolved],
          className,
        )}
        {...props}
      >
        {hideIndicator ? null : <Glyph name={STATUS_GLYPH[resolved]} size={12} />}
        {resolveLabel(label, describeDeviceStatus(resolved))}
      </span>
    );
  },
), "DeviceStatusBadge");

export { DeviceStatusBadge };
