/**
 * Deterministic pseudo-randomness, shared by the analytics engine and the
 * reference dataset generator.
 *
 * Both need values that are stable across runs for the same inputs: the engine
 * so that repeating a request returns the same result, the generator so that
 * regenerating a reference dataset produces byte-identical output instead of a
 * spurious diff on every run.
 */

/** 32-bit FNV-1a. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Small deterministic PRNG, seeded by hashString. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Value uniformly distributed in `base ± amplitude`, seeded by `seed`. */
export function jitter(seed: string, base: number, amplitude: number): number {
  const rng = mulberry32(hashString(seed));
  return base + (rng() - 0.5) * 2 * amplitude;
}
