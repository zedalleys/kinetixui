import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/docs/components/button" }));
import { ComponentPreview } from "./component-preview";
import { ComponentMeta } from "./component-meta";
import { analytics } from "@/lib/analytics";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("component onboarding", () => {
  it("connects the component CLI to full setup and distinguishes npm imports", () => {
    render(<ComponentMeta />);
    expect(screen.getByRole("link", { name: "Installation and first component →" })).toHaveAttribute("href", "/docs/installation");
    expect(screen.getByText(/Usage imports from @kinetixui\/ui require the npm package/)).toBeInTheDocument();
  });

  it("links each implemented platform to its setup and preserves copy and selection events", async () => {
    const user = userEvent.setup();
    const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
    render(<ComponentPreview name="button-demo" />);
    await user.click(screen.getByRole("tab", { name: "code" }));
    const platforms = [
      ["React", "/docs/installation", "react"],
      ["Angular", "/docs/angular", "angular"],
      ["SwiftUI", "/docs/swiftui", "swiftui"],
      ["Jetpack Compose", "/docs/compose", "compose"],
      ["Flutter", "/docs/flutter", "flutter"],
    ];
    for (const [label, href, platform] of platforms) {
      await user.click(screen.getByRole("tab", { name: new RegExp(`^${label}`) }));
      const panel = screen.getAllByRole("tabpanel").find(el => el.querySelector(`a[href="${href}"]`))!;
      expect(within(panel).getByRole("link", { name: `${label} installation and setup` })).toHaveAttribute("href", href);
      expect(within(panel).getByText(/the live preview uses React/)).toBeInTheDocument();
      if (label === "Angular") expect(screen.getByRole("tab", { name: /Angular.*preview/ })).toBeInTheDocument();
      if (platform !== "react") {
        expect(track).toHaveBeenCalledWith("platform_selected", {
          platform, component: "button", source: "component_page", location: "platform_tabs",
        });
      }
      track.mockClear();
      await user.click(within(panel).getByRole("button", { name: "Copy" }));
      expect(track).toHaveBeenCalledWith("component_code_copied", { component: "button", platform, source: "component_page" });
    }
    expect(track).toHaveBeenCalledTimes(1);
  });
});
