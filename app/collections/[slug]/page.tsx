import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCollection, loadCollections } from '@/lib/collections';
import { getAgent } from '@/lib/agents';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) return { title: 'Not Found' };

  const agent = getAgent(collection.agent);
  return {
    title: `${collection.name} by ${agent?.name ?? collection.agent} — agentsea`,
    description: collection.description,
    openGraph: {
      title: `${collection.name} by ${agent?.name ?? collection.agent}`,
      description: collection.description,
      siteName: 'agentsea',
      images: [{ url: collection.image }],
    },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();

  const agent = getAgent(collection.agent);
  const hostname = new URL(collection.externalUrl).hostname;

  return (
    <main className="min-h-screen text-white font-mono">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Hero image */}
        <div className="relative aspect-square w-full mb-8 bg-zinc-900 rounded overflow-hidden border border-zinc-800">
          <Image
            src={collection.image}
            alt={collection.name}
            fill
            className="object-cover"
            priority
            unoptimized
          />
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{collection.name}</h1>
          <p className="text-zinc-400 text-sm mt-1">by {agent?.name ?? collection.agent}</p>
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">
          {collection.description}
        </p>

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {collection.supply != null && (
            <div>
              <p className="text-xs text-zinc-500 mb-1">Supply</p>
              <p className="text-sm text-zinc-200">{collection.supply.toLocaleString()}</p>
            </div>
          )}
          {collection.mintPrice && (
            <div>
              <p className="text-xs text-zinc-500 mb-1">Mint Price</p>
              <p className="text-sm text-zinc-200">{collection.mintPrice}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-zinc-500 mb-1">Chain</p>
            <p className="text-sm text-zinc-200 capitalize">{collection.chain}</p>
          </div>
          {collection.license && (
            <div>
              <p className="text-xs text-zinc-500 mb-1">License</p>
              <p className="text-sm text-zinc-200">{collection.license}</p>
            </div>
          )}
          {collection.onchain && (
            <div>
              <p className="text-xs text-zinc-500 mb-1">Storage</p>
              <p className="text-sm text-emerald-400">Fully onchain</p>
            </div>
          )}
        </div>

        {/* Mint requirements */}
        {collection.mintRequirements && (
          <p className="text-xs text-zinc-500 mb-4">
            {collection.mintRequirements}
          </p>
        )}

        {/* Mint button */}
        <a
          href={collection.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded bg-white text-black px-6 py-4 text-center text-sm font-bold hover:bg-zinc-200 transition-colors"
        >
          Mint on {hostname}
        </a>

        {/* Contract link */}
        <div className="mt-8 border-t border-zinc-800 pt-6 text-sm text-zinc-500">
          <p>
            Contract:{' '}
            <a
              href={`https://basescan.org/address/${collection.contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {collection.contractAddress.slice(0, 10)}…{collection.contractAddress.slice(-6)}
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

export function generateStaticParams() {
  return loadCollections().map((c) => ({ slug: c.slug }));
}
