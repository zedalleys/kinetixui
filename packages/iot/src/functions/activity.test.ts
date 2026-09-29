import { describe, expect, it } from "vitest";
import { describeActivityEvent, groupActivityByDay, sortActivity, type KinetixActivityEvent } from "./index";

const NOW = "2026-09-27T12:00:00.000Z";
const ev = (id: string, timestamp: string | Date, over: Partial<KinetixActivityEvent> = {}): KinetixActivityEvent => ({ id, timestamp, kind: "command", message: `event ${id}`, ...over });

describe("sortActivity", () => {
  const list = [ev("b", "2026-09-27T10:00:00Z"), ev("bad", "nope"), ev("c", "2026-09-27T11:00:00Z"), ev("a", "2026-09-26T09:00:00Z")];
  it("is newest first by default, undated last", () => {
    expect(sortActivity(list).map((e) => e.id)).toEqual(["c", "b", "a", "bad"]);
  });
  it("can be oldest first, undated still last", () => {
    expect(sortActivity(list, { order: "oldest" }).map((e) => e.id)).toEqual(["a", "b", "c", "bad"]);
  });
  it("keeps ties in input order, does not mutate, accepts Date", () => {
    const tie = [ev("1", new Date(NOW)), ev("2", NOW)];
    expect(sortActivity(tie).map((e) => e.id)).toEqual(["1", "2"]);
    const copy = [...list];
    sortActivity(list);
    expect(list).toEqual(copy);
  });
  it("is safe on junk", () => {
    expect(sortActivity(null)).toEqual([]);
    expect(sortActivity([null as never])).toEqual([]);
  });
});

describe("groupActivityByDay", () => {
  const events = [
    ev("today-2", "2026-09-27T11:00:00Z"),
    ev("today-1", "2026-09-27T01:00:00Z"),
    ev("yest", "2026-09-26T23:59:00Z"),
    ev("old", "2026-09-20T10:00:00Z"),
    ev("undated", "???"),
  ];
  it("labels today, yesterday and date keys, newest day first, undated last", () => {
    const groups = groupActivityByDay(events, { now: NOW });
    expect(groups.map((g) => [g.key, g.label, g.relative])).toEqual([
      ["2026-09-27", "Today", "today"],
      ["2026-09-26", "Yesterday", "yesterday"],
      ["2026-09-20", "2026-09-20", "other"],
      ["unknown", "Unknown date", "other"],
    ]);
    expect(groups[0]!.events.map((e) => e.id)).toEqual(["today-2", "today-1"]);
  });
  it("respects an explicit UTC offset for the day boundary", () => {
    // 01:00Z on the 27th is still the 26th at UTC-5.
    const groups = groupActivityByDay(events, { now: NOW, utcOffsetMinutes: -300 });
    const today = groups.find((g) => g.relative === "today")!;
    expect(today.events.map((e) => e.id)).toEqual(["today-2"]);
    expect(groups.find((g) => g.relative === "yesterday")!.events.map((e) => e.id)).toEqual(["today-1", "yest"]);
  });
  it("supports oldest-first ordering and ignores a bad offset", () => {
    expect(groupActivityByDay(events, { now: NOW, order: "oldest" }).map((g) => g.key)).toEqual(["2026-09-20", "2026-09-26", "2026-09-27", "unknown"]);
    expect(groupActivityByDay(events, { now: NOW, utcOffsetMinutes: NaN })[0]!.key).toBe("2026-09-27");
  });
  it("is empty for no events and does not drop any", () => {
    expect(groupActivityByDay([], { now: NOW })).toEqual([]);
    expect(groupActivityByDay(null)).toEqual([]);
    expect(groupActivityByDay(events, { now: NOW }).reduce((n, g) => n + g.events.length, 0)).toBe(events.length);
  });
  it("is deterministic across time zones of the machine (UTC arithmetic only)", () => {
    expect(groupActivityByDay(events, { now: NOW })).toEqual(groupActivityByDay(events, { now: new Date(NOW) }));
  });
});

describe("describeActivityEvent", () => {
  it("adds the status as words and never lets a request read as done", () => {
    expect(describeActivityEvent(ev("1", NOW, { message: "Turn on requested", status: "requested" }))).toBe("Turn on requested (requested, not yet confirmed).");
    expect(describeActivityEvent(ev("1", NOW, { message: "Turned on", status: "acknowledged" }))).toContain("not yet confirmed");
    expect(describeActivityEvent(ev("1", NOW, { message: "Turned on", status: "confirmed" }))).toBe("Turned on (confirmed).");
    for (const [status, word] of [["failed", "failed"], ["timed-out", "timed out"], ["unreachable", "device unreachable"], ["cancelled", "cancelled"]] as const) {
      expect(describeActivityEvent(ev("1", NOW, { message: "Set", status }))).toBe(`Set (${word}).`);
    }
  });
  it("includes device name, actor/source and detail when present", () => {
    const e = ev("1", NOW, { message: "Valve opened.", deviceId: "v1", actor: "Sam", source: "schedule", detail: "For 12 minutes." });
    expect(describeActivityEvent(e, { deviceName: (id) => (id === "v1" ? "Valve 1" : undefined) })).toBe("Valve 1: Valve opened. By Sam via schedule. For 12 minutes.");
    expect(describeActivityEvent(ev("1", NOW, { message: "Ran", source: "rule-3" }))).toBe("Ran. By rule-3.");
    expect(describeActivityEvent(e)).toBe("Valve opened. By Sam via schedule. For 12 minutes.");
  });
});
