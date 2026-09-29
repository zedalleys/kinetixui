import * as React from "react";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DeviceControlCard,
  DeviceGroupCard,
  DeviceLevelControl,
  DeviceModeControl,
  DevicePowerControl,
  DeviceSetpointControl,
  RoutineCard,
} from "./index";
import { resolveControlState } from "../functions/control";
import type { KinetixDevice } from "../types/device";

/**
 * The control layer.
 *
 * One rule is worth more here than all the rendering assertions combined: **a request the user has
 * made must not be drawn as a state the device has confirmed.** Every control is checked for it,
 * because it is the property that makes a control honest on a lock or a valve, and it is the one a
 * refactor is most likely to quietly lose.
 *
 * Same axe configuration and the same reasoning as `patterns.test.tsx`.
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
  name: "Packing line lamp",
  type: "light",
  status: "online",
  lastSeenAt: at(-60_000),
  ...over,
});

const READY = resolveControlState({ deviceStatus: "online" });
const PENDING = resolveControlState({ deviceStatus: "online", commandStatus: "sent" });
const OFFLINE = resolveControlState({ deviceStatus: "offline" });

describe("DevicePowerControl", () => {
  it("reports the confirmed state to assistive technology, not the requested one", () => {
    // The device says off; the user has asked for on. `aria-checked` must still say off, or a screen
    // reader is told the command succeeded before it did.
    render(<DevicePowerControl state="off" requested="on" control={PENDING} label="Lamp" />);
    expect(screen.getByRole("switch")).toHaveProperty("ariaChecked", "false");
  });

  it("does not accept a second press while a command is in flight", () => {
    const onToggle = vi.fn();
    render(<DevicePowerControl state="off" requested="on" control={PENDING} label="Lamp" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("toggles away from the confirmed state when it is operable", () => {
    const onToggle = vi.fn();
    render(<DevicePowerControl state="off" control={READY} label="Lamp" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onToggle).toHaveBeenCalledWith("on");
  });

  it("is inoperable while the device is offline", () => {
    render(<DevicePowerControl state="on" control={OFFLINE} label="Lamp" onToggle={vi.fn()} />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("does not show an unreported device as off", () => {
    render(<DevicePowerControl state={null} control={READY} label="Lamp" />);
    expect(screen.getByRole("switch")).toHaveProperty("ariaChecked", "false");
    // …but the visible text must not assert "Off" for a device that never reported.
    expect(screen.queryByText("Off")).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = render(<DevicePowerControl state="on" control={READY} label="Lamp" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("DeviceLevelControl", () => {
  it("commits on release rather than on every frame of a drag", () => {
    // A device command per animation frame is a real cost on a real gateway.
    const onCommit = vi.fn();
    const onPreview = vi.fn();
    render(<DeviceLevelControl value={20} control={READY} label="Brightness" onCommit={onCommit} onPreview={onPreview} />);
    const slider = screen.getByRole("slider");

    fireEvent.change(slider, { target: { value: "55" } });
    expect(onCommit).not.toHaveBeenCalled();
    expect(onPreview).toHaveBeenCalledWith(55);

    fireEvent.mouseUp(slider);
    expect(onCommit).toHaveBeenCalledWith(55);
  });

  it("commits on keyboard release too", () => {
    const onCommit = vi.fn();
    render(<DeviceLevelControl value={20} control={READY} label="Brightness" onCommit={onCommit} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "30" } });
    fireEvent.keyUp(slider, { key: "ArrowUp" });
    expect(onCommit).toHaveBeenCalledWith(30);
  });

  it("carries the confirmed and the requested level in one spoken value", () => {
    render(<DeviceLevelControl value={20} target={80} control={PENDING} label="Brightness" />);
    const text = screen.getByRole("slider").getAttribute("aria-valuetext") ?? "";
    expect(text).toMatch(/20/);
    expect(text).toMatch(/80/);
  });

  it("has no axe violations", async () => {
    const { container } = render(<DeviceLevelControl value={40} control={READY} label="Brightness" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("DeviceSetpointControl", () => {
  it("announces the target, the pending request and the current reading together", () => {
    const { container } = render(
      <DeviceSetpointControl current={18} target={21} requestedTarget={23} min={5} max={30} unit="°C" label="Target" control={PENDING} />,
    );
    const live = container.querySelector("[aria-live]");
    expect(live?.textContent ?? "").toMatch(/23/);
    expect(live?.textContent ?? "").toMatch(/18/);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <DeviceSetpointControl current={18} target={21} min={5} max={30} unit="°C" label="Target" control={READY} />,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("DeviceModeControl", () => {
  const modes = [
    { id: "heat", label: "Heat" },
    { id: "cool", label: "Cool" },
    { id: "eco", label: "Eco", unavailable: true },
  ];

  it("marks only the confirmed mode as checked while another is requested", () => {
    render(<DeviceModeControl modes={modes} value="heat" requested="cool" control={PENDING} label="Mode" />);
    const radios = screen.getAllByRole("radio");
    const checked = radios.filter((r) => r.getAttribute("aria-checked") === "true").map((r) => r.textContent);
    expect(checked).toEqual(["Heat"]);
  });

  it("keeps an unavailable mode visible and explained rather than hiding it", () => {
    // A mode that disappears cannot tell the user why it is gone.
    render(<DeviceModeControl modes={modes} value="heat" control={READY} label="Mode" />);
    const eco = screen.getByText("Eco").closest('[role="radio"]');
    expect(eco).not.toBeNull();
    expect(eco?.getAttribute("aria-disabled")).toBe("true");
  });

  it("is one tab stop with arrow-key movement inside it", () => {
    render(<DeviceModeControl modes={modes} value="heat" control={READY} label="Mode" onSelect={vi.fn()} />);
    const radios = screen.getAllByRole("radio");
    expect(radios.filter((r) => r.getAttribute("tabindex") === "0")).toHaveLength(1);

    radios[0].focus();
    fireEvent.keyDown(radios[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(radios[1]);
  });

  it("does not select a mode while a command is in flight", () => {
    const onSelect = vi.fn();
    render(<DeviceModeControl modes={modes} value="heat" requested="cool" control={PENDING} label="Mode" onSelect={onSelect} />);
    fireEvent.click(screen.getAllByRole("radio")[1]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<DeviceModeControl modes={modes} value="heat" control={READY} label="Mode" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("DeviceControlCard", () => {
  it("does not mount collapsed content", () => {
    // Twenty cards in a grid must not carry twenty sliders they are not showing.
    render(
      <DeviceControlCard device={device()} control={READY} expanded={<div data-testid="secondary">secondary</div>} />,
    );
    expect(screen.queryByTestId("secondary")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /more controls/i }));
    expect(screen.getByTestId("secondary")).toBeTruthy();
  });

  it("marks the surface unreachable when the device is", () => {
    const { container } = render(<DeviceControlCard device={device({ status: "offline" })} control={OFFLINE} />);
    expect(container.firstElementChild?.getAttribute("data-availability")).toBe("offline");
    expect(container.firstElementChild?.className).toContain("border-dashed");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <DeviceControlCard
        device={device()}
        control={READY}
        active
        primaryControl={<DevicePowerControl state="on" control={READY} label="Lamp" />}
        statusLine="Full brightness"
      />,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("DeviceGroupCard", () => {
  it("lets attention outrank activity", () => {
    // A zone with four running pumps and one fault reads as the fault.
    const { container } = render(<DeviceGroupCard name="North field" kind="Zone" deviceCount={5} activeCount={4} attentionCount={1} />);
    expect(container.firstElementChild?.getAttribute("data-attention")).toBe("");
    expect(container.firstElementChild?.getAttribute("data-active")).toBeNull();
  });

  it("states the attention count in words as well as colour", () => {
    render(<DeviceGroupCard name="North field" deviceCount={5} attentionCount={2} />);
    expect(screen.getByText(/2 need/i)).toBeTruthy();
  });

  it("keeps a group action out of the navigation button", async () => {
    // A button inside a button is invalid and unusable with a keyboard.
    const { container } = render(
      <DeviceGroupCard name="North field" deviceCount={5} onSelect={vi.fn()} action={<button type="button">All off</button>} />,
    );
    expect(container.querySelector("button button")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("RoutineCard", () => {
  const automation = {
    id: "a1",
    name: "Evening irrigation",
    kind: "schedule" as const,
    status: "idle" as const,
    enabled: true,
    trigger: "Weekdays 18:30",
    actions: "2 valves",
  };

  it("reads a next run as future, not as a last-seen", () => {
    // The regression: describeLastSeen floors elapsed time at zero and prefixes "Last seen", so a run
    // due in four hours rendered as "Last seen just now".
    render(<RoutineCard automation={{ ...automation, nextRunAt: at(4 * 3_600_000) }} now={NOW} />);
    expect(screen.getByText(/Next run in 4h/)).toBeTruthy();
    expect(screen.queryByText(/Last seen/)).toBeNull();
  });

  it("shows a past run in the past tense", () => {
    render(<RoutineCard automation={{ ...automation, lastRunAt: at(-5 * 60_000) }} now={NOW} />);
    expect(screen.getByText(/Last run 5m ago/)).toBeTruthy();
  });

  it("shows no next run when the product does not know one", () => {
    render(<RoutineCard automation={automation} now={NOW} />);
    expect(screen.queryByText(/Next run/)).toBeNull();
  });

  it("uses only core Tailwind animation for the running state", () => {
    // This package ships no CSS, so a custom @keyframes would silently do nothing in a consumer app.
    const { container } = render(<RoutineCard automation={{ ...automation, status: "running" }} now={NOW} />);
    const bar = container.querySelector('[aria-hidden="true"]');
    expect(bar?.className).toContain("animate-pulse");
    expect(bar?.className).toContain("motion-reduce:animate-none");
    expect(container.innerHTML).not.toMatch(/animate-\[/);
  });

  it("does not offer to run an automation that is already running", () => {
    render(<RoutineCard automation={{ ...automation, status: "running" }} now={NOW} onRun={vi.fn()} />);
    expect(screen.getByRole("button", { name: /running/i })).toBeDisabled();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <RoutineCard automation={{ ...automation, lastRunAt: at(-60_000) }} now={NOW} onRun={vi.fn()} onToggleEnabled={vi.fn()} onSelect={vi.fn()} />,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
