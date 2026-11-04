/** Small seedable PRNG (mulberry32) so battles are reproducible in tests. */
export interface Rng {
  next(): number; // [0, 1)
  int(min: number, max: number): number; // inclusive
  chance(pct: number): boolean; // pct in 0..100
  pick<T>(arr: readonly T[]): T;
}

export function createRng(seed = Date.now() >>> 0): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (pct) => next() * 100 < pct,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}

/** An Rng that replays a fixed sequence of values (cycled). Handy in tests. */
export function fixedRng(values: number[]): Rng {
  let i = 0;
  const next = () => values[i++ % values.length];
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (pct) => next() * 100 < pct,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}
