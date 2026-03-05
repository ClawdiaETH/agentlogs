'use client';

import { useState, useEffect, useCallback } from 'react';
import { rpcCall } from '@/lib/rpc';
import { resolveTokenURI } from '@/lib/token-metadata';
import { getTokenListing, getMarketAddress } from '@/lib/marketplace';
import type { MarketListing } from '@/lib/marketplace';
import MarketBuyButton from './MarketBuyButton';

const PAGE_SIZE = 12;
const BATCH_SIZE = 6;

interface TokenItem {
  tokenId: number;
  name: string;
  image: string;
}

interface CollectionItemsProps {
  contractAddress: string;
  collectionName: string;
  aspectRatio?: string;
  knownSupply?: number | null;
  pixelArt?: boolean;
}

export default function CollectionItems({ contractAddress, collectionName, aspectRatio, knownSupply, pixelArt }: CollectionItemsProps) {
  const [totalSupply, setTotalSupply] = useState<number | null>(null);
  const [items, setItems] = useState<TokenItem[]>([]);
  const [listings, setListings] = useState<Map<number, MarketListing>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [startTokenId, setStartTokenId] = useState(1);
  const [nextStartId, setNextStartId] = useState(1);

  // Fetch total supply on mount (falls back to knownSupply when contract doesn't implement totalSupply)
  useEffect(() => {
    async function init() {
      let supply = 0;
      try {
        const result = await rpcCall(contractAddress, '0x18160ddd');
        if (result && result !== '0x') {
          supply = parseInt(result, 16);
        }
      } catch {
        // totalSupply() not implemented or reverted
      }

      // Fallback to knownSupply from collection metadata
      if (supply === 0 && knownSupply && knownSupply > 0) {
        supply = knownSupply;
      }

      if (supply === 0) {
        setItems([]);
        setStartTokenId(1);
        setNextStartId(1);
        setTotalSupply(0);
        setLoading(false);
        return;
      }

      // Check if token IDs are 0-indexed
      let firstTokenId = 1;
      try {
        const tokenZero = await rpcCall(contractAddress, `0xc87b56dd${'0'.padStart(64, '0')}`);
        if (tokenZero && tokenZero !== '0x') {
          firstTokenId = 0;
        }
      } catch {}

      setItems([]);
      setStartTokenId(firstTokenId);
      setNextStartId(firstTokenId);
      setTotalSupply(supply);
      setLoading(true);
    }
    init();
  }, [contractAddress, knownSupply]);

  const loadItems = useCallback(async (startId: number, count: number) => {
    const ids: number[] = [];
    const max = startTokenId === 0 ? (totalSupply ?? 0) - 1 : totalSupply ?? 0;
    for (let i = startId; i < startId + count && i <= max; i++) {
      ids.push(i);
    }
    if (ids.length === 0) return [];

    // Process in small batches to avoid RPC rate limits
    const results: (TokenItem | null)[] = [];
    for (let b = 0; b < ids.length; b += BATCH_SIZE) {
      const batch = ids.slice(b, b + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (tokenId) => {
          const paddedId = tokenId.toString(16).padStart(64, '0');
          try {
            const result = await rpcCall(contractAddress, `0xc87b56dd${paddedId}`);
            const decoded = await resolveTokenURI(result);
            if (decoded) {
              return { tokenId, name: decoded.name, image: decoded.image };
            }
          } catch {}
          return null;
        })
      );
      results.push(...batchResults);
    }

    return results.filter((r): r is TokenItem => r !== null);
  }, [contractAddress, startTokenId, totalSupply]);

  // Check marketplace listings for loaded items
  const checkListings = useCallback(async (tokenItems: TokenItem[]) => {
    if (!getMarketAddress()) return;
    const newListings = new Map<number, MarketListing>();
    for (let i = 0; i < tokenItems.length; i += BATCH_SIZE) {
      const batch = tokenItems.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((item) => getTokenListing(contractAddress, item.tokenId))
      );
      for (const r of results) {
        if (r) newListings.set(r.tokenId, r);
      }
    }
    setListings((prev) => {
      const merged = new Map(prev);
      for (const [k, v] of newListings) merged.set(k, v);
      return merged;
    });
  }, [contractAddress]);

  // Load first page when totalSupply is known
  useEffect(() => {
    if (totalSupply === null || totalSupply === 0) return;
    const startId = startTokenId;
    loadItems(startId, PAGE_SIZE).then((loaded) => {
      setItems(loaded);
      setNextStartId(startId + PAGE_SIZE);
      setLoading(false);
      checkListings(loaded);
    });
  }, [totalSupply, startTokenId, loadItems, checkListings]);

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const startId = nextStartId;
    const loaded = await loadItems(startId, PAGE_SIZE);
    setItems((prev) => [...prev, ...loaded]);
    setNextStartId(startId + PAGE_SIZE);
    setLoadingMore(false);
    checkListings(loaded);
  };

  const maxTokenId = totalSupply === null ? null : startTokenId === 0 ? totalSupply - 1 : totalSupply;
  const hasMore = !loading && maxTokenId !== null && nextStartId <= maxTokenId;

  return (
    <div>
      <h2 className="text-lg font-bold mb-2">Items</h2>
      {totalSupply !== null && (
        <p className="text-xs text-zinc-500 mb-4">{totalSupply.toLocaleString()} items</p>
      )}

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="bg-zinc-900 rounded border border-zinc-800 animate-pulse" style={{ aspectRatio: aspectRatio || '1/1' }} />
          ))}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((item) => {
            const listing = listings.get(item.tokenId);
            return (
              <div key={item.tokenId} className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.name || `${collectionName} #${item.tokenId}`}
                    className="w-full object-cover bg-zinc-900"
                    style={{ aspectRatio: aspectRatio || '1/1', imageRendering: pixelArt ? 'pixelated' : undefined }}
                  />
                  {listing && (
                    <span className="absolute top-2 right-2 text-[10px] bg-purple-900/80 text-purple-300 px-1.5 py-0.5 rounded font-bold">
                      {listing.priceEth} ETH
                    </span>
                  )}
                </div>
                <div className="p-2 space-y-2">
                  <p className="text-xs text-zinc-400 truncate">
                    {item.name || `#${item.tokenId}`}
                  </p>
                  {listing && (
                    <MarketBuyButton
                      nftAddress={contractAddress}
                      tokenId={item.tokenId}
                      priceWei={listing.price}
                      priceEth={listing.priceEth}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && items.length === 0 && totalSupply !== null && totalSupply > 0 && (
        <p className="text-sm text-zinc-500">Could not load items.</p>
      )}

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="mt-4 w-full rounded border border-zinc-700 bg-zinc-900 text-zinc-300 px-4 py-2.5 text-sm font-mono hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
