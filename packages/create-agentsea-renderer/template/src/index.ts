import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { mulberry32 } from './prng';
import type { DayLog, Colors } from './types';
import { LAYERS } from './layers';

let fontRegistered = false;

function ensureFont() {
  if (fontRegistered) return;
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

  // Execute all layers in order
  for (const layer of LAYERS) {
    ctx.save();
    layer(ctx, rng, log, colors);
    ctx.restore();
  }

  return Buffer.from(canvas.toBuffer('image/png'));
}
