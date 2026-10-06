"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "../lib/utils";
import { withDirectionalPortal } from "./direction-provider";

const Drawer = ({ shouldScaleBackground = true, ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = withDirectionalPortal(DrawerPrimitive.Portal);
const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-overlay bg-scrim", className)} {...props} />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, onOpenAutoFocus, ...props }, ref) => {
  /**
   * Focus entry. Measured in Chromium with the drawer open: focus was still on the trigger — which by
   * then sits inside a subtree `aria-hidden="true"`, because the drawer hides the page behind it. So a
   * screen-reader user opened the drawer and was left on an element their assistive technology had just
   * been told does not exist. Tab recovered on the next keystroke; the destination on open did not.
   *
   * Every other modal surface in the family moves focus into the portal on open. `vaul` suppresses that
   * deliberately, to stop a mobile keyboard appearing whenever a drawer with a field in it opens, and
   * that reason is good — so this focuses the panel itself rather than the first thing inside it. A
   * container is not a text field: it opens no keyboard, it gives the screen reader the drawer's own
   * heading to announce, and Tab from there walks the drawer's contents in order.
   *
   * Notably, axe does *not* report this. Its `aria-hidden-focus` rule excuses an aria-hidden page
   * whenever a modal dialog is open, wherever focus actually is — so the open-state scan that found the
   * Popover naming defect is blind to this one. Focus entry needs its own assertion, which is why
   * a11y-browser now carries one.
   */
  const panel = React.useRef<HTMLDivElement | null>(null);
  const setRefs = (node: HTMLDivElement | null) => {
    panel.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={setRefs}
        tabIndex={-1}
        // `onOpenAutoFocus` and not a mount effect: the focus scope underneath runs after mount, so an
        // effect that focuses the panel is overwritten a tick later and the fix silently does nothing
        // (measured — the first attempt here was exactly that). This is the moment the primitive offers.
        //
        // Composed with the caller's handler and destructured out of the spread below: with `{...props}`
        // trailing, any `onOpenAutoFocus` a consumer passes — even one that only logs — would replace this
        // one outright, and since vaul suppresses auto-focus otherwise, focus would be left on the
        // now-hidden trigger and the defect would be back. A caller who calls `preventDefault` themselves
        // is taking focus over deliberately, so that decision stands and the panel is left alone.
        onOpenAutoFocus={(event) => {
          onOpenAutoFocus?.(event);
          if (event.defaultPrevented) return;
          event.preventDefault();
          panel.current?.focus();
        }}
        className={cn(
          "fixed inset-x-0 bottom-0 z-overlay mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background font-sans",
          "outline-none",
          className,
        )}
        {...props}
      >
        <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
});
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid gap-1.5 p-4 text-center sm:text-start", className)} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
