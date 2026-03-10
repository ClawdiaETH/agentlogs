import { NextResponse } from 'next/server';
import { loadAgents } from '@/lib/agents';
import { getRegistry } from '@/lib/kv-registry';
import { computeAutonomyScore } from '@/lib/autonomy-score';
import { computeAgentStats } from '@/lib/agent-stats';
import { setCachedAutonomyScore } from '@/lib/kv-autonomy';

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const agents = loadAgents();
  const registry = await getRegistry();
  const results: Record<string, { score: number; tier: string }> = {};

  for (const agent of agents) {
    try {
      const agentEntries = registry.filter((e) => e.agent === agent.slug);
      const stats = computeAgentStats(agentEntries, [], []);

      const score = await computeAutonomyScore(
        agent,
        agentEntries,
        stats.consecutiveDays,
        stats.firstMintDate,
      );

      await setCachedAutonomyScore(agent.slug, score);
      results[agent.slug] = { score: score.score, tier: score.tierLabel };
    } catch (err) {
      results[agent.slug] = { score: -1, tier: `error: ${(err as Error).message}` };
    }
  }

  return NextResponse.json({ ok: true, results });
}
