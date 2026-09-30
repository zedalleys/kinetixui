import * as React from "react";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ActivityTimeline,
  AlertCard,
  AlertList,
  CameraDeviceCard,
  DeviceGroupCard,
  DeviceHealthSummary,
  EnergySummary,
  SpaceBreadcrumb,
  SpaceRollup,
} from "./index";
import type { KinetixDevice } from "../types/device";
import type { KinetixDeviceAlert } from "../types/alert";
import type { KinetixActivityEvent, KinetixActivityStatus } from "../types/activity";
import { summarizeFleetHealth } from "../functions/device-state";
import { buildSpaceTree, rollupSpaceHealth, spacePath } from "../functions/hierarchy";
import { summarizeEnergy } from "../functions/energy";

/**
 * Alerts, fleet and space health, activity, camera and energy.
 *
 * What is protected: status is never colour-only (a word and a glyph), ordering and acknowledgement
 * behave, counts add up (a device is in exactly one health bucket), and the two things that must never
 * happen — a camera rendering a `<video>`, and a hidden-by-privacy poster staying in the DOM.
 */
afterEach(cleanup);

const NOW = "2026-09-27T12:00:00.000Z";
const MIN = 60_000;
const at = (offsetMs: number) => new Date(Date.parse(NOW) + offsetMs).toISOString();

async function axeViolations(container: HTMLElement): Promise<string[]> {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`);
}

const PHYSICAL = /(^|[\s"])(-?(ml|mr|pl|pr)-|-?(left|right)-|text-(left|right)\b|rounded-(l|r|tl|tr|bl|br)\b|border-(l|r)\b)/;
const liveRegions = (el: HTMLElement) => el.querySelectorAll('[role="status"],[role="alert"],[aria-live]');

const alert = (over: Partial<KinetixDeviceAlert> = {}): KinetixDeviceAlert => ({
  id: "a1",
  deviceId: "d1",
  severity: "warning",
  message: "Pressure above threshold",
  raisedAt: at(-10 * MIN),
  ...over,
});

/* ------------------------------------------------------------------ AlertCard */

describe("AlertCard additions", () => {
  it("shows a glyph and a word for every severity, all different", () => {
    const glyphs = (["info", "warning", "critical"] as const).map((severity) => {
      const { container, unmount } = render(<AlertCard alert={alert({ severity })} now={NOW} />);
      const word = { info: "Information", warning: "Warning", critical: "Critical" }[severity];
      expect(container).toHaveTextContent(word);
      const glyph = container.querySelector("svg")!;
      expect(glyph).toHaveAttribute("aria-hidden", "true");
      unmount();
      return glyph.getAttribute("data-glyph");
    });
    expect(new Set(glyphs).size).toBe(3);
  });

  it("shows kind and source only when the application supplied them", () => {
    const { container, rerender } = render(<AlertCard alert={alert()} now={NOW} />);
    expect(container).not.toHaveTextContent("Source");
    rerender(<AlertCard alert={alert({ kind: "pressure-high", source: "Rule 12" })} now={NOW} />);
    expect(container).toHaveTextContent("Pressure high");
    expect(container).toHaveTextContent("Source: Rule 12");
  });

  it("never prints a raw machine source key, and keeps the id for debugging", () => {
    const { container } = render(<AlertCard alert={alert({ source: "sim:threshold:soil-moisture" })} now={NOW} />);
    expect(container.textContent).not.toContain("sim:threshold:soil-moisture");
    expect(container).toHaveTextContent("Source: Sim · Threshold · Soil moisture");
    // The machine identity is not destroyed: it stays on the row as an attribute.
    expect(container.querySelector("[data-source]")).toHaveAttribute("data-source", "sim:threshold:soil-moisture");
  });

  it("shows the application's own label verbatim when it supplied one", () => {
    const { container } = render(
      <AlertCard alert={alert({ source: "sim:threshold:pressure", sourceLabel: "Pressure threshold rule" })} now={NOW} />,
    );
    expect(container).toHaveTextContent("Source: Pressure threshold rule");
    expect(container.textContent).not.toContain("sim:threshold:pressure");
    expect(container.querySelector("[data-source]")).toHaveAttribute("data-source", "sim:threshold:pressure");
  });

  it("reads New, Acknowledged or Resolved in words", () => {
    const { container, rerender } = render(<AlertCard alert={alert()} now={NOW} />);
    expect(container.querySelector("[data-new]")).toHaveTextContent("New");
    rerender(<AlertCard alert={alert({ acknowledgedAt: at(-MIN) })} now={NOW} />);
    expect(container.querySelector("[data-acknowledged-at]")).toHaveTextContent("Acknowledged");
    expect(container.querySelector("[data-new]")).toBeNull();
    rerender(<AlertCard alert={alert({ acknowledgedAt: at(-MIN), resolvedAt: at(-MIN / 2) })} now={NOW} />);
    expect(container.querySelector("[data-resolved]")).toHaveTextContent("Resolved");
    expect(container.firstElementChild).toHaveAttribute("data-alert-state", "resolved");
  });

  it("renders the alert's own action as a button and reports it", () => {
    const onAction = vi.fn();
    const a = alert({ action: { id: "restart", label: "Restart pump" } });
    render(<AlertCard alert={a} now={NOW} onAction={onAction} />);
    fireEvent.click(screen.getByRole("button", { name: "Restart pump" }));
    expect(onAction).toHaveBeenCalledWith(a);
  });

  it("offers no action button when the alert carries no action, and invents none", () => {
    render(<AlertCard alert={alert()} now={NOW} onAction={() => {}} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offers Acknowledge only on a new, unresolved alert", () => {
    const onAcknowledge = vi.fn();
    const { rerender } = render(<AlertCard alert={alert()} now={NOW} onAcknowledge={onAcknowledge} />);
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
    rerender(<AlertCard alert={alert({ acknowledgedAt: at(-MIN) })} now={NOW} onAcknowledge={onAcknowledge} />);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<AlertCard alert={alert({ resolvedAt: at(-MIN) })} now={NOW} onAcknowledge={onAcknowledge} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("stays as it was for a bare alert: no buttons, no live regions", () => {
    const { container } = render(<AlertCard alert={alert()} now={NOW} />);
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(liveRegions(container)).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ AlertList */

const names: Record<string, string> = { d1: "Pump 1", d2: "Valve 2", d3: "Probe 3" };
const mixed: KinetixDeviceAlert[] = [
  alert({ id: "info-new", deviceId: "d3", severity: "info", message: "Firmware note", raisedAt: at(-5 * MIN) }),
  alert({ id: "crit-ack", deviceId: "d1", severity: "critical", message: "Seized", raisedAt: at(-30 * MIN), acknowledgedAt: at(-20 * MIN) }),
  alert({ id: "warn-new", deviceId: "d2", severity: "warning", message: "Low flow", raisedAt: at(-15 * MIN) }),
  alert({ id: "crit-new", deviceId: "d1", severity: "critical", message: "Overpressure", raisedAt: at(-25 * MIN) }),
  alert({ id: "warn-resolved", deviceId: "d2", severity: "warning", message: "Was low", raisedAt: at(-50 * MIN), resolvedAt: at(-40 * MIN) }),
];

describe("AlertList", () => {
  it("sorts open before resolved, then by severity, then new before acknowledged", () => {
    render(<AlertList alerts={mixed} now={NOW} deviceName={(id) => names[id]} />);
    const rows = within(screen.getByRole("list", { name: "Alerts" })).getAllByRole("listitem");
    const order = rows.map((r) => r.querySelector("[data-alert-state]")!.textContent!.match(/Overpressure|Seized|Low flow|Firmware note|Was low/)![0]);
    expect(order).toEqual(["Overpressure", "Seized", "Low flow", "Firmware note", "Was low"]);
  });

  it("does not mutate the array it was given", () => {
    const copy = [...mixed];
    render(<AlertList alerts={mixed} now={NOW} />);
    expect(mixed).toEqual(copy);
  });

  it("states open counts per severity as glyph, number and word", () => {
    const { container } = render(<AlertList alerts={mixed} now={NOW} />);
    const header = container.querySelector("[data-alert-summary]")!;
    expect(header.querySelector('[data-severity-count="critical"]')).toHaveTextContent("2 Critical");
    expect(header.querySelector('[data-severity-count="warning"]')).toHaveTextContent("1 Warning");
    expect(header.querySelector('[data-severity-count="info"]')).toHaveTextContent("1 Information");
    expect(header).toHaveTextContent("3 not yet acknowledged");
    // The resolved warning is not an open one.
    expect(header.querySelectorAll("svg")).toHaveLength(3);
  });

  it("resolves device names through the callback and omits unknown ones", () => {
    const { container } = render(<AlertList alerts={mixed} now={NOW} deviceName={(id) => (id === "d1" ? "Pump 1" : undefined)} />);
    expect(container).toHaveTextContent("Pump 1");
    expect(container).not.toHaveTextContent("Valve 2");
  });

  it("acknowledges through the callback with the alert", () => {
    const onAcknowledge = vi.fn();
    render(<AlertList alerts={[alert({ id: "only" })]} now={NOW} onAcknowledge={onAcknowledge} />);
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
    expect(onAcknowledge).toHaveBeenCalledWith(expect.objectContaining({ id: "only" }));
  });

  it("groups by device, worst device first, with named nested lists", () => {
    render(<AlertList alerts={mixed} now={NOW} groupByDevice deviceName={(id) => names[id]} />);
    const outer = screen.getByRole("list", { name: "Alerts" });
    const groups = within(outer).getAllByRole("listitem").filter((li) => li.hasAttribute("data-device"));
    expect(groups.map((g) => g.getAttribute("data-device"))).toEqual(["d1", "d2", "d3"]);
    expect(within(groups[0]!).getByRole("list", { name: /Pump 1/ })).toBeInTheDocument();
    expect(groups[0]).toHaveTextContent("2 alerts");
  });

  it("says so when there is nothing, and shows no counts", () => {
    const { container } = render(<AlertList alerts={[]} />);
    expect(container).toHaveTextContent("No alerts.");
    expect(container.querySelector("[data-alert-summary]")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("says there are no open alerts when all are resolved", () => {
    const { container } = render(<AlertList alerts={[alert({ resolvedAt: at(-MIN) })]} now={NOW} />);
    expect(container.querySelector("[data-alert-summary]")).toHaveTextContent("No open alerts");
  });

  it("announces nothing on its own, is axe-clean, and uses logical properties in RTL", async () => {
    const { container } = render(
      <div dir="rtl">
        <AlertList alerts={mixed} now={NOW} deviceName={(id) => names[id]} onAcknowledge={() => {}} />
      </div>,
    );
    expect(liveRegions(container)).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(PHYSICAL);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("is axe-clean grouped", async () => {
    const { container } = render(<AlertList alerts={mixed} now={NOW} groupByDevice deviceName={(id) => names[id]} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ DeviceHealthSummary */

const dev = (i: number, over: Partial<KinetixDevice> = {}): KinetixDevice => ({
  id: `d${i}`,
  name: `Device ${i}`,
  type: "sensor",
  status: "online",
  battery: 80,
  signal: 80,
  lastSeenAt: at(-MIN),
  ...over,
});

/** Site 04: 24 devices, 22 healthy, 1 online-but-warning, 1 offline. */
const site04: KinetixDevice[] = [
  ...Array.from({ length: 22 }, (_, i) => dev(i + 1)),
  dev(23, { status: "warning" }),
  dev(24, { status: "offline", lastSeenAt: at(-3 * 60 * MIN) }),
];

describe("DeviceHealthSummary", () => {
  it("reads exactly '24 devices · 22 healthy · 1 warning · 1 offline' for Site 04", () => {
    const { container } = render(<DeviceHealthSummary devices={site04} assess={{ now: NOW }} />);
    expect(container.querySelector("[data-health-text]")!.textContent).toBe("24 devices · 22 healthy · 1 warning · 1 offline");
  });

  it("reads the same from an already-computed summary", () => {
    const summary = summarizeFleetHealth(site04, { now: NOW });
    const { container } = render(<DeviceHealthSummary summary={summary} />);
    expect(container.querySelector("[data-health-text]")!.textContent).toBe("24 devices · 22 healthy · 1 warning · 1 offline");
  });

  it("puts every device in exactly one bucket: the segments sum to the total", () => {
    // The raw summary double-counts: the offline device is also a warning-level verdict.
    const summary = summarizeFleetHealth(site04, { now: NOW });
    expect(summary.byHealth.warning).toBe(2);
    expect(summary.offline).toBe(1);

    const { container } = render(<DeviceHealthSummary summary={summary} />);
    const counts = [...container.querySelectorAll("[data-segment]")].map((s) => Number(s.getAttribute("data-count")));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(24);
    expect(container.querySelector('[data-segment="warning"]')).toHaveAttribute("data-count", "1");
    expect(container.querySelector('[data-segment="offline"]')).toHaveAttribute("data-count", "1");
    expect(container.querySelector('[data-segment="healthy"]')).toHaveAttribute("data-count", "22");
  });

  it("treats an unreachable device as offline too", () => {
    const fleet = [dev(1), dev(2, { status: "offline" })];
    const summary = summarizeFleetHealth(fleet, { now: NOW });
    const { container } = render(<DeviceHealthSummary summary={{ ...summary, entries: summary.entries.map((e) => (e.device.id === "d2" ? { ...e, connectivity: { ...e.connectivity, state: "unreachable" as const } } : e)) }} />);
    expect(container.querySelector("[data-health-text]")).toHaveTextContent("2 devices · 1 healthy · 1 offline");
  });

  it("falls back to counts, taking offline out of warning first", () => {
    const summary = summarizeFleetHealth(site04, { now: NOW });
    const { container } = render(<DeviceHealthSummary summary={{ ...summary, entries: [] }} />);
    expect(container.querySelector("[data-health-text]")!.textContent).toBe("24 devices · 22 healthy · 1 warning · 1 offline");
  });

  it("uses a different bar style per bucket, hidden from assistive technology, with glyph legend", () => {
    const { container } = render(<DeviceHealthSummary devices={site04} assess={{ now: NOW }} />);
    expect(container.querySelector("[data-health-bar]")).toHaveAttribute("aria-hidden", "true");
    const styles = ["healthy", "warning", "offline"].map((k) => (container.querySelector(`[data-segment="${k}"]`) as HTMLElement).className);
    expect(new Set(styles).size).toBe(3);
    const legend = container.querySelectorAll("[data-legend]");
    expect(legend).toHaveLength(3);
    for (const item of legend) expect(item.querySelector("svg")).not.toBeNull();
    // Word forms in the legend, not only colours.
    expect(container.querySelector('[data-legend="offline"]')).toHaveTextContent("Offline");
  });

  it("can drop the legend and keep the sentence and bar", () => {
    const { container } = render(<DeviceHealthSummary devices={site04} assess={{ now: NOW }} compact />);
    expect(container.querySelector("[data-legend]")).toBeNull();
    expect(container.querySelector("[data-health-bar]")).not.toBeNull();
  });

  it("handles an empty fleet in words", () => {
    const { container } = render(<DeviceHealthSummary devices={[]} />);
    expect(container.querySelector("[data-health-text]")).toHaveTextContent("No devices");
    expect(container.querySelector("[data-health-bar]")).toBeNull();
  });

  it("is axe-clean and announces nothing", async () => {
    const { container } = render(
      <div dir="rtl">
        <DeviceHealthSummary devices={site04} assess={{ now: NOW }} />
      </div>,
    );
    expect(liveRegions(container)).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(PHYSICAL);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ hierarchy */

const spaces = [
  { id: "farm", name: "North Farm", kind: "farm", deviceIds: [] },
  { id: "field", name: "Field 3", kind: "field", parentId: "farm", deviceIds: ["d1"] },
  { id: "zone", name: "Zone B", kind: "zone", parentId: "field", deviceIds: ["d2", "d3", "ghost"] },
];
const tree = buildSpaceTree(spaces);

describe("SpaceBreadcrumb", () => {
  const path = spacePath(tree, "zone");

  it("is a named nav with an ordered list and the current place marked", () => {
    render(<SpaceBreadcrumb path={path} />);
    const nav = screen.getByRole("navigation", { name: "Location" });
    const items = within(nav).getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual(["North Farm", "Field 3", "Zone B"]);
    expect(within(nav).getByText("Zone B")).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByText("Field 3")).not.toHaveAttribute("aria-current");
  });

  it("renders ancestors as anchors when given hrefFor, and the current place as text", () => {
    render(<SpaceBreadcrumb path={path} hrefFor={(i) => `/spaces/${i.id}`} />);
    expect(screen.getByRole("link", { name: "North Farm" })).toHaveAttribute("href", "/spaces/farm");
    expect(screen.queryByRole("link", { name: "Zone B" })).toBeNull();
  });

  it("renders ancestors as buttons when given onNavigate", () => {
    const onNavigate = vi.fn();
    render(<SpaceBreadcrumb path={path} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("button", { name: "Field 3" }));
    expect(onNavigate).toHaveBeenCalledWith({ id: "field", name: "Field 3", kind: "field" });
    expect(screen.queryByRole("button", { name: "Zone B" })).toBeNull();
  });

  it("mirrors its separators in RTL, hides them from assistive technology, and uses no physical classes", () => {
    const { container } = render(
      <div dir="rtl">
        <SpaceBreadcrumb path={path} />
      </div>,
    );
    const separators = container.querySelectorAll("li svg");
    expect(separators).toHaveLength(2);
    for (const s of separators) {
      expect(s).toHaveAttribute("aria-hidden", "true");
      expect(s.getAttribute("class")).toMatch(/rtl:-scale-x-100/);
    }
    expect(container.innerHTML).not.toMatch(PHYSICAL);
  });

  it("renders an empty nav for no path rather than throwing", () => {
    expect(() => render(<SpaceBreadcrumb path={undefined} />)).not.toThrow();
  });

  it("is axe-clean", async () => {
    const { container } = render(<SpaceBreadcrumb path={path} onNavigate={() => {}} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("SpaceRollup", () => {
  const devices = [dev(1), dev(2, { status: "warning" }), dev(3, { status: "offline", lastSeenAt: at(-3 * 60 * MIN) })];
  const rollups = rollupSpaceHealth(tree, devices.map((d) => ({ ...d, id: `d${Number(d.id.slice(1))}` })), { now: NOW });

  it("states the worst level, one bucket per device, and the placed-but-missing device", () => {
    const rollup = rollups.get("zone")!; // d2 warning, d3 offline, ghost missing
    const { container } = render(<SpaceRollup rollup={rollup} name="Zone B" />);
    expect(screen.getByRole("group", { name: "Health of Zone B" })).toBeInTheDocument();
    expect(container.querySelector("[data-worst-label]")).toHaveTextContent("Warning");
    const text = container.querySelector("[data-rollup-text]")!.textContent!;
    expect(text).toBe("3 devices · 1 warning · 1 unknown · 1 offline");
    const counts = [...container.querySelectorAll("[data-segment]")].map((s) => Number(s.getAttribute("data-count")));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
    expect(container.querySelector("[data-missing]")).toHaveTextContent("1 device is placed here but not in the device list");
  });

  it("propagates the worst status upward", () => {
    const { container } = render(<SpaceRollup rollup={rollups.get("farm")!} />);
    expect(container.querySelector("[data-rollup-text]")).toHaveTextContent("4 devices");
  });

  it("says 'No devices.' for an empty space and draws no bar", () => {
    const { container } = render(<SpaceRollup rollup={{ total: 0, healthy: 0, degraded: 0, warning: 0, critical: 0, unknown: 0, offline: 0, missing: 0, worst: "unknown" }} />);
    expect(container).toHaveTextContent("No devices.");
    expect(container.querySelector("[data-health-bar]")).toBeNull();
    expect(container.querySelector("[data-worst-label]")).toBeNull();
  });

  it("is axe-clean and announces nothing", async () => {
    const { container } = render(<SpaceRollup rollup={rollups.get("farm")!} name="North Farm" />);
    expect(liveRegions(container)).toHaveLength(0);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("DeviceGroupCard slots", () => {
  it("renders path and rollup when given, and nothing extra when not", () => {
    const { container, rerender } = render(<DeviceGroupCard name="Zone B" deviceCount={3} />);
    expect(container.querySelector('[data-slot="path"]')).toBeNull();
    expect(container.querySelector('[data-slot="rollup"]')).toBeNull();
    rerender(<DeviceGroupCard name="Zone B" deviceCount={3} path={<SpaceBreadcrumb path={spacePath(tree, "zone")} />} rollup={<span>rollup here</span>} />);
    expect(screen.getByRole("navigation", { name: "Location" })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="rollup"]')).toHaveTextContent("rollup here");
  });

  it("keeps the path outside the select button so links are not nested in a button", () => {
    render(<DeviceGroupCard name="Zone B" deviceCount={3} onSelect={() => {}} path={<a href="/x">Up</a>} />);
    const button = screen.getByRole("button", { name: /Zone B/ });
    expect(button).not.toContainElement(screen.getByRole("link", { name: "Up" }));
  });
});

/* ------------------------------------------------------------------ ActivityTimeline */

const event = (over: Partial<KinetixActivityEvent> = {}): KinetixActivityEvent => ({
  id: "e1",
  timestamp: at(-5 * MIN),
  kind: "command",
  message: "Locked front door",
  ...over,
});

describe("ActivityTimeline", () => {
  const events: KinetixActivityEvent[] = [
    event({ id: "today-new", timestamp: at(-5 * MIN), message: "Locked front door", deviceId: "d1", actor: "Sam", source: "app", status: "requested" }),
    event({ id: "today-old", timestamp: at(-2 * 60 * MIN), kind: "alert", message: "Low battery" }),
    event({ id: "yesterday", timestamp: at(-26 * 60 * MIN), kind: "firmware", message: "Update installed", status: "confirmed" }),
    event({ id: "undated", timestamp: "nonsense", kind: "maintenance", message: "Serviced" }),
  ];

  it("groups by day, newest first, as nested ordered lists with named groups", () => {
    render(<ActivityTimeline events={events} now={NOW} deviceName={(id) => (id === "d1" ? "Front door" : undefined)} />);
    const days = within(screen.getByRole("list", { name: "Activity" })).getAllByRole("listitem").filter((li) => li.hasAttribute("data-day"));
    expect(days.map((d) => d.querySelector("span")!.textContent)).toEqual(["Today", "Yesterday", "Unknown date"]);
    const today = within(days[0]!).getByRole("list", { name: "Today" });
    expect(within(today).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      expect.stringContaining("Locked front door"),
      expect.stringContaining("Low battery"),
    ]);
  });

  it("gives each event an absolute <time> with a hidden relative form", () => {
    const { container } = render(<ActivityTimeline events={[event()]} now={NOW} />);
    const time = container.querySelector("time")!;
    expect(time).toHaveAttribute("datetime", at(-5 * MIN));
    expect(time.textContent).toContain("11:55");
    expect(time.querySelector(".sr-only")).toHaveTextContent("5 minutes ago");
  });

  it("shows kind as a glyph and a word, and makes an unknown kind readable", () => {
    const { container } = render(<ActivityTimeline events={events} now={NOW} />);
    const kinds = [...container.querySelectorAll("li[data-kind]")].map((li) => [li.getAttribute("data-kind"), li.querySelector("[data-kind-label]")!.textContent, li.querySelector("[data-kind-label] svg")!.getAttribute("data-glyph")]);
    expect(kinds).toContainEqual(["command", "Command", "bolt"]);
    expect(kinds).toContainEqual(["alert", "Alert", "bell"]);
    expect(kinds).toContainEqual(["maintenance", "Maintenance", "dot"]);
  });

  it("never lets requested or acknowledged read as done", () => {
    const words = (status: KinetixActivityStatus) => {
      const { container, unmount } = render(<ActivityTimeline events={[event({ status })]} now={NOW} />);
      const chip = container.querySelector("[data-status-label]")!;
      const out = { text: chip.textContent, glyph: chip.querySelector("svg")!.getAttribute("data-glyph") };
      unmount();
      return out;
    };
    expect(words("requested").text).toBe("Requested, not yet confirmed");
    expect(words("acknowledged").text).toBe("Acknowledged, not yet confirmed");
    expect(words("confirmed").text).toBe("Confirmed");
    const glyphs = (["requested", "acknowledged", "confirmed", "failed", "timed-out", "unreachable", "cancelled"] as const).map((s) => words(s).glyph);
    expect(new Set(glyphs).size).toBe(7);
  });

  it("shows actor and source, the device, and the detail slot", () => {
    render(
      <ActivityTimeline
        events={[events[0]!]}
        now={NOW}
        deviceName={() => "Front door"}
        renderDetail={(e) => <button type="button">Open {e.id}</button>}
      />,
    );
    expect(screen.getByText(/By Sam via app/)).toBeInTheDocument();
    expect(screen.getByText(/Front door:/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open today-new" })).toBeInTheDocument();
  });

  it("honours a UTC offset for grouping and clock times, and oldest-first order", () => {
    const { container } = render(<ActivityTimeline events={[event({ timestamp: "2026-09-27T23:30:00Z", id: "late" }), event({ timestamp: "2026-09-27T08:00:00Z", id: "early" })]} now={NOW} utcOffsetMinutes={120} order="oldest" />);
    const items = [...container.querySelectorAll("li[data-kind]")];
    expect(items).toHaveLength(2);
    // 23:30Z at +02:00 is already the 28th.
    expect(container.querySelectorAll("[data-day]")).toHaveLength(2);
    expect(items[0]!.querySelector("time")!.textContent).toContain("10:00");
    expect(items[1]!.querySelector("time")!.textContent).toContain("01:30");
  });

  it("says so when empty, and is not a list", () => {
    const { container } = render(<ActivityTimeline events={[]} />);
    expect(container).toHaveTextContent("No activity yet.");
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("renders messages as text, never markup", () => {
    const { container } = render(<ActivityTimeline events={[event({ message: "<b>bold</b><img src=x onerror=alert(1)>" })]} now={NOW} />);
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("announces nothing, is axe-clean and uses logical properties in RTL", async () => {
    const { container } = render(
      <div dir="rtl">
        <ActivityTimeline events={events} now={NOW} />
      </div>,
    );
    expect(liveRegions(container)).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(PHYSICAL);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ CameraDeviceCard */

const camera: KinetixDevice = { id: "cam1", name: "Yard camera", type: "camera", status: "online", battery: 71, signal: 64, locationName: "Back yard" };

describe("CameraDeviceCard", () => {
  it("never renders a video, audio or canvas element, whatever it is given", () => {
    const { container } = render(<CameraDeviceCard device={camera} privacy="off" recording controls={<button type="button">Snapshot</button>} lastEvent={{ label: "Motion", at: at(-MIN) }} now={NOW} />);
    expect(container.querySelector("video,audio,canvas,iframe,object,embed")).toBeNull();
  });

  it("draws a labelled placeholder that says there is no live feed", () => {
    const { container } = render(<CameraDeviceCard device={camera} />);
    expect(container.querySelector("[data-poster-placeholder]")).not.toBeNull();
    expect(container.querySelector("figcaption")).toHaveTextContent("Sample image — no live feed");
    expect(container).not.toHaveTextContent(/\blive\b(?! feed)/i);
  });

  it("lets the product supply the poster and the caption", () => {
    const { container } = render(<CameraDeviceCard device={camera} poster={<img src="/snap.jpg" alt="Yard at 11:58" />} posterLabel="Snapshot from 11:58" />);
    const img = screen.getByRole("img", { name: "Yard at 11:58" });
    expect(img.className).toMatch(/object-cover/);
    expect(container.querySelector("figcaption")).toHaveTextContent("Snapshot from 11:58");
    expect(container.querySelector("[data-poster-placeholder]")).toBeNull();
  });

  it("removes the poster from the DOM when privacy is on and says why", () => {
    const { container } = render(<CameraDeviceCard device={camera} privacy="on" poster={<img src="/snap.jpg" alt="Yard at 11:58" />} />);
    expect(screen.queryByRole("img", { name: "Yard at 11:58" })).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-privacy-cover]")).toHaveTextContent("Privacy mode is on — image hidden");
    expect(container).toHaveTextContent("Privacy mode on");
  });

  it("says nothing about recording or privacy unless told", () => {
    const { container } = render(<CameraDeviceCard device={camera} />);
    expect(container.querySelector("[data-recording]")).toBeNull();
    expect(container.querySelector("[data-privacy-state]")).toBeNull();
  });

  it("states recording as a glyph and words: on, off and unknown are three different things", () => {
    const read = (recording: boolean | null) => {
      const { container, unmount } = render(<CameraDeviceCard device={camera} recording={recording} />);
      const li = container.querySelector("[data-recording]")!;
      const out = [li.textContent, li.querySelector("svg")!.getAttribute("data-glyph")];
      unmount();
      return out;
    };
    expect(read(true)).toEqual(["Recording", "record"]);
    expect(read(false)).toEqual(["Not recording", "circle"]);
    expect(read(null)).toEqual(["Recording status unknown", "dash"]);
  });

  it("shows online/offline as a word, battery, signal and the last event", () => {
    const { container, rerender } = render(<CameraDeviceCard device={camera} lastEvent={{ label: "Motion detected", at: at(-2 * MIN) }} now={NOW} />);
    expect(container).toHaveTextContent("Online");
    expect(container.querySelector("[data-last-event]")).toHaveTextContent("Motion detected");
    expect(container.querySelector("[data-last-event] time")).toHaveAttribute("datetime", at(-2 * MIN));
    rerender(<CameraDeviceCard device={{ ...camera, status: "offline" }} />);
    expect(container).toHaveTextContent("Offline");
  });

  it("is axe-clean and uses logical properties in RTL", async () => {
    const { container } = render(
      <div dir="rtl">
        <CameraDeviceCard device={camera} privacy="off" recording={false} lastEvent={{ label: "Motion", at: at(-MIN) }} controls={<button type="button">Snapshot</button>} now={NOW} />
      </div>,
    );
    expect(liveRegions(container)).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(PHYSICAL);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ EnergySummary */

describe("EnergySummary", () => {
  it("does not throw for a precision toFixed would reject", () => {
    const summary = summarizeEnergy([{ id: "a", label: "A", value: 3 }], { unit: "kWh" });
    for (const precision of [-1, 101, 1e9, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => render(<EnergySummary summary={summary} today={3} precision={precision} />).unmount(), String(precision)).not.toThrow();
    }
  });

  const items = [
    { id: "hvac", label: "Heat pump", value: 12 },
    { id: "cold", label: "Cold room", value: 6 },
    { id: "light", label: "Lighting", value: 2 },
  ];

  it("shows numeric shares in rank order with a decorative bar", () => {
    const summary = summarizeEnergy(items, { unit: "kWh" });
    const { container } = render(<EnergySummary summary={summary} />);
    const rows = within(screen.getByRole("list", { name: "Top contributors" })).getAllByRole("listitem");
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringMatching(/Heat pump\s*60%\s*·\s*12\.0 kWh/),
      expect.stringMatching(/Cold room\s*30%/),
      expect.stringMatching(/Lighting\s*10%/),
    ]);
    expect(container.querySelectorAll("li [aria-hidden='true']")).toHaveLength(3);
  });

  it("states current draw and today's total with units, or omits them", () => {
    const summary = summarizeEnergy(items);
    const { container, rerender } = render(<EnergySummary summary={summary} />);
    expect(container.querySelector("[data-current]")).toBeNull();
    rerender(<EnergySummary summary={summary} current={{ value: 1.25, unit: "kW" }} today={14.5} precision={2} />);
    expect(container.querySelector("[data-current]")).toHaveTextContent("1.25 kW");
    expect(container.querySelector("[data-today]")).toHaveTextContent("14.50 kWh");
  });

  it("flags high consumption with a glyph and words, quoting only what the summary carries", () => {
    const over = summarizeEnergy(items, { limit: 15 });
    const { container, rerender } = render(<EnergySummary summary={over} />);
    const flag = container.querySelector("[data-flag='high-consumption']")!;
    expect(flag).toHaveTextContent("High consumption — 20.0 kWh is over the 15.0 kWh limit");
    expect(flag.querySelector("svg")).toHaveAttribute("data-glyph", "triangle");
    rerender(<EnergySummary summary={summarizeEnergy(items, { baseline: 10 })} />);
    expect(container.querySelector("[data-flag]")).toHaveTextContent("100% above the baseline of 10.0 kWh");
    rerender(<EnergySummary summary={summarizeEnergy(items, { limit: 100 })} />);
    expect(container.querySelector("[data-flag]")).toBeNull();
  });

  it("charts seven days with a text summary and a table, and a missing day is a gap not a zero", () => {
    const days = [10, 12, null, 14, 20, 9, 11];
    const { container } = render(<EnergySummary summary={summarizeEnergy(items)} days={days} dayLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} />);
    const chart = container.querySelector("[data-chart]")!;
    expect(chart).toHaveTextContent(/Last 7 days: 76\.0 kWh in total.*highest on Fri at 20\.0 kWh/);
    expect(chart).toHaveTextContent("1 day has no data");
    const bars = chart.querySelectorAll("[data-day]");
    expect(bars).toHaveLength(7);
    expect((bars[2] as HTMLElement).style.height).toBe(""); // no fabricated height for the missing day
    expect(bars[4]).toHaveAttribute("data-peak");
    const rows = within(chart.querySelector("details") as HTMLElement).getAllByRole("row", { hidden: true });
    expect(rows).toHaveLength(8);
    expect(rows[3]).toHaveTextContent("Wed");
    expect(rows[3]).toHaveTextContent("No data");
    expect(chart.querySelector("details summary")).toHaveTextContent("View data");
  });

  it("says so when there is nothing to break down, and counts what it ignored", () => {
    const { container } = render(<EnergySummary summary={summarizeEnergy([{ id: "x", value: -1 }, { id: "y", value: Number.NaN }])} />);
    expect(container.querySelector("[data-empty]")).toHaveTextContent("No consumption to break down.");
    expect(container.querySelector("[data-ignored]")).toHaveTextContent("2 entries were left out");
  });

  it("asserts no cost, carbon or forecast anywhere", () => {
    const { container } = render(<EnergySummary summary={summarizeEnergy(items, { limit: 15 })} current={{ value: 1, unit: "kW" }} today={5} days={[1, 2, 3]} />);
    expect(container.textContent).not.toMatch(/cost|price|bill|carbon|CO2|forecast|predict|\$|€|£/i);
  });

  it("announces nothing, is axe-clean and uses logical properties in RTL", async () => {
    const { container } = render(
      <div dir="rtl">
        <EnergySummary summary={summarizeEnergy(items, { limit: 15 })} current={{ value: 1.2, unit: "kW" }} today={5} days={[1, 2, 3, 4, 5, 6, 7]} />
      </div>,
    );
    expect(liveRegions(container)).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(PHYSICAL);
    expect(await axeViolations(container)).toEqual([]);
  });
});
