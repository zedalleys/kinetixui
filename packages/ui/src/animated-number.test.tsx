import * as React from "react";
import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { AnimatedNumber, useAnimatedNumber } from "./lib/animated-number";

afterEach(() => vi.restoreAllMocks());
function clock() {
  let now = 0;
  vi.spyOn(window.performance, "now").mockImplementation(() => now);
  let reduced = false;
  let change = () => {};
  let serial = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(window, "matchMedia").mockImplementation(() => ({ get matches() { return reduced; }, addEventListener: (_: string, fn: () => void) => { change = fn; }, removeEventListener: vi.fn() }) as unknown as MediaQueryList);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((fn) => { frames.set(++serial, fn); return serial; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => { frames.delete(id); });
  return {
    at(time: number) { now = time; },
    step(time: number) { now = time; act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach((fn) => fn(time)); }); },
    reduce() { act(() => { reduced = true; change(); }); },
    pending: () => frames.size,
  };
}
describe("numeric motion", () => {
  it.each([false, true])("hydrates a negative decimal without an initial tween (reduced=%s)", async (reduced) => {
    const c = clock();
    if (reduced) c.reduce();
    const format = (value: number) => value.toFixed(2);
    const initial = <AnimatedNumber value={-1.25} format={format} />;
    const container = document.createElement("div");
    container.innerHTML = renderToString(initial);
    document.body.append(container);
    const recover = vi.fn();
    let root!: ReturnType<typeof hydrateRoot>;
    await act(async () => { root = hydrateRoot(container, initial, { onRecoverableError: recover }); });
    expect(container.querySelector("[aria-hidden]")?.textContent).toBe("-1.25");
    expect(container.querySelector(".sr-only")?.textContent).toBe("-1.25");
    expect(recover).not.toHaveBeenCalled();
    expect(c.pending()).toBe(0);
    act(() => root.render(<AnimatedNumber value={2.5} format={format} />));
    if (reduced) {
      expect(container.querySelector("[aria-hidden]")?.textContent).toBe("2.50");
    } else {
      c.step(150);
      expect(container.querySelector("[aria-hidden]")?.textContent).toBe("0.63");
    }
    expect(container.querySelector(".sr-only")?.textContent).toBe("2.50");
    act(() => root.unmount());
    expect(c.pending()).toBe(0);
    container.remove();
  });
  it("keeps advancing while retargeted every frame", () => {
    const c = clock();
    const { result, rerender, unmount } = renderHook(({ value }) => useAnimatedNumber(value), { initialProps: { value: 0 } });
    for (let target = 1; target <= 60; target++) {
      c.at((target - 1) * 16);
      const previous = result.current;
      rerender({ value: target });
      c.step(target * 16);
      expect(result.current, `frame ${target} must advance before the next retarget`).toBeGreaterThan(previous);
      expect(result.current).toBeLessThan(target);
    }
    c.step(1260);
    expect(result.current).toBe(60);
    expect(c.pending()).toBe(0);
    unmount();
  });
  it("starts at the target, retargets mid-flight, and finishes exactly in both directions", () => {
    const c = clock();
    const { result, rerender, unmount } = renderHook(({ value }) => useAnimatedNumber(value), { initialProps: { value: 20 } });
    expect(result.current).toBe(20); expect(c.pending()).toBe(0);
    rerender({ value: 100 }); c.step(0); c.step(150);
    expect(result.current).toBe(60);
    c.at(200); rerender({ value: -20 }); c.step(200); c.step(350);
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
