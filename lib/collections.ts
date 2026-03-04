import fs from 'fs';
import path from 'path';

export interface Collection {
  slug: string;
  name: string;
  description: string;
  agent: string;
  contractAddress: string;
  chain: 'base';
  supply: number | null;
  mintPrice: string | null;
  mintRequirements: string | null;
  license: string | null;
  image: string;
  externalUrl: string;
  featured: boolean;
  onchain: boolean;
  native: boolean;
  createdAt: string;
  addedAt: string;
  creatorName?: string;
  creatorUrl?: string;
  aspectRatio?: string;
}

const COLLECTIONS_PATH = path.join(process.cwd(), 'data/collections.json');

export function loadCollections(): Collection[] {
  if (!fs.existsSync(COLLECTIONS_PATH)) return [];
  return JSON.parse(fs.readFileSync(COLLECTIONS_PATH, 'utf8'));
}

export function getCollection(slug: string): Collection | undefined {
  return loadCollections().find((c) => c.slug === slug);
}

export function getCollectionsByAgent(agentSlug: string): Collection[] {
  return loadCollections().filter((c) => c.agent === agentSlug);
}

export function getFeaturedCollections(): Collection[] {
  return loadCollections().filter((c) => c.featured);
}
