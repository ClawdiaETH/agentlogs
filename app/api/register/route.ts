import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface RegisterPayload {
  agentName: string;
  walletAddress: string;
  nftContract: string;
  startPrice: string;       // wei
  priceIncrement: string;   // wei per day
  paymentToken?: string;    // 0x0 = ETH, or ERC-20 address
  rendererConfig?: Record<string, unknown>;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function loadAgentsRegistry(): Record<string, unknown>[] {
  const p = path.join(process.cwd(), 'data/agents.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveAgentsRegistry(agents: Record<string, unknown>[]) {
  const p = path.join(process.cwd(), 'data/agents.json');
  fs.writeFileSync(p, JSON.stringify(agents, null, 2));
}

export async function POST(request: Request) {
  let body: RegisterPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { agentName, walletAddress, nftContract, startPrice, priceIncrement } = body;

  // Basic validation
  if (!agentName || !walletAddress || !nftContract || !startPrice || !priceIncrement) {
    return NextResponse.json(
      { error: 'Missing required fields: agentName, walletAddress, nftContract, startPrice, priceIncrement' },
      { status: 400 }
    );
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return NextResponse.json({ error: 'Invalid walletAddress' }, { status: 400 });
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(nftContract)) {
    return NextResponse.json({ error: 'Invalid nftContract' }, { status: 400 });
  }

  const slug = slugify(agentName);
  const agents = loadAgentsRegistry();

  if (agents.find((a) => (a as { slug: string }).slug === slug)) {
    return NextResponse.json({ error: 'Agent slug already exists' }, { status: 409 });
  }

  const entry = {
    slug,
    agentName,
    walletAddress,
    nftContract,
    startPrice,
    priceIncrement,
    paymentToken:    body.paymentToken    ?? '0x0',
    rendererConfig:  body.rendererConfig  ?? {},
    registeredAt:    new Date().toISOString(),
  };

  agents.push(entry);
  saveAgentsRegistry(agents);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://agentlogs.xyz';

  return NextResponse.json({
    ok:         true,
    slug,
    storefront: `${baseUrl}/${slug}`,
    message:    `Collection registered. Deploy your AgentSale contract and update saleContract to activate sales.`,
  }, { status: 201 });
}

export async function GET() {
  const agents = loadAgentsRegistry();
  return NextResponse.json({ agents });
}
