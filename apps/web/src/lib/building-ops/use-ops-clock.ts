"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type OpsClockOptions = {
  /** Milliseconds between updates. Defaults to 1000. */
  intervalMs?: number;
  /** A monotonic millisecond source. Defaults to `performance.now`; tests inject their own. */
  clock?: () => number;
  /** Start paused. */
  initiallyPaused?: boolean;
};

export type OpsClock = {
  /** Simulated milliseconds since the scenario started. */
  elapsedMs: number;
  playing: boolean;
  setPlaying: (playing: boolean) => void;
  /** Jump forward by a fixed amount, playing or paused. */
  step: (ms: number) => void;
  /** Back to the scenario start. */
  restart: () => void;
};

const defaultClock = () => (typeof performance !== "undefined" ? performance.now() : 0);

/**
 * The demo's only source of time. It starts at 0 on the server and on first render (so both agree), and only
 * advances after mount, by the real time that passed while playing and the page was visible. Everything shown
 * is derived from `elapsedMs` by pure functions, so stepping, pausing and restarting are exact.
 */
export function useOpsClock({ intervalMs = 1000, clock = defaultClock, initiallyPaused = false }: OpsClockOptions = {}): OpsClock {
  const [elapsedMs, setElapsed] = useState(0);
  const [playing, setPlayingState] = useState(!initiallyPaused);
  const clockRef = useRef(clock);
  clockRef.current = clock;
  const lastRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  const commit = useCallback((ms: number) => {
    elapsedRef.current = ms;
    setElapsed(ms);
  }, []);

  useEffect(() => {
    if (!playing) {
      lastRef.current = null;
      return;
    }
    lastRef.current = clockRef.current();
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        lastRef.current = clockRef.current();
        return;
      }
      const at = clockRef.current();
      const last = lastRef.current ?? at;
      lastRef.current = at;
      commit(elapsedRef.current + Math.max(0, at - last));
    }, intervalMs);
    // Browsers may suspend the interval while the tab is hidden, so the hidden check above never runs. Re-base
    // on the way back so the hidden time is skipped instead of added in one jump.
    const onVisibility = () => {
      if (document.visibilityState === "visible") lastRef.current = clockRef.current();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [playing, intervalMs, commit]);

  const setPlaying = useCallback((value: boolean) => setPlayingState(value), []);
  const step = useCallback(
    (ms: number) => {
      lastRef.current = clockRef.current();
      commit(elapsedRef.current + ms);
    },
    [commit],
  );
  const restart = useCallback(() => {
    lastRef.current = clockRef.current();
    commit(0);
  }, [commit]);

  return { elapsedMs, playing, setPlaying, step, restart };
}
