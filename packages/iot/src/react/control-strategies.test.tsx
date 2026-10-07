import * as React from "react";
import axe from "axe-core";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeviceLevelControl, DeviceModeControl, DevicePowerControl, DeviceSetpointControl } from "./index";
import {
  resolveControlState,
  startCommandLifecycle,
  supersedeCommandLifecycle,
  transitionCommandLifecycle,
  type KinetixCommandLifecycle,
  type KinetixCommandLifecycleEvent,
} from "../functions";

/**
 * M2A: the four existing controls driven by a command lifecycle and a strategy.
 *
 * What is checked is what a person gets, sighted or not: where the control sits, what it says, what
 * its accessible state is, and what its status region announces. The numbers in the test names are
 * the brief's minimum list (docs/iot/IOT-MATURITY-AUDIT.md, M2A).
 */

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

function run<T>(state: KinetixCommandLifecycle<T>, ...steps: [KinetixCommandLifecycleEvent, number][]): KinetixCommandLifecycle<T> {
  let s = state;
  for (const [event, at] of steps) {
    const result = transitionCommandLifecycle(s, event, at);
    if (!result.ok) throw new Error(`${event.type} refused from ${s.stage}: ${result.rejection.code}`);
    s = result.state;
  }
  return s;
}

const turningOn = () => run(startCommandLifecycle<string>({ confirmed: "off", requested: "on", commandId: "c1" }), [{ type: "sent" }, 0]);
const failedOn = () => run(turningOn(), [{ type: "fail", commandId: "c1" }, 300]);
const confirmedOn = () => run(turningOn(), [{ type: "confirm", commandId: "c1" }, 300]);

const status = () => document.querySelector("[data-control-announcer]");
const knobAtOn = (container: HTMLElement) => (container.querySelector("[role=switch] > span > span") as HTMLElement).className.includes("translate-x-");
const READY = resolveControlState({ deviceStatus: "online" });

describe("DevicePowerControl: OFF → ON under each strategy", () => {
  it("(7) confirmed keeps the switch where the device reports it, and marks the request", () => {
    const { container } = render(<DevicePowerControl lifecycle={turningOn()} label="Lamp" />);
    const sw = screen.getByRole("switch", { name: "Lamp" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(sw).toHaveAttribute("aria-busy", "true");
    expect(sw).toHaveAttribute("data-shown", "off");
    expect(sw).toHaveAttribute("data-strategy", "confirmed");
    expect(knobAtOn(container)).toBe(false);
    expect(container.querySelector("[data-mark]")).toHaveAttribute("data-mark", "off");
    expect(screen.getByText("Turning on")).toBeInTheDocument();
    expect(sw).toBeDisabled();
  });

  it("(8) optimistic moves the switch to the request, without the confirmed mark", () => {
    const { container } = render(<DevicePowerControl lifecycle={turningOn()} strategy="optimistic" label="Lamp" />);
    const sw = screen.getByRole("switch", { name: "Lamp" });
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(sw).toHaveAttribute("aria-busy", "true");
    expect(knobAtOn(container)).toBe(true);
    expect(container.querySelector("[data-mark]")).toBeNull();
    expect(screen.getByText("On")).toBeInTheDocument();
    expect(status()).toHaveTextContent("");
  });

  it("(9) optimistic failure rolls back and says so", () => {
    const { container } = render(<DevicePowerControl lifecycle={failedOn()} strategy="optimistic" label="Lamp" />);
    const sw = screen.getByRole("switch", { name: "Lamp" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(knobAtOn(container)).toBe(false);
    const note = container.querySelector("[data-outcome]")!;
    expect(note).toHaveAttribute("data-outcome", "failed");
    expect(note).toHaveAttribute("data-rolled-back", "");
    expect(note).toHaveTextContent("Could not turn on. The device still reports off.");
    expect(status()).toHaveTextContent("Could not turn on. The device still reports off.");
  });

  it("(10) hybrid moves the switch but keeps it visibly unconfirmed", () => {
    const { container } = render(<DevicePowerControl lifecycle={turningOn()} strategy="hybrid" label="Lamp" />);
    const sw = screen.getByRole("switch", { name: "Lamp" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(knobAtOn(container)).toBe(true);
    const knob = container.querySelector("[role=switch] > span > span")!;
    expect(knob.className).toContain("border-dashed");
    expect(container.querySelector("[data-mark]")).toBeNull();
    expect(screen.getByText("Turning on")).toBeInTheDocument();
    expect(status()).toHaveTextContent("Turning on, waiting for the device.");
  });

  it("confirmed failure leaves the switch alone and still says the request did not happen", () => {
    const { container } = render(<DevicePowerControl lifecycle={failedOn()} label="Lamp" />);
    expect(container.querySelector("[data-outcome]")).toHaveTextContent("Could not turn on. The device still reports off.");
    expect(container.querySelector("[data-outcome]")).not.toHaveAttribute("data-rolled-back");
  });

  it("success reads as the device's value under every strategy", () => {
    for (const strategy of ["confirmed", "optimistic", "hybrid"] as const) {
      const { container } = render(<DevicePowerControl lifecycle={confirmedOn()} strategy={strategy} label="Lamp" />);
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
      expect(screen.getByRole("switch")).not.toHaveAttribute("aria-busy");
      expect(container.querySelector("[data-mark]")).toHaveAttribute("data-mark", "on");
      expect(status()).toHaveTextContent(/^On\.$/);
      cleanup();
    }
  });

  it("(12) a physical-switch report updates what is shown", () => {
    const idle = startCommandLifecycle<string>({ confirmed: "off" });
    const { rerender } = render(<DevicePowerControl lifecycle={idle} label="Lamp" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    rerender(<DevicePowerControl lifecycle={run(idle, [{ type: "report", value: "on", observedAt: new Date(10).toISOString() }, 20])} label="Lamp" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    // No request was made, so nothing is announced as an outcome.
    expect(status()).toHaveTextContent("");
  });

  it("(17, 18) unreachable then a reconnect report: confirmed if it matches, failed and worded if not", () => {
    const lost = run(turningOn(), [{ type: "deviceUnreachable" }, 2000]);
    const { rerender, container } = render(<DevicePowerControl lifecycle={lost} label="Lamp" />);
    expect(status()).toHaveTextContent("Could not turn on: the device is unreachable. It last reported off.");
    rerender(<DevicePowerControl lifecycle={run(lost, [{ type: "report", value: "on", observedAt: new Date(9000).toISOString() }, 9001])} label="Lamp" />);
    expect(status()).toHaveTextContent(/^On\.$/);
    expect(container.querySelector("[data-outcome]")).toBeNull();
    rerender(<DevicePowerControl lifecycle={run(lost, [{ type: "report", value: "off", observedAt: new Date(9000).toISOString() }, 9001])} label="Lamp" />);
    expect(status()).toHaveTextContent("Could not turn on. The device still reports off.");
  });

  it("a stale reply cannot change what is shown", () => {
    const lifecycle = turningOn();
    const stale = transitionCommandLifecycle(lifecycle, { type: "confirm", commandId: "old" }, 100);
    render(<DevicePowerControl lifecycle={stale.state} label="Lamp" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(status()).toHaveTextContent("Turning on, waiting for the device.");
  });

  it("does not announce at all without a lifecycle, or when told not to", () => {
    render(<DevicePowerControl state="off" requested="on" control={READY} label="Lamp" />);
    expect(status()).toBeNull();
    cleanup();
    render(<DevicePowerControl lifecycle={turningOn()} announce={false} label="Lamp" />);
    expect(status()).toBeNull();
  });

  it("a caller's control still wins over the lifecycle's own derivation", () => {
    render(<DevicePowerControl lifecycle={turningOn()} control={resolveControlState({ deviceStatus: "offline" })} label="Lamp" />);
    expect(screen.getByText("Device offline. Showing the last known setting")).toBeInTheDocument();
  });

  it("an open request whose link drops is announced as not confirmed, never as waiting", () => {
    // Reproduced on ce254f1: the description named the link, the status region still said "Turning on, waiting for the device."
    for (const connectivity of ["offline", "unreachable"] as const) {
      for (const strategy of ["confirmed", "optimistic", "hybrid"] as const) {
        render(<DevicePowerControl lifecycle={turningOn()} strategy={strategy} control={resolveControlState({ connectivity, lifecycle: turningOn() })} label="Lamp" />);
        expect(status(), `${connectivity} ${strategy}`).toHaveTextContent(`Device ${connectivity}. The requested change is not confirmed.`);
        expect(status()?.textContent, `${connectivity} ${strategy}`).not.toMatch(/waiting/);
        cleanup();
      }
    }
    // A link that is merely coming back, or unknown, keeps the request's own sentence.
    for (const connectivity of ["connecting", "unknown"] as const) {
      render(<DevicePowerControl lifecycle={turningOn()} control={resolveControlState({ connectivity, lifecycle: turningOn() })} label="Lamp" />);
      expect(status(), connectivity).toHaveTextContent("Turning on, waiting for the device.");
      cleanup();
    }
  });

  it("without a control, a settled lifecycle is pressable and requests the opposite of what is checked", () => {
    const onToggle = vi.fn();
    render(<DevicePowerControl lifecycle={confirmedOn()} label="Lamp" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onToggle).toHaveBeenCalledWith("off");
  });

  it("has no axe violations in any strategy, pending or failed", async () => {
    for (const strategy of ["confirmed", "optimistic", "hybrid"] as const) {
      for (const lifecycle of [turningOn(), failedOn()]) {
        const { container } = render(<DevicePowerControl lifecycle={lifecycle} strategy={strategy} label="Lamp" />);
        expect(await axeViolations(container)).toEqual([]);
        cleanup();
      }
    }
  });
});

describe("DeviceLevelControl", () => {
  const ramp = () => {
    const first = run(startCommandLifecycle<number>({ confirmed: 20, requested: 40, commandId: "c40" }), [{ type: "sent" }, 0]);
    return run(supersedeCommandLifecycle(first, 80, { commandId: "c80" }), [{ type: "sent" }, 100]);
  };

  it("(14) rapid 20 → 40 → 80: a late 40 never reads as a confirmed 80", () => {
    const late = transitionCommandLifecycle(ramp(), { type: "confirm", value: 40, commandId: "c40" }, 250).state;
    const passing = run(late, [{ type: "report", value: 40, observedAt: new Date(260).toISOString() }, 270]);
    const { container } = render(<DeviceLevelControl lifecycle={passing} label="Dimmer" />);
    expect(container.querySelector("[data-confirmed]")).toHaveTextContent("40%");
    expect(container.querySelector("[data-requested]")).toHaveTextContent("Requested 80%, not yet confirmed");
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "40%, changing to 80%");
    expect(status()).toHaveTextContent("Changing to 80%, waiting for the device.");
  });

  it("hybrid leads with the request and names what the device reports", () => {
    const { container } = render(<DeviceLevelControl lifecycle={ramp()} strategy="hybrid" label="Dimmer" />);
    expect(container.querySelector("[data-value-source=requested]")).toHaveTextContent("80%");
    expect(container.querySelector("[data-requested]")).toHaveTextContent("Requested, not yet confirmed. Device reports 20%");
    expect(container.querySelector("[data-requested-marker]")).not.toBeNull();
  });

  it("optimistic fills to the request with nothing marked, and rolls back on failure", () => {
    const { container, rerender } = render(<DeviceLevelControl lifecycle={ramp()} strategy="optimistic" label="Dimmer" />);
    expect(container.querySelector("[data-value-source=requested]")).toHaveTextContent("80%");
    expect(container.querySelector("[data-requested]")).toBeNull();
    expect(container.querySelector("[data-requested-marker]")).toBeNull();
    expect(screen.getByRole("slider")).toHaveAttribute("aria-busy", "true");
    rerender(<DeviceLevelControl lifecycle={run(ramp(), [{ type: "timeout" }, 5000])} strategy="optimistic" label="Dimmer" />);
    expect(container.querySelector("[data-confirmed]")).toHaveTextContent("20%");
    expect(container.querySelector("[data-outcome]")).toHaveTextContent("No confirmation for 80%: the device did not confirm in time, so the change may still apply. It last reported 20%.");
  });
});

describe("DeviceSetpointControl", () => {
  const heating = () => run(startCommandLifecycle<number>({ confirmed: 20, requested: 22, commandId: "t1" }), [{ type: "sent" }, 0]);

  it("(15) confirmed: reported target, requested target and current measurement are three separate facts", () => {
    const { container } = render(<DeviceSetpointControl lifecycle={heating()} current={18.5} min={10} max={30} label="Living room" />);
    expect(container.querySelector("[data-confirmed]")).toHaveTextContent("20°");
    expect(container.querySelector("[data-requested]")).toHaveTextContent("Requested 22°, not yet confirmed");
    expect(screen.getByText(/Now 18\.5°/)).toBeInTheDocument();
    expect(status()).toHaveTextContent("Living room: Changing the target to 22°, waiting for the device.");
  });

  it("(15) hybrid: the requested target leads and the device's target is named beside it", () => {
    const { container } = render(<DeviceSetpointControl lifecycle={heating()} strategy="hybrid" current={18.5} min={10} max={30} label="Living room" presentation="ring" />);
    expect(container.querySelector("[data-value-source=requested]")).toHaveTextContent("22°");
    expect(container.querySelector("[data-requested]")).toHaveTextContent("Requested, not yet confirmed. Device target 20°");
    // The ring keeps its #307 parts: the confirmed arc at the device's target, plus the dashed request.
    expect(container.querySelector("[data-ring-confirmed]")).toHaveAttribute("data-value-source", "reported");
    expect(container.querySelector("[data-ring-requested]")).not.toBeNull();
    expect(container.querySelector("[data-ring-marker]")!.getAttribute("class")).toContain("motion-reduce:transition-none");
  });

  it("only one polite region: the lifecycle announcer replaces the legacy sentence", () => {
    const { container } = render(<DeviceSetpointControl lifecycle={heating()} min={10} max={30} label="Living room" />);
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
    cleanup();
    const legacy = render(<DeviceSetpointControl target={20} requestedTarget={22} min={10} max={30} label="Living room" />);
    expect(legacy.container.querySelectorAll("[aria-live]")).toHaveLength(1);
    expect(legacy.container.querySelector("[data-control-announcer]")).toBeNull();
  });

  it("marks a pending setpoint as busy on the container and both steppers", () => {
    // Under `optimistic` the chip is withheld and nothing is announced while it waits, so `aria-busy` is
    // the only programmatic sign that the numeral is a request rather than the device's target.
    for (const strategy of ["confirmed", "hybrid", "optimistic"] as const) {
      const { container } = render(<DeviceSetpointControl lifecycle={heating()} strategy={strategy} control={READY} min={10} max={30} label="Living room" />);
      expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
      for (const name of ["Decrease Living room", "Increase Living room"]) expect(screen.getByRole("button", { name })).toHaveAttribute("aria-busy", "true");
      cleanup();
    }
    const settled = render(<DeviceSetpointControl lifecycle={run(heating(), [{ type: "confirm", commandId: "t1" }, 10])} control={READY} min={10} max={30} label="Living room" />);
    expect(settled.container.firstElementChild).not.toHaveAttribute("aria-busy");
    expect(screen.getByRole("button", { name: "Increase Living room" })).not.toHaveAttribute("aria-busy");
  });

  it("steps from the latest intent, not from what is drawn", () => {
    const onCommit = vi.fn();
    render(<DeviceSetpointControl lifecycle={run(heating(), [{ type: "confirm", commandId: "t1" }, 10])} control={READY} min={10} max={30} step={0.5} label="Living room" onCommit={onCommit} />);
    fireEvent.click(screen.getByRole("button", { name: "Increase Living room" }));
    expect(onCommit).toHaveBeenCalledWith(22.5);
  });
});

describe("DeviceModeControl", () => {
  const MODES = [
    { id: "a", label: "Program A" },
    { id: "b", label: "Program B" },
    { id: "c", label: "Program C", unavailable: true },
  ];
  const toB = () => run(startCommandLifecycle<string>({ confirmed: "a", requested: "b", commandId: "m1" }), [{ type: "sent" }, 0]);
  const checked = () => screen.getAllByRole("radio").find((r) => r.getAttribute("aria-checked") === "true")?.getAttribute("data-mode-id");

  it("confirmed: the reported mode stays checked, the requested one is named as requested", () => {
    render(<DeviceModeControl modes={MODES} lifecycle={toB()} label="Program" />);
    expect(checked()).toBe("a");
    expect(screen.getByRole("radio", { name: "Program B, requested, not yet confirmed" })).toHaveAttribute("data-state", "requested");
    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-busy", "true");
    expect(status()).toHaveTextContent("Changing to Program B, waiting for the device.");
  });

  it("(16) failure returns to the reported mode, under optimistic too, and says so", () => {
    const { container, rerender } = render(<DeviceModeControl modes={MODES} lifecycle={toB()} strategy="optimistic" label="Program" />);
    expect(checked()).toBe("b");
    rerender(<DeviceModeControl modes={MODES} lifecycle={run(toB(), [{ type: "fail", commandId: "m1" }, 100])} strategy="optimistic" label="Program" />);
    expect(checked()).toBe("a");
    expect(container.querySelector("[data-outcome]")).toHaveTextContent("Could not change to Program B. The device still reports Program A.");
    expect(status()).toHaveTextContent("Could not change to Program B. The device still reports Program A.");
  });

  it("hybrid raises the request but keeps the reported mode checked", () => {
    render(<DeviceModeControl modes={MODES} lifecycle={toB()} strategy="hybrid" label="Program" />);
    expect(checked()).toBe("a");
    const b = screen.getByRole("radio", { name: "Program B, requested, not yet confirmed" });
    expect(b.className).toContain("border-dashed");
    expect(b.className).toContain("shadow-sm");
  });

  it("a reconnect report settles the mode to what the device says", () => {
    const lost = run(toB(), [{ type: "deviceUnreachable" }, 500]);
    render(<DeviceModeControl modes={MODES} lifecycle={run(lost, [{ type: "report", value: "b", observedAt: new Date(900).toISOString() }, 901])} label="Program" />);
    expect(checked()).toBe("b");
    expect(status()).toHaveTextContent(/^Program B\.$/);
  });

  it("an unsupported option stays visible and cannot be chosen", () => {
    const onSelect = vi.fn();
    render(<DeviceModeControl modes={MODES} lifecycle={startCommandLifecycle<string>({ confirmed: "a" })} label="Program" onSelect={onSelect} />);
    const c = screen.getByRole("radio", { name: "Program C" });
    expect(c).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(c);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("the outcome and the status region sit outside the radiogroup", () => {
    render(<DeviceModeControl modes={MODES} lifecycle={run(toB(), [{ type: "fail", commandId: "m1" }, 100])} label="Program" />);
    const group = screen.getByRole("radiogroup");
    expect(group.querySelector("[data-outcome], [data-control-announcer]")).toBeNull();
    expect(Array.from(group.children).every((child) => child.getAttribute("role") === "radio")).toBe(true);
  });

  it("has no axe violations pending or failed", async () => {
    for (const lifecycle of [toB(), run(toB(), [{ type: "fail", commandId: "m1" }, 100])]) {
      const { container } = render(<DeviceModeControl modes={MODES} lifecycle={lifecycle} label="Program" />);
      expect(await axeViolations(container)).toEqual([]);
      cleanup();
    }
  });
});

describe("(19, 20) accessible meaning of pending and failure", () => {
  it("pending is exposed in words and busy state, not styling alone, for every control", () => {
    render(
      <>
        <DevicePowerControl lifecycle={turningOn()} label="Lamp" />
        <DeviceLevelControl lifecycle={run(startCommandLifecycle<number>({ confirmed: 20, requested: 40 }), [{ type: "sent" }, 0])} label="Dimmer" />
        <DeviceModeControl modes={[{ id: "a", label: "A" }, { id: "b", label: "B" }]} lifecycle={run(startCommandLifecycle<string>({ confirmed: "a", requested: "b" }), [{ type: "sent" }, 0])} label="Program" />
      </>,
    );
    const announcements = Array.from(document.querySelectorAll("[data-control-announcer]")).map((n) => n.textContent);
    expect(announcements).toEqual(["Turning on, waiting for the device.", "Changing to 40%, waiting for the device.", "Changing to B, waiting for the device."]);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "20%, changing to 40%");
    for (const region of document.querySelectorAll("[data-control-announcer]")) {
      expect(region).toHaveAttribute("role", "status");
      expect(region).toHaveAttribute("aria-live", "polite");
    }
  });

  it("the status region is in the document before its first message, so the first change is heard", () => {
    const idle = startCommandLifecycle<string>({ confirmed: "off" });
    const { rerender } = render(<DevicePowerControl lifecycle={idle} label="Lamp" />);
    const region = status();
    expect(region).toHaveTextContent("");
    act(() => rerender(<DevicePowerControl lifecycle={turningOn()} label="Lamp" />));
    expect(status()).toBe(region);
    expect(region).toHaveTextContent("Turning on, waiting for the device.");
  });
});

describe("compatibility: the pre-M2A props", () => {
  it("level, setpoint and mode render the legacy props exactly as before (confirmed)", () => {
    const { container } = render(
      <>
        <DeviceLevelControl value={20} target={60} label="Dimmer" />
        <DeviceSetpointControl target={20} requestedTarget={22} min={10} max={30} label="Room" />
        <DeviceModeControl modes={[{ id: "a", label: "A" }, { id: "b", label: "B" }]} value="a" requested="b" label="Program" />
      </>,
    );
    expect(Array.from(container.querySelectorAll("[data-confirmed]")).map((n) => n.textContent)).toEqual(["20%", "20°"]);
    expect(Array.from(container.querySelectorAll("[data-requested]")).map((n) => n.textContent)).toEqual(["Requested 60%, not yet confirmed", "Requested 22°, not yet confirmed"]);
    expect(screen.getByRole("radio", { name: "B, requested, not yet confirmed" })).toHaveAttribute("aria-checked", "false");
    expect(container.querySelector("[data-control-announcer]")).toBeNull();
  });

  it("power: the legacy props now default to confirmed; hybrid restores the moving track", () => {
    const { container } = render(<DevicePowerControl state="off" requested="on" label="Lamp" />);
    expect(knobAtOn(container)).toBe(false);
    cleanup();
    const hybrid = render(<DevicePowerControl state="off" requested="on" strategy="hybrid" label="Lamp" />);
    expect(knobAtOn(hybrid.container)).toBe(true);
  });
});
