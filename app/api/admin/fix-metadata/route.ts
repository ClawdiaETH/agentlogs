import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { uploadMetadata } from '@/lib/pinata';
import { getRegistry, setRegistry } from '@/lib/kv-registry';

export const maxDuration = 300;

const SET_TOKEN_URI_ABI = [
  'function setTokenURI(uint256 tokenId, string calldata uri) external',
];

/**
 * Fix on-chain metadata for tokens with broken CIDv1 tokenURIs.
 * Rebuilds metadata JSON from registry, uploads via v1 Pinning API,
 * then calls setTokenURI on the contract.
 *
 * GET /api/admin/fix-metadata?secret=CRON_SECRET[&tokenId=4]
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  const targetTokenId = searchParams.get('tokenId');

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pinataJwt = process.env.PINATA_JWT;
  const privateKey = process.env.PRIVATE_KEY;
  const contractAddress = process.env.NEXT_PUBLIC_SALE_CONTRACT || '0xeb79d5b7369f8cc79e4ed1a9a4d116d883e34868';

  if (!pinataJwt || !privateKey) {
    return NextResponse.json({ error: 'Missing PINATA_JWT or PRIVATE_KEY' }, { status: 500 });
  }

  const registry = await getRegistry();
  const results: Array<{ tokenId: number; status: string; newUri?: string; txHash?: string }> = [];
  let registryUpdated = false;

  for (const entry of registry) {
    // Only fix entries with CIDv1 metadata
    const hasBrokenMetadata = entry.ipfsMetadata?.includes('bafk');
    const isTarget = targetTokenId && entry.tokenId === Number(targetTokenId);

    if (!hasBrokenMetadata && !isTarget) continue;

    try {
      // Build metadata JSON matching the pipeline's buildERC721Metadata format
      const stats = entry.stats ?? {};
      const mcap = stats.mcap ?? 0;
      const change24h = stats.change24h ?? 0;
      const commitCount = stats.commits ?? 0;
      const errors = stats.errors ?? 0;

      const changeStr = change24h >= 0 ? `up ${change24h.toFixed(1)}%` : `down ${Math.abs(change24h).toFixed(1)}%`;
      let mcapStr: string;
      if (mcap >= 1_000_000) mcapStr = `$${(mcap / 1_000_000).toFixed(2)}M`;
      else if (mcap >= 1_000) mcapStr = `$${(mcap / 1_000).toFixed(1)}K`;
      else mcapStr = `$${mcap.toFixed(0)}`;

      const description = `Day ${entry.dayNumber}. ${commitCount} commit${commitCount !== 1 ? 's' : ''}. ${errors} error${errors !== 1 ? 's' : ''}. $CLAWDIA market cap ${mcapStr}, ${changeStr}.`;
      const momentum = change24h > 2 ? 'Bullish' : change24h < -2 ? 'Bearish' : 'Neutral';

      const metadata = {
        name: `Corrupt Memory — Day ${entry.dayNumber}`,
        description,
        image: entry.ipfsImage.replace('https://gateway.pinata.cloud/ipfs/', 'ipfs://'),
        external_url: `https://agentsea.io/clawdia`,
        attributes: [
          { trait_type: 'Agent', value: 'clawdia' },
          { trait_type: 'Day', value: entry.dayNumber },
          { trait_type: 'Date', value: entry.date },
          { trait_type: 'Palette', value: entry.paletteLabel },
          { trait_type: 'Palette ID', value: entry.paletteId },
          { trait_type: 'Commit Count', value: commitCount },
          { trait_type: 'Errors', value: errors },
          { trait_type: 'Messages', value: stats.messages ?? 0 },
          { trait_type: 'Txns', value: stats.txns ?? 0 },
          { trait_type: 'Posts', value: stats.posts ?? 0 },
          { trait_type: 'Peak Hour UTC', value: `${String(stats.peakHour ?? 12).padStart(2, '0')}:00` },
          { trait_type: 'Glitch Index', value: stats.glitchIndex ?? 0 },
          { trait_type: 'MCAP USD', value: Math.round(mcap) },
          { trait_type: '24h Change', value: parseFloat(change24h.toFixed(2)) },
          { trait_type: 'Momentum', value: momentum },
          { trait_type: 'Renderer Version', value: 'v2' },
        ],
      };

      // Upload metadata via v1 API (proper IPFS pinning)
      const metadataUri = await uploadMetadata(
        metadata,
        `Corrupt Memory — day-${String(entry.dayNumber).padStart(3, '0')}`,
        pinataJwt,
      );

      // Call setTokenURI on-chain
      const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org';
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(contractAddress, SET_TOKEN_URI_ABI, wallet);

      const tx = await contract.setTokenURI(entry.tokenId, metadataUri);
      await tx.wait();

      // Update registry
      entry.ipfsMetadata = metadataUri;
      registryUpdated = true;

      results.push({
        tokenId: entry.tokenId,
        status: 'fixed',
        newUri: metadataUri,
        txHash: tx.hash,
      });
    } catch (err) {
      results.push({
        tokenId: entry.tokenId,
        status: `error: ${(err as Error).message}`,
      });
    }
  }

  if (registryUpdated) {
    await setRegistry(registry);
  }

  return NextResponse.json({ results, registryUpdated });
}
