import { describe, expect, it } from "vitest";
import { SETTLE, advance, atRest, sampleSpring, type SpringSpec } from "./spring";

/**
 * The integrator's unit test. It asserts TIMES, not only end states, because the defect this file was written
 * against — feeding millisecond deltas into per-second spring constants — reaches the correct end state and
 * only its trajectory is wrong. A test that checked `x === target` after the run would have passed over a
 * spring that diverged to 33 million pixels and came back.
 */
describe("the settle spring", () => {
  it("is just under critically damped, so it does not cross its target", () => {
    const zeta = SETTLE.damping / (2 * Math.sqrt(SETTLE.stiffness * SETTLE.mass));
    expect(zeta).toBeGreaterThan(0.95);
    expect(zeta).toBeLessThan(1.1);
    const run = sampleSpring(0, 200, 0, SETTLE);
    expect(run.crossings).toBe(0);
  });

  it("settles in milliseconds, which is the unit the constants are NOT in", () => {
    const run = sampleSpring(0, 200, 0, SETTLE);
    expect(run.truncated).toBe(false);
    // `stiffness` and `damping` are per second; `advance` takes milliseconds. A run of 3ms or of 30,000ms
    // would each be that conversion dropped in one direction or the other, and both are excluded here.
    expect(run.duration).toBeGreaterThan(250);
    expect(run.duration).toBeLessThan(700);
  });

  it("covers 95% of any distance in about one `base` tier, whatever the distance", () => {
    // The claim the parity document makes, and the reason these constants and not others. A fixed-duration
    // curve cannot do this: it would take the same 300ms over 20px as over 600px.
    const times = [20, 100, 200, 400, 600].map((distance) => {
      const run = sampleSpring(0, distance, 0, SETTLE);
      const crossed = run.samples.find((s) => Math.abs(s.x) >= distance * 0.95);
      return { distance, t95: crossed?.t ?? Infinity };
    });
    for (const { distance, t95 } of times) {
      expect(t95, `${distance}px reached 95% at ${t95}ms`).toBeGreaterThan(200);
      expect(t95, `${distance}px reached 95% at ${t95}ms`).toBeLessThan(340);
    }
    // And they agree with each other, which is the distance independence itself rather than five coincidences.
    const spread = Math.max(...times.map((t) => t.t95)) - Math.min(...times.map((t) => t.t95));
    expect(spread).toBeLessThanOrEqual(16);
  });

  it("reaches its target from either direction and from any distance", () => {
    for (const [from, to] of [
      [0, 200],
      [200, 0],
      [-50, 50],
      [0, 1],
      [0, 2000],
    ]) {
      const run = sampleSpring(from, to, 0, SETTLE);
      expect(run.truncated, `${from} → ${to} never rested`).toBe(false);
      const last = run.samples[run.samples.length - 1];
      expect(Math.abs(last.x - to)).toBeLessThanOrEqual(SETTLE.restDistance);
    }
  });

  it("carries an initial velocity instead of discarding it", () => {
    // The whole point of integrating. A spring handed speed toward its target arrives sooner than one at rest;
    // handed speed away from it, later. A curve would produce the same duration for all three.
    const still = sampleSpring(0, 200, 0, SETTLE).duration;
    const toward = sampleSpring(0, 200, 600, SETTLE).duration;
    const away = sampleSpring(0, 200, -600, SETTLE).duration;
    expect(toward).toBeLessThan(still);
    expect(away).toBeGreaterThan(still);
  });

  it("gives the same trajectory whether time arrives in one long frame or many short ones", () => {
    // A backgrounded tab or a long task hands rAF a delta of hundreds of milliseconds. Sub-stepping is what
    // stops that from being a different animation — or, with an explicit integrator, a divergent one.
    const long = advance({ x: 0, v: 0 }, 200, 240, SETTLE);
    let short = { x: 0, v: 0 };
    for (let i = 0; i < 16; i += 1) short = advance(short, 200, 15, SETTLE);
    expect(Math.abs(long.x - short.x)).toBeLessThan(0.5);
    expect(Math.abs(long.v - short.v)).toBeLessThan(5);
  });

  it("does not diverge on a stiff spec or a long frame", () => {
    // The guard against the unit mix-up, stated as behaviour: no sampled position may leave the neighbourhood
    // of the run. Before the fix the first few frames reached ~3.3e7 px.
    const stiff: SpringSpec = { ...SETTLE, stiffness: 900, damping: 40 };
    for (const spec of [SETTLE, stiff]) {
      const run = sampleSpring(0, 300, 0, spec, 64);
      for (const sample of run.samples) {
        expect(Math.abs(sample.x), `|x| left the run's neighbourhood at t=${sample.t}`).toBeLessThan(2000);
      }
    }
  });

  it("reports rest by distance AND speed, so a fast pass through the target is not rest", () => {
    expect(atRest({ x: 200, v: 0 }, 200, SETTLE)).toBe(true);
    expect(atRest({ x: 200, v: 400 }, 200, SETTLE)).toBe(false);
    expect(atRest({ x: 150, v: 0 }, 200, SETTLE)).toBe(false);
  });
});
