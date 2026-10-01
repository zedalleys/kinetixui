import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { KinetixDirectionProvider } from "./components/direction-provider";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./components/context-menu";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarShortcut,
  MenubarTrigger,
} from "./components/menubar";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./components/navigation-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./components/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/tooltip";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./components/alert-dialog";

/**
 * components-rtl.test.tsx — the overlay family mirrors under `dir="rtl"`.
 *
 * Slice 2 of the RTL conversion (see RTL.md). Slice 1 converted Dialog, Sheet, Drawer, DropdownMenu and
 * Select; this covers the rest of the overlay family — ContextMenu, Menubar, AlertDialog, NavigationMenu,
 * Popover and Tooltip.
 *
 * `scripts/check-rtl.mjs` is a source guardrail: it proves no physical-direction class is left in the file.
 * It cannot prove the class that replaced it is the *right* one, or that the Radix primitive underneath
 * actually flips — which is the failure RTL.md records as the one that cost a slice to find. These are the
 * behavioural half: the rendered DOM carries the logical class, and the keyboard direction mirrors.
 *
 * jsdom has no layout, so these assert the contract (class names, direction-dependent key handling) rather
 * than measured geometry. Pixel mirroring is the browser pass's job.
 *
 * kx-verify: rtl
 */

const rtl = (node: React.ReactNode) => <KinetixDirectionProvider dir="rtl">{node}</KinetixDirectionProvider>;

describe("ContextMenu under RTL", () => {
  function Example() {
    return (
      <ContextMenu>
        <ContextMenuTrigger>target</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem inset>Inset item</ContextMenuItem>
          <ContextMenuCheckboxItem checked>Checked</ContextMenuCheckboxItem>
          <ContextMenuItem>
            Save <ContextMenuShortcut>⌘S</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>Nested</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  it("mirrors its gutters, shortcut and submenu direction", async () => {
    // One open, many assertions: Radix's ContextMenu is driven by a real contextmenu event and does not
    // re-open cleanly across renders in jsdom, so re-opening per assertion would be testing the harness.
    const user = userEvent.setup();
    render(rtl(<Example />));
    fireEvent.contextMenu(screen.getByText("target"));
    await screen.findByRole("menu");

    // Inset items indent on the inline start, not the physical left.
    expect(screen.getByText("Inset item")).toHaveClass("ps-8");
    expect(screen.getByText("Inset item").className).not.toMatch(/\bpl-8\b/);

    // The tick gutter must move to the right-hand side under RTL.
    const checkbox = screen.getByRole("menuitemcheckbox", { name: /Checked/ });
    expect(checkbox.querySelector(".start-2")).not.toBeNull();
    expect(checkbox.querySelector(".left-2")).toBeNull();

    // The shortcut pushes to the inline end.
    expect(screen.getByText("⌘S")).toHaveClass("ms-auto");

    // In a right-to-left menu the submenu unfolds toward the left, so ArrowLeft is "into" it.
    const sub = screen.getByRole("menuitem", { name: "More" });
    sub.focus();
    await user.keyboard("{ArrowLeft}");
    expect(await screen.findByRole("menuitem", { name: "Nested" })).toBeInTheDocument();
  });
});

describe("Menubar under RTL", () => {
  it("places the shortcut on the inline end", async () => {
    const user = userEvent.setup();
    render(
      rtl(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem inset>
                New <MenubarShortcut>⌘N</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      ),
    );
    const trigger = screen.getByRole("menuitem", { name: "File" });
    trigger.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("menu");
    expect(screen.getByText("⌘N")).toHaveClass("ms-auto");
    expect(screen.getByRole("menuitem", { name: /New/ })).toHaveClass("ps-8");
  });
});

describe("AlertDialog under RTL", () => {
  it("aligns its header to the reading direction and stays centred", () => {
    const { container } = render(
      rtl(
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
          </AlertDialogContent>
        </AlertDialog>,
      ),
    );
    const header = screen.getByText("Delete").parentElement!;
    expect(header).toHaveClass("sm:text-start");
    expect(header.className).not.toMatch(/sm:text-left/);

    // The centring trick stays physical on purpose — it must not have been "converted" to start-1/2,
    // which would read as mirroring while landing in the same place.
    const content = screen.getByRole("alertdialog");
    expect(content.className).toMatch(/\bleft-1\/2\b/);
    expect(content.className).not.toMatch(/\bstart-1\/2\b/);
    expect(container).toBeTruthy();
  });
});

describe("NavigationMenu under RTL", () => {
  it("anchors its panel and chevron gap on the inline axis", async () => {
    const user = userEvent.setup();
    render(
      rtl(
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div>Panel</div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>,
      ),
    );
    const trigger = screen.getByRole("button", { name: /Products/ });
    // The disclosure chevron is spaced from the label on the inline axis.
    expect(trigger.querySelector(".ms-1")).not.toBeNull();
    expect(trigger.querySelector(".ml-1")).toBeNull();

    await user.click(trigger);
    const panel = (await screen.findByText("Panel")).parentElement!;
    expect(panel.className).toMatch(/\bstart-0\b/);
    expect(panel.className).not.toMatch(/\bleft-0\b/);
  });
});

/**
 * Popover and Tooltip are the other half of the contract: their entry animation keys off `data-side`,
 * which Radix has already resolved to a PHYSICAL side after flipping for direction and collisions. A
 * well-meaning conversion to logical classes there would invert the animation under RTL, so these assert
 * the physical classes are deliberately retained.
 */
describe("Popover and Tooltip keep their resolved-side animation physical", () => {
  it("Popover slides away from the trigger on the side Radix resolved", async () => {
    const user = userEvent.setup();
    render(
      rtl(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Body</PopoverContent>
        </Popover>,
      ),
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    const content = await screen.findByText("Body");
    expect(content.className).toMatch(/data-\[side=left\]:slide-in-from-right-2/);
    expect(content.className).toMatch(/data-\[side=right\]:slide-in-from-left-2/);
  });

  it("Tooltip does the same", async () => {
    const user = userEvent.setup();
    render(
      rtl(
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger>Hover</TooltipTrigger>
            <TooltipContent>Hint</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      ),
    );
    await user.hover(screen.getByRole("button", { name: "Hover" }));
    const tip = (await screen.findAllByText("Hint"))[0];
    expect(tip.className).toMatch(/data-\[side=left\]:slide-in-from-right-2/);
  });
});
