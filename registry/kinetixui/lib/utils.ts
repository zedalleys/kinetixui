import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The Material type-scale utilities (`text-label-md`, `text-body-sm`, …) come
// from `fontSize` in tailwind.config.ts. Without this, tailwind-merge reads them
// as text *colours* and drops a real colour class (`text-primary-foreground`).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-lg", "display-md", "display-sm",
            "headline-lg", "headline-md", "headline-sm",
            "title-lg", "title-md", "title-sm", "title-dialog",
            "label-lg", "label-md", "label-sm",
            "body-lg", "body-md", "body-sm",
          ],
        },
      ],
    },
  },
});

/** Merges Tailwind class names, resolving conflicts (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Keeps the keyboard somewhere useful when a control removes the row it lives in.
 *
 * A remove button inside a chip or a list row destroys itself. Nothing then holds focus, so the
 * browser drops it on `<body>` and the next Tab starts again from the top of the document — a
 * keyboard user clearing three chips is sent back to the beginning after each one.
 *
 * Call this from the removing control's own handler, with the control and a selector that matches
 * one peer per removable row. The surviving peer is chosen BEFORE the removal, from document order:
 * the next row's control, or the previous one when the last row goes. It is focused once the
 * removal has actually happened — proven by the trigger having left the document, so a handler
 * that decides not to remove anything leaves focus exactly where the user put it.
 *
 * @param trigger the control that was activated
 * @param peerSelector a selector matching the equivalent control on every row, e.g. "[data-kx-remove]"
 * @param options.scope where to look for peers; defaults to the trigger's parent list or its document
 * @param options.fallback where to go when no row survives — a chip group's own input, say
 *
 * Limit: the removal is expected to commit within a microtask or the next animation frame, which is
 * what a React state update from a click does. A removal awaited behind a network call lands later
 * than that, and its focus is the caller's to manage.
 */
export function focusAfterRemoval(
  trigger: HTMLElement | null | undefined,
  peerSelector: string,
  options: { scope?: HTMLElement | null; fallback?: HTMLElement | null } = {},
): void {
  if (!trigger?.isConnected) return;
  const scope = options.scope ?? trigger.closest("ul, ol, [data-kx-removable-group]") ?? trigger.ownerDocument.body;
  const peers = Array.from(scope.querySelectorAll<HTMLElement>(peerSelector));
  const here = peers.indexOf(trigger);
  const survivor = here < 0 ? null : (peers[here + 1] ?? peers[here - 1] ?? null);
  const target = survivor ?? options.fallback ?? null;
  if (!target) return;

  const settle = () => {
    // The trigger is still there: nothing was removed, so nothing should move.
    if (trigger.isConnected) return false;
    if (target.isConnected) target.focus();
    return true;
  };
  queueMicrotask(() => {
    if (settle()) return;
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(settle);
  });
}
