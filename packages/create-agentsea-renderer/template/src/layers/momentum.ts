import type { LayerFn } from '../types';

/** Layer 3: Green (up) or red (down) gradient wash, max 16% opacity */
export const momentum: LayerFn = (ctx, _rng, dayLog, _colors) => {
  const isUp = dayLog.momentumSign > 0;
  const mag = dayLog.momentumMag; // 0–1
  const alpha = Math.min(0.16, mag * 0.16);

  const color = isUp ? '#22c55e' : '#ef4444'; // green-500 / red-500
  const gradient = ctx.createLinearGradient(0, 0, 760, 760);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');

  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 760, 760);

  ctx.globalAlpha = 1;
};
