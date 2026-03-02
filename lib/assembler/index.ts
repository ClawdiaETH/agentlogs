import { fetchDexData } from './dexscreener';
import { fetchGitHubData } from './github';
import { fetchOperationalData } from './operational';
import { selectPalette, computeGlitchIndex } from '../renderer/palette';
import type { DayLog } from '../renderer/types';

/**
 * Assemble a full DayLog by fetching all data sources in parallel.
 * Deterministic palette selection based on the assembled stats.
 */
export async function assembleDayLog(
  dayNumber: number,
  date: string,
  agentSlug: string,
): Promise<DayLog> {
  const [dex, github, ops] = await Promise.all([
    fetchDexData(),
    fetchGitHubData(),
    fetchOperationalData(),
  ]);

  // Use GitHub peak hour if available, fall back to operational
  const peakHour = github.peakHourFromCommits ?? ops.peakHour;

  const glitchIndex = computeGlitchIndex({
    errors: ops.errors,
    txns: ops.txns,
    messages: ops.messages,
  });

  // Build partial log for palette selection
  const partial = {
    dayNumber,
    errors: ops.errors,
    txns: ops.txns,
    posts: ops.posts,
    messages: ops.messages,
    peakHour,
    glitchIndex,
  };

  const { id: paletteId, label: paletteLabel, colors: palette } = selectPalette(partial);
  const seed = (dayNumber * 0x9e3779b9) % 0x100000000;

  return {
    dayNumber,
    date,
    agent: agentSlug,
    seed,

    // DexScreener
    priceUsd: dex.priceUsd,
    marketCap: dex.marketCap,
    change24h: dex.change24h,
    volume24h: dex.volume24h,
    buys24h: dex.buys24h,
    sells24h: dex.sells24h,
    mcapNorm: dex.mcapNorm,
    momentumSign: dex.momentumSign,
    momentumMag: dex.momentumMag,

    // GitHub
    commits: github.commits,
    commitCount: github.commitCount,
    reposActive: github.reposActive,

    // Operational
    txns: ops.txns,
    posts: ops.posts,
    errors: ops.errors,
    messages: ops.messages,
    peakHour,
    glitchIndex,
    replies: ops.replies,

    // Palette
    paletteId,
    paletteLabel,
    palette,
  };
}
