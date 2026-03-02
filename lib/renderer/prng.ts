/**
 * Mulberry32 — fast seeded 32-bit PRNG.
 * Deterministic: same seed always produces the same sequence.
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

/** Convert HSL (h: 0-360, s: 0-100, l: 0-100) to hex string */
export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Sample a color from a 6-element HSL range [hMin, hMax, sMin, sMax, lMin, lMax] */
export function sampleRole(rng: () => number, range: number[]): string {
  const [hMin, hMax, sMin, sMax, lMin, lMax] = range;
  const h = hMin + rng() * (hMax - hMin);
  const s = sMin + rng() * (sMax - sMin);
  const l = lMin + rng() * (lMax - lMin);
  return hslToHex(h, s, l);
}
