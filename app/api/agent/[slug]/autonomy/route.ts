import { NextResponse } from 'next/server';
import { getAgent } from '@/lib/agents';
import { getRegistry } from '@/lib/kv-registry';
import { computeAutonomyScore } from '@/lib/autonomy-score';
import { computeAgentStats } from '@/lib/agent-stats';
import { getCachedAutonomyScore, setCachedAutonomyScore } from '@/lib/kv-autonomy';

export const revalidate = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const agent = getAgent(slug.toLowerCase());
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Check cache first
  const cached = await getCachedAutonomyScore(slug.toLowerCase());
  if (cached) {
    return NextResponse.json(cached);
  }

  // Compute fresh score
  const registry = await getRegistry();
  const agentEntries = registry.filter((e) => e.agent === slug.toLowerCase());
  const stats = computeAgentStats(agentEntries, [], []);

  const score = await computeAutonomyScore(
    agent,
    agentEntries,
    stats.consecutiveDays,
    stats.firstMintDate,
  );

  // Cache result
  await setCachedAutonomyScore(slug.toLowerCase(), score);

  return NextResponse.json(score);
}
