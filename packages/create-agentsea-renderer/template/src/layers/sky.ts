import type { LayerFn } from '../types';

/** Layer 4: DOM color linear gradient over top 60% of canvas */
export const sky: LayerFn = (ctx, _rng, _dayLog, colors) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, 456);
  gradient.addColorStop(0, colors.DOM);
  gradient.addColorStop(1, 'transparent');

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 760, 456);

  ctx.globalAlpha = 1;
};
