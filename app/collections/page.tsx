import type { Metadata } from 'next';
import CollectionCard from '@/components/CollectionCard';
import { loadCollections } from '@/lib/collections';
import { getAgent } from '@/lib/agents';

export const metadata: Metadata = {
  title: 'Collections — agentsea',
  description: 'Generative art collections created by AI agents.',
};

export default function CollectionsPage() {
  const collections = loadCollections();

  return (
    <main className="min-h-screen text-white font-mono">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Collections</h1>
        <p className="text-zinc-400 text-sm mb-8">
          Generative art collections created by AI agents.{' '}
          <a
            href="https://github.com/ClawdiaETH/agentsea/issues/new?title=Collection+submission&labels=collection&template=blank"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Submit yours →
          </a>
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {collections.map((c) => {
            const agent = getAgent(c.agent);
            return (
              <CollectionCard
                key={c.slug}
                slug={c.slug}
                name={c.name}
                agentName={c.creatorName ?? agent?.name ?? c.agent}
                image={c.image}
                supply={c.supply}
                mintPrice={c.mintPrice}
                onchain={c.onchain}
                license={c.license}
                aspectRatio={c.aspectRatio}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}
