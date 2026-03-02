const TOKEN_ADDRESS = '0xbbd9aDe16525acb4B336b6dAd3b9762901522B07';

interface DexData {
  priceUsd: number;
  marketCap: number;
  change24h: number;
  volume24h: number;
  buys24h: number;
  sells24h: number;
  mcapNorm: number;
  momentumSign: 1 | -1;
  momentumMag: number;
}

const DEFAULTS: DexData = {
  priceUsd: 0,
  marketCap: 0,
  change24h: 0,
  volume24h: 0,
  buys24h: 0,
  sells24h: 0,
  mcapNorm: 0,
  momentumSign: 1,
  momentumMag: 0,
};

export async function fetchDexData(): Promise<DexData> {
  try {
    const resp = await fetch(
      `https://api.dexscreener.com/token-pairs/v1/base/${TOKEN_ADDRESS}`,
      { next: { revalidate: 0 } },
    );

    if (!resp.ok) {
      console.warn(`DexScreener API returned ${resp.status}`);
      return DEFAULTS;
    }

    const pairs = await resp.json();
    if (!Array.isArray(pairs) || pairs.length === 0) return DEFAULTS;

    // Pick pair with highest liquidity
    const pair = pairs.reduce((best: Record<string, unknown>, p: Record<string, unknown>) => {
      const bestLiq = (best.liquidity as Record<string, number>)?.usd ?? 0;
      const pLiq = (p.liquidity as Record<string, number>)?.usd ?? 0;
      return pLiq > bestLiq ? p : best;
    });

    const priceUsd   = parseFloat(pair.priceUsd as string) || 0;
    const marketCap  = (pair.marketCap as number) || 0;
    const change24h  = (pair.priceChange as Record<string, number>)?.h24 ?? 0;
    const volume24h  = (pair.volume as Record<string, number>)?.h24 ?? 0;
    const buys24h    = (pair.txns as Record<string, Record<string, number>>)?.h24?.buys ?? 0;
    const sells24h   = (pair.txns as Record<string, Record<string, number>>)?.h24?.sells ?? 0;

    const mcapNorm      = marketCap > 0 ? Math.min(1, Math.log10(marketCap / 1000) / 5) : 0;
    const momentumSign  = change24h >= 0 ? 1 as const : -1 as const;
    const momentumMag   = Math.min(1, Math.abs(change24h) / 20);

    return { priceUsd, marketCap, change24h, volume24h, buys24h, sells24h, mcapNorm, momentumSign, momentumMag };
  } catch (err) {
    console.warn('DexScreener fetch failed:', err);
    return DEFAULTS;
  }
}
