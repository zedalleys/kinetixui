import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

/**
 * jsdom implements no layout, so the DOM APIs a real component reaches for during mount simply are not
 * there. The block fixtures on this site render actual KinetixUI components — that is the point of them —
 * so this app's tests hit the same gaps `packages/ui/test/setup.ts` covers for the library's own tests.
 *
 * These are environment shims, not product behaviour: nothing here changes what a component does, it only
 * stops jsdom throwing on an API a browser has had for years. When one is missing the failure is loud and
 * immediate (`ResizeObserver is not defined` at mount), which is why two short lists are acceptable here
 * where two copies of anything about the PRODUCT would not be.
 *
 * Guarded on `window`: this app's suite also runs pure Node tests — the generator guardrails, the release
 * notes — and one setup file serves both environments.
 */
if (typeof window !== "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

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

  // Radix's slider and select drive pointer capture directly; jsdom has none of it.
  Element.prototype.hasPointerCapture ??= vi.fn(() => false);
  Element.prototype.setPointerCapture ??= vi.fn();
  Element.prototype.releasePointerCapture ??= vi.fn();
  Element.prototype.scrollIntoView ??= vi.fn();
}

/**
 * The reader's platform is remembered (module memory + localStorage) so it carries across pages. Across tests
 * that would carry a platform picked in one test into the next, so every test starts from no choice at all.
 * Not a product shim: it is the test-isolation half of `platform-preference.ts`.
 */
if (typeof window !== "undefined") {
  const { afterEach } = await import("vitest");
  const { resetPlatformPreferenceForTests } = await import("../src/lib/platform-preference");
  afterEach(() => {
    resetPlatformPreferenceForTests();
    try {
      window.localStorage.clear();
    } catch {
      // storage unavailable in this environment: nothing was remembered
    }
  });
}
