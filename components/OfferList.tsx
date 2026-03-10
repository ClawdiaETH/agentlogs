'use client';

import { useEffect, useState } from 'react';

interface Offer {
  offerer: string;
  amount: string;
  amountEth: string;
  expiry: number;
  active: boolean;
}

interface OfferListProps {
  nftAddress: string;
  tokenId: number;
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatExpiry(timestamp: number): string {
  const now = Date.now() / 1000;
  const remaining = timestamp - now;
  if (remaining <= 0) return 'Expired';
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export default function OfferList({ nftAddress, tokenId }: OfferListProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/market/offers?nft=${nftAddress}&tokenId=${tokenId}`)
      .then((r) => r.json())
      .then((data) => setOffers(data.offers ?? []))
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, [nftAddress, tokenId]);

  if (loading) {
    return <p className="text-xs text-zinc-600">Loading offers...</p>;
  }

  if (offers.length === 0) return null;

  return (
    <div className="border border-zinc-800 rounded bg-zinc-950 p-3">
      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">
        Offers ({offers.length})
      </p>
      <div className="space-y-2">
        {offers.map((offer) => (
          <div key={offer.offerer} className="flex items-center justify-between text-sm">
            <a
              href={`https://basescan.org/address/${offer.offerer}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-200 transition-colors font-mono text-xs"
            >
              {truncateAddress(offer.offerer)}
            </a>
            <div className="flex items-center gap-3">
              <span className="text-zinc-200 font-bold text-xs">{offer.amountEth} ETH</span>
              <span className="text-[10px] text-zinc-600">{formatExpiry(offer.expiry)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
