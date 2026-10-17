import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { DeviceShowcase } from "./device-showcase";

/**
 * Wave 2e — the device showcase's four ranges, all the library `Slider` (Radix): the thumb is the `role="slider"`
 * element, named by the visible label through `aria-labelledby`, with the native range's min, max and step. Battery
 * and signal are disabled while the device reports no value, which the Slider now says on its thumb.
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

describe("battery and signal on the library Slider, disabled while the device reports no value", () => {
  it("say so on the thumb, the element a screen reader reads, and come back when the value returns", async () => {
    const user = userEvent.setup();
    render(<DeviceShowcase />);
    expect(document.querySelector('input[type="range"]')).toBeNull();
    const battery = () => slider(/^Battery — /);
    expect(battery()).toHaveAccessibleName("Battery — 72%");
    expect(battery()).toHaveAttribute("aria-valuetext", "72%");
    expect(battery()).not.toHaveAttribute("aria-disabled");

    await user.click(screen.getByRole("checkbox", { name: "Device reports no battery" }));
    expect(battery()).toHaveAccessibleName("Battery — not reported");
    expect(battery()).toHaveAttribute("aria-disabled", "true");
    expect(battery()).not.toHaveAttribute("tabindex", "0");

    await user.click(screen.getByRole("checkbox", { name: "Device reports no battery" }));
    expect(battery()).not.toHaveAttribute("aria-disabled");

    const signal = () => slider(/^Signal — /);
    await user.click(screen.getByRole("checkbox", { name: "Device reports no signal" }));
    expect(signal()).toHaveAccessibleName("Signal — not reported");
    expect(signal()).toHaveAttribute("aria-disabled", "true");
  });

  it("ignore the keyboard while disabled", async () => {
    const user = userEvent.setup();
    render(<DeviceShowcase />);
    const before = slider(/^Signal — /).getAttribute("aria-valuenow");
    await user.click(screen.getByRole("checkbox", { name: "Device reports no signal" }));
    slider(/^Signal — /).focus();
    await user.keyboard("{ArrowRight}{End}");
    expect(slider(/^Signal — /)).toHaveAttribute("aria-valuenow", before);
    await user.click(screen.getByRole("checkbox", { name: "Device reports no signal" }));
    expect(slider(/^Signal — /)).toHaveAccessibleName(`Signal — ${before}`);
  });
});

describe("Last sync speaks its stop, not its index", () => {
  it("reads 90 minutes ago where the label shows 90m", async () => {
    const user = userEvent.setup();
    render(<DeviceShowcase />);
    expect(lastSync()).toHaveAttribute("aria-valuetext", "5 minutes ago");
    lastSync().focus();
    await user.keyboard("{ArrowRight}");
    expect(lastSync()).toHaveAttribute("aria-valuetext", "90 minutes ago");
    await user.keyboard("{End}");
    expect(lastSync()).toHaveAttribute("aria-valuetext", "never reported");
  });
});

it("has no axe violations", async () => {
  const { container } = render(<DeviceShowcase />);
  const result = await axe.run(container, { rules: { region: { enabled: false } } });
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
