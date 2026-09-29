import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { at, testScenario } from "./test-scenario";
import { useIotSimulation } from "./use-simulation";

let now = 0;
const clock = () => now;
const advance = (ms: number, step = 500) => {
  for (let t = 0; t < ms; t += step) {
    act(() => {
      now += step;
      vi.advanceTimersByTime(step);
    });
  }
};

function mockMotion(reduce: boolean) {
  const listeners = new Set<() => void>();
  const add = vi.fn((_: string, l: () => void) => listeners.add(l));
  const remove = vi.fn((_: string, l: () => void) => listeners.delete(l));
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: add,
    removeEventListener: remove,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })) as unknown as typeof window.matchMedia;
  return { add, remove };
}

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event("visibilitychange"));
};

beforeEach(() => {
  vi.useFakeTimers();
  now = 1000;
  mockMotion(false);
});
afterEach(() => {
  setHidden(false);
  vi.useRealTimers();
});

describe("useIotSimulation", () => {
  it("renders the fixed start instant first, so the server render and hydration agree", () => {
    function Probe() {
      const { now: t } = useIotSimulation(testScenario, { clock });
      return createElement("output", null, t);
    }
    expect(renderToString(createElement(Probe))).toContain(testScenario.startAt);
    const { result } = renderHook(() => useIotSimulation(testScenario, { clock }));
    expect(result.current.now).toBe(testScenario.startAt);
  });

  it("advances the simulated clock with ambient drift after mount", () => {
    const { result } = renderHook(() => useIotSimulation(testScenario, { clock }));
    advance(3000);
    expect(result.current.now).toBe(at(3000));
    expect(result.current.reducedMotion).toBe(false);
  });

  it("settles a command: requested, acknowledged, then confirmed", () => {
    const { result } = renderHook(() => useIotSimulation(testScenario, { clock }));
    act(() => result.current.dispatch("lamp", "power", "on"));
    expect(result.current.sim.commands[0]!.lifecycle.stage).toBe("requested");
    expect(result.current.sim.devices.lamp!.confirmedValues.power).toBe("off");
    advance(500);
    expect(result.current.sim.commands[0]!.lifecycle.stage).toBe("acknowledged");
    expect(result.current.sim.devices.lamp!.confirmedValues.power).toBe("off");
    advance(1000);
    expect(result.current.sim.commands[0]!.lifecycle.stage).toBe("confirmed");
    expect(result.current.sim.devices.lamp!.confirmedValues.power).toBe("on");
  });

  it("under reduced motion, does not drift on its own but still settles a user command", () => {
    mockMotion(true);
    const { result } = renderHook(() => useIotSimulation(testScenario, { clock }));
    expect(result.current.reducedMotion).toBe(true);
    advance(10_000);
    expect(result.current.now).toBe(testScenario.startAt);
    expect(Object.keys(result.current.sim.live)).toHaveLength(0);

    act(() => result.current.dispatch("lamp", "power", "on"));
    expect(result.current.now).toBe(testScenario.startAt); // acting did not start a clock
    advance(1500);
    expect(result.current.sim.commands[0]!.lifecycle.stage).toBe("confirmed");
    expect(result.current.sim.devices.lamp!.confirmedValues.power).toBe("on");

    const settledAt = result.current.now;
    advance(10_000);
    expect(result.current.now).toBe(settledAt); // idle again: nothing moves
  });

  it("under reduced motion, an unreachable device still times out and reaches unreachable", () => {
    mockMotion(true);
    const { result } = renderHook(() => useIotSimulation(testScenario, { clock }));
    act(() => result.current.dispatch("ghost", "power", "on"));
    advance(3000);
    expect(result.current.sim.commands[0]!.lifecycle.stage).toBe("unreachable");
  });

  it("pauses on request, can single-step while paused, and resumes without a jump", () => {
    const { result } = renderHook(() => useIotSimulation(testScenario, { clock }));
    advance(1000);
    act(() => result.current.setPaused(true));
    const heldAt = result.current.now;
    advance(5000);
    expect(result.current.paused).toBe(true);
    expect(result.current.now).toBe(heldAt);
    act(() => result.current.step(1000));
    expect(result.current.now).toBe(new Date(Date.parse(heldAt) + 1000).toISOString());
    act(() => result.current.togglePaused());
    advance(500);
    expect(result.current.now).toBe(new Date(Date.parse(heldAt) + 1500).toISOString());
  });

  it("holds time while the document is hidden and does not count it afterwards", () => {
    const { result } = renderHook(() => useIotSimulation(testScenario, { clock }));
    advance(1000);
    const before = result.current.now;
    act(() => setHidden(true));
    advance(8000);
    expect(result.current.now).toBe(before);
    act(() => setHidden(false));
    advance(500);
    expect(result.current.now).toBe(new Date(Date.parse(before) + 500).toISOString());
  });

  it("exposes retry, cancel, reachability and alert acknowledgement", () => {
    const { result } = renderHook(() => useIotSimulation(testScenario, { clock }));
    act(() => result.current.dispatch("flaky", "power", "on"));
    advance(1000);
    expect(result.current.sim.commands[0]!.lifecycle.stage).toBe("failed");
    act(() => result.current.retry(result.current.sim.commands[0]!.id));
    advance(1000);
    expect(result.current.sim.devices.flaky!.confirmedValues.power).toBe("on");
    act(() => result.current.setReachable("lamp", false));
    expect(result.current.sim.devices.lamp!.reachable).toBe(false);
    const alert = result.current.sim.alerts.find((a) => a.deviceId === "lamp")!;
    act(() => result.current.acknowledgeAlert(alert.id));
    expect(result.current.sim.alerts.find((a) => a.id === alert.id)!.acknowledgedAt).toBeDefined();
    act(() => result.current.dispatch("ghost", "power", "on"));
    const id = result.current.sim.lastCommandId!;
    act(() => result.current.cancel(id));
    expect(result.current.sim.commands.find((c) => c.id === id)!.lifecycle.stage).toBe("cancelled");
  });

  it("resets to the start instant", () => {
    const { result } = renderHook(() => useIotSimulation(testScenario, { clock }));
    act(() => result.current.dispatch("lamp", "power", "on"));
    advance(2000);
    act(() => result.current.reset());
    expect(result.current.now).toBe(testScenario.startAt);
    expect(result.current.sim.commands).toHaveLength(0);
  });

  it("removes its interval and listeners on unmount", () => {
    const { remove } = mockMotion(false);
    const docRemove = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useIotSimulation(testScenario, { clock }));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith("change", expect.any(Function));
    expect(docRemove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    docRemove.mockRestore();
  });
});
