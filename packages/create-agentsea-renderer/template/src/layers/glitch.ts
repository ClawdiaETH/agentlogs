import type { LayerFn } from '../types';

/** Layer 6: Horizontal pixel displacement via getImageData/putImageData */
export const glitch: LayerFn = (ctx, rng, dayLog, _colors) => {
  const intensity = dayLog.glitchIndex / 100; // 0–1
  if (intensity < 0.05) return;

  const bandCount = 2 + Math.floor(intensity * 8);

  for (let i = 0; i < bandCount; i++) {
    const y = Math.floor(rng() * 740);
    const h = 2 + Math.floor(rng() * (10 + intensity * 30));
    const shift = Math.floor((rng() - 0.5) * intensity * 60);

    if (Math.abs(shift) < 1) continue;

    const safeY = Math.max(0, Math.min(y, 760 - h));
    const safeH = Math.min(h, 760 - safeY);
    if (safeH <= 0) continue;

    const imageData = ctx.getImageData(0, safeY, 760, safeH);
    ctx.putImageData(imageData, shift, safeY);

    // Fill the gap left behind with a faint color band
    if (shift > 0) {
      ctx.globalAlpha = 0.03 + rng() * 0.05;
      ctx.fillStyle = rng() > 0.5 ? '#ff0040' : '#00ff80';
      ctx.fillRect(0, safeY, shift, safeH);
    } else {
      ctx.globalAlpha = 0.03 + rng() * 0.05;
      ctx.fillStyle = rng() > 0.5 ? '#4000ff' : '#ff8000';
      ctx.fillRect(760 + shift, safeY, -shift, safeH);
    }
  }

  ctx.globalAlpha = 1;
};
