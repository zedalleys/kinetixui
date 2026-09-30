import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  CameraDeviceCard,
  CommandLifecycle,
  DeviceControlCard,
  DeviceLevelControl,
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
