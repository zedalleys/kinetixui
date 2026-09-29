"use client";

import * as React from "react";
import type { KinetixAlertSeverity, KinetixDeviceAlert } from "../types/alert";
import { describeAlertSeverity } from "../functions/alerts";
import { LastSync } from "./last-sync";
import { Glyph, humanize, type GlyphName } from "./glyph";
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
 *
 * ## Added in 0.3 (all optional; an alert with only the original fields renders as before)
 *
 * - The severity dot became a **glyph** (ringed "i", triangle, octagon) so severity is a shape as well
 *   as a word.
 * - `kind` and `source` are shown when the alert has them. Only what the application supplied is
 *   displayed: this card never infers a cause.
 * - An alert's own `action` (`{ id, label }`) becomes a button that calls `onAction`. Its label and
 *   description are the product's; the card does not know what "Restart pump" does.
 * - `onAcknowledge` renders an Acknowledge button on an alert that is new and unresolved.
 * - State reads **New**, **Acknowledged** or **Resolved** in words. Resolved (`resolvedAt`) is
 *   distinct from acknowledged: seen versus over.
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
  /** Called from the alert's own `action` button. The button renders only when `alert.action` exists. */
  onAction?: (alert: KinetixDeviceAlert) => void;
  /** Called from the Acknowledge button, shown on a new, unresolved alert. */
  onAcknowledge?: (alert: KinetixDeviceAlert) => void;
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

const SEVERITY_GLYPH: Record<KinetixAlertSeverity, GlyphName> = {
  info: "info",
  warning: "triangle",
  critical: "octagon",
};

const SEVERITY_TEXT: Record<KinetixAlertSeverity, string> = {
  info: "text-muted-foreground",
  warning: "text-foreground",
  critical: "text-destructive",
};

const BUTTON =
  "inline-flex min-h-9 items-center rounded-lg border border-input bg-background px-3 text-label-md text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const AlertCard = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, AlertCardProps>(
  ({ alert, deviceName, action, now, onAction, onAcknowledge, className, ...props }, ref) => {
    const messageId = React.useId();
    // An unrecognised severity is shown as `info` rather than promoted: an alert whose severity we
    // could not read is not evidence of an emergency.
    const severity: KinetixAlertSeverity =
      alert?.severity === "critical" || alert?.severity === "warning" || alert?.severity === "info" ? alert.severity : "info";
    const acknowledged = alert?.acknowledgedAt !== undefined && alert?.acknowledgedAt !== null;
    const resolved = alert?.resolvedAt !== undefined && alert?.resolvedAt !== null;
    const state = resolved ? "resolved" : acknowledged ? "acknowledged" : "new";

    return (
      <div
        ref={ref}
        data-severity={severity}
        data-acknowledged={acknowledged ? "" : undefined}
        data-alert-state={state}
        className={cn(
          "flex flex-col gap-2 rounded-lg border p-3 font-sans",
          // An alert being acknowledged settles rather than snapping. Tailwind's own reduced-motion
          // variant, so no consumer stylesheet is involved.
          "transition-colors duration-300 ease-out motion-reduce:transition-none",
          acknowledged || resolved ? ACKNOWLEDGED_CLASS : SEVERITY_CLASS[severity],
          className,
        )}
        {...props}
      >
        <div className="flex items-start gap-2">
          <Glyph name={SEVERITY_GLYPH[severity]} size={14} className={cn("mt-0.5", SEVERITY_TEXT[severity])} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="break-words text-label-sm text-muted-foreground">
              {/* The severity word carries the meaning; the glyph repeats it as a shape. */}
              {describeAlertSeverity(severity)}
              {alert?.kind ? ` · ${humanize(alert.kind)}` : ""}
              {deviceName ? ` · ${deviceName}` : ""}
            </span>
            <span id={messageId} className="break-words text-label-md text-foreground">{alert?.message}</span>
            {alert?.source ? <span className="break-words text-label-sm text-muted-foreground">Source: {alert.source}</span> : null}
          </span>
          {action ? <span className="ms-auto shrink-0">{action}</span> : null}
        </div>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 ps-3.5 text-label-sm text-muted-foreground">
          <LastSync value={alert?.raisedAt} now={now} neverLabel="an unknown time" className="text-label-sm" />
          {resolved ? (
            <span data-resolved="" className="rounded-sm border border-border px-1.5 py-0.5">
              Resolved
            </span>
          ) : acknowledged ? (
            <span data-acknowledged-at="" className="rounded-sm border border-border px-1.5 py-0.5">
              Acknowledged
            </span>
          ) : (
            <span data-new="" className="rounded-sm border border-dashed border-foreground px-1.5 py-0.5 text-foreground">
              New
            </span>
          )}
        </p>

        {(alert?.action && onAction) || (onAcknowledge && !acknowledged && !resolved) ? (
          <div className="flex flex-wrap gap-2 ps-3.5">
            {alert?.action && onAction ? (
              <button type="button" className={BUTTON} aria-describedby={messageId} title={alert.action.description} onClick={() => onAction(alert)}>
                {alert.action.label}
              </button>
            ) : null}
            {onAcknowledge && !acknowledged && !resolved ? (
              <button type="button" className={BUTTON} aria-describedby={messageId} onClick={() => onAcknowledge(alert)}>
                Acknowledge
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  },
), "AlertCard");

export { AlertCard };
