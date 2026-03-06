import { NextResponse } from 'next/server';
import { getRegistry, markSold } from '@/lib/kv-registry';
import { getAgent } from '@/lib/agents';
import { isAddress } from 'viem';
import { isTokenListed } from '@/lib/sale-listing';
import { revalidatePath } from 'next/cache';

/**
 * POST /api/mark-sold
 * Body: { tokenId: number, buyer: string }
 *
 * Verifies on-chain that the listing is no longer active,
 * then marks the registry entry as sold.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tokenId, buyer } = body;
    const parsedTokenId = Number(tokenId);

    if (!Number.isInteger(parsedTokenId) || parsedTokenId < 0) {
      return NextResponse.json({ error: 'Missing or invalid tokenId' }, { status: 400 });
    }
    if (typeof buyer !== 'string' || !isAddress(buyer)) {
      return NextResponse.json({ error: 'Missing or invalid buyer address' }, { status: 400 });
    }

    // Find registry entry and resolve trusted contract server-side.
    const registry = await getRegistry();
    const entry = registry.find((e) => e.tokenId === parsedTokenId);
    if (!entry) {
      return NextResponse.json({ error: 'Token not found in registry' }, { status: 404 });
    }

    if (entry.sold) {
      return NextResponse.json({ message: 'Already marked as sold' });
    }

    const saleContract = getAgent(entry.agent)?.nftContract;
    if (!saleContract) {
      return NextResponse.json({ error: 'Sale contract not configured' }, { status: 500 });
    }

    const isListed = await isTokenListed(saleContract, parsedTokenId);

    if (isListed) {
      return NextResponse.json({ error: 'Token is still listed on-chain' }, { status: 409 });
    }

    // Mark registry entry as sold after trusted on-chain verification.
    await markSold(parsedTokenId, buyer);

    // Revalidate the collection page so it shows updated status
    revalidatePath('/collections/corrupt-memory');

    return NextResponse.json({ message: 'Marked as sold', tokenId: parsedTokenId });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
