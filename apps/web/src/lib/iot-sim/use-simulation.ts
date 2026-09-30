"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { acknowledgeAlert, cancelCommand, createSimulation, dispatchCommand, hasCommandInFlight, retryCommand, setDeviceReachable, tick } from "./core";
import type { SimOptions, SimScenario, Simulation } from "./types";

export type UseIotSimulationOptions = SimOptions & {
  /** Milliseconds between ticks. Defaults to 500. */
  intervalMs?: number;
  /** Start paused. */
  initiallyPaused?: boolean;
  /** A monotonic millisecond source. Defaults to `performance.now`; tests inject their own. */
  clock?: () => number;
};

export type UseIotSimulation = {
  sim: Simulation;
  /** ISO time the simulation is at. Equals the scenario `startAt` until after mount. */
  now: string;
  paused: boolean;
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
  /** True when the user prefers reduced motion: ambient drift is off, commands still progress. */
  reducedMotion: boolean;
  dispatch: (deviceId: string, capabilityId: string, value: unknown) => void;
  retry: (commandId: string) => void;
  cancel: (commandId: string) => void;
  setReachable: (deviceId: string, reachable: boolean) => void;
  acknowledgeAlert: (alertId: string) => void;
  /** Advance by a fixed amount, even while paused. Also how a keyboard user single-steps the demo. */
  step: (ms?: number) => void;
  reset: () => void;
};

const defaultClock = () => (typeof performance !== "undefined" ? performance.now() : 0);

/**
 * Drive a `Simulation` from React.
 *
 * - The first render is `createSimulation(scenario)` at the scenario's fixed `startAt`, so server and
 *   client agree; time only advances after mount.
 * - One interval ticks the simulation. The simulated clock is `startAt` plus the time the simulation
 *   has actually been running (paused, hidden, or idle-under-reduced-motion time is not counted).
 * - `prefers-reduced-motion: reduce` turns ambient drift off: the interval only advances time while a
 *   command is in flight, so a request the user made still settles, and nothing else moves.
 * - The interval and listeners are removed on unmount.
 */
export function useIotSimulation(scenario: SimScenario, options: UseIotSimulationOptions = {}): UseIotSimulation {
  const { seed, startAt, intervalMs = 500, initiallyPaused = false, clock = defaultClock } = options;
  const [sim, setSim] = useState<Simulation>(() => createSimulation(scenario, { seed, startAt }));
  const [paused, setPausedState] = useState(initiallyPaused);
  const [reducedMotion, setReducedMotion] = useState(false);

  const simRef = useRef(sim);
  const pausedRef = useRef(paused);
  const reducedRef = useRef(false);
  const hiddenRef = useRef(false);
  const clockRef = useRef(clock);
  clockRef.current = clock;
  const timeRef = useRef<{ ms: number; last: number | null }>({ ms: Date.parse(sim.now), last: null });

  const commit = useCallback((next: Simulation) => {
    if (next === simRef.current) return;
    simRef.current = next;
    setSim(next);
  }, []);

  /** The simulated time to act at. Time flows only while `flow` is true; otherwise it holds. */
  const sample = useCallback((flow: boolean) => {
    const t = timeRef.current;
    const at = clockRef.current();
    if (flow && t.last !== null) t.ms += Math.max(0, at - t.last);
    t.last = at;
    return t.ms;
  }, []);

  const flows = () => !pausedRef.current && !hiddenRef.current;

  const setPaused = useCallback((value: boolean) => {
    pausedRef.current = value;
    timeRef.current.last = clockRef.current();
    setPausedState(value);
  }, []);
  const togglePaused = useCallback(() => setPaused(!pausedRef.current), [setPaused]);

  useEffect(() => {
    const media = typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const readMotion = () => {
      reducedRef.current = !!media?.matches;
      setReducedMotion(reducedRef.current);
    };
    readMotion();
    media?.addEventListener?.("change", readMotion);

    const onVisibility = () => {
      hiddenRef.current = typeof document !== "undefined" && document.hidden;
      // Restart the measuring window so time spent hidden is not counted when the tab returns.
      timeRef.current.last = clockRef.current();
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    timeRef.current.last = clockRef.current();
    const id = setInterval(() => {
      // Ambient drift is a continuous animation; under reduced motion only a command in flight may move time.
      const active = flows() && (!reducedRef.current || hasCommandInFlight(simRef.current));
      const ms = sample(active);
      if (active) commit(tick(simRef.current, ms));
    }, intervalMs);

    return () => {
      clearInterval(id);
      media?.removeEventListener?.("change", readMotion);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, commit, sample]);

  const act = useCallback(
    (fn: (current: Simulation, now: number) => Simulation) => {
      // A user action on an idle, reduced-motion page does not start ambient time; it acts "now" as held.
      const ms = sample(flows() && (!reducedRef.current || hasCommandInFlight(simRef.current)));
      commit(fn(simRef.current, ms));
    },
    [commit, sample],
  );

  const dispatch = useCallback((d: string, c: string, v: unknown) => act((s, now) => dispatchCommand(s, d, c, v, now)), [act]);
  const retry = useCallback((id: string) => act((s, now) => retryCommand(s, id, now)), [act]);
  const cancel = useCallback((id: string) => act((s, now) => cancelCommand(s, id, now)), [act]);
  const setReachable = useCallback((id: string, r: boolean) => act((s, now) => setDeviceReachable(s, id, r, now)), [act]);
  const ack = useCallback((id: string) => act((s, now) => acknowledgeAlert(s, id, now)), [act]);

  const step = useCallback(
    (ms = intervalMs) => {
      timeRef.current.ms += ms;
      timeRef.current.last = clockRef.current();
      commit(tick(simRef.current, timeRef.current.ms));
    },
    [commit, intervalMs],
  );

  const reset = useCallback(() => {
    const fresh = createSimulation(scenario, { seed, startAt });
    timeRef.current = { ms: Date.parse(fresh.now), last: clockRef.current() };
    simRef.current = fresh;
    setSim(fresh);
  }, [scenario, seed, startAt]);

  return useMemo(
    () => ({ sim, now: sim.now, paused, setPaused, togglePaused, reducedMotion, dispatch, retry, cancel, setReachable, acknowledgeAlert: ack, step, reset }),
    [sim, paused, setPaused, togglePaused, reducedMotion, dispatch, retry, cancel, setReachable, ack, step, reset],
  );
}
