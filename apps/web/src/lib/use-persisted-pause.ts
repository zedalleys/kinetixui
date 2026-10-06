"use client";

import * as React from "react";

/**
 * A user's "stop this moving thing" choice that outlives the page view (WCAG 2.2.2 Pause, Stop, Hide).
 *
 * The server and the first client render are always "playing", so hydration matches; the stored choice is applied in
 * an effect straight after. Storage can be unavailable (private windows, blocked site data) — then the choice simply
 * lasts for the page view, and the control still works.
 */
export function usePersistedPause(key: string): [paused: boolean, toggle: () => void] {
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(key) === "paused") setPaused(true);
    } catch {
      /* storage blocked: the pause still works for this view */
    }
  }, [key]);

  const toggle = React.useCallback(() => {
    setPaused((was) => {
      const next = !was;
      try {
        if (next) window.localStorage.setItem(key, "paused");
        else window.localStorage.removeItem(key);
      } catch {
        /* storage blocked: the pause still works for this view */
      }
      return next;
    });
  }, [key]);

  return [paused, toggle];
}
