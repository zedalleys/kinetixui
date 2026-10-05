"use client";

import * as React from "react";
import { DirectionProvider as RadixDirectionProvider } from "@radix-ui/react-direction";

export interface KinetixDirectionProviderProps {
  children?: React.ReactNode;
  dir: "ltr" | "rtl";
}

/**
 * Where this provider's overlays portal to: a `<div dir>` directly under `<body>`, one per provider.
 *
 * Overlays (Dialog, Sheet, Popover, Tooltip, menus, …) portal out of the tree that rendered them, so the
 * `dir` attribute around the trigger never reaches them — they inherit from `<body>`, which inherits from
 * `<html>`. Radix's `DirectionContext` fixes its own positioning and, for Select and the menu family, stamps
 * `dir` on the content, but Dialog, Popover, Tooltip and the rest stamp nothing, so their text, logical
 * padding and `rtl:` variants followed the document instead of the section that opened them.
 *
 * Portaling into a host that carries the provider's `dir` fixes all of them in one place, through ordinary
 * DOM inheritance: `direction`, `[dir]` selectors and Tailwind's `rtl:` variant all match an ancestor. The
 * host is a plain block with no styles, so it creates no stacking context or containing block — fixed
 * overlays position against the viewport exactly as they did from `<body>`.
 *
 * `null` outside any provider, so overlays fall back to `<body>` and keep inheriting `<html dir>` as before.
 */
const PortalContainerContext = React.createContext<HTMLElement | null>(null);

const useIsomorphicLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

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
 *
 * It also scopes: a provider around one section (with `dir` on that section's element) gives that section
 * its own direction, and the overlays opened from inside it portal with that direction too, without
 * touching `<html>`. The nearest provider wins.
 */
export function KinetixDirectionProvider({ dir, children }: KinetixDirectionProviderProps) {
  // Created on the client's first render, attached in a layout effect. Portals render nothing on the server
  // and wait for their own mount effect on the client, so nothing is portaled into it before it is attached.
  const [host] = React.useState(() => (typeof document === "undefined" ? null : document.createElement("div")));

  useIsomorphicLayoutEffect(() => {
    if (!host) return;
    host.setAttribute("data-kinetix-portal", "");
    document.body.appendChild(host);
    return () => host.remove();
  }, [host]);

  useIsomorphicLayoutEffect(() => {
    host?.setAttribute("dir", dir);
  }, [host, dir]);

  return (
    <RadixDirectionProvider dir={dir}>
      <PortalContainerContext.Provider value={host}>{children}</PortalContainerContext.Provider>
    </RadixDirectionProvider>
  );
}

/**
 * The element the nearest `KinetixDirectionProvider` wants overlays portaled into, or `undefined` outside
 * one (portal to `<body>` as usual). Every overlay in this library passes it as its portal `container`; use
 * it for a custom portal so it gets the same direction.
 */
export function useKinetixPortalContainer(): HTMLElement | undefined {
  return React.useContext(PortalContainerContext) ?? undefined;
}

/**
 * Wraps a primitive's `Portal` so it portals into the nearest provider's host (see above). An explicit
 * `container` still wins. Internal: every overlay in this library is built with it, which is what keeps the
 * direction rule in one place instead of in each overlay.
 */
export function withDirectionalPortal<P extends { container?: Element | DocumentFragment | null }>(
  Portal: React.ComponentType<P>,
) {
  function DirectionalPortal({ container, ...props }: P) {
    const host = useKinetixPortalContainer();
    return <Portal {...(props as unknown as P)} container={container ?? host} />;
  }
  DirectionalPortal.displayName = `Directional(${Portal.displayName ?? Portal.name ?? "Portal"})`;
  return DirectionalPortal;
}
