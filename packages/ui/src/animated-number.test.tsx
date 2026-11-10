import * as React from "react";
import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnimatedNumber, useAnimatedNumber } from "./lib/animated-number";

afterEach(() => vi.restoreAllMocks());
function clock() {
  let reduced = false;
  let change = () => {};
  let serial = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(window, "matchMedia").mockImplementation(() => ({ get matches() { return reduced; }, addEventListener: (_: string, fn: () => void) => { change = fn; }, removeEventListener: vi.fn() }) as unknown as MediaQueryList);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((fn) => { frames.set(++serial, fn); return serial; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => { frames.delete(id); });
  return {
    step(time: number) { act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach((fn) => fn(time)); }); },
    reduce() { act(() => { reduced = true; change(); }); },
    pending: () => frames.size,
  };
}
describe("numeric motion", () => {
  it("starts at the target, retargets mid-flight, and finishes exactly in both directions", () => {
    const c = clock();
    const { result, rerender, unmount } = renderHook(({ value }) => useAnimatedNumber(value), { initialProps: { value: 20 } });
    expect(result.current).toBe(20); expect(c.pending()).toBe(0);
    rerender({ value: 100 }); c.step(0); c.step(150);
    expect(result.current).toBe(60);
    rerender({ value: -20 }); c.step(200); c.step(350);
    expect(result.current).toBe(20); c.step(500); expect(result.current).toBe(-20);
    unmount(); expect(c.pending()).toBe(0);
  });
  it("settles on a live reduced-motion change and exposes only the target to assistive technology", () => {
    const c = clock();
    const { rerender } = render(<AnimatedNumber value={20} format={(v) => `${Math.round(v)}%`} />);
    rerender(<AnimatedNumber value={100} format={(v) => `${Math.round(v)}%`} />);
    c.step(0); c.step(150);
    expect(screen.getByText('60%')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('100%')).toHaveClass('sr-only');
    c.reduce(); expect(screen.getAllByText('100%')).toHaveLength(2); expect(c.pending()).toBe(0);
  });
  it("does not interpolate non-finite values or leak callbacks on unmount", () => {
    const c = clock();
    const { result, rerender, unmount } = renderHook(({ value }) => useAnimatedNumber(value), { initialProps: { value: 20 } });
    rerender({ value: Infinity }); expect(result.current).toBe(Infinity); expect(c.pending()).toBe(0);
    rerender({ value: 30 }); expect(result.current).toBe(30);
    rerender({ value: 50 }); expect(c.pending()).toBe(1);
    unmount(); expect(c.pending()).toBe(0);
  });
});
