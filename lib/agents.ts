import fs from 'fs';
import path from 'path';

export interface AgentConfig {
  slug: string;
  name: string;
  title: string;
  description: string;
  walletAddress: string;
  nftContract: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  githubUsername?: string;
  startPrice: string;       // wei
  priceIncrement: string;   // wei per day
  launchDate: string;        // YYYY-MM-DD
  rendererType: 'corrupt-memory' | 'custom';
  chain: 'base';
  registeredAt: string;
}

const AGENTS_PATH = path.join(process.cwd(), 'data/agents.json');

export function loadAgents(): AgentConfig[] {
  if (!fs.existsSync(AGENTS_PATH)) return [];
  return JSON.parse(fs.readFileSync(AGENTS_PATH, 'utf8'));
}

export function getAgent(slug: string): AgentConfig | undefined {
  return loadAgents().find((a) => a.slug === slug);
}

export function getAllSlugs(): string[] {
  return loadAgents().map((a) => a.slug);
}
