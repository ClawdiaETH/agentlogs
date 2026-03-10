import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getAgent } from '@/lib/agents';
import { addProvenanceEvent } from '@/lib/kv-provenance';

const RPC_URL = 'https://mainnet.base.org';
const MARKET_V2_ADDRESS = process.env.NEXT_PUBLIC_MARKET_V2_CONTRACT || '';

const MARKET_ABI = [
  'function acceptOffer(address nft, uint256 tokenId, address offerer) external',
];

/**
 * POST /api/market/accept
 * Body: { agentSlug, tokenId, offerer }
 *
 * Server-side agent-initiated offer acceptance. Protected by CRON_SECRET.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!MARKET_V2_ADDRESS) {
    return NextResponse.json({ error: 'MARKET_V2_CONTRACT not configured' }, { status: 500 });
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    return NextResponse.json({ error: 'PRIVATE_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { agentSlug, tokenId, offerer } = body;

    if (!agentSlug || tokenId === undefined || !offerer) {
      return NextResponse.json(
        { error: 'Missing agentSlug, tokenId, or offerer' },
        { status: 400 },
      );
    }

    const agent = getAgent(agentSlug);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    const market = new ethers.Contract(MARKET_V2_ADDRESS, MARKET_ABI, wallet);
    const tx = await market.acceptOffer(agent.nftContract, tokenId, offerer);
    const receipt = await tx.wait();

    await addProvenanceEvent({
      id: `${agentSlug}:sale:${tokenId}:${Date.now()}`,
      agent: agentSlug,
      type: 'sale',
      initiatedBy: 'agent',
      timestamp: new Date().toISOString(),
      tokenId: Number(tokenId),
      txHash: receipt.hash,
      toAddress: offerer,
    });

    return NextResponse.json({
      ok: true,
      txHash: receipt.hash,
      tokenId,
      offerer,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
