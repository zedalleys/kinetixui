import * as React from "react";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ActivityTimeline,
  AlertCard,
  AlertList,
  AutomationBuilder,
  AutomationRuleView,
  BatteryIndicator,
  DeviceGroupCard,
  DeviceHealthSummary,
  DeviceListItem,
  DeviceStatusBadge,
  FirmwareStatus,
  PairingFailure,
  PairingMethodPicker,
  PairingStepper,
  RoutineCard,
} from "./index";
import { Glyph } from "./glyph";
import type { KinetixDevice } from "../types/device";
import type { KinetixDeviceAlert } from "../types/alert";
import type { KinetixActivityEvent } from "../types/activity";
import type { KinetixAutomationRule } from "../types/automation";
import { summarizeFleetHealth } from "../functions/device-state";

/**
 * The visual maturity pass: what its new props and variants promise, kept separate from the behavioural
 * suites so those still read as the behaviour they protect. Every variant keeps the same semantics as
 * the default (roles, names, words next to glyphs); what changes is how it is drawn.
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

const alert = (over: Partial<KinetixDeviceAlert> = {}): KinetixDeviceAlert => ({
  id: "a1",
  deviceId: "d1",
  severity: "warning",
  message: "Pressure above threshold",
  raisedAt: at(-10 * MIN),
  ...over,
});

const device = (over: Partial<KinetixDevice> = {}): KinetixDevice => ({ id: "d1", name: "Valve", type: "valve", status: "online", lastSeenAt: at(-3 * MIN), ...over });

describe("AlertList / AlertCard variants", () => {
  const alerts = [
    alert({ id: "c", severity: "critical", message: "Overpressure" }),
    alert({ id: "w", severity: "warning", message: "Low flow", acknowledgedAt: at(-2 * MIN) }),
    alert({ id: "r", severity: "info", message: "Was low", resolvedAt: at(-1 * MIN) }),
  ];

  it("list (default) shares one surface: hairline-separated rows, no box per alert", () => {
    const { container } = render(<AlertList alerts={alerts} now={NOW} />);
    const list = screen.getByRole("list", { name: "Alerts" });
    expect(list.className).toContain("divide-y");
    expect(container.firstElementChild).toHaveAttribute("data-variant", "list");
    for (const row of container.querySelectorAll("[data-alert-state]")) {
      expect(row.className).not.toMatch(/(^|\s)border(\s|$)/);
      expect(row.className).not.toContain("rounded-2xl");
    }
  });

  it("compact draws single-line tinted rows and keeps the severity word beside the glyph", () => {
    const { container } = render(<AlertList variant="compact" alerts={alerts} now={NOW} onAcknowledge={() => {}} />);
    expect(container.firstElementChild).toHaveAttribute("data-variant", "compact");
    const rows = [...container.querySelectorAll("[data-alert-state]")];
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row).toHaveAttribute("data-variant", "compact");
      expect(row.querySelector("svg")).not.toBeNull();
    }
    expect(rows[0]).toHaveTextContent("Critical");
    expect(rows[0]).toHaveTextContent("Overpressure");
    // Settled rows say so in words, with a check.
    expect(rows[1]!.querySelector("[data-acknowledged-at]")).toHaveTextContent("Acknowledged");
    expect(rows[2]!.querySelector("[data-resolved]")).toHaveTextContent("Resolved");
    expect(screen.getAllByRole("button", { name: "Acknowledge" })).toHaveLength(1);
  });

  it("acknowledged is a worded chip with a check and a quieter tile, not faded text", () => {
    const { container } = render(<AlertCard alert={alert({ acknowledgedAt: at(-1 * MIN) })} now={NOW} />);
    const chip = container.querySelector("[data-acknowledged-at]")!;
    expect(chip).toHaveTextContent("Acknowledged");
    expect(chip.querySelector('svg[data-glyph="check"]')).not.toBeNull();
    expect(container.innerHTML).not.toMatch(/opacity-\d/);
  });

  it("gives every alert button a 44px target below md", () => {
    render(<AlertCard alert={alert({ action: { id: "restart", label: "Restart pump" } })} now={NOW} onAction={() => {}} onAcknowledge={() => {}} />);
    for (const button of screen.getAllByRole("button")) expect(button.className).toContain("min-h-11");
  });

  it("bare removes the card's own surface, standalone keeps one", () => {
    const { container, rerender } = render(<AlertCard alert={alert()} now={NOW} />);
    expect(container.firstElementChild!.className).toContain("rounded-2xl");
    rerender(<AlertCard alert={alert()} now={NOW} bare />);
    expect(container.firstElementChild!.className).not.toContain("rounded-2xl");
  });

  it("designs the empty state as a glyph and one sentence", () => {
    const { container } = render(<AlertList alerts={[]} emptyLabel="Nothing needs you." />);
    expect(container.querySelector("[data-empty]")).toHaveTextContent("Nothing needs you.");
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("is axe-clean in both variants", async () => {
    const list = render(<AlertList alerts={alerts} now={NOW} onAcknowledge={() => {}} />);
    expect(await axeViolations(list.container)).toEqual([]);
    cleanup();
    const compact = render(<AlertList variant="compact" alerts={alerts} now={NOW} onAcknowledge={() => {}} />);
    expect(await axeViolations(compact.container)).toEqual([]);
  });
});

describe("DeviceHealthSummary size", () => {
  const summary = summarizeFleetHealth([device({ id: "1" }), device({ id: "2", status: "offline" })], { now: NOW });

  it("scales the numeral up with size=lg and keeps the sentence intact", () => {
    const { container, rerender } = render(<DeviceHealthSummary summary={summary} />);
    const md = container.querySelector("[data-health-text] span")!.className;
    rerender(<DeviceHealthSummary summary={summary} size="lg" />);
    const lg = container.querySelector("[data-health-text] span")!.className;
    expect(md).toContain("text-headline-md");
    expect(lg).toContain("text-display-md");
    expect(container.firstElementChild).toHaveAttribute("data-size", "lg");
    expect(container.querySelector("[data-health-text]")!.textContent).toBe("2 devices · 1 healthy · 1 offline");
  });

  it("shows the per-bucket detail as text when there is no legend", () => {
    const { container } = render(<DeviceHealthSummary summary={summary} compact />);
    expect(container.querySelector("[data-health-text] .sr-only")).toBeNull();
    const { container: full } = render(<DeviceHealthSummary summary={summary} />);
    expect(full.querySelector("[data-health-text] .sr-only")).not.toBeNull();
  });
});

describe("DeviceGroupCard variants", () => {
  it("defaults to a tile with the active count as a large numeral", () => {
    const { container } = render(<DeviceGroupCard name="Kitchen" deviceCount={4} activeCount={3} />);
    expect(container.firstElementChild).toHaveAttribute("data-variant", "tile");
    expect(container.firstElementChild!.className).not.toMatch(/(^|\s)border(\s|$)/);
    expect(container).toHaveTextContent("3 of 4 active");
    expect(container.querySelector("[data-activity-bar]")).toHaveAttribute("aria-hidden", "true");
  });

  it("row is a compact rail row: selectable, aria-current, check + tint, trailing slot outside the button", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <DeviceGroupCard variant="row" name="Kitchen" kind="Room" deviceCount={4} activeCount={3} selected onSelect={onSelect} trailing={<button type="button" role="switch" aria-checked="true" aria-label="Kitchen lights">on</button>} />,
    );
    const select = screen.getByRole("button", { name: /Kitchen/ });
    expect(select).toHaveAttribute("aria-current", "true");
    expect(select.querySelector('svg[data-glyph="check"]')).not.toBeNull();
    expect(container.firstElementChild).toHaveAttribute("data-selected", "");
    expect(container.firstElementChild).toHaveAttribute("data-variant", "row");
    expect(select).not.toContainElement(screen.getByRole("switch"));
    expect(select.className).toContain("min-h-11");
    fireEvent.click(select);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("an unselected row carries no aria-current and no check", () => {
    render(<DeviceGroupCard variant="row" name="Garage" deviceCount={2} onSelect={() => {}} />);
    const select = screen.getByRole("button", { name: /Garage/ });
    expect(select).not.toHaveAttribute("aria-current");
    expect(select.querySelector('svg[data-glyph="check"]')).toBeNull();
  });

  it("takes a visual slot in place of the icon tile, hidden from assistive technology", () => {
    const { container } = render(<DeviceGroupCard variant="row" name="Garage" deviceCount={2} visual={<i data-testid="thumb" />} />);
    expect(screen.getByTestId("thumb").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("[data-glyph]")).toBeNull();
  });

  it("attention still outranks activity in the row and says so in words", () => {
    const { container } = render(<DeviceGroupCard variant="row" name="Kitchen" deviceCount={4} activeCount={3} attentionCount={2} />);
    expect(container.firstElementChild).toHaveAttribute("data-attention", "");
    expect(container).toHaveTextContent("2 need attention");
  });
});

describe("DeviceListItem and status pieces", () => {
  it("shows last seen in the row's second line at every width", () => {
    const { container } = render(<ul><DeviceListItem device={device({ locationName: "Hall" })} now={NOW} /></ul>);
    const time = container.querySelector("time")!;
    expect(time.className).not.toContain("hidden");
    expect(container.querySelector("li")).toHaveTextContent("Hall");
  });

  it("gives every status badge a distinct silhouette next to its word", () => {
    const shapes = (["online", "offline", "stale", "syncing", "pairing", "updating", "warning", "error", "disabled"] as const).map((status) => {
      const { container, unmount } = render(<DeviceStatusBadge status={status} />);
      const glyph = container.querySelector("svg")!.getAttribute("data-glyph");
      unmount();
      return glyph;
    });
    expect(new Set(shapes).size).toBe(shapes.length);
  });

  it("firmware pairs its status word with a glyph tile", () => {
    const { container } = render(<FirmwareStatus firmware={{ currentVersion: "1", availableVersion: "2", status: "update-available" }} />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container).toHaveTextContent("Update available");
  });
});

describe("BatteryIndicator presentation", () => {
  it("pill keeps the same accessible name and shows the level in words for low and critical", () => {
    const { container, rerender } = render(<BatteryIndicator value={9} presentation="pill" />);
    const pill = container.firstElementChild!;
    expect(pill).toHaveAttribute("role", "img");
    expect(pill).toHaveAttribute("aria-label", "Battery 9%, critical");
    expect(pill).toHaveAttribute("data-presentation", "pill");
    expect(pill).toHaveTextContent("Critical");
    expect(pill.querySelector('svg[data-glyph="triangle"]')).not.toBeNull();
    rerender(<BatteryIndicator value={80} presentation="pill" />);
    expect(container.firstElementChild).not.toHaveTextContent(/Low|Critical/);
    expect(container.firstElementChild).toHaveTextContent("80%");
  });

  it("pill never renders a missing reading as 0%", () => {
    const { container } = render(<BatteryIndicator value={null} presentation="pill" />);
    expect(container.firstElementChild).toHaveAttribute("aria-label", "Battery level unknown");
    expect(container.firstElementChild).toHaveTextContent("No reading");
    expect(container.firstElementChild).not.toHaveTextContent("0%");
  });

  it("icon stays the default", () => {
    const { container } = render(<BatteryIndicator value={50} />);
    expect(container.firstElementChild).not.toHaveAttribute("data-presentation");
  });
});

describe("ActivityTimeline variants", () => {
  const events: KinetixActivityEvent[] = [
    { id: "ok", timestamp: at(-5 * MIN), kind: "command", status: "confirmed", message: "Lamp on", actor: "Sam" },
    { id: "req", timestamp: at(-10 * MIN), kind: "command", status: "requested", message: "Setpoint 21" },
    { id: "bad", timestamp: at(-20 * MIN), kind: "alert", status: "failed", message: "Valve did not respond" },
    { id: "plain", timestamp: at(-30 * MIN), kind: "state-change", message: "Door closed" },
    { id: "old", timestamp: at(-26 * 60 * MIN), kind: "system", message: "Yesterday thing" },
  ];

  it.each(["rail", "blocks", "compact"] as const)("%s keeps nested ordered lists, day headings and <time dateTime>", (variant) => {
    const { container } = render(<ActivityTimeline events={events} now={NOW} variant={variant} />);
    expect(container.firstElementChild).toHaveAttribute("data-variant", variant);
    const days = container.querySelectorAll("[data-day]");
    expect(days).toHaveLength(2);
    expect(days[0]!.querySelector("span")!.textContent).toBe("Today");
    expect(within(days[0] as HTMLElement).getAllByRole("listitem")).toHaveLength(4);
    const time = container.querySelector("time")!;
    expect(time).toHaveAttribute("datetime", at(-5 * MIN));
    expect(time.querySelector(".sr-only")).toHaveTextContent("5 minutes ago");
    expect(screen.getByRole("list", { name: "Activity" })).toBeInTheDocument();
  });

  it("rail varies the dot's shape by status: filled, ring, cross, none", () => {
    const { container } = render(<ActivityTimeline events={events} now={NOW} />);
    const dot = (id: string) => [...container.querySelectorAll("li[data-kind]")].find((li) => li.textContent?.includes(id));
    expect(dot("Lamp on")!.querySelector(".bg-primary.rounded-full")).not.toBeNull();
    expect(dot("Setpoint 21")!.querySelector(".border-primary.rounded-full")).not.toBeNull();
    expect(dot("Valve did not respond")!.querySelector('svg[data-glyph="x"]')).not.toBeNull();
    expect(dot("Door closed")!.querySelector(".bg-muted-foreground\\/60")).not.toBeNull();
  });

  it("blocks marks not-yet-confirmed and failed blocks with a dashed outline, not only a tint", () => {
    const { container } = render(<ActivityTimeline events={events} now={NOW} variant="blocks" />);
    const block = (text: string) => [...container.querySelectorAll("li[data-kind]")].find((li) => li.textContent?.includes(text))!.querySelector("div")!;
    expect(block("Setpoint 21").className).toContain("border-dashed");
    expect(block("Valve did not respond").className).toContain("border-dashed");
    expect(block("Door closed").className).not.toContain("border-dashed");
    expect(container.querySelector('[data-status-label="requested"]')).toHaveTextContent("Requested, not yet confirmed");
  });

  it("compact draws a short word for a pending status but keeps the full sentence in the text", () => {
    const { container } = render(<ActivityTimeline events={events} now={NOW} variant="compact" />);
    const chip = container.querySelector('[data-status-label="requested"]')!;
    expect(chip.textContent).toBe("RequestedRequested, not yet confirmed");
    expect(chip.querySelector("[aria-hidden='true']:not(svg)")).toHaveTextContent("Requested");
    expect(chip.querySelector(".sr-only")).toHaveTextContent("Requested, not yet confirmed");
  });

  it("designs the empty state and stays axe-clean", async () => {
    const empty = render(<ActivityTimeline events={[]} emptyLabel="Nothing yet." />);
    expect(empty.container).toHaveTextContent("Nothing yet.");
    expect(empty.container.querySelector("svg")).not.toBeNull();
    cleanup();
    for (const variant of ["rail", "blocks", "compact"] as const) {
      const { container, unmount } = render(<ActivityTimeline events={events} now={NOW} variant={variant} />);
      expect(await axeViolations(container)).toEqual([]);
      unmount();
    }
  });
});

describe("RoutineCard", () => {
  const automation = { id: "a", name: "Goodnight", kind: "scene" as const, status: "idle" as const, enabled: true, trigger: "22:30", actions: "4 lights" };

  it("keeps a 44px switch target, a check on the on thumb, and no faded text when off", () => {
    const { container, rerender } = render(<RoutineCard automation={automation} onToggleEnabled={() => {}} />);
    const toggle = screen.getByRole("switch", { name: "Goodnight enabled" });
    expect(toggle.className).toContain("min-h-11");
    expect(toggle.querySelector('svg[data-glyph="check"]')).not.toBeNull();
    rerender(<RoutineCard automation={{ ...automation, enabled: false }} onToggleEnabled={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch").querySelector("svg")).toBeNull();
    expect(container.innerHTML).not.toMatch(/opacity-\d/);
    expect(container).toHaveTextContent("Off");
  });

  it("wraps a long name instead of truncating it, because the name is the identifier", () => {
    const name = "Evening lights and porch lamp";
    render(<RoutineCard automation={{ ...automation, name }} onToggleEnabled={() => {}} />);
    // The full name must be present as text, and must not be clipped by `truncate` (a single ellipsised line).
    const el = screen.getByText(name);
    expect(el.className).not.toContain("truncate");
    expect(el.className).toContain("line-clamp-2");
  });
});

describe("Automation view and builder", () => {
  const rule: KinetixAutomationRule = {
    id: "r",
    name: "Protect pump",
    enabled: true,
    trigger: { type: "metric", subject: "pressure", operator: "gt", value: 8, unit: "bar" },
    conditions: [{ id: "c1", subject: "mode", operator: "changes-to", value: "auto", join: "and" }],
    actions: [{ id: "a1", target: "pump", command: "turn-off", durationMinutes: 15 }],
  };

  it("draws the rule as labelled rows joined by connectors, then a quote-like summary", () => {
    const { container } = render(<AutomationRuleView rule={rule} />);
    const steps = container.querySelectorAll("[data-part]:not([data-part='for'])");
    expect([...steps].map((s) => s.getAttribute("data-part"))).toEqual(["when", "condition", "then"]);
    // A connector between rows, none after the last.
    expect(steps[0]!.querySelector("[aria-hidden='true']")).not.toBeNull();
    expect(steps[2]!.querySelector("[aria-hidden='true']")).toBeNull();
    expect(container.querySelector("[data-summary]")!.className).toContain("border-s-4");
  });

  it("builder keeps named 44px controls and a prominent summary", () => {
    render(<AutomationBuilder value={rule} onChange={() => {}} subjects={[{ id: "pressure", label: "Pressure" }, { id: "mode", label: "Mode" }]} targets={[{ id: "pump", label: "Pump" }]} onSubmit={() => {}} onCancel={() => {}} />);
    for (const name of ["Move condition 1 up", "Remove condition 1", "Move action 1 down", "Remove action 1", "Add condition", "Add action", "Save rule", "Cancel"]) {
      expect(screen.getByRole("button", { name }).className, name).toContain("min-h-11");
    }
    expect(screen.getByRole("group", { name: "Summary" })).toBeInTheDocument();
  });

  it("builder shows validation inline and in the summary list after a failed submit", () => {
    const empty: KinetixAutomationRule = { id: "e", name: "", enabled: true, conditions: [], actions: [] };
    const { container } = render(<AutomationBuilder value={empty} onChange={() => {}} subjects={[]} targets={[]} onSubmit={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Save rule" }));
    expect(container.querySelector("[data-error-summary]")).not.toBeNull();
    expect(container.querySelectorAll("[data-error]").length).toBeGreaterThan(0);
  });
});

describe("Pairing", () => {
  it("picker tiles: 44px, an icon each, selected is raised with a check and a heavier title", () => {
    render(<PairingMethodPicker value="qr" onChange={() => {}} options={{ bluetooth: { unavailable: true, unavailableReason: "Bluetooth is off" } }} />);
    const radios = screen.getAllByRole("radio");
    for (const radio of radios) expect(radio.className).toContain("min-h-11");
    const selected = screen.getByRole("radio", { name: /Scan QR code/ });
    expect(selected.className).toContain("shadow-md");
    expect(selected.querySelector('svg[data-glyph="check"]')).not.toBeNull();
    const blocked = screen.getByRole("radio", { name: /Bluetooth/ });
    expect(blocked.className).toContain("border-dashed");
    expect(blocked).toHaveTextContent("Unavailable: Bluetooth is off");
  });

  it("stepper dots: same list semantics, current step named and worded, others reachable by assistive technology", () => {
    render(<PairingStepper variant="dots" steps={[{ id: "a", label: "Plug in", status: "complete" }, { id: "b", label: "Connect", status: "active" }, { id: "c", label: "Name it", status: "pending" }]} />);
    const items = within(screen.getByRole("list", { name: "Pairing progress" })).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items.filter((i) => i.hasAttribute("aria-current")).map((i) => i.getAttribute("data-step"))).toEqual(["b"]);
    expect(items[1]).toHaveTextContent("In progress");
    expect(items[1]!.querySelector(".sr-only")).toBeNull();
    expect(items[0]!.querySelector(".sr-only")).toHaveTextContent("Plug in");
  });

  it("stepper nodes: a check when done, a number otherwise, and the current label always drawn when horizontal", () => {
    const { container } = render(<PairingStepper horizontal steps={[{ id: "a", label: "Plug in", status: "complete" }, { id: "b", label: "Connect", status: "active" }, { id: "c", label: "Name it", status: "pending" }]} />);
    const items = container.querySelectorAll("li");
    expect(items[0]!.querySelector('svg[data-glyph="check"]')).not.toBeNull();
    expect(items[1]).toHaveTextContent("2");
    const label = (li: Element) => within(li as HTMLElement).getByText(/Plug in|Connect|Name it/);
    expect(label(items[1]!).className).not.toContain("sr-only");
    expect(label(items[2]!).className).toContain("sr-only");
    expect(label(items[2]!).className).toContain("sm:not-sr-only");
  });

  it("failure stays an alert with recovery callbacks and a primary first action", () => {
    const onAction = vi.fn();
    render(<PairingFailure code="timeout" onAction={onAction} />);
    const alertEl = screen.getByRole("alert");
    expect(alertEl.querySelector('svg[data-glyph="octagon"]')).not.toBeNull();
    const buttons = within(alertEl).getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons[0]!.className).toContain("bg-primary");
    for (const b of buttons) expect(b.className).toContain("min-h-11");
    fireEvent.click(buttons[0]!);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe("Glyph additions", () => {
  it("draws the new plus and x glyphs", () => {
    const { container } = render(<><Glyph name="plus" /><Glyph name="x" /></>);
    expect([...container.querySelectorAll("svg")].map((s) => s.getAttribute("data-glyph"))).toEqual(["plus", "x"]);
    for (const svg of container.querySelectorAll("svg")) expect(svg.querySelector("path")).not.toBeNull();
  });
});
