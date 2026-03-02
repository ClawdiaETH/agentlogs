import type { LayerFn } from '../types';

/** Layer 14: Full-canvas horizontal lines, opacity scaled by glitchIndex */
export const scanlines: LayerFn = (ctx, _rng, dayLog, colors) => {
  const intensity = Math.min(1, dayLog.glitchIndex / 100);
  const alpha = 0.02 + intensity * 0.06;

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colors.WHT;
  ctx.lineWidth = 1;

  for (let y = 0; y < 760; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(760, y + 0.5);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
};
