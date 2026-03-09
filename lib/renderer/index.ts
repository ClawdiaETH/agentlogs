/**
 * index.ts — Corrupt Memory renderer v3.
 * Direct port of the original HTML canvas renderer.
 * Pixel sorting + RGB channel shift + ridge terrain + vignette.
 */

import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { rc, generateColors, selectPaletteId, PALETTES, type RGB } from './palette';
import type { DayLog } from './types';
import { syntheticEvents } from './utils';

const W = 760, H = 760;

const KNOWN_REPOS: Record<string, string> = {
  'agentsea': 'AS', 'agentlogs': 'AL', 'clawd': 'CL',
  'spellblock': 'SB', 'anons-dao': 'AN', 'agentfails-wtf': 'AF',
  'bankrclub-ens': 'BC', 'clawduct-hunt': 'CD', 'sunset-protocol': 'SP',
  'clawdia-glitch': 'CG', 'onchain-lobsters': 'OL',
};

/** XOR-shift seeded RNG — matches original */
function xorRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
}

/** Synthesize 24-hour activity curve from peakHour */
function buildHourlyData(peakHour: number, rng: () => number): number[] {
  return Array.from({ length: 24 }, (_, h) => {
    const base = 0.08 + rng() * 0.12;
    const peak = Math.exp(-Math.pow(h - peakHour, 2) / 8) * 0.85;
    const burst = rng() < 0.18 ? rng() * 0.55 : 0;
    return Math.min(1, base + peak + burst);
  });
}

let fontRegistered = false;
function ensureFont() {
  if (fontRegistered) return;
  try {
    GlobalFonts.registerFromPath(
      path.join(process.cwd(), 'public/fonts/JetBrainsMono-Regular.ttf'),
      'JetBrainsMono',
    );
  } catch { /* fallback */ }
  fontRegistered = true;
}

export function renderImage(dayLog: DayLog): Buffer {
  ensureFont();

  const seed = (dayLog.dayNumber * 0x9e3779b9) % 0x100000000;

  // Independent RNGs per layer (matches original)
  const rng      = xorRng(seed);
  const colorRng = xorRng((seed ^ 0xc0a7d1a5) >>> 0);
  const commitRng = xorRng((seed ^ 0xc0de0000) >>> 0);
  const rainRng  = xorRng((seed ^ 0x2a10000) >>> 0);
  const repoRng  = xorRng((seed ^ 0xfe9a0000) >>> 0);
  const waveRng  = xorRng((seed ^ 0xd1ce5700) >>> 0);
  const hoursRng = xorRng((seed ^ 0xab1234cd) >>> 0);

  const { errors = 0, txns = 0, posts = 0, messages = 0,
    peakHour = 14, glitchIndex = 0, mcapNorm = 0.5,
    momentumSign = 0, momentumMag = 0, change24h = 0,
    priceUsd = 0, marketCap = 0, commits = [], commitCount = 0,
    reposActive = [], dayNumber, date } = dayLog;

  // Palette
  const palId = selectPaletteId(errors, txns, posts, peakHour, glitchIndex);
  const pal = PALETTES.find(p => p.id === palId)!;
  const [DOM, SEC, ACC, BLK, WHT] = generateColors(palId, seed);

  const intensity = Math.max(0.15, glitchIndex / 100);
  const hourlyData = buildHourlyData(peakHour, hoursRng);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ── BACKGROUND ──────────────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, rc(BLK, 1));
  bgGrad.addColorStop(1, 'rgb(2,2,6)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── MARKET CAP MOMENTUM OVERLAY ─────────────────────────────────────────
  if (momentumSign !== 0) {
    const mColor: RGB = momentumSign > 0 ? [0,255,120] : [255,30,60];
    const mAlpha = 0.04 + momentumMag * 0.12;
    const mGrad = ctx.createLinearGradient(0, H*0.3, 0, H*0.75);
    mGrad.addColorStop(0, rc(mColor, 0));
    mGrad.addColorStop(0.5, rc(mColor, mAlpha));
    mGrad.addColorStop(1, rc(mColor, 0));
    ctx.fillStyle = mGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // ── SKY WASH ─────────────────────────────────────────────────────────────
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  skyGrad.addColorStop(0, rc(DOM, 0.6 + rng() * 0.25));
  skyGrad.addColorStop(0.65, rc(DOM, 0.1));
  skyGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H * 0.6);

  // ── HORIZON GLOW (SEC) ───────────────────────────────────────────────────
  const hgx = W * (0.28 + rng() * 0.44), hgy = H * (0.4 + rng() * 0.12);
  const hGlow = ctx.createRadialGradient(hgx, hgy, 0, hgx, hgy, W * (0.5 + rng() * 0.25));
  hGlow.addColorStop(0, rc(SEC, 0.55 + rng() * 0.2));
  hGlow.addColorStop(0.5, rc(SEC, 0.1));
  hGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hGlow;
  ctx.fillRect(0, 0, W, H * 0.7);

  // ── ACCENT GLOW (ACC) ────────────────────────────────────────────────────
  const agx = W * (0.55 + rng() * 0.3), agy = H * (0.15 + rng() * 0.2);
  const aGlow = ctx.createRadialGradient(agx, agy, 0, agx, agy, W * (0.32 + rng() * 0.2));
  aGlow.addColorStop(0, rc(ACC, 0.35 + rng() * 0.2));
  aGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aGlow;
  ctx.fillRect(0, 0, W, H * 0.6);

  // ── RIDGE TERRAIN ────────────────────────────────────────────────────────
  const ridgeCols: RGB[] = [DOM, SEC, ACC];
  for (let r = 0; r < 3; r++) {
    const yBase = H * (0.3 + r * 0.14 + rng() * 0.05);
    const rc2 = ridgeCols[r];
    const dark = 0.1 + r * 0.06;

    ctx.beginPath();
    ctx.moveTo(0, H);
    let x = 0;
    while (x <= W) {
      ctx.lineTo(x, yBase + Math.sin(x * 0.003 + rng() * 6) * H * 0.08 + (rng() - 0.5) * H * 0.04);
      x += 6 + rng() * 18;
    }
    ctx.lineTo(W, H);
    ctx.closePath();

    const rfill = ctx.createLinearGradient(0, yBase, 0, H);
    rfill.addColorStop(0, `rgba(${rc2[0]*dark*4|0},${rc2[1]*dark*2.5|0},${rc2[2]*dark*4.5|0},1)`);
    rfill.addColorStop(0.4, rc(BLK, 1));
    rfill.addColorStop(1, 'rgb(2,2,5)');
    ctx.fillStyle = rfill;
    ctx.fill();

    ctx.strokeStyle = rc(rc2, 0.45 + rng() * 0.45);
    ctx.lineWidth = 2 + rng() * 3;
    ctx.stroke();
  }

  // ── CLIFF / WATERFALL ────────────────────────────────────────────────────
  const wfX = W * (0.18 + rng() * 0.15);
  const wfW = W * (0.28 + rng() * 0.14);
  const wfY = H * 0.3, wfH = H * 0.7;

  const cliffGrad = ctx.createLinearGradient(wfX, wfY, wfX, wfY + wfH);
  cliffGrad.addColorStop(0, rc(BLK, 0.92));
  cliffGrad.addColorStop(1, 'rgba(2,2,6,1)');
  ctx.fillStyle = cliffGrad;
  ctx.fillRect(wfX, wfY, wfW, wfH);

  const wfCols: RGB[] = [DOM, SEC, ACC, WHT, WHT, ACC];
  for (let i = 0; i < 30; i++) {
    const sx = wfX + rng() * wfW, sy = wfY + rng() * wfH * 0.15;
    const mcapBoost = 1 + mcapNorm * 0.8;
    const len = H * (0.25 + rng() * 0.65);
    const w = (2 + rng() * 22) * mcapBoost;
    const wc = wfCols[Math.floor(rng() * wfCols.length)];
    const isLight = wc === WHT || wc === ACC;
    const alpha = isLight ? 0.3 + rng() * 0.6 : 0.1 + rng() * 0.4;
    const sg = ctx.createLinearGradient(sx, sy, sx, sy + len);
    sg.addColorStop(0, rc(wc, alpha));
    sg.addColorStop(0.4, rc(wc, alpha * 0.5));
    sg.addColorStop(1, rc(wc, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(sx - w/2, sy, w, len);
  }

  // ── GROUND ───────────────────────────────────────────────────────────────
  const gGrad = ctx.createLinearGradient(0, H * 0.68, 0, H);
  gGrad.addColorStop(0, `rgba(${SEC[0]*0.15|0},${SEC[1]*0.1|0},${SEC[2]*0.2|0},1)`);
  gGrad.addColorStop(0.35, rc(BLK, 1));
  gGrad.addColorStop(1, 'rgb(2,2,5)');
  ctx.fillStyle = gGrad;
  ctx.fillRect(0, H * 0.68, W, H * 0.32);

  // ── PIXEL SORTING GLITCH ─────────────────────────────────────────────────
  // The heart of the original: sort pixels by luminance in activity-driven strips.
  {
    const imageData = ctx.getImageData(0, 0, W, H);
    const data = imageData.data;

    for (let y = 0; y < H; y++) {
      const activity = hourlyData[Math.floor((y / H) * 24)] || 0;
      if (rng() > activity * intensity * 0.95) continue;
      const stripLen = Math.floor(rng() * W * activity * intensity);
      const startX = Math.floor(rng() * Math.max(1, W - stripLen));
      const endX = Math.min(W - 1, startX + stripLen);

      const strip: [number, number, number, number][] = [];
      for (let x = startX; x <= endX; x++) {
        const i = (y * W + x) * 4;
        strip.push([data[i], data[i+1], data[i+2], data[i+3]]);
      }
      strip.sort((a, b) => (a[0]+a[1]+a[2]) - (b[0]+b[1]+b[2]));
      strip.forEach(([r, g, b, a], idx) => {
        const i = (y * W + startX + idx) * 4;
        data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = a;
      });
    }

    // RGB channel shift
    const disp = Math.floor(intensity * 35);
    const dispData = new Uint8ClampedArray(data);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        data[i]   = dispData[(y * W + Math.min(W-1, x + disp)) * 4];
        data[i+2] = dispData[(y * W + Math.max(0, x - Math.floor(disp * 0.75))) * 4 + 2];
      }
    }

    // Row displacement
    for (let y = 0; y < H; y++) {
      if (rng() > intensity * 0.28) continue;
      const dx = Math.floor((rng() - 0.5) * intensity * 100);
      if (Math.abs(dx) < 4) continue;
      for (let x = 0; x < W; x++) {
        const srcX = ((x + dx) + W) % W;
        const si = (y * W + srcX) * 4, di = (y * W + x) * 4;
        data[di] = data[si]; data[di+1] = data[si+1]; data[di+2] = data[si+2];
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // ── GEOMETRY ─────────────────────────────────────────────────────────────
  // Large rects
  for (let a = 0; a < 1 + Math.floor(rng() * 3); a++) {
    const col: RGB = [DOM, SEC, BLK][Math.floor(rng() * 3)];
    const ax = Math.floor(rng() * W * 0.5), ay = Math.floor(rng() * H * 0.5);
    const aw = W * (0.25 + rng() * 0.4), ah = H * (0.2 + rng() * 0.35);
    ctx.fillStyle = rc(col, 0.18 + rng() * 0.3);
    ctx.fillRect(ax, ay, aw, ah);
    ctx.strokeStyle = rc(rng() < 0.5 ? WHT : ACC, 0.5 + rng() * 0.4);
    ctx.lineWidth = 2 + rng() * 3;
    ctx.strokeRect(ax, ay, aw, ah);
    const tick = W * 0.04 + rng() * W * 0.04;
    ctx.strokeStyle = rc(ACC, 0.8 + rng() * 0.2);
    ctx.lineWidth = 2.5;
    ([[ax,ay,1,1],[ax+aw,ay,-1,1],[ax,ay+ah,1,-1],[ax+aw,ay+ah,-1,-1]] as [number,number,number,number][]).forEach(([px,py,ddx,ddy]) => {
      ctx.beginPath(); ctx.moveTo(px + ddx*tick, py); ctx.lineTo(px, py); ctx.lineTo(px, py + ddy*tick); ctx.stroke();
    });
  }

  // Concentric squares
  for (let i = 0; i < 1 + Math.floor(rng() * 2); i++) {
    const s2 = W * (0.25 + rng() * 0.38);
    const sx = Math.floor(rng() * (W - s2)), sy = Math.floor(rng() * (H - s2));
    const sqCols: RGB[] = [WHT, ACC, SEC, DOM];
    for (let d = 0; d < 4; d++) {
      const off = d * W * 0.025;
      ctx.strokeStyle = rc(sqCols[d], (0.6 - d * 0.12) * intensity);
      ctx.lineWidth = d === 0 ? 3 : 1.5;
      ctx.strokeRect(sx - off, sy - off, s2 + off * 2, s2 + off * 2);
    }
    ctx.fillStyle = rc(BLK, 0.55);
    ctx.fillRect(sx, sy, s2, s2);
  }

  // Glitch strips (tall bands)
  for (let h = 0; h < Math.floor(intensity * 28); h++) {
    const bx = Math.floor(rng() * W * 0.4), by = Math.floor(rng() * H);
    const bw = Math.floor(rng() * W * 0.85);
    const bh = 2 + Math.floor(rng() * 18);
    const gc: RGB = rng() < 0.45 ? ACC : rng() < 0.5 ? WHT : DOM;
    ctx.fillStyle = rc(gc, 0.2 + rng() * 0.6);
    ctx.fillRect(bx, by, bw, bh);
  }

  // Barcode
  for (let b = 0; b < 1 + Math.floor(rng() * 2); b++) {
    const bx = Math.floor(rng() * W * 0.6), by = Math.floor(rng() * H * 0.3);
    const bw = W * (0.25 + rng() * 0.45);
    let cy = by;
    for (let sl = 0; sl < 12; sl++) {
      const sh = 4 + Math.floor(rng() * 32);
      const col: RGB = sl%4===0 ? WHT : sl%4===2 ? ACC : sl%3===0 ? DOM : BLK;
      const alpha = col===WHT ? 0.8+rng()*0.2 : col===BLK ? 0.9 : 0.45+rng()*0.45;
      ctx.fillStyle = rc(col, alpha);
      ctx.fillRect(bx, cy, bw, sh);
      cy += sh + Math.floor(rng() * 12);
    }
  }

  // Crosses
  for (let c = 0; c < 2 + Math.floor(rng() * 3); c++) {
    const xCol: RGB = rng() < 0.55 ? WHT : rng() < 0.6 ? ACC : DOM;
    const cx = Math.floor(W*0.1 + rng()*W*0.8), cy = Math.floor(H*0.1 + rng()*H*0.8);
    const sz = W * (0.08 + rng() * 0.18);
    ctx.strokeStyle = rc(xCol, 0.55 + rng() * 0.45);
    ctx.lineWidth = 2 + rng() * 5;
    ctx.beginPath();
    ctx.moveTo(cx-sz, cy); ctx.lineTo(cx+sz, cy);
    ctx.moveTo(cx, cy-sz); ctx.lineTo(cx, cy+sz);
    ctx.stroke();
  }

  // Dot grid
  const gridStep = W * 0.06 + rng() * W * 0.04;
  for (let gx = 0; gx < W; gx += gridStep) {
    for (let gy = 0; gy < H; gy += gridStep) {
      const activity = hourlyData[Math.floor((gy / H) * 24)] || 0;
      if (rng() > activity * intensity * 0.75) continue;
      const sz = 3 + Math.floor(rng() * 10);
      const dc: RGB = rng() < 0.2 ? WHT : ACC;
      ctx.fillStyle = rc(dc, 0.2 + rng() * 0.6);
      ctx.fillRect(gx + Math.floor((rng()-0.5)*gridStep*0.4), gy, sz, sz);
    }
  }

  // Mosaic patches
  for (let p = 0; p < 1 + Math.floor(rng() * 2); p++) {
    const patchCols: RGB[] = [DOM, SEC, BLK, ACC];
    const pw = W * (0.15 + rng() * 0.25), ph = H * (0.12 + rng() * 0.2);
    const px = Math.floor(rng() * (W - pw)), py = Math.floor(rng() * (H - ph));
    const cellSz = W * 0.025 + rng() * W * 0.04;
    for (let gy = py; gy < py + ph; gy += cellSz) {
      for (let gx = px; gx < px + pw; gx += cellSz) {
        if (rng() < 0.38) continue;
        const tc = patchCols[Math.floor(rng() * patchCols.length)];
        ctx.fillStyle = rc(tc, 0.45 + rng() * 0.5);
        ctx.fillRect(gx, gy, cellSz - 2, cellSz - 2);
      }
    }
  }

  // Edge bleeds
  const leftBleed = ctx.createLinearGradient(0, 0, W * 0.05, 0);
  leftBleed.addColorStop(0, rc(DOM, 0.6 + rng() * 0.3));
  leftBleed.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = leftBleed; ctx.fillRect(0, 0, W * 0.05, H);

  const rightBleed = ctx.createLinearGradient(W, 0, W * 0.95, 0);
  rightBleed.addColorStop(0, rc(SEC, 0.5 + rng() * 0.3));
  rightBleed.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rightBleed; ctx.fillRect(W * 0.95, 0, W * 0.05, H);

  if (rng() < 0.7) {
    const tx = Math.floor(W * 0.1 + rng() * W * 0.8), tw = 1 + Math.floor(rng() * 4);
    const tGrad = ctx.createLinearGradient(0, 0, 0, H);
    tGrad.addColorStop(rng() * 0.25, 'rgba(0,0,0,0)');
    tGrad.addColorStop(0.25 + rng() * 0.5, rc(WHT, 0.55 + rng() * 0.4));
    tGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tGrad; ctx.fillRect(tx, 0, tw, H);
  }

  // ── LOG TEXT OVERLAY ─────────────────────────────────────────────────────
  const events = syntheticEvents({ txns, posts, errors, messages, peakHour }, commits, rng);
  ctx.font = '8px monospace';
  events.slice(0, 40).forEach(l => {
    const textCol: RGB = l.type === 'ERR' ? ACC : l.type === 'TRADE' ? SEC : DOM;
    const isWhite = rng() < 0.12;
    const col: RGB = isWhite ? WHT : textCol;
    const alpha = isWhite ? 0.18 + rng() * 0.22 : l.type === 'ERR' ? 0.12 + rng() * 0.28 : 0.04 + rng() * 0.14;
    ctx.fillStyle = rc(col, alpha);
    ctx.fillText(`${l.time} [${l.type}] ${l.message}`, rng() * W * 0.88, rng() * H * 0.88 + 10);
  });

  // ── COMMIT MESSAGES ───────────────────────────────────────────────────────
  if (commits.length > 0) {
    ctx.font = '8px monospace';
    commits.slice(0, 20).forEach(c => {
      const x = commitRng() * W * 0.82;
      const y = 30 + commitRng() * H * 0.60;
      const col: RGB = KNOWN_REPOS[c.repo] ? SEC : DOM;
      ctx.fillStyle = rc(col, 0.10 + commitRng() * 0.22);
      ctx.fillText(c.message, x, y);
      ctx.fillStyle = rc(WHT, 0.06 + commitRng() * 0.08);
      ctx.fillText(`${c.sha} · ${KNOWN_REPOS[c.repo] || c.repo}`, x + 6, y + 10);
    });
  }

  // ── CODE RAIN ─────────────────────────────────────────────────────────────
  const commitNorm = Math.min(1, commitCount / 30);
  if (commitNorm > 0) {
    const cols = Math.floor(commitNorm * 18);
    ctx.font = '8px monospace';
    for (let col = 0; col < cols; col++) {
      const cx = W * 0.52 + rainRng() * W * 0.44;
      const startY = rainRng() * H * 0.4;
      const length = Math.floor(5 + rainRng() * 20);
      for (let row = 0; row < length; row++) {
        const cy = startY + row * 11;
        if (cy > H * 0.72) break;
        const alpha = row === 0 ? 0.7 : Math.max(0.04, 0.45 - row * 0.022);
        const char = '0123456789abcdef'[Math.floor(rainRng() * 16)];
        ctx.fillStyle = rc(row === 0 ? WHT : ACC, alpha);
        ctx.fillText(char, cx, cy);
      }
    }
  }

  // ── REPO GLYPH MARKERS ────────────────────────────────────────────────────
  ctx.font = '10px monospace';
  reposActive.slice(0, 10).forEach(repo => {
    const tag = `[${KNOWN_REPOS[repo] || repo.slice(0, 6).toUpperCase()}]`;
    const tx = 10 + repoRng() * W * 0.35;
    const ty = H * 0.68 + repoRng() * H * 0.18;
    ctx.fillStyle = rc(ACC, 0.18 + repoRng() * 0.20);
    ctx.fillText(tag, tx, ty);
  });

  // ── PRICE WAVEFORM ────────────────────────────────────────────────────────
  {
    const wY = H * 0.82;
    const amp = H * 0.06 * (0.3 + momentumMag * 0.7);
    const drift = momentumSign * H * 0.03;

    ctx.beginPath();
    for (let wx = 0; wx <= W; wx += 3) {
      const t = wx / W;
      const sine = Math.sin(wx * 0.025 + waveRng() * Math.PI * 2) * amp;
      const noise = (waveRng() - 0.5) * amp * 0.6;
      const wy = wY + sine + noise + drift * t;
      wx === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
    }
    ctx.strokeStyle = rc(ACC, 0.55 + momentumMag * 0.3);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Glitch tears on waveform
    for (let g = 0; g < 4 + Math.floor(intensity * 6); g++) {
      const gx = Math.floor(waveRng() * W * 0.85);
      const gw = Math.floor(20 + waveRng() * 120);
      const gdy = (waveRng() - 0.5) * amp * 2;
      ctx.strokeStyle = rc(WHT, 0.3 + waveRng() * 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, wY + gdy); ctx.lineTo(gx + gw, wY + gdy);
      ctx.stroke();
    }

    ctx.font = '9px monospace';
    const priceLabel = priceUsd > 0
      ? `$CLAWDIA $${priceUsd.toFixed(6)} ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`
      : '$CLAWDIA / BASE';
    ctx.fillStyle = rc(WHT, 0.65);
    ctx.fillText(priceLabel, W - ctx.measureText(priceLabel).width - 14, wY - 8);

    if (marketCap > 0) {
      const mcapLabel = `MCAP ${marketCap >= 1e6 ? `$${(marketCap/1e6).toFixed(2)}M` : `$${(marketCap/1e3).toFixed(1)}K`}`;
      ctx.fillStyle = rc(ACC, 0.5);
      ctx.fillText(mcapLabel, 14, wY - 8);
    }
  }

  // ── SCAN LINES ────────────────────────────────────────────────────────────
  for (let y = 0; y < H; y += 2) {
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    ctx.fillRect(0, y, W, 1);
  }

  // ── VIGNETTE ─────────────────────────────────────────────────────────────
  const vig = ctx.createRadialGradient(W/2, H/2, H*0.12, W/2, H/2, H*0.92);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // ── PALETTE LABEL ─────────────────────────────────────────────────────────
  {
    const label = pal.label.toUpperCase();
    ctx.font = 'bold 11px monospace';
    const tw = ctx.measureText(label).width;
    const padX = 8, padY = 6, boxX = 6, boxY = 6;
    const boxW = tw + padX * 2, boxH = 18;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = rc(WHT, 0.80);
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1);
    ctx.fillStyle = rc(WHT, 0.90);
    ctx.fillText(label, boxX + padX, boxY + padY + 8);
  }

  // ── METADATA ─────────────────────────────────────────────────────────────
  const seedHex = `0x${seed.toString(16).padStart(8, '0').toUpperCase()}`;
  ctx.font = '9px monospace';
  ctx.fillStyle = rc(WHT, 0.14);
  ctx.fillText(`CLAWDIA / ${seedHex} / ${date}`, 12, H - 14);
  ctx.fillStyle = rc(DOM, 0.22);
  const tokenLine = marketCap > 0
    ? `$CLAWDIA / BASE / MCAP ${marketCap >= 1e6 ? `$${(marketCap/1e6).toFixed(2)}M` : `$${(marketCap/1e3).toFixed(1)}K`} / ${pal.label.toUpperCase()}`
    : `$CLAWDIA / BASE / ${pal.label.toUpperCase()} — ${pal.desc}`;
  ctx.fillText(tokenLine, 12, H - 28);

  return Buffer.from(canvas.toBuffer('image/png'));
}
