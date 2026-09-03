import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom is missing a handful of DOM APIs that Radix / embla / recharts touch.

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
window.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
window.IntersectionObserver ??= IntersectionObserverStub as unknown as typeof IntersectionObserver;

Element.prototype.scrollIntoView ??= vi.fn();
Element.prototype.scrollTo ??= vi.fn();
Element.prototype.hasPointerCapture ??= vi.fn(() => false);
Element.prototype.setPointerCapture ??= vi.fn();
Element.prototype.releasePointerCapture ??= vi.fn();

if (!window.HTMLMediaElement.prototype.play) {
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
}
