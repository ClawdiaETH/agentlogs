import { getKv } from './kv-client';
import type { AutonomyScore } from './autonomy-score';

function kvKey(slug: string): string {
  return `autonomy:${slug}`;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get cached autonomy score. Returns null if stale or missing.
 */
export async function getCachedAutonomyScore(slug: string): Promise<AutonomyScore | null> {
  const kv = getKv();
  if (!kv) return null;

  try {
    let data = await kv.get<AutonomyScore>(kvKey(slug));
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return null; }
    }
    if (!data || !data.computedAt) return null;

    const age = Date.now() - new Date(data.computedAt).getTime();
    if (age > CACHE_TTL_MS) return null;

    return data;
  } catch {
    return null;
  }
}

/**
 * Store autonomy score in KV.
 */
export async function setCachedAutonomyScore(slug: string, score: AutonomyScore): Promise<void> {
  const kv = getKv();
  if (!kv) return;

  await kv.set(kvKey(slug), score);
}
