import type { LayerFn } from '../types';

/** Layer 11: Vertical hex columns in right half, density driven by commit count */
export const codeRain: LayerFn = (ctx, rng, dayLog, colors) => {
  const density = Math.min(1, dayLog.commitCount / 30);
  const columnCount = Math.floor(density * 18);
  if (columnCount === 0) return;

  ctx.font = '9px JetBrainsMono';
  ctx.textBaseline = 'top';

  for (let col = 0; col < columnCount; col++) {
    const x = 400 + Math.floor(rng() * 340);
    const charCount = 8 + Math.floor(rng() * 24);
    const startY = Math.floor(rng() * 200);

    for (let j = 0; j < charCount; j++) {
      const y = startY + j * 14;
      if (y > 720) break;

      const hex = Math.floor(rng() * 0xffff).toString(16).padStart(4, '0');
      const fade = 1 - (j / charCount);
      ctx.globalAlpha = (0.05 + rng() * 0.08) * fade;
      ctx.fillStyle = rng() > 0.8 ? colors.ACC : colors.SEC;
      ctx.fillText(hex, x, y);
    }
  }

  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
};
