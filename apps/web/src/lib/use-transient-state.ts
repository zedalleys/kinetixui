"use client";

import * as React from "react";

/**
 * State that returns to its initial value after `ms`, with the timer cleared on unmount.
 *
 * A bare `setTimeout` inside a click handler or a promise callback outlives the component that started it.
 * Two things follow, and both have been seen here: navigating away within the delay sets state on an
 * unmounted component, and under jsdom the callback fires after the environment is torn down, surfacing as
 * `ReferenceError: window is not defined` in whichever test happens to be running by then — a failure that
 * belongs to no test and does not reproduce on a re-run. Holding the id in a ref is what makes the reset safe.
 *
 * Starting a new window also clears the one in flight, so repeated use extends the window rather than letting
 * the first timer cut the last one short.
 */
export function useTransientState<T>(initial: T, ms: number): [T, (value: T) => void] {
  const [value, setValue] = React.useState(initial);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Read through a ref so a caller passing a fresh object or array each render does not change `show`.
  const initialRef = React.useRef(initial);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  const show = React.useCallback(
    (next: T) => {
      clearTimeout(timer.current);
      setValue(next);
      timer.current = setTimeout(() => setValue(initialRef.current), ms);
    },
    [ms],
  );

  return [value, show];
}
