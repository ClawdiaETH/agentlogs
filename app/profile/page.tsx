'use client';

import { useState } from 'react';
import PieceCard from '@/components/PieceCard';
import registry from '../../data/registry.json';

export default function ProfilePage() {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

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

  const owned = address
    ? registry.filter(
        (p) => p.buyer && p.buyer.toLowerCase() === address.toLowerCase()
      )
    : [];

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

            {owned.length === 0 && (
              <p className="text-sm text-zinc-500">
                No pieces yet.{' '}
                <a href="/gallery" className="text-purple-400 hover:text-purple-300 transition-colors">
                  Browse the gallery
                </a>{' '}
                to find your first.
              </p>
            )}

            {owned.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {owned.map((p) => (
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
            )}
          </>
        )}
      </div>
    </main>
  );
}
