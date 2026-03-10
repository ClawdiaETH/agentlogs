import { rpcCall, rpcGetTransaction } from './rpc';
import { getProvenanceEvents } from './kv-provenance';
import type { AgentConfig } from './agents';
import type { RegistryEntry } from './kv-registry';
import type { ProvenanceEvent } from './types/agent-profile';

const ERC8004_REGISTRY = process.env.ERC8004_REGISTRY || '0x8004A818BFB912233c491871b3d84c89A494BD9e';

export type AutonomyTier =
  | 'fully_autonomous'
  | 'highly_autonomous'
  | 'semi_autonomous'
  | 'human_assisted';

export interface AutonomyScoreBreakdown {
  consecutiveMints: number;    // 0-30
  marketplaceActions: number;  // 0-25
  erc8004Identity: number;     // 0-15
  githubActivity: number;      // 0-15
  uptimeStreak: number;        // 0-10
  age: number;                 // 0-5
}

export interface AutonomyScore {
  score: number;
  tier: AutonomyTier;
  tierLabel: string;
  tierColor: string;
  breakdown: AutonomyScoreBreakdown;
  computedAt: string;
}

function getTier(score: number): { tier: AutonomyTier; label: string; color: string } {
  if (score >= 90) return { tier: 'fully_autonomous', label: 'Fully Autonomous', color: 'emerald' };
  if (score >= 70) return { tier: 'highly_autonomous', label: 'Highly Autonomous', color: 'blue' };
  if (score >= 50) return { tier: 'semi_autonomous', label: 'Semi-Autonomous', color: 'yellow' };
  return { tier: 'human_assisted', label: 'Human-Assisted', color: 'zinc' };
}

/**
 * Check consecutive autonomous mints by verifying tx.from matches
 * the agent's signature address. Score: 1 point per consecutive day, max 30.
 */
async function scoreMints(
  registryEntries: RegistryEntry[],
  signatureAddress: string | undefined,
): Promise<number> {
  if (!signatureAddress || registryEntries.length === 0) return 0;
  const sigLower = signatureAddress.toLowerCase();

  // Check from most recent backwards
  const sorted = [...registryEntries].sort((a, b) => b.dayNumber - a.dayNumber);
  let consecutive = 0;

  for (const entry of sorted) {
    if (!entry.mintTx) break;

    const tx = await rpcGetTransaction(entry.mintTx);
    if (!tx || tx.from.toLowerCase() !== sigLower) break;
    consecutive++;
    if (consecutive >= 30) break;
  }

  return Math.min(consecutive, 30);
}

/**
 * Score marketplace actions where tx.from matches agent wallet.
 * Max 25 points.
 */
function scoreMarketplaceActions(
  provenanceEvents: ProvenanceEvent[],
): number {
  const marketActions = provenanceEvents.filter(
    (e) => e.type === 'list' || e.type === 'sale' || e.type === 'bid' || e.type === 'acquire',
  );

  if (marketActions.length === 0) return 0;

  const autonomousCount = marketActions.filter(
    (e) => e.initiatedBy === 'agent',
  ).length;

  const ratio = autonomousCount / marketActions.length;
  return Math.round(ratio * 25);
}

/**
 * Check ERC-8004 verified identity on Base.
 * balanceOf(address) > 0 = verified.
 */
async function scoreErc8004(walletAddress: string): Promise<number> {
  try {
    // balanceOf(address) selector = 0x70a08231
    const paddedAddr = walletAddress.slice(2).toLowerCase().padStart(64, '0');
    const result = await rpcCall(ERC8004_REGISTRY, `0x70a08231${paddedAddr}`);
    if (!result || result === '0x') return 0;
    const balance = BigInt(result);
    return balance > BigInt(0) ? 15 : 0;
  } catch {
    return 0;
  }
}

/**
 * Score GitHub activity. Uses commit counts from registry stats
 * to avoid needing a separate GitHub API call.
 */
function scoreGithub(registryEntries: RegistryEntry[]): number {
  // Sum commits from last 7 days of entries
  const recent = registryEntries.slice(-7);
  const totalCommits = recent.reduce((sum, e) => sum + (e.stats?.commits ?? 0), 0);

  if (totalCommits >= 16) return 15;
  if (totalCommits >= 6) return 10;
  if (totalCommits >= 1) return 5;
  return 0;
}

/**
 * Score uptime/streak. Max 10 points at 30+ consecutive days.
 */
function scoreUptime(consecutiveDays: number): number {
  if (consecutiveDays >= 30) return 10;
  if (consecutiveDays >= 15) return 7;
  if (consecutiveDays >= 7) return 4;
  if (consecutiveDays >= 1) return 2;
  return 0;
}

/**
 * Score agent age. Max 5 points at 90+ days.
 */
function scoreAge(firstMintDate: string): number {
  if (!firstMintDate) return 0;
  const days = Math.floor(
    (Date.now() - new Date(firstMintDate).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days >= 90) return 5;
  if (days >= 60) return 4;
  if (days >= 30) return 3;
  if (days >= 14) return 2;
  if (days >= 7) return 1;
  return 0;
}

/**
 * Compute the full autonomy score for an agent.
 */
export async function computeAutonomyScore(
  agent: AgentConfig,
  registryEntries: RegistryEntry[],
  consecutiveDays: number,
  firstMintDate: string,
): Promise<AutonomyScore> {
  const provenanceEvents = await getProvenanceEvents(agent.slug, { limit: 500 });

  // Compute all sub-scores (some are async)
  const [consecutiveMints, erc8004Identity] = await Promise.all([
    scoreMints(registryEntries, agent.signatureAddress),
    scoreErc8004(agent.walletAddress),
  ]);

  const marketplaceActions = scoreMarketplaceActions(provenanceEvents);
  const githubActivity = scoreGithub(registryEntries);
  const uptimeStreak = scoreUptime(consecutiveDays);
  const age = scoreAge(firstMintDate);

  const breakdown: AutonomyScoreBreakdown = {
    consecutiveMints,
    marketplaceActions,
    erc8004Identity,
    githubActivity,
    uptimeStreak,
    age,
  };

  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  const { tier, label, color } = getTier(total);

  return {
    score: Math.min(total, 100),
    tier,
    tierLabel: label,
    tierColor: color,
    breakdown,
    computedAt: new Date().toISOString(),
  };
}
