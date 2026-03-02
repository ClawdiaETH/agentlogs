import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { AgentConfig } from '@/lib/agents';

interface RegisterPayload {
  agentName: string;
  walletAddress: string;
  nftContract: string;
  startPrice: string;       // wei
  priceIncrement: string;   // wei per day
  title?: string;
  description?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  githubUsername?: string;
  launchDate?: string;
  rendererType?: 'corrupt-memory' | 'custom';
  chain?: 'base';
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const AGENTS_PATH = path.join(process.cwd(), 'data/agents.json');

function loadAgentsRegistry(): AgentConfig[] {
  if (!fs.existsSync(AGENTS_PATH)) return [];
  return JSON.parse(fs.readFileSync(AGENTS_PATH, 'utf8'));
}

function saveAgentsRegistry(agents: AgentConfig[]) {
  fs.writeFileSync(AGENTS_PATH, JSON.stringify(agents, null, 2));
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

  if (agents.find((a) => a.slug === slug)) {
    return NextResponse.json({ error: 'Agent slug already exists' }, { status: 409 });
  }

  const entry: AgentConfig = {
    slug,
    name: agentName,
    title: body.title ?? agentName,
    description: body.description ?? '',
    walletAddress,
    nftContract,
    tokenAddress: body.tokenAddress,
    tokenSymbol: body.tokenSymbol,
    githubUsername: body.githubUsername,
    startPrice,
    priceIncrement,
    launchDate: body.launchDate ?? new Date().toISOString().slice(0, 10),
    rendererType: body.rendererType ?? 'corrupt-memory',
    chain: body.chain ?? 'base',
    registeredAt: new Date().toISOString(),
  };

  agents.push(entry);
  saveAgentsRegistry(agents);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://agentsea.vercel.app';

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
