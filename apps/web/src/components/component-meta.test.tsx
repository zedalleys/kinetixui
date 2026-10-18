import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/docs/components/button" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

import { ComponentMeta } from "./component-meta";
import { analytics } from "@/lib/analytics";
import { PLATFORMS, PLATFORM_DEFINITIONS } from "@/lib/platform-parity";
import { platformStateFor } from "@/lib/platform-tabs";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const strip = () => screen.getByRole("list", { name: "Install by platform" });
const row = (platform: string) => strip().querySelector<HTMLElement>(`li[data-platform="${platform}"]`);

/**
 * The install strip answers "how do I get this on my platform?" on the component page itself (audit F-02), and
 * every line of it is derived from the manifest — so it can only be as true as the manifest.
 */
describe("ComponentMeta install strip", () => {
  it("lists every platform, each linking to its own setup page", () => {
    render(<ComponentMeta />);
    for (const p of PLATFORMS) {
      const label = PLATFORM_DEFINITIONS[p].label;
      expect(within(row(p)!).getByRole("link", { name: `${label} Setup →` })).toBeInTheDocument();
    }
  });

  it("gives an npm command only where the package is published, and says source-only everywhere else", () => {
    render(<ComponentMeta />);
    for (const p of PLATFORMS) {
      const d = PLATFORM_DEFINITIONS[p].distribution;
      const text = row(p)!.textContent ?? "";
      if (d.published) {
        expect(text).toContain(`npm i ${d.coordinate}`);
        expect(text).not.toMatch(/Source only/);
      } else {
        expect(text).toContain(`Source only, not on ${d.channel} yet`);
        expect(text).not.toMatch(/npm i|\.package\(url|implementation\("com\.kinetixui/);
      }
    }
    // the native ports really are unpublished today; if that changes, this test should be revisited, not the strip
    expect(PLATFORMS.filter((p) => !PLATFORM_DEFINITIONS[p].distribution.published)).toEqual(["SwiftUI", "Compose", "Flutter"]);
  });

  it("marks a preview platform as preview", () => {
    render(<ComponentMeta />);
    expect(row("Angular")!.textContent).toContain("· preview");
    expect(row("React")!.textContent).not.toContain("· preview");
  });

  it("says a planned platform has no implementation instead of offering an install", () => {
    nav.pathname = "/docs/components/data-table";
    expect(platformStateFor("data-table", "Angular")).toMatchObject({ type: "planned" });
    render(<ComponentMeta />);
    const angular = row("Angular")!;
    expect(angular.textContent).toMatch(/Not implemented yet · data display wave/);
    expect(angular.textContent).not.toContain("npm i");
    nav.pathname = "/docs/components/button";
  });

  it("copies the install commands with distinct names and reports only a package", async () => {
    const user = userEvent.setup();
    const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
    render(<ComponentMeta />);
    await user.click(screen.getByRole("button", { name: "Copy React CLI command" }));
    await user.click(screen.getByRole("button", { name: "Copy Angular npm command" }));
    expect(track.mock.calls).toEqual([
      ["cli_command_copied", { source: "component_page", package: "@kinetixui/cli" }],
      ["install_command_copied", { source: "component_page", package: "@kinetixui/angular", platform: "angular" }],
    ]);
    expect(JSON.stringify(track.mock.calls)).not.toContain("add button");
  });
});
