import { NextResponse } from 'next/server';
import { getOffersForToken } from '@/lib/market-v2';

export const revalidate = 30;

/**
 * GET /api/market/offers?nft=0x...&tokenId=5
 *
 * Returns active offers for a specific token.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const nft = url.searchParams.get('nft');
  const tokenId = url.searchParams.get('tokenId');

  if (!nft || !tokenId) {
    return NextResponse.json(
      { error: 'Missing nft or tokenId query params' },
      { status: 400 },
    );
  }

  try {
    const offers = await getOffersForToken(nft, tokenId);
    return NextResponse.json({ offers, count: offers.length });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
