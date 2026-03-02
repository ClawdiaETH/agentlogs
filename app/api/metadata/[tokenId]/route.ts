import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Load registry
function loadRegistry() {
  const registryPath = path.join(process.cwd(), 'data/registry.json');
  if (!fs.existsSync(registryPath)) return [];
  return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
}

interface Props {
  params: Promise<{ tokenId: string }>;
}

export async function GET(request: Request, { params }: Props) {
  const { tokenId } = await params;
  const id = parseInt(tokenId, 10);

  if (isNaN(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid token ID' }, { status: 400 });
  }

  const registry = loadRegistry();
  const piece = registry.find((p: { tokenId: number }) => p.tokenId === id);

  if (!piece) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://agentlogs.xyz';

  // Build first-person description from stats
  const stats = piece.stats ?? {};
  const commitCount = stats.commits ?? 0;
  const errors = stats.errors ?? 0;
  const mcap = stats.mcap ?? 0;
  const change24h = stats.change24h ?? 0;
  const changeStr = change24h >= 0 ? `up ${change24h.toFixed(1)}%` : `down ${Math.abs(change24h).toFixed(1)}%`;
  let mcapStr: string;
  if (mcap >= 1_000_000) mcapStr = `$${(mcap / 1_000_000).toFixed(2)}M`;
  else if (mcap >= 1_000) mcapStr = `$${(mcap / 1_000).toFixed(1)}K`;
  else mcapStr = `$${mcap}`;

  const description = `Day ${piece.dayNumber}. ${commitCount} commit${commitCount !== 1 ? 's' : ''}. ${errors} error${errors !== 1 ? 's' : ''}. $CLAWDIA market cap ${mcapStr}, ${changeStr}.`;

  const glitchIndex = stats.glitchIndex ?? 0;
  const momentum = change24h > 2 ? 'Bullish' : change24h < -2 ? 'Bearish' : 'Neutral';

  // ERC-721 metadata standard — 15+ attributes
  const metadata = {
    name: `${piece.title || 'Corrupt Memory'} — Day ${piece.dayNumber}`,
    description,
    image: piece.ipfsImage || `${baseUrl}/api/today`,
    external_url: `${baseUrl}/${piece.agent}`,
    attributes: [
      { trait_type: 'Agent',            value: piece.agent },
      { trait_type: 'Day',              value: piece.dayNumber },
      { trait_type: 'Date',             value: piece.date },
      { trait_type: 'Palette',          value: piece.paletteLabel ?? piece.paletteName ?? 'Unknown' },
      { trait_type: 'Palette ID',       value: piece.paletteId ?? piece.paletteName ?? 'UNKNOWN' },
      { trait_type: 'Commit Count',     value: commitCount },
      { trait_type: 'Errors',           value: errors },
      { trait_type: 'Messages',         value: stats.messages ?? 0 },
      { trait_type: 'Txns',             value: stats.txns ?? 0 },
      { trait_type: 'Posts',            value: stats.posts ?? 0 },
      { trait_type: 'Peak Hour UTC',    value: `${String(stats.peakHour ?? 12).padStart(2, '0')}:00` },
      { trait_type: 'Glitch Index',     value: Math.round(glitchIndex) },
      { trait_type: 'MCAP USD',         value: Math.round(mcap) },
      { trait_type: '24h Change',       value: parseFloat(change24h.toFixed(2)) },
      { trait_type: 'Momentum',         value: momentum },
      { trait_type: 'Price (ETH)',      value: piece.priceEth },
      { trait_type: 'Status',           value: piece.sold ? 'Sold' : 'Available' },
      { trait_type: 'Renderer Version', value: 'v2' },
    ],
  };

  return NextResponse.json(metadata, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
