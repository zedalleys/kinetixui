import { describe, expect, it } from "vitest";
import {
  KINETIX_ALERT_KINDS,
  acknowledgeAlert,
  activeAlerts,
  countAlertsBySeverity,
  groupAlertsByDevice,
  highestAlertSeverity,
  sortAlerts,
  summarizeAlerts,
  type KinetixDeviceAlert,
} from "./index";

const NOW = "2026-09-27T12:00:00.000Z";
const at = (min: number) => new Date(Date.parse(NOW) + min * 60_000).toISOString();
const a = (id: string, over: Partial<KinetixDeviceAlert> = {}): KinetixDeviceAlert => ({
  id, deviceId: "d1", severity: "warning", message: id, raisedAt: at(0), ...over,
});

describe("alert model additions", () => {
  it("suggests kinds but keeps kind an open string, with an application-supplied action", () => {
    expect(KINETIX_ALERT_KINDS).toEqual([
      "device-offline", "low-battery", "abnormal-reading", "pressure-high", "flow-low",
      "firmware-update-required", "sensor-stale", "command-failed",
    ]);
    const alert: KinetixDeviceAlert = a("x", { kind: "my-own-kind", source: "rule-7", action: { id: "restart", label: "Restart pump" }, resolvedAt: NOW });
    expect(alert.kind).toBe("my-own-kind");
  });
  it("existing helpers exclude resolved alerts by default and behave as before otherwise", () => {
    const list = [a("old", { severity: "critical", resolvedAt: at(1) }), a("open", { severity: "info" })];
    expect(highestAlertSeverity(list)).toBe("info");
    expect(activeAlerts(list).map((x) => x.id)).toEqual(["open"]);
    expect(activeAlerts(list, { includeResolved: true })).toHaveLength(2);
    expect(highestAlertSeverity([a("x", { severity: "critical", acknowledgedAt: NOW })])).toBeNull();
  });
});

describe("sortAlerts", () => {
  it("orders unresolved first, severity desc, unacknowledged first, newest first", () => {
    const list = [
      a("w-old", { severity: "warning", raisedAt: at(-10) }),
      a("c-ack", { severity: "critical", acknowledgedAt: NOW }),
      a("w-new", { severity: "warning", raisedAt: at(-1) }),
      a("c-new", { severity: "critical", raisedAt: at(-2) }),
      a("i", { severity: "info" }),
      a("c-resolved", { severity: "critical", resolvedAt: NOW }),
      a("c-old", { severity: "critical", raisedAt: at(-20) }),
    ];
    expect(sortAlerts(list).map((x) => x.id)).toEqual(["c-new", "c-old", "c-ack", "w-new", "w-old", "i", "c-resolved"]);
  });
  it("sorts undated last within a tier, keeps ties in input order, and does not mutate", () => {
    const list = [a("u", { raisedAt: "nope" }), a("t1", { raisedAt: at(0) }), a("t2", { raisedAt: at(0) })];
    const copy = [...list];
    expect(sortAlerts(list).map((x) => x.id)).toEqual(["t1", "t2", "u"]);
    expect(list).toEqual(copy);
  });
  it("is safe on junk and unknown severities", () => {
    expect(sortAlerts(null)).toEqual([]);
    expect(sortAlerts([null as never, a("k")])).toHaveLength(1);
    expect(sortAlerts([a("bogus", { severity: "bogus" as never }), a("i", { severity: "info" })]).map((x) => x.id)).toEqual(["i", "bogus"]);
  });
});

describe("acknowledgeAlert", () => {
  it("returns a new alert stamped with now and leaves the original alone", () => {
    const original = a("x");
    const acked = acknowledgeAlert(original, NOW);
    expect(acked).not.toBe(original);
    expect(acked.acknowledgedAt).toBe(NOW);
    expect(original.acknowledgedAt).toBeUndefined();
    expect({ ...acked, acknowledgedAt: undefined }).toEqual({ ...original, acknowledgedAt: undefined });
  });
  it("never overwrites the first acknowledgement", () => {
    const first = acknowledgeAlert(a("x"), NOW);
    expect(acknowledgeAlert(first, at(60))).toBe(first);
  });
});

describe("groupAlertsByDevice", () => {
  it("groups, sorts within, and puts the loudest device first", () => {
    const groups = groupAlertsByDevice([
      a("1", { deviceId: "quiet", severity: "info" }),
      a("2", { deviceId: "loud", severity: "warning" }),
      a("3", { deviceId: "loud", severity: "critical" }),
      a("4", { deviceId: "done", severity: "critical", resolvedAt: NOW }),
    ]);
    expect(groups.map((g) => g.deviceId)).toEqual(["loud", "quiet", "done"]);
    expect(groups[0]).toMatchObject({ highest: "critical", unacknowledged: 2 });
    expect(groups[0]!.alerts.map((x) => x.id)).toEqual(["3", "2"]);
    expect(groups[2]).toMatchObject({ highest: null, unacknowledged: 0 });
  });
  it("counts acknowledged alerts in `highest` but not in `unacknowledged`", () => {
    const [g] = groupAlertsByDevice([a("1", { severity: "critical", acknowledgedAt: NOW })]);
    expect(g).toMatchObject({ highest: "critical", unacknowledged: 0 });
  });
  it("is empty for empty input", () => {
    expect(groupAlertsByDevice([])).toEqual([]);
    expect(groupAlertsByDevice(undefined)).toEqual([]);
  });
});

describe("counts and summary", () => {
  const list = [
    a("1", { severity: "critical" }),
    a("2", { severity: "critical", acknowledgedAt: NOW }),
    a("3", { severity: "warning", deviceId: "d2" }),
    a("4", { severity: "info", resolvedAt: NOW }),
    a("5", { severity: "bogus" as never }),
  ];
  it("counts every severity including zeroes, acknowledged included by default", () => {
    expect(countAlertsBySeverity(list)).toEqual({ info: 0, warning: 1, critical: 2 });
    expect(countAlertsBySeverity(list, { includeResolved: true })).toEqual({ info: 1, warning: 1, critical: 2 });
    expect(countAlertsBySeverity(list, { unacknowledgedOnly: true })).toEqual({ info: 0, warning: 1, critical: 1 });
    expect(countAlertsBySeverity(null)).toEqual({ info: 0, warning: 0, critical: 0 });
  });
  it("summarises with numbers only", () => {
    const s = summarizeAlerts(list);
    expect(s).toMatchObject({ total: 5, open: 4, unacknowledged: 3, highest: "critical", devices: 2 });
    expect(s.description).toBe("4 open alerts on 2 devices: 2 critical, 1 warning. 3 not yet acknowledged.");
    expect(s.description).not.toMatch(/because|caused|likely/i);
  });
  it("says so when there is nothing", () => {
    expect(summarizeAlerts([])).toMatchObject({ total: 0, open: 0, highest: null, description: "No open alerts." });
    expect(summarizeAlerts([a("r", { resolvedAt: NOW })]).description).toBe("No open alerts.");
    expect(summarizeAlerts([a("s")]).description).toBe("1 open alert on 1 device: 1 warning. 1 not yet acknowledged.");
  });
});
