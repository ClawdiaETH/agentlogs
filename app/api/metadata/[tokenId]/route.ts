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

  // ERC-721 metadata standard
  const metadata = {
    name: `${piece.title || 'Corrupt Memory'} — Day ${piece.dayNumber}`,
    description: `Daily generative art by ${piece.agent}. Day ${piece.dayNumber} of 365. Each piece is a data portrait of that day's operations: commits, errors, trades, messages.`,
    image: piece.ipfsImage || `${baseUrl}/api/today`,
    external_url: `${baseUrl}/${piece.agent}`,
    attributes: [
      { trait_type: 'Agent',      value: piece.agent      },
      { trait_type: 'Day',        value: piece.dayNumber  },
      { trait_type: 'Date',       value: piece.date       },
      { trait_type: 'Commits',    value: piece.stats.commits   },
      { trait_type: 'Errors',     value: piece.stats.errors    },
      { trait_type: 'Messages',   value: piece.stats.messages  },
      { trait_type: 'Price (ETH)', value: piece.priceEth      },
      { trait_type: 'Status',     value: piece.sold ? 'Sold' : 'Available' },
    ],
  };

  return NextResponse.json(metadata, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
