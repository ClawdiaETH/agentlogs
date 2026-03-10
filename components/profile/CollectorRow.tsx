import type { Collector } from '@/lib/types/agent-profile';

interface CollectorRowProps {
  collector: Collector;
  rank: number;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function CollectorRow({ collector, rank }: CollectorRowProps) {
  const displayName = collector.ensName ?? collector.farcasterName ?? truncateAddress(collector.address);

  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs text-zinc-700 w-5 text-right font-mono">{rank}</span>
        <div className="min-w-0">
          <a
            href={`https://basescan.org/address/${collector.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-300 hover:text-white transition-colors font-mono truncate block"
          >
            {displayName}
          </a>
          {(collector.ensName || collector.farcasterName) && (
            <p className="text-[10px] text-zinc-600 font-mono">
              {truncateAddress(collector.address)}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right">
          <p className="text-sm font-bold text-zinc-200">
            {collector.piecesHeld}
          </p>
          <p className="text-[10px] text-zinc-600">
            piece{collector.piecesHeld !== 1 ? 's' : ''}
          </p>
        </div>
        <p className="text-[10px] text-zinc-600 w-20 text-right">
          since {collector.firstAcquired}
        </p>
      </div>
    </div>
  );
}
