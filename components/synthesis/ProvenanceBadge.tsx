'use client';

import { useVerifyProvenance } from '@/lib/synthesis/useProvenance';
import { useAgent } from '@/lib/synthesis/useRegistry';

interface ProvenanceBadgeProps {
  collectionContract: `0x${string}`;
  tokenId: number;
  compact?: boolean;
}

export function ProvenanceBadge({ collectionContract, tokenId, compact }: ProvenanceBadgeProps) {
  const { provenance, isLoading } = useVerifyProvenance(collectionContract, tokenId);
  const { agent } = useAgent(provenance?.agentWallet || undefined);

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
        <div className="w-3 h-3 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
        {!compact && <span>Verifying...</span>}
      </div>
    );
  }

  if (!provenance || !provenance.verified) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
        <span className="w-3 h-3 rounded-full bg-zinc-800" />
        {!compact && <span>Unverified</span>}
      </div>
    );
  }

  const erc8004Link = provenance.erc8004Identity
    ? `https://basescan.org/address/${provenance.erc8004Identity}`
    : null;

  return (
    <div className="inline-flex items-center gap-1.5 text-xs">
      <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
      {!compact && (
        <>
          <span className="text-green-400 font-medium">Verified Agent</span>
          {agent && (
            <span className="text-zinc-400">
              by{' '}
              {erc8004Link ? (
                <a
                  href={erc8004Link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  {agent.name}
                </a>
              ) : (
                <span className="text-white">{agent.name}</span>
              )}
            </span>
          )}
        </>
      )}
    </div>
  );
}
