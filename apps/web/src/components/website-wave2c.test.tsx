import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartsContent } from "@/app/charts/charts-content";
import { ColorsContent } from "@/app/docs/colors/colors-content";
import { demoRegistry } from "@/registry/demos";
import { BuildingOpsDemo } from "./building-ops/building-ops-demo";
import { CreateWorkspace } from "./create/create-workspace";
import { DeviceShowcase } from "./iot/device-showcase";
import { HeroCommandStrip } from "./iot/lab/hero-command-strip";
import { PendingCommand } from "./iot/showcase/pending-command";

/**
 * Wave 2c — site actions and fields moved onto KinetixUI. Each block pins what a migration had to keep (names,
 * handlers, state) and what the library component now guarantees (roles, one tab stop, type="button"). Layout,
 * RTL, theme and 200% text are measured in Chromium by `scripts/web-dogfooding-wave2c.mjs`.
 */
afterEach(() => vi.useRealTimers());

describe("charts: series legend is library Toggles", () => {
  it("each series is a pressed toggle that hides and restores its bars", async () => {
    const user = userEvent.setup();
    render(<ChartsContent />);
    const group = screen.getByRole("group", { name: "Toggle series" });
    const toggles = within(group).getAllByRole("button");
    expect(toggles.map((t) => t.textContent)).toEqual(["Desktop", "Mobile"]);
    for (const t of toggles) {
      expect(t).toHaveAttribute("type", "button");
      expect(t).toHaveAttribute("aria-pressed", "true");
    }
    await user.click(toggles[0]);
    expect(toggles[0]).toHaveAttribute("aria-pressed", "false");
    // off is said by more than colour: the label is struck through
    expect(toggles[0].className).toMatch(/line-through/);
    toggles[1].focus();
    await user.keyboard(" ");
    expect(toggles[1]).toHaveAttribute("aria-pressed", "false");
    await user.keyboard("{Enter}");
    expect(toggles[1]).toHaveAttribute("aria-pressed", "true");
  });
});

// Rendering the whole colors page (8 ramps of swatches) in jsdom takes ~2s alone and passed 5s under a loaded full run.
describe("colors: value format, copy ramp and swatch cards", { timeout: 20_000 }, () => {
  /** A swatch button, found by the visible text its name is built from ("Copy azure 50 AA …"). */
  const swatch = (ramp: string, step: string) =>
    screen.getAllByRole("button").find((b) => new RegExp(`^Copy ${ramp} ${step}(?!\\d)`).test(b.textContent ?? ""))!;
  it("format is a single-choice radiogroup that rewrites every swatch value", async () => {
    const user = userEvent.setup();
    render(<ColorsContent />);
    const group = screen.getByRole("radiogroup", { name: "Value format" });
    expect(within(group).getAllByRole("radio").map((r) => r.textContent)).toEqual(["hex", "hsl", "rgb"]);
    expect(within(group).getByRole("radio", { name: "hex" })).toHaveAttribute("aria-checked", "true");
    await user.click(within(group).getByRole("radio", { name: "rgb" }));
    expect(within(group).getByRole("radio", { name: "rgb" })).toHaveAttribute("aria-checked", "true");
    expect(swatch("azure", "50")).toHaveTextContent(/rgb\(/);
    // a chosen format cannot be un-chosen
    await user.click(within(group).getByRole("radio", { name: "rgb" }));
    expect(within(group).getByRole("radio", { name: "rgb" })).toHaveAttribute("aria-checked", "true");
  });

  it("copies a ramp and a swatch; both are real buttons, the swatch keeps its visible-text name", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<ColorsContent />);
    const copyRamp = screen.getAllByRole("button", { name: "Copy ramp as CSS" })[0];
    expect(copyRamp).toHaveAttribute("type", "button");
    fireEvent.click(copyRamp);
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/--azure-50: #eff6ff/));

    const tile = swatch("azure", "50");
    expect(tile).toHaveAttribute("type", "button");
    // the library Card is the button itself, not a wrapper around one
    expect(tile.className).toMatch(/bg-card/);
    expect(tile).toHaveTextContent("#eff6ff");
    fireEvent.click(tile);
    expect(writeText).toHaveBeenLastCalledWith("#eff6ff");
  });
});

describe("create: appearance and scene modes, contrast disclosure, hex fields", () => {
  const sidebar = () => screen.getByRole("complementary", { name: "Configuration" });

  it("appearance and scene are single-choice radiogroups with one tab stop", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);
    const appearance = within(sidebar()).getByRole("radiogroup", { name: "Preview appearance" });
    expect(within(appearance).getByRole("radio", { name: "Light" })).toHaveAttribute("aria-checked", "true");
    within(appearance).getByRole("radio", { name: "Light" }).focus();
    await user.keyboard("{ArrowRight}");
    const dark = within(appearance).getByRole("radio", { name: "Dark" });
    expect(dark).toHaveFocus();
    await user.keyboard(" ");
    expect(dark).toHaveAttribute("aria-checked", "true");
    expect(document.querySelector("[data-create-preview-root]")!.className).toMatch(/\bdark\b/);

    const scene = screen.getByRole("radiogroup", { name: "Preview scene" });
    await user.click(within(scene).getByRole("radio", { name: "Form" }));
    expect(within(scene).getByRole("radio", { name: "Form" })).toHaveAttribute("aria-checked", "true");
    expect(within(scene).getByRole("radio", { name: "Dashboard" })).toHaveAttribute("aria-checked", "false");
  });

  it("all contrast pairs sit behind a library Collapsible with aria-expanded", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);
    const trigger = within(sidebar()).getByRole("button", { name: "Show all pairs" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("type", "button");
    await user.click(trigger);
    const open = within(sidebar()).getByRole("button", { name: "Hide all pairs" });
    expect(open).toHaveAttribute("aria-expanded", "true");
    const region = document.getElementById(open.getAttribute("aria-controls")!)!;
    expect(region).toHaveAttribute("data-state", "open");
    expect(within(region).getAllByText("Pass").length).toBeGreaterThan(0);
  });

  it("the hex field is the library Input and flags an invalid value with aria-invalid", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);
    const hex = within(sidebar()).getByLabelText("Hex");
    expect(hex).toHaveAttribute("data-slot", "input");
    await user.clear(hex);
    await user.type(hex, "#zz");
    expect(hex).toHaveAttribute("aria-invalid", "true");
  });
});

describe("building ops: zone toggle, clear zone, camera cards", () => {
  const renderDemo = () => render(<BuildingOpsDemo syncUrl={false} clock={{ initiallyPaused: true }} />);

  it("a zone name is a pressed toggle that filters cameras, and pressing again clears it", () => {
    renderDemo();
    const zone = document.querySelector<HTMLElement>("[data-zone-row] th button")!;
    expect(zone).toHaveAttribute("type", "button");
    expect(zone).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(zone);
    expect(zone).toHaveAttribute("aria-pressed", "true");
    const clear = screen.getByRole("button", { name: /clear zone filter/i });
    expect(clear).toHaveAttribute("type", "button");
    fireEvent.click(zone);
    expect(zone).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: /clear zone filter/i })).toBeNull();
  });

  it("a camera row is the library Card as a toggle button; the selected one is pressed", () => {
    renderDemo();
    const rows = [...document.querySelectorAll<HTMLButtonElement>("[data-camera-row]")];
    expect(rows.length).toBeGreaterThan(1);
    for (const r of rows) {
      expect(r.tagName).toBe("BUTTON");
      expect(r).toHaveAttribute("type", "button");
      expect(r.className).toMatch(/bg-card/);
    }
    const other = rows.find((r) => r.getAttribute("aria-pressed") === "false")!;
    fireEvent.click(other);
    expect(other).toHaveAttribute("aria-pressed", "true");
    expect(rows.filter((r) => r.getAttribute("aria-pressed") === "true")).toHaveLength(1);
  });
});

describe("IoT: checkboxes and pending-command actions", () => {
  it("the device-showcase options are library checkboxes named by their label", async () => {
    const user = userEvent.setup();
    render(<DeviceShowcase />);
    const battery = screen.getByRole("checkbox", { name: "Device reports no battery" });
    const signal = screen.getByRole("checkbox", { name: "Device reports no signal" });
    expect(battery).toHaveAttribute("aria-checked", "false");
    expect(signal).toHaveAttribute("aria-checked", "false");
    await user.click(screen.getByText("Device reports no battery"));
    expect(battery).toHaveAttribute("aria-checked", "true");
    // the battery Slider says so on its thumb, the element with role=slider
    expect(screen.getByRole("slider", { name: /^Battery/ })).toHaveAttribute("aria-disabled", "true");
    signal.focus();
    await user.keyboard(" ");
    expect(signal).toHaveAttribute("aria-checked", "true");
  });

  it("the hero 'stop answering' option is a library checkbox with its description in the name", async () => {
    const user = userEvent.setup();
    render(<HeroCommandStrip />);
    const box = screen.getByRole("checkbox", { name: /^Make the device stop answering/ });
    expect(box).toHaveAttribute("aria-checked", "false");
    box.focus();
    await user.keyboard(" ");
    expect(box).toHaveAttribute("aria-checked", "true");
  });

  it("Retry and Cancel are library buttons that keep their names and handlers", () => {
    const retry = vi.fn();
    const cancel = vi.fn();
    const NOW = "2026-10-13T12:00:10.000Z";
    render(
      <PendingCommand
        lifecycle={{ confirmedValue: "locked", requestedValue: "unlocked", stage: "failed", attempts: 1, maxAttempts: 3, sentAt: NOW, settledAt: NOW }}
        formatValue={String}
        now={NOW}
        subject="Front door lock"
        onRetry={retry}
        onCancel={cancel}
      />,
    );
    const r = screen.getByRole("button", { name: /^Retry Front door lock/ });
    const d = screen.getByRole("button", { name: "Dismiss the Front door lock failure" });
    for (const b of [r, d]) expect(b).toHaveAttribute("type", "button");
    act(() => r.click());
    act(() => d.click());
    expect(retry).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
  });
});

describe("registry demos match their published snippets", () => {
  it.each([
    ["navigation-bar-demo", "Search"],
    ["app-bar-demo", "Notifications"],
  ])("%s renders its icon action as a library Ghost icon Button", async (name, label) => {
    const entry = demoRegistry[name];
    expect(entry.source).toContain('<Button variant="Ghost" size="icon">');
    const Demo = entry.component;
    const { container } = render(<Demo />);
    const button = screen.getByRole("button", { name: label });
    expect(button).toHaveAttribute("type", "button");
    const result = await axe.run(container, { rules: { region: { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});

describe("no axe violations in the migrated controls", () => {
  it("in the colors format group and the create sidebar", async () => {
    const { container, unmount } = render(<ColorsContent />);
    const group = container.querySelector('[role="radiogroup"]')!;
    expect((await axe.run(group)).violations.map((v) => v.id)).toEqual([]);
    unmount();
    render(<CreateWorkspace />);
    const side = screen.getByRole("complementary", { name: "Configuration" });
    await waitFor(() => expect(side).toBeInTheDocument());
    const result = await axe.run(side, { rules: { region: { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
