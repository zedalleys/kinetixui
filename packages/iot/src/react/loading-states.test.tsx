import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DeviceBattery, SensorReading, SignalStrength, TelemetryMetric } from "./index";
import { describeDeviceBattery, describeSignal, describeTelemetryReading, evaluateReading } from "../functions";

/**
 * `loading` is a reading's sixth state, and the only one that is about **us** rather than the device.
 *
 * The four that existed answered "what did the device say?" — a number, a number that is old
 * (`stale`), nothing (`unknown`), or a refusal (`unavailable`/`unsupported`). None of them answers
 * "have we been told yet?", so a surface awaiting its first reading could only render "Unknown", which
 * says the device was asked and had nothing to give. That sends somebody to inspect hardware that is
 * fine. These tests pin the separation at every layer that can collapse it.
 *
 * **What they prove, and what they do not.** jsdom performs no layout, no bidi reordering and no media
 * queries. So: the attribute, text and structure assertions here are real, and anything about rendered
 * geometry is not. Specifically —
 *
 * - *Layout stability* is asserted here only as the mechanism (the placeholder is sized in `ch`/`em`,
 *   so it scales with the type rather than being pinned in pixels). That the slot is actually the same
 *   height loaded and loading is measured in the browser by `scripts/iot-monitoring.mjs`.
 * - *Reduced motion* is asserted here as the class pairing, not as a stopped animation. jsdom resolves
 *   no `prefers-reduced-motion`, so the proof that the bar is still visible without the pulse is the
 *   browser gate's `reduced-motion` condition.
 * - *RTL* is asserted here as the isolation structure. That an unisolated run reorders was measured in
 *   Chromium (M5.6 Phase G); jsdom cannot show it.
 */

afterEach(cleanup);

const NOW = "2026-01-01T12:00:00.000Z";
const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();
const MIN = 60_000;

const sentenceOf = (c: HTMLElement) => c.querySelector("[data-reading-sentence]")?.textContent?.trim() ?? "";

describe("loading is not unavailable, and neither is a zero", () => {
  it("evaluateReading calls a pending reading `loading`, not `unavailable`", () => {
    expect(evaluateReading({ value: null, loading: true }).state).toBe("loading");
    expect(evaluateReading({ value: null }).state).toBe("unavailable");
  });

  it("evaluateReading never infers `loading` from an absent value", () => {
    // The whole point of the flag: an absent value cannot tell "not asked yet" from "asked, nothing
    // back". Only the caller knows, so only the caller may say.
    for (const absent of [null, undefined, Number.NaN]) {
      expect(evaluateReading({ value: absent as number | null }).state).toBe("unavailable");
      expect(evaluateReading({ value: absent as number | null, loading: false }).state).toBe("unavailable");
    }
  });

  it("evaluateReading leaves a reading that is already here alone, loading or not", () => {
    const thresholds = { criticalHigh: 40 };
    // A refresh in flight over a real number must not blank it or downgrade its verdict.
    expect(evaluateReading({ value: 50, thresholds, loading: true }).state).toBe("critical");
    expect(evaluateReading({ value: 20, thresholds, loading: true }).state).toBe("normal");
    expect(evaluateReading({ value: 20, thresholds, loading: true, timestamp: ago(60 * MIN), staleAfterMs: MIN, now: NOW }).state).toBe("stale");
  });

  it("a measured zero stays a measurement while loading", () => {
    // The defect this whole state set exists to prevent, in its sharpest form.
    expect(evaluateReading({ value: 0, loading: true }).state).toBe("normal");
    const { container } = render(<TelemetryMetric label="Flow" value={0} unit="L/min" loading now={NOW} />);
    expect(container.querySelector("[data-reading-state]")).toHaveAttribute("data-reading-state", "normal");
    expect(container.querySelector("[data-value-state]")).toHaveAttribute("data-value-state", "known");
    expect(container.querySelector("[data-reading-placeholder]")).toBeNull();
    expect(sentenceOf(container)).toBe("Flow 0 L/min, normal");
  });

  it("quality `error` with loading is loading, because the caller said a request is open", () => {
    // `error`/`missing` is how a product reports "nothing usable". With `loading` the caller is saying
    // the open request is what matters; without it, the reading is unavailable.
    const { container } = render(<TelemetryMetric label="Air quality" value={41} unit="AQI" quality="error" loading now={NOW} />);
    expect(container.querySelector("[data-reading-state]")).toHaveAttribute("data-reading-state", "loading");
    cleanup();
    const plain = render(<TelemetryMetric label="Air quality" value={41} unit="AQI" quality="error" now={NOW} />);
    expect(plain.container.querySelector("[data-reading-state]")).toHaveAttribute("data-reading-state", "unavailable");
  });
});

describe("the spoken sentence says which of the two it is", () => {
  it("describeTelemetryReading distinguishes loading from unknown and unavailable", () => {
    const base = { label: "Pressure" } as const;
    expect(describeTelemetryReading({ ...base, availability: "loading" })).toBe("Pressure loading, no reading yet");
    expect(describeTelemetryReading({ ...base, availability: "unknown" })).toBe("Pressure unknown, no reading");
    expect(describeTelemetryReading({ ...base, availability: "unavailable" })).toBe("Pressure unavailable, no reading");
  });

  it("a loading sentence never contains a number", () => {
    // A value passed alongside a pending state is not spoken: there is no reading to read out.
    const said = describeTelemetryReading({ label: "Pressure", availability: "loading", valueText: "2.4", unitText: "bar", ageText: "measured 1 minute ago" });
    expect(said).toBe("Pressure loading, no reading yet");
    expect(said).not.toMatch(/\d/);
  });

  it("describeDeviceBattery says loading rather than level unknown", () => {
    expect(describeDeviceBattery({ value: null, loading: true })).toBe("Battery loading, no reading yet");
    expect(describeDeviceBattery({ value: null })).toBe("Battery level unknown");
    // A level in hand wins: a refresh over 72 % is still 72 %.
    expect(describeDeviceBattery({ value: 72, loading: true })).toBe("Battery 72 percent");
    // And a device with no battery is not waiting for one.
    expect(describeDeviceBattery({ value: null, loading: true, support: "unsupported" })).toBe("Battery not supported by this device");
  });

  it("describeSignal keeps loading, unknown and a reported zero apart", () => {
    expect(describeSignal(null, { loading: true })).toBe("Signal loading, no reading yet");
    expect(describeSignal(null)).toBe("Signal strength unknown");
    // 0 is a measurement, so it is never overwritten by a pending request.
    expect(describeSignal(0, { loading: true })).toBe("No signal");
    expect(describeSignal(84, { loading: true })).toBe("Signal 84%, excellent");
  });
});

describe("TelemetryMetric", () => {
  it("renders a placeholder and the word, and never the unknown or dash text", () => {
    const { container } = render(<TelemetryMetric label="Line pressure" value={null} unit="bar" loading now={NOW} />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("data-reading-state", "loading");
    expect(root).toHaveAttribute("data-value-state", "loading");
    expect(root).toHaveAttribute("data-loading", "pending");
    expect(container.querySelector("[data-reading-placeholder]")).not.toBeNull();
    expect(root.textContent).toContain("Loading");
    expect(root.textContent).not.toContain("Unknown");
    expect(root.textContent).not.toContain("—");
    expect(sentenceOf(container)).toBe("Line pressure loading, no reading yet");
  });

  it("sets aria-busy while pending and drops it once the reading lands", () => {
    const { container, rerender } = render(<TelemetryMetric label="Line pressure" value={null} unit="bar" loading now={NOW} />);
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    rerender(<TelemetryMetric label="Line pressure" value={2.4} unit="bar" now={NOW} />);
    expect(container.firstElementChild).not.toHaveAttribute("aria-busy");
    expect(container.firstElementChild).not.toHaveAttribute("data-loading");
  });

  it("loading → available: the sentence changes from the phrase to the value", () => {
    const { container, rerender } = render(<TelemetryMetric label="Line pressure" value={null} unit="bar" loading now={NOW} />);
    expect(sentenceOf(container)).toBe("Line pressure loading, no reading yet");
    rerender(<TelemetryMetric label="Line pressure" value={2.4} unit="bar" timestamp={ago(MIN)} now={NOW} />);
    expect(sentenceOf(container)).toBe("Line pressure 2.4 bar, normal, measured 1 minute ago");
    expect(container.querySelector("[data-reading-placeholder]")).toBeNull();
  });

  it("loading → unavailable: the placeholder is replaced by a different word, not the same one", () => {
    const { container, rerender } = render(<TelemetryMetric label="Air quality" value={null} unit="AQI" loading now={NOW} />);
    expect(sentenceOf(container)).toBe("Air quality loading, no reading yet");
    rerender(<TelemetryMetric label="Air quality" value={41} unit="AQI" quality="error" now={NOW} />);
    expect(container.firstElementChild).toHaveAttribute("data-value-state", "unavailable");
    expect(sentenceOf(container)).toBe("Air quality unavailable, no reading");
  });

  it("loading → unknown: nothing reported is said differently from nothing yet", () => {
    const { container, rerender } = render(<TelemetryMetric label="Weight" value={null} unit="kg" loading now={NOW} />);
    expect(sentenceOf(container)).toBe("Weight loading, no reading yet");
    rerender(<TelemetryMetric label="Weight" value={null} unit="kg" now={NOW} />);
    expect(container.firstElementChild).toHaveAttribute("data-value-state", "unknown");
    expect(sentenceOf(container)).toBe("Weight unknown, no reading");
  });

  it("a refresh over a real value keeps the value, the status and the age", () => {
    const { container } = render(<TelemetryMetric label="Soil moisture" value={31} unit="%" timestamp={ago(MIN)} loading now={NOW} />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(root).toHaveAttribute("data-loading", "refreshing");
    expect(root).toHaveAttribute("data-value-state", "known");
    expect(container.querySelector("[data-reading-placeholder]")).toBeNull();
    expect(root.textContent).toContain("31 %");
    expect(sentenceOf(container)).toBe("Soil moisture 31 %, normal, measured 1 minute ago");
  });

  it("a stale value being refreshed stays stale rather than becoming loading", () => {
    const { container } = render(
      <TelemetryMetric label="Soil moisture" value={31} unit="%" timestamp={ago(180 * MIN)} staleAfterMs={30 * MIN} loading now={NOW} />,
    );
    expect(container.firstElementChild).toHaveAttribute("data-reading-state", "stale");
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector("[data-last-known]")).not.toBeNull();
  });

  it("unsupported wins over loading: a device that does not measure this is not waiting for it", () => {
    const { container } = render(<TelemetryMetric label="Glucose" value={null} support="unsupported" loading now={NOW} />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("data-value-state", "unsupported");
    expect(root).not.toHaveAttribute("aria-busy");
    expect(container.querySelector("[data-reading-placeholder]")).toBeNull();
    expect(sentenceOf(container)).toBe("Glucose not supported by this device");
  });

  it("pairs Loading with its own glyph, not the dash that means unavailable", () => {
    // `MetricStatus` falls back to `unavailable` for any state it does not recognise, and the word is
    // passed in as a label — so a `loading` left out of its table would still read "Loading" while
    // drawing the dash that means "the device gave nothing". The glyph is the assertion that catches it.
    const { container } = render(<TelemetryMetric label="Line pressure" value={null} unit="bar" loading now={NOW} />);
    const status = container.querySelector('[data-reading-state="loading"] svg[data-glyph]');
    expect(status).not.toBeNull();
    expect(status).toHaveAttribute("data-glyph", "circle-dot");
    expect(container.querySelector('svg[data-glyph="dash"]')).toBeNull();
  });

  it("a pending reading says so even under quietWhenNormal", () => {
    // `quietWhenNormal` hides the status of a reading that is fine. One that has not arrived is not a
    // reading that is fine, so it keeps its word.
    const { container } = render(<TelemetryMetric label="Glucose" value={null} unit="mmol/L" loading quietWhenNormal now={NOW} />);
    expect(container.textContent).toContain("Loading");
  });

  it("withholds the age and the reference range while pending, so the tile matches the sentence", () => {
    const { container } = render(
      <TelemetryMetric label="Glucose" value={null} unit="mmol/L" range={{ min: 4, max: 7 }} timestamp={ago(MIN)} loading now={NOW} />,
    );
    // An age dates a reading and a range would be printed beside a value that is not there; the
    // sentence drops both for the same reason, and the two have to stay in step.
    expect(container.querySelector("[data-range]")).toBeNull();
    expect(container.textContent).not.toContain("ago");
    expect(sentenceOf(container)).toBe("Glucose loading, no reading yet");
  });

  it("drops the trend and the delta while pending, because both are claims about now", () => {
    const { container } = render(<TelemetryMetric label="Heart rate" value={null} unit="bpm" previous={68} trend="rising" loading now={NOW} />);
    expect(container.querySelector("[data-trend]")).toBeNull();
    expect(container.querySelector("[data-delta]")).toBeNull();
  });

  it("a missing unit is simply absent, and nothing stands in for it", () => {
    // A unitless metric is ordinary (a count, an index, a pH). The loading phrase must not grow an
    // empty unit, and the arrived value must not either.
    const { container, rerender } = render(<TelemetryMetric label="Cycle count" value={null} loading now={NOW} />);
    expect(sentenceOf(container)).toBe("Cycle count loading, no reading yet");
    rerender(<TelemetryMetric label="Cycle count" value={412} now={NOW} />);
    expect(sentenceOf(container)).toBe("Cycle count 412, normal");
    expect(container.firstElementChild!.textContent).not.toContain("undefined");
  });

  it("announces politely only when asked to", () => {
    const quiet = render(<TelemetryMetric label="Line pressure" value={null} loading now={NOW} />);
    const quietSentence = quiet.container.querySelector("[data-reading-sentence]")!;
    expect(quietSentence).not.toHaveAttribute("aria-live");
    expect(quietSentence).not.toHaveAttribute("role");
    cleanup();
    // Opt-in per tile: a dashboard of thirty announcing tiles is a dashboard nobody can use.
    const loud = render(<TelemetryMetric label="Line pressure" value={null} loading announce now={NOW} />);
    const loudSentence = loud.container.querySelector("[data-reading-sentence]")!;
    expect(loudSentence).toHaveAttribute("aria-live", "polite");
    expect(loudSentence).toHaveAttribute("role", "status");
  });

  it("the live region is present before the value lands, so its change is what is announced", () => {
    // A region inserted at the same moment as its content is not reliably announced. It has to exist,
    // empty of the value, while the request is open.
    const { container, rerender } = render(<TelemetryMetric label="Line pressure" value={null} loading announce now={NOW} />);
    const region = container.querySelector("[data-reading-sentence]")!;
    rerender(<TelemetryMetric label="Line pressure" value={2.4} unit="bar" announce now={NOW} />);
    expect(container.querySelector("[data-reading-sentence]")).toBe(region);
    expect(region.textContent).toContain("2.4 bar");
  });

  it("keeps the value run isolated once it arrives", () => {
    // The isolation #604 added must survive the loading branch sitting beside it.
    const { container } = render(<TelemetryMetric label="Line pressure" value={2.4} unit="bar" loading now={NOW} />);
    const bdi = container.querySelector('bdi[dir="ltr"]');
    expect(bdi).not.toBeNull();
    expect(bdi!.textContent).toContain("2.4 bar");
  });
});

describe("SensorReading", () => {
  it("shows a placeholder and the word Loading as visible text", () => {
    // This component's rule is that what is on screen is the whole fact, so the word has to be real
    // text rather than an `aria-label` — the placeholder bar is `aria-hidden` and says nothing.
    const { container } = render(<SensorReading metric="Temperature" value={null} unit="°C" loading />);
    expect(container.querySelector("[data-reading-placeholder]")).not.toBeNull();
    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(container.textContent).not.toContain("Unknown");
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(container.firstElementChild).toHaveAttribute("data-loading", "pending");
  });

  it("loading → available replaces the placeholder with the isolated value", () => {
    const { container, rerender } = render(<SensorReading metric="Temperature" value={null} unit="°C" loading />);
    rerender(<SensorReading metric="Temperature" value={23.4} unit="°C" precision={1} />);
    expect(container.querySelector("[data-reading-placeholder]")).toBeNull();
    expect(container.querySelector('bdi[dir="ltr"]')!.textContent).toContain("23.4 °C");
    expect(container.firstElementChild).not.toHaveAttribute("aria-busy");
  });

  it("loading → error says sensor error, not loading", () => {
    const { container, rerender } = render(<SensorReading metric="Temperature" value={null} unit="°C" loading />);
    rerender(<SensorReading metric="Temperature" value={0} unit="°C" quality="error" />);
    expect(screen.getByText("Sensor error")).toBeInTheDocument();
    expect(container.textContent).not.toContain("Loading");
  });

  it("a refresh over a real value keeps the number", () => {
    const { container } = render(<SensorReading metric="Temperature" value={23.4} unit="°C" precision={1} loading />);
    expect(container.querySelector("[data-reading-placeholder]")).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("data-loading", "refreshing");
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(container.textContent).toContain("23.4");
  });

  it("a measured zero is kept while loading", () => {
    const { container } = render(<SensorReading metric="Rainfall" value={0} unit="mm" loading />);
    expect(container.querySelector("[data-reading-placeholder]")).toBeNull();
    expect(container.textContent).toContain("0");
    expect(container.textContent).not.toContain("Loading");
  });

  it("holds the hero slot at lg and xl too", () => {
    for (const size of ["lg", "xl"] as const) {
      const { container } = render(<SensorReading metric="Temperature" value={null} unit="°C" size={size} loading />);
      expect(container.querySelector("[data-reading-placeholder]")).not.toBeNull();
      cleanup();
    }
  });
});

describe("DeviceBattery", () => {
  it("draws a placeholder and Loading instead of — and Unknown", () => {
    const { container } = render(<DeviceBattery value={null} loading now={NOW} />);
    expect(container.querySelector("[data-reading-placeholder]")).not.toBeNull();
    expect(container.querySelector('[data-battery-note="loading"]')).not.toBeNull();
    expect(container.querySelector('[data-battery-note="unknown"]')).toBeNull();
    expect(container.querySelector("[data-battery-sentence]")!.textContent).toBe("Battery loading, no reading yet");
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
  });

  it("the pending cell draws no fill, so no level is invented", () => {
    const { container } = render(<DeviceBattery value={null} loading now={NOW} />);
    expect(container.querySelector("[data-battery-fill]")).toBeNull();
    expect(container.querySelector("[data-battery-pending]")).not.toBeNull();
  });

  it("pairs the word with a glyph, so the state is not carried by colour alone", () => {
    const { container } = render(<DeviceBattery value={null} loading now={NOW} />);
    const note = container.querySelector('[data-battery-note="loading"]')!;
    expect(note.querySelector("svg[data-glyph]")).not.toBeNull();
    expect(note.textContent).toContain("Loading");
  });

  it("loading → available: the percentage and its fill arrive together", () => {
    const { container, rerender } = render(<DeviceBattery value={null} loading now={NOW} />);
    rerender(<DeviceBattery value={72} now={NOW} />);
    expect(container.querySelector("[data-reading-placeholder]")).toBeNull();
    expect(container.querySelector("[data-battery-fill]")).not.toBeNull();
    expect(container.querySelector("[data-battery-sentence]")!.textContent).toBe("Battery 72 percent");
  });

  it("loading → unknown: a device that reported nothing says Unknown", () => {
    const { container, rerender } = render(<DeviceBattery value={null} loading now={NOW} />);
    rerender(<DeviceBattery value={null} now={NOW} />);
    expect(container.querySelector('[data-battery-note="unknown"]')).not.toBeNull();
    expect(container.querySelector('[data-battery-note="loading"]')).toBeNull();
  });

  it("a refresh over a real percentage changes nothing but aria-busy", () => {
    const loaded = render(<DeviceBattery value={72} now={NOW} />);
    const before = loaded.container.querySelector('[data-battery-level="high"]')!.innerHTML;
    cleanup();
    const refreshing = render(<DeviceBattery value={72} loading now={NOW} />);
    const root = refreshing.container.querySelector('[data-battery-level="high"]')!;
    expect(root.innerHTML).toBe(before);
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(root).toHaveAttribute("data-loading", "refreshing");
  });

  it("a measured 0 % is kept while loading, and is never the unknown shape", () => {
    const { container } = render(<DeviceBattery value={0} loading now={NOW} />);
    expect(container.querySelector("[data-reading-placeholder]")).toBeNull();
    expect(container.querySelector("[data-battery-sentence]")!.textContent).toContain("0 percent");
  });

  it("unsupported wins over loading", () => {
    const { container } = render(<DeviceBattery value={null} support="unsupported" loading now={NOW} />);
    expect(container.textContent).toContain("No battery");
    expect(container.querySelector("[data-reading-placeholder]")).toBeNull();
    expect(container.firstElementChild).not.toHaveAttribute("aria-busy");
  });

  it("withholds the age while pending", () => {
    const { container } = render(<DeviceBattery value={null} updatedAt={ago(5 * MIN)} showAge loading now={NOW} />);
    expect(container.textContent).not.toContain("ago");
  });
});

describe("SignalStrength", () => {
  it("labels a pending reading as loading, not as unknown", () => {
    const { container } = render(<SignalStrength value={null} loading />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("aria-label", "Signal loading, no reading yet");
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector("[data-reading-placeholder]")).not.toBeNull();
    expect(root.textContent).not.toContain("—");
  });

  it("fills no bars while pending, so no strength is invented", () => {
    const { container } = render(<SignalStrength value={null} bars={4} loading />);
    const meter = container.querySelector("[aria-hidden]")!;
    expect([...meter.children].filter((b) => b.className.includes("bg-secondary-foreground"))).toHaveLength(0);
  });

  it("a reported zero is a measurement, not an absence", () => {
    const { container } = render(<SignalStrength value={0} loading />);
    expect(container.firstElementChild).toHaveAttribute("aria-label", "No signal");
    expect(container.querySelector("[data-reading-placeholder]")).toBeNull();
    expect(container.textContent).toContain("0%");
  });

  it("loading → available swaps the label and the placeholder together", () => {
    const { container, rerender } = render(<SignalStrength value={null} loading />);
    rerender(<SignalStrength value={84} />);
    expect(container.firstElementChild).toHaveAttribute("aria-label", "Signal 84%, excellent");
    expect(container.querySelector("[data-reading-placeholder]")).toBeNull();
  });

  it("an explicit label still wins while loading", () => {
    const { container } = render(<SignalStrength value={null} loading label="جارٍ التحميل" />);
    expect(container.firstElementChild).toHaveAttribute("aria-label", "جارٍ التحميل");
  });
});

describe("the placeholder itself", () => {
  const placeholderOf = () => {
    const { container } = render(<TelemetryMetric label="Line pressure" value={null} loading now={NOW} />);
    return container.querySelector("[data-reading-placeholder]") as HTMLElement;
  };

  it("is hidden from assistive technology, because the words already carry the fact", () => {
    expect(placeholderOf()).toHaveAttribute("aria-hidden", "true");
  });

  it("is sized in the text's own units, which is what makes the slot stable at 200% text", () => {
    // jsdom does not lay out, so this asserts the mechanism rather than the measurement: `ch` and `em`
    // scale with the font, where a pixel size would be a second layout to keep in sync. The measured
    // proof that the slot's height is unchanged is in `scripts/iot-monitoring.mjs`.
    const el = placeholderOf();
    expect(el.style.inlineSize).toMatch(/ch$/);
    expect(el.style.blockSize).toMatch(/em$/);
    expect(el.style.inlineSize).not.toMatch(/px/);
    expect(el.style.blockSize).not.toMatch(/px/);
  });

  it("pairs its pulse with a reduced-motion opt-out", () => {
    // The class pairing, not a stopped animation: jsdom resolves no media query. The browser gate's
    // `reduced-motion` condition is what proves the bar is still visible with the pulse removed.
    const className = placeholderOf().className;
    expect(className).toContain("animate-pulse");
    expect(className).toContain("motion-reduce:animate-none");
  });

  it("keeps a currentColor border under forced colours, where its background is dropped", () => {
    const className = placeholderOf().className;
    expect(className).toContain("forced-colors:border");
    expect(className).toContain("forced-colors:border-current");
  });
});
