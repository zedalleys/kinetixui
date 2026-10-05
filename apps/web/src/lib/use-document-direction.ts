"use client";

import * as React from "react";

export type Direction = "ltr" | "rtl";

/**
 * The page's effective direction — `<html dir>` — kept current when something changes it.
 *
 * Radix primitives do not read the ambient `dir`: with no `DirectionProvider` above them they default hard to
 * "ltr" and stamp `dir="ltr"` on their own root. A Radix `Tabs.Root` wrapped around a preview therefore forced
 * every example on an RTL page into LTR — the preview, the controls around it, everything — so a reader could
 * not see a block in RTL at all, and a direction-sensitive defect inside it (the Switch thumb in #285) was
 * only ever shown as a mixed-direction case. The site's own shells pass this to `dir` instead.
 *
 * `<html dir>` is the source because it is what an application integrating KinetixUI sets. Nothing on the docs
 * site writes it: a component preview's own direction control is scoped to that preview (preview-environment.tsx),
 * and this hook is how a preview learns the page's direction to start from. The server and the first client
 * render say "ltr", which is what the root layout renders.
 */
export function useDocumentDirection(): Direction {
  return React.useSyncExternalStore(subscribe, read, () => "ltr");
}

const read = (): Direction => (document.documentElement.getAttribute("dir") === "rtl" ? "rtl" : "ltr");

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
  return () => observer.disconnect();
}
