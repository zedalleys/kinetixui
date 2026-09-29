"use client";

import * as React from "react";
import type { KinetixAlertSeverity, KinetixDeviceAlert } from "../types/alert";
import { describeAlertSeverity } from "../functions/alerts";
import { LastSync } from "./last-sync";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * AlertCard — one alert: how serious, what it says, when, and whether anyone has seen it.
 *
 * The message is rendered as text and never as markup. Alert copy comes from a device or a rules
 * engine, which makes it untrusted input; there is no `dangerouslySetInnerHTML` here and there will
 * not be one. Products that need rich alert bodies should compose their own and pass the pieces.
 *
 * **Acknowledged is a state, not a deletion.** An acknowledged alert keeps its severity and its
 * message and gains a quieter surface plus the time it was seen, because "this was a critical alert
 * and someone looked at it" is different from both "critical" and "gone".
 *
 * Severity is carried by the word, the `data-severity` attribute and the emphasis, in that order.
 * Only `critical` takes the destructive surface: a list where warnings and criticals are both red is
 * a list where neither is.
 */
export interface AlertCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  alert: KinetixDeviceAlert;
  /**
   * Name of the device, if the product wants it on the card. Not looked up from `alert.deviceId` —
   * this module has no device registry and will not pretend to.
   */
  deviceName?: string;
  /** The acknowledge control, or any other action. Rendered in the trailing position. */
  action?: React.ReactNode;
  /** Reference instant for the relative time. */
  now?: string | Date | number;
}

/** Emphasis per severity. Restrained on purpose — see the note above. */
const SEVERITY_CLASS: Record<KinetixAlertSeverity, string> = {
  info: "border-border bg-card",
  warning: "border-input bg-card",
  critical: "border-destructive/40 bg-destructive/5",
};

/**
 * Acknowledged, without fading the text.
 *
 * This used to be `opacity-70`, which the real-browser axe pass rejected: opacity multiplies through
 * to every descendant, so an acknowledged alert's severity line, message and timestamp all fell below
 * the contrast threshold at once. De-emphasis has to come from the surface, which has contrast
 * headroom, rather than from the text, which does not.
 */
const ACKNOWLEDGED_CLASS = "border-border bg-muted/40";

const SEVERITY_DOT: Record<KinetixAlertSeverity, string> = {
  info: "bg-muted-foreground",
  warning: "bg-secondary-foreground",
  critical: "bg-destructive",
};

const AlertCard = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, AlertCardProps>(
  ({ alert, deviceName, action, now, className, ...props }, ref) => {
    // An unrecognised severity is shown as `info` rather than promoted: an alert whose severity we
    // could not read is not evidence of an emergency.
    const severity: KinetixAlertSeverity =
      alert?.severity === "critical" || alert?.severity === "warning" || alert?.severity === "info" ? alert.severity : "info";
    const acknowledged = alert?.acknowledgedAt !== undefined && alert?.acknowledgedAt !== null;

    return (
      <div
        ref={ref}
        data-severity={severity}
        data-acknowledged={acknowledged ? "" : undefined}
        className={cn(
          "flex flex-col gap-2 rounded-lg border p-3 font-sans",
          // An alert being acknowledged settles rather than snapping. Tailwind's own reduced-motion
          // variant, so no consumer stylesheet is involved.
          "transition-colors duration-300 ease-out motion-reduce:transition-none",
          acknowledged ? ACKNOWLEDGED_CLASS : SEVERITY_CLASS[severity],
          className,
        )}
        {...props}
      >
        <div className="flex items-start gap-2">
          <span aria-hidden="true" className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", SEVERITY_DOT[severity])} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-label-sm text-muted-foreground">
              {/* The severity word carries the meaning; the dot repeats it. */}
              {describeAlertSeverity(severity)}
              {deviceName ? ` · ${deviceName}` : ""}
            </span>
            <span className="text-label-md text-foreground">{alert?.message}</span>
          </span>
          {action ? <span className="ms-auto shrink-0">{action}</span> : null}
        </div>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 ps-3.5 text-label-sm text-muted-foreground">
          <LastSync value={alert?.raisedAt} now={now} neverLabel="an unknown time" className="text-label-sm" />
          {acknowledged ? (
            <span data-acknowledged-at="" className="rounded-sm border border-border px-1.5 py-0.5">
              Acknowledged
            </span>
          ) : null}
        </p>
      </div>
    );
  },
), "AlertCard");

export { AlertCard };
