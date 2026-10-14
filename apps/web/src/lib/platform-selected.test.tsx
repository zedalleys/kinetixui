import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/docs/components/button" }));

import { ComponentPreview } from "@/components/component-preview";
import { CrossPlatformFlagship } from "@/components/cross-platform-flagship";
import { Showcase } from "@/components/showcase";
import { ExplorerTabs } from "@/components/systems/explorer-tabs";
import { analytics } from "./analytics";
import { PLATFORM_STORAGE_KEY, setPreferredPlatform } from "./platform-preference";

/**
 * `platform_selected` means the reader's platform actually changed: one real switch, one event.
 *
 * Radix Tabs 1.1.22 focuses the trigger inside its own mousedown handler, so a single click on a controlled
 * tablist calls `onValueChange` twice with the same value, both before React re-renders (focus activates the
 * tab, then mousedown activates it again). Every switcher compared against its rendered value, which is stale
 * for both calls, so each click was reported twice. These tests hold the rule for every switcher that emits
 * the event, whatever the primitive does: a repeated callback for a value that is already current is not a
 * second selection, and nothing real is lost.
 *
 * `repeat` injects that repeated callback without depending on the Radix version: two pointer-downs inside
 * one `act`, so the second runs before React re-renders, exactly like the focus-then-mousedown pair.
 */
const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
beforeEach(() => track.mockClear());
afterEach(() => window.history.replaceState(null, "", "/"));

const selections = () => track.mock.calls.filter(([e]) => e === "platform_selected").map(([, p]) => (p as { platform: string }).platform);
const repeat = (tab: HTMLElement) =>
  act(() => {
    fireEvent.mouseDown(tab);
    fireEvent.mouseDown(tab);
  });
const tab = (name: string) => screen.getByRole("tab", { name });

describe("setPreferredPlatform", () => {
  it("says whether the platform changed: a new value yes, the current value no, a return to an earlier value yes", () => {
    expect(setPreferredPlatform("swiftui")).toBe(true); // from the React default
    expect(setPreferredPlatform("swiftui")).toBe(false);
    expect(setPreferredPlatform("react")).toBe(true);
    expect(setPreferredPlatform("swiftui")).toBe(true);
    expect(window.localStorage.getItem(PLATFORM_STORAGE_KEY)).toBe("swiftui");
  });

  it("compares against what the page shows, including a ?platform= override", () => {
    window.history.replaceState(null, "", "/?platform=flutter");
    expect(setPreferredPlatform("flutter")).toBe(false);
    expect(setPreferredPlatform("compose")).toBe(true);
  });
});

describe("homepage flagship", () => {
  it("a click on another platform reports it exactly once", async () => {
    const user = userEvent.setup();
    render(<CrossPlatformFlagship />);
    await user.click(tab("SwiftUI"));
    expect(selections()).toEqual(["swiftui"]);
    expect(tab("SwiftUI")).toHaveAttribute("aria-selected", "true");
  });

  it("a repeated callback for the same value adds no second event", () => {
    render(<CrossPlatformFlagship />);
    repeat(tab("Flutter"));
    expect(selections()).toEqual(["flutter"]);
    expect(tab("Flutter")).toHaveAttribute("aria-selected", "true");
  });

  it("A → B → A reports each real switch", async () => {
    const user = userEvent.setup();
    render(<CrossPlatformFlagship />);
    await user.click(tab("SwiftUI"));
    await user.click(tab("Flutter"));
    await user.click(tab("SwiftUI"));
    expect(selections()).toEqual(["swiftui", "flutter", "swiftui"]);
  });

  it("a keyboard switch reports once", async () => {
    const user = userEvent.setup();
    render(<CrossPlatformFlagship />);
    tab("React").focus();
    await user.keyboard("{ArrowRight}");
    expect(selections()).toEqual(["swiftui"]);
    expect(tab("SwiftUI")).toHaveAttribute("aria-selected", "true");
  });

  it("opening on a remembered platform reports nothing", () => {
    window.localStorage.setItem(PLATFORM_STORAGE_KEY, "compose");
    render(<CrossPlatformFlagship />);
    expect(tab("Jetpack Compose")).toHaveAttribute("aria-selected", "true");
    expect(track).not.toHaveBeenCalled();
  });

  it("reports once under Strict Mode", async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <CrossPlatformFlagship />
      </StrictMode>,
    );
    expect(track).not.toHaveBeenCalled();
    await user.click(tab("Jetpack Compose"));
    expect(selections()).toEqual(["compose"]);
  });
});

describe("component page preview", () => {
  const openCode = async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("radio", { name: "code" }));

  it("a click reports one selection and one code view, and the choice is remembered", async () => {
    const user = userEvent.setup();
    render(<ComponentPreview name="button-demo" />);
    await openCode(user);
    track.mockClear();
    await user.click(tab("SwiftUI"));
    expect(track.mock.calls.map(([e]) => e)).toEqual(["platform_selected", "component_code_viewed"]);
    expect(window.localStorage.getItem(PLATFORM_STORAGE_KEY)).toBe("swiftui");
  });

  it("a repeated callback for the same value adds no second selection or code view", async () => {
    const user = userEvent.setup();
    render(<ComponentPreview name="button-demo" />);
    await openCode(user);
    track.mockClear();
    repeat(screen.getByRole("tab", { name: /^Flutter/ }));
    expect(track.mock.calls.map(([e]) => e)).toEqual(["platform_selected", "component_code_viewed"]);
  });

  it("A → B → A and a keyboard switch each report once", async () => {
    const user = userEvent.setup();
    render(<ComponentPreview name="button-demo" />);
    await openCode(user);
    await user.click(tab("SwiftUI"));
    await user.click(tab("React"));
    await user.click(tab("SwiftUI"));
    await user.keyboard("{ArrowRight}");
    expect(selections()).toEqual(["swiftui", "react", "swiftui", "compose"]);
  });
});

describe("blocks showcase", () => {
  const sources = { React: "const a = 1;", SwiftUI: "let a = 1", Flutter: "final a = 1;" };
  const showcase = () => (
    <Showcase title="Pricing tier" sources={sources} analyticsBlock="pricing-tier">
      <div>preview</div>
    </Showcase>
  );

  it("one click, one event; a repeated callback adds none; A → B → A reports each switch", async () => {
    const user = userEvent.setup();
    render(showcase());
    await user.click(screen.getByRole("radio", { name: "code" }));
    repeat(tab("SwiftUI"));
    expect(selections()).toEqual(["swiftui"]);
    await user.click(tab("Flutter"));
    await user.click(tab("SwiftUI"));
    expect(selections()).toEqual(["swiftui", "flutter", "swiftui"]);
  });
});

describe("homepage implementation explorer", () => {
  const panel = (label: string) => ({ label, maturity: "stable", distribution: "", verification: null, evidence: "", files: [] });
  const explorer = () => (
    <ExplorerTabs
      component="Button"
      tabs={[
        { tab: "react", platform: "React", label: "React", maturity: "stable" },
        { tab: "swift", platform: "SwiftUI", label: "SwiftUI", maturity: "stable" },
        { tab: "dart", platform: "Flutter", label: "Flutter", maturity: "stable" },
      ]}
      initial={<p>react panel</p>}
      later={{ swift: panel("SwiftUI"), dart: panel("Flutter") }}
      footer={null}
    />
  );

  it("one click, one event; a repeated callback adds none; keyboard and A → B → A report each switch", async () => {
    const user = userEvent.setup();
    render(explorer());
    expect(track).not.toHaveBeenCalled();
    repeat(tab("SwiftUI"));
    expect(selections()).toEqual(["swiftui"]);
    await user.keyboard("{ArrowRight}");
    await user.click(tab("SwiftUI"));
    expect(selections()).toEqual(["swiftui", "flutter", "swiftui"]);
  });
});
