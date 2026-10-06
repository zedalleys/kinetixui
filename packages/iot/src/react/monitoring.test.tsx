import * as React from "react";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommandFeedback, DeviceActivity, DeviceBattery, DeviceConnection, EnergySummary, TelemetryMetric } from "./index";
import {
  KINETIX_CONNECTIVITY_STATES,
  startCommandLifecycle,
  summarizeEnergy,
  transitionCommandLifecycle,
  type KinetixActivityEvent,
  type KinetixCommandLifecycle,
  type KinetixCommandLifecycleEvent,
} from "../functions";

/**
 * M3 rendered: what a person gets from the six monitoring components — the words on screen, the one
 * phrase a screen reader hears, and the absence of anything announced or pressable that should not be.
 * jsdom does no layout; the browser half is `pnpm check:iot-monitoring`.
 */

afterEach(cleanup);

const NOW = "2026-10-06T12:00:00.000Z";
const MIN = 60_000;
const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();

async function axeViolations(container: HTMLElement): Promise<string[]> {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 80)).join(" | ")}`);
}

const liveRegions = (el: HTMLElement) => el.querySelectorAll('[role="status"],[role="alert"],[aria-live]');
/** What assistive technology reads: the text of everything not hidden from it. */
function spoken(el: Element): string {
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const element = node as Element;
    if (element.getAttribute("aria-hidden") === "true") return "";
    const label = element.getAttribute("aria-label");
    if (label && element.getAttribute("role") === "img") return ` ${label} `;
    return [...element.childNodes].map(walk).join("");
  };
  return walk(el).replace(/\s+/g, " ").trim();
}

function run<T>(state: KinetixCommandLifecycle<T>, ...events: KinetixCommandLifecycleEvent[]): KinetixCommandLifecycle<T> {
  let s = state;
  let at = Date.parse(NOW) - 5 * MIN;
  for (const event of events) {
    const result = transitionCommandLifecycle(s, event, (at += 1000));
    if (!result.ok) throw new Error(`${event.type} refused from ${s.stage}: ${result.rejection.code}`);
    s = result.state;
  }
  return s;
}

/* ------------------------------------------------------------------ DeviceBattery */

describe("DeviceBattery", () => {
  it("(1) renders unknown, not 0 %, and says so once", () => {
    const { container } = render(<DeviceBattery value={null} />);
    expect(container).toHaveTextContent("—");
    expect(container.textContent).not.toMatch(/\b0\s?%/);
    expect(spoken(container)).toBe("Battery level unknown");
    expect(container.firstElementChild).toHaveAttribute("data-battery-level", "unknown");
  });

  it("(2) a stale reading keeps its number, is marked stale, and never says offline", () => {
    const { container } = render(<DeviceBattery value={18} updatedAt={ago(3 * 60 * MIN)} staleAfterMs={60 * MIN} now={NOW} />);
    expect(container).toHaveTextContent("18%");
    expect(container.querySelector('[data-battery-note="stale"]')).toHaveTextContent("Stale");
    expect(container.querySelector('[data-battery-note="stale"] svg')).toHaveAttribute("data-glyph", "clock");
    expect(spoken(container)).toBe("Battery 18 percent, low, stale reading");
    expect(container.textContent).not.toMatch(/offline/i);
  });

  it("marks critical with a glyph and a word, not colour alone", () => {
    const { container } = render(<DeviceBattery value={6} />);
    const note = container.querySelector('[data-battery-note="critical"]')!;
    expect(note).toHaveTextContent("Critical");
    expect(note.querySelector("svg")).toHaveAttribute("data-glyph", "octagon");
  });

  it("shows charging only when reported, and a full battery is not plugged in", () => {
    const { container, rerender } = render(<DeviceBattery value={100} />);
    expect(container.querySelector('[data-battery-note="charging"]')).toBeNull();
    expect(spoken(container)).toBe("Battery 100 percent");
    rerender(<DeviceBattery value={42} charging />);
    expect(container.querySelector('[data-battery-note="charging"] svg')).toHaveAttribute("data-glyph", "bolt");
    expect(spoken(container)).toBe("Battery 42 percent, charging");
    rerender(<DeviceBattery value={42} charging={null} />);
    expect(container).toHaveTextContent("Charging unknown");
    expect(container).not.toHaveTextContent("Not charging");
  });

  it("says unsupported rather than unknown", () => {
    const { container } = render(<DeviceBattery value={null} support="unsupported" />);
    expect(container).toHaveTextContent("No battery");
    expect(spoken(container)).toBe("Battery not supported by this device");
    expect(container.firstElementChild).toHaveAttribute("data-battery-level", "unsupported");
  });

  it("applies the product's thresholds", () => {
    const { container } = render(<DeviceBattery value={30} thresholds={{ low: 40, critical: 15 }} />);
    expect(container.querySelector('[data-battery-note="low"]')).toHaveTextContent("Low");
  });
});

/* ------------------------------------------------------------------ DeviceConnection */

describe("DeviceConnection", () => {
  it("draws each of the six states with its own shape and word", () => {
    const seen = KINETIX_CONNECTIVITY_STATES.map((state) => {
      const { container, unmount } = render(<DeviceConnection state={state} />);
      const out = { glyph: container.querySelector("svg")!.getAttribute("data-glyph"), word: spoken(container) };
      unmount();
      return out;
    });
    expect(new Set(seen.map((s) => s.glyph)).size).toBe(6);
    expect(new Set(seen.map((s) => s.word)).size).toBe(6);
  });

  it("(3) a missing state is unknown, not offline", () => {
    const { container } = render(<DeviceConnection state={undefined} lastSeenAt={ago(5 * MIN)} now={NOW} />);
    expect(container.firstElementChild).toHaveAttribute("data-connectivity", "unknown");
    expect(container.textContent).not.toMatch(/offline/i);
  });

  it("(4) connecting does not render online", () => {
    const { container } = render(<DeviceConnection state="connecting" />);
    expect(container).toHaveTextContent("Connecting");
    expect(container.textContent).not.toMatch(/online/i);
    expect(container.querySelector("svg")).not.toHaveAttribute("data-glyph", "record");
    expect(container.querySelector(".animate-spin, .animate-pulse, .animate-ping")).toBeNull();
  });

  it("shows last seen only where it means something, short on screen and in full for a screen reader", () => {
    const { container, rerender } = render(<DeviceConnection state="offline" lastSeenAt={ago(5 * MIN)} now={NOW} />);
    expect(container.querySelector("[data-last-seen]")).toHaveTextContent("5m ago");
    expect(spoken(container)).toBe("Offline, last seen 5 minutes ago");
    rerender(<DeviceConnection state="online" lastSeenAt={ago(5 * MIN)} now={NOW} />);
    expect(container.querySelector("[data-last-seen]")).toBeNull();
  });

  it("prints a transport label as given and parses nothing", () => {
    const { container } = render(<DeviceConnection state={{ state: "online", signal: 70 }} transportLabel="Thread via Hall hub" />);
    expect(container.querySelector("[data-transport]")).toHaveTextContent("Thread via Hall hub");
    expect(screen.getByRole("img")).toHaveAccessibleName(/signal/i);
  });
});

/* ------------------------------------------------------------------ TelemetryMetric (M3) */

describe("TelemetryMetric, generic readings (M3)", () => {
  it("(5) a stale value stays visibly stale and is spoken as stale", () => {
    const { container } = render(<TelemetryMetric label="Soil moisture" value={31} unit="%" timestamp={ago(3 * 60 * MIN)} staleAfterMs={30 * MIN} now={NOW} />);
    expect(container).toHaveTextContent("Stale");
    expect(container.querySelector("[data-last-known]")).toHaveTextContent("Last known value");
    expect(container.querySelector("[data-reading-sentence]")).toHaveTextContent("stale reading, last known value");
  });

  it("(6) an unknown value is not numeric zero", () => {
    const { container } = render(<TelemetryMetric label="Heart rate" value={undefined} unit="bpm" previous={60} />);
    expect(container.textContent).not.toMatch(/\d/);
    expect(container).toHaveTextContent("Unknown");
    expect(container.firstElementChild).toHaveAttribute("data-value-state", "unknown");
  });

  it("(7) draws a delta only with a real comparison value", () => {
    const { container, rerender } = render(<TelemetryMetric label="Pressure" value={2.4} unit="bar" />);
    expect(container.querySelector("[data-delta]")).toBeNull();
    rerender(<TelemetryMetric label="Pressure" value={2.4} unit="bar" previous={2.1} formatValue={(v) => v.toFixed(1)} />);
    expect(container.querySelector("[data-delta]")).toHaveTextContent("+0.3 bar vs previous reading");
    expect(container.querySelector("[data-reading-sentence]")).toHaveTextContent("up 0.3 bar from previous reading");
  });

  it("keeps unknown, unavailable and unsupported as three different words", () => {
    const words = [
      <TelemetryMetric key="u" label="Glucose" value={null} />,
      <TelemetryMetric key="n" label="Glucose" value={5.8} unavailable />,
      <TelemetryMetric key="s" label="Glucose" value={null} support="unsupported" />,
    ].map((el) => {
      const { container, unmount } = render(el);
      const out = [container.firstElementChild!.getAttribute("data-value-state"), container.querySelector("[data-reading-sentence]")!.textContent];
      unmount();
      return out;
    });
    expect(words).toEqual([
      ["unknown", "Glucose unknown, no reading"],
      ["unavailable", "Glucose unavailable, no reading"],
      ["unsupported", "Glucose not supported by this device"],
    ]);
  });

  it("prints a reference range without judging the value, and speaks the unit", () => {
    const { container } = render(
      <TelemetryMetric label="Glucose" value={9.1} unit="mmol/L" unitLabel="millimoles per litre" range={{ min: 4, max: 7 }} formatValue={(v) => v.toFixed(1)} timestamp={ago(2 * MIN)} now={NOW} quietWhenNormal />,
    );
    expect(container.querySelector("[data-range]")).toHaveTextContent("Reference 4.0–7.0 mmol/L");
    expect(container).not.toHaveTextContent(/high|warning|critical/i);
    expect(container.querySelector("[data-reading-sentence]")).toHaveTextContent("Glucose 9.1 millimoles per litre, reference 4.0 to 7.0, measured 2 minutes ago");
  });

  it("uses the product's severity and status words over thresholds", () => {
    const { container } = render(<TelemetryMetric label="Vibration" value={7.2} unit="mm/s" severity="warning" statusLabel="Above service limit" />);
    expect(container).toHaveTextContent("Above service limit");
    expect(container.firstElementChild).toHaveAttribute("data-reading-state", "warning");
  });

  it("is read as one phrase: the visual parts are hidden, so nothing is heard twice", () => {
    const { container } = render(<TelemetryMetric label="Temperature" value={21.4} unit="°C" timestamp={ago(MIN)} now={NOW} />);
    expect(spoken(container)).toBe("Temperature 21.4 °C, normal, measured 1 minute ago");
  });
});

/* ------------------------------------------------------------------ CommandFeedback */

describe("CommandFeedback", () => {
  const off = () => startCommandLifecycle<boolean>({ confirmed: false, requested: true });
  const onOff = (v: unknown) => (v ? "on" : "off");

  it("(8) requested is not shown as confirmed", () => {
    const { container } = render(<CommandFeedback lifecycle={run(off(), { type: "sent" })} formatValue={onOff} />);
    expect(container).toHaveTextContent("Requested, not yet confirmed");
    expect(container.querySelector("svg")).toHaveAttribute("data-glyph", "circle-dot");
    expect(container.firstElementChild).toHaveAttribute("data-feedback-tone", "pending");
  });

  it("(9) acknowledged is not shown as confirmed", () => {
    const { container } = render(<CommandFeedback lifecycle={run(off(), { type: "sent" }, { type: "acknowledge" })} />);
    expect(container).toHaveTextContent("Acknowledged, not yet confirmed");
    expect(container.querySelector("svg")).not.toHaveAttribute("data-glyph", "check");
  });

  it("(10) a timeout does not invent a reported state", () => {
    render(<CommandFeedback lifecycle={run(off(), { type: "sent" }, { type: "timeout" })} formatValue={onOff} density="full" />);
    expect(screen.getByText("Timed out, may still apply")).toBeInTheDocument();
    const sentence = document.querySelector("[data-feedback-sentence]")!;
    expect(sentence).toHaveTextContent("last reported off");
    expect(sentence.textContent).not.toMatch(/reports on/);
  });

  it("(11) unreachable remains distinct from failed", () => {
    const { container, rerender } = render(<CommandFeedback lifecycle={run(off(), { type: "sent" }, { type: "deviceUnreachable" })} />);
    expect(container).toHaveTextContent("Device unreachable");
    expect(container).not.toHaveTextContent("Failed");
    rerender(<CommandFeedback lifecycle={run(off(), { type: "sent" }, { type: "fail", code: "jammed" })} density="full" />);
    expect(container).toHaveTextContent("Failed");
    expect(container.querySelector("[data-feedback-code]")).toHaveTextContent("jammed");
  });

  it("offers Retry only when the lifecycle allows one and the product asked, and never retries itself", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<CommandFeedback lifecycle={run(off(), { type: "sent" }, { type: "timeout" })} onRetry={onRetry} />);
    expect(onRetry).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    rerender(<CommandFeedback lifecycle={run(off(), { type: "sent" }, { type: "confirm", value: true })} onRetry={onRetry} />);
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("is silent by default and announces once, politely, when asked; optimistic does not announce the wait", () => {
    const pending = run(off(), { type: "sent" });
    const { container, rerender } = render(<CommandFeedback lifecycle={pending} />);
    expect(liveRegions(container)).toHaveLength(0);
    rerender(<CommandFeedback lifecycle={pending} announce />);
    expect(liveRegions(container)).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Requested, not yet confirmed.");
    rerender(<CommandFeedback lifecycle={pending} announce strategy="optimistic" />);
    expect(screen.getByRole("status")).toHaveTextContent("");
    rerender(<CommandFeedback lifecycle={run(pending, { type: "fail" })} announce strategy="optimistic" />);
    expect(screen.getByRole("status")).toHaveTextContent("Failed.");
  });

  it("says when an optimistic display rolled back, and claims no rollback on cancel", () => {
    const { container, rerender } = render(<CommandFeedback lifecycle={run(off(), { type: "sent" }, { type: "fail" })} strategy="optimistic" />);
    expect(container.querySelector("[data-feedback-rolled-back]")).not.toBeNull();
    rerender(<CommandFeedback lifecycle={run(off(), { type: "sent" }, { type: "cancel" })} />);
    expect(container).toHaveTextContent("Cancelled");
    expect(container.textContent).not.toMatch(/roll|revert/i);
  });
});

/* ------------------------------------------------------------------ DeviceActivity */

const EVENTS: KinetixActivityEvent[] = [
  { id: "a", timestamp: ago(30 * MIN), kind: "state-change", origin: "device", message: "Valve closed at the manual handle" },
  { id: "b", timestamp: ago(10 * MIN), kind: "command", origin: "user", status: "requested", commandId: "c-1", actor: "Sam", message: "Open zone 3" },
  { id: "c", timestamp: ago(20 * MIN), kind: "automation", origin: "automation", status: "confirmed", message: "Morning cycle started" },
  { id: "d", timestamp: ago(5 * MIN), kind: "command", status: "failed", actor: "Sam", source: "app", message: "Open zone 4", detail: "Pressure too low." },
];

describe("DeviceActivity", () => {
  it("(12) preserves an explicit origin and represents device-originated events", () => {
    render(<DeviceActivity events={EVENTS} order="newest" now={NOW} />);
    const item = screen.getByText("Valve closed at the manual handle").closest("li")!;
    expect(item).toHaveAttribute("data-origin", "device");
    expect(within(item).getByText("Device")).toBeInTheDocument();
  });

  it("(13) a missing origin reads Source unknown, not user or system, even with an actor", () => {
    render(<DeviceActivity events={EVENTS} order="newest" now={NOW} />);
    const item = screen.getByText("Open zone 4").closest("li")!;
    expect(item).toHaveAttribute("data-origin", "unknown");
    expect(within(item).getByText("Source unknown")).toBeInTheDocument();
    expect(within(item).queryByText("User")).toBeNull();
  });

  it("orders explicitly, both ways", () => {
    const ids = (order: "newest" | "oldest") => {
      const { container, unmount } = render(<DeviceActivity events={EVENTS} order={order} now={NOW} />);
      const out = [...container.querySelectorAll("li")].map((li) => li.getAttribute("data-event-id"));
      unmount();
      return out;
    };
    expect(ids("newest")).toEqual(["d", "b", "c", "a"]);
    expect(ids("oldest")).toEqual(["a", "c", "b", "d"]);
  });

  it("is a real list; display rows are not focusable, and actions are real buttons", () => {
    const onView = vi.fn();
    render(
      <DeviceActivity
        events={EVENTS}
        order="newest"
        now={NOW}
        renderActions={(event) => (event.commandId ? <button type="button" onClick={() => onView(event.commandId)}>View command</button> : null)}
      />,
    );
    const list = screen.getByRole("list", { name: "Device activity" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    for (const li of within(list).getAllByRole("listitem")) {
      expect(li).not.toHaveAttribute("tabindex");
      expect(li).not.toHaveAttribute("role", "button");
    }
    fireEvent.click(screen.getByRole("button", { name: "View command" }));
    expect(onView).toHaveBeenCalledWith("c-1");
  });

  it("never gives an undated event a time", () => {
    render(<DeviceActivity events={[{ id: "x", timestamp: "", kind: "system", message: "Rebooted" }]} order="newest" now={NOW} />);
    expect(screen.getByText("Time unknown")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ EnergySummary metrics form */

describe("EnergySummary, metrics form (M3)", () => {
  it("(14) handles partial metrics: what is missing is said, not zeroed or dropped", () => {
    const { container } = render(
      <EnergySummary
        period="This week"
        energy={{ label: "Irrigation pump", value: 85, unit: "kWh", timestamp: ago(MIN) }}
        power={{ value: null, unit: "kW" }}
        cost={{ value: null, support: "unsupported" }}
        now={NOW}
      />,
    );
    expect(container).toHaveTextContent("This week");
    expect(container).toHaveTextContent("85 kWh");
    const power = container.querySelector('[data-energy-slot="power"]')!;
    expect(power).toHaveTextContent("Unknown");
    expect(power.textContent).not.toMatch(/\d/);
    expect(container.querySelector('[data-energy-slot="cost"]')).toHaveTextContent("Not supported by this device");
  });

  it("assumes no unit, currency or period: the product formats a cost and names the period", () => {
    const { container } = render(
      <EnergySummary
        period="Shift B"
        energy={{ label: "Press line", value: 412.5, unit: "MJ", previous: 380, previousLabel: "Shift A", formatValue: (v) => v.toFixed(1) }}
        cost={{ label: "Cost", value: 31.2, formatValue: (v) => `€${v.toFixed(2)}` }}
        metrics={[{ key: "pf", label: "Power factor", value: 0.92 }]}
      />,
    );
    expect(container).toHaveTextContent("€31.20");
    expect(container).toHaveTextContent("+32.5 MJ vs Shift A");
    expect(container).not.toHaveTextContent("kWh");
    expect(container).not.toHaveTextContent("Today");
    expect(screen.getByRole("list", { name: "More readings" })).toHaveTextContent("Power factor");
  });

  it("marks a stale energy reading stale", () => {
    const { container } = render(<EnergySummary energy={{ value: 12, unit: "kWh", timestamp: ago(5 * 60 * MIN), staleAfterMs: 60 * MIN }} now={NOW} />);
    expect(container.querySelector('[data-energy-slot="energy"] [data-last-known]')).not.toBeNull();
  });

  it("keeps the 0.3 breakdown form when given a summary", () => {
    const summary = summarizeEnergy([{ id: "h", label: "Heater", value: 6 }]);
    const { container } = render(<EnergySummary summary={summary} today={3} />);
    expect(container.querySelector('[data-presentation="metrics"]')).toBeNull();
    expect(container).toHaveTextContent("Heater");
  });
});

/* ------------------------------------------------------------------ shared */

describe("passive monitoring", () => {
  it("(15) creates no command lifecycle: no live region, no button, nothing pressable", () => {
    const { container } = render(
      <div>
        <DeviceBattery value={40} charging />
        <DeviceConnection state="unreachable" lastSeenAt={ago(MIN)} now={NOW} />
        <TelemetryMetric label="Flow" value={12} unit="L/min" previous={10} />
        <DeviceActivity events={EVENTS} order="newest" now={NOW} />
        <EnergySummary energy={{ value: 85, unit: "kWh" }} />
      </div>,
    );
    expect(liveRegions(container)).toHaveLength(0);
    expect(container.querySelectorAll("button, [tabindex], [role=button], [aria-busy]")).toHaveLength(0);
  });

  it("is axe-clean across all six", async () => {
    const { container } = render(
      <div>
        <DeviceBattery value={18} updatedAt={ago(3 * 60 * MIN)} staleAfterMs={60 * MIN} now={NOW} showAge />
        <DeviceConnection state="offline" lastSeenAt={ago(5 * MIN)} now={NOW} transportLabel="LoRa gateway" signal={20} density="detail" />
        <TelemetryMetric label="Glucose" value={5.8} unit="mmol/L" range={{ min: 4, max: 7 }} previous={6.1} />
        <CommandFeedback lifecycle={run(startCommandLifecycle({ confirmed: 20, requested: 40 }), { type: "sent" }, { type: "timeout" })} density="full" onRetry={() => {}} announce />
        <DeviceActivity events={EVENTS} order="oldest" now={NOW} />
        <EnergySummary period="Today" power={{ value: 2.1, unit: "kW" }} energy={{ value: null, unit: "kWh" }} />
      </div>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
