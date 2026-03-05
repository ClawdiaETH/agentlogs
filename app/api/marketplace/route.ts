import { NextResponse } from 'next/server';
import { getAllActiveListings } from '@/lib/marketplace';
import { fetchTokenMetadata } from '@/lib/token-metadata';
import { loadCollections } from '@/lib/collections';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

// In-memory cache: avoids re-scanning on every request
let cachedListings: ListingCard[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 seconds

function findCollection(address: string) {
  const collections = loadCollections();
  return collections.find(
    (c) => c.contractAddress.toLowerCase() === address.toLowerCase(),
  );
}

export async function GET() {
  const now = Date.now();

  // Return cached data if fresh
  if (cachedListings && now - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json(cachedListings, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  }

  try {
    const listings = await getAllActiveListings();

    // Resolve metadata in parallel
    const cards = await Promise.all(
      listings.map(async (listing): Promise<ListingCard | null> => {
        const collection = findCollection(listing.nftAddress);
        const meta = await fetchTokenMetadata(listing.nftAddress, String(listing.tokenId));
        if (!meta?.image) return null;

        return {
          nftAddress: listing.nftAddress,
          tokenId: String(listing.tokenId),
          seller: listing.seller,
          price: listing.price,
          priceEth: listing.priceEth,
          name: meta.name || `#${listing.tokenId}`,
          image: meta.image,
          collectionName: collection?.name || 'Unknown',
          collectionSlug: collection?.slug || '',
          aspectRatio: collection?.aspectRatio,
          pixelArt: collection?.pixelArt,
        };
      }),
    );

    const result = cards.filter((c): c is ListingCard => c !== null);

    // Update cache
    cachedListings = result;
    cacheTimestamp = now;

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch {
    // Return stale cache if available, else empty
    return NextResponse.json(cachedListings || [], {
      headers: { 'Cache-Control': 'public, s-maxage=10' },
    });
  }
}
