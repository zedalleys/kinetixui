/**
 * Seeded pseudo-randomness for the simulation. Nothing here reads a clock or `Math.random`: the same
 * inputs always give the same numbers, so a server render, a hydration and a test agree.
 */

/** FNV-1a over a string, folded to an unsigned 32-bit integer. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a tiny, fast, well-distributed 32-bit generator. Returns a function yielding [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One number in [0, 1) for a (seed, key, index) triple, independent of call order. Sensor drift uses
 * this instead of a running generator so the value at a given moment does not depend on how often the
 * simulation was ticked.
 */
export function noiseAt(seed: number, key: string, index: number): number {
  return mulberry32((hashString(key) ^ Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(index | 0, 0x85ebca6b)) >>> 0)();
}
