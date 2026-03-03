import type { LayerFn } from '../types';

import { background } from './background';
import { noise } from './noise';
import { momentum } from './momentum';
import { sky } from './sky';
import { waterfall } from './waterfall';
import { glitch } from './glitch';
import { geometry } from './geometry';
import { logText } from './log-text';
import { replies } from './replies';
import { commits } from './commits';
import { codeRain } from './code-rain';
import { repoGlyphs } from './repo-glyphs';
import { priceWaveform } from './price-waveform';
import { scanlines } from './scanlines';
import { metadataLine } from './metadata-line';
import { watermark } from './watermark';

export const LAYERS: LayerFn[] = [
  background,       // 1
  noise,            // 2
  momentum,         // 3
  sky,              // 4
  waterfall,        // 5
  glitch,           // 6
  geometry,         // 7
  logText,          // 8
  replies,          // 9
  commits,          // 10
  codeRain,         // 11
  repoGlyphs,      // 12
  priceWaveform,    // 13
  scanlines,        // 14
  metadataLine,     // 15
  watermark,        // 16
];
