import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { KinetixDirectionProvider } from "./components/direction-provider";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from "./components/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "./components/popover";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./components/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "./components/sheet";
import { Modal } from "./components/modal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/tooltip";

/**
 * components-overlay.test.tsx — the overlay family's open/close state contract, and the two defects the
 * open-state scan found.
 *
 * Separate from `components-keyboard.test.tsx` for one reason worth stating: that file is the single
 * source `scripts/gen-keyboard.mjs` publishes each component's keyboard model from, so what belongs there
 * is keyboard behaviour. Controlled-vs-uncontrolled open state, a `role="dialog"` having a name, and
 * where focus lands are not keyboard models, and documenting them as one would misdescribe them.
 *
 * `Drawer` also has to live outside that module. Radix's anchored ContextMenu stops opening once any
 * modal overlay has mounted there, and vaul's Drawer is one — the ordering constraint is recorded at the
 * top of the ContextMenu suite in that file.
 *
 * kx-verify: interaction
 */

describe("Popover's accessible name", () => {
  it("names the dialog Radix gives it, because an unnamed one announces only its role", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <p>Dimensions</p>
        </PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    // Found by running axe against the open surface — a check that did not exist before this slice,
    // because the suite scanned overlay stories closed. Every Popover in the library was a dialog with
    // no accessible name, which WCAG 4.1.2 fails and a screen reader reads as the single word "dialog".
    expect(await screen.findByRole("dialog", { name: "Popover" })).toBeInTheDocument();
  });

  it("keeps the caller's own name, and stays out of the way of aria-labelledby", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <Popover>
        <PopoverTrigger>A</PopoverTrigger>
        <PopoverContent aria-label="Layer dimensions">
          <p>x</p>
        </PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "A" }));
    expect(await screen.findByRole("dialog", { name: "Layer dimensions" })).toBeInTheDocument();
    unmount();

    render(
      <Popover>
        <PopoverTrigger>B</PopoverTrigger>
        <PopoverContent aria-labelledby="heading">
          <h2 id="heading">Dimensions</h2>
        </PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "B" }));
    const named = await screen.findByRole("dialog", { name: "Dimensions" });
    // The fallback must not shadow a heading the caller pointed at: an aria-label would win over
    // aria-labelledby and the name would silently become "Popover" again.
    expect(named).not.toHaveAttribute("aria-label");
  });
});

describe("Drawer focus entry", () => {
  function Example() {
    return (
      <Drawer>
        <DrawerTrigger>Open Drawer</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>Move goal</DrawerTitle>
          <DrawerDescription>Set your daily activity goal.</DrawerDescription>
          <DrawerClose>Cancel</DrawerClose>
        </DrawerContent>
      </Drawer>
    );
  }

  it("moves focus into the panel, and not onto the trigger the drawer has just hidden", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open Drawer" });
    await user.click(trigger);
    const panel = await screen.findByRole("dialog");

    // Measured in Chromium before this was fixed: focus stayed on the trigger, which by then sits inside
    // a subtree the drawer marks aria-hidden — so a screen-reader user was left on an element their
    // software had just been told does not exist. The panel itself is the destination rather than the
    // first control in it, so a drawer containing a field does not summon a mobile keyboard on open.
    await waitFor(() => expect(document.activeElement).toBe(panel));
    expect(trigger).not.toHaveFocus();
  });

  it("closes on Escape and gives focus back", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open Drawer" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

describe("Overlay open state", () => {
  it("Dialog stays closed when controlled, and reports the request once", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
          <DialogDescription>D</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
    // Controlled means controlled: the surface must not appear on its own.
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Dialog opens from defaultOpen and can be closed and reopened", async () => {
    const user = userEvent.setup();
    render(
      <Dialog defaultOpen>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Reopenable</DialogTitle>
          <DialogDescription>D</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    await screen.findByRole("dialog", { name: "Reopenable" });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // Reopening is the half that stale state breaks, so it is the half worth asserting.
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("dialog", { name: "Reopenable" })).toBeInTheDocument();
  });

  it("Sheet's close button dismisses it and returns focus", async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetTitle>Panel</SheetTitle>
          <SheetDescription>D</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    await screen.findByRole("dialog", { name: "Panel" });

    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it("Modal's own buttons carry its decisions, and each fires once", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const onCancel = vi.fn();
    render(
      <Modal
        type="Confirmation"
        title="Confirm it"
        description="Sure?"
        trigger={<button>Go</button>}
        onAction={onAction}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Go" }));
    await screen.findByRole("dialog", { name: "Confirm it" });
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onAction).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(screen.getByRole("button", { name: "Go" }));
    await screen.findByRole("dialog", { name: "Confirm it" });
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce(); // still once: confirming is not cancelling
  });

  it("Popover closes on Escape and hands focus back, without trapping it the way a dialog does", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent aria-label="Panel">
            <button>Inside</button>
          </PopoverContent>
        </Popover>
        <button>After</button>
      </>,
    );
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    const surface = await screen.findByRole("dialog", { name: "Panel" });
    // Non-modal, so `openStates` declares `modal: false` and a11y-browser asserts there that Tab can
    // leave it. That half is deliberately not asserted here: in jsdom focus stays on the one control
    // inside the surface however many times Tab is pressed, which is the focus scope's loop behaving
    // differently without layout, not the component trapping. A browser answers it; this cannot.
    expect(surface).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it("Tooltip does not trap focus either, and closes on Escape", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Library</TooltipTrigger>
          <TooltipContent>Add to library</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.tab();
    await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });
});

// kx-verify: interaction, rtl

describe("Overlay portals under RTL", () => {
  const rtl = (node: React.ReactNode) => <KinetixDirectionProvider dir="rtl">{node}</KinetixDirectionProvider>;

  it("resolves a submenu onto the start side, which is the direction reaching the portal", async () => {
    const user = userEvent.setup();
    function Example() {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Nested</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    render(rtl(<Example />));
    screen.getByRole("button", { name: "Actions" }).focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("menu");

    // The submenu is portaled out of the provider's subtree, so nothing in the DOM carries the direction
    // to it — CSS inheritance cannot, because the portal is a child of <body>. What does reach it is
    // Radix's direction context, and this is the observable consequence: a submenu that opens toward the
    // inline start resolves `data-side="left"`, where under LTR it resolves "right". The computed CSS
    // `direction` on portal content is a different claim and belongs to the browser pass, which sets
    // `dir` on the document the way an RTL app does.
    screen.getByRole("menuitem", { name: "More" }).focus();
    await user.keyboard("{ArrowLeft}");
    const nested = await screen.findByRole("menuitem", { name: "Nested" });
    const sub = nested.closest('[role="menu"]');
    expect(sub?.getAttribute("data-side")).toBe("left");
  });

  it("keeps Popover's fallback name when the surface is portaled under RTL", async () => {
    const user = userEvent.setup();
    render(
      rtl(
        <Popover>
          <PopoverTrigger>افتح</PopoverTrigger>
          <PopoverContent>
            <p>المحتوى</p>
          </PopoverContent>
        </Popover>,
      ),
    );
    await user.click(screen.getByRole("button", { name: "افتح" }));
    // The name has to survive the portal and the direction both, or an RTL app gets the unnamed dialog
    // back without anything saying so.
    expect(await screen.findByRole("dialog", { name: "Popover" })).toBeInTheDocument();
  });
});
