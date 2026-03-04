'use client';

import { useState, useEffect, useCallback } from 'react';
import { rpcCall } from '@/lib/rpc';

const PAGE_SIZE = 12;
const BATCH_SIZE = 3;

async function resolveTokenURI(hex: string): Promise<{ name: string; image: string } | null> {
  if (!hex || hex === '0x') return null;
  try {
    // Remove 0x prefix, skip first 64 chars (offset pointer) and next 64 chars (string length)
    const stripped = hex.slice(2);
    const offset = parseInt(stripped.slice(0, 64), 16) * 2;
    const length = parseInt(stripped.slice(offset, offset + 64), 16);
    const hexStr = stripped.slice(offset + 64, offset + 64 + length * 2);

    // Convert hex to string
    let uri = '';
    for (let i = 0; i < hexStr.length; i += 2) {
      uri += String.fromCharCode(parseInt(hexStr.slice(i, i + 2), 16));
    }

    // Handle data:application/json;base64, prefix
    if (uri.startsWith('data:application/json;base64,')) {
      const json = JSON.parse(atob(uri.slice('data:application/json;base64,'.length)));
      return { name: json.name || '', image: json.image || '' };
    }

    // Handle raw JSON
    if (uri.startsWith('{')) {
      const json = JSON.parse(uri);
      return { name: json.name || '', image: json.image || '' };
    }

    // Handle HTTP(S) URLs — fetch the metadata JSON
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      const res = await fetch(uri);
      if (!res.ok) return null;
      const json = await res.json();
      return { name: json.name || '', image: json.image || '' };
    }

    return null;
  } catch {
    return null;
  }
}

interface TokenItem {
  tokenId: number;
  name: string;
  image: string;
}

interface CollectionItemsProps {
  contractAddress: string;
  collectionName: string;
  aspectRatio?: string;
}

export default function CollectionItems({ contractAddress, collectionName, aspectRatio }: CollectionItemsProps) {
  const [totalSupply, setTotalSupply] = useState<number | null>(null);
  const [items, setItems] = useState<TokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [startTokenId, setStartTokenId] = useState(1);
  const [nextStartId, setNextStartId] = useState(1);

  // Fetch total supply on mount
  useEffect(() => {
    rpcCall(contractAddress, '0x18160ddd')
      .then(async (result) => {
        if (result && result !== '0x') {
          const supply = parseInt(result, 16);
          let firstTokenId = 1;
          if (supply > 0) {
            try {
              const tokenZero = await rpcCall(contractAddress, `0xc87b56dd${'0'.padStart(64, '0')}`);
              if (tokenZero && tokenZero !== '0x') {
                firstTokenId = 0;
              }
            } catch {}
          }
          setItems([]);
          setStartTokenId(firstTokenId);
          setNextStartId(firstTokenId);
          setTotalSupply(supply);
          setLoading(supply > 0);
          return;
        }
        setItems([]);
        setStartTokenId(1);
        setNextStartId(1);
        setTotalSupply(0);
        setLoading(false);
      })
      .catch(() => {
        setItems([]);
        setStartTokenId(1);
        setNextStartId(1);
        setTotalSupply(0);
        setLoading(false);
      });
  }, [contractAddress]);

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

  // Load first page when totalSupply is known
  useEffect(() => {
    if (totalSupply === null || totalSupply === 0) return;
    const startId = startTokenId;
    loadItems(startId, PAGE_SIZE).then((loaded) => {
      setItems(loaded);
      setNextStartId(startId + PAGE_SIZE);
      setLoading(false);
    });
  }, [totalSupply, startTokenId, loadItems]);

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const startId = nextStartId;
    const loaded = await loadItems(startId, PAGE_SIZE);
    setItems((prev) => [...prev, ...loaded]);
    setNextStartId(startId + PAGE_SIZE);
    setLoadingMore(false);
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
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="bg-zinc-900 rounded border border-zinc-800 animate-pulse" style={{ aspectRatio: aspectRatio || '1/1' }} />
          ))}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {items.map((item) => (
            <div key={item.tokenId} className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.name || `${collectionName} #${item.tokenId}`}
                className="w-full object-cover bg-zinc-900"
                style={{ aspectRatio: aspectRatio || '1/1' }}
              />
              <div className="p-2">
                <p className="text-xs text-zinc-400 truncate">
                  {item.name || `#${item.tokenId}`}
                </p>
              </div>
            </div>
          ))}
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
