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
 * Three states, so nothing is ever committed into a host that is not in the document:
 *   `undefined`  no provider: overlays portal to `<body>` and inherit `<html dir>`, as before.
 *   `null`       a provider whose host is not attached yet (its first render, and the server): portals render
 *                nothing. Descendants' layout effects run before the provider's, so publishing the host
 *                earlier would let an overlay that mounts with the provider (an open Dialog, say) commit its DOM
 *                into a detached node, where native `autoFocus` and layout measurements are lost.
 *   an element   attached: portals render into it.
 * The switch from `null` to the element happens in the provider's layout effect, so it is applied before the
 * browser paints.
 */
const PortalContainerContext = React.createContext<HTMLElement | null | undefined>(undefined);

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
  // Created on the client's first render, attached in a layout effect.
  const [host] = React.useState(() => (typeof document === "undefined" ? null : document.createElement("div")));
  const [attached, setAttached] = React.useState(false);

  useIsomorphicLayoutEffect(() => {
    if (!host) return;
    host.setAttribute("data-kinetix-portal", "");
    host.setAttribute("dir", dir);
    document.body.appendChild(host);
    setAttached(true);
    return () => {
      host.remove();
      setAttached(false);
    };
    // `dir` is applied by the effect below; this one only attaches, once.
  }, [host]);

  useIsomorphicLayoutEffect(() => {
    host?.setAttribute("dir", dir);
  }, [host, dir]);

  return (
    <RadixDirectionProvider dir={dir}>
      <PortalContainerContext.Provider value={attached ? host : null}>{children}</PortalContainerContext.Provider>
    </RadixDirectionProvider>
  );
}

/**
 * The element the nearest `KinetixDirectionProvider` wants overlays portaled into. `undefined` outside one
 * (portal to `<body>` as usual); `null` inside one whose host is not attached yet, in which case render
 * nothing and try again, which happens before paint. Every overlay in this library follows this; use it for a
 * custom portal so it gets the same direction.
 */
export function useKinetixPortalContainer(): HTMLElement | null | undefined {
  return React.useContext(PortalContainerContext);
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
    if (host === null && !container) return null;
    return <Portal {...(props as unknown as P)} container={container ?? host} />;
  }
  DirectionalPortal.displayName = `Directional(${Portal.displayName ?? Portal.name ?? "Portal"})`;
  return DirectionalPortal;
}
