import * as React from "react";
import type { KinetixActivityEvent, KinetixActivityOrigin, KinetixActivityStatus } from "../types/activity";
import { describeActivityOrigin, resolveActivityOrigin, sortActivity } from "../functions/activity";
import { describeLifecycleStage } from "../functions/commands";
import { describeRelativeTime } from "../functions/automation";
import { parseTimestamp } from "../functions/time";
import { Glyph, STAGE_GLYPH, humanize, type GlyphName } from "./glyph";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * DeviceActivity — one device's history, in an order you chose, with who or what caused each event (M3).
 *
 * `ActivityTimeline` is the multi-device log grouped by day. This is the flat history of one device (or
 * one command), for a detail page or a panel, and it adds the one thing a monitoring history most needs
 * and most often guesses: the **origin**.
 *
 * - **Origin is explicit.** `user`, `device`, `automation` or `system` as the product recorded it, each
 *   with its own glyph and word. A missing origin reads "Source unknown" — it is never inferred from
 *   `actor` or `source`, so a physical switch is not credited to a person and a person is not credited
 *   to the system. Device-originated changes are first-class (`origin: "device"`).
 * - **Order is explicit.** `order` is required: `"newest"` or `"oldest"` first. Events with no usable
 *   time go last and say "Time unknown"; nothing is given a time it did not have.
 * - **Status uses the lifecycle's words.** A `requested` event reads "Requested, not yet confirmed".
 * - **The product owns the copy.** `message` is the title and `detail` the description, as given;
 *   this component adds no verbs. Duplicate events are the product's to remove.
 *
 * A real list (`<ol>`, named by `label`). Display-only rows are not focusable; `renderActions` puts real
 * buttons or links in a row, so the row itself is never a fake button.
 */
export interface DeviceActivityProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  events: readonly KinetixActivityEvent[] | null | undefined;
  /** Newest or oldest first. Required, because a history's order is a decision, not a default. */
  order: "newest" | "oldest";
  /** Accessible name of the list. Defaults to "Device activity". */
  label?: string;
  /** Real buttons or links for an event (e.g. "View command"). Never wrap the row in one. */
  renderActions?: (event: KinetixActivityEvent) => React.ReactNode;
  /** Extra content under an event's description. */
  renderDetail?: (event: KinetixActivityEvent) => React.ReactNode;
  /** How a time reads. Defaults to `YYYY-MM-DD HH:MM` UTC. */
  formatTime?: (date: Date) => string;
  /** Reference instant for the spoken relative time. */
  now?: string | Date | number | null;
  emptyLabel?: string;
}

const ORIGIN_GLYPH: Record<KinetixActivityOrigin, GlyphName> = {
  user: "circle-dot",
  device: "chip",
  automation: "retry",
  system: "gear",
  unknown: "dash",
};

const FAILED = new Set<KinetixActivityStatus>(["failed", "timed-out", "unreachable"]);
const PENDING = new Set<KinetixActivityStatus>(["requested", "acknowledged"]);

const statusWord = (status: KinetixActivityStatus) =>
  PENDING.has(status) ? `${describeLifecycleStage(status)}, not yet confirmed` : describeLifecycleStage(status);

const pad = (n: number) => String(n).padStart(2, "0");
const utcStamp = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

const DeviceActivity = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceActivityProps>(
  ({ events, order, label = "Device activity", renderActions, renderDetail, formatTime, now, emptyLabel, className, ...props }, ref) => {
    const sorted = sortActivity(events, { order });
    const clock = formatTime ?? utcStamp;

    if (sorted.length === 0) {
      return (
        <div ref={ref} data-empty="" className={cn("rounded-container bg-muted/40 p-4 font-sans text-body-md text-muted-foreground", className)} {...props}>
          {emptyLabel ?? "No activity recorded."}
        </div>
      );
    }

    return (
      <div ref={ref} data-order={order} className={cn("min-w-0 font-sans", className)} {...props}>
        <ol aria-label={label} className="m-0 flex list-none flex-col gap-0 p-0">
          {sorted.map((event, index) => {
            const origin = resolveActivityOrigin(event);
            const at = parseTimestamp(event.timestamp ?? null);
            const failed = event.status !== undefined && FAILED.has(event.status);
            const pending = event.status !== undefined && PENDING.has(event.status);
            const last = index === sorted.length - 1;
            const actions = renderActions?.(event);
            return (
              <li
                key={event.id}
                data-event-id={event.id}
                data-origin={origin}
                data-status={event.status}
                className={cn("flex min-w-0 flex-col gap-1 py-3", !last && "border-b border-border/60")}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-label-md">
                  {at ? (
                    <time dateTime={at.toISOString()} className="tabular-nums text-muted-foreground">
                      {clock(at)}
                      <span className="sr-only">, {describeRelativeTime(at, { now })}</span>
                    </time>
                  ) : (
                    <span data-time-unknown="" className="text-muted-foreground">
                      Time unknown
                    </span>
                  )}
                  <span
                    data-origin-label=""
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                      origin === "unknown" ? "border border-dashed border-muted-foreground text-muted-foreground" : "bg-muted text-foreground",
                    )}
                  >
                    <Glyph name={ORIGIN_GLYPH[origin]} size={12} />
                    <span>{describeActivityOrigin(origin)}</span>
                  </span>
                  {event.kind ? (
                    <span data-kind-label="" className="text-muted-on-container">
                      {humanize(event.kind)}
                    </span>
                  ) : null}
                  {event.status ? (
                    <span
                      data-status-label={event.status}
                      className={cn(
                        "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5",
                        event.status === "confirmed" ? "bg-muted text-foreground" : "border border-dashed",
                        failed ? "border-destructive text-destructive" : pending || event.status !== "confirmed" ? "border-foreground text-foreground" : "",
                      )}
                    >
                      <Glyph name={STAGE_GLYPH[event.status] ?? "dot"} size={12} />
                      <span>{statusWord(event.status)}</span>
                    </span>
                  ) : null}
                </div>
                <p className="m-0 break-words text-title-sm text-foreground">{event.message}</p>
                {event.detail ? <p className="m-0 break-words text-body-sm text-muted-on-container">{event.detail}</p> : null}
                {event.actor || event.source ? (
                  <p className="m-0 break-words text-body-sm text-muted-on-container">
                    By {event.actor && event.source ? `${event.actor} via ${event.source}` : (event.actor ?? event.source)}
                  </p>
                ) : null}
                {renderDetail?.(event)}
                {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
              </li>
            );
          })}
        </ol>
      </div>
    );
  },
), "DeviceActivity");

export { DeviceActivity };
