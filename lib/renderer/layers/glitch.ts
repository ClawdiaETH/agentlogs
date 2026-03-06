import type { LayerFn } from '../types';

/** Layer 6: Horizontal pixel displacement via getImageData/putImageData */
export const glitch: LayerFn = (ctx, rng, dayLog, _colors) => {
  const intensity = dayLog.glitchIndex / 100; // 0–1
  if (intensity < 0.05) return;

  // Scale band count and shift range with intensity
  const bandCount = 3 + Math.floor(intensity * 18);

  for (let i = 0; i < bandCount; i++) {
    const y = Math.floor(rng() * 740);
    const h = 2 + Math.floor(rng() * (10 + intensity * 60));
    const shift = Math.floor((rng() - 0.5) * intensity * 120);

    if (Math.abs(shift) < 1) continue;

    const safeY = Math.max(0, Math.min(y, 760 - h));
    const safeH = Math.min(h, 760 - safeY);
    if (safeH <= 0) continue;

    const imageData = ctx.getImageData(0, safeY, 760, safeH);
    ctx.putImageData(imageData, shift, safeY);

    // Fill the gap left behind with a colored band
    const gapAlpha = 0.04 + rng() * 0.08 + intensity * 0.06;
    if (shift > 0) {
      ctx.globalAlpha = gapAlpha;
      ctx.fillStyle = rng() > 0.5 ? '#ff0040' : '#00ff80';
      ctx.fillRect(0, safeY, shift, safeH);
    } else {
      ctx.globalAlpha = gapAlpha;
      ctx.fillStyle = rng() > 0.5 ? '#4000ff' : '#ff8000';
      ctx.fillRect(760 + shift, safeY, -shift, safeH);
    }
  }

  // At high intensity, add RGB channel-split effect
  if (intensity > 0.6) {
    const splitOffset = Math.floor(intensity * 6);
    const img = ctx.getImageData(0, 0, 760, 760);
    ctx.globalAlpha = 0.08 + intensity * 0.07;
    ctx.putImageData(img, splitOffset, 0);
    ctx.globalAlpha = 0.06 + intensity * 0.05;
    ctx.putImageData(img, -splitOffset, 0);
  }

  ctx.globalAlpha = 1;
};
