"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";
import { cn } from "@/lib/utils";

// react-resizable-panels v4 renamed PanelGroup/PanelResizeHandle to
// Group/Separator and dropped the old `direction`/`data-panel-group-direction`
// API in favor of `orientation` + `aria-orientation` (set on the Separator
// itself, opposite of the group's own orientation). `direction` is kept as
// this wrapper's public prop name — every call site (demos, stories, the CLI
// registry) still passes it — and mapped to `orientation` underneath.
type ResizablePanelGroupProps = Omit<React.ComponentProps<typeof ResizablePrimitive.Group>, "orientation"> & {
  direction?: "horizontal" | "vertical";
};

const ResizablePanelGroup = ({ className, direction = "horizontal", ...props }: ResizablePanelGroupProps) => (
  <ResizablePrimitive.Group className={cn("flex h-full w-full", className)} orientation={direction} {...props} />
);

// v4 also changed bare numeric `defaultSize`/`minSize`/`maxSize` to mean
// pixels instead of percent — coerce plain numbers to a percentage string so
// existing call sites (`defaultSize={50}`) keep their v2 percentage meaning.
const asPercent = (value: number | string | undefined) => (typeof value === "number" ? `${value}%` : value);

const ResizablePanel = ({
  defaultSize,
  minSize,
  maxSize,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) => (
  <ResizablePrimitive.Panel
    defaultSize={asPercent(defaultSize)}
    minSize={asPercent(minSize)}
    maxSize={asPercent(maxSize)}
    {...props}
  />
);

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & { withHandle?: boolean }) => (
  <ResizablePrimitive.Separator
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:-translate-y-1/2 aria-[orientation=horizontal]:after:translate-x-0 [&[aria-orientation=horizontal]>div]:rotate-90",
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="size-2.5" />
      </div>
    )}
  </ResizablePrimitive.Separator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
