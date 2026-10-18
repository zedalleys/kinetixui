"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex size-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground font-sans",
      className,
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

/** The props of the root `Command` (cmdk): `label`, `filter`, `shouldFilter`, `loop`, `value`, … */
export interface CommandProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive> {}

interface CommandDialogProps extends React.ComponentProps<typeof Dialog> {
  /**
   * The dialog's accessible name, read when it opens. Visually hidden: the search field is the visible
   * heading of a command palette. Without one the dialog is announced as a bare "dialog".
   */
  title?: string;
  /** Optional visually hidden description; without one the dialog has no `aria-describedby`. */
  description?: string;
  /**
   * The control that opens it, rendered as the dialog's trigger (one element; it becomes the button).
   * Pass it here rather than beside the dialog: Radix returns focus to the trigger on close, and a
   * palette opened by a separate button would drop focus to the page instead. It must be one element that
   * accepts props and a ref, since the trigger's handlers are merged onto it; text or a list cannot be.
   */
  trigger?: React.ReactElement;
  /** Props for the inner `Command` (filtering, `label`, `loop`, …). */
  commandProps?: CommandProps;
}

const CommandDialog = ({
  children,
  title = "Command menu",
  description,
  trigger,
  commandProps,
  ...props
}: CommandDialogProps) => (
  <Dialog {...props}>
    {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
    {/*
      Anchored near the top rather than centred: a centred dialog re-centres as filtering changes the
      list's height, so the field being typed into jumps up and down under the caret. `pe-12` on the input
      row keeps the field clear of the dialog's close button, which sits over that row.
    */}
    <DialogContent
      className="top-[20vh] translate-y-0 overflow-hidden p-0"
      {...(description ? {} : { "aria-describedby": undefined })}
    >
      <DialogTitle className="sr-only">{title}</DialogTitle>
      {description ? <DialogDescription className="sr-only">{description}</DialogDescription> : null}
      <Command
        {...commandProps}
        className={cn(
          "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-input-wrapper]]:pe-12 [&_[cmdk-input-wrapper]_svg]:size-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:size-5",
          commandProps?.className,
        )}
      >
        {children}
      </Command>
    </DialogContent>
  </Dialog>
);

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    {/* Resting-dim icon, no hover/disabled state — numerically the disabled
        value (0.5) but not that role; left as a literal, see calendar.tsx */}
    <Search className="me-2 size-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-disabled",
        className,
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm" {...props} />);
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className,
    )}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator ref={ref} className={cn("-mx-1 h-px bg-border", className)} {...props} />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-disabled [&_svg]:size-4 [&_svg]:shrink-0",
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("ms-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />
);
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
