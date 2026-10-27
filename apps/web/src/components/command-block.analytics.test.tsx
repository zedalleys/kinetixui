import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/docs/installation" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

import { CommandBlock } from "./command-block";
import { analytics } from "@/lib/analytics";
import { classifyCommand, trackFenceCopy } from "@/lib/analytics-surfaces";
import { PACKAGE_MANAGERS, renderCommand } from "@/lib/pm-commands";
import { PACKAGES } from "@/lib/packages";
import { resetPackageManagerPreferenceForTests } from "@/lib/pm-preference";

/*
 * Emission across the fence migration.
 *
 * `CommandBlock` replaces the hand-typed ```bash fence on roughly 140 docs pages. The two command events are
 * classified from TEXT PLUS LANGUAGE — `classifyCommand` returns null for anything whose language is not in
 * SHELL_LANGUAGES — and a fence carried its language in its own syntax while a React element has to pass one
 * deliberately. So a migration that merely rendered the right command, and forgot that argument, would end
 * `install_command_copied` and `cli_command_copied` everywhere at once and change nothing a reader could see.
 *
 * That is not hypothetical arithmetic: both events last fired on 2026-10-09, and losing them here would make
 * the question of why permanently unanswerable. This file is the gate on that, and the controls below exist
 * so it cannot pass while the wiring is broken.
 *
 * It asserts the EXISTING contract and introduces nothing: the event names, their properties and Qualified
 * Evaluation semantics are `analytics.ts` and `analytics-measurement.ts`'s to define, not this file's.
 */

const SOURCE = readFileSync(join(__dirname, "command-block.tsx"), "utf8");
const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
beforeEach(() => {
  track.mockClear();
  nav.pathname = "/docs/installation";
  // the manager preference is module-level and site-wide by design, so a tab click below would otherwise
  // decide which command the NEXT test copies
  resetPackageManagerPreferenceForTests();
  window.localStorage.clear();
});

afterEach(() => resetPackageManagerPreferenceForTests());

/** Click the one visible copy button. Radix unmounts the inactive tabs, so there is only ever one. */
const copy = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /copy/i }));
};

describe("CommandBlock analytics", () => {
  it("fires nothing on render — showing a command is not copying one", () => {
    render(<CommandBlock op="install-react" />);
    expect(track).not.toHaveBeenCalled();
  });

  it("reports an install copy as the package and platform, never the typed command", async () => {
    render(<CommandBlock op="install-react" />);
    await copy();

    const call = track.mock.calls.find(([name]) => name === "install_command_copied");
    expect(call, "copying an install command should report it").toBeTruthy();
    expect(call![1]).toEqual({ source: "installation_page", package: PACKAGES.ui, platform: "react" });
  });

  it("reports a CLI copy as the CLI package", async () => {
    render(<CommandBlock op="cli-add" components={["button"]} />);
    await copy();

    const call = track.mock.calls.find(([name]) => name === "cli_command_copied");
    expect(call, "copying a CLI command should report it").toBeTruthy();
    expect(call![1]).toEqual({ source: "installation_page", package: PACKAGES.cli });
  });

  /*
   * The point of the migration is that the reader picks a manager. If only npm's spelling classified, the
   * events would survive the rewrite and then quietly under-report every reader who is not on npm — which
   * reads as a drop in adoption rather than as a defect.
   */
  it.each(PACKAGE_MANAGERS)("classifies the install command %s renders", (pm) => {
    const text = renderCommand("install-react", pm, {}).command;
    expect(track).not.toHaveBeenCalled();
    trackFenceCopy(text, "bash", "/docs/installation");
    expect(track.mock.calls.map(([name]) => name), `${pm}: ${text}`).toContain("install_command_copied");
    track.mockClear();
  });

  it.each(PACKAGE_MANAGERS)("classifies the CLI command %s renders", (pm) => {
    const text = renderCommand("cli-add", pm, { components: ["button"] }).command;
    trackFenceCopy(text, "bash", "/docs/installation");
    expect(track.mock.calls.map(([name]) => name), `${pm}: ${text}`).toContain("cli_command_copied");
    track.mockClear();
  });

  /* ---------------------------------------------------------------- negative controls */

  /*
   * Each control breaks one part of the wiring and asserts the break is visible here. A gate that only ever
   * sees the working case cannot tell "the events fire" from "the assertions are vacuous".
   */
  describe("negative controls", () => {
    it("CONTROL: the language is load-bearing — the same text without one reports nothing", () => {
      const text = renderCommand("install-react", "npm", {}).command;
      trackFenceCopy(text, undefined, "/docs/installation");
      expect(track, "a command with no language must not classify").not.toHaveBeenCalled();
    });

    it("CONTROL: a non-shell language reports nothing, however command-like the text", () => {
      const text = renderCommand("cli-add", "npm", { components: ["button"] }).command;
      trackFenceCopy(text, "tsx", "/docs/installation");
      expect(track.mock.calls.map(([name]) => name)).not.toContain("cli_command_copied");
    });

    /*
     * The two controls above exercise `trackFenceCopy` directly, so they would still pass if the component
     * stopped calling it at all — the exact regression this file exists to catch. This one reads the source:
     * the copy handler must pass a SHELL_LANGUAGES member, and deleting the argument or the call fails here.
     */
    it("CONTROL: the component passes a shell language to trackFenceCopy on copy", () => {
      expect(SOURCE).toMatch(/onCopy=\{\(\)\s*=>\s*trackFenceCopy\(/);
      const call = SOURCE.match(/trackFenceCopy\(([^)]*)\)/)!;
      const language = call[1].split(",")[1]?.trim().replace(/^["']|["']$/g, "");
      // Asked of the classifier rather than compared against a copied list: SHELL_LANGUAGES is private to
      // `analytics-surfaces`, and a list restated here would pass while the real set moved underneath it.
      expect(
        classifyCommand(renderCommand("install-react", "npm").command, language),
        `the component passes language ${JSON.stringify(language)}, which the classifier rejects`,
      ).not.toBeNull();
    });
  });

  /*
   * Everything above clicks the default npm tab, or calls `trackFenceCopy` directly with text the other
   * managers render. Neither shows the COMPONENT still reporting once the reader switches tab — and
   * switching tab is the whole point of the migration. These click it.
   */
  describe("through the component, on the tab the reader actually chose", () => {
    it.each(["pnpm", "Yarn", "Bun"])("reports an install copy from the %s tab", async (label) => {
      const user = userEvent.setup();
      render(<CommandBlock op="install-react" />);
      await user.click(screen.getByRole("tab", { name: label }));
      await user.click(screen.getByRole("button", { name: /copy/i }));

      const call = track.mock.calls.find(([name]) => name === "install_command_copied");
      expect(call, `${label} install copy should report`).toBeTruthy();
      expect(call![1]).toEqual({ source: "installation_page", package: PACKAGES.ui, platform: "react" });
    });

    it.each(["pnpm", "Yarn", "Bun"])("reports a CLI copy from the %s tab", async (label) => {
      const user = userEvent.setup();
      render(<CommandBlock op="cli-add" components={["button"]} />);
      await user.click(screen.getByRole("tab", { name: label }));
      await user.click(screen.getByRole("button", { name: /copy/i }));

      const call = track.mock.calls.find(([name]) => name === "cli_command_copied");
      expect(call, `${label} CLI copy should report`).toBeTruthy();
      expect(call![1]).toEqual({ source: "installation_page", package: PACKAGES.cli });
    });
  });
});
