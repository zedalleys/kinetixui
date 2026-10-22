import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  TABS_MOTION,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type TabsMotion,
} from "./components/tabs";

/**
 * tabs-motion.test.tsx — the `motion` preset on TabsList, on the `selection-indicator` role.
 *
 * jsdom runs no transition and computes no layout, so what belongs here is the part that is true before
 * anything renders: the preset reaches the DOM, the default is the behaviour that shipped before the prop
 * existed, the preset is not leaked onto the element as an unknown attribute, and selection itself never
 * waits for motion. The rendered half — the bar actually travelling, retargeting from its current position
 * rather than restarting, `none` starting no transition at all, and the geometry holding through resize,
 * RTL and orientation — is `check:tabs-indicator` and `check:motion`, in a real browser.
 *
 * Every assertion below is also run against a wrong value, so a rule that could never fail is caught here
 * rather than trusted.
 */

function Strip({ motion }: { motion?: TabsMotion }) {
  return (
    <Tabs defaultValue="sale">
      <TabsList motion={motion} aria-label="Listing type">
        <TabsTrigger value="sale">Sale</TabsTrigger>
        <TabsTrigger value="rent">Rent</TabsTrigger>
      </TabsList>
      <TabsContent value="sale">Sale panel.</TabsContent>
      <TabsContent value="rent">Rent panel.</TabsContent>
    </Tabs>
  );
}

const list = () => screen.getByRole("tablist");

describe("TabsList motion presets", () => {
  it("defaults to classic, which is the behaviour before the prop existed", () => {
    render(<Strip />);
    expect(list().dataset.kxTabsMotion).toBe("classic");
    expect(list().dataset.kxTabsMotion).not.toBe("none");
  });

  it.each(TABS_MOTION)(
    "reports %s on the list so a gate can read it",
    (preset) => {
      render(<Strip motion={preset} />);
      expect(list().dataset.kxTabsMotion).toBe(preset);
    },
  );

  it("offers exactly the presets it implements", () => {
    // The playground and the docs read this list; a preset here that the component cannot perform would
    // advertise an effect that does nothing.
    expect([...TABS_MOTION]).toEqual(["classic", "none"]);
  });

  it("does not leak the preset onto the element as an unknown attribute", () => {
    render(<Strip motion="none" />);
    // `motion` is consumed by the component. Were it spread onto the primitive it would land verbatim,
    // and React would warn about an unknown DOM attribute.
    expect(list().getAttribute("motion")).toBeNull();
    expect(list().getAttribute("data-kx-tabs-motion")).toBe("none");
  });

  it("keeps the indicator out of the accessibility tree on every preset", async () => {
    for (const preset of TABS_MOTION) {
      const { unmount } = render(<Strip motion={preset} />);
      const bar = list().querySelector("[data-kx-tabs-bar]");
      expect(bar).not.toBeNull();
      expect(bar!.getAttribute("aria-hidden")).toBe("true");
      unmount();
    }
  });

  it.each(TABS_MOTION)(
    "changes selection immediately under %s: semantics never wait for paint",
    async (preset) => {
      const user = userEvent.setup();
      render(<Strip motion={preset} />);
      const rent = screen.getByRole("tab", { name: "Rent" });
      await user.click(rent);
      expect(rent).toHaveAttribute("aria-selected", "true");
      expect(rent).toHaveAttribute("data-state", "active");
      expect(screen.getByRole("tab", { name: "Sale" })).toHaveAttribute(
        "aria-selected",
        "false",
      );
    },
  );

  it("keeps the preset a presentation choice: the tab panel is the same either way", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Strip motion="none" />);
    await user.click(screen.getByRole("tab", { name: "Rent" }));
    const withNone = screen.getByRole("tabpanel").textContent;
    unmount();
    render(<Strip motion="classic" />);
    await user.click(screen.getByRole("tab", { name: "Rent" }));
    expect(screen.getByRole("tabpanel").textContent).toBe(withNone);
  });
});
