import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { DEMO_DEVICES } from "./demo-fleet";
import { DeviceDashboardExample } from "./device-dashboard";

/**
 * The device-group selector filters the device list below it in place. It used to be `role="tablist"` with
 * `role="tab"` buttons and no tab panels — tab semantics for something that is not tabs: a screen reader announced
 * "tab 2 of 4" and the reader looked for a panel that did not exist. It is the library ToggleGroup now, a
 * single-choice filter: a named radiogroup, one tab stop, arrow keys between groups, Space or Enter to choose.
 */
const devicesShown = () =>
  within(screen.getByRole("region", { name: "Devices" })).getAllByRole("button", { name: /^Show details for/ }).length;
const inGroup = (group: string) => DEMO_DEVICES.filter((d) => d.locationName === group).length;

describe("DeviceDashboardExample group filter", () => {
  it("is a named single-choice filter with no orphaned tab roles", () => {
    const { container } = render(<DeviceDashboardExample />);
    expect(container.querySelector('[role="tablist"], [role="tab"]')).toBeNull();
    const group = screen.getByRole("radiogroup", { name: "Device group" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.textContent)).toEqual(["All", "Cold store A", "Plant room", "Bay 2"]);
    expect(within(group).getByRole("radio", { name: "All" })).toHaveAttribute("aria-checked", "true");
    expect(devicesShown()).toBe(DEMO_DEVICES.length);
  });

  it("is one tab stop; arrows move between groups and Space filters the list in place", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">before</button>
        <DeviceDashboardExample />
      </>,
    );
    screen.getByRole("button", { name: "before" }).focus();
    await user.tab();
    const group = screen.getByRole("radiogroup", { name: "Device group" });
    expect(within(group).getByRole("radio", { name: "All" })).toHaveFocus();

    await user.keyboard("{ArrowRight}{ArrowRight}");
    const plant = within(group).getByRole("radio", { name: "Plant room" });
    expect(plant).toHaveFocus();
    expect(devicesShown()).toBe(DEMO_DEVICES.length); // moving focus does not filter

    await user.keyboard(" ");
    expect(plant).toHaveAttribute("aria-checked", "true");
    expect(within(group).getByRole("radio", { name: "All" })).toHaveAttribute("aria-checked", "false");
    expect(devicesShown()).toBe(inGroup("Plant room"));

    // Tab leaves the group instead of walking through its other items.
    await user.tab();
    expect(group.contains(document.activeElement)).toBe(false);
  });

  it("filters by pointer too, and a chosen group cannot be un-chosen into an empty filter", async () => {
    const user = userEvent.setup();
    render(<DeviceDashboardExample />);
    const group = screen.getByRole("radiogroup", { name: "Device group" });
    const bay = within(group).getByRole("radio", { name: "Bay 2" });
    await user.click(bay);
    expect(devicesShown()).toBe(inGroup("Bay 2"));
    await user.click(bay);
    expect(bay).toHaveAttribute("aria-checked", "true");
    expect(devicesShown()).toBe(inGroup("Bay 2"));
  });

  it("has no axe violations in the filter", async () => {
    const { container } = render(<DeviceDashboardExample />);
    const group = container.querySelector('[role="radiogroup"]')!;
    const result = await axe.run(group, { rules: { region: { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
