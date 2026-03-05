'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMarketAddress } from '@/lib/marketplace';
import MarketBuyButton from '@/components/MarketBuyButton';

interface ListingCard {
  nftAddress: string;
  tokenId: string;
  seller: string;
  price: string;
  priceEth: string;
  name: string;
  image: string;
  collectionName: string;
  collectionSlug: string;
  aspectRatio?: string;
  pixelArt?: boolean;
}

export default function MarketplacePage() {
  const [cards, setCards] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);

  const marketAddress = getMarketAddress();

  useEffect(() => {
    if (!marketAddress) {
      setLoading(false);
      return;
    }

    fetch('/api/marketplace')
      .then((res) => res.json())
      .then((data: ListingCard[]) => {
        setCards(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [marketAddress]);

  return (
    <main className="min-h-screen text-white font-mono">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Marketplace</h1>
        <p className="text-sm text-zinc-500 mb-8">Browse NFTs listed for sale across all collections.</p>

        {!marketAddress && (
          <p className="text-sm text-zinc-600">Marketplace not configured.</p>
        )}

        {loading && marketAddress && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-zinc-900 rounded border border-zinc-800 animate-pulse aspect-square" />
            ))}
          </div>
        )}

        {!loading && cards.length === 0 && marketAddress && (
          <p className="text-sm text-zinc-600">No items currently listed.</p>
        )}

        {!loading && cards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {cards.map((card) => {
              const detailHref = card.collectionSlug
                ? `/collections/${card.collectionSlug}/${card.tokenId}`
                : null;
              const cardContent = (
                <>
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full object-cover bg-zinc-900"
                      style={{
                        aspectRatio: card.aspectRatio || '1/1',
                        imageRendering: card.pixelArt ? 'pixelated' : undefined,
                      }}
                    />
                    <span className="absolute top-2 right-2 text-[10px] bg-purple-900/80 text-purple-300 px-1.5 py-0.5 rounded font-bold">
                      {card.priceEth} ETH
                    </span>
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-zinc-300 truncate font-medium">{card.name}</p>
                    <p className="text-[10px] text-zinc-600 truncate">{card.collectionName}</p>
                  </div>
                </>
              );

              return (
                <div
                  key={`${card.nftAddress}:${card.tokenId}`}
                  className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden hover:border-zinc-600 transition-colors"
                >
                  {detailHref ? <Link href={detailHref}>{cardContent}</Link> : cardContent}
                  <div className="px-2 pb-2">
                    <MarketBuyButton
                      nftAddress={card.nftAddress}
                      tokenId={Number(card.tokenId)}
                      priceWei={card.price}
                      priceEth={card.priceEth}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
