import { NextResponse } from 'next/server';
import { getRegistry, setRegistry } from '@/lib/kv-registry';
import { repinToIPFS } from '@/lib/pinata';

export const maxDuration = 300;

/**
 * Re-pin CIDv1 images to public IPFS via v1 Pinning API.
 * Finds all registry entries with bafk... CIDs and re-uploads them.
 *
 * GET /api/admin/repin?secret=CRON_SECRET
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pinataJwt = process.env.PINATA_JWT;
  const pinataGateway = process.env.PINATA_GATEWAY;
  if (!pinataJwt || !pinataGateway) {
    return NextResponse.json(
      { error: 'Missing PINATA_JWT or PINATA_GATEWAY env vars' },
      { status: 500 },
    );
  }

  const registry = await getRegistry();
  const results: Array<{ dayNumber: number; status: string; oldCid?: string; newCid?: string }> = [];
  let updated = false;

  for (const entry of registry) {
    // Extract CID from gateway URL
    const match = entry.ipfsImage.match(/\/ipfs\/(bafk[a-z0-9]+)$/);
    if (!match) continue;

    const cidV1 = match[1];
    try {
      const newIpfsUri = await repinToIPFS(
        cidV1,
        `${entry.title ?? 'Corrupt Memory'} Day ${entry.dayNumber}`,
        pinataJwt,
        pinataGateway,
      );
      const newGatewayUrl = newIpfsUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
      entry.ipfsImage = newGatewayUrl;
      updated = true;
      results.push({
        dayNumber: entry.dayNumber,
        status: 'repinned',
        oldCid: cidV1,
        newCid: newIpfsUri.replace('ipfs://', ''),
      });
    } catch (err) {
      results.push({
        dayNumber: entry.dayNumber,
        status: `error: ${(err as Error).message}`,
        oldCid: cidV1,
      });
    }
  }

  if (updated) {
    await setRegistry(registry);
  }

  return NextResponse.json({ results, registryUpdated: updated });
}
