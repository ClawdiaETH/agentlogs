import type { LayerFn } from '../types';

/** Layer 5: Tall vertical streaks in DOM/SEC, width scaled by mcapNorm */
export const waterfall: LayerFn = (ctx, rng, dayLog, colors) => {
  const scale = 1 + dayLog.mcapNorm * 0.8; // 1.0–1.8
  const streakCount = 12 + Math.floor(rng() * 8);

  for (let i = 0; i < streakCount; i++) {
    const x = Math.floor(rng() * 760);
    const width = Math.floor((2 + rng() * 6) * scale);
    const height = 200 + Math.floor(rng() * 500);
    const y = Math.floor(rng() * (760 - height));

    ctx.globalAlpha = 0.04 + rng() * 0.06;
    ctx.fillStyle = rng() > 0.5 ? colors.DOM : colors.SEC;
    ctx.fillRect(x, y, width, height);
  }

  ctx.globalAlpha = 1;
};
