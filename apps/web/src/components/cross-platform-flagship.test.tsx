import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrossPlatformFlagship } from "./cross-platform-flagship";
import { analytics, sanitizeProps } from "@/lib/analytics";
import { flagshipExampleSource } from "@/registry/flagship-example.generated";

const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
const expectSanitary = () => {
  for (const [, props] of track.mock.calls) expect(sanitizeProps(props as object)).toEqual(props ?? {});
};

beforeEach(() => track.mockClear());

describe("CrossPlatformFlagship", () => {
  it("renders the live preview and all four platform tabs", () => {
    render(<CrossPlatformFlagship />);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Synced")).toBeInTheDocument();
    for (const label of ["React", "SwiftUI", "Jetpack Compose", "Flutter"]) {
      expect(screen.getByRole("tab", { name: label })).toBeInTheDocument();
    }
  });

  it("fires nothing on render — the default React tab is not a selection", () => {
    render(<CrossPlatformFlagship />);
    expect(track).not.toHaveBeenCalled();
  });

  it("shows the real generated source for the selected platform, and switches it on tab change", async () => {
    const user = userEvent.setup();
    render(<CrossPlatformFlagship />);
    expect(screen.getByText(/@kinetixui\/ui/)).toBeInTheDocument(); // the React tab's real import

    await user.click(screen.getByRole("tab", { name: "Jetpack Compose" }));
    expect(screen.getByText(/KinetixCard/)).toBeInTheDocument();
    expect(screen.queryByText(/@kinetixui\/ui/)).not.toBeInTheDocument();
  });

  it("reports an explicit platform switch as platform_selected, once, with the known flagship component", async () => {
    const user = userEvent.setup();
    render(<CrossPlatformFlagship />);
    await user.click(screen.getByRole("tab", { name: "Jetpack Compose" }));
    expect(track.mock.calls).toEqual([
      ["platform_selected", { platform: "compose", component: "flagship-preferences", source: "homepage_flagship", location: "platform_tabs" }],
    ]);
    expectSanitary();
  });

  it("does not fire again when the already-selected platform is clicked", async () => {
    const user = userEvent.setup();
    render(<CrossPlatformFlagship />);
    await user.click(screen.getByRole("tab", { name: "React" }));
    expect(track).not.toHaveBeenCalled();
  });

  it("reports each real platform switch with the correct AnalyticsPlatform value", async () => {
    const user = userEvent.setup();
    render(<CrossPlatformFlagship />);
    await user.click(screen.getByRole("tab", { name: "SwiftUI" }));
    await user.click(screen.getByRole("tab", { name: "Flutter" }));
    expect(track.mock.calls.map((c) => (c[1] as { platform: string }).platform)).toEqual(["swiftui", "flutter"]);
  });

  // `flagship-preferences` is a composed recipe, not a components.manifest.json entry. `component_code_copied` is a
  // Developer Activation signal whose `component` property drives the "Top Components Copied" breakdown, so emitting
  // it here would both inflate activation and put a non-component in that list. The copy stays deliberately silent
  // rather than borrowing an event that means something else.
  it("copies the real source but emits NO analytics — never component_code_copied", async () => {
    const user = userEvent.setup();
    render(<CrossPlatformFlagship />);
    await user.click(screen.getAllByRole("button", { name: "Copy" })[0]!);
    await waitFor(async () => expect(await navigator.clipboard.readText()).toBe(flagshipExampleSource.react));
    expect(track).not.toHaveBeenCalled();
    expect(JSON.stringify(track.mock.calls)).not.toContain("component_code_copied");
  });

  it("copying after a platform switch copies that platform's source and adds no event beyond the switch", async () => {
    const user = userEvent.setup();
    render(<CrossPlatformFlagship />);
    await user.click(screen.getByRole("tab", { name: "Flutter" }));
    await user.click(screen.getAllByRole("button", { name: "Copy" })[0]!);
    await waitFor(async () => expect(await navigator.clipboard.readText()).toBe(flagshipExampleSource.flutter));
    expect(track.mock.calls.map((c) => c[0])).toEqual(["platform_selected"]);
    expect(JSON.stringify(track.mock.calls)).not.toContain("KinetixCard"); // no source text in analytics, ever
    expectSanitary();
  });

  it("links the derived platform-parity trust line to /docs/platforms", () => {
    render(<CrossPlatformFlagship />);
    const link = screen.getByRole("link", { name: /documented exceptions/ });
    expect(link).toHaveAttribute("href", "/docs/platforms");
  });

  it("shows a visible, non-colour-only verification label for every platform (no bare icon)", () => {
    const { container } = render(<CrossPlatformFlagship />);
    const text = container.textContent ?? "";
    for (const label of ["React", "SwiftUI", "Jetpack Compose", "Flutter"]) {
      expect(text).toContain(`${label} — `);
    }
  });

  it("every platform's displayed source is non-empty real code, not a placeholder", () => {
    for (const code of Object.values(flagshipExampleSource)) {
      expect(code.length).toBeGreaterThan(50);
      expect(code.toLowerCase()).toContain("kinetix");
    }
  });
});
