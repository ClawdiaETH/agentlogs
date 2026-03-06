import { NextResponse } from 'next/server';
import { renderImage } from '@/lib/renderer';
import { uploadImage } from '@/lib/pinata';
import { getRegistry, setRegistry } from '@/lib/kv-registry';
import { revalidatePath } from 'next/cache';
import type { DayLog } from '@/lib/renderer/types';

export const maxDuration = 300;

/**
 * Re-render and re-upload images for registry entries with broken CIDv1 hashes.
 * Uses the v1 Pinning API which properly pins to public IPFS.
 *
 * GET /api/admin/rerender?secret=CRON_SECRET[&day=5]
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  const targetDay = searchParams.get('day');

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt) {
    return NextResponse.json({ error: 'Missing PINATA_JWT' }, { status: 500 });
  }

  const registry = await getRegistry();
  const results: Array<{ dayNumber: number; status: string; newImage?: string }> = [];
  let updated = false;

  for (const entry of registry) {
    // Only process entries with broken CIDv1 hashes, or a specific day
    const hasBrokenCid = entry.ipfsImage.includes('/bafk');
    const isTargetDay = targetDay && entry.dayNumber === Number(targetDay);

    if (!hasBrokenCid && !isTargetDay) continue;

    try {
      // Reconstruct DayLog from registry data
      const dayLog: DayLog = {
        dayNumber: entry.dayNumber,
        date: entry.date,
        agent: entry.agent,
        seed: parseInt(entry.seed, 16) || entry.dayNumber,
        tokenSymbol: '$CLAWDIA',
        priceUsd: 0,
        marketCap: entry.stats?.mcap ?? 0,
        change24h: entry.stats?.change24h ?? 0,
        volume24h: 0,
        buys24h: 0,
        sells24h: 0,
        mcapNorm: Math.min(1, Math.log10(Math.max(1, (entry.stats?.mcap ?? 1)) / 1000) / 5),
        momentumSign: (entry.stats?.change24h ?? 0) >= 0 ? 1 : -1,
        momentumMag: Math.min(1, Math.abs(entry.stats?.change24h ?? 0) / 20),
        commits: [],
        commitCount: entry.stats?.commits ?? 0,
        reposActive: [],
        txns: entry.stats?.txns ?? 0,
        posts: entry.stats?.posts ?? 0,
        errors: entry.stats?.errors ?? 0,
        messages: entry.stats?.messages ?? 0,
        peakHour: entry.stats?.peakHour ?? 12,
        glitchIndex: entry.stats?.glitchIndex ?? 0,
        replies: { twitter: [], farcaster: [], combined: [] },
        paletteId: entry.paletteId,
        paletteLabel: entry.paletteLabel,
        palette: entry.palette,
      };

      // Re-render the image
      const imageBuffer = renderImage(dayLog);

      // Upload via v1 API (proper IPFS pinning, returns CIDv0)
      const imageUri = await uploadImage(
        imageBuffer,
        `${entry.title ?? 'Corrupt Memory'} — day-${String(entry.dayNumber).padStart(3, '0')}`,
        pinataJwt,
      );

      const newGatewayUrl = imageUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
      entry.ipfsImage = newGatewayUrl;
      updated = true;

      results.push({
        dayNumber: entry.dayNumber,
        status: 'rerendered',
        newImage: newGatewayUrl,
      });
    } catch (err) {
      results.push({
        dayNumber: entry.dayNumber,
        status: `error: ${(err as Error).message}`,
      });
    }
  }

  if (updated) {
    await setRegistry(registry);
    revalidatePath('/collections/corrupt-memory');
  }

  return NextResponse.json({ results, registryUpdated: updated });
}
