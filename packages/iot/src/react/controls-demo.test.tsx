import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LevelInteractive, ModeInteractive, SetpointInteractive } from "./Controls.stories";

/**
 * The demo stories have to *do* something.
 *
 * This file exists because of a specific failure, and it was not a failure of the components. The controls
 * animated correctly the whole time; the stories demonstrating them passed constant props and no handlers, so
 * every state in the sidebar was a still photograph and a reader looking for the motion found none. Nothing in
 * the suite objected, because nothing in the suite was looking at the demos.
 *
 * So these drive each interactive story the way a reader does and assert the state actually moves — and moves
 * honestly, which is the harder half: a request must not be shown as a confirmation. A story quietly reverted
 * to fixed props fails here rather than shipping as a static picture of a dynamic idea.
 */
const asComponent = (story: { render?: unknown }) => story.render as React.FC;

describe("the interactive control stories actually change state", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: false }));
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  /** Past the stories' 600ms confirmation window. */
  const settle = async () => {
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
  };
  const press = async (el: Element) => {
    await act(async () => {
      fireEvent.click(el);
    });
  };
  /**
   * A slider commits on release, not on every frame — a drag across a dimmer is one command, not eighty — so
   * driving it means moving it *and* letting go. `change` alone leaves the request unsent.
   */
  const dragTo = async (slider: Element, value: string) => {
    await act(async () => {
      fireEvent.change(slider, { target: { value } });
      fireEvent.keyUp(slider, { key: "ArrowRight" });
    });
  };

  it("LevelInteractive commits a new brightness and confirms it", async () => {
    const Story = asComponent(LevelInteractive);
    const { container } = render(<Story />);
    const slider = screen.getByRole("slider", { name: "Brightness" });
    const confirmed = () => container.querySelector("[data-confirmed]")?.textContent;
    expect(confirmed()).toBe("40%");

    await dragTo(slider, "65");
    // Asked for, not yet agreed to: the big number must still read the confirmed level.
    expect(confirmed()).toBe("40%");
    expect(container.querySelector("[data-requested]")?.textContent).toMatch(/65/);

    await settle();
    expect(confirmed()).toBe("65%");
  });

  it("LevelInteractive stays usable while a request is open, so a correction is not locked out", async () => {
    const Story = asComponent(LevelInteractive);
    const { container } = render(<Story />);
    const slider = screen.getByRole("slider", { name: "Brightness" });

    await dragTo(slider, "65");
    expect(slider, "a continuous control must accept a correction while its own request is open").toBeEnabled();

    await dragTo(slider, "80");
    await settle();
    expect(container.querySelector("[data-confirmed]")?.textContent).toBe("80%");
  });

  it("ModeInteractive selects a new mode, and refuses a second command while one is open", async () => {
    const Story = asComponent(ModeInteractive);
    render(<Story />);
    const mode = (name: string) => screen.getByRole("radio", { name });
    expect(mode("Heat")).toHaveAttribute("aria-checked", "true");

    await press(mode("Cool"));
    // A discrete command: the selection must not move until the device agrees.
    expect(mode("Heat")).toHaveAttribute("aria-checked", "true");
    expect(mode("Fan only")).toHaveAttribute("aria-disabled", "true");

    await settle();
    expect(mode("Cool")).toHaveAttribute("aria-checked", "true");
    expect(mode("Heat")).toHaveAttribute("aria-checked", "false");
  });

  it("SetpointInteractive accumulates fast nudges instead of dropping them", async () => {
    const Story = asComponent(SetpointInteractive);
    const { container } = render(<Story />);
    const up = () => screen.getByRole("button", { name: /Increase/ });
    const confirmed = () => container.querySelector("[data-confirmed]")?.textContent;
    expect(confirmed()).toBe("20.5°C");

    // Three presses inside one 600ms window. A control that locked after the first would land on 21.
    await press(up());
    await act(async () => {
      vi.advanceTimersByTime(120);
    });
    await press(up());
    await act(async () => {
      vi.advanceTimersByTime(120);
    });
    await press(up());
    expect(confirmed(), "still the confirmed value — three presses are one unconfirmed request").toBe("20.5°C");

    await settle();
    expect(confirmed()).toBe("22°C");
  });
});
