import type * as React from "react";

/**
 * Roving-focus keyboard handling for a radiogroup of buttons (`role="radio"`), shared by PillSelector and DateStrip.
 * Arrow keys move focus and selection; under RTL the horizontal arrows reverse, so the key that points toward the
 * next item on screen is the one that advances. Home and End jump. Direction is read from the nearest `dir`
 * attribute (falling back to the document), never from layout, so it is deterministic.
 */
export function rovingKeyDown(event: React.KeyboardEvent<HTMLElement>, ids: readonly string[], current: string, onChange: (id: string) => void) {
  const rtl = (event.currentTarget.closest("[dir]")?.getAttribute("dir") ?? document.documentElement.dir) === "rtl";
  const forward = rtl ? "ArrowLeft" : "ArrowRight";
  const backward = rtl ? "ArrowRight" : "ArrowLeft";
  const index = Math.max(0, ids.indexOf(current));
  let next = index;
  if (event.key === forward || event.key === "ArrowDown") next = (index + 1) % ids.length;
  else if (event.key === backward || event.key === "ArrowUp") next = (index - 1 + ids.length) % ids.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = ids.length - 1;
  else return;
  event.preventDefault();
  onChange(ids[next]!);
  const group = event.currentTarget.closest('[role="radiogroup"]');
  requestAnimationFrame(() => group?.querySelector<HTMLElement>(`[data-radio-id="${CSS.escape(ids[next]!)}"]`)?.focus());
}
