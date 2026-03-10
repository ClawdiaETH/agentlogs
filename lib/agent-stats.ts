import type { RegistryEntry } from './kv-registry';
import type { AgentStats, Collector, ProvenanceEvent } from './types/agent-profile';

/**
 * Compute aggregate stats for an agent from registry entries,
 * discovered collectors, and provenance events.
 */
export function computeAgentStats(
  registryEntries: RegistryEntry[],
  collectors: Collector[],
  provenanceEvents: ProvenanceEvent[],
): AgentStats {
  const pieces = registryEntries;
  const totalPieces = pieces.length;

  // Volume: sum of prices for sold pieces
  const soldPieces = pieces.filter((p) => p.sold);
  const totalVolumeWei = soldPieces.reduce(
    (sum, p) => sum + BigInt(p.price || '0'),
    BigInt(0),
  );

  // Floor price: minimum price among unsold (still listed) pieces
  const unsoldPieces = pieces.filter((p) => !p.sold);
  const floorWei = unsoldPieces.length > 0
    ? unsoldPieces.reduce(
        (min, p) => {
          const price = BigInt(p.price || '0');
          return price < min ? price : min;
        },
        BigInt(unsoldPieces[0].price || '0'),
      )
    : BigInt(0);

  // Highest sale
  const highestWei = soldPieces.length > 0
    ? soldPieces.reduce(
        (max, p) => {
          const price = BigInt(p.price || '0');
          return price > max ? price : max;
        },
        BigInt(0),
      )
    : BigInt(0);

  // First mint date
  const firstMintDate = pieces.length > 0
    ? pieces.reduce((earliest, p) => (p.date < earliest ? p.date : earliest), pieces[0].date)
    : '';

  // Consecutive days streak: count backwards from today
  const consecutiveDays = computeStreak(pieces);

  // Average hold duration for collectors
  const now = Date.now();
  const avgHoldDuration = collectors.length > 0
    ? Math.round(
        collectors.reduce((sum, c) => {
          const acquired = new Date(c.firstAcquired).getTime();
          return sum + (now - acquired) / (1000 * 60 * 60 * 24);
        }, 0) / collectors.length,
      )
    : 0;

  // Autonomous actions from provenance
  const autonomousActionsCount = provenanceEvents.filter(
    (e) => e.initiatedBy === 'agent',
  ).length;

  return {
    totalPieces,
    totalVolume: totalVolumeWei.toString(),
    totalVolumeEth: formatWeiToEth(totalVolumeWei),
    uniqueCollectors: collectors.length,
    avgHoldDuration,
    floorPrice: floorWei.toString(),
    floorPriceEth: formatWeiToEth(floorWei),
    highestSale: highestWei.toString(),
    highestSaleEth: formatWeiToEth(highestWei),
    firstMintDate,
    consecutiveDays,
    autonomousActionsCount,
  };
}

function computeStreak(pieces: RegistryEntry[]): number {
  if (pieces.length === 0) return 0;

  const mintedDates = new Set(pieces.map((p) => p.date));
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (mintedDates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      // Allow today to be missing (not minted yet today)
      break;
    }
  }

  return streak;
}

function formatWeiToEth(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  if (eth === 0) return '0';
  if (eth < 0.001) return '<0.001';
  return eth.toFixed(3);
}
