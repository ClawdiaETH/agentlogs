import { getKv } from './kv-client';
import type { ProvenanceEvent, ProvenanceEventType } from './types/agent-profile';

function kvKey(agent: string): string {
  return `provenance:${agent}`;
}

/**
 * Add a provenance event to the agent's timeline.
 * Uses KV sorted set with unix-ms timestamp as score.
 */
export async function addProvenanceEvent(event: ProvenanceEvent): Promise<void> {
  const kv = getKv();
  if (!kv) return;

  const score = new Date(event.timestamp).getTime();
  await kv.zadd(kvKey(event.agent), { score, member: JSON.stringify(event) });
}

/**
 * Get provenance events for an agent, newest first.
 */
export async function getProvenanceEvents(
  agent: string,
  opts?: { limit?: number; offset?: number; type?: ProvenanceEventType },
): Promise<ProvenanceEvent[]> {
  const kv = getKv();
  if (!kv) return [];

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  try {
    if (!opts?.type) {
      const raw = await kv.zrange(kvKey(agent), '+inf', '-inf', {
        byScore: true,
        rev: true,
        offset,
        count: limit,
      });

      return raw.map((item) => {
        if (typeof item === 'string') return JSON.parse(item);
        return item as ProvenanceEvent;
      });
    }

    const filtered: ProvenanceEvent[] = [];
    const targetCount = offset + limit;
    const fetchCount = Math.max(limit * 3, 50);
    let rawOffset = 0;

    while (filtered.length < targetCount) {
      const raw = await kv.zrange(kvKey(agent), '+inf', '-inf', {
        byScore: true,
        rev: true,
        offset: rawOffset,
        count: fetchCount,
      });

      if (raw.length === 0) break;

      for (const item of raw) {
        const event = typeof item === 'string' ? JSON.parse(item) : (item as ProvenanceEvent);
        if (event.type === opts.type) {
          filtered.push(event);
        }
      }

      rawOffset += raw.length;
      if (raw.length < fetchCount) break;
    }

    return filtered.slice(offset, offset + limit);
  } catch {
    return [];
  }
}

/**
 * Count total provenance events for an agent.
 */
export async function getProvenanceCount(agent: string): Promise<number> {
  const kv = getKv();
  if (!kv) return 0;

  try {
    return await kv.zcard(kvKey(agent));
  } catch {
    return 0;
  }
}
