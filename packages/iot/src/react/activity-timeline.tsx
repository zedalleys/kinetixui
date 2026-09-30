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
 * ## Variants (visual pass)
 * - `rail` (default): time on the start side, a vertical rail whose dots change **shape** with the
 *   status — filled (confirmed), hollow ring (requested or acknowledged: not yet confirmed), dashed ring
 *   (cancelled, retrying) and a cross (failed, timed out, unreachable) — the message strong, the actor
 *   muted and the status a worded chip.
 * - `blocks`: time on the start side and a soft rounded block per event; a block that is not confirmed
 *   has a dashed outline and one that failed a dashed destructive outline, so it is not colour-only.
 * - `compact`: one line per event (time, dot, message, status chip) for asides and rails.
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
  /** `rail` (default), `blocks` or `compact`. The list semantics are the same in all three. */
  variant?: "rail" | "blocks" | "compact";
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

const PENDING = new Set<string>(["requested", "acknowledged"]);
const FAILED = new Set<string>(["failed", "timed-out", "unreachable"]);

/** The dot on the rail. Shape (filled, ring, dashed ring, cross) is the cue; colour only reinforces it. */
function RailDot({ status }: { status: KinetixActivityStatus | undefined }) {
  if (status === undefined) return <span aria-hidden="true" className="size-2 rounded-full bg-muted-foreground/60" />;
  if (status === "confirmed") return <span aria-hidden="true" className="size-3 rounded-full bg-primary" />;
  if (FAILED.has(status)) return <Glyph name="x" size={14} className="text-destructive" />;
  if (PENDING.has(status)) return <span aria-hidden="true" className="size-3 rounded-full border-2 border-primary bg-background" />;
  return <Glyph name="dash" size={14} className="text-foreground" />;
}

const ActivityTimeline = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, ActivityTimelineProps>(
  (
    { events, deviceName, renderDetail, formatTime, formatDay, label = "Activity", emptyLabel, now, utcOffsetMinutes, order, variant = "rail", className, ...props },
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
    const compact = variant === "compact";
    const blocks = variant === "blocks";

    if (groups.length === 0) {
      return (
        <div ref={ref} data-empty="" data-variant={variant} className={cn("flex items-center gap-3 rounded-container bg-muted/40 p-4 font-sans", className)} {...props}>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Glyph name="clock" size={20} />
          </span>
          <p className="text-body-md text-muted-foreground">{emptyLabel ?? "No activity yet."}</p>
        </div>
      );
    }

    return (
      <div ref={ref} data-variant={variant} className={cn("min-w-0 font-sans", className)} {...props}>
        <ol aria-label={label} className={cn("m-0 flex list-none flex-col p-0", compact ? "gap-4" : "gap-6")}>
          {groups.map((group) => {
            const headingId = `${uid}-${group.key}`;
            return (
              <li key={group.key} data-day={group.key} className="flex flex-col gap-2">
                <span id={headingId} className="text-label-md text-muted-foreground">
                  {formatDay ? formatDay(group) : group.label}
                </span>
                <ol aria-labelledby={headingId} className={cn("m-0 flex list-none flex-col p-0", compact ? "gap-0.5" : blocks ? "gap-2" : "gap-0")}>
                  {group.events.map((event, index) => {
                    const at = parseTimestamp(event.timestamp ?? null);
                    const device = event.deviceId ? deviceName?.(event.deviceId) : undefined;
                    const who = event.actor && event.source ? `${event.actor} via ${event.source}` : (event.actor ?? event.source);
                    const kind = event.kind ?? "system";
                    const last = index === group.events.length - 1;
                    const failed = event.status !== undefined && FAILED.has(event.status);
                    const pending = event.status !== undefined && PENDING.has(event.status);

                    const time = at ? (
                      <time dateTime={at.toISOString()} className="tabular-nums">
                        {clock(at)}
                        <span className="sr-only">, {describeRelativeTime(at, { now })}</span>
                      </time>
                    ) : (
                      <span>Time unknown</span>
                    );

                    const statusChip = event.status ? (
                      <span
                        data-status-label={event.status}
                        className={cn(
                          "inline-flex max-w-full items-center gap-1 rounded-xl px-2 py-0.5 text-start text-label-md",
                          event.status === "confirmed" ? "bg-muted text-foreground" : "border border-dashed",
                          failed ? "border-destructive text-destructive" : event.status !== "confirmed" ? "border-foreground text-foreground" : "",
                        )}
                      >
                        <Glyph name={STAGE_GLYPH[event.status] ?? "dot"} size={12} />
                        {compact && PENDING.has(event.status) ? (
                          // A one-line row has no room for "…, not yet confirmed": the short word is drawn, the full sentence stays in the text.
                          <>
                            <span aria-hidden="true">{describeLifecycleStage(event.status)}</span>
                            <span className="sr-only">{statusWord(event.status)}</span>
                          </>
                        ) : (
                          <span>{statusWord(event.status)}</span>
                        )}
                      </span>
                    ) : null;

                    const kindLabel = (
                      <span data-kind-label="" className="inline-flex items-center gap-1 text-label-md text-muted-foreground">
                        <Glyph name={KIND_GLYPH[kind] ?? "dot"} size={12} />
                        <span>{humanize(kind)}</span>
                      </span>
                    );

                    const message = (
                      <p className={cn("m-0 break-words text-foreground", compact ? "truncate text-body-sm" : "text-title-sm")}>
                        {device ? <span className="font-normal text-muted-foreground">{device}: </span> : null}
                        {event.message}
                      </p>
                    );

                    const extras = (
                      <>
                        {who ? <p className="m-0 break-words text-body-sm text-muted-foreground">By {who}</p> : null}
                        {event.detail ? <p className="m-0 break-words text-body-sm text-muted-foreground">{event.detail}</p> : null}
                        {renderDetail?.(event)}
                      </>
                    );

                    if (compact) {
                      return (
                        <li key={event.id} data-kind={kind} data-status={event.status} className="flex min-h-9 min-w-0 items-center gap-3 px-1 py-1">
                          <span className="w-12 shrink-0 text-body-sm text-muted-foreground">{time}</span>
                          <span className="grid size-4 shrink-0 place-items-center">
                            <RailDot status={event.status} />
                          </span>
                          <span className="min-w-0 flex-1">{message}</span>
                          {statusChip}
                          {who || event.detail ? (
                            <span className="sr-only">
                              {who ? `By ${who}. ` : ""}
                              {event.detail}
                            </span>
                          ) : null}
                          {renderDetail ? <span className="shrink-0">{renderDetail(event)}</span> : null}
                        </li>
                      );
                    }

                    if (blocks) {
                      return (
                        <li key={event.id} data-kind={kind} data-status={event.status} className="flex min-w-0 items-start gap-3">
                          <span className="w-12 shrink-0 pt-3 text-body-sm text-muted-foreground">{time}</span>
                          <div
                            className={cn(
                              "flex min-w-0 flex-1 flex-col gap-1.5 rounded-2xl px-4 py-3",
                              failed ? "border border-dashed border-destructive bg-destructive/10" : pending ? "border border-dashed border-primary bg-primary/10" : "bg-muted/50",
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              {kindLabel}
                              {statusChip}
                            </div>
                            {message}
                            {extras}
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li key={event.id} data-kind={kind} data-status={event.status} className="flex min-w-0 gap-3">
                        <span className="w-12 shrink-0 pt-0.5 text-body-sm text-muted-foreground">{time}</span>
                        <span aria-hidden="true" className="relative flex w-4 shrink-0 justify-center">
                          <span className="mt-1 grid size-4 place-items-center">
                            <RailDot status={event.status} />
                          </span>
                          {last ? null : <span className="absolute inset-y-0 top-6 w-px bg-border" />}
                        </span>
                        <div className={cn("flex min-w-0 flex-1 flex-col gap-1", last ? "pb-0" : "pb-5")}>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {kindLabel}
                            {statusChip}
                          </div>
                          {message}
                          {extras}
                        </div>
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
