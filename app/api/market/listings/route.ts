import { NextResponse } from 'next/server';
import { getAllV2Listings, getAllV2Listings as getV2Listings } from '@/lib/market-v2';
import { getAllActiveListings } from '@/lib/marketplace';

export const revalidate = 60;

/**
 * GET /api/market/listings?agent=clawdia&source=v2
 *
 * Returns active listings from V2 (and optionally V1 for backwards compat).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const agentFilter = url.searchParams.get('agent');
  const source = url.searchParams.get('source') ?? 'all';

  try {
    const [v2Listings, v1Listings] = await Promise.all([
      getAllV2Listings(),
      source === 'all' ? getAllActiveListings() : Promise.resolve([]),
    ]);

    // Merge — V2 listings take precedence for same nft+tokenId
    const seen = new Set<string>();
    const merged = [];

    for (const l of v2Listings) {
      const key = `${l.nftAddress.toLowerCase()}:${l.tokenId}`;
      seen.add(key);
      merged.push({ ...l, source: 'v2' as const });
    }

    for (const l of v1Listings) {
      const key = `${l.nftAddress.toLowerCase()}:${l.tokenId}`;
      if (!seen.has(key)) {
        merged.push({ ...l, source: 'v1' as const });
      }
    }

    // Optional agent filter (match nft contract address)
    // For now this is a simple pass-through — agent-specific filtering
    // would require mapping agent slugs to contract addresses
    const results = agentFilter ? merged : merged;

    return NextResponse.json({ listings: results, count: results.length });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
