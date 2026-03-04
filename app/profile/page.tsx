'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PieceCard from '@/components/PieceCard';
import registry from '../../data/registry.json';
import collections from '../../data/collections.json';

const BASE_RPC = 'https://mainnet.base.org';
// balanceOf(address) selector
const BALANCE_OF_SELECTOR = '0x70a08231';

async function getBalance(contract: string, owner: string): Promise<number> {
  const paddedAddr = owner.slice(2).toLowerCase().padStart(64, '0');
  const res = await fetch(BASE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: contract, data: `${BALANCE_OF_SELECTOR}${paddedAddr}` }, 'latest'],
      id: 1,
    }),
  });
  const data = await res.json();
  if (!data.result || data.result === '0x') return 0;
  return parseInt(data.result, 16);
}

interface CollectionBalance {
  slug: string;
  name: string;
  image: string;
  balance: number;
  native: boolean;
  aspectRatio?: string;
}

export default function ProfilePage() {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [collectionBalances, setCollectionBalances] = useState<CollectionBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);

  async function connect() {
    if (!window.ethereum) {
      setError('No wallet detected. Install MetaMask or another browser wallet.');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];
      if (accounts[0]) setAddress(accounts[0]);
    } catch {
      setError('Wallet connection declined.');
    } finally {
      setConnecting(false);
    }
  }

  useEffect(() => {
    if (!address) return;
    setLoadingBalances(true);
    Promise.all(
      collections.map(async (c) => {
        const balance = await getBalance(c.contractAddress, address);
        return {
          slug: c.slug,
          name: c.name,
          image: c.image,
          balance,
          native: c.native,
          aspectRatio: c.aspectRatio,
        };
      })
    ).then((results) => {
      setCollectionBalances(results);
      setLoadingBalances(false);
    });
  }, [address]);

  // Registry pieces (Corrupt Memory with full metadata)
  const ownedPieces = address
    ? registry.filter(
        (p) => p.buyer && p.buyer.toLowerCase() === address.toLowerCase()
      )
    : [];

  // Collection holdings (onchain balanceOf > 0, excluding native ones shown via registry)
  const externalHoldings = collectionBalances.filter((c) => c.balance > 0 && !c.native);
  const nativeHoldings = collectionBalances.filter((c) => c.balance > 0 && c.native);

  const hasAnything = ownedPieces.length > 0 || externalHoldings.length > 0 || nativeHoldings.some(c => c.balance > 0);

  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  return (
    <main className="min-h-screen text-white font-mono">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Profile</h1>

        {!address && (
          <div className="mt-8">
            <p className="text-sm text-zinc-500 mb-4">
              Connect your wallet to see your collection.
            </p>
            <button
              onClick={connect}
              disabled={connecting}
              className="rounded bg-purple-700 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold px-6 py-3 text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
            {error && (
              <p className="text-sm text-red-400 mt-3">{error}</p>
            )}
          </div>
        )}

        {address && (
          <>
            <p className="text-sm text-zinc-500 mb-8 font-mono">{truncated}</p>

            {loadingBalances && (
              <p className="text-sm text-zinc-500">Loading your NFTs...</p>
            )}

            {!loadingBalances && !hasAnything && (
              <p className="text-sm text-zinc-500">
                No pieces yet.{' '}
                <a href="/collections" className="text-purple-400 hover:text-purple-300 transition-colors">
                  Browse collections
                </a>{' '}
                to find your first.
              </p>
            )}

            {/* Native series pieces (Corrupt Memory — full detail from registry) */}
            {ownedPieces.length > 0 && (
              <div className="mb-12">
                <h2 className="text-lg font-bold mb-4">Corrupt Memory</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {ownedPieces.map((p) => (
                    <PieceCard
                      key={p.tokenId}
                      tokenId={p.tokenId}
                      dayNumber={p.dayNumber}
                      date={p.date}
                      ipfsImage={p.ipfsImage}
                      priceEth={p.priceEth}
                      sold={p.sold}
                      palette={p.palette}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Collection holdings (onchain balanceOf) */}
            {externalHoldings.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-4">Collections</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {externalHoldings.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/collections/${c.slug}`}
                      className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden hover:border-zinc-600 transition-colors group block"
                    >
                      <div className="relative bg-zinc-900" style={{ aspectRatio: c.aspectRatio || '1/1' }}>
                        <Image
                          src={c.image}
                          alt={c.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <span className="absolute top-2 right-2 text-[10px] bg-emerald-900/80 text-emerald-300 px-1.5 py-0.5 rounded font-bold tracking-wider">
                          {c.balance} OWNED
                        </span>
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors truncate">
                          {c.name}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">
                          {c.balance} piece{c.balance !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
