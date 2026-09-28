import * as React from "react";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AlertCard,
  CommandStatus,
  ConnectionHealth,
  DeviceCard,
  DeviceListItem,
  DeviceStateSummary,
  FirmwareStatus,
  TelemetryCard,
  TelemetryTrend,
} from "./index";
import type { KinetixDevice } from "../types/device";
import type { KinetixTelemetryPoint, KinetixTelemetrySeries } from "../types/telemetry";

/**
 * The pattern layer.
 *
 * What is being protected here is different from the primitives' suite. A primitive is tested for
 * rendering its fact; a pattern is tested for **composing** the primitives rather than reimplementing
 * them, and for the handful of rules it adds on top — chiefly that a value is never shown as current
 * when the device says it is not.
 *
 * Same axe configuration as the primitives: jsdom has no stylesheet, so contrast is covered by
 * `pnpm check:contrast` and the real-browser pass, while names, roles and ARIA validity are checked
 * here where they are cheap and deterministic.
 *
 * `list` and `listitem` are deliberately NOT disabled. They were, briefly, and the real-browser sweep
 * then caught a nested `<ul>` these tests had been configured not to see. A rule turned off because a
 * fixture was inconvenient is a rule that stops protecting the component.
 */

const NOW = "2026-09-27T12:00:00.000Z";
const at = (offsetMs: number) => new Date(Date.parse(NOW) + offsetMs).toISOString();

afterEach(cleanup);

async function axeViolations(container: HTMLElement): Promise<string[]> {
  const results = await axe.run(container, {
    rules: {
      "color-contrast": { enabled: false },
      region: { enabled: false },
      "landmark-one-main": { enabled: false },
      "page-has-heading-one": { enabled: false },
    },
  });
  return results.violations.map((v) => v.id);
}

const device = (over: Partial<KinetixDevice> = {}): KinetixDevice => ({
  id: "d1",
  name: "Cold store probe",
  type: "sensor",
  status: "online",
  battery: 64,
  signal: 71,
  lastSeenAt: at(-120_000),
  ...over,
});

const point = (over: Partial<KinetixTelemetryPoint> = {}): KinetixTelemetryPoint => ({
  timestamp: at(-60_000),
  metric: "temperature",
  value: 4.2,
  unit: "°C",
  ...over,
});

const series = (points: KinetixTelemetryPoint[]): KinetixTelemetrySeries => ({
  deviceId: "d1",
  metric: "temperature",
  points,
});

/* ------------------------------------------------------------------ DeviceCard */

describe("DeviceCard", () => {
  it("composes the primitives rather than restating them", () => {
    const { container } = render(
      <DeviceCard device={device()} reading={{ metric: "Temperature", value: 4.2, unit: "°C" }} now={NOW} />,
    );
    // The status badge's own normalisation and wording.
    expect(screen.getByText("Online")).toBeInTheDocument();
    // SensorReading's formatting, including the space before the unit.
    expect(screen.getByText("4.2 °C")).toBeInTheDocument();
    // BatteryIndicator and SignalStrength each contribute their own labelled graphic.
    expect(screen.getByLabelText(/battery/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/signal/i)).toBeInTheDocument();
    // LastSync's relative sentence, not a raw timestamp.
    expect(container.querySelector("time")).toHaveAttribute("datetime", at(-120_000));
  });

  /**
   * The rule the reference products converge on: a device mid-transition does not show the value it
   * reported before the transition started.
   */
  it.each(["syncing", "pairing", "updating"] as const)("suppresses the reading while %s", (status) => {
    render(<DeviceCard device={device({ status })} reading={{ metric: "Temperature", value: 4.2, unit: "°C" }} now={NOW} />);
    expect(screen.queryByText("4.2 °C")).not.toBeInTheDocument();
    expect(screen.getByText(`Not current while ${status}`)).toBeInTheDocument();
    // The metric is still named, so the row does not collapse and the layout does not jump.
    expect(screen.getByText("Temperature")).toBeInTheDocument();
  });

  it("shows the reading for every status that is not a transition", () => {
    for (const status of ["online", "offline", "stale", "warning", "error", "disabled"] as const) {
      const { unmount } = render(
        <DeviceCard device={device({ status })} reading={{ metric: "Temperature", value: 4.2, unit: "°C" }} now={NOW} />,
      );
      expect(screen.getByText("4.2 °C"), `${status} should still show its last reading`).toBeInTheDocument();
      unmount();
    }
  });

  it("renders a missing reading as unknown, never as a number", () => {
    render(
      <DeviceCard
        device={device()}
        reading={{ metric: "Temperature", value: 0, unit: "°C", quality: "missing" }}
        now={NOW}
      />,
    );
    expect(screen.queryByText("0 °C")).not.toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("No reading")).toBeInTheDocument();
  });

  it("puts the action in the header and leaves its behaviour to the product", () => {
    const onClick = vi.fn();
    render(<DeviceCard device={device()} action={<button onClick={onClick}>Restart probe</button>} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Restart probe" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("omits the meta row when the device reports none of it", () => {
    const { container } = render(
      <DeviceCard device={{ id: "d", name: "Bare", type: "gateway", status: "online" }} now={NOW} />,
    );
    expect(container.querySelector("time")).toBeNull();
    expect(screen.queryByLabelText(/battery/i)).toBeNull();
  });

  it("exposes the normalised status as a data attribute", () => {
    const { container } = render(<DeviceCard device={device({ status: "DISCONNECTED" as never })} now={NOW} />);
    expect(container.firstElementChild).toHaveAttribute("data-status", "offline");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <DeviceCard device={device()} reading={{ metric: "Temperature", value: 4.2, unit: "°C" }} now={NOW} />,
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  it("does not animate when the reader asks for reduced motion", () => {
    // The suppression is Tailwind's `motion-reduce:` variant, which is a media query rather than a
    // runtime branch — so what is asserted is that the class is present to be suppressed, not a
    // computed style jsdom does not have.
    const { container } = render(<DeviceCard device={device()} now={NOW} />);
    expect(container.firstElementChild?.className).toContain("motion-reduce:transition-none");
  });
});

/* ------------------------------------------------------------------ DeviceListItem */

describe("DeviceListItem", () => {
  const renderRow = (props: Partial<React.ComponentProps<typeof DeviceListItem>> = {}) =>
    render(
      <ul>
        <DeviceListItem device={device()} reading={{ value: 4.2, unit: "°C" }} now={NOW} {...props} />
      </ul>,
    );

  it("renders as a list item by default", () => {
    renderRow();
    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });

  it("can render as another element where the surrounding markup needs one", () => {
    render(<DeviceListItem as="div" device={device()} now={NOW} />);
    expect(screen.queryByRole("listitem")).toBeNull();
  });

  /** In a column of values, one stale number among live ones is read as live. */
  it("suppresses the value while the device is in transition", () => {
    renderRow({ device: device({ status: "updating" }) });
    expect(screen.queryByText("4.2 °C")).not.toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent("—");
  });

  it("still shows the value for a stale device, which has a last known reading", () => {
    renderRow({ device: device({ status: "stale" }) });
    expect(screen.getByText("4.2 °C")).toBeInTheDocument();
    expect(screen.getByText("Data is stale")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderRow({ action: <button>Reboot</button> });
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ DeviceStateSummary */

describe("DeviceStateSummary", () => {
  const fleet = [
    device({ id: "a", status: "online" }),
    device({ id: "b", status: "online" }),
    device({ id: "c", status: "offline" }),
    device({ id: "d", status: "error" }),
  ];

  it("counts the group and says so in one sentence", () => {
    render(<DeviceStateSummary devices={fleet} />);
    expect(screen.getByText("4 devices: 1 error, 1 offline, 2 online")).toBeInTheDocument();
  });

  /** The chips repeat the sentence visually; a screen reader should hear it once, not as N numbers. */
  it("hides the visual chips from assistive technology", () => {
    const { container } = render(<DeviceStateSummary devices={fleet} />);
    expect(container.querySelector("ul")).toHaveAttribute("aria-hidden", "true");
  });

  it("omits empty statuses by default and shows them on request", () => {
    const { container, rerender } = render(<DeviceStateSummary devices={fleet} />);
    expect(container.querySelectorAll("li")).toHaveLength(3);
    rerender(<DeviceStateSummary devices={fleet} showEmpty />);
    expect(container.querySelectorAll("li")).toHaveLength(9);
  });

  it("orders the visible chips worst first", () => {
    const { container } = render(<DeviceStateSummary devices={fleet} />);
    expect([...container.querySelectorAll("li")].map((li) => li.getAttribute("data-status"))).toEqual([
      "error",
      "offline",
      "online",
    ]);
  });

  it("reports an empty group as empty rather than as zero devices online", () => {
    const { container } = render(<DeviceStateSummary devices={[]} />);
    // Both surfaces say it: the spoken sentence and the one visible chip.
    expect(container.querySelector("p.sr-only")).toHaveTextContent("No devices");
    expect(container.querySelector("li")).toHaveTextContent("No devices");
    expect(container.firstElementChild).toHaveAttribute("data-total", "0");
  });

  it("carries the attention count for a product to act on", () => {
    const { container } = render(<DeviceStateSummary devices={fleet} />);
    expect(container.firstElementChild).toHaveAttribute("data-attention", "2");
  });

  it("has no axe violations", async () => {
    const { container } = render(<DeviceStateSummary devices={fleet} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ TelemetryTrend */

describe("TelemetryTrend", () => {
  const healthy = series([
    point({ timestamp: at(-180_000), value: 3 }),
    point({ timestamp: at(-120_000), value: 5 }),
    point({ timestamp: at(-60_000), value: 4 }),
  ]);

  it("writes its bounds out as text rather than leaving them to the pixels", () => {
    render(<TelemetryTrend series={healthy} />);
    expect(screen.getByText("3 °C – 5 °C")).toBeInTheDocument();
  });

  /** The reason this component exists rather than a generic sparkline. */
  it("breaks the line at a dropout instead of drawing through it", () => {
    const withGap = series([
      point({ timestamp: at(-240_000), value: 3 }),
      point({ timestamp: at(-180_000), value: 4 }),
      point({ timestamp: at(-120_000), value: 0, quality: "missing" }),
      point({ timestamp: at(-60_000), value: 5 }),
      point({ timestamp: at(-30_000), value: 6 }),
    ]);
    const { container } = render(<TelemetryTrend series={withGap} />);
    // Two segments, not one line through the gap.
    expect(container.querySelectorAll("polyline")).toHaveLength(2);
    // And the gap is stated, not merely drawn.
    expect(screen.getByText("1 missing of 5")).toBeInTheDocument();
  });

  it("does not let a missing point drag the axis to zero", () => {
    const withZeroDropout = series([
      point({ timestamp: at(-120_000), value: 18 }),
      point({ timestamp: at(-60_000), value: 0, quality: "missing" }),
      point({ timestamp: at(-30_000), value: 21 }),
    ]);
    render(<TelemetryTrend series={withZeroDropout} />);
    expect(screen.getByText("18 °C – 21 °C")).toBeInTheDocument();
  });

  it("draws a lone reading as a dot, still surrounded by its gaps", () => {
    const isolated = series([
      point({ timestamp: at(-120_000), value: 0, quality: "missing" }),
      point({ timestamp: at(-60_000), value: 9 }),
      point({ timestamp: at(-30_000), value: 0, quality: "error" }),
    ]);
    const { container } = render(<TelemetryTrend series={isolated} />);
    expect(container.querySelectorAll("circle")).toHaveLength(1);
    expect(container.querySelectorAll("polyline")).toHaveLength(0);
  });

  it("renders an empty state, not an axis, when nothing is plottable", () => {
    const { container } = render(<TelemetryTrend series={series([point({ value: 0, quality: "missing" })])} />);
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getAllByText("No readings").length).toBeGreaterThan(0);
    expect(container.firstElementChild).toHaveAttribute("data-empty");
  });

  it("names the plot for assistive technology with the same facts the footer shows", () => {
    render(<TelemetryTrend series={healthy} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("temperature: 3 readings from 3 °C to 5 °C");
  });

  it("falls back to the generated name rather than blanking on an empty label", () => {
    render(<TelemetryTrend series={healthy} label="   " />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("3 readings");
  });

  /** A time axis is a property of the data; mirroring it would flip the story per locale. */
  it("pins the plot left-to-right so the axis survives RTL", () => {
    render(<TelemetryTrend series={healthy} />);
    expect(screen.getByRole("img")).toHaveAttribute("dir", "ltr");
  });

  it("survives a flat series without dividing by zero", () => {
    const flat = series([point({ timestamp: at(-120_000), value: 7 }), point({ timestamp: at(-60_000), value: 7 })]);
    const { container } = render(<TelemetryTrend series={flat} />);
    expect(container.querySelector("polyline")?.getAttribute("points")).not.toContain("NaN");
  });

  it("survives a single point without dividing by zero", () => {
    const { container } = render(<TelemetryTrend series={series([point({ value: 7 })])} />);
    expect(container.querySelector("circle")?.getAttribute("cx")).not.toBe("NaN");
  });

  it("has no axe violations", async () => {
    const { container } = render(<TelemetryTrend series={healthy} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ TelemetryCard */

describe("TelemetryCard", () => {
  it("shows the newest reading by timestamp, not by array position", () => {
    const outOfOrder = series([
      point({ timestamp: at(-60_000), value: 9 }),
      point({ timestamp: at(-600_000), value: 1 }),
    ]);
    render(<TelemetryCard series={outOfOrder} metric="Temperature" now={NOW} />);
    expect(screen.getByText("9 °C")).toBeInTheDocument();
  });

  it("says so when the newest reading is missing, in place of the number", () => {
    const dropout = series([
      point({ timestamp: at(-600_000), value: 4 }),
      point({ timestamp: at(-60_000), value: 0, quality: "missing" }),
    ]);
    render(<TelemetryCard series={dropout} metric="Temperature" now={NOW} />);
    expect(screen.queryByText("0 °C")).not.toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getAllByText("No reading").length).toBeGreaterThan(0);
  });

  it("does not annotate a good reading", () => {
    render(<TelemetryCard series={series([point({ value: 4.2 })])} metric="Temperature" now={NOW} />);
    expect(screen.queryByText("Measured")).not.toBeInTheDocument();
  });

  it("can drop the plot", () => {
    const { container } = render(
      <TelemetryCard series={series([point()])} metric="Temperature" hideTrend now={NOW} />,
    );
    expect(container.querySelector("svg")).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <TelemetryCard series={series([point({ timestamp: at(-120_000), value: 3 }), point({ value: 5 })])} now={NOW} />,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ ConnectionHealth */

describe("ConnectionHealth", () => {
  it("separates the signals a single red dot would collapse", () => {
    const { container } = render(<ConnectionHealth device={device({ status: "online", signal: 12 })} now={NOW} />);
    const rows = [...container.querySelectorAll("dt")].map((dt) => dt.textContent);
    expect(rows).toEqual(["Status", "Signal", "Last seen"]);
    expect(screen.getByText("Online")).toBeInTheDocument();
    // Online, and a weak signal — two facts, not one verdict.
    expect(screen.getByText(/weak/i)).toBeInTheDocument();
  });

  it("distinguishes a signal of zero from a signal that was never reported", () => {
    const { rerender } = render(<ConnectionHealth device={device({ signal: 0 })} now={NOW} />);
    const reported = screen.getByText(/signal/i, { selector: "dd" }).textContent;
    rerender(<ConnectionHealth device={device({ signal: undefined })} now={NOW} />);
    expect(screen.getByText(/signal/i, { selector: "dd" }).textContent).not.toBe(reported);
  });

  /** The row a status field alone gets wrong: online, and silent for six hours. */
  it("adds a freshness row only when given a threshold", () => {
    const { container, rerender } = render(<ConnectionHealth device={device()} now={NOW} />);
    expect([...container.querySelectorAll("dt")].map((dt) => dt.textContent)).not.toContain("Data");

    rerender(<ConnectionHealth device={device({ lastSeenAt: at(-6 * 3_600_000) })} freshnessMs={60_000} now={NOW} />);
    expect(screen.getByText("Older than expected")).toBeInTheDocument();
  });

  it("calls a recent reading up to date", () => {
    render(<ConnectionHealth device={device({ lastSeenAt: at(-5_000) })} freshnessMs={60_000} now={NOW} />);
    expect(screen.getByText("Up to date")).toBeInTheDocument();
  });

  it("prefers an explicit reading timestamp over the device's last-seen", () => {
    render(
      <ConnectionHealth
        device={device({ lastSeenAt: at(-1_000) })}
        lastReadingAt={at(-10 * 3_600_000)}
        freshnessMs={60_000}
        now={NOW}
      />,
    );
    expect(screen.getByText("Older than expected")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<ConnectionHealth device={device()} freshnessMs={60_000} now={NOW} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ AlertCard */

describe("AlertCard", () => {
  const alert = {
    id: "a1",
    deviceId: "d1",
    severity: "critical" as const,
    message: "Temperature above threshold",
    raisedAt: at(-90_000),
  };

  it("renders severity as a word, not only as colour", () => {
    render(<AlertCard alert={alert} now={NOW} />);
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
    expect(screen.getByText("Temperature above threshold")).toBeInTheDocument();
  });

  it("renders the message as text, never as markup", () => {
    const { container } = render(
      <AlertCard alert={{ ...alert, message: "<img src=x onerror=alert(1)>" }} now={NOW} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
  });

  it("keeps an acknowledged alert's severity while marking it seen", () => {
    const { container } = render(<AlertCard alert={{ ...alert, acknowledgedAt: at(-30_000) }} now={NOW} />);
    expect(container.firstElementChild).toHaveAttribute("data-severity", "critical");
    expect(container.firstElementChild).toHaveAttribute("data-acknowledged");
    expect(screen.getByText("Acknowledged")).toBeInTheDocument();
  });

  it("does not promote an unreadable severity to critical", () => {
    const { container } = render(<AlertCard alert={{ ...alert, severity: "catastrophic" as never }} now={NOW} />);
    expect(container.firstElementChild).toHaveAttribute("data-severity", "info");
  });

  it("runs the acknowledge action the product supplied", () => {
    const onAck = vi.fn();
    render(<AlertCard alert={alert} action={<button onClick={onAck}>Acknowledge</button>} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
    expect(onAck).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <AlertCard alert={alert} deviceName="Cold store probe" action={<button>Acknowledge</button>} now={NOW} />,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ CommandStatus */

describe("CommandStatus", () => {
  const command = { id: "c1", deviceId: "d1", name: "reboot", status: "sent" as const, createdAt: at(-20_000) };

  it("distinguishes acknowledged from completed", () => {
    const { rerender } = render(<CommandStatus command={{ ...command, status: "acknowledged" }} now={NOW} />);
    const acknowledged = screen.getByText(/acknowledged/i).textContent;
    rerender(<CommandStatus command={{ ...command, status: "completed" }} now={NOW} />);
    expect(screen.getByText(/complete/i).textContent).not.toBe(acknowledged);
  });

  it("marks an in-flight command with an animation that reduced motion disables", () => {
    const { container } = render(<CommandStatus command={command} now={NOW} />);
    const dot = container.querySelector("[aria-hidden='true']");
    expect(dot?.className).toContain("animate-pulse");
    expect(dot?.className).toContain("motion-reduce:animate-none");
  });

  it("does not animate a settled command", () => {
    const { container } = render(<CommandStatus command={{ ...command, status: "completed" }} now={NOW} />);
    expect(container.querySelector("[aria-hidden='true']")?.className).not.toContain("animate-pulse");
  });

  it("shows an error message only for an unsuccessful command", () => {
    const { rerender } = render(
      <CommandStatus command={{ ...command, status: "failed", errorMessage: "Device refused" }} now={NOW} />,
    );
    expect(screen.getByText("Device refused")).toBeInTheDocument();
    rerender(<CommandStatus command={{ ...command, status: "completed", errorMessage: "Device refused" }} now={NOW} />);
    expect(screen.queryByText("Device refused")).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<CommandStatus command={command} showName now={NOW} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ FirmwareStatus */

describe("FirmwareStatus", () => {
  it("renders unknown as unknown rather than as up to date", () => {
    const { container } = render(<FirmwareStatus firmware={{ status: "unknown" }} />);
    expect(container.firstElementChild).toHaveAttribute("data-firmware-status", "unknown");
    expect(screen.getByText("Version not reported")).toBeInTheDocument();
  });

  it("resolves the status from the versions rather than trusting a contradictory field", () => {
    const { container } = render(
      <FirmwareStatus firmware={{ status: "up-to-date", currentVersion: "1.2.0", availableVersion: "1.4.0" }} />,
    );
    expect(container.firstElementChild).toHaveAttribute("data-firmware-status", "update-available");
  });

  it("shows the upgrade path when there is one", () => {
    render(<FirmwareStatus firmware={{ status: "update-available", currentVersion: "1.2.0", availableVersion: "1.4.0" }} />);
    expect(screen.getByText("1.2.0")).toBeInTheDocument();
    expect(screen.getByText("1.4.0")).toBeInTheDocument();
  });

  it("truncates a pathological version with CSS rather than slicing the string", () => {
    const long = "9".repeat(5_000);
    render(<FirmwareStatus firmware={{ status: "up-to-date", currentVersion: long }} />);
    const el = screen.getByText(long);
    expect(el.className).toContain("truncate");
    // The whole value is still available to a reader and to assistive technology.
    expect(el.textContent).toHaveLength(5_000);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <FirmwareStatus
        firmware={{ status: "update-available", currentVersion: "1.2.0", availableVersion: "1.4.0" }}
        action={<button>Update</button>}
      />,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ cross-cutting */

describe("every pattern", () => {
  const cases: [string, React.ReactElement][] = [
    ["DeviceCard", <DeviceCard key="a" device={device()} now={NOW} />],
    ["DeviceListItem", <DeviceListItem key="b" as="div" device={device()} now={NOW} />],
    ["DeviceStateSummary", <DeviceStateSummary key="c" devices={[device()]} />],
    ["TelemetryTrend", <TelemetryTrend key="d" series={series([point()])} />],
    ["TelemetryCard", <TelemetryCard key="e" series={series([point()])} now={NOW} />],
    ["ConnectionHealth", <ConnectionHealth key="f" device={device()} now={NOW} />],
    [
      "AlertCard",
      <AlertCard key="g" alert={{ id: "a", deviceId: "d", severity: "info", message: "m", raisedAt: at(-1_000) }} now={NOW} />,
    ],
    [
      "CommandStatus",
      <CommandStatus key="h" command={{ id: "c", deviceId: "d", name: "n", status: "queued", createdAt: at(-1_000) }} now={NOW} />,
    ],
    ["FirmwareStatus", <FirmwareStatus key="i" firmware={{ status: "unknown" }} />],
  ];

  it.each(cases)("%s forwards className to its root", (_name, element) => {
    const { container } = render(React.cloneElement(element, { className: "kx-test-hook" } as never));
    expect(container.firstElementChild?.className).toContain("kx-test-hook");
  });

  it.each(cases)("%s forwards a ref to a real element", (_name, element) => {
    const ref = React.createRef<HTMLElement>();
    render(React.cloneElement(element, { ref } as never));
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it.each(cases)("%s spreads unknown props onto its root", (_name, element) => {
    const { container } = render(React.cloneElement(element, { "data-testid": "root" } as never));
    expect(container.firstElementChild).toHaveAttribute("data-testid", "root");
  });
});
