import type { LayerFn } from '../types';

/** Layer 7: Structural geometry — rects, concentric squares, barcodes, crosses, dot grid, mosaic patches, edge bleeds */
export const geometry: LayerFn = (ctx, rng, dayLog, colors) => {
  const gi = dayLog.glitchIndex / 100; // 0–1

  // Filled rects with corner ticks
  const rectCount = 3 + Math.floor(rng() * 4);
  for (let i = 0; i < rectCount; i++) {
    const x = Math.floor(rng() * 600);
    const y = Math.floor(rng() * 600);
    const w = 40 + Math.floor(rng() * 160);
    const h = 30 + Math.floor(rng() * 120);

    ctx.globalAlpha = 0.04 + rng() * 0.06;
    ctx.fillStyle = rng() > 0.5 ? colors.DOM : colors.SEC;
    ctx.fillRect(x, y, w, h);

    // Corner ticks
    ctx.globalAlpha = 0.15 + rng() * 0.1;
    ctx.strokeStyle = colors.ACC;
    ctx.lineWidth = 1;
    const tickLen = 6;
    // Top-left
    ctx.beginPath(); ctx.moveTo(x, y + tickLen); ctx.lineTo(x, y); ctx.lineTo(x + tickLen, y); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(x + w - tickLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + tickLen); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(x, y + h - tickLen); ctx.lineTo(x, y + h); ctx.lineTo(x + tickLen, y + h); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(x + w - tickLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - tickLen); ctx.stroke();
  }

  // Concentric squares (center of canvas)
  const cx = 380 + Math.floor((rng() - 0.5) * 100);
  const cy = 380 + Math.floor((rng() - 0.5) * 100);
  const layers = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < layers; i++) {
    const size = 40 + i * 35;
    ctx.globalAlpha = 0.06 - i * 0.01;
    ctx.strokeStyle = colors.DOM;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
  }

  // Glitch strips — horizontal bars
  const stripCount = Math.floor(gi * 8);
  for (let i = 0; i < stripCount; i++) {
    const sy = Math.floor(rng() * 760);
    const sh = 1 + Math.floor(rng() * 3);
    const sx = Math.floor(rng() * 200);
    const sw = 100 + Math.floor(rng() * 500);
    ctx.globalAlpha = 0.06 + rng() * 0.08;
    ctx.fillStyle = colors.ACC;
    ctx.fillRect(sx, sy, sw, sh);
  }

  // Barcodes — thin vertical lines in a cluster
  const bcX = 560 + Math.floor(rng() * 120);
  const bcY = 100 + Math.floor(rng() * 400);
  const barCount = 8 + Math.floor(rng() * 12);
  for (let i = 0; i < barCount; i++) {
    const bw = 1 + Math.floor(rng() * 3);
    const bh = 20 + Math.floor(rng() * 40);
    ctx.globalAlpha = 0.1 + rng() * 0.1;
    ctx.fillStyle = rng() > 0.6 ? colors.WHT : colors.SEC;
    ctx.fillRect(bcX + i * 4, bcY, bw, bh);
  }

  // Crosses
  const crossCount = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < crossCount; i++) {
    const crx = Math.floor(rng() * 700);
    const cry = Math.floor(rng() * 700);
    const arm = 8 + Math.floor(rng() * 12);
    ctx.globalAlpha = 0.1 + rng() * 0.1;
    ctx.strokeStyle = colors.ACC;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(crx - arm, cry); ctx.lineTo(crx + arm, cry); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(crx, cry - arm); ctx.lineTo(crx, cry + arm); ctx.stroke();
  }

  // Dot grid — sparse
  const dotGridX = Math.floor(rng() * 300);
  const dotGridY = Math.floor(rng() * 300);
  const dotSpacing = 12 + Math.floor(rng() * 8);
  for (let dx = 0; dx < 8; dx++) {
    for (let dy = 0; dy < 8; dy++) {
      ctx.globalAlpha = 0.06 + rng() * 0.04;
      ctx.fillStyle = colors.SEC;
      ctx.fillRect(dotGridX + dx * dotSpacing, dotGridY + dy * dotSpacing, 2, 2);
    }
  }

  // Mosaic patches — small colored squares
  const patchCount = Math.floor(gi * 6);
  for (let i = 0; i < patchCount; i++) {
    const px = Math.floor(rng() * 720);
    const py = Math.floor(rng() * 720);
    const ps = 8 + Math.floor(rng() * 16);
    for (let mx = 0; mx < ps; mx += 4) {
      for (let my = 0; my < ps; my += 4) {
        ctx.globalAlpha = 0.08 + rng() * 0.08;
        ctx.fillStyle = [colors.DOM, colors.SEC, colors.ACC][Math.floor(rng() * 3)];
        ctx.fillRect(px + mx, py + my, 3, 3);
      }
    }
  }

  // Edge bleeds — thin lines at canvas edges
  for (let i = 0; i < 3; i++) {
    const edge = Math.floor(rng() * 4); // 0=top, 1=right, 2=bottom, 3=left
    ctx.globalAlpha = 0.06 + rng() * 0.06;
    ctx.fillStyle = colors.DOM;
    if (edge === 0) ctx.fillRect(0, 0, 760, 2);
    else if (edge === 1) ctx.fillRect(758, 0, 2, 760);
    else if (edge === 2) ctx.fillRect(0, 758, 760, 2);
    else ctx.fillRect(0, 0, 2, 760);
  }

  ctx.globalAlpha = 1;
};
