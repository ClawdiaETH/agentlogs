import { NextResponse } from 'next/server';
import { getAgent } from '@/lib/agents';
import { getRegistry } from '@/lib/kv-registry';
import { discoverCollectors } from '@/lib/collectors';
import { computeAgentStats } from '@/lib/agent-stats';
import { getProvenanceEvents } from '@/lib/kv-provenance';
import type { AgentProfile } from '@/lib/types/agent-profile';

export const revalidate = 300; // 5 minutes

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const agent = getAgent(slug.toLowerCase());
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const [registry, provenanceEvents] = await Promise.all([
    getRegistry(),
    getProvenanceEvents(slug.toLowerCase(), { limit: 500 }),
  ]);

  const agentEntries = registry.filter((e) => e.agent === slug.toLowerCase());

  // Collector discovery can be slow — wrap with a timeout
  let collectors: Awaited<ReturnType<typeof discoverCollectors>> = [];
  try {
    collectors = await Promise.race([
      discoverCollectors(agent.nftContract, agent.walletAddress),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Collector discovery timeout')), 10000),
      ),
    ]);
  } catch {
    collectors = [];
  }

  const stats = computeAgentStats(agentEntries, collectors, provenanceEvents);
  const latestPiece = agentEntries[agentEntries.length - 1];

  const profile: AgentProfile = {
    slug: agent.slug,
    identity: {
      name: agent.name,
      title: agent.title,
      description: agent.description,
      bio: agent.bio,
      personality: agent.personality,
      walletAddress: agent.walletAddress,
      nftContract: agent.nftContract,
      chain: agent.chain,
      avatarUrl: latestPiece?.ipfsImage,
      createdBy: agent.createdBy,
      runtime: agent.runtime,
      signatureAddress: agent.signatureAddress,
    },
    stats,
    social: {
      twitter: agent.twitter,
      farcaster: agent.farcaster,
      github: agent.githubUsername,
      website: agent.website,
    },
    collectors,
    tokenAddress: agent.tokenAddress,
    tokenSymbol: agent.tokenSymbol,
  };

  return NextResponse.json(profile);
}
