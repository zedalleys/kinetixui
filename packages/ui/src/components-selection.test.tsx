import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./components/checkbox";
import { KinetixDirectionProvider } from "./components/direction-provider";
import { RadioGroup, RadioGroupItem } from "./components/radio-group";
import { Switch } from "./components/switch";
import { Toggle } from "./components/toggle";
import { ToggleGroup, ToggleGroupItem } from "./components/toggle-group";

/**
 * components-selection.test.tsx — the selection-control family's state contract.
 *
 * Checkbox, RadioGroup, Switch, Toggle and ToggleGroup are five thin wrappers over five different Radix
 * primitives, and their prop vocabularies differ accordingly: `checked`, `value` and `pressed` are not an
 * inconsistency to be tidied away, they are the primitives saying three different true things. What they
 * DO share is a state contract — controlled stays controlled, uncontrolled keeps its own state, a change
 * handler fires once, and disabled means disabled — and nothing was asserting it.
 *
 * Geometry is not here. jsdom has no layout, so the large-text behaviour this slice fixed is measured in a
 * browser by `scripts/large-text.mjs`; what a unit test can hold is the class contract that makes the
 * measurement come out right, which is why the RTL passage below asserts the mirrored class rather than a
 * pixel offset.
 */

// kx-verify: interaction

describe("controlled and uncontrolled", () => {
  it("Checkbox: a controlled checkbox does not move on its own, and reports once", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox checked={false} onCheckedChange={onCheckedChange} aria-label="Subscribe" />);
    const box = screen.getByRole("checkbox", { name: "Subscribe" });

    await user.click(box);
    // The owner did not change `checked`, so the checkbox must still read false — a component that
    // tracked its own state as well would flip here and then fight the next render.
    expect(box).toHaveAttribute("aria-checked", "false");
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("Checkbox: an uncontrolled checkbox keeps its own state from defaultChecked", async () => {
    const user = userEvent.setup();
    render(<Checkbox defaultChecked aria-label="Subscribe" />);
    const box = screen.getByRole("checkbox", { name: "Subscribe" });
    expect(box).toHaveAttribute("aria-checked", "true");
    await user.click(box);
    expect(box).toHaveAttribute("aria-checked", "false");
  });

  it("Checkbox: indeterminate is a third state, not a styled false", () => {
    render(<Checkbox checked="indeterminate" aria-label="All" />);
    expect(screen.getByRole("checkbox", { name: "All" })).toHaveAttribute("aria-checked", "mixed");
  });

  it("Switch: controlled stays put and reports the requested value", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} aria-label="Airplane mode" />);
    const sw = screen.getByRole("switch", { name: "Airplane mode" });
    await user.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("Switch: an external update is reflected without an interaction", () => {
    const { rerender } = render(<Switch checked={false} aria-label="Airplane mode" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    rerender(<Switch checked aria-label="Airplane mode" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("RadioGroup: controlled selection does not move, and reports the value asked for", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RadioGroup value="free" onValueChange={onValueChange} aria-label="Plan">
        <RadioGroupItem value="free" aria-label="Free" />
        <RadioGroupItem value="pro" aria-label="Pro" />
      </RadioGroup>,
    );
    await user.click(screen.getByRole("radio", { name: "Pro" }));
    expect(screen.getByRole("radio", { name: "Free" })).toBeChecked();
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("pro");
  });

  it("ToggleGroup: uncontrolled multiple keeps a set, and reports the whole set", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ToggleGroup type="multiple" defaultValue={["bold"]} onValueChange={onValueChange} aria-label="Formatting">
        <ToggleGroupItem value="bold" aria-label="Bold" />
        <ToggleGroupItem value="italic" aria-label="Italic" />
      </ToggleGroup>,
    );
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Italic" }));
    expect(onValueChange).toHaveBeenCalledWith(["bold", "italic"]);
  });
});

describe("disabled", () => {
  it("every control in the family refuses pointer interaction when disabled", async () => {
    const user = userEvent.setup();
    const spies = { checkbox: vi.fn(), switch: vi.fn(), radio: vi.fn(), toggle: vi.fn() };
    render(
      <>
        <Checkbox disabled onCheckedChange={spies.checkbox} aria-label="Subscribe" />
        <Switch disabled onCheckedChange={spies.switch} aria-label="Airplane mode" />
        <RadioGroup disabled onValueChange={spies.radio} aria-label="Plan">
          <RadioGroupItem value="free" aria-label="Free" />
        </RadioGroup>
        <Toggle disabled onPressedChange={spies.toggle} aria-label="Bold" />
      </>,
    );

    for (const el of [
      screen.getByRole("checkbox", { name: "Subscribe" }),
      screen.getByRole("switch", { name: "Airplane mode" }),
      screen.getByRole("radio", { name: "Free" }),
      screen.getByRole("button", { name: "Bold" }),
    ]) {
      expect(el).toBeDisabled();
      await user.click(el).catch(() => {
        /* pointer-events: none on a disabled control is itself correct behaviour */
      });
    }
    for (const [name, spy] of Object.entries(spies)) {
      expect(spy, `${name} fired a change while disabled`).not.toHaveBeenCalled();
    }
  });
});

// kx-verify: interaction, rtl

/**
 * The Switch was the one control in the family whose movement depends on direction, and it was wrong.
 *
 * `translate-x` is physical. Under `dir="rtl"` the thumb starts against the right edge (correct — that is
 * the start) and then `data-[state=checked]:translate-x-6` moved it further right: measured in Chromium,
 * the thumb's left edge went from 26px to 50px on a 48px track, so a switch turned on in an RTL locale
 * rendered as a filled pill with no thumb visible in it at all.
 *
 * The first fix flipped the translate with Tailwind's `rtl:`, which matches ANY rtl ancestor — so a switch
 * in an LTR section of an RTL page was flipped as well, and its thumb landed 22px outside the track. The
 * travel is now `inset-inline-start`, a logical offset the browser resolves against the switch's own
 * direction.
 *
 * jsdom cannot see that, so what is held here is the class that makes the geometry right. The geometry
 * itself — all four page/subtree direction pairs, checked and unchecked — is measured in Chromium by
 * check:selection-visual; this is what fails first if the logical offset is dropped.
 */
describe("Switch under RTL", () => {
  const thumbOf = (container: HTMLElement) =>
    container.querySelector("[role=switch] > span") ?? container.querySelector("[role=switch] > *");

  it("mirrors the thumb's travel instead of pushing it off the track", () => {
    const { container } = render(
      <KinetixDirectionProvider dir="rtl">
        <Switch checked aria-label="Airplane mode" />
      </KinetixDirectionProvider>,
    );
    const cls = thumbOf(container)?.getAttribute("class") ?? "";
    // The travel is a logical offset, so the browser mirrors it against the switch's OWN direction — no
    // ancestor selector decides it. A physical translate flipped by `rtl:` matched any rtl ancestor and pushed
    // the thumb off the track in an LTR section of an RTL page (check:selection-visual, "direction").
    expect(cls, "the thumb must travel along the inline axis").toContain("data-[state=checked]:start-6");
    expect(cls).toContain("relative");
    expect(cls, "no physical travel that rtl: would have to flip").not.toMatch(/translate-x|rtl:/);
  });

  it("still toggles from the keyboard under RTL", async () => {
    const user = userEvent.setup();
    render(
      <KinetixDirectionProvider dir="rtl">
        <Switch aria-label="Airplane mode" />
      </KinetixDirectionProvider>,
    );
    const sw = screen.getByRole("switch", { name: "Airplane mode" });
    await user.tab();
    expect(sw).toHaveFocus();
    await user.keyboard(" ");
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("RadioGroup arrow keys follow reading order under RTL", async () => {
    const user = userEvent.setup();
    render(
      <KinetixDirectionProvider dir="rtl">
        <RadioGroup aria-label="Plan">
          <RadioGroupItem value="free" aria-label="Free" />
          <RadioGroupItem value="pro" aria-label="Pro" />
        </RadioGroup>
      </KinetixDirectionProvider>,
    );
    await user.tab();
    expect(screen.getByRole("radio", { name: "Free" })).toHaveFocus();
    // In RTL the next item is to the LEFT, so ArrowLeft advances.
    await user.keyboard("{ArrowLeft>}");
    await user.keyboard("{/ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Pro" })).toHaveFocus();
  });
});
