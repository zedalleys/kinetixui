import * as React from "react";
import axe from "axe-core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BatteryIndicator, DeviceStatusBadge, LastSync, SensorReading, SignalStrength } from "./index";

/**
 * The React primitives.
 *
 * Two things are being protected. The first is that each renders its fact as **text** — a status word,
 * a percentage, a sentence — so the reading survives greyscale, forced-colors and a screen reader.
 * The second is that "unknown" renders as unknown: the whole reason this module has bands and quality
 * fields is so a device that did not answer is not drawn as a device reporting zero.
 *
 * jsdom has no stylesheet, so `color-contrast` is off here as it is in `packages/ui` — that rule is
 * covered for the library by `pnpm check:contrast` and the real-browser pass. What axe does catch here
 * is the set that actually applies: accessible names, ARIA validity, roles.
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

describe("DeviceStatusBadge", () => {
  it("renders the status as words", () => {
    render(<DeviceStatusBadge status="online" />);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("normalises whatever the backend sent", () => {
    const { rerender } = render(<DeviceStatusBadge status="CONNECTED" />);
    expect(screen.getByText("Online")).toBeInTheDocument();
    rerender(<DeviceStatusBadge status="ota" />);
    expect(screen.getByText("Updating")).toBeInTheDocument();
    rerender(<DeviceStatusBadge status={null} />);
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("exposes the resolved status for styling without a variant API", () => {
    render(<DeviceStatusBadge status="lost" data-testid="badge" />);
    expect(screen.getByTestId("badge")).toHaveAttribute("data-status", "stale");
  });

  it("accepts a replacement label for translation", () => {
    render(<DeviceStatusBadge status="online" label="En ligne" />);
    expect(screen.getByText("En ligne")).toBeInTheDocument();
  });

  /**
   * The colour-only test. Every status must be legible with all styling discarded, which is what
   * `textContent` is: strip the classes and the dot and the word is still there.
   */
  it("never relies on colour alone, for any status", () => {
    for (const status of ["online", "offline", "stale", "syncing", "pairing", "updating", "warning", "error", "disabled"]) {
      cleanup();
      const { container } = render(<DeviceStatusBadge status={status} />);
      expect(container.textContent?.trim(), `${status} renders no text`).not.toBe("");
    }
  });

  it("marks the indicator dot as decorative, and can drop it", () => {
    const { container, rerender } = render(<DeviceStatusBadge status="online" />);
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(1);
    rerender(<DeviceStatusBadge status="online" hideIndicator />);
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(0);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("preserves className and forwards the rest", () => {
    render(<DeviceStatusBadge status="online" className="my-class" id="dsb" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("my-class");
    expect(badge.className).toContain("rounded-full");
    expect(badge).toHaveAttribute("id", "dsb");
  });
});

describe("BatteryIndicator", () => {
  it("shows the percentage and announces the band", () => {
    render(<BatteryIndicator value={72} />);
    expect(screen.getByLabelText("Battery 72%, high")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveTextContent("72%");
  });

  /** A device with no battery must not look like a device with an empty one. */
  it("renders a missing reading as unknown rather than 0%", () => {
    for (const value of [null, undefined, NaN]) {
      cleanup();
      render(<BatteryIndicator value={value as number} />);
      expect(screen.getByLabelText("Battery level unknown")).toBeInTheDocument();
      expect(screen.getByRole("img")).toHaveTextContent("—");
      expect(screen.getByRole("img")).not.toHaveTextContent("0%");
    }
  });

  it("clamps an impossible percentage", () => {
    render(<BatteryIndicator value={140} />);
    expect(screen.getByLabelText("Battery 100%, full")).toBeInTheDocument();
  });

  it("can hide the number without losing the label", () => {
    render(<BatteryIndicator value={4} hideValue />);
    const indicator = screen.getByLabelText("Battery 4%, critical");
    expect(indicator).not.toHaveTextContent("4%");
  });

  it("exposes the band and preserves className", () => {
    render(<BatteryIndicator value={20} className="my-class" data-testid="battery" />);
    expect(screen.getByTestId("battery")).toHaveAttribute("data-level", "low");
    expect(screen.getByTestId("battery").className).toContain("my-class");
  });

  /** The bar repeats what the label already says, so it must not be announced twice. */
  it("hides its visuals from assistive technology", () => {
    render(<BatteryIndicator value={72} />);
    expect(screen.getByRole("img").querySelectorAll("[aria-hidden='true']").length).toBeGreaterThanOrEqual(1);
  });
});

describe("SignalStrength", () => {
  it("shows the percentage and announces the band", () => {
    render(<SignalStrength value={84} />);
    expect(screen.getByLabelText("Signal 84%, excellent")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveTextContent("84%");
  });

  it("separates a missing signal from a reported zero", () => {
    const { rerender } = render(<SignalStrength value={null} />);
    expect(screen.getByLabelText("Signal strength unknown")).toBeInTheDocument();
    rerender(<SignalStrength value={0} />);
    expect(screen.getByLabelText("No signal")).toBeInTheDocument();
  });

  it("fills bars as shape, not colour", () => {
    const { container } = render(<SignalStrength value={40} bars={4} />);
    const meter = container.querySelector("[aria-hidden='true']");
    expect(meter?.children).toHaveLength(4);
    expect(container.querySelectorAll(".bg-secondary-foreground")).toHaveLength(2);
  });

  it("falls back to four bars for a nonsensical count", () => {
    const { container } = render(<SignalStrength value={50} bars={0} />);
    expect(container.querySelector("[aria-hidden='true']")?.children).toHaveLength(4);
  });

  it("preserves className and exposes the band", () => {
    render(<SignalStrength value={10} className="my-class" data-testid="signal" />);
    expect(screen.getByTestId("signal")).toHaveAttribute("data-level", "weak");
    expect(screen.getByTestId("signal").className).toContain("my-class");
  });
});

describe("LastSync", () => {
  it("shows the shorthand and announces the sentence", () => {
    render(<LastSync value={at(-5 * 60_000)} now={NOW} />);
    const time = screen.getByLabelText("Last seen 5 minutes ago");
    expect(time).toHaveTextContent("5m ago");
  });

  it("carries a machine-readable instant", () => {
    const value = at(-60_000);
    render(<LastSync value={value} now={NOW} data-testid="sync" />);
    expect(screen.getByTestId("sync").tagName).toBe("TIME");
    expect(screen.getByTestId("sync")).toHaveAttribute("dateTime", value);
  });

  /** An empty `dateTime` is invalid markup, so it must be absent rather than blank. */
  it("omits dateTime entirely when there is no instant", () => {
    render(<LastSync value={null} now={NOW} data-testid="sync" />);
    const time = screen.getByTestId("sync");
    expect(time).toHaveTextContent("Never");
    expect(time.hasAttribute("dateTime")).toBe(false);
    expect(screen.getByLabelText("Never seen")).toBeInTheDocument();
  });

  it("accepts a custom never label in both forms", () => {
    render(<LastSync value="nonsense" now={NOW} neverLabel="No data" />);
    expect(screen.getByLabelText("Last seen No data")).toHaveTextContent("No data");
  });

  it("preserves className", () => {
    render(<LastSync value={NOW} now={NOW} className="my-class" data-testid="sync" />);
    expect(screen.getByTestId("sync").className).toContain("my-class");
  });
});

describe("SensorReading", () => {
  it("renders metric, value and unit", () => {
    const { container } = render(<SensorReading metric="Temperature" value={23.4} unit="°C" />);
    expect(screen.getByText("Temperature")).toBeInTheDocument();
    expect(screen.getByText("23.4 °C")).toBeInTheDocument();
    // The visible text is the whole fact, so there is nothing to duplicate into an aria-label.
    expect(container.querySelector("[aria-label]")).toBeNull();
  });

  it("applies precision", () => {
    render(<SensorReading metric="Humidity" value={61.456} unit="%" precision={1} />);
    expect(screen.getByText("61.5 %")).toBeInTheDocument();
  });

  /** The case this component exists for: a sensor that did not answer, drawn as 0. */
  it("renders a missing or errored reading as words, not a number", () => {
    const { rerender } = render(<SensorReading metric="Soil moisture" value={0} quality="missing" />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("No reading")).toBeInTheDocument();
    expect(screen.queryByText("0")).toBeNull();

    rerender(<SensorReading metric="Soil moisture" value={21} quality="error" />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("Sensor error")).toBeInTheDocument();

    rerender(<SensorReading metric="Soil moisture" value={null} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("annotates an estimate but not a good reading", () => {
    const { rerender } = render(<SensorReading metric="Temperature" value={23} unit="°C" quality="estimated" />);
    expect(screen.getByText("Estimated")).toBeInTheDocument();
    rerender(<SensorReading metric="Temperature" value={23} unit="°C" quality="good" />);
    expect(screen.queryByText("Estimated")).toBeNull();
  });

  it("exposes the resolved quality and preserves className", () => {
    render(<SensorReading metric="T" value={NaN} className="my-class" data-testid="reading" />);
    expect(screen.getByTestId("reading")).toHaveAttribute("data-quality", "missing");
    expect(screen.getByTestId("reading").className).toContain("my-class");
  });
});

describe("accessibility (axe)", () => {
  const cases: [string, React.ReactElement][] = [
    ["status badge, every state", <>{["online", "offline", "stale", "syncing", "pairing", "updating", "warning", "error", "disabled"].map((s) => <DeviceStatusBadge key={s} status={s} />)}</>],
    ["battery, known and unknown", <><BatteryIndicator value={72} /><BatteryIndicator value={4} /><BatteryIndicator value={null} /></>],
    ["signal, known and unknown", <><SignalStrength value={84} /><SignalStrength value={0} /><SignalStrength value={null} /></>],
    ["last sync, dated and never", <><LastSync value={NOW} now={NOW} /><LastSync value={null} now={NOW} /></>],
    ["sensor reading, all qualities", <><SensorReading metric="Temperature" value={23.4} unit="°C" /><SensorReading metric="Soil" value={0} quality="missing" /><SensorReading metric="Flow" value={2} quality="error" /></>],
  ];

  for (const [name, element] of cases) {
    it(`has no violations: ${name}`, async () => {
      const { container } = render(element);
      expect(await axeViolations(container)).toEqual([]);
    });
  }
});

describe("reduced motion", () => {
  /**
   * These primitives do not animate, which is why `scripts/a11y-browser.mjs` has nothing to find in
   * them. Asserted rather than assumed: a transition added later to the battery bar would be the exact
   * thing #237 had to disentangle from Storybook's spinner.
   */
  it("renders no animation or transition utilities", () => {
    const { container } = render(
      <>
        <DeviceStatusBadge status="syncing" />
        <BatteryIndicator value={50} />
        <SignalStrength value={50} />
        <LastSync value={NOW} now={NOW} />
        <SensorReading metric="T" value={1} />
      </>,
    );
    for (const element of container.querySelectorAll("*")) {
      const classes = element.className;
      if (typeof classes !== "string") continue;
      for (const token of classes.split(/\s+/)) {
        expect(/^(animate-|transition(?!-none))/.test(token), `${token} animates`).toBe(false);
      }
    }
  });
});
