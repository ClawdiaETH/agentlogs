'use client';

import { useState, useEffect } from 'react';

const DEFAULT_TOKEN_ADDRESS = '0xbbd9aDe16525acb4B336b6dAd3b9762901522B07';
const DEFAULT_TOKEN_SYMBOL = '$CLAWDIA';

interface PriceData {
  priceUsd: string;
  change24h: number;
}

interface LivePriceProps {
  tokenAddress?: string;
  tokenSymbol?: string;
}

export default function LivePrice({ tokenAddress, tokenSymbol }: LivePriceProps) {
  const [data, setData] = useState<PriceData | null>(null);

  const address = tokenAddress || DEFAULT_TOKEN_ADDRESS;
  const symbol = tokenSymbol || DEFAULT_TOKEN_SYMBOL;

  useEffect(() => {
    async function fetchPrice() {
      try {
        const resp = await fetch(
          `https://api.dexscreener.com/token-pairs/v1/base/${address}`,
        );
        if (!resp.ok) return;
        const pairs = await resp.json();
        if (!Array.isArray(pairs) || pairs.length === 0) return;

        // Pick pair with highest liquidity
        const pair = pairs.reduce((best: Record<string, unknown>, p: Record<string, unknown>) => {
          const bestLiq = (best.liquidity as Record<string, number>)?.usd ?? 0;
          const pLiq = (p.liquidity as Record<string, number>)?.usd ?? 0;
          return pLiq > bestLiq ? p : best;
        });

        setData({
          priceUsd: parseFloat(pair.priceUsd as string).toFixed(6),
          change24h: (pair.priceChange as Record<string, number>)?.h24 ?? 0,
        });
      } catch {
        // silently fail
      }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 60_000);
    return () => clearInterval(interval);
  }, [address]);

  if (!data) {
    return (
      <span className="text-xs text-zinc-600 animate-pulse">{symbol} loading...</span>
    );
  }

  const isUp = data.change24h >= 0;

  return (
    <span className="text-xs font-mono">
      <span className="text-zinc-400">{symbol}</span>
      {' '}
      <span className="text-zinc-300">${data.priceUsd}</span>
      {' '}
      <span className={isUp ? 'text-green-400' : 'text-red-400'}>
        {isUp ? '+' : ''}{data.change24h.toFixed(1)}%
      </span>
    </span>
  );
}
