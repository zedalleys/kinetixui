"use client";

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { cn } from "@/lib/utils";

const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

/**
 * The disclosure transition, which this component shipped without.
 *
 * Collapsible was a bare re-export: three primitives passed through untouched. Its content appeared
 * and vanished in a single frame while `Accordion` — the same disclosure gesture on a sibling Radix
 * primitive — animated its height. Measured before this change, the content went 0px to 84px with no
 * animation at all, against the accordion's 0px → 24.64px → 36px over 200ms.
 *
 * Disclosure is the case where motion carries meaning rather than decorating it: the content growing
 * out of the trigger is what says it belongs to the thing you just pressed, and where it will go when
 * you press it again. Appearing instantly makes the page look like it was replaced instead.
 *
 * `overflow-hidden` is load-bearing, not cosmetic — the height animation clips its content as it
 * runs, and without it the text is laid out at full height from the first frame and simply spills
 * out of the collapsing box.
 *
 * Reduced motion needs nothing here. The package's base layer collapses `animation-duration` for
 * everything it ships, and the content still lands at its full height because the keyframe's end
 * state is unchanged — proven in both directions by `scripts/motion.mjs`.
 *
 * Wrapping the primitive rather than re-exporting it adds a `className` that merges with the
 * caller's, which is the convention every other component here follows. The props, the ref and the
 * data attributes are the primitive's own, so nothing a consumer passes today behaves differently.
 */
const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, ...props }, ref) => (
  <CollapsiblePrimitive.CollapsibleContent
    ref={ref}
    className={cn(
      "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
      className,
    )}
    {...props}
  />
));
CollapsibleContent.displayName = CollapsiblePrimitive.CollapsibleContent.displayName;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
