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
});
