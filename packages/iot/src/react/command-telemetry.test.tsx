import * as React from "react";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommandLifecycle, DeviceIcon, MetricStatus, TelemetryCard, TelemetryGrid, TelemetryMetric, TelemetryTrend } from "./index";
import { KINETIX_DEVICE_CATEGORIES } from "../types/identity";
import { advanceCommandLifecycle, startCommandLifecycle } from "../functions/commands";
import type { KinetixCommandLifecycle } from "../types/command";
import type { KinetixReadingState, KinetixTelemetryPoint, KinetixTelemetrySeries } from "../types/telemetry";

/**
 * The 0.3 command-lifecycle and telemetry components.
 *
 * What is protected: **honesty** — an acknowledged command never reads as confirmed, an unavailable or
 * stale reading never shows a confident current number — plus the accessibility contract for the
 * additions (names, status as glyph + word, one live region, logical properties under RTL).
 */
afterEach(cleanup);

const NOW = "2026-09-27T12:00:00.000Z";
const at = (offsetMs: number) => new Date(Date.parse(NOW) + offsetMs).toISOString();
const MIN = 60_000;

async function axeViolations(container: HTMLElement): Promise<string[]> {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`);
}

const PHYSICAL = /(^|[\s"])(-?(ml|mr|pl|pr)-|-?(left|right)-|text-(left|right)\b|rounded-(l|r|tl|tr|bl|br)\b|border-(l|r)\b)/;
const liveRegions = (el: HTMLElement) => el.querySelectorAll('[role="status"],[role="alert"],[aria-live]');

/* ------------------------------------------------------------------ DeviceIcon */

describe("DeviceIcon covers the whole taxonomy", () => {
  it.each(KINETIX_DEVICE_CATEGORIES.filter((c) => c !== "unknown"))("draws a glyph of its own for %s", (category) => {
    const { container: known } = render(<DeviceIcon category={category} />);
    const { container: unknown } = render(<DeviceIcon category="unknown" />);
    const paths = known.querySelector("svg")!;
    expect(paths.children.length, `${category} has no drawing`).toBeGreaterThan(0);
    // Not the neutral fallback: a category that silently drew "unknown" would pass a bare length check.
    expect(paths.innerHTML).not.toBe(unknown.querySelector("svg")!.innerHTML);
  });

  it("draws every category differently from every other", () => {
    const drawings = KINETIX_DEVICE_CATEGORIES.map((c) => render(<DeviceIcon category={c} />).container.querySelector("svg")!.innerHTML);
    expect(new Set(drawings).size).toBe(KINETIX_DEVICE_CATEGORIES.length);
  });
});

/* ------------------------------------------------------------------ CommandLifecycle */

const life = (build: (l: KinetixCommandLifecycle<string>) => KinetixCommandLifecycle<string>, over: { maxAttempts?: number } = {}) =>
  build(startCommandLifecycle<string>({ confirmed: "unlocked", requested: "locked", ...over }));

const requested = life((l) => advanceCommandLifecycle(l, { type: "sent" }, NOW));
const acknowledged = life((l) => advanceCommandLifecycle(advanceCommandLifecycle(l, { type: "sent" }, NOW), { type: "acknowledge" }, NOW));
const confirmed = life((l) => advanceCommandLifecycle(advanceCommandLifecycle(l, { type: "sent" }, NOW), { type: "confirm" }, NOW));
const timedOut = life((l) => advanceCommandLifecycle(advanceCommandLifecycle(l, { type: "sent" }, NOW), { type: "timeout" }, NOW));
const unreachable = life((l) => advanceCommandLifecycle(advanceCommandLifecycle(l, { type: "sent" }, NOW), { type: "deviceUnreachable" }, NOW));
const ackedThenConfirmed = life((l) => advanceCommandLifecycle(advanceCommandLifecycle(advanceCommandLifecycle(l, { type: "sent" }, NOW), { type: "acknowledge" }, NOW), { type: "confirm" }, NOW));
const failed = life((l) => advanceCommandLifecycle(advanceCommandLifecycle(l, { type: "sent" }, NOW), { type: "fail", reason: "Valve position not reported." }, NOW));
const cancelled = life((l) => advanceCommandLifecycle(advanceCommandLifecycle(l, { type: "sent" }, NOW), { type: "cancel" }, NOW));
const retrying = life((l) => advanceCommandLifecycle(advanceCommandLifecycle(advanceCommandLifecycle(l, { type: "sent" }, NOW), { type: "timeout" }, NOW), { type: "retry" }, NOW));

const stepOf = (name: string) => document.querySelector(`[data-step="${name}"]`) as HTMLElement | null;
const glyphOf = (el: HTMLElement | null) => el?.querySelector("[data-glyph]")?.getAttribute("data-glyph");

describe("CommandLifecycle", () => {
  it("renders nothing to step through while idle, and says so", () => {
    render(<CommandLifecycle lifecycle={startCommandLifecycle({ confirmed: "on" })} />);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(/No change requested/);
  });

  it("shows requested as current and the rest as not yet reached", () => {
    render(<CommandLifecycle lifecycle={requested} />);
    const list = screen.getByRole("list", { name: /progress of the request/i });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(stepOf("requested")).toHaveAttribute("aria-current", "step");
    expect(stepOf("acknowledged")).toHaveAttribute("data-step-state", "upcoming");
    expect(stepOf("confirmed")).toHaveAttribute("data-step-state", "upcoming");
    expect(stepOf("confirmed")).toHaveTextContent(/not reached yet/);
  });

  it("never lets acknowledged look like confirmed: different glyph, different words", () => {
    const { rerender } = render(<CommandLifecycle lifecycle={acknowledged} />);
    const ack = stepOf("acknowledged")!;
    expect(ack).toHaveTextContent("Acknowledged, not yet confirmed");
    expect(glyphOf(ack)).toBe("circle-half");
    expect(stepOf("confirmed")).toHaveAttribute("data-step-state", "upcoming");
    expect(screen.getByRole("status")).toHaveTextContent(/acknowledged the request for locked but has not confirmed it/);
    expect(screen.getByRole("status")).not.toHaveTextContent(/^Confirmed/);

    rerender(<CommandLifecycle lifecycle={confirmed} />);
    expect(glyphOf(stepOf("confirmed"))).toBe("check");
    expect(glyphOf(stepOf("confirmed"))).not.toBe("circle-half");
  });

  it("prints the requested and the confirmed value separately", () => {
    render(<CommandLifecycle lifecycle={requested} formatValue={(v) => (v === "locked" ? "Locked" : "Unlocked")} />);
    expect(document.querySelector("[data-requested]")).toHaveTextContent("Locked");
    expect(document.querySelector("[data-confirmed]")).toHaveTextContent("Unlocked");
  });

  it("shows the attempt count", () => {
    render(<CommandLifecycle lifecycle={requested} />);
    expect(document.querySelector("[data-attempts]")).toHaveTextContent("Attempt 1 of 3");
  });

  it("walks timeout then unreachable, and offers Retry at both", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<CommandLifecycle lifecycle={timedOut} onRetry={onRetry} />);
    expect(stepOf("timed-out")).toHaveTextContent("Timed out");
    expect(glyphOf(stepOf("timed-out"))).toBe("clock");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<CommandLifecycle lifecycle={unreachable} onRetry={onRetry} />);
    expect(stepOf("unreachable")).toHaveTextContent("Unreachable");
    expect(glyphOf(stepOf("unreachable"))).toBe("dash");
    expect(screen.getByRole("status")).toHaveTextContent(/unreachable, so locked was not confirmed/);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("only offers Retry when the machine would accept one", () => {
    const onRetry = vi.fn();
    const exhausted = life(
      (l) => {
        let s = advanceCommandLifecycle(l, { type: "sent" }, NOW);
        s = advanceCommandLifecycle(s, { type: "timeout" }, NOW);
        return s;
      },
      { maxAttempts: 1 },
    );
    const { rerender } = render(<CommandLifecycle lifecycle={exhausted} onRetry={onRetry} />);
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();

    rerender(<CommandLifecycle lifecycle={timedOut} />); // no callback → no button
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();

    rerender(<CommandLifecycle lifecycle={confirmed} onRetry={onRetry} onCancel={onRetry} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offers Cancel while in flight and calls back", () => {
    const onCancel = vi.fn();
    render(<CommandLifecycle lifecycle={acknowledged} onCancel={onCancel} onRetry={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    // Retry is not on offer while a request is still in flight.
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("has exactly one live region, politely, and it is the summary sentence", () => {
    const { container, rerender } = render(<CommandLifecycle lifecycle={requested} />);
    expect(liveRegions(container)).toHaveLength(1);
    expect(container.querySelector("[aria-live]")).toBeNull(); // no duplicate announcer
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent(/not yet confirmed/);
    rerender(<CommandLifecycle lifecycle={confirmed} />);
    // Same element, new text: that is what a live region announces.
    expect(screen.getByRole("status")).toBe(region);
    expect(region).toHaveTextContent(/^Confirmed/);
  });

  // Layout stability: the block that reports a request must not resize the card around it as the
  // request moves. Three steps at every stage is how it keeps the same footprint — and the
  // acknowledgement is never invented to fill the third row.
  it("draws the same three steps at every stage of a request, and none while idle", () => {
    for (const [name, lc] of Object.entries({ requested, acknowledged, confirmed, ackedThenConfirmed, failed, timedOut, unreachable, retrying, cancelled })) {
      const { unmount } = render(<CommandLifecycle lifecycle={lc} />);
      expect(screen.getAllByRole("listitem"), `${name} does not walk three steps`).toHaveLength(3);
      unmount();
    }
    render(<CommandLifecycle lifecycle={startCommandLifecycle({ confirmed: "on" })} />);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("never claims an acknowledgement the device did not send", () => {
    const { rerender } = render(<CommandLifecycle lifecycle={confirmed} />); // confirmed with no ack recorded
    const ack = stepOf("acknowledged")!;
    expect(ack).toHaveAttribute("data-step-state", "upcoming");
    expect(ack).toHaveTextContent("(not reported)");
    expect(ack).not.toHaveTextContent("not reached yet"); // the request is over; nothing is still coming
    expect(glyphOf(stepOf("confirmed"))).toBe("check");

    rerender(<CommandLifecycle lifecycle={ackedThenConfirmed} />);
    expect(stepOf("acknowledged")).toHaveAttribute("data-step-state", "done");
    expect(stepOf("acknowledged")).not.toHaveTextContent("(not reported)");
  });

  it("keeps the action row through the stages so a Retry does not shove the page", () => {
    const row = () => document.querySelector("[data-lifecycle-actions]");
    const { rerender } = render(<CommandLifecycle lifecycle={requested} onRetry={() => {}} onCancel={() => {}} />);
    expect(row()).not.toBeNull();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

    rerender(<CommandLifecycle lifecycle={confirmed} onRetry={() => {}} onCancel={() => {}} />);
    expect(row(), "the row is held open once a caller offers an action").not.toBeNull();
    expect(screen.queryByRole("button")).toBeNull(); // reserved height, not a button that does nothing
    expect(row()).toHaveTextContent("");
    expect(row()).not.toHaveAttribute("role");
    expect(row()).not.toHaveAttribute("aria-label");

    // A caller that offers neither gets no row at all.
    rerender(<CommandLifecycle lifecycle={confirmed} />);
    expect(row()).toBeNull();
  });

  it("uses logical properties and is axe-clean in RTL", async () => {
    const { container } = render(
      <div dir="rtl">
        <CommandLifecycle lifecycle={timedOut} onRetry={() => {}} onCancel={() => {}} />
      </div>,
    );
    expect(container.innerHTML).not.toMatch(PHYSICAL);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ MetricStatus */

describe("MetricStatus", () => {
  const STATES: KinetixReadingState[] = ["normal", "warning", "critical", "stale", "unavailable"];

  it("states every reading in a word", () => {
    const words = STATES.map((state) => {
      const { container } = render(<MetricStatus state={state} />);
      return container.textContent;
    });
    expect(words).toEqual(["Normal", "Warning", "Critical", "Stale", "Unavailable"]);
  });

  it("gives every state a different glyph, hidden from assistive technology", () => {
    const glyphs = STATES.map((state) => {
      const { container } = render(<MetricStatus state={state} />);
      const svg = container.querySelector("svg")!;
      expect(svg).toHaveAttribute("aria-hidden", "true");
      return svg.getAttribute("data-glyph");
    });
    expect(new Set(glyphs).size).toBe(STATES.length);
  });

  it("draws an unrecognised state as unavailable, never as normal", () => {
    const { container } = render(<MetricStatus state={"bogus" as KinetixReadingState} />);
    expect(container).toHaveTextContent("Unavailable");
  });

  it("lets a label replace the word but never blank it", () => {
    const { container, rerender } = render(<MetricStatus state="critical" label="Crítico" />);
    expect(container).toHaveTextContent("Crítico");
    rerender(<MetricStatus state="critical" label="  " />);
    expect(container).toHaveTextContent("Critical");
  });
});

/* ------------------------------------------------------------------ TelemetryMetric */

describe("TelemetryMetric", () => {
  it("shows a fresh, in-range reading with the registry label and unit", () => {
    const { container } = render(<TelemetryMetric metric="temperature" value={21.44} timestamp={at(-MIN)} staleAfterMs={10 * MIN} now={NOW} />);
    expect(container).toHaveTextContent("Temperature");
    expect(container).toHaveTextContent(/21\.4\s?°C/);
    expect(container).toHaveTextContent("Normal");
    expect(container.firstElementChild).toHaveAttribute("data-reading-state", "normal");
  });

  it("shows a dash, not a number, when unavailable", () => {
    const { container } = render(<TelemetryMetric metric="temperature" value={0} quality="missing" timestamp={at(-MIN)} now={NOW} />);
    expect(container).toHaveTextContent("—");
    expect(container).toHaveTextContent("Unavailable");
    expect(container.textContent).not.toMatch(/\b0\b/);
    expect(container.querySelector("[data-trend]")).toBeNull();
  });

  it("treats a NaN or null value as unavailable, never zero", () => {
    for (const value of [Number.NaN, null, undefined]) {
      const { container, unmount } = render(<TelemetryMetric metric="humidity" value={value as number} />);
      expect(container).toHaveTextContent("Unavailable");
      expect(container.textContent).not.toMatch(/\b0\b/);
      unmount();
    }
  });

  it("labels a stale value as last known and does not offer a trend for it", () => {
    const { container } = render(
      <TelemetryMetric metric="temperature" value={22} timestamp={at(-3 * 60 * MIN)} staleAfterMs={10 * MIN} now={NOW} trend="rising" />,
    );
    expect(container).toHaveTextContent("Stale");
    expect(container.querySelector("[data-last-known]")).toHaveTextContent("Last known value");
    expect(container.querySelector("[data-trend]")).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("data-reading-state", "stale");
  });

  it("treats an undated reading as stale when a freshness window is set", () => {
    const { container } = render(<TelemetryMetric metric="temperature" value={22} staleAfterMs={10 * MIN} now={NOW} />);
    expect(container).toHaveTextContent("Stale");
  });

  it("names a threshold breach in words, and a trend in words with an arrow", () => {
    const { container } = render(
      <TelemetryMetric metric="temperature" value={41} thresholds={{ warningHigh: 30, criticalHigh: 40 }} trend="rising" timestamp={at(-MIN)} now={NOW} />,
    );
    expect(container).toHaveTextContent("Critical");
    const trend = container.querySelector("[data-trend]")!;
    expect(trend).toHaveTextContent("Rising");
    expect(trend.querySelector("svg")).toHaveAttribute("data-glyph", "trend-up");
  });

  it("distinguishes rising, falling and steady by shape", () => {
    const glyphs = (["rising", "falling", "steady"] as const).map((trend) => {
      const { container, unmount } = render(<TelemetryMetric metric="temperature" value={20} trend={trend} />);
      const g = container.querySelector("[data-trend] svg")!.getAttribute("data-glyph");
      unmount();
      return g;
    });
    expect(new Set(glyphs).size).toBe(3);
  });

  it("can stay quiet for a normal reading but never for an attention state", () => {
    const { container, rerender } = render(<TelemetryMetric metric="temperature" value={20} quietWhenNormal />);
    expect(container).not.toHaveTextContent("Normal");
    rerender(<TelemetryMetric metric="temperature" value={20} quality="missing" quietWhenNormal />);
    expect(container).toHaveTextContent("Unavailable");
  });

  it("announces nothing by itself", () => {
    const { container } = render(<TelemetryMetric metric="temperature" value={20} timestamp={at(-MIN)} now={NOW} />);
    expect(liveRegions(container)).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ TelemetryGrid */

describe("TelemetryGrid", () => {
  it("is a named list with one item per child", () => {
    render(
      <TelemetryGrid label="Greenhouse readings">
        <TelemetryMetric metric="temperature" value={21} />
        <TelemetryMetric metric="humidity" value={55} />
        <TelemetryMetric metric="soil-moisture" value={30} />
      </TelemetryGrid>,
    );
    const list = screen.getByRole("list", { name: "Greenhouse readings" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });

  it("wraps rather than scrolling: flex-wrap with a basis floor and shrinkable items", () => {
    const { container } = render(
      <TelemetryGrid>
        <TelemetryMetric metric="temperature" value={21} />
      </TelemetryGrid>,
    );
    expect(container.querySelector("ul")!.className).toMatch(/flex-wrap/);
    const li = container.querySelector("li")!;
    expect(li.className).toMatch(/basis-40/);
    expect(li.className).toMatch(/min-w-0/);
    expect(container.innerHTML).not.toMatch(PHYSICAL);
  });

  it("is axe-clean with real content", async () => {
    const { container } = render(
      <TelemetryGrid label="Readings">
        <TelemetryMetric metric="temperature" value={21} timestamp={at(-MIN)} now={NOW} />
        <TelemetryMetric metric="humidity" value={null} />
      </TelemetryGrid>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ TelemetryTrend additions */

const point = (over: Partial<KinetixTelemetryPoint> = {}): KinetixTelemetryPoint => ({ timestamp: at(-5 * MIN), metric: "temperature", value: 20, unit: "°C", ...over });
const series = (points: KinetixTelemetryPoint[], metric = "temperature"): KinetixTelemetrySeries => ({ deviceId: "d1", metric, points });
const hourly = series([
  point({ timestamp: at(-4 * 60 * MIN), value: 18 }),
  point({ timestamp: at(-3 * 60 * MIN), value: 22 }),
  point({ timestamp: at(-2 * 60 * MIN), value: 31 }),
  point({ timestamp: at(-1 * 60 * MIN), value: 24 }),
]);

describe("TelemetryTrend additions", () => {
  it("draws thresholds as dash-patterned lines and names them in a legend", () => {
    const { container } = render(<TelemetryTrend series={hourly} thresholds={{ warningHigh: 30, criticalHigh: 40 }} />);
    const warn = container.querySelector('[data-threshold="warning-high"]')!;
    const crit = container.querySelector('[data-threshold="critical-high"]')!;
    expect(warn.getAttribute("stroke-dasharray")).toBeTruthy();
    expect(crit.getAttribute("stroke-dasharray")).toBeTruthy();
    // Two levels, two patterns: distinguishable without colour.
    expect(warn.getAttribute("stroke-dasharray")).not.toBe(crit.getAttribute("stroke-dasharray"));
    const legend = screen.getByRole("list", { name: "Thresholds" });
    expect(legend).toHaveTextContent("Warning at or above 30 °C");
    expect(legend).toHaveTextContent("Critical at or above 40 °C");
  });

  it("widens the plot so a bound above the data is still on it", () => {
    const { container } = render(<TelemetryTrend series={hourly} height={48} thresholds={{ criticalHigh: 60 }} />);
    const y = Number(container.querySelector('[data-threshold="critical-high"]')!.getAttribute("y1"));
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThan(1);
  });

  it("draws no thresholds unless asked, even for a metric with registry defaults", () => {
    const { container } = render(<TelemetryTrend series={series([point({ metric: "battery-level", value: 50 })], "battery-level")} />);
    expect(container.querySelector("[data-threshold]")).toBeNull();
    expect(screen.queryByRole("list", { name: "Thresholds" })).toBeNull();
  });

  it("breaks the line at a silence longer than maxGapMs and says how many gaps", () => {
    const gappy = series([
      point({ timestamp: at(-6 * 60 * MIN), value: 10 }),
      point({ timestamp: at(-5 * 60 * MIN), value: 12 }),
      point({ timestamp: at(-1 * 60 * MIN), value: 14 }),
      point({ timestamp: at(-0.5 * 60 * MIN), value: 16 }),
    ]);
    const { container, rerender } = render(<TelemetryTrend series={gappy} />);
    expect(container.querySelectorAll("polyline")).toHaveLength(1);
    rerender(<TelemetryTrend series={gappy} maxGapMs={90 * MIN} />);
    expect(container.querySelectorAll("polyline")).toHaveLength(2);
    expect(container.querySelector("[data-gaps]")).toHaveTextContent("1 gap in the data");
  });

  it("marks a stale newest reading with a rule and a word", () => {
    const old = series([point({ timestamp: at(-5 * 60 * MIN), value: 10 }), point({ timestamp: at(-4 * 60 * MIN), value: 12 })]);
    const { container, rerender } = render(<TelemetryTrend series={old} staleAfterMs={10 * MIN} now={NOW} />);
    expect(container.querySelector("[data-stale-marker]")).not.toBeNull();
    expect(container.querySelector("[data-stale]")).toHaveTextContent("Stale");
    expect(container.querySelector("[data-stale]")).toHaveTextContent("Latest reading is out of date");
    rerender(<TelemetryTrend series={old} staleAfterMs={10 * 60 * MIN} now={NOW} />);
    expect(container.querySelector("[data-stale-marker]")).toBeNull();
  });

  it("prints min, average and max instead of the bare range when asked", () => {
    const { container } = render(<TelemetryTrend series={hourly} showSummary />);
    const summary = container.querySelector("[data-summary]")!;
    expect(summary).toHaveTextContent("Min");
    expect(summary).toHaveTextContent("18 °C");
    expect(summary).toHaveTextContent("Average");
    expect(summary).toHaveTextContent("23.75 °C");
    expect(summary).toHaveTextContent("Max");
    expect(summary).toHaveTextContent("31 °C");
    expect(container).not.toHaveTextContent("18 °C – 31 °C");
  });

  it("prints the time range as <time> elements", () => {
    const { container } = render(<TelemetryTrend series={hourly} showTimeRange />);
    const times = container.querySelectorAll("[data-time-range] time");
    expect(times).toHaveLength(2);
    expect(times[0]).toHaveAttribute("datetime", at(-4 * 60 * MIN));
    expect(times[1]).toHaveAttribute("datetime", at(-1 * 60 * MIN));
  });

  it("links the plot to a text description with aria-describedby", () => {
    render(<TelemetryTrend series={hourly} />);
    const plot = screen.getByRole("img");
    const id = plot.getAttribute("aria-describedby")!;
    const description = document.getElementById(id)!;
    expect(description).not.toBeNull();
    expect(description.textContent).toMatch(/4 readings/);
    expect(description.textContent).toMatch(/Lowest 18(\.0)? °C, highest 31(\.0)? °C/);
    // Hidden, so browse-mode does not read it a second time.
    expect(description).toHaveAttribute("hidden");
  });

  it("offers every point as a real table inside <details>", () => {
    const withMissing = series([...hourly.points, point({ timestamp: at(-0.25 * 60 * MIN), value: 0, quality: "missing" })]);
    const { container } = render(<TelemetryTrend series={withMissing} dataTable thresholds={{ warningHigh: 30 }} />);
    const details = container.querySelector("details")!;
    expect(details.querySelector("summary")).toHaveTextContent("View data");
    const table = within(details as HTMLElement).getByRole("table", { hidden: true });
    expect(within(table).getAllByRole("columnheader", { hidden: true }).map((h) => h.textContent)).toEqual(["Time", "Value", "Quality", "Status"]);
    const rows = within(table).getAllByRole("row", { hidden: true });
    expect(rows).toHaveLength(1 + 5);
    // A missing point is a word in the table, not a 0.
    expect(rows[5]).toHaveTextContent("No reading");
    expect(rows[5]!.textContent).not.toMatch(/\b0\b/);
    // The threshold column reads in words.
    expect(rows[3]).toHaveTextContent("Warning");
    expect(details.querySelectorAll("time")).toHaveLength(5);
  });

  it("caps the table and says so", () => {
    const many = series(Array.from({ length: 12 }, (_, i) => point({ timestamp: at(-(12 - i) * MIN), value: i })));
    const { container } = render(<TelemetryTrend series={many} dataTable maxTableRows={5} />);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(container).toHaveTextContent("Showing the latest 5 of 12 points.");
  });

  it("has no disclosure when there is nothing to show, and none unless asked", () => {
    const { container, rerender } = render(<TelemetryTrend series={hourly} />);
    expect(container.querySelector("details")).toBeNull();
    rerender(<TelemetryTrend series={series([])} dataTable />);
    expect(container.querySelector("details")).toBeNull();
  });

  it("stays backward compatible: the original footer and label still render", () => {
    const { container } = render(<TelemetryTrend series={hourly} />);
    expect(container).toHaveTextContent("18 °C – 31 °C");
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", expect.stringContaining("4 readings"));
    expect(liveRegions(container)).toHaveLength(0);
  });

  it("is axe-clean with every addition on, in RTL, with logical classes", async () => {
    const { container } = render(
      <div dir="rtl">
        <TelemetryTrend series={hourly} thresholds={{ warningHigh: 30, criticalHigh: 40 }} maxGapMs={90 * MIN} staleAfterMs={MIN} now={NOW} showSummary showTimeRange dataTable />
      </div>,
    );
    expect(container.innerHTML).not.toMatch(PHYSICAL);
    expect(await axeViolations(container)).toEqual([]);
    // The plot stays left-to-right under RTL: a time axis does not mirror.
    expect(screen.getByRole("img")).toHaveAttribute("dir", "ltr");
  });
});

describe("TelemetryCard additions", () => {
  it("states the condition and labels a stale value as last known when asked", () => {
    const old = series([point({ timestamp: at(-3 * 60 * MIN), value: 22 })]);
    const { container } = render(<TelemetryCard series={old} metric="Temperature" staleAfterMs={10 * MIN} now={NOW} />);
    expect(container).toHaveTextContent("Stale");
    expect(container.querySelector("[data-last-known]")).toHaveTextContent("Last known value, out of date");
  });

  it("is unchanged when neither option is given", () => {
    const { container } = render(<TelemetryCard series={series([point({ value: 22 })])} metric="Temperature" now={NOW} />);
    expect(container).not.toHaveTextContent("Normal");
    expect(container.querySelector("[data-last-known]")).toBeNull();
  });

  it("forwards trendProps to the trend without owning them", () => {
    const { container } = render(<TelemetryCard series={hourly} metric="Temperature" thresholds={{ warningHigh: 30 }} trendProps={{ showSummary: true, dataTable: true }} now={NOW} />);
    expect(container.querySelector("[data-summary]")).not.toBeNull();
    expect(container.querySelector("details")).not.toBeNull();
    expect(container.querySelector('[data-threshold="warning-high"]')).not.toBeNull();
  });
});
