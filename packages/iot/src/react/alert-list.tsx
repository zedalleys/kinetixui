"use client";

import * as React from "react";
import type { KinetixAlertSeverity, KinetixDeviceAlert } from "../types/alert";
import { KINETIX_ALERT_SEVERITIES } from "../types/alert";
import { countAlertsBySeverity, describeAlertSeverity, groupAlertsByDevice, sortAlerts } from "../functions/alerts";
import { parseTimestamp } from "../functions/time";
import { AlertCard } from "./alert-card";
import { Glyph, type GlyphName } from "./glyph";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * AlertList — the alerts, worst first, with the counts said out loud.
 *
 * Ordering is `sortAlerts`: open before resolved, then severity, then new before acknowledged, then
 * newest. The header states the open count per severity **as words with a glyph** ("2 Critical",
 * "1 Warning"), and how many are still unacknowledged, so the list's shape is readable before any row is.
 *
 * `deviceName` resolves an id to a name because this package has no device registry; return
 * `undefined` and the row simply omits it. With `groupByDevice` the list nests one list per device,
 * worst device first (`groupAlertsByDevice`).
 *
 * The rows share **one surface** and are separated by hairlines (a box per alert made a long list heavy);
 * the counts header is a quiet summary line. Empty is a small glyph and one sentence.
 *
 * The list announces nothing on its own: acknowledging an alert is the caller's state change, and the
 * row visibly moves to Acknowledged. Empty is a sentence, not a blank.
 */
export interface AlertListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  alerts: readonly KinetixDeviceAlert[] | null | undefined;
  /** Id to display name. Return `undefined` when unknown. */
  deviceName?: (deviceId: string) => string | undefined;
  onAcknowledge?: (alert: KinetixDeviceAlert) => void;
  onAction?: (alert: KinetixDeviceAlert) => void;
  groupByDevice?: boolean;
  /** Accessible name of the list. Defaults to "Alerts". */
  label?: string;
  /** Shown when there is nothing to list. */
  emptyLabel?: string;
  /** Hide the counts header. */
  hideSummary?: boolean;
  now?: string | Date | number;
  /**
   * `list` (default): one shared surface, hairline-separated two-line rows. `compact`: single-line
   * tinted rows for rails and asides.
   */
  variant?: "list" | "compact";
}

const GLYPH: Record<KinetixAlertSeverity, GlyphName> = { info: "info", warning: "triangle", critical: "octagon" };

const AlertList = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, AlertListProps>(
  ({ alerts, deviceName, onAcknowledge, onAction, groupByDevice = false, label = "Alerts", emptyLabel, hideSummary = false, now, variant = "list", className, ...props }, ref) => {
    const uid = React.useId();
    const sorted = sortAlerts(alerts);
    const counts = countAlertsBySeverity(sorted);
    const open = counts.info + counts.warning + counts.critical;
    const unacknowledged = sorted.filter(
      (a) => parseTimestamp(a.resolvedAt ?? null) === null && parseTimestamp(a.acknowledgedAt ?? null) === null,
    ).length;

    const card = (alert: KinetixDeviceAlert, showDevice: boolean) => (
      <AlertCard
        alert={alert}
        deviceName={showDevice ? deviceName?.(alert.deviceId) : undefined}
        now={now}
        variant={variant}
        bare={variant === "list"}
        onAcknowledge={onAcknowledge}
        onAction={onAction}
      />
    );

    // One shared surface with hairlines between rows; compact rows are their own tinted pills.
    const rows =
      variant === "compact"
        ? "m-0 flex list-none flex-col gap-1.5 p-0"
        : "m-0 flex list-none flex-col divide-y divide-border/60 overflow-hidden rounded-container bg-muted/40 p-0";

    return (
      <div ref={ref} data-count={sorted.length} className={cn("flex min-w-0 flex-col gap-3 font-sans", className)} data-variant={variant} {...props}>
        {hideSummary || sorted.length === 0 ? null : (
          <div data-alert-summary="" className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-label-md text-muted-foreground">
            {open === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <Glyph name="check" size={14} />
                No open alerts
              </span>
            ) : (
              [...KINETIX_ALERT_SEVERITIES]
                .reverse()
                .filter((s) => counts[s] > 0)
                .map((s) => (
                  <span key={s} data-severity-count={s} className={cn("inline-flex items-center gap-1.5", s === "critical" ? "text-destructive" : "text-foreground")}>
                    <Glyph name={GLYPH[s]} size={14} />
                    {/* One text node, so the count and the word are read as "2 Critical", not "2Critical". */}
                    <span>
                      <span className="tabular-nums">{counts[s]}</span> {describeAlertSeverity(s)}
                    </span>
                  </span>
                ))
            )}
            {open > 0 ? <span>{unacknowledged} not yet acknowledged</span> : null}
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="flex items-center gap-3 rounded-container bg-muted/40 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
              <Glyph name="check" size={20} />
            </span>
            <p data-empty="" className="text-body-md text-muted-foreground">{emptyLabel ?? "No alerts."}</p>
          </div>
        ) : groupByDevice ? (
          <ul aria-label={label} className="m-0 flex list-none flex-col gap-5 p-0">
            {groupAlertsByDevice(sorted).map((group) => {
              const name = deviceName?.(group.deviceId) ?? group.deviceId;
              const headingId = `${uid}-${group.deviceId}`;
              return (
                <li key={group.deviceId} data-device={group.deviceId} className="flex flex-col gap-2">
                  <span id={headingId} className="px-1 text-title-sm text-foreground">
                    {name}
                    <span className="text-label-md text-muted-foreground">
                      {" "}
                      · {group.alerts.length} {group.alerts.length === 1 ? "alert" : "alerts"}
                    </span>
                  </span>
                  <ul aria-labelledby={headingId} className={rows}>
                    {group.alerts.map((alert) => (
                      <li key={alert.id}>{card(alert, false)}</li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul aria-label={label} className={rows}>
            {sorted.map((alert) => (
              <li key={alert.id}>{card(alert, true)}</li>
            ))}
          </ul>
        )}
      </div>
    );
  },
), "AlertList");

export { AlertList };
