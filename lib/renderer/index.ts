import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { mulberry32 } from './prng';
import type { DayLog, Colors, LayerFn } from './types';

// Layers in render order (1–16)
import { background } from './layers/background';
import { noise } from './layers/noise';
import { momentum } from './layers/momentum';
import { sky } from './layers/sky';
import { waterfall } from './layers/waterfall';
import { glitch } from './layers/glitch';
import { geometry } from './layers/geometry';
import { logText } from './layers/log-text';
import { replies } from './layers/replies';
import { commits } from './layers/commits';
import { codeRain } from './layers/code-rain';
import { repoGlyphs } from './layers/repo-glyphs';
import { priceWaveform } from './layers/price-waveform';
import { scanlines } from './layers/scanlines';
import { paletteLabel } from './layers/palette-label';
import { metadataLine } from './layers/metadata-line';
import { watermark } from './layers/watermark';

const LAYERS: LayerFn[] = [
  background,     // 1
  noise,          // 2
  momentum,       // 3
  sky,            // 4
  waterfall,      // 5
  glitch,         // 6
  geometry,       // 7
  logText,        // 8
  replies,        // 9
  commits,        // 10
  codeRain,       // 11
  repoGlyphs,    // 12
  priceWaveform,  // 13
  scanlines,      // 14
  paletteLabel,   // 15
  metadataLine,   // 16
  watermark,      // 17
];

let fontRegistered = false;

function ensureFont() {
  if (fontRegistered) return;
  // Try project font first, fall back to any available monospace
  const fontPath = path.join(process.cwd(), 'public/fonts/JetBrainsMono-Regular.ttf');
  try {
    GlobalFonts.registerFromPath(fontPath, 'JetBrainsMono');
  } catch {
    // Font not found — canvas will fall back to default
  }
  fontRegistered = true;
}

/**
 * Render a 760x760 PNG from a DayLog.
 * Deterministic: same dayLog always produces the same image.
 */
export function renderImage(dayLog: DayLog): Buffer {
  ensureFont();

  const canvas = createCanvas(760, 760);
  const ctx = canvas.getContext('2d');

  // Derive seed and PRNG
  const seed = (dayLog.dayNumber * 0x9e3779b9) % 0x100000000;
  const rng = mulberry32(seed);

  // Build Colors from palette array [BLK, DOM, SEC, ACC, WHT]
  const [BLK, DOM, SEC, ACC, WHT] = dayLog.palette;
  const colors: Colors = { BLK, DOM, SEC, ACC, WHT };

  // Inject seed into dayLog for watermark layer
  const log = { ...dayLog, seed };

  // Execute all 16 layers
  for (const layer of LAYERS) {
    ctx.save();
    layer(ctx, rng, log, colors);
    ctx.restore();
  }

  return Buffer.from(canvas.toBuffer('image/png'));
}
