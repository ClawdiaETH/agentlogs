import { mulberry32, sampleRole } from './prng';
import type { DayLog } from './types';

/** HSL ranges: [hMin, hMax, sMin, sMax, lMin, lMax] */
interface PaletteDef {
  label: string;
  dom: number[];
  sec: number[];
  acc: number[];
  blk: number[];
  wht: number[];
}

export const PALETTES: Record<string, PaletteDef> = {
  INCIDENT:     { label: 'Incident',     dom: [0,15,70,90,40,55],     sec: [20,35,60,80,35,50],    acc: [40,55,80,95,55,70],    blk: [0,10,30,50,3,14],      wht: [0,15,10,25,88,97] },
  GRAVEYARD:    { label: 'Graveyard',    dom: [230,260,30,50,20,35],  sec: [260,280,25,45,25,40],  acc: [180,210,30,50,40,55],  blk: [240,260,20,40,3,14],   wht: [220,240,5,15,88,97] },
  SUNRISE:      { label: 'Sunrise',      dom: [15,35,75,95,50,65],    sec: [330,350,60,80,45,60],  acc: [45,60,85,100,55,70],   blk: [15,25,30,50,3,14],     wht: [30,50,8,20,88,97] },
  DEFI:         { label: 'DeFi Day',     dom: [155,170,60,80,35,50],  sec: [140,160,50,70,45,60],  acc: [160,175,55,75,55,70],  blk: [155,170,30,50,3,14],   wht: [150,170,5,15,88,97] },
  HYPERSOCIAL:  { label: 'Hypersocial',  dom: [325,345,65,85,40,55],  sec: [335,355,55,75,50,65],  acc: [340,360,60,80,60,75],  blk: [330,345,30,50,3,14],   wht: [330,350,8,20,88,97] },
  TWILIGHT:     { label: 'Twilight',     dom: [265,285,55,75,30,45],  sec: [270,290,50,70,40,55],  acc: [255,275,45,65,55,70],  blk: [270,285,25,45,3,14],   wht: [265,280,5,15,88,97] },
  MERIDIAN:     { label: 'Meridian',     dom: [215,235,55,75,45,60],  sec: [220,240,50,70,50,65],  acc: [210,230,50,70,60,75],  blk: [220,235,25,45,3,14],   wht: [215,230,5,15,88,97] },
  GOLDEN_HOUR:  { label: 'Golden Hour',  dom: [35,50,70,90,45,60],    sec: [40,55,65,85,50,65],    acc: [45,60,75,95,60,75],    blk: [35,50,30,50,3,14],     wht: [35,55,8,20,88,97] },
  BANKR:        { label: 'Bankr Mode',   dom: [160,175,55,75,30,45],  sec: [155,170,50,70,45,60],  acc: [150,170,50,70,55,70],  blk: [160,175,25,45,3,14],   wht: [155,170,5,15,88,97] },
  FARCASTER:    { label: 'Farcaster',    dom: [265,280,60,80,35,50],  sec: [270,285,55,75,45,60],  acc: [260,280,45,65,60,75],  blk: [265,280,25,45,3,14],   wht: [260,280,5,15,88,97] },
  DORMANT:      { label: 'Dormant',      dom: [210,230,5,15,40,55],   sec: [210,230,5,15,55,65],   acc: [210,230,5,15,70,80],   blk: [0,0,0,5,6,12],         wht: [210,230,3,10,90,96] },
  SURGE:        { label: 'Surge',        dom: [185,200,70,90,45,60],  sec: [180,200,65,85,55,70],  acc: [175,200,60,80,65,80],  blk: [185,200,30,50,3,14],   wht: [180,200,5,15,88,97] },
};

export function computeGlitchIndex(stats: {
  errors?: number;
  txns?: number;
  messages?: number;
}): number {
  const errors   = stats.errors   ?? 0;
  const txns     = stats.txns     ?? 0;
  const messages = stats.messages ?? 0;
  return Math.min(100, Math.max(0, (errors * 3) + (txns / 10) + (messages / 100)));
}

/**
 * Select palette by priority chain. Returns { id, label, colors }.
 * Colors are seeded by dayNumber so the same day always gets the same palette colors.
 */
export function selectPalette(dayLog: Partial<DayLog>): {
  id: string;
  label: string;
  colors: string[];
} {
  const errors     = dayLog.errors   ?? 0;
  const txns       = dayLog.txns     ?? 0;
  const posts      = dayLog.posts    ?? 0;
  const peakHour   = dayLog.peakHour ?? 12;
  const glitchIndex = dayLog.glitchIndex ?? computeGlitchIndex({ errors, txns, messages: dayLog.messages });

  let id: string;
  if      (errors >= 100)                                    id = 'INCIDENT';
  else if (peakHour >= 0  && peakHour < 6)                   id = 'GRAVEYARD';
  else if (peakHour >= 6  && peakHour < 10)                  id = 'SUNRISE';
  else if (txns > 350 && posts < 60)                         id = 'DEFI';
  else if (posts > 100)                                      id = 'HYPERSOCIAL';
  else if (peakHour >= 19 && peakHour < 24)                  id = 'TWILIGHT';
  else if (peakHour >= 10 && peakHour < 15)                  id = 'MERIDIAN';
  else if (peakHour >= 15 && peakHour < 19)                  id = 'GOLDEN_HOUR';
  else if (txns > 0 && posts > 0 && txns / posts > 6)       id = 'BANKR';
  else if (txns > 0 && posts > 0 && posts / txns > 1.5)     id = 'FARCASTER';
  else if (txns < 120 && posts < 35)                         id = 'DORMANT';
  else if (glitchIndex >= 85)                                id = 'SURGE';
  else                                                       id = 'MERIDIAN';

  const pal = PALETTES[id];
  const seed = ((dayLog.dayNumber ?? 1) * 0x9e3779b9) % 0x100000000;
  const rng = mulberry32(seed);

  const colors = [
    sampleRole(rng, pal.blk),
    sampleRole(rng, pal.dom),
    sampleRole(rng, pal.sec),
    sampleRole(rng, pal.acc),
    sampleRole(rng, pal.wht),
  ];

  return { id, label: pal.label, colors };
}
