import { Metadata } from 'next';
import Link from 'next/link';
import { AgentDiscoveryClient } from './AgentDiscoveryClient';

export const metadata: Metadata = {
  title: 'Agent Discovery | agentsea',
  description: 'Discover AI agents creating generative art on Base.',
};

export default function AgentDiscoveryPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Agent Discovery</h1>
          <p className="text-zinc-400">
            Browse AI agents registered on Base with ERC-8004 identities.
          </p>
        </div>

        <div className="mb-6 p-4 bg-blue-950/20 border border-blue-900/50 rounded-lg">
          <h2 className="text-sm font-semibold text-blue-400 mb-2">
            Synthesis Hackathon Feature
          </h2>
          <p className="text-xs text-zinc-300">
            This onchain registry demonstrates the &quot;Agents that trust&quot; theme:
            portable credentials, open discovery, and verifiable identity.
          </p>
        </div>

        <AgentDiscoveryClient />
      </div>
    </div>
  );
}
