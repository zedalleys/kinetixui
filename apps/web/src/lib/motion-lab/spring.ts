/**
 * A damped-spring integrator, in pixels, with an initial velocity.
 *
 * ── Why this exists, and why it is not a token ──────────────────────────────
 *
 * MOTION.md is explicit that springs are NOT tokens: CSS has no spring timing function, and SwiftUI,
 * Compose and Flutter each take different spring parameters that do not map one to one. Nothing here
 * changes that. This is a LABORATORY instrument: it exists so a React lab can render a spring whose
 * retargeting behaviour can be measured, and so the five-platform parity document can state the intent
 * ("settle") and each platform's own parameters against a reference that was actually integrated rather
 * than guessed. It defines no token, exports from no published package, and claims no platform.
 *
 * ── Why an integrator and not a sampled easing curve ───────────────────────
 *
 * The brief's hardest requirement is continuity: a travelling indicator interrupted halfway to B and
 * retargeted to C must continue from the position AND the speed it currently has. A curve — CSS
 * transition, WAAPI keyframes, a cubic-bezier — carries position across an interruption but not
 * velocity: the new run starts from rest, so the indicator visibly stalls at the moment of retargeting.
 * Integrating the spring keeps `v` as state, so a retarget is just a new target for the same
 * oscillator. That is the whole reason this file is 80 lines of physics rather than a bezier.
 *
 * Semi-implicit (symplectic) Euler at a fixed 1ms step. Chosen over RK4 or the closed form because:
 *   - it is unconditionally stable for the stiffnesses this lab uses, where explicit Euler is not;
 *   - a fixed step makes the output a pure function of the inputs, so the unit test can assert exact
 *     settle times and overshoot counts rather than "roughly";
 *   - the closed form has three cases (under-, critically-, over-damped) and a removable singularity at
 *     zeta == 1, which is precisely the parameterisation a UI spring wants to sit near.
 *
 * The integrator is deliberately pure and frame-independent: `advance` takes a millisecond delta, so the
 * same code backs both an offline sample (the test, and the keyframe generator) and a live rAF loop that
 * is handed whatever delta the browser gives it, including a long one after a background tab.
 */

/** A spring's shape. `mass` is kept explicit rather than folded into the other two so the parity document can state all three for each platform. */
export interface SpringSpec {
  /** Pull toward the target, per pixel. Higher is snappier. */
  readonly stiffness: number;
  /** Resistance proportional to velocity. Higher settles sooner with less overshoot. */
  readonly damping: number;
  readonly mass: number;
  /** Below this distance AND this speed, the spring is at rest. Sub-pixel: a settle a reader cannot see is a settle. */
  readonly restDistance: number;
  /** Pixels per SECOND, the same time base as `stiffness` and `damping`. */
  readonly restVelocity: number;
  /** A hard ceiling, so a mis-parameterised spring cannot run forever. Reaching it is a defect, and `sampleSpring` reports it. */
  readonly maxDuration: number;
}

/**
 * The lab's one spring, intent name `settle`.
 *
 * Damping ratio zeta = damping / (2 * sqrt(stiffness * mass)) = 36 / (2 * sqrt(320)) = 1.006 — a hair past
 * critical, so it never crosses its target and there is no bounce to explain away, while still reading as
 * physical rather than eased.
 *
 * The parameters were chosen against a MEASURED number rather than by feel. Integrated, this spring covers 95%
 * of its distance in 269ms for every distance from 20px to 600px, which is within a tenth of `--duration-base`
 * (300ms) — so a reader cannot tell the spring variant from the eased one by how long the arrival takes, which
 * is the point: the variants should differ in character, not in pace. Full rest, at half a pixel and 20px/s,
 * takes 317ms over 20px and 547ms over 600px. Both numbers matter and they say different things: the first is
 * when the move is over to a reader, the second is when the integrator stops writing, and only the second is a
 * cost.
 *
 * Distance independence is what a spring gives that a fixed-duration curve cannot. The eased variants cross
 * 20px and 600px in the same 300ms, so the short move crawls and the long one races; this covers both in the
 * same perceived time at a speed set by the distance.
 *
 * `stiffness` and `damping` are per SECOND, which is the convention every platform's spring API uses and the
 * only one in which these numbers mean what a reader of SwiftUI or Compose code expects. The integrator
 * therefore converts the millisecond deltas a browser hands it into seconds. Getting that conversion wrong is
 * not a slightly-off animation: with `deltaMs` fed straight in, the acceleration term is 1,000,000x too large
 * and the oscillator diverges to ~2^25 pixels within a handful of frames. That is how this was found — the
 * browser gate measured a 33,554,434px step across a retarget — and it is why `advance` has a unit test that
 * asserts a settle time in milliseconds rather than only a final position.
 */
export const SETTLE: SpringSpec = {
  stiffness: 320,
  damping: 36,
  mass: 1,
  restDistance: 0.5,
  restVelocity: 20,
  maxDuration: 1200,
};

export interface SpringState {
  /** Current position, in pixels. */
  x: number;
  /** Current velocity, in pixels per SECOND. */
  v: number;
}

/**
 * Advances a spring toward `target` by `deltaMs`, mutating nothing: the caller owns the state.
 *
 * Integrated in 1ms sub-steps whatever the delta, so a 300ms frame gap (a backgrounded tab, a long task)
 * produces the same trajectory as twenty 15ms frames rather than exploding. The remainder is integrated as
 * one short final sub-step, so no time is lost or double-counted.
 *
 * `deltaMs` is milliseconds, because that is what `requestAnimationFrame` and `performance.now()` deal in.
 * The physics is in seconds.
 */
export function advance(state: SpringState, target: number, deltaMs: number, spec: SpringSpec): SpringState {
  let { x, v } = state;
  let remaining = Math.max(0, deltaMs);
  while (remaining > 0) {
    const stepMs = Math.min(1, remaining);
    remaining -= stepMs;
    const dt = stepMs / 1000;
    const acceleration = (-spec.stiffness * (x - target) - spec.damping * v) / spec.mass;
    v += acceleration * dt;
    x += v * dt;
  }
  return { x, v };
}

/** True once the spring is both close enough and slow enough to stop. */
export function atRest(state: SpringState, target: number, spec: SpringSpec): boolean {
  return Math.abs(state.x - target) <= spec.restDistance && Math.abs(state.v) <= spec.restVelocity;
}

export interface SpringSample {
  /** Milliseconds from the start of this run. */
  readonly t: number;
  readonly x: number;
  /** Pixels per second. */
  readonly v: number;
}

export interface SpringRun {
  readonly samples: readonly SpringSample[];
  /** Milliseconds to rest, or `maxDuration` if it never rested. */
  readonly duration: number;
  /** True if the run hit `maxDuration` without resting. A caller should treat this as a defect, not a long animation. */
  readonly truncated: boolean;
  /** How many times the trajectory crossed the target. 0 for the lab's `settle`; a bouncier spec would report more. */
  readonly crossings: number;
}

/**
 * Integrates a whole run offline. Used by the unit test and by the parity document's reference numbers;
 * the live indicator uses `advance` directly, frame by frame, so that a retarget never has to discard a
 * precomputed trajectory.
 *
 * `stride` is the sampling interval, not the integration step: the physics always runs at 1ms.
 */
export function sampleSpring(
  from: number,
  to: number,
  velocity: number,
  spec: SpringSpec = SETTLE,
  stride = 8,
): SpringRun {
  const samples: SpringSample[] = [{ t: 0, x: from, v: velocity }];
  let state: SpringState = { x: from, v: velocity };
  let t = 0;
  let crossings = 0;
  let side = Math.sign(from - to);
  let truncated = true;
  while (t < spec.maxDuration) {
    const dt = Math.min(stride, spec.maxDuration - t);
    state = advance(state, to, dt, spec);
    t += dt;
    const nextSide = Math.sign(state.x - to);
    if (nextSide !== 0 && side !== 0 && nextSide !== side) crossings += 1;
    if (nextSide !== 0) side = nextSide;
    samples.push({ t, x: state.x, v: state.v });
    if (atRest(state, to, spec)) {
      truncated = false;
      break;
    }
  }
  return { samples, duration: t, truncated, crossings };
}
