import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { KinetixDirectionProvider, useKinetixPortalContainer } from "./components/direction-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./components/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./components/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "./components/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "./components/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/select";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "./components/context-menu";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "./components/menubar";
import { Tour } from "./components/tour";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from "./components/drawer";

/**
 * components-direction-portal.test.tsx — overlays portal with the direction of the section that opened them.
 *
 * A `KinetixDirectionProvider` around one section of a page (a component preview, an RTL panel inside an LTR
 * app) used to direct only what rendered inside that section. Overlays portal to `<body>`, so they inherited
 * `<html dir>` instead: an RTL preview opened an LTR Dialog. The documentation site papered over it by writing
 * `<html dir>` from the preview's control, which mirrored the whole site (PR #300, §27).
 *
 * The contract here: inside a provider, every overlay's content sits under an element whose `dir` is the
 * provider's, and `<html>` is never touched. Outside one, overlays still portal to `<body>` and inherit
 * `<html dir>`, which is what applications that set direction globally rely on.
 *
 * jsdom does not compute inherited `direction`, so the assertion is on the nearest `[dir]` ancestor — the
 * attribute CSS inheritance, `[dir]` selectors and Tailwind's `rtl:` variant all resolve from. Computed
 * direction is checked in Chromium by the docs' preview verification.
 *
 * kx-verify: rtl
 */

const dirOf = (el: Element) => el.closest("[dir]")?.getAttribute("dir") ?? null;

afterEach(() => {
  document.documentElement.removeAttribute("dir");
});

function expectPageUntouched() {
  expect(document.documentElement.hasAttribute("dir")).toBe(false);
  expect(document.body.hasAttribute("dir")).toBe(false);
}

/** An LTR page with one RTL section: the docs' preview, or an RTL panel in an LTR application. */
const rtlSection = (node: React.ReactNode) => (
  <KinetixDirectionProvider dir="rtl">
    <div dir="rtl">{node}</div>
  </KinetixDirectionProvider>
);

describe("overlays opened inside a provider take its direction into their portal", () => {
  // First: Radix's ContextMenu stops opening in a module once a modal overlay has mounted there.
  it("ContextMenu", async () => {
    render(
      rtlSection(
        <ContextMenu>
          <ContextMenuTrigger>target</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>,
      ),
    );
    fireEvent.contextMenu(screen.getByText("target"));
    expect(dirOf(await screen.findByRole("menu"))).toBe("rtl");
    expectPageUntouched();
  });

  it("Dialog", async () => {
    const user = userEvent.setup();
    render(
      rtlSection(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Body</DialogDescription>
          </DialogContent>
        </Dialog>,
      ),
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog");
    expect(dirOf(dialog)).toBe("rtl");
    // It is still portaled — out of the section, into the provider's host under <body>.
    expect(dialog.closest("[data-kinetix-portal]")?.parentElement).toBe(document.body);
    expectPageUntouched();
  });

  it("AlertDialog", async () => {
    const user = userEvent.setup();
    render(
      rtlSection(
        <AlertDialog>
          <AlertDialogTrigger>Open</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Body</AlertDialogDescription>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>,
      ),
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(dirOf(await screen.findByRole("alertdialog"))).toBe("rtl");
    expectPageUntouched();
  });

  it("Sheet", async () => {
    const user = userEvent.setup();
    render(
      rtlSection(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Body</SheetDescription>
          </SheetContent>
        </Sheet>,
      ),
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(dirOf(await screen.findByRole("dialog"))).toBe("rtl");
    expectPageUntouched();
  });

  it("Popover", async () => {
    const user = userEvent.setup();
    render(
      rtlSection(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Body</PopoverContent>
        </Popover>,
      ),
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(dirOf(await screen.findByText("Body"))).toBe("rtl");
    expectPageUntouched();
  });

  it("Tooltip", async () => {
    render(
      rtlSection(
        <TooltipProvider delayDuration={0}>
          <Tooltip open>
            <TooltipTrigger>Hover</TooltipTrigger>
            <TooltipContent>Tip</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      ),
    );
    expect(dirOf(await screen.findByRole("tooltip"))).toBe("rtl");
    expectPageUntouched();
  });

  // These three stamp `dir` on their own content from Radix's DirectionContext, which the provider already
  // supplied. Asserted so moving their portal does not change what they did.
  it("DropdownMenu keeps the direction it already had", async () => {
    const user = userEvent.setup();
    render(
      rtlSection(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      ),
    );
    screen.getByRole("button", { name: "Open" }).focus();
    await user.keyboard("{Enter}");
    expect(dirOf(await screen.findByRole("menu"))).toBe("rtl");
    expectPageUntouched();
  });

  it("Select keeps the direction it already had", async () => {
    const user = userEvent.setup();
    render(
      rtlSection(
        <Select>
          <SelectTrigger aria-label="Fruit">
            <SelectValue placeholder="Pick" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Apple</SelectItem>
          </SelectContent>
        </Select>,
      ),
    );
    // Radix's Select does not open from a synthetic click in jsdom; Enter reaches the same path.
    screen.getByRole("combobox", { name: "Fruit" }).focus();
    await user.keyboard("{Enter}");
    expect(dirOf(await screen.findByRole("listbox"))).toBe("rtl");
    expectPageUntouched();
  });

  it("Menubar keeps the direction it already had", async () => {
    const user = userEvent.setup();
    render(
      rtlSection(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>New</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      ),
    );
    screen.getByRole("menuitem", { name: "File" }).focus();
    await user.keyboard("{Enter}");
    expect(dirOf(await screen.findByRole("menu"))).toBe("rtl");
    expectPageUntouched();
  });

  it("Tour", async () => {
    render(
      rtlSection(
        <>
          <span id="tour-target">here</span>
          <Tour
            open
            stepIndex={0}
            onStepIndexChange={() => {}}
            onOpenChange={() => {}}
            steps={[{ target: "#tour-target", title: "Step", content: "Body" }]}
          />
        </>,
      ),
    );
    const dialog = await screen.findByRole("dialog");
    expect(dirOf(dialog)).toBe("rtl");
    expect(dialog.closest("[data-kinetix-portal]")).not.toBeNull();
    expectPageUntouched();
  });
});

describe("direction boundaries", () => {
  function DialogExample({ label }: { label: string }) {
    return (
      <Dialog>
        <DialogTrigger>{label}</DialogTrigger>
        <DialogContent>
          <DialogTitle>{`${label} title`}</DialogTitle>
          <DialogDescription>Body</DialogDescription>
        </DialogContent>
      </Dialog>
    );
  }

  it("two sections on one page keep their own direction", async () => {
    const user = userEvent.setup();
    render(
      <>
        <KinetixDirectionProvider dir="rtl">
          <DialogExample label="Right" />
        </KinetixDirectionProvider>
        <KinetixDirectionProvider dir="ltr">
          <DialogExample label="Left" />
        </KinetixDirectionProvider>
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Left" }));
    expect(dirOf(await screen.findByRole("dialog", { name: "Left title" }))).toBe("ltr");
  });

  it("the nearest provider wins when sections nest", async () => {
    const user = userEvent.setup();
    render(
      <KinetixDirectionProvider dir="rtl">
        <KinetixDirectionProvider dir="ltr">
          <DialogExample label="Inner" />
        </KinetixDirectionProvider>
      </KinetixDirectionProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Inner" }));
    expect(dirOf(await screen.findByRole("dialog"))).toBe("ltr");
  });

  it("an LTR section inside an RTL application stays LTR", async () => {
    document.documentElement.setAttribute("dir", "rtl");
    const user = userEvent.setup();
    render(
      <KinetixDirectionProvider dir="ltr">
        <DialogExample label="Open" />
      </KinetixDirectionProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(dirOf(await screen.findByRole("dialog"))).toBe("ltr");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
  });

  it("follows the provider when its direction changes", async () => {
    function Switchable() {
      const [dir, setDir] = React.useState<"ltr" | "rtl">("ltr");
      return (
        <KinetixDirectionProvider dir={dir}>
          <button onClick={() => setDir("rtl")}>flip</button>
          <Popover open>
            <PopoverTrigger>Anchor</PopoverTrigger>
            <PopoverContent>Body</PopoverContent>
          </Popover>
        </KinetixDirectionProvider>
      );
    }
    render(<Switchable />);
    const body = await screen.findByText("Body");
    expect(dirOf(body)).toBe("ltr");
    act(() => void fireEvent.click(screen.getByRole("button", { name: "flip" })));
    expect(dirOf(body)).toBe("rtl");
  });

  it("an explicit portal container still wins", () => {
    const own = document.createElement("div");
    own.setAttribute("dir", "ltr");
    document.body.appendChild(own);
    render(
      <KinetixDirectionProvider dir="rtl">
        <Dialog open>
          <DialogPortal container={own}>
            <p>Body</p>
          </DialogPortal>
        </Dialog>
      </KinetixDirectionProvider>,
    );
    expect(own.contains(screen.getByText("Body"))).toBe(true);
    expect(dirOf(screen.getByText("Body"))).toBe("ltr");
    own.remove();
  });

  it("exposes the host to custom portals, and removes it when the provider unmounts", () => {
    let seen: HTMLElement | undefined;
    function Probe() {
      seen = useKinetixPortalContainer();
      return null;
    }
    const view = render(
      <KinetixDirectionProvider dir="rtl">
        <Probe />
      </KinetixDirectionProvider>,
    );
    expect(seen?.getAttribute("dir")).toBe("rtl");
    expect(seen?.parentElement).toBe(document.body);
    view.unmount();
    expect(seen?.isConnected).toBe(false);
  });
});

describe("without a provider (direction set globally on <html>)", () => {
  it("overlays still portal to <body> and inherit <html dir>", async () => {
    document.documentElement.setAttribute("dir", "rtl");
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Body</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.closest("[data-kinetix-portal]")).toBeNull();
    expect(dirOf(dialog)).toBe("rtl");
  });
});

describe("focus and reading order inside a directional portal", () => {
  it("Dialog traps focus in its content and returns it to the trigger on close", async () => {
    const user = userEvent.setup();
    render(
      rtlSection(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Body</DialogDescription>
            <button>First</button>
          </DialogContent>
        </Dialog>,
      ),
    );
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("a modal Dialog hides the rest of the page from assistive tech, but not itself", async () => {
    const user = userEvent.setup();
    render(
      <>
        <p>page text</p>
        {rtlSection(
          <Dialog>
            <DialogTrigger>Open</DialogTrigger>
            <DialogContent>
              <DialogTitle>Title</DialogTitle>
              <DialogDescription>Body</DialogDescription>
            </DialogContent>
          </Dialog>,
        )}
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog");
    // The host is the dialog's ancestor, so Radix's aria-hidden sweep must skip it.
    expect(dialog.closest("[aria-hidden=true]")).toBeNull();
    expect(screen.getByText("page text").closest("[aria-hidden=true]")).not.toBeNull();
  });
});

// Last in the file: once vaul's modal Drawer has mounted, Radix's ContextMenu no longer opens in this
// module (see components-overlay.test.tsx).
describe("Drawer", () => {
  it("portals with the provider's direction", async () => {
    const user = userEvent.setup();
    render(
      rtlSection(
        <Drawer>
          <DrawerTrigger>Open</DrawerTrigger>
          <DrawerContent>
            <DrawerTitle>Title</DrawerTitle>
            <DrawerDescription>Body</DrawerDescription>
          </DrawerContent>
        </Drawer>,
      ),
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(dirOf(await screen.findByRole("dialog"))).toBe("rtl");
    expectPageUntouched();
  });
});
