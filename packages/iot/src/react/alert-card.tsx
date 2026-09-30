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
 *   displayed: this card never infers a cause. An alert's `source` is a machine identity, so the card
 *   shows `sourceLabel` when the product supplied one and otherwise makes the id readable; the raw id
 *   stays on the row as `data-source`.
 * - An alert's own `action` (`{ id, label }`) becomes a button that calls `onAction`. Its label and
 *   description are the product's; the card does not know what "Restart pump" does.
 * - `onAcknowledge` renders an Acknowledge button on an alert that is new and unresolved.
 * - State reads **New**, **Acknowledged** or **Resolved** in words. Resolved (`resolvedAt`) is
 *   distinct from acknowledged: seen versus over.
 *
 * ## Visual pass
 * A row, not a bordered box: the severity is a glyph in a small tinted tile plus the word, kind, source
 * and time are quiet secondary text, and the buttons are compact. An acknowledged alert reads as a chip
 * with a check and a quieter tile. `variant="compact"` and `bare` are additive.
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
  /**
   * `list` (default) is a two-line row: severity tile, severity word · kind · device, the message, then
   * the time and state. `compact` is a single line for rails — tile, word, message, time.
   */
  variant?: "list" | "compact";
  /**
   * No surface of its own. `AlertList` sets this so its rows share one surface and are separated by
   * hairlines instead of each being a box. Standalone, leave it off and the alert brings its own tint.
   */
  bare?: boolean;
}

/** Tile tint per severity. Text colours are the tokens that clear contrast on their own tint. */
const TILE_CLASS: Record<KinetixAlertSeverity, string> = {
  info: "bg-info/10 text-info-on-container",
  warning: "bg-warning/15 text-warning",
  critical: "bg-destructive/10 text-destructive",
};

const SEVERITY_GLYPH: Record<KinetixAlertSeverity, GlyphName> = {
  info: "info",
  warning: "triangle",
  critical: "octagon",
};

const WORD_CLASS: Record<KinetixAlertSeverity, string> = {
  info: "text-info-on-container",
  warning: "text-warning",
  critical: "text-destructive",
};

/** Whole-alert surface when the alert is not inside an `AlertList` surface. */
const SURFACE: Record<KinetixAlertSeverity, string> = {
  info: "bg-muted/40",
  warning: "bg-muted/40",
  critical: "bg-destructive/5",
};

/**
 * The words for an alert's origin. `sourceLabel` is the product's copy and is shown as given; with
 * only a machine id the segments of a key (`rule:threshold:pressure`) are made readable rather than
 * printed raw, because an implementation identifier is not product copy. The machine id itself is
 * never discarded — it stays on the row as `data-source` for debugging and auditing.
 */
function sourceWords(alert: KinetixDeviceAlert | undefined): string | undefined {
  const label = alert?.sourceLabel?.trim();
  if (label) return label;
  const id = alert?.source?.trim();
  if (!id) return undefined;
  const parts = id
    .split(/[:/.]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return humanize(id);
  return parts.map(humanize).join(" · ");
}

const BUTTON =
  "inline-flex min-h-11 items-center rounded-full px-4 text-label-md transition-colors duration-fast motion-reduce:transition-none md:min-h-9 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const BUTTON_SECONDARY = "bg-background text-foreground shadow-sm hover:bg-muted";
const BUTTON_GHOST = "text-primary hover:bg-primary/10";

const AlertCard = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, AlertCardProps>(
  ({ alert, deviceName, action, now, onAction, onAcknowledge, variant = "list", bare = false, className, ...props }, ref) => {
    const messageId = React.useId();
    // An unrecognised severity is shown as `info` rather than promoted: an alert whose severity we
    // could not read is not evidence of an emergency.
    const severity: KinetixAlertSeverity =
      alert?.severity === "critical" || alert?.severity === "warning" || alert?.severity === "info" ? alert.severity : "info";
    const acknowledged = alert?.acknowledgedAt !== undefined && alert?.acknowledgedAt !== null;
    const resolved = alert?.resolvedAt !== undefined && alert?.resolvedAt !== null;
    const state = resolved ? "resolved" : acknowledged ? "acknowledged" : "new";
    const settled = acknowledged || resolved;
    const compact = variant === "compact";
    // Human words for the screen; the machine id stays on the element as `data-source`.
    const source = sourceWords(alert);

    // Acknowledged / resolved settle into a quieter tile and text, not a faded row: opacity multiplies
    // through to every descendant and failed contrast, so the de-emphasis lives in the surface tier.
    const tile = cn(
      "grid shrink-0 place-items-center transition-colors duration-base motion-reduce:transition-none",
      compact ? "size-8 rounded-lg" : "size-10 rounded-xl",
      settled ? "bg-muted text-muted-foreground" : TILE_CLASS[severity],
    );

    const stateChip = resolved ? (
      <span data-resolved="" className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-label-md text-muted-foreground">
        <Glyph name="check" size={12} />
        Resolved
      </span>
    ) : acknowledged ? (
      <span data-acknowledged-at="" className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-label-md text-muted-foreground">
        <Glyph name="check" size={12} />
        Acknowledged
      </span>
    ) : (
      <span data-new="" className="inline-flex items-center rounded-full border border-dashed border-foreground px-2 py-0.5 text-label-md text-foreground">
        New
      </span>
    );

    const canAct = alert?.action && onAction;
    const canAck = onAcknowledge && !acknowledged && !resolved;
    const buttons =
      canAct || canAck ? (
        <>
          {canAct ? (
            <button type="button" className={cn(BUTTON, BUTTON_GHOST)} aria-describedby={messageId} title={alert.action?.description} onClick={() => onAction(alert)}>
              {alert.action?.label}
            </button>
          ) : null}
          {canAck ? (
            <button type="button" className={cn(BUTTON, BUTTON_SECONDARY)} aria-describedby={messageId} onClick={() => onAcknowledge(alert)}>
              Acknowledge
            </button>
          ) : null}
        </>
      ) : null;

    const surface = bare ? "" : compact ? cn("rounded-xl", settled ? "bg-muted/40" : SURFACE[severity]) : cn("rounded-2xl", settled ? "bg-muted/40" : SURFACE[severity]);

    if (compact) {
      return (
        <div
          ref={ref}
          data-severity={severity}
          data-acknowledged={acknowledged ? "" : undefined}
          data-alert-state={state}
          data-source={alert?.source}
          data-variant="compact"
          className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 font-sans", surface, className)}
          {...props}
        >
          <span className={tile}>
            <Glyph name={SEVERITY_GLYPH[severity]} size={16} />
          </span>
          <span className="flex min-w-0 flex-1 basis-40 flex-col">
            <span className="flex min-w-0 items-baseline gap-2">
              {/* The severity word carries the meaning; the glyph repeats it as a shape. */}
              <span className={cn("shrink-0 text-label-md font-medium", settled ? "text-muted-foreground" : WORD_CLASS[severity])}>{describeAlertSeverity(severity)}</span>
              <span id={messageId} className={cn("truncate text-body-sm", settled ? "text-muted-foreground" : "text-foreground")}>
                {deviceName ? <span className="text-muted-foreground">{deviceName}: </span> : null}
                {alert?.message}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
            <LastSync value={alert?.raisedAt} now={now} neverLabel="an unknown time" className="text-label-md" />
            {settled ? stateChip : null}
          </span>
          {action ? <span className="shrink-0">{action}</span> : null}
          {buttons ? <span className="flex shrink-0 items-center gap-1">{buttons}</span> : null}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        data-severity={severity}
        data-acknowledged={acknowledged ? "" : undefined}
        data-alert-state={state}
        data-source={alert?.source}
        data-variant="list"
        className={cn("flex items-start gap-3 font-sans transition-colors duration-base motion-reduce:transition-none", bare ? "px-4 py-3.5" : "p-4", surface, className)}
        {...props}
      >
        <span className={tile}>
          <Glyph name={SEVERITY_GLYPH[severity]} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="flex flex-wrap items-baseline gap-x-1.5 break-words text-label-md text-muted-foreground">
            {/* The severity word carries the meaning; the tile glyph repeats it as a shape. */}
            <span className={cn("font-medium", settled ? "text-muted-foreground" : WORD_CLASS[severity])}>{describeAlertSeverity(severity)}</span>
            {alert?.kind ? <span>· {humanize(alert.kind)}</span> : null}
            {deviceName ? <span>· {deviceName}</span> : null}
          </p>
          <p id={messageId} className={cn("break-words text-body-md", settled ? "text-muted-foreground" : "text-foreground")}>{alert?.message}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label-md text-muted-foreground">
            <LastSync value={alert?.raisedAt} now={now} neverLabel="an unknown time" className="text-label-md" />
            {source ? <span className="break-words">Source: {source}</span> : null}
            {stateChip}
          </p>
          {buttons ? <div className="flex flex-wrap gap-2 pt-1">{buttons}</div> : null}
        </div>
        {action ? <span className="ms-auto shrink-0">{action}</span> : null}
      </div>
    );
  },
), "AlertCard");

export { AlertCard };
