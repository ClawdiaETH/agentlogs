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
  // Fetch extra if filtering by type (we'll trim after)
  const fetchCount = opts?.type ? limit * 3 : limit;
  const offset = opts?.offset ?? 0;

  try {
    const raw = await kv.zrange(kvKey(agent), '+inf', '-inf', {
      byScore: true,
      rev: true,
      offset,
      count: fetchCount,
    });

    let events: ProvenanceEvent[] = raw.map((item) => {
      if (typeof item === 'string') return JSON.parse(item);
      return item as ProvenanceEvent;
    });

    if (opts?.type) {
      events = events.filter((e) => e.type === opts.type);
    }

    return events.slice(0, limit);
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
