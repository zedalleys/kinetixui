import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./components/navigation-menu";

/**
 * Audit P1-5. The trigger's only keyboard-focus cue was `focus:bg-accent`: measured in Chromium, accent is
 * 1.08:1 on the light page and 1.24:1 on the dark one, and the text colour only moved in light. It now draws
 * the `ring` role like every other ring-ring control. jsdom cannot compute a box-shadow, so this pins the
 * class; the measurement itself is `check:theme-isolation` ("navigation menu: …").
 */
describe("NavigationMenu keyboard focus", () => {
  it("draws a ring from the `ring` role on a trigger", () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    expect(screen.getByRole("button", { name: /getting started/i }).className).toMatch(/focus-visible:ring-2/);
    expect(screen.getByRole("button", { name: /getting started/i }).className).toMatch(/focus-visible:ring-ring/);
  });

  it("draws it on a link too, which shares the trigger style", () => {
    expect(navigationMenuTriggerStyle()).toMatch(/focus-visible:ring-ring/);
  });
});
