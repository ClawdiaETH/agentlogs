import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getAgent } from '@/lib/agents';
import { addProvenanceEvent } from '@/lib/kv-provenance';

const RPC_URL = 'https://mainnet.base.org';
const MARKET_V2_ADDRESS = process.env.NEXT_PUBLIC_MARKET_V2_CONTRACT || '';

const MARKET_ABI = [
  'function list(address nft, uint256 tokenId, uint256 price) external',
];

const ERC721_ABI = [
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function setApprovalForAll(address operator, bool approved) external',
];

/**
 * POST /api/market/list
 * Body: { agentSlug, tokenId, priceWei }
 *
 * Server-side agent-initiated listing. Protected by CRON_SECRET.
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
    const { agentSlug, tokenId, priceWei } = body;

    if (!agentSlug || tokenId === undefined || !priceWei) {
      return NextResponse.json(
        { error: 'Missing agentSlug, tokenId, or priceWei' },
        { status: 400 },
      );
    }

    const agent = getAgent(agentSlug);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Ensure marketplace is approved
    const nftContract = new ethers.Contract(agent.nftContract, ERC721_ABI, wallet);
    const isApproved = await nftContract.isApprovedForAll(wallet.address, MARKET_V2_ADDRESS);
    if (!isApproved) {
      const approveTx = await nftContract.setApprovalForAll(MARKET_V2_ADDRESS, true);
      await approveTx.wait();
    }

    // List the token
    const market = new ethers.Contract(MARKET_V2_ADDRESS, MARKET_ABI, wallet);
    const tx = await market.list(agent.nftContract, tokenId, priceWei);
    const receipt = await tx.wait();

    // Record provenance
    const priceEth = (Number(priceWei) / 1e18).toFixed(3);
    await addProvenanceEvent({
      id: `${agentSlug}:list:${tokenId}:${Date.now()}`,
      agent: agentSlug,
      type: 'list',
      initiatedBy: 'agent',
      timestamp: new Date().toISOString(),
      tokenId: Number(tokenId),
      txHash: receipt.hash,
      priceWei: String(priceWei),
      priceEth,
    });

    return NextResponse.json({
      ok: true,
      txHash: receipt.hash,
      tokenId,
      priceWei,
      priceEth,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
