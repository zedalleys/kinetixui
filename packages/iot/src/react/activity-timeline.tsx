import * as React from "react";
import type { KinetixActivityDayGroup, KinetixActivityEvent, KinetixActivityStatus } from "../types/activity";
import { groupActivityByDay, type GroupActivityOptions } from "../functions/activity";
import { describeLifecycleStage } from "../functions/commands";
import { describeRelativeTime } from "../functions/automation";
import { parseTimestamp } from "../functions/time";
import { Glyph, STAGE_GLYPH, humanize, type GlyphName } from "./glyph";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * ActivityTimeline — what happened, grouped by day, newest first.
 *
 * Two nested ordered lists: days, then events inside each day. Every event shows:
 *
 * - **Time**, as a `<time dateTime>`. The visible text is the absolute clock time (`14:05`); a
 *   visually-hidden relative form ("5 minutes ago") follows it, so both are available and neither is
 *   only in a `title` tooltip.
 * - **Kind** as a glyph and a word (Command, State change, Alert…); an unrecognised kind is made
 *   readable rather than dropped.
 * - **Status**, when the event has one, as a glyph and a word from the *command lifecycle's own
 *   vocabulary* — so a `requested` entry reads "Requested, not yet confirmed" and can never be
 *   mistaken for something that happened.
 * - The message, the device (via `deviceName`), who or what did it, and an optional `detail` slot.
 *
 * `messages` are text, never markup. Clock times are UTC by default (the same deterministic default
 * as the rest of the package); pass `utcOffsetMinutes` to group and print in a local offset, or
 * `formatTime` to own the format.
 */
export interface ActivityTimelineProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">, GroupActivityOptions {
  events: readonly KinetixActivityEvent[] | null | undefined;
  /** Id to display name. Return `undefined` when unknown. */
  deviceName?: (deviceId: string) => string | undefined;
  /** Extra content per event — a link, a diff, a log excerpt. Rendered under the message. */
  renderDetail?: (event: KinetixActivityEvent) => React.ReactNode;
  /** How a clock time reads. Defaults to `HH:MM` in the group's UTC offset. */
  formatTime?: (date: Date) => string;
  /** Localise a day heading. Defaults to the group's own label ("Today", "Yesterday", `YYYY-MM-DD`). */
  formatDay?: (group: KinetixActivityDayGroup) => string;
  /** Accessible name of the timeline. Defaults to "Activity". */
  label?: string;
  emptyLabel?: string;
}

const KIND_GLYPH: Record<string, GlyphName> = {
  command: "bolt",
  "state-change": "swap",
  alert: "bell",
  automation: "retry",
  firmware: "chip",
  system: "gear",
};

/** The status words. The two unconfirmed ones say so; a confirmed one is the only one that says done. */
function statusWord(status: KinetixActivityStatus): string {
  const word = describeLifecycleStage(status);
  return status === "requested" || status === "acknowledged" ? `${word}, not yet confirmed` : word;
}

const pad = (n: number) => String(n).padStart(2, "0");

const ActivityTimeline = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, ActivityTimelineProps>(
  (
    { events, deviceName, renderDetail, formatTime, formatDay, label = "Activity", emptyLabel, now, utcOffsetMinutes, order, className, ...props },
    ref,
  ) => {
    const uid = React.useId();
    const groups = groupActivityByDay(events, { now, utcOffsetMinutes, order });
    const offset = typeof utcOffsetMinutes === "number" && Number.isFinite(utcOffsetMinutes) ? utcOffsetMinutes * 60_000 : 0;
    const clock =
      formatTime ??
      ((date: Date) => {
        const shifted = new Date(date.getTime() + offset);
        return `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
      });

    if (groups.length === 0) {
      return (
        <div ref={ref} data-empty="" className={cn("font-sans", className)} {...props}>
          <p className="text-label-md text-muted-foreground">{emptyLabel ?? "No activity yet."}</p>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("min-w-0 font-sans", className)} {...props}>
        <ol aria-label={label} className="m-0 flex list-none flex-col gap-5 p-0">
          {groups.map((group) => {
            const headingId = `${uid}-${group.key}`;
            return (
              <li key={group.key} data-day={group.key} className="flex flex-col gap-2">
                <span id={headingId} className="text-label-sm uppercase tracking-wide text-muted-foreground">
                  {formatDay ? formatDay(group) : group.label}
                </span>
                <ol aria-labelledby={headingId} className="m-0 flex list-none flex-col gap-3 border-s border-border p-0 ps-4">
                  {group.events.map((event) => {
                    const at = parseTimestamp(event.timestamp ?? null);
                    const device = event.deviceId ? deviceName?.(event.deviceId) : undefined;
                    const who = event.actor && event.source ? `${event.actor} via ${event.source}` : (event.actor ?? event.source);
                    const kind = event.kind ?? "system";
                    return (
                      <li key={event.id} data-kind={kind} data-status={event.status} className="flex min-w-0 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-label-sm text-muted-foreground">
                          {at ? (
                            <time dateTime={at.toISOString()} className="tabular-nums text-foreground">
                              {clock(at)}
                              <span className="sr-only">, {describeRelativeTime(at, { now })}</span>
                            </time>
                          ) : (
                            <span>Time unknown</span>
                          )}
                          <span data-kind-label="" className="inline-flex items-center gap-1">
                            <Glyph name={KIND_GLYPH[kind] ?? "dot"} size={12} />
                            <span>{humanize(kind)}</span>
                          </span>
                          {event.status ? (
                            <span
                              data-status-label={event.status}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5",
                                event.status === "confirmed" ? "border-border text-foreground" : "border-dashed border-foreground text-foreground",
                                (event.status === "failed" || event.status === "unreachable") && "text-destructive",
                              )}
                            >
                              <Glyph name={STAGE_GLYPH[event.status] ?? "dot"} size={12} />
                              <span>{statusWord(event.status)}</span>
                            </span>
                          ) : null}
                        </div>
                        <p className="break-words text-label-md text-foreground">
                          {device ? <span className="text-muted-foreground">{device}: </span> : null}
                          {event.message}
                        </p>
                        {who ? <p className="break-words text-label-sm text-muted-foreground">By {who}</p> : null}
                        {event.detail ? <p className="break-words text-label-sm text-muted-foreground">{event.detail}</p> : null}
                        {renderDetail?.(event)}
                      </li>
                    );
                  })}
                </ol>
              </li>
            );
          })}
        </ol>
      </div>
    );
  },
), "ActivityTimeline");

export { ActivityTimeline };
