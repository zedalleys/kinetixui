import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { DeviceShowcase } from "./device-showcase";

/**
 * Wave 2e — the device showcase's ranges. Last sync and temperature are the library `Slider` (Radix): the thumb is
 * the `role="slider"` element, named by the visible label through `aria-labelledby`, with the native range's min,
 * max and step. Battery and signal stay native ranges, a documented exception: each is disabled while the device
 * reports no value, which the library Slider cannot announce or show yet (see the audit, "Wave 2e").
 */
const slider = (name: RegExp) => screen.getByRole("slider", { name });
const lastSync = () => slider(/^Last sync — /);
const temperature = () => slider(/^Temperature — /);

afterEach(() => document.documentElement.removeAttribute("dir"));

describe("Last sync and temperature on the library Slider", () => {
  it("name each thumb by its visible label, with the native range's bounds and value", () => {
    render(<DeviceShowcase />);
    expect(lastSync()).toHaveAccessibleName("Last sync — 5m");
    expect(lastSync()).toHaveAttribute("aria-valuemin", "0");
    expect(lastSync()).toHaveAttribute("aria-valuemax", "5");
    expect(lastSync()).toHaveAttribute("aria-valuenow", "1");
    expect(temperature()).toHaveAccessibleName("Temperature — 23.4 °C");
    expect(temperature()).toHaveAttribute("aria-valuemin", "-10");
    expect(temperature()).toHaveAttribute("aria-valuemax", "45");
    expect(temperature()).toHaveAttribute("aria-valuenow", "23.4");
    for (const s of [lastSync(), temperature()]) expect(s).toHaveAttribute("tabindex", "0");
  });

  it("move by step with the arrow keys, and to the ends with Home and End", async () => {
    const user = userEvent.setup();
    render(<DeviceShowcase />);
    lastSync().focus();
    await user.keyboard("{ArrowRight}");
    expect(lastSync()).toHaveAccessibleName("Last sync — 90m");
    expect(lastSync()).toHaveAttribute("aria-valuenow", "2");
    await user.keyboard("{End}");
    expect(lastSync()).toHaveAccessibleName("Last sync — never");
    await user.keyboard("{Home}");
    expect(lastSync()).toHaveAccessibleName("Last sync — now");
    // the step is the native range's 0.1, without floating-point drift in the value or the label
    temperature().focus();
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(temperature()).toHaveAttribute("aria-valuenow", "23.7");
    expect(temperature()).toHaveAccessibleName("Temperature — 23.7 °C");
    await user.keyboard("{ArrowDown}");
    expect(temperature()).toHaveAttribute("aria-valuenow", "23.6");
    await user.keyboard("{End}");
    expect(temperature()).toHaveAccessibleName("Temperature — 45.0 °C");
    await user.keyboard("{Home}");
    expect(temperature()).toHaveAccessibleName("Temperature — -10.0 °C");
  });

  it("drive the preview: never-reported last sync and the reading follow the sliders", async () => {
    const user = userEvent.setup();
    render(<DeviceShowcase />);
    lastSync().focus();
    await user.keyboard("{End}");
    expect(document.body.textContent).toMatch(/never/i);
    temperature().focus();
    await user.keyboard("{Home}");
    expect(document.body.textContent).toMatch(/-10\.0/);
  });

  it("follow the page direction: under RTL ArrowLeft increases, as the library contract says", async () => {
    document.documentElement.setAttribute("dir", "rtl");
    const user = userEvent.setup();
    render(<DeviceShowcase />);
    expect(lastSync().closest('[dir]')).toHaveAttribute("dir", "rtl");
    lastSync().focus();
    await user.keyboard("{ArrowLeft}");
    expect(lastSync()).toHaveAttribute("aria-valuenow", "2");
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(lastSync()).toHaveAttribute("aria-valuenow", "0");
  });
});

describe("battery and signal stay native ranges (documented exception)", () => {
  it("keep their native disabled semantics while the device reports no value", async () => {
    const user = userEvent.setup();
    render(<DeviceShowcase />);
    const battery = document.getElementById("iot-demo-battery") as HTMLInputElement;
    expect(battery.type).toBe("range");
    expect(screen.getByRole("slider", { name: "Battery — 72%" })).toBe(battery);
    await user.click(screen.getByRole("checkbox", { name: "Device reports no battery" }));
    expect(battery).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Battery — not reported" })).toBe(battery);
    expect((document.getElementById("iot-demo-signal") as HTMLInputElement).type).toBe("range");
  });
});

it("has no axe violations", async () => {
  const { container } = render(<DeviceShowcase />);
  const result = await axe.run(container, { rules: { region: { enabled: false } } });
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
