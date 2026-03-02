import type { LayerFn } from '../types';

/** Layer 1: Solid BLK fill */
export const background: LayerFn = (ctx, _rng, _dayLog, colors) => {
  ctx.fillStyle = colors.BLK;
  ctx.fillRect(0, 0, 760, 760);
};
