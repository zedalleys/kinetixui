import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BUILDING, findFloor } from "@/lib/building-ops";
import { BuildingOpsDemo } from "./building-ops-demo";

/** Paused, with no URL syncing: the test owns time. */
const renderDemo = (props: Partial<React.ComponentProps<typeof BuildingOpsDemo>> = {}) =>
  render(<BuildingOpsDemo syncUrl={false} clock={{ initiallyPaused: true }} {...props} />);

const marker = (id: string) => document.querySelector<HTMLButtonElement>(`[data-camera-marker="${id}"]`)!;
const row = (id: string) => document.querySelector<HTMLButtonElement>(`[data-camera-row="${id}"]`)!;
const inspector = () => document.querySelector<HTMLElement>("[data-inspector]")!;
const total = (name: string) => document.querySelector<HTMLElement>(`[data-total="${name}"]`)!;
const floorOption = (id: string) => document.querySelector<HTMLButtonElement>(`[data-floor-option="${id}"]`)!;

afterEach(() => vi.useRealTimers());

describe("Building Operations demo", () => {
  it("says the data is simulated and shows camera placeholders, not video", () => {
    renderDemo();
    expect(document.querySelector("[data-simulated-indicator]")).toHaveTextContent("Simulated data");
    expect(screen.getByRole("img", { name: /camera placeholder\. no video/i })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/live feed|live video|people detection (is|runs)|RK3588/i);
  });

  it("keeps the plan marker, the list row and the inspector on the same camera", () => {
    renderDemo();
    expect(inspector().dataset.inspector).toBe("gf-cam-4");
    expect(marker("gf-cam-4")).toHaveAttribute("aria-pressed", "true");
    expect(row("gf-cam-4")).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(marker("gf-cam-7"));
    expect(inspector().dataset.inspector).toBe("gf-cam-7");
    expect(within(inspector()).getByRole("heading", { level: 2 })).toHaveTextContent("GF-LNG-01");
    expect(row("gf-cam-7")).toHaveAttribute("aria-pressed", "true");
    expect(row("gf-cam-4")).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(row("gf-cam-2"));
    expect(marker("gf-cam-2")).toHaveAttribute("aria-pressed", "true");
    expect(marker("gf-cam-7")).toHaveAttribute("aria-pressed", "false");
    expect(inspector().dataset.inspector).toBe("gf-cam-2");
  });

  it("names every marker with camera, zone and status, and moves through them with the arrow keys", () => {
    renderDemo();
    expect(screen.getByRole("button", { name: "GF-ATR-01, Atrium, Online" })).toBe(marker("gf-cam-4"));
    const tabbable = [...document.querySelectorAll("[data-camera-marker]")].filter((el) => el.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
    marker("gf-cam-4").focus();
    fireEvent.keyDown(marker("gf-cam-4"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(marker("gf-cam-5"));
    expect(inspector().dataset.inspector).toBe("gf-cam-5");
    fireEvent.keyDown(marker("gf-cam-5"), { key: "End" });
    expect(document.activeElement).toBe(marker("gf-cam-7"));
  });

  it("switches floor consistently: plan, totals, cameras, alerts and selection", () => {
    renderDemo();
    const l2 = findFloor(BUILDING, "l2")!;
    fireEvent.click(floorOption("l2"));
    expect(floorOption("l2")).toHaveAttribute("aria-checked", "true");
    expect(floorOption("gf")).toHaveAttribute("aria-checked", "false");
    expect(document.querySelector("[data-floor-plan]")).toHaveAttribute("data-floor-plan", "l2");
    expect(total("floor-people")).toHaveTextContent("People on L2");
    expect(total("floor-cameras")).toHaveTextContent(`${l2.cameras.length} of ${l2.cameras.length} online`);
    expect(screen.getByRole("heading", { name: /cameras on l2/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alerts on L2" })).toBeInTheDocument();
    expect(document.querySelectorAll("[data-camera-row]")).toHaveLength(l2.cameras.length);
    for (const c of l2.cameras) expect(row(c.id)).toBeInTheDocument();
    // The selection follows to the new floor instead of pointing at a camera that is no longer shown.
    expect(inspector().dataset.inspector).toBe("l2-cam-1");
    expect(document.querySelectorAll("[data-zone-row]")).toHaveLength(l2.zones.length);
  });

  it("moves between floors with the arrow keys from a single tab stop", () => {
    renderDemo();
    expect([...document.querySelectorAll('[role="radio"]')].filter((el) => el.getAttribute("tabindex") === "0")).toEqual([floorOption("gf")]);
    floorOption("gf").focus();
    fireEvent.keyDown(floorOption("gf"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(floorOption("b1"));
    expect(document.querySelector("[data-floor-plan]")).toHaveAttribute("data-floor-plan", "b1");
  });

  it("filters cameras by zone and by status", () => {
    renderDemo();
    fireEvent.click(screen.getByRole("button", { name: "Atrium" }));
    expect([...document.querySelectorAll("[data-camera-row]")].map((el) => el.getAttribute("data-camera-row"))).toEqual(["gf-cam-4", "gf-cam-5"]);
    fireEvent.click(screen.getByRole("button", { name: /clear zone filter/i }));
    expect(document.querySelectorAll("[data-camera-row]")).toHaveLength(7);
    fireEvent.click(screen.getByRole("radio", { name: "Needs attention" }));
    expect(screen.getByText(/no cameras match this filter/i)).toBeInTheDocument();
  });

  it("keeps occupancy apart from the camera count", () => {
    renderDemo();
    const people = total("floor-people");
    const cams = total("floor-cameras");
    expect(people).toHaveTextContent(/All 5 zones reporting/);
    expect(cams).toHaveTextContent("7 of 7 online");
    expect(cams).toHaveTextContent(/cameras do not count occupancy/i);
  });

  it("shows stale readings as last known, out of the total, and stale telemetry as last known", () => {
    renderDemo({ initialScenario: "stale-telemetry" });
    expect(total("floor-people")).toHaveTextContent(/Partial: 5 of 6 zones reporting/);
    expect(total("floor-people").querySelector("dd")!.textContent).toMatch(/^\d+\+$/);
    const meeting = document.querySelector('[data-zone-row="l1-meet"]')!;
    expect(meeting).toHaveTextContent(/Last known \d+/);
    expect(meeting).toHaveTextContent("Not reporting");
    expect(inspector().dataset.inspector).toBe("l1-cam-5");
    expect(within(inspector()).getAllByText("Last known value").length).toBe(3);
    expect(row("l1-cam-5")).toHaveTextContent("Online, telemetry stale");
  });

  it("shows an offline camera as offline with its last heartbeat, without touching occupancy", () => {
    renderDemo({ initialScenario: "camera-offline" });
    expect(screen.getByRole("button", { name: "L2-FOC-01, Focus rooms, Offline" })).toHaveAttribute("aria-pressed", "true");
    expect(row("l2-cam-3")).toHaveTextContent(/Seen 4 min ago/);
    expect(total("floor-cameras")).toHaveTextContent("5 of 6 online");
    expect(total("floor-people")).toHaveTextContent(/All 6 zones reporting/);
    expect(screen.getAllByText(/L2-FOC-01 is offline/).length).toBeGreaterThan(0);
  });

  it("recovers after the link failure: unavailable, reconnecting, then current again", () => {
    renderDemo({ initialScenario: "recovery" });
    expect(total("floor-people").querySelector("dd")).toHaveTextContent("Unavailable");
    expect(total("floor-people")).not.toHaveTextContent(/^People on L3\s*0/);
    expect(total("floor-cameras")).toHaveTextContent("0 of 6 online");
    expect(row("l3-cam-1")).toHaveTextContent("Unreachable");

    const advance = screen.getByRole("button", { name: "Advance simulated time by 15 seconds" });
    fireEvent.click(advance);
    fireEvent.click(advance); // 0:30 — link restored
    expect(row("l3-cam-1")).toHaveTextContent("Online");
    expect(total("floor-cameras")).toHaveTextContent("6 of 6 online");
    expect(total("floor-people")).toHaveTextContent(/All 6 zones reporting/);
    expect(total("floor-alerts").querySelector("dd")).toHaveTextContent("0");
    const alertsSection = screen.getByRole("heading", { name: "Alerts on L3" }).closest("section")!;
    expect(within(alertsSection).getAllByText(/network link restored at 09:30:30/).length).toBeGreaterThan(0);
    // The resolution is announced once through the polite live region.
    expect(document.querySelector("[data-announcer]")).toHaveTextContent(/Resolved: .*restored/);
  });

  it("advances only on the injected clock, and stops when paused", () => {
    vi.useFakeTimers();
    let now = 0;
    render(<BuildingOpsDemo syncUrl={false} initialScenario="recovery" clock={{ clock: () => now, intervalMs: 1000 }} />);
    const clockText = () => document.querySelector("[data-sim-clock]")!.textContent;
    expect(clockText()).toBe("09:30:00 UTC");
    act(() => {
      now = 25_000;
      vi.advanceTimersByTime(1000);
    });
    expect(clockText()).toBe("09:30:25 UTC");
    expect(row("l3-cam-1")).toHaveTextContent("Reconnecting");
    fireEvent.click(screen.getByRole("button", { name: "Pause simulation" }));
    act(() => {
      now = 90_000;
      vi.advanceTimersByTime(5000);
    });
    expect(clockText()).toBe("09:30:25 UTC");
  });

  it("restarts a scenario and swaps scenarios from the visible control", () => {
    renderDemo();
    fireEvent.change(screen.getByLabelText("Scenario"), { target: { value: "crowded" } });
    expect(document.querySelector("[data-building-ops]")).toHaveAttribute("data-scenario", "crowded");
    expect(inspector().dataset.inspector).toBe("gf-cam-5");
    fireEvent.click(screen.getByRole("button", { name: "Advance simulated time by 15 seconds" }));
    fireEvent.click(screen.getByRole("button", { name: "Restart scenario" }));
    expect(document.querySelector("[data-sim-clock]")).toHaveTextContent("09:30:00 UTC");
  });

  it("clears acknowledgements on restart, so a replayed alert comes back new", () => {
    renderDemo({ initialScenario: "camera-offline" });
    const alerts = () => screen.getByRole("heading", { name: "Alerts on L2" }).closest("section")!;
    const ackButtons = () => within(alerts()).queryAllByRole("button", { name: /acknowledge/i });
    const before = ackButtons().length;
    expect(before).toBeGreaterThan(0);
    fireEvent.click(ackButtons()[0]);
    expect(ackButtons()).toHaveLength(before - 1);
    fireEvent.click(screen.getByRole("button", { name: "Restart scenario" }));
    expect(ackButtons()).toHaveLength(before);
  });

  it("skips time the tab spent hidden even when the browser suspended the interval", () => {
    vi.useFakeTimers();
    let now = 0;
    render(<BuildingOpsDemo syncUrl={false} clock={{ clock: () => now, intervalMs: 1000 }} />);
    const clockText = () => document.querySelector("[data-sim-clock]")!.textContent;
    act(() => {
      now = 2_000;
      vi.advanceTimersByTime(1000);
    });
    expect(clockText()).toBe("09:30:02 UTC");
    // Hidden for five minutes with no interval callbacks, then visible again.
    now = 302_000;
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    act(() => {
      now = 303_000;
      vi.advanceTimersByTime(1000);
    });
    expect(clockText()).toBe("09:30:03 UTC");
  });
});
