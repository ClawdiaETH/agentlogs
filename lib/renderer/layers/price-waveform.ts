import type { LayerFn } from '../types';

/** Layer 13: Distorted signal line with price/MCAP labels */
export const priceWaveform: LayerFn = (ctx, rng, dayLog, colors) => {
  const baseY = Math.floor(760 * 0.82); // ~82% from top
  const drift = dayLog.momentumSign * dayLog.momentumMag * 30; // -30 to +30
  const amplitude = 10 + dayLog.momentumMag * 40;

  // Main waveform line
  ctx.beginPath();
  ctx.strokeStyle = colors.DOM;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.4;

  for (let x = 0; x < 760; x += 2) {
    const noise = (rng() - 0.5) * amplitude;
    const wave = Math.sin((x / 760) * Math.PI * (3 + rng() * 2)) * (amplitude * 0.3);
    const y = baseY + drift + wave + noise;

    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Glitch tears — short horizontal displacements
  const tearCount = 2 + Math.floor(dayLog.glitchIndex / 25);
  for (let i = 0; i < tearCount; i++) {
    const tx = Math.floor(rng() * 700);
    const ty = baseY + drift + (rng() - 0.5) * amplitude;
    const tw = 20 + Math.floor(rng() * 60);
    ctx.globalAlpha = 0.15 + rng() * 0.15;
    ctx.fillStyle = colors.ACC;
    ctx.fillRect(tx, ty - 1, tw, 2);
  }

  // Price label
  const priceStr = dayLog.priceUsd > 0
    ? `$${dayLog.priceUsd < 0.01 ? dayLog.priceUsd.toExponential(2) : dayLog.priceUsd.toFixed(4)}`
    : '$0.00';
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = colors.WHT;
  ctx.font = '10px JetBrainsMono';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(priceStr, 748, baseY - 8);

  // MCAP label
  let mcapStr: string;
  if (dayLog.marketCap >= 1_000_000) {
    mcapStr = `MCAP $${(dayLog.marketCap / 1_000_000).toFixed(2)}M`;
  } else if (dayLog.marketCap >= 1_000) {
    mcapStr = `MCAP $${(dayLog.marketCap / 1_000).toFixed(1)}K`;
  } else {
    mcapStr = `MCAP $${dayLog.marketCap.toFixed(0)}`;
  }
  ctx.fillText(mcapStr, 748, baseY - 20);

  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
};
