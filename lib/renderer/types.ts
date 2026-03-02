import type { SKRSContext2D } from '@napi-rs/canvas';

/** Five-role color palette sampled from HSL ranges */
export interface Colors {
  BLK: string; // dark background
  DOM: string; // dominant
  SEC: string; // secondary
  ACC: string; // accent
  WHT: string; // near-white
}

/** Commit from GitHub events API */
export interface Commit {
  sha: string;      // first 7 chars
  message: string;  // first line, max 72 chars
  repo: string;     // repo name without org
  timestamp: string;
}

/** Reply handle for social layers */
export interface Replies {
  twitter: string[];
  farcaster: string[];
  combined: string[];
}

/** Full day log assembled from multiple data sources */
export interface DayLog {
  dayNumber: number;
  date: string;
  agent: string;
  seed: number;

  // DexScreener
  priceUsd: number;
  marketCap: number;
  change24h: number;
  volume24h: number;
  buys24h: number;
  sells24h: number;
  mcapNorm: number;       // min(1, log10(mcap/1000)/5)
  momentumSign: 1 | -1;
  momentumMag: number;    // min(1, |change24h|/20)

  // GitHub
  commits: Commit[];
  commitCount: number;
  reposActive: string[];

  // Operational
  txns: number;
  posts: number;
  errors: number;
  messages: number;
  peakHour: number;
  glitchIndex: number;
  replies: Replies;

  // Palette (computed)
  paletteId: string;
  paletteLabel: string;
  palette: string[];        // [BLK, DOM, SEC, ACC, WHT]
}

/** Signature for a single renderer layer */
export type LayerFn = (
  ctx: SKRSContext2D,
  rng: () => number,
  dayLog: DayLog,
  colors: Colors,
) => void;
