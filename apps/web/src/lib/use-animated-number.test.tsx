import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAnimatedNumber } from "./use-animated-number";

afterEach(() => vi.restoreAllMocks());

describe("numeric continuity", () => {
  it("renders the target first and immediately settles when reduced motion changes mid-flight", () => {
    let reduced = false;
    let onChange: () => void = () => {};
    vi.spyOn(window, "matchMedia").mockImplementation(() => ({
      get matches() { return reduced; },
      addEventListener: (_: string, fn: () => void) => { onChange = fn; },
      removeEventListener: vi.fn(),
    }) as unknown as MediaQueryList);
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const { result, rerender, unmount } = renderHook(({ value }) => useAnimatedNumber(value), { initialProps: { value: 64 } });
    expect(result.current).toBe(64);
    rerender({ value: 100 });
    act(() => { reduced = true; onChange(); });
    expect(result.current).toBe(100);
    unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it("keeps making visible progress during consecutive frame-by-frame slider updates", () => {
    let clock = 0;
    let next = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { callbacks.set(++next, callback); return next; });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => { callbacks.delete(id); });
    vi.spyOn(window, "matchMedia").mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList);
    const { result, rerender } = renderHook(({ value }) => useAnimatedNumber(value), { initialProps: { value: 0 } });
    for (let value = 1; value <= 60; value++) {
      rerender({ value });
      act(() => { clock += 16; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach((callback) => callback(clock)); });
      expect(result.current).toBeGreaterThan(0);
    }
    act(() => { clock += 1000; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach((callback) => callback(clock)); });
    expect(result.current).toBe(60);
  });

});
