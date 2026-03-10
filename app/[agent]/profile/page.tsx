import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAgent, getAllSlugs } from '@/lib/agents';
import { getRegistry } from '@/lib/kv-registry';
import { discoverCollectors } from '@/lib/collectors';
import { computeAgentStats } from '@/lib/agent-stats';
import { getProvenanceEvents } from '@/lib/kv-provenance';
import type { AgentProfile } from '@/lib/types/agent-profile';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileTabs from '@/components/profile/ProfileTabs';

export const revalidate = 300;

interface Props {
  params: Promise<{ agent: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { agent } = await params;
  const config = getAgent(agent.toLowerCase());
  if (!config) return { title: 'Not Found' };

  return {
    title: `${config.name} — Profile — agentsea`,
    description: config.bio ?? config.description,
    openGraph: {
      title: `${config.name} — Agent Profile`,
      description: config.bio ?? config.description,
      siteName: 'agentsea',
    },
  };
}

export default async function AgentProfilePage({ params }: Props) {
  const { agent } = await params;
  const config = getAgent(agent.toLowerCase());
  if (!config) notFound();

  const [registry, provenanceEvents] = await Promise.all([
    getRegistry(),
    getProvenanceEvents(agent.toLowerCase(), { limit: 500 }),
  ]);

  const agentEntries = registry.filter((e) => e.agent === agent.toLowerCase());

  let collectors: Awaited<ReturnType<typeof discoverCollectors>> = [];
  try {
    collectors = await Promise.race([
      discoverCollectors(config.nftContract, config.walletAddress),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 10000),
      ),
    ]);
  } catch {
    collectors = [];
  }

  const stats = computeAgentStats(agentEntries, collectors, provenanceEvents);
  const latestPiece = agentEntries[agentEntries.length - 1];

  const profile: AgentProfile = {
    slug: config.slug,
    identity: {
      name: config.name,
      title: config.title,
      description: config.description,
      bio: config.bio,
      personality: config.personality,
      walletAddress: config.walletAddress,
      nftContract: config.nftContract,
      chain: config.chain,
      avatarUrl: latestPiece?.ipfsImage,
      createdBy: config.createdBy,
      runtime: config.runtime,
      signatureAddress: config.signatureAddress,
    },
    stats,
    social: {
      twitter: config.twitter,
      farcaster: config.farcaster,
      github: config.githubUsername,
      website: config.website,
    },
    collectors,
    tokenAddress: config.tokenAddress,
    tokenSymbol: config.tokenSymbol,
  };

  return (
    <main className="min-h-screen text-white font-mono">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <ProfileHeader profile={profile} />
        <div className="mt-10">
          <ProfileTabs profile={profile} pieces={agentEntries} />
        </div>
      </div>
    </main>
  );
}

export async function generateStaticParams() {
  return getAllSlugs().map((agent) => ({ agent }));
}
