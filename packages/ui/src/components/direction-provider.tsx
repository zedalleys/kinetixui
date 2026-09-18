"use client";

import * as React from "react";
import { DirectionProvider as RadixDirectionProvider } from "@radix-ui/react-direction";

export interface KinetixDirectionProviderProps {
  children?: React.ReactNode;
  dir: "ltr" | "rtl";
}

/**
 * Every Radix primitive this library builds on (Select, DropdownMenu, Popover,
 * Tooltip, ContextMenu, Menubar, NavigationMenu, HoverCard, …) reads direction
 * from a `DirectionContext`, not from the ambient `dir` attribute — with no
 * provider in the tree it defaults hard to `"ltr"` and stamps that onto its own
 * portaled content, regardless of what `<html dir="rtl">` says. Logical-property
 * CSS (see RTL.md) mirrors layout; this is what makes Radix's own positioning
 * and portaled content agree with it. Wrap your app root in this alongside
 * setting `dir` on `<html>`:
 *
 *   <html dir={dir}>
 *     <KinetixDirectionProvider dir={dir}>{children}</KinetixDirectionProvider>
 *   </html>
 */
export function KinetixDirectionProvider({ dir, children }: KinetixDirectionProviderProps) {
  return <RadixDirectionProvider dir={dir}>{children}</RadixDirectionProvider>;
}
