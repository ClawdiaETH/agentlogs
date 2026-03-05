'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import PieceCard from '@/components/PieceCard';
import OwnedPieceCard from '@/components/OwnedPieceCard';
import ListModal from '@/components/ListModal';
import { discoverOwnedTokens } from '@/lib/token-discovery';
import { fetchTokenMetadata } from '@/lib/token-metadata';
import { getTokenListing, getMarketAddress } from '@/lib/marketplace';
import type { MarketListing } from '@/lib/marketplace';
import registry from '../../data/registry.json';
import collections from '../../data/collections.json';

interface OwnedToken {
  tokenId: string;
  name: string;
  image: string;
}

interface CollectionSection {
  slug: string;
  name: string;
  contractAddress: string;
  aspectRatio?: string;
  pixelArt?: boolean;
  tokens: OwnedToken[];
  listings: Map<string, MarketListing<string>>;
  loading: boolean;
}

const METADATA_BATCH = 4;

export default function ProfilePage() {
  const { address } = useAccount();
  const [sections, setSections] = useState<CollectionSection[]>([]);
  const [loadingExternal, setLoadingExternal] = useState(false);
  const loadSectionsRequestRef = useRef(0);
  const [listingModal, setListingModal] = useState<{
    nftAddress: string;
    tokenId: string;
    tokenName: string;
  } | null>(null);

  const ownedPieces = address
    ? registry.filter(
        (p) => p.buyer && p.buyer.toLowerCase() === address.toLowerCase()
      )
    : [];

  const loadSections = useCallback(async () => {
    const requestId = ++loadSectionsRequestRef.current;
    const isStale = () => loadSectionsRequestRef.current !== requestId;

    if (!address) {
      setSections([]);
      setLoadingExternal(false);
      return;
    }

    const externalCollections = collections.filter((c) => !c.native && c.onchain);
    if (externalCollections.length === 0) {
      setLoadingExternal(false);
      return;
    }

    setLoadingExternal(true);

    setSections(
      externalCollections.map((c) => ({
        slug: c.slug,
        name: c.name,
        contractAddress: c.contractAddress,
        aspectRatio: c.aspectRatio,
        pixelArt: c.pixelArt,
        tokens: [],
        listings: new Map<string, MarketListing<string>>(),
        loading: true,
      }))
    );

    await Promise.all(externalCollections.map(async (collection) => {
      try {
        const tokenIds = await discoverOwnedTokens(collection.contractAddress, address);
        if (isStale()) return;

        if (tokenIds.length === 0) {
          if (isStale()) return;
          setSections((prev) =>
            prev.map((s) =>
              s.slug === collection.slug ? { ...s, loading: false } : s
            )
          );
        } else {
          const tokens: OwnedToken[] = [];
          for (let i = 0; i < tokenIds.length; i += METADATA_BATCH) {
            const batch = tokenIds.slice(i, i + METADATA_BATCH);
            const results = await Promise.all(
              batch.map((id) => fetchTokenMetadata(collection.contractAddress, id))
            );
            for (const r of results) {
              if (r) tokens.push(r);
            }
            if (isStale()) return;
            const tokensSoFar = [...tokens];
            const stillLoading = i + METADATA_BATCH < tokenIds.length;
            setSections((prev) =>
              prev.map((s) =>
                s.slug === collection.slug
                  ? { ...s, tokens: tokensSoFar, loading: stillLoading }
                  : s
              )
            );
          }

          // Check marketplace listings for owned tokens
          if (getMarketAddress()) {
            const listingsMap = new Map<string, MarketListing<string>>();
            for (const token of tokens) {
              const listing = await getTokenListing(collection.contractAddress, token.tokenId);
              if (listing) listingsMap.set(token.tokenId, listing);
            }
            if (isStale()) return;
            setSections((prev) =>
              prev.map((s) =>
                s.slug === collection.slug ? { ...s, listings: listingsMap } : s
              )
            );
          }
        }
      } catch {
        if (isStale()) return;
        setSections((prev) =>
          prev.map((s) =>
            s.slug === collection.slug ? { ...s, loading: false } : s
          )
        );
      }
    }));

    if (!isStale()) {
      setLoadingExternal(false);
    }
  }, [address]);

  useEffect(() => {
    void loadSections();
    return () => {
      loadSectionsRequestRef.current += 1;
    };
  }, [loadSections]);

  const nonEmptySections = sections.filter((s) => s.tokens.length > 0 || s.loading);
  const hasAnything = ownedPieces.length > 0 || nonEmptySections.length > 0;
  const allDoneLoading = !loadingExternal && sections.every((s) => !s.loading);

  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  return (
    <main className="min-h-screen text-white font-mono">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Profile</h1>

        {!address && (
          <div className="mt-8">
            <p className="text-sm text-zinc-500">
              Connect your wallet using the button in the navigation bar to see your collection.
            </p>
          </div>
        )}

        {address && (
          <>
            <p className="text-sm text-zinc-500 mb-8 font-mono">{truncated}</p>

            {loadingExternal && !hasAnything && (
              <p className="text-sm text-zinc-500">Loading your NFTs...</p>
            )}

            {allDoneLoading && !hasAnything && (
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
                <h2 className="text-lg font-bold mb-1">Corrupt Memory</h2>
                <p className="text-xs text-zinc-500 mb-4">{ownedPieces.length} piece{ownedPieces.length !== 1 ? 's' : ''}</p>
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

            {/* External collection sections — individual pieces with marketplace */}
            {nonEmptySections.map((section) => (
              <div key={section.slug} className="mb-12">
                <h2 className="text-lg font-bold mb-1">{section.name}</h2>
                <p className="text-xs text-zinc-500 mb-4">
                  {section.loading
                    ? 'Loading...'
                    : `${section.tokens.length} piece${section.tokens.length !== 1 ? 's' : ''}`}
                </p>

                {section.loading && section.tokens.length === 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-zinc-900 rounded border border-zinc-800 animate-pulse"
                        style={{ aspectRatio: section.aspectRatio || '1/1' }}
                      />
                    ))}
                  </div>
                )}

                {section.tokens.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {section.tokens.map((token) => {
                      const listing = section.listings.get(token.tokenId);
                      return (
                        <OwnedPieceCard
                          key={token.tokenId}
                          tokenId={token.tokenId}
                          name={token.name}
                          image={token.image}
                          collectionName={section.name}
                          collectionSlug={section.slug}
                          contractAddress={section.contractAddress}
                          aspectRatio={section.aspectRatio}
                          pixelArt={section.pixelArt}
                          isOwner
                          listingPrice={listing?.priceEth}
                          onListClick={() =>
                            setListingModal({
                              nftAddress: section.contractAddress,
                              tokenId: token.tokenId,
                              tokenName: token.name || `${section.name} #${token.tokenId}`,
                            })
                          }
                          onDelisted={() => {
                            setSections((prev) =>
                              prev.map((s) => {
                                if (s.slug !== section.slug || !s.listings.has(token.tokenId)) return s;
                                const nextListings = new Map(s.listings);
                                nextListings.delete(token.tokenId);
                                return { ...s, listings: nextListings };
                              })
                            );
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* List Modal */}
      {listingModal && (
        <ListModal
          nftAddress={listingModal.nftAddress}
          tokenId={listingModal.tokenId}
          tokenName={listingModal.tokenName}
          onClose={() => setListingModal(null)}
          onListed={() => {
            setListingModal(null);
            loadSections(); // Refresh to show updated listing status
          }}
        />
      )}
    </main>
  );
}
