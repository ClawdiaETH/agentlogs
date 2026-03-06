import type { LayerFn } from '../types';

/** Palette name label in the top-left corner */
export const paletteLabel: LayerFn = (ctx, _rng, dayLog, colors) => {
  const label = (dayLog.paletteId ?? '').toUpperCase();
  if (!label) return;

  ctx.font = 'bold 9px JetBrainsMono';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = colors.WHT;
  ctx.fillText(label, 12, 12);

  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
};
