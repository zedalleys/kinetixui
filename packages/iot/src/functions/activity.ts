import type { KinetixActivityDayGroup, KinetixActivityEvent, KinetixActivityStatus } from "../types/activity";
import { parseTimestamp, resolveNow } from "./time";

/**
 * Activity-log helpers: ordering, grouping by day and one honest sentence per event.
 *
 * No `Intl`, no locale data. Day boundaries are computed in UTC shifted by an explicit offset the
 * caller passes, because the machine's own time zone would make the same log group differently on a
 * server and in a browser.
 */

const DAY_MS = 86_400_000;

const stamp = (event: KinetixActivityEvent): number | undefined => parseTimestamp(event?.timestamp ?? null)?.getTime();

/**
 * A new array in time order — newest first by default. Events with an unusable timestamp go last in
 * either direction, and ties keep input order.
 */
export function sortActivity(
  events: readonly KinetixActivityEvent[] | null | undefined,
  options: { order?: "newest" | "oldest" } = {},
): KinetixActivityEvent[] {
  if (!Array.isArray(events)) return [];
  const direction = options.order === "oldest" ? 1 : -1;
  return events
    .filter((event): event is KinetixActivityEvent => !!event)
    .map((event, index) => ({ event, index, at: stamp(event) }))
    .sort((a, b) => {
      if (a.at === b.at) return a.index - b.index;
      if (a.at === undefined) return 1;
      if (b.at === undefined) return -1;
      return direction * (a.at - b.at);
    })
    .map(({ event }) => event);
}

export type GroupActivityOptions = {
  now?: string | Date | number | null;
  /** Minutes east of UTC that define the caller's day boundary (`-300` for UTC−5). Defaults to 0. */
  utcOffsetMinutes?: number;
  order?: "newest" | "oldest";
};

const pad = (n: number) => String(n).padStart(2, "0");

function dayKey(ms: number, offsetMs: number): string {
  const d = new Date(ms + offsetMs);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * Group events by calendar day. Each group's `relative` is `today`, `yesterday` or `other`, its label
 * is "Today", "Yesterday" or the `YYYY-MM-DD` key, and events inside a group follow `order`. Events
 * with no usable timestamp are collected in a final `unknown` group rather than dropped.
 */
export function groupActivityByDay(
  events: readonly KinetixActivityEvent[] | null | undefined,
  options: GroupActivityOptions = {},
): KinetixActivityDayGroup[] {
  const offset = typeof options.utcOffsetMinutes === "number" && Number.isFinite(options.utcOffsetMinutes) ? options.utcOffsetMinutes * 60_000 : 0;
  const nowMs = resolveNow(options.now);
  const today = dayKey(nowMs, offset);
  const yesterday = dayKey(nowMs - DAY_MS, offset);

  const groups = new Map<string, KinetixActivityDayGroup>();
  const undated: KinetixActivityEvent[] = [];
  for (const event of sortActivity(events, { order: options.order })) {
    const at = stamp(event);
    if (at === undefined) {
      undated.push(event);
      continue;
    }
    const key = dayKey(at, offset);
    let group = groups.get(key);
    if (!group) {
      const relative = key === today ? "today" : key === yesterday ? "yesterday" : "other";
      group = { key, label: relative === "today" ? "Today" : relative === "yesterday" ? "Yesterday" : key, relative, events: [] };
      groups.set(key, group);
    }
    group.events.push(event);
  }
  const out = [...groups.values()];
  if (undated.length > 0) out.push({ key: "unknown", label: "Unknown date", relative: "other", events: undated });
  return out;
}

/** How a status reads in a sentence. Anything short of `confirmed` says so. */
function describeActivityStatus(status: KinetixActivityStatus): string {
  switch (status) {
    case "requested":
      return "requested, not yet confirmed";
    case "acknowledged":
      return "acknowledged, not yet confirmed";
    case "confirmed":
      return "confirmed";
    case "failed":
      return "failed";
    case "timed-out":
      return "timed out";
    case "unreachable":
      return "device unreachable";
    case "cancelled":
      return "cancelled";
  }
}

export type DescribeActivityOptions = {
  /** Resolve a device id to a name. Without it the id is not printed, only the message. */
  deviceName?: (deviceId: string) => string | undefined;
};

/**
 * One sentence for an event: the message, its status as a word, who or what did it, and the detail.
 * A `requested` or `acknowledged` event never reads as done.
 */
export function describeActivityEvent(event: KinetixActivityEvent, options: DescribeActivityOptions = {}): string {
  const device = event.deviceId ? options.deviceName?.(event.deviceId) : undefined;
  const message = event.message.trim().replace(/[.\s]+$/, "");
  let text = device ? `${device}: ${message}` : message;
  if (event.status) text += ` (${describeActivityStatus(event.status)})`;
  text += ".";
  if (event.actor && event.source) text += ` By ${event.actor} via ${event.source}.`;
  else if (event.actor ?? event.source) text += ` By ${event.actor ?? event.source}.`;
  if (event.detail) text += ` ${event.detail.trim()}`;
  return text;
}
