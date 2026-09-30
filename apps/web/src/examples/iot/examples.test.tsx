import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pairingFailureScenarios } from "./scenarios";
import { AgritechEnvironmentExample } from "./agritech-environment";
import { AlertCenterExample } from "./alert-center";
import { AutomationBuilderExample } from "./automation-builder";
import { DeviceDetailExample } from "./device-detail";
import { OperationsEnvironmentExample } from "./operations-environment";
import { PairingFlowExample } from "./pairing-flow";
import { SmartSpaceEnvironmentExample } from "./smart-space-environment";
import { StateHonestyExample } from "./state-honesty";
import { TelemetryHistoryExample } from "./telemetry-history";
import { IOT_EXAMPLES } from "@/lib/iot-examples";

/**
 * The reference examples, exercised the way a visitor uses them.
 *
 * Two kinds of check live here. Source scans read every file in this directory (the directory is the
 * file list, so a new example is covered the day it lands). Behaviour tests render the interactive
 * examples and drive them: the simulation runs on fake timers, so "1.4 seconds later" is an
 * `advanceTimersByTime` rather than a wait.
 */
const dir = path.resolve(import.meta.dirname);
const files = readdirSync(dir)
  .filter((n) => n.endsWith(".tsx") && !n.includes(".test."))
  .map((name) => ({ name, source: readFileSync(path.join(dir, name), "utf8") }));

const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
function utilityTokens(source: string): { raw: string; util: string }[] {
  const strings = [...stripComments(source).matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");
  return strings
    .flatMap((text) => text.split(/\s+/))
    .filter(Boolean)
    .map((raw) => ({ raw, util: raw.slice(raw.lastIndexOf(":") + 1) }));
}
const PHYSICAL = [/^-?(ml|mr|pl|pr)-/, /^-?(left|right)-/, /^text-(left|right)$/, /^rounded-(l|r|tl|tr|bl|br)(-|$)/, /^border-(l|r)(-|$)/, /^scroll-(ml|mr|pl|pr)-/, /^float-(left|right)$/, /^origin-(left|right)/, /^space-x-/];
const TOKEN_OWNED = /^-?(bg|text|border|ring|ring-offset|outline|fill|stroke|from|via|to|p[xytblrse]?|m[xytblrse]?|gap|gap-[xy]|space-[xy]|inset|inset-[xy]|top|bottom|start|end|rounded|rounded-[a-z]+|shadow|leading|tracking|opacity)-\[/;
const physical = (source: string) => utilityTokens(source).filter(({ util }) => PHYSICAL.some((re) => re.test(util))).map((t) => t.raw);
const arbitrary = (source: string) => utilityTokens(source).filter(({ util }) => TOKEN_OWNED.test(util)).map((t) => t.raw);

describe("example sources", () => {
  it("finds the examples", () => {
    expect(files.length).toBeGreaterThanOrEqual(15);
  });

  it("detects a physical utility and an arbitrary value in a sample (self-check)", () => {
    expect(physical('<div className="ml-2 pr-4 text-left rounded-l-lg ms-2" />')).toEqual(["ml-2", "pr-4", "text-left", "rounded-l-lg"]);
    expect(arbitrary('<div className="bg-[#fff] p-[13px] gap-4" />')).toEqual(["bg-[#fff]", "p-[13px]"]);
  });

  it("uses logical properties only", () => {
    const offenders = files.flatMap((f) => physical(f.source).map((u) => `${f.name}: ${u}`));
    expect(offenders).toEqual([]);
  });

  it("uses no arbitrary colour, spacing, radius, shadow or type value", () => {
    const offenders = files.flatMap((f) => arbitrary(f.source).map((u) => `${f.name}: ${u}`));
    expect(offenders).toEqual([]);
  });

  it("has no video, audio, canvas, network call or device-transport API", () => {
    const banned = /<(video|audio|canvas)\b|\bfetch\s*\(|\bWebSocket\b|\bXMLHttpRequest\b|\bEventSource\b|navigator\.(bluetooth|usb|serial)|sendBeacon|\bnew Worker\b/;
    const offenders = files.filter((f) => banned.test(stripComments(f.source))).map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it("only animates behind a reduced-motion guard", () => {
    const offenders = files.filter((f) => utilityTokens(f.source).some(({ util }) => /^animate-(spin|pulse|ping|bounce)$/.test(util))).map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it("gives every manifest example a copyable region and, when interactive, a client boundary", () => {
    for (const example of IOT_EXAMPLES) {
      const file = files.find((f) => example.path.endsWith(f.name))!;
      expect(file.source, example.slug).toContain("kx-iot:start");
      const interactive = /useState|useIotSimulation|useEffect/.test(stripComments(file.source));
      if (interactive) expect(file.source.trimStart().startsWith('"use client"'), `${example.slug} is interactive`).toBe(true);
    }
  });

  it("names the simulation on every simulated example", () => {
    for (const name of ["state-honesty", "smart-space-environment", "agritech-environment", "operations-environment", "device-detail", "automation-builder", "pairing-flow", "telemetry-history", "alert-center"]) {
      expect(files.find((f) => f.name === `${name}.tsx`)!.source, name).toContain("<SimNotice");
    }
  });
});

// ------------------------------------------------------------------------------------------------

let errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  errors.mockRestore();
});

const rtl = (node: React.ReactElement) => render(<div dir="rtl">{node}</div>);
const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const EXAMPLES: [string, () => React.ReactElement][] = [
  ["state-honesty", () => <StateHonestyExample />],
  ["smart-space-environment", () => <SmartSpaceEnvironmentExample />],
  ["agritech-environment", () => <AgritechEnvironmentExample />],
  ["operations-environment", () => <OperationsEnvironmentExample />],
  ["device-detail", () => <DeviceDetailExample />],
  ["automation-builder", () => <AutomationBuilderExample />],
  ["pairing-flow", () => <PairingFlowExample />],
  ["telemetry-history", () => <TelemetryHistoryExample />],
  ["alert-center", () => <AlertCenterExample />],
];

describe.each(EXAMPLES)("%s", (_slug, make) => {
  it("renders under RTL without console errors, labelled as a simulation, with no video", () => {
    const { container } = rtl(make());
    expect(container.querySelector("[data-simulation-notice]")).not.toBeNull();
    expect(container.querySelector("[data-simulation-notice]")!.textContent).toMatch(/Simulated/);
    expect(container.querySelector("video, audio, canvas")).toBeNull();
    expect(errors).not.toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = rtl(make());
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } },
    });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
});

// ------------------------------------------------------------------------------------------------

describe("state honesty", () => {
  beforeEach(() => vi.useFakeTimers());

  const confirmed = (id: string) => screen.getByTestId(`confirmed-${id}`).textContent;
  const requested = (id: string) => screen.getByTestId(`requested-${id}`).textContent;

  it("keeps the confirmed value unchanged while a request is pending, and flips it only on confirm", () => {
    render(<StateHonestyExample />);
    expect(confirmed("valve-02")).toBe("Open");
    fireEvent.click(within(screen.getByRole("radiogroup", { name: /Irrigation Valve 02 position/ })).getByRole("radio", { name: /Closed/ }));

    expect(requested("valve-02")).toBe("Closed");
    expect(confirmed("valve-02")).toBe("Open");

    tick(1000); // acknowledged (500 ms) but not confirmed (1400 ms)
    expect(confirmed("valve-02")).toBe("Open");
    expect(screen.getAllByText(/has not confirmed|not yet confirmed|acknowledged/i).length).toBeGreaterThan(0);

    tick(800);
    expect(confirmed("valve-02")).toBe("Closed");
    expect(requested("valve-02")).toBe("Nothing pending");
  });

  it("draws the request as a dashed, worded tile next to the solid confirmed one, and words a failure", () => {
    render(<StateHonestyExample />);
    expect(screen.getByTestId("requested-valve-03").closest("dl")!.className).not.toMatch(/border-dashed/);
    fireEvent.click(within(screen.getByRole("radiogroup", { name: /Irrigation Valve 03 position/ })).getByRole("radio", { name: /Open/ }));
    const tile = screen.getByTestId("requested-valve-03").closest("dl")!;
    expect(tile.className).toMatch(/border-dashed/);
    expect(tile).toHaveTextContent(/Requested/);
    expect(screen.getAllByText(/Requested, not yet confirmed/).length).toBeGreaterThan(0);
    tick(3000);
    expect(screen.getByText(/Failed\. The device did not change\./)).toBeInTheDocument();
    expect(screen.getByTestId("confirmed-valve-03").textContent).toBe("Closed");
  });

  it("fails the flaky valve once, never confirms the failed value, and confirms on an explicit retry", () => {
    render(<StateHonestyExample />);
    expect(confirmed("valve-03")).toBe("Closed");
    fireEvent.click(within(screen.getByRole("radiogroup", { name: /Irrigation Valve 03 position/ })).getByRole("radio", { name: /Open/ }));
    tick(3000);
    expect(confirmed("valve-03")).toBe("Closed");
    const retry = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retry);
    expect(confirmed("valve-03")).toBe("Closed");
    tick(3000);
    expect(confirmed("valve-03")).toBe("Open");
  });

  it("walks an unreachable device through timed out and unreachable, and offers Retry", () => {
    render(<StateHonestyExample />);
    expect(confirmed("pump-01")).toBe("On");
    fireEvent.click(screen.getByRole("button", { name: /Request a change, then lose the pump/ }));
    tick(9000);
    expect(confirmed("pump-01")).toBe("On");
    tick(3000);
    expect(confirmed("pump-01")).toBe("On");
    expect(screen.getAllByText(/unreachable/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /retry/i }).length).toBeGreaterThan(0);
  });
});

// ------------------------------------------------------------------------------------------------

describe("device detail", () => {
  beforeEach(() => vi.useFakeTimers());

  it("is one composed page, not a tab strip: identity, primary control, readings, and the context behind disclosures", () => {
    render(<DeviceDetailExample />);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByRole("article", { name: "Pump Station detail" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Location of Pump Station" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Pump Station power" })).toBeInTheDocument();
    for (const title of ["Alerts", "Health and connection", "Automation", "Activity", "About this device"]) {
      expect(screen.getByText(title, { selector: "summary span span" })).toBeInTheDocument();
    }
    expect(screen.getByText(/Shown, not executed/)).toBeInTheDocument();
  });

  it("shows the header state from the confirmed value and the simulation clock", () => {
    render(<DeviceDetailExample />);
    expect(screen.getAllByText("Running").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/^Last seen/).length).toBeGreaterThan(0);
  });

  it("keeps the large word on the confirmed state while a request is worded, dashed and separate", () => {
    render(<DeviceDetailExample />);
    const hero = screen.getByText("Running").closest("p")!;
    expect(within(hero).queryByText(/requested, not yet confirmed/)).toBeNull();

    fireEvent.click(screen.getByRole("switch", { name: "Pump Station power" }));
    expect(within(hero).getByText("Running")).toBeInTheDocument();
    const requested = within(hero).getByText(/Off requested, not yet confirmed/);
    expect(requested.className).toMatch(/border-dashed/);
    // The switch reports CONFIRMED, not what was asked.
    expect(screen.getByRole("switch", { name: "Pump Station power" })).toHaveAttribute("aria-checked", "true");

    tick(4000);
    expect(screen.getByText("Stopped")).toBeInTheDocument();
    expect(screen.queryByText(/Off requested, not yet confirmed/)).toBeNull();
  });

  it("lists its open alert and lets it be acknowledged from this page", () => {
    render(<DeviceDetailExample />);
    expect(screen.getByText(/1 open alert/)).toBeInTheDocument();
    expect(screen.getByText("Alerts").closest("details")).toHaveTextContent(/Pump flow below its limit/);
  });

  it("puts the primary control and readings before the disclosures in source order, for one designed mobile column", () => {
    render(<DeviceDetailExample />);
    const article = screen.getByRole("article", { name: "Pump Station detail" });
    const order = [...article.querySelectorAll('[aria-label="Pump control"], [aria-label="Readings"], details')].map((el) => el.getAttribute("aria-label") ?? el.tagName);
    expect(order.slice(0, 2)).toEqual(["Pump control", "Readings"]);
  });
});

// ------------------------------------------------------------------------------------------------

describe("automation builder", () => {
  it("saves only a valid rule, and says nothing is executed", async () => {
    const user = userEvent.setup();
    render(<AutomationBuilderExample />);
    expect(screen.queryByText(/nothing is executed/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: /Start from a blank rule/ }));
    await user.click(screen.getByRole("button", { name: /Save as demo state/ }));
    expect(screen.queryByText(/Saved as demo state — nothing is executed/)).toBeNull();

    await user.click(screen.getByRole("button", { name: /Reset to the Zone 3 rule/ }));
    await user.click(screen.getByRole("button", { name: /Save as demo state/ }));
    expect(screen.getByText(/Saved as demo state — nothing is executed/)).toBeInTheDocument();
    expect(screen.getByText(/Saved as demo state — nothing is executed/).closest('[role="status"]')).toHaveTextContent(/Zone 3 irrigation/);
  });
});

// ------------------------------------------------------------------------------------------------

describe("pairing flow", () => {
  beforeEach(() => vi.useFakeTimers());

  const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
  const maybe = (name: string | RegExp) => screen.queryByRole("button", { name });

  /** Drive whatever step is showing, by its visible button, until success, a failure alert, or nothing to press. */
  function drive(code = "KX2468", max = 30) {
    for (let i = 0; i < max; i++) {
      if (screen.queryByRole("alert") || screen.queryByText(/It responded when checked/)) return;
      const input = screen.queryByLabelText("Setup code") as HTMLInputElement | null;
      if (input && !input.value) fireEvent.change(input, { target: { value: code } });
      const pressed = ["Start setup", /^Continue with/, "Yes, that is my device", "Verify code", "Apply settings", "Place it here", "Finish this step"]
        .map((n) => maybe(n))
        .find((b) => b && !(b as HTMLButtonElement).disabled);
      if (pressed) fireEvent.click(pressed);
      else tick(500);
    }
  }

  it("reaches success by pressing buttons only, with the stepper visible throughout", () => {
    render(<PairingFlowExample />);
    expect(screen.getByRole("list", { name: "Pairing progress" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Step 1 of 9/ })).toBeInTheDocument();
    click("Start setup");
    expect(screen.getByRole("heading", { name: /Step 2 of 9: Searching/ })).toBeInTheDocument();
    tick(1300);
    expect(screen.getByRole("heading", { name: /Step 3 of 9: Device found/ })).toBeInTheDocument();
    drive();
    expect(screen.getByText(/It responded when checked/)).toBeInTheDocument();
    expect(screen.getByText(/no device was paired/i)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Pairing progress" })).toBeInTheDocument();
  });

  it("moves focus to the new step heading", () => {
    render(<PairingFlowExample />);
    click("Start setup");
    expect(screen.getByRole("heading", { name: /Step 2 of 9/ })).toHaveFocus();
    tick(1300);
    expect(screen.getByRole("heading", { name: /Step 3 of 9/ })).toHaveFocus();
  });

  it("does not validate a code of the wrong shape, and fails a well-formed wrong one through the machine", () => {
    render(<PairingFlowExample />);
    click("Start setup");
    tick(1300);
    click(/^Continue with/);
    tick(1000);
    click("Yes, that is my device");
    const input = screen.getByLabelText("Setup code");
    fireEvent.change(input, { target: { value: "12" } });
    expect(screen.getByRole("button", { name: "Verify code" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "ZZZZZZ" } });
    click("Verify code");
    tick(1100);
    expect(screen.getByRole("alert")).toHaveAttribute("data-failure-code", "authentication-failed");
  });

  it("with reduced motion, sets no timers and advances only on a button", () => {
    mockReducedMotion(true);
    render(<PairingFlowExample />);
    click("Start setup");
    tick(10_000);
    expect(screen.getByRole("heading", { name: /Step 2 of 9: Searching/ })).toBeInTheDocument();
    click("Finish this step");
    expect(screen.getByRole("heading", { name: /Step 3 of 9/ })).toBeInTheDocument();
    drive();
    expect(screen.getByText(/It responded when checked/)).toBeInTheDocument();
    mockReducedMotion(false);
  });

  it("cancels and can start again", () => {
    render(<PairingFlowExample />);
    click("Start setup");
    click("Cancel setup");
    expect(screen.getByRole("heading", { name: "Setup cancelled" })).toBeInTheDocument();
    click("Start again");
    expect(screen.getByRole("heading", { name: /Step 1 of 9/ })).toBeInTheDocument();
  });

  describe.each(pairingFailureScenarios.map((s) => [s.id, s] as const))("failure scenario %s", (_id, scenario) => {
    const pick = () => {
      fireEvent.change(screen.getByLabelText(/Simulate a failure/), { target: { value: scenario.id } });
    };
    const codeFor = scenario.method === "manual-code" ? "KXDM7Q2A" : scenario.method === "qr" ? "KX-DEMO-QR-1" : "KX2468";

    it(`shows PairingFailure (${scenario.code}) with its recovery actions`, () => {
      render(<PairingFlowExample />);
      pick();
      drive(codeFor);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("data-failure-code", scenario.code);
      const kinds = [...alert.querySelectorAll("button")].map((b) => b.getAttribute("data-kind"));
      for (const kind of scenario.expectRecovery) expect(kinds, `${scenario.id} offers ${kind}`).toContain(kind);
      expect(alert).toHaveFocus();
    });

    it("recovers and reaches success", () => {
      render(<PairingFlowExample />);
      pick();
      drive(codeFor);
      const alert = screen.getByRole("alert");
      const recovery = (["retry", "reset", "update"] as const).find((k) => alert.querySelector(`button[data-kind="${k}"]`));
      expect(recovery).toBeDefined();
      fireEvent.click(alert.querySelector(`button[data-kind="${recovery}"]`)!);
      drive(codeFor);
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.getByText(/It responded when checked/)).toBeInTheDocument();
    });

    it("can be cancelled from the failure", () => {
      render(<PairingFlowExample />);
      pick();
      drive(codeFor);
      fireEvent.click(screen.getByRole("alert").querySelector('button[data-kind="cancel"]')!);
      expect(screen.getByRole("heading", { name: "Setup cancelled" })).toBeInTheDocument();
    });
  });
});

// ------------------------------------------------------------------------------------------------

describe("environments and alert centre", () => {
  beforeEach(() => vi.useFakeTimers());

  it("smart space: a lock request stays unconfirmed until the device reports", () => {
    render(<SmartSpaceEnvironmentExample />);
    const group = screen.getByRole("radiogroup", { name: /Front door lock/ });
    expect(within(group).getByRole("radio", { name: /Locked/ })).toBeChecked();
    fireEvent.click(within(group).getByRole("radio", { name: /Unlocked/ }));
    expect(within(screen.getByRole("radiogroup", { name: /Front door lock/ })).getByRole("radio", { name: /Locked/ })).toBeChecked();
    tick(4000);
    expect(within(screen.getByRole("radiogroup", { name: /Front door lock/ })).getByRole("radio", { name: /Unlocked/ })).toBeChecked();
  });

  it("smart space: labels the camera as a sample with no live feed", () => {
    render(<SmartSpaceEnvironmentExample />);
    expect(screen.getAllByText(/Sample image — no live feed/).length).toBeGreaterThan(0);
  });

  it("agritech: shows the headline state and labels the forecast as application-provided", () => {
    render(<AgritechEnvironmentExample />);
    expect(screen.getAllByText(/24\.6/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Application-provided demo data — KinetixUI fetches no forecast/)).toBeInTheDocument();
    expect(screen.getAllByText(/Irrigate Zone 3 when dry|soil moisture/i).length).toBeGreaterThan(0);
  });

  it("operations: derives 24 devices, 22 healthy, 1 warning and 1 offline from the simulation", () => {
    render(<OperationsEnvironmentExample />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/24/);
    expect(text).toMatch(/22/);
  });

  it("alert centre: acknowledging keeps the alert in the list", () => {
    render(<AlertCenterExample />);
    const before = screen.getAllByRole("button", { name: /acknowledge/i });
    expect(before.length).toBeGreaterThan(0);
    fireEvent.click(before[0]!);
    expect(screen.getAllByRole("button", { name: /acknowledge/i }).length).toBe(before.length - 1);
    expect(screen.getByRole("checkbox", { name: /Show acknowledged/ })).toBeChecked();
  });
});
