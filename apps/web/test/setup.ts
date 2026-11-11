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
  window.ResizeObserver ??=
    ResizeObserverStub as unknown as typeof ResizeObserver;

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
  const { resetPlatformPreferenceForTests } =
    await import("../src/lib/platform-preference");
  afterEach(() => {
    resetPlatformPreferenceForTests();
    try {
      window.localStorage.clear();
    } catch {
      // storage unavailable in this environment: nothing was remembered
    }
  });
}

/**
 * A test that times out mid-interaction does not take its interaction with it.
 *
 * `userEvent` types one character per macrotask, so a test cancelled in the middle of `type()` leaves a live
 * promise chain with keystrokes still to deliver. Vitest cannot cancel it, and Testing Library's cleanup only
 * unmounts the tree — it cannot reach into a pending chain. The stragglers land on whatever is focused when
 * they arrive, which is the *next* test's freshly mounted input. Measured on `command-menu.test.tsx`: one
 * timeout mid-`type("Introduction")` died with its own field reading "Intr", and the following test — a
 * different test, freshly mounted, passing on its own — ended holding "uction" and failed for a reason that
 * had nothing to do with it. Two siblings went down with it.
 *
 * So the chain is drained here, in the teardown of the test that started it, once cleanup has emptied the
 * body: the leftover keystrokes still fire, but they land on nothing and are gone before the next test mounts.
 *
 * Only for a test that did not pass. A test that finished cleanly awaited its own interaction to completion,
 * so it has nothing pending, and skipping it keeps the happy path free by construction rather than by
 * measurement — this suite is too noisy to show a cost either way (three runs without this hook spanned
 * 196.4s, 201.9s and 213.0s; the run with it, 209.9s, sits inside that). The bound is a backstop against a
 * chain that never settles: the suite should fail on the timeout, not hang in here.
 *
 * This is isolation, not headroom. A genuinely slow test still times out and still fails. It just fails alone.
 */
if (typeof window !== "undefined") {
  const { afterEach } = await import("vitest");
  const { cleanup } = await import("@testing-library/react");

  afterEach(async (context) => {
    if (context.task.result?.state === "pass") return;

    cleanup(); // idempotent, so this does not depend on hook order with Testing Library's own auto-cleanup
    let delivered = 0;
    const count = () => {
      delivered += 1;
    };
    const watched = [
      "keydown",
      "keyup",
      "pointerdown",
      "pointerup",
      "click",
    ] as const;
    for (const type of watched) document.addEventListener(type, count, true);
    try {
      for (let quiet = 0, turn = 0; quiet < 3 && turn < 300; turn += 1) {
        const before = delivered;
        await new Promise((resolve) => setTimeout(resolve, 0));
        quiet = delivered === before ? quiet + 1 : 0;
      }
    } finally {
      for (const type of watched)
        document.removeEventListener(type, count, true);
    }
  });
}
