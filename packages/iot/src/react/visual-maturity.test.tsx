import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  CameraDeviceCard,
  CommandLifecycle,
  DeviceCard,
  DeviceControlCard,
  DeviceLevelControl,
  DeviceModeControl,
  DevicePowerControl,
  DeviceSetpointControl,
  EnergySummary,
  TelemetryGrid,
  TelemetryMetric,
  TelemetryTrend,
} from "./index";
import { resolveControlState } from "../functions/control";
import { summarizeEnergy } from "../functions/energy";
import type { KinetixDevice } from "../types/device";

afterEach(cleanup);

const READY = resolveControlState({ deviceStatus: "online" });
const PENDING = resolveControlState({ deviceStatus: "online", commandStatus: "sent" });
const OFFLINE = resolveControlState({ deviceStatus: "offline" });
const dev: KinetixDevice = { id: "d", name: "Lamp", type: "light", status: "online" };
const NOW = "2026-09-30T12:00:00Z";

describe("DeviceControlCard variants", () => {
  it("defaults to surface and has no border on an ordinary card", () => {
    const { container } = render(<DeviceControlCard device={dev} control={READY} />);
    expect(container.firstElementChild).toHaveAttribute("data-variant", "surface");
    expect(container.firstElementChild?.className).not.toMatch(/(^|\s)border(\s|$)/);
  });

  it("hero shows the confirmed value big and the request as a separate dashed chip", () => {
    const { container } = render(
      <DeviceControlCard variant="hero" device={dev} control={PENDING} value="22" unit="°C" requestedValue="24" />,
    );
    expect(container.querySelector("[data-value]")).toHaveTextContent("22");
    expect(container.querySelector("[data-value]")).not.toHaveTextContent("24");
    const chip = container.querySelector("[data-state-chip='requested']")!;
    expect(chip).toHaveTextContent("Requested 24 °C, not yet confirmed");
    expect(chip.className).toContain("border-dashed");
    expect(chip.className).toContain("motion-reduce:animate-none");
    expect(container.querySelector("[aria-live],[role=status]")).toBeNull();
  });

  it("an unreachable device is dashed, worded, and keeps its last known value", () => {
    const { container } = render(<DeviceControlCard variant="hero" device={dev} control={OFFLINE} value="22" />);
    expect(container.firstElementChild?.className).toContain("border-dashed");
    expect(container.querySelector("[data-state-chip='unreachable']")).toHaveTextContent("Offline — last known value");
    expect(container.querySelector("[data-state-chip] svg")).not.toBeNull();
  });

  it("quiet is a compact tile", () => {
    const { container } = render(<DeviceControlCard variant="quiet" device={dev} control={READY} />);
    expect(container.firstElementChild).toHaveAttribute("data-variant", "quiet");
  });
});

describe("controls: size and requested treatment", () => {
  it("DevicePowerControl lg keeps aria-checked = confirmed and a 44px hit area", () => {
    render(<DevicePowerControl state="off" requested="on" control={PENDING} label="Lamp" size="lg" />);
    const sw = screen.getByRole("switch");
    expect(sw).toHaveProperty("ariaChecked", "false");
    expect(sw).toHaveAttribute("data-size", "lg");
    expect(sw.className).toContain("min-h-12");
    render(<DevicePowerControl state="on" control={READY} label="Fan" />);
    expect(screen.getByRole("switch", { name: "Fan" }).className).toContain("min-h-11");
  });

  it("DeviceLevelControl shows the confirmed value big and the request as a chip", () => {
    const { container } = render(<DeviceLevelControl value={20} target={80} control={PENDING} label="Brightness" size="lg" />);
    expect(container.querySelector("[data-confirmed]")).toHaveTextContent("20%");
    expect(container.querySelector("[data-requested]")).toHaveTextContent("Requested 80%, not yet confirmed");
    expect(container.querySelector("[data-requested-marker]")).not.toBeNull();
    expect(screen.getByRole("slider")).toHaveAttribute("type", "range");
  });

  it("DeviceSetpointControl's big number is the confirmed target; the request is a chip", () => {
    const { container } = render(
      <DeviceSetpointControl current={18} target={21} requestedTarget={23} min={5} max={30} unit="°C" label="Target" control={PENDING} />,
    );
    expect(container.querySelector("[data-confirmed]")).toHaveTextContent("21");
    expect(container.querySelector("[data-requested]")).toHaveTextContent("Requested 23°C, not yet confirmed");
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
  });
});

describe("CommandLifecycle density", () => {
  const lc = { stage: "acknowledged", attempts: 1, maxAttempts: 3, requestedValue: "on", confirmedValue: "off", ackAt: NOW } as never;

  it("compact is one line, highlights the current stage and keeps a single status region", () => {
    const { container } = render(<CommandLifecycle lifecycle={lc} density="compact" />);
    expect(container.querySelector("[data-requested]")).toBeNull();
    expect(container.querySelector("[data-step='acknowledged']")).toHaveTextContent("Acknowledged, not yet confirmed");
    expect(container.querySelectorAll("[role=status]")).toHaveLength(1);
    expect(container.querySelector("[role=status]")!.className).toContain("sr-only");
  });

  it("compact keeps the sentence visible when the request failed, and Retry", () => {
    const failed = { ...(lc as object), stage: "failed" } as never;
    render(<CommandLifecycle lifecycle={failed} density="compact" onRetry={() => {}} />);
    expect(screen.getByRole("status").className).not.toContain("sr-only");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

/**
 * The phone reflow. On a real iPhone the horizontal stage track ran off the side of the screen —
 * inside an `overflow-x: auto` preview, so there was no scrollbar to hint at it and "Confirmed", the
 * one stage the component exists to withhold, was simply unreachable. Below `sm` the steps and the
 * requested/reported pair are vertical lists; from `sm` up the horizontal track is unchanged.
 */
describe("CommandLifecycle reflows at phone widths", () => {
  const stage = (s: string, over: object = {}) =>
    ({ stage: s, attempts: 1, maxAttempts: 3, requestedValue: "on", confirmedValue: "off", ...over }) as never;
  const STAGES = ["requested", "acknowledged", "confirmed", "failed", "timed-out", "unreachable", "retrying", "cancelled"];

  it("stacks the steps below sm and only becomes a horizontal track from sm up", () => {
    const { container } = render(<CommandLifecycle lifecycle={stage("acknowledged", { ackAt: NOW })} />);
    const list = container.querySelector("ol")!;
    expect(list.className).toContain("flex-col");
    expect(list.className).toContain("sm:flex-row");
    for (const li of container.querySelectorAll("li")) {
      // A full-width row that may shrink: the stage word wraps inside it instead of widening it.
      expect(li.className).toContain("w-full");
      expect(li.className).toContain("min-w-0");
      expect(li.className).toContain("sm:w-auto");
    }
    // The connecting hairline belongs to the horizontal track and is not drawn on a phone.
    for (const rule of container.querySelectorAll("li > span[aria-hidden]")) {
      if (rule.className.includes("border-t")) expect(rule.className).toContain("sm:block");
    }
  });

  it("stacks the requested/reported pair rather than sitting it on one row", () => {
    const { container } = render(<CommandLifecycle lifecycle={stage("requested")} />);
    const values = container.querySelector("dl")!;
    expect(values.className).toContain("flex-col");
    expect(values.className).toContain("sm:flex-row");
    expect(container.querySelector("[data-requested]")!.className).toContain("break-words");
    expect(container.querySelector("[data-confirmed]")!.className).toContain("break-words");
  });

  it("never asks the text not to wrap, and never fixes a width, at any stage or density", () => {
    for (const s of STAGES) {
      for (const density of ["full", "compact"] as const) {
        const { container, unmount } = render(<CommandLifecycle lifecycle={stage(s)} density={density} onRetry={() => {}} onCancel={() => {}} />);
        expect(container.innerHTML, `${s}/${density}`).not.toMatch(/whitespace-nowrap|truncate|w-max|min-w-\[|w-\[/);
        unmount();
      }
    }
  });

  it("reserves room for the sentence so the card does not resize between stages", () => {
    const { container, rerender } = render(<CommandLifecycle lifecycle={stage("requested")} />);
    const summary = container.querySelector("[data-lifecycle-summary]")!;
    expect(summary.className).toContain("min-h-16"); // three lines on a phone
    expect(summary.className).toContain("sm:min-h-10");
    // Idle has no request to report on, so it reserves nothing.
    rerender(<CommandLifecycle lifecycle={stage("idle")} />);
    expect(container.querySelector("[data-lifecycle-summary]")!.className).not.toContain("min-h-16");
  });
});

describe("Telemetry sizes and columns", () => {
  it("TelemetryMetric xl prints the unit separately but the text is unchanged", () => {
    const { container } = render(<TelemetryMetric metric="temperature" value={23.4} unit="°C" size="xl" timestamp={NOW} now={NOW} />);
    expect(container).toHaveTextContent("23.4 °C");
    expect(container.querySelector("[data-reading-state]")).toHaveTextContent("Normal");
  });

  it("TelemetryMetric never grows a unit after an unavailable value", () => {
    const { container } = render(<TelemetryMetric metric="temperature" value={null} unit="°C" size="lg" />);
    expect(container).not.toHaveTextContent("°C");
  });

  it("TelemetryGrid columns becomes a capped auto-fit grid", () => {
    const { container } = render(
      <TelemetryGrid columns={3}>
        <span>a</span>
        <span>b</span>
      </TelemetryGrid>,
    );
    const ul = container.querySelector("ul")!;
    expect(ul).toHaveAttribute("data-columns", "3");
    expect(ul.style.gridTemplateColumns).toContain("auto-fit");
    expect(ul.className).toContain("grid");
  });

  it("TelemetryTrend marks the latest point and labels thresholds on the plot", () => {
    const s = { deviceId: "d", metric: "temperature", points: [10, 20, 30].map((v, i) => ({ timestamp: new Date(Date.parse(NOW) - (3 - i) * 60000).toISOString(), metric: "temperature", value: v, unit: "°C" })) };
    const { container } = render(<TelemetryTrend series={s} thresholds={{ warningHigh: 25 }} />);
    expect(container.querySelector("[data-latest-marker]")).not.toBeNull();
    expect(container.querySelector("[data-threshold-band='warning-high']")).not.toBeNull();
    expect(container.querySelector("[data-threshold-label='warning-high']")).toHaveTextContent("Warning");
    expect(container.querySelector("[data-latest]")).toHaveTextContent(/Latest\s*30 °C/);
    expect(container.querySelectorAll("[data-gridline]").length).toBe(3);
  });
});

describe("CameraDeviceCard scene", () => {
  it.each(["room", "entrance", "yard"] as const)("draws the %s scene when there is no poster", (scene) => {
    const { container } = render(<CameraDeviceCard device={{ ...dev, type: "camera" }} scene={scene} recording privacy="off" />);
    expect(container.querySelector("[data-poster-placeholder]")).toHaveAttribute("data-scene", scene);
    expect(container.querySelector("[data-poster-placeholder] svg")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("figcaption")).toHaveTextContent("Sample image — no live feed");
    expect(container.querySelector("[data-poster-frame] [data-recording]")).not.toBeNull();
    expect(container.querySelector("video")).toBeNull();
  });

  it("privacy on removes the scene and the poster", () => {
    const { container } = render(<CameraDeviceCard device={dev} privacy="on" poster={<img src="/x.jpg" alt="x" />} />);
    expect(container.querySelector("img,[data-poster-placeholder]")).toBeNull();
  });
});

describe("EnergySummary chart", () => {
  const summary = summarizeEnergy([{ id: "a", label: "A", value: 5 }], { unit: "kWh" });
  const days = [4, 6, null, 8];

  it("emphasises today, keeps missing days as unheighted stubs and sizes bars proportionally", () => {
    const { container } = render(<EnergySummary summary={summary} days={days} dayLabels={["a", "b", "c", "d"]} today={8} />);
    const bars = [...container.querySelectorAll<HTMLElement>("[data-day]")];
    expect(bars[3]).toHaveAttribute("data-is-today");
    expect(bars[3]!.className).toContain("bg-primary");
    expect(bars[0]!.className).toContain("bg-primary/30");
    expect(bars[2]!.style.height).toBe("");
    expect(bars[2]!.className).toContain("border-dashed");
    expect(Number.parseFloat(bars[0]!.style.height)).toBeCloseTo(50);
    expect(Number.parseFloat(bars[3]!.style.height)).toBeCloseTo(100);
  });

  it("states the comparison in words with an arrow glyph and a ghost per day", () => {
    const { container } = render(
      <EnergySummary summary={summary} days={[10, 10]} comparison={{ label: "last week", days: [8, 8] }} />,
    );
    expect(container.querySelector("[data-comparison]")).toHaveTextContent("25% above last week");
    expect(container.querySelector("[data-comparison] svg")).toHaveAttribute("data-glyph", "trend-up");
    expect(container.querySelectorAll("[data-ghost]")).toHaveLength(2);
    expect(container.querySelector("th")).not.toBeNull();
    expect(container.querySelector("details")).not.toBeNull();
  });

  it("draws a dashed baseline with a legend label when dailyBaseline is given", () => {
    const { container } = render(<EnergySummary summary={summary} days={[4, 6]} dailyBaseline={5} />);
    expect(container.querySelector("[data-baseline]")).not.toBeNull();
    expect(container).toHaveTextContent("Typical day 5.0 kWh");
  });

  it("does not compare against a period with no overlapping data", () => {
    const { container } = render(<EnergySummary summary={summary} days={[1, null]} comparison={{ label: "last week", days: [null, 2] }} />);
    expect(container.querySelector("[data-comparison]")).toBeNull();
  });
});

describe("reference-driven presentations", () => {
  it("setpoint ring is decoration only: aria-hidden svg, native buttons, one live sentence", () => {
    const { container } = render(
      <DeviceSetpointControl presentation="ring" current={20} target={21} requestedTarget={24} min={16} max={30} unit="°" label="Room" control={PENDING} secondary={<span>Humidity 48%</span>} />,
    );
    const ring = container.querySelector("[data-presentation='ring']")!;
    expect(ring.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(ring.querySelector("[data-ring-confirmed]")).not.toBeNull();
    expect(ring.querySelector("[data-ring-requested]")).not.toBeNull();
    expect(container.querySelector("[data-confirmed]")).toHaveTextContent("21");
    expect(container).toHaveTextContent("Humidity 48%");
    expect(screen.getByRole("button", { name: "Increase Room" })).toBeInTheDocument();
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
  });

  it("setpoint ring nudges through the ± buttons only", () => {
    let got = 0;
    render(<DeviceSetpointControl presentation="ring" target={21} min={16} max={30} step={1} label="Room" control={READY} onCommit={(n) => (got = n)} />);
    fireEvent.click(screen.getByRole("button", { name: "Increase Room" }));
    expect(got).toBe(22);
  });

  it("level pill keeps the native range input and draws label and value inside the track", () => {
    const { container } = render(<DeviceLevelControl variant="pill" value={40} label="Brightness" control={READY} />);
    expect(screen.getByRole("slider")).toHaveAttribute("type", "range");
    expect(container.querySelector("[data-pill-text]")).toHaveTextContent("Brightness40%");
    expect(container.querySelector("[data-pill-text]")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("[class*='h-14']")).not.toBeNull();
  });

  it("level pill shows the request as a dashed chip and never as the value", () => {
    const { container } = render(<DeviceLevelControl variant="pill" value={20} target={80} label="Brightness" control={PENDING} />);
    expect(container.querySelector("[data-requested]")).toHaveTextContent("Requested 80%, not yet confirmed");
    expect(container.querySelector("[data-pill-text]")).toHaveTextContent("20%");
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toMatch(/80/);
  });

  const modes = [
    { id: "a", label: "Auto", icon: <i data-icon="a" /> },
    { id: "b", label: "Cool", icon: <i data-icon="b" /> },
  ];

  it("mode tiles keep radiogroup semantics, show the icon above the label and select solid", () => {
    const { container } = render(<DeviceModeControl presentation="tiles" modes={modes} value="b" control={READY} label="Mode" />);
    expect(screen.getByRole("radiogroup", { name: "Mode" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Cool" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Auto" })).toHaveAttribute("aria-checked", "false");
    expect(container.querySelector("[data-icon='a']")!.parentElement).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("radio", { name: "Cool" }).className).toContain("bg-primary");
    expect(screen.getByRole("radio", { name: "Cool" }).querySelector("svg")).not.toBeNull();
  });

  it("mode tiles: requested is dashed, aria-checked stays confirmed, roving tabindex holds", () => {
    render(<DeviceModeControl presentation="tiles" modes={modes} value="a" requested="b" control={PENDING} label="Mode" />);
    expect(screen.getByRole("radio", { name: /Cool, requested/ })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /Cool, requested/ }).className).toContain("border-dashed");
    expect(document.querySelectorAll("[role=radio][tabindex='0']")).toHaveLength(1);
  });

  it("DeviceControlCard visual slot is aria-hidden in quiet and hero", () => {
    for (const variant of ["quiet", "hero"] as const) {
      const { container, unmount } = render(<DeviceControlCard variant={variant} device={dev} control={READY} value="1" visual={<b data-art="" />} />);
      expect(container.querySelector("[data-art]")!.parentElement).toHaveAttribute("aria-hidden", "true");
      unmount();
    }
  });

  it("DeviceCard takes its icon as a slot", () => {
    const { container } = render(<DeviceCard device={dev} icon={<i data-icon="x" />} />);
    expect(container.querySelector("[data-icon='x']")).not.toBeNull();
  });

  it("EnergySummary sparkline: hero value, updated line, marker, comparison, table and summary", () => {
    const summary = summarizeEnergy([{ id: "a", label: "A", value: 5 }], { unit: "kWh" });
    const { container } = render(
      <EnergySummary presentation="sparkline" summary={summary} today={9.8} updatedLabel="Updated 2 minutes ago" days={[4, 6, null, 8]} comparison={{ label: "last week", days: [4, 4, 4, 4] }} />,
    );
    expect(container.querySelector("[data-today]")).toHaveTextContent("9.8 kWh");
    expect(container.querySelector("[data-updated]")).toHaveTextContent("Updated 2 minutes ago");
    expect(container.querySelector("[data-latest-value]")).toHaveTextContent("8.0 kWh");
    expect(container.querySelector("[data-latest-marker]")).not.toBeNull();
    expect(container.querySelectorAll("[data-spark-line]")).toHaveLength(2);
    expect(container.querySelector("[data-comparison]")).toHaveTextContent("above last week");
    expect(container.querySelector("details")).not.toBeNull();
    expect(container).toHaveTextContent(/Last 4 days: 18\.0 kWh in total/);
    expect(container.querySelector("[aria-live],[role=status]")).toBeNull();
  });
});
