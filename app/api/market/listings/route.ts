import { NextResponse } from 'next/server';
import { getAllV2Listings } from '@/lib/market-v2';
import { getAllActiveListings } from '@/lib/marketplace';
import { getAgent } from '@/lib/agents';

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

    let results = merged;
    if (agentFilter) {
      const agent = getAgent(agentFilter.toLowerCase());
      if (!agent) {
        return NextResponse.json({ listings: [], count: 0 });
      }

      const agentContract = agent.nftContract.toLowerCase();
      results = merged.filter((listing) => listing.nftAddress.toLowerCase() === agentContract);
    }

    return NextResponse.json({ listings: results, count: results.length });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
