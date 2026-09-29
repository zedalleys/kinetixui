"use client";

import * as React from "react";
import type { KinetixDeviceStatus } from "../types/device";
import { describeDeviceStatus, normalizeDeviceStatus } from "../functions/status";
import { cn } from "./cn";
import { resolveLabel } from "./label";
import { withDisplayName } from "./display-name";

/**
 * DeviceStatusBadge — a device's state, as a word.
 *
 * The status text is always rendered. The dot beside it is decoration (`aria-hidden`), and the colour
 * is a second encoding of something already written down, so the badge reads correctly in greyscale,
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
  /** Hide the decorative dot. */
  hideIndicator?: boolean;
}

/**
 * Per-status emphasis, on the token contract.
 *
 * `error` is the only one that takes the destructive container: a fleet where four states are red is
 * a fleet where nobody reads any of them.
 */
const STATUS_CLASS: Record<KinetixDeviceStatus, string> = {
  online: "bg-accent text-accent-foreground",
  offline: "bg-muted text-muted-foreground",
  stale: "bg-muted text-foreground",
  syncing: "bg-secondary text-secondary-foreground",
  pairing: "bg-secondary text-secondary-foreground",
  updating: "bg-secondary text-secondary-foreground",
  warning: "border border-input bg-background text-foreground",
  error: "bg-destructive text-destructive-foreground",
  disabled: "bg-muted text-muted-foreground",
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
        {hideIndicator ? null : <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />}
        {resolveLabel(label, describeDeviceStatus(resolved))}
      </span>
    );
  },
), "DeviceStatusBadge");

export { DeviceStatusBadge };
