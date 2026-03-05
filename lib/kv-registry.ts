import { kv } from '@vercel/kv';
import { readFileSync } from 'fs';
import { join } from 'path';

const REGISTRY_KEY = 'registry:clawdia';

export interface RegistryEntry {
  tokenId: number;
  dayNumber: number;
  date: string;
  agent: string;
  title: string;
  ipfsImage: string;
  ipfsMetadata: string;
  price: string;
  priceEth: string;
  sold: boolean;
  buyer: string | null;
  mintTx: string;
  palette: string[];
  paletteLabel: string;
  paletteId: string;
  paletteName: string;
  seed: string;
  stats: {
    commits: number;
    errors: number;
    messages: number;
    events: number;
    txns: number;
    posts: number;
    peakHour: number;
    glitchIndex: number;
    mcap: number;
    change24h: number;
  };
}

function readJsonFallback(): RegistryEntry[] {
  try {
    const filePath = join(process.cwd(), 'data', 'registry.json');
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as RegistryEntry[];
  } catch {
    return [];
  }
}

export async function getRegistry(): Promise<RegistryEntry[]> {
  // Fall back to JSON file if KV env vars not set (local dev)
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return readJsonFallback();
  }

  try {
    const data = await kv.get<RegistryEntry[]>(REGISTRY_KEY);
    if (data && data.length > 0) {
      return data;
    }
    // KV is empty — fall back to JSON seed
    return readJsonFallback();
  } catch {
    return readJsonFallback();
  }
}

function kvAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function setRegistry(entries: RegistryEntry[]): Promise<void> {
  if (!kvAvailable()) return; // no-op without KV — pipeline uses GitHub commit fallback
  await kv.set(REGISTRY_KEY, entries);
}

export async function addEntry(entry: RegistryEntry): Promise<void> {
  if (!kvAvailable()) return; // no-op — caller falls back to GitHub commit
  const registry = await getRegistry();
  registry.push(entry);
  registry.sort((a, b) => a.tokenId - b.tokenId);
  await setRegistry(registry);
}

export async function markSold(tokenId: number, buyer: string): Promise<void> {
  if (!kvAvailable()) return;
  const registry = await getRegistry();
  const entry = registry.find((e) => e.tokenId === tokenId);
  if (entry) {
    entry.sold = true;
    entry.buyer = buyer;
    await setRegistry(registry);
  }
}

export async function hasDayNumber(dayNumber: number): Promise<boolean> {
  const registry = await getRegistry();
  return registry.some((e) => e.dayNumber === dayNumber);
}
