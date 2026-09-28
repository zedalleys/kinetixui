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

/**
 * What axe does and does not protect here, because "0 axe violations" is easy to over-read.
 *
 * axe covers accessible names, ARIA validity and roles — real coverage, and the reason an empty
 * `aria-label` on a `role="img"` is caught. It does **not** cover colour-independence: a `<span>` whose
 * only distinguishing feature is its background class is not an axe violation, because axe cannot know
 * the colour was carrying meaning.
 *
 * So the guarantee that a device's state is readable without colour rests on the explicit text
 * assertions in "status is never conveyed by colour alone", not on this block. Verified by removing the
 * badge's status text: nineteen text assertions fail and axe stays silent. If those assertions are ever
 * weakened, axe will not catch the regression.
 */
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

describe("a blank label never removes the accessible name", () => {
  /**
   * `label` exists for translation, and the way translation fails is an empty string: a missing i18n
   * key returns `""` from most libraries. Nullish coalescing let that through, so the prop added to
   * make these primitives translatable was also the one way to get a status badge with no words in
   * it — colour-only — and a `role="img"` with an empty accessible name.
   *
   * Asserted for every primitive that takes a label, and for whitespace as well as empty, because
   * `" "` names nothing either.
   */
  for (const blank of ["", "   ", "\n\t"]) {
    const shown = JSON.stringify(blank);

    it(`status badge keeps its status text when label is ${shown}`, () => {
      render(<DeviceStatusBadge status="error" label={blank} data-testid="badge" />);
      expect(screen.getByTestId("badge")).toHaveTextContent("Error");
    });

    it(`battery keeps its accessible name when label is ${shown}`, () => {
      render(<BatteryIndicator value={72} label={blank} />);
      expect(screen.getByRole("img")).toHaveAccessibleName("Battery 72%, high");
    });

    it(`signal keeps its accessible name when label is ${shown}`, () => {
      render(<SignalStrength value={84} label={blank} />);
      expect(screen.getByRole("img")).toHaveAccessibleName("Signal 84%, excellent");
    });

    it(`last sync keeps its accessible name when label is ${shown}`, () => {
      render(<LastSync value={at(-5 * 60_000)} now={NOW} label={blank} data-testid="sync" />);
      expect(screen.getByTestId("sync")).toHaveAccessibleName("Last seen 5 minutes ago");
    });
  }

  /** A real label still wins, untrimmed — replacing the text is the prop's actual job. */
  it("passes a supplied label through unchanged", () => {
    render(<DeviceStatusBadge status="online" label=" En ligne " data-testid="badge" />);
    expect(screen.getByTestId("badge")).toHaveTextContent("En ligne");
    render(<BatteryIndicator value={72} label="Batterie 72 %" />);
    expect(screen.getByRole("img")).toHaveAccessibleName("Batterie 72 %");
  });
});

describe("status is never conveyed by colour alone", () => {
  /**
   * The hard requirement for this module: a device's state has to be readable with styling discarded.
   * Every status, asserted as text rather than as a class name — `data-status` is a styling hook and
   * proves nothing about what a person can read.
   */
  const STATUS_TEXT: Record<string, string> = {
    online: "Online",
    offline: "Offline",
    stale: "Data is stale",
    syncing: "Syncing",
    pairing: "Pairing",
    updating: "Updating",
    warning: "Needs attention",
    error: "Error",
    disabled: "Disabled",
  };

  for (const [status, text] of Object.entries(STATUS_TEXT)) {
    it(`${status} reads as "${text}"`, () => {
      render(<DeviceStatusBadge status={status} data-testid="badge" />);
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveTextContent(text);
      // Non-empty with every class removed: the words survive losing the stylesheet entirely.
      badge.className = "";
      expect(badge.textContent?.trim().length).toBeGreaterThan(0);
    });
  }

  it("distinguishes all nine statuses by text, not just by colour", () => {
    const rendered = new Set<string>();
    for (const status of Object.keys(STATUS_TEXT)) {
      const { container, unmount } = render(<DeviceStatusBadge status={status} />);
      rendered.add(container.textContent?.trim() ?? "");
      unmount();
    }
    // Nine distinct strings: no two states are told apart by appearance alone.
    expect(rendered.size).toBe(Object.keys(STATUS_TEXT).length);
  });

  /** The unknown states too — "we do not know" is a reading a person has to be able to get. */
  it("states unknown readings in words", () => {
    render(
      <>
        <BatteryIndicator value={null} />
        <SignalStrength value={null} />
      </>,
    );
    const [battery, signal] = screen.getAllByRole("img");
    expect(battery).toHaveAccessibleName("Battery level unknown");
    expect(signal).toHaveAccessibleName("Signal strength unknown");
    render(<LastSync value={null} now={NOW} data-testid="never" />);
    expect(screen.getByTestId("never")).toHaveAccessibleName("Never seen");
    render(<SensorReading metric="Soil" value={null} quality="missing" data-testid="missing" />);
    expect(screen.getByTestId("missing")).toHaveTextContent("No reading");
  });
});

describe("SensorReading precision", () => {
  /**
   * `precision` reaches `toFixed`, which throws outside 0–100. A component that throws during render
   * takes the whole tree with it, so the clamp is asserted here as well as in the formatter: this is
   * the call site that made it matter.
   */
  it("does not throw on an out-of-range precision", () => {
    for (const precision of [101, 1000, Number.POSITIVE_INFINITY, -5]) {
      expect(() => render(<SensorReading metric="T" value={23.456} unit="°C" precision={precision} />)).not.toThrow();
      cleanup();
    }
  });
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
