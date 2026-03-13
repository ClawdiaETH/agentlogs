'use client';

import Link from 'next/link';
import { useActiveAgents } from '@/lib/synthesis/useRegistry';
import { useCollectionReputation } from '@/lib/synthesis/useAttestation';

export function AgentDiscoveryClient() {
  const { agents, isLoading } = useActiveAgents();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          <p className="text-sm text-zinc-400">Loading agents...</p>
        </div>
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="border border-zinc-800 rounded-lg p-8 text-center">
        <p className="text-zinc-400 mb-4">No agents registered yet.</p>
        <Link
          href="/register"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors"
        >
          Be the first →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {agents.map((agent) => (
        <AgentCard key={agent.wallet} agent={agent} />
      ))}
    </div>
  );
}

function AgentCard({ agent }: { agent: any }) {
  const { reputation } = useCollectionReputation(agent.collectionContract, 365); // Assume max 365 pieces

  return (
    <div className="border border-zinc-800 rounded-lg p-6 bg-black/50 hover:border-zinc-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold mb-1">{agent.name}</h3>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <a
              href={`https://basescan.org/address/${agent.wallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-300 font-mono"
            >
              {agent.wallet.slice(0, 6)}...{agent.wallet.slice(-4)}
            </a>
            <span>•</span>
            <a
              href={`https://basescan.org/address/${agent.erc8004Identity}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300"
            >
              ERC-8004 #{agent.erc8004TokenId.toString()}
            </a>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-zinc-600" />
          <span className="text-xs text-zinc-400 font-medium">Registered</span>
        </div>
      </div>

      {agent.metadataURI && (
        <p className="text-sm text-zinc-400 mb-4">
          {/* In production, fetch and display metadata from IPFS */}
          <a href={agent.metadataURI} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-200">
            View metadata →
          </a>
        </p>
      )}

      {reputation && reputation.totalAttestations > 0 && (
        <div className="flex items-center gap-6 text-xs mb-4 pb-4 border-b border-zinc-800">
          <div>
            <span className="text-zinc-500">Attestations:</span>{' '}
            <span className="text-white font-medium">{reputation.totalAttestations}</span>
          </div>
          <div>
            <span className="text-zinc-500">Avg rating:</span>{' '}
            <span className="text-white font-medium">{reputation.avgRating.toFixed(1)}/5</span>
          </div>
          <div>
            <span className="text-zinc-500">Authenticity:</span>{' '}
            <span className="text-white font-medium">{reputation.avgAuthenticity}%</span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href={`/gallery?collection=${agent.collectionContract}`}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded transition-colors text-sm"
        >
          View Collection
        </Link>
        <a
          href={`https://basescan.org/address/${agent.collectionContract}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white font-medium rounded transition-colors text-sm"
        >
          Contract ↗
        </a>
      </div>
    </div>
  );
}
