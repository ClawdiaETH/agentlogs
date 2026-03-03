import type { LayerFn } from '../types';

/** Layer 2: Seeded random pixel scatter across canvas */
export const noise: LayerFn = (ctx, rng, _dayLog, colors) => {
  const count = 3000 + Math.floor(rng() * 2000);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * 760);
    const y = Math.floor(rng() * 760);
    const size = 1 + Math.floor(rng() * 2);
    const alpha = 0.02 + rng() * 0.06;
    const color = rng() > 0.5 ? colors.WHT : colors.DOM;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
};
