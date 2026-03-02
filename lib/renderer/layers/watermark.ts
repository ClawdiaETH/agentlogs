import type { LayerFn } from '../types';

/** Layer 16: Seed hex + date string in lower corner */
export const watermark: LayerFn = (ctx, _rng, dayLog, colors) => {
  const seedHex = `0x${(dayLog.seed >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
  const dateStr = dayLog.date;

  ctx.globalAlpha = 0.25;
  ctx.fillStyle = colors.WHT;
  ctx.font = '10px JetBrainsMono';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${seedHex} / ${dateStr}`, 748, 748);

  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
};
