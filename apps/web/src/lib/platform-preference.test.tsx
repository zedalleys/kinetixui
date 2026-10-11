import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/docs/components/button" }));

import { ComponentPreview } from "@/components/component-preview";
import { analytics } from "./analytics";
import {
  PLATFORM_STORAGE_KEY,
  parsePlatform,
  resetPlatformPreferenceForTests,
  setPreferredPlatform,
} from "./platform-preference";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

const openCode = async (user: ReturnType<typeof userEvent.setup>, index = 0) =>
  user.click(screen.getAllByRole("tab", { name: "code" })[index]!);
const selected = () => screen.getAllByRole("tab", { selected: true }).map((t) => t.textContent);

describe("parsePlatform", () => {
  it.each(["react", "angular", "swiftui", "compose", "flutter", " SwiftUI "])("accepts %j", (v) => expect(parsePlatform(v)).not.toBeNull());
  it.each(["vue", "swift", "kotlin", "", null, undefined, "react;drop"])("rejects %j", (v) => expect(parsePlatform(v)).toBeNull());
});

describe("the reader's platform", () => {
  it("is shared by every preview on the page: one pick switches all of them, and is reported once", async () => {
    const user = userEvent.setup();
    const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
    render(
      <>
        <ComponentPreview name="button-demo" />
        <ComponentPreview name="button-variants" />
      </>,
    );
    await openCode(user, 0);
    await openCode(user, 1);
    await user.click(screen.getAllByRole("tab", { name: "SwiftUI" })[0]!);
    expect(screen.getAllByRole("tab", { name: "SwiftUI" }).map((t) => t.getAttribute("aria-selected"))).toEqual(["true", "true"]);
    expect(track.mock.calls.filter(([e]) => e === "platform_selected")).toHaveLength(1);
  });

  it("is remembered: the next page opens on it, and restoring it is not reported as a selection", async () => {
    const user = userEvent.setup();
    render(<ComponentPreview name="button-demo" />);
    await openCode(user);
    await user.click(screen.getByRole("tab", { name: "Flutter" }));
    expect(window.localStorage.getItem(PLATFORM_STORAGE_KEY)).toBe("flutter");
    cleanup();

    // a new document: memory is gone, storage is not
    resetPlatformPreferenceForTests();
    const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
    render(<ComponentPreview name="button-demo" />);
    await openCode(user);
    expect(selected()).toContain("Flutter");
    expect(track).not.toHaveBeenCalledWith("platform_selected", expect.anything());
  });

  it("opens on ?platform= without saving it over the reader's own choice", async () => {
    window.localStorage.setItem(PLATFORM_STORAGE_KEY, "compose");
    window.history.replaceState(null, "", "/docs/components/button?platform=angular");
    const user = userEvent.setup();
    render(<ComponentPreview name="button-demo" />);
    await openCode(user);
    expect(selected().some((t) => t?.startsWith("Angular"))).toBe(true);
    expect(window.localStorage.getItem(PLATFORM_STORAGE_KEY)).toBe("compose");
  });

  it("ignores an unknown value from the URL or storage and falls back to React", async () => {
    window.localStorage.setItem(PLATFORM_STORAGE_KEY, "vue");
    window.history.replaceState(null, "", "/docs/components/button?platform=svelte");
    const user = userEvent.setup();
    render(<ComponentPreview name="button-demo" />);
    await openCode(user);
    expect(selected()).toContain("React");
  });

  it("still works for the page when storage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const user = userEvent.setup();
    render(<ComponentPreview name="button-demo" />);
    await openCode(user);
    expect(selected()).toContain("React");
    await user.click(screen.getByRole("tab", { name: "SwiftUI" }));
    expect(selected()).toContain("SwiftUI");
  });

  it("follows a choice made in another tab, in every preview on the page", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ComponentPreview name="button-demo" />
        <ComponentPreview name="button-variants" />
      </>,
    );
    await openCode(user, 0);
    await openCode(user, 1);
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: PLATFORM_STORAGE_KEY, newValue: "compose" }));
    });
    expect(screen.getAllByRole("tab", { name: "Jetpack Compose" }).map((t) => t.getAttribute("aria-selected"))).toEqual(["true", "true"]);
  });

  it("setPreferredPlatform drives a mounted preview", async () => {
    const user = userEvent.setup();
    render(<ComponentPreview name="button-demo" />);
    await openCode(user);
    act(() => setPreferredPlatform("swiftui"));
    expect(selected()).toContain("SwiftUI");
  });
});
