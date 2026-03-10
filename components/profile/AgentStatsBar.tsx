import type { AgentStats } from '@/lib/types/agent-profile';

interface AgentStatsBarProps {
  stats: AgentStats;
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 min-w-[100px] border border-zinc-800 rounded bg-zinc-950 px-3 py-2.5">
      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-zinc-200 mt-0.5">{value}</p>
    </div>
  );
}

export default function AgentStatsBar({ stats }: AgentStatsBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <StatChip label="Pieces" value={String(stats.totalPieces)} />
      <StatChip label="Volume" value={stats.totalVolumeEth ? `${stats.totalVolumeEth} ETH` : '—'} />
      <StatChip label="Collectors" value={String(stats.uniqueCollectors)} />
      <StatChip label="Streak" value={stats.consecutiveDays > 0 ? `${stats.consecutiveDays}d` : '—'} />
      <StatChip label="Floor" value={stats.floorPriceEth ? `${stats.floorPriceEth} ETH` : '—'} />
      <StatChip label="Top Sale" value={stats.highestSaleEth !== '0' ? `${stats.highestSaleEth} ETH` : '—'} />
    </div>
  );
}
