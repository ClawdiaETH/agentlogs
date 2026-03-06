import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { renderImage } from '@/lib/renderer';
import { selectPalette } from '@/lib/renderer/palette';
import { uploadImage, uploadMetadata } from '@/lib/pinata';
import { getRegistry, setRegistry } from '@/lib/kv-registry';
import { revalidatePath } from 'next/cache';
import type { DayLog } from '@/lib/renderer/types';

export const maxDuration = 300;

const SET_TOKEN_URI_ABI = [
  'function setTokenURI(uint256 tokenId, string calldata uri) external',
];

/**
 * Re-render image, rebuild metadata, and optionally update on-chain tokenURI.
 * Single endpoint that does everything atomically from one KV read/write.
 *
 * GET /api/admin/rerender?secret=CRON_SECRET[&day=5][&onchain=true]
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  const targetDay = searchParams.get('day');
  const updateOnchain = searchParams.get('onchain') === 'true';

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt) {
    return NextResponse.json({ error: 'Missing PINATA_JWT' }, { status: 500 });
  }

  const privateKey = process.env.PRIVATE_KEY;
  const contractAddress = '0xeb79d5b7369f8cc79e4ed1a9a4d116d883e34868';

  const registry = await getRegistry();
  const results: Array<{
    dayNumber: number;
    tokenId: number;
    status: string;
    newImage?: string;
    palette?: string;
    metadataUri?: string;
    txHash?: string;
  }> = [];
  let updated = false;

  for (const entry of registry) {
    const hasBrokenCid = entry.ipfsImage.includes('/bafk');
    const isTargetDay = targetDay && entry.dayNumber === Number(targetDay);

    if (!hasBrokenCid && !isTargetDay) continue;

    try {
      // Recompute palette from current stats
      const partialLog = {
        dayNumber: entry.dayNumber,
        errors: entry.stats?.errors ?? 0,
        txns: entry.stats?.txns ?? 0,
        posts: entry.stats?.posts ?? 0,
        messages: entry.stats?.messages ?? 0,
        peakHour: entry.stats?.peakHour ?? 12,
        glitchIndex: entry.stats?.glitchIndex ?? 0,
      };
      const pal = selectPalette(partialLog);

      const stats = entry.stats ?? {};
      const mcap = stats.mcap ?? 0;
      const change24h = stats.change24h ?? 0;
      const commitCount = stats.commits ?? 0;
      const errors = stats.errors ?? 0;

      // Build DayLog for renderer
      const dayLog: DayLog = {
        ...partialLog,
        date: entry.date,
        agent: entry.agent,
        seed: parseInt(entry.seed, 16) || entry.dayNumber,
        tokenSymbol: '$CLAWDIA',
        priceUsd: 0,
        marketCap: mcap,
        change24h,
        volume24h: 0,
        buys24h: 0,
        sells24h: 0,
        mcapNorm: Math.min(1, Math.log10(Math.max(1, mcap) / 1000) / 5),
        momentumSign: change24h >= 0 ? 1 : -1,
        momentumMag: Math.min(1, Math.abs(change24h) / 20),
        commits: [],
        commitCount,
        reposActive: [],
        replies: { twitter: [], farcaster: [], combined: [] },
        paletteId: pal.id,
        paletteLabel: pal.label,
        palette: pal.colors,
      };

      // 1. Re-render the image
      const imageBuffer = renderImage(dayLog);
      const imageUri = await uploadImage(
        imageBuffer,
        `${entry.title ?? 'Corrupt Memory'} — day-${String(entry.dayNumber).padStart(3, '0')}`,
        pinataJwt,
      );

      const newGatewayUrl = imageUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');

      // 2. Build and upload metadata (uses the NEW image URI)
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
        image: imageUri, // ipfs:// URI from upload
        external_url: `https://agentsea.io/clawdia`,
        attributes: [
          { trait_type: 'Agent', value: 'clawdia' },
          { trait_type: 'Day', value: entry.dayNumber },
          { trait_type: 'Date', value: entry.date },
          { trait_type: 'Palette', value: pal.label },
          { trait_type: 'Palette ID', value: pal.id },
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

      const metadataUri = await uploadMetadata(
        metadata,
        `Corrupt Memory — day-${String(entry.dayNumber).padStart(3, '0')}`,
        pinataJwt,
      );

      // 3. Update on-chain tokenURI if requested
      let txHash: string | undefined;
      if (updateOnchain && privateKey) {
        const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org';
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(contractAddress, SET_TOKEN_URI_ABI, wallet);
        const tx = await contract.setTokenURI(entry.tokenId, metadataUri);
        await tx.wait();
        txHash = tx.hash;
      }

      // 4. Update registry entry (all in same read/write cycle)
      entry.ipfsImage = newGatewayUrl;
      entry.ipfsMetadata = metadataUri;
      entry.paletteId = pal.id;
      entry.paletteLabel = pal.label;
      entry.paletteName = pal.label;
      entry.palette = pal.colors;
      updated = true;

      results.push({
        dayNumber: entry.dayNumber,
        tokenId: entry.tokenId,
        status: updateOnchain ? 'rebuilt+onchain' : 'rebuilt',
        newImage: newGatewayUrl,
        palette: pal.id,
        metadataUri,
        txHash,
      });
    } catch (err) {
      results.push({
        dayNumber: entry.dayNumber,
        tokenId: entry.tokenId,
        status: `error: ${(err as Error).message}`,
      });
    }
  }

  if (updated) {
    await setRegistry(registry);
    revalidatePath('/');
    revalidatePath('/clawdia');
    revalidatePath('/collections/corrupt-memory');
    revalidatePath('/gallery');
  }

  return NextResponse.json({ results, registryUpdated: updated });
}
