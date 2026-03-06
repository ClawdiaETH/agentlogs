import { NextResponse } from 'next/server';
import { rpcCall } from '@/lib/rpc';
import { getRegistry, setRegistry } from '@/lib/kv-registry';
import { getAgent } from '@/lib/agents';
import { keccak256, toHex } from 'viem';
import { revalidatePath } from 'next/cache';

/**
 * POST /api/mark-sold
 * Body: { tokenId: number }
 *
 * Verifies on-chain that the listing is no longer active,
 * then marks the registry entry as sold.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tokenId } = body;
    const parsedTokenId = Number(tokenId);

    if (!Number.isInteger(parsedTokenId) || parsedTokenId < 0) {
      return NextResponse.json({ error: 'Missing or invalid tokenId' }, { status: 400 });
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

    // Verify on-chain: getListing(uint256) returns (uint256 price, bool isListed)
    const selector = keccak256(toHex('getListing(uint256)')).slice(0, 10);
    const paddedId = BigInt(parsedTokenId).toString(16).padStart(64, '0');
    const result = await rpcCall(saleContract, `${selector}${paddedId}`);

    // Parse isListed (second return value, offset 64-128)
    let isListed = true;
    if (result && result.length >= 130) {
      const isListedHex = result.slice(2 + 64, 2 + 128);
      isListed = BigInt('0x' + isListedHex) !== BigInt(0);
    }

    if (isListed) {
      return NextResponse.json({ error: 'Token is still listed on-chain' }, { status: 409 });
    }

    // Mark registry entry as sold after trusted on-chain verification.
    entry.sold = true;
    await setRegistry(registry);

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
