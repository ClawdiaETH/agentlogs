import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import BuyButton from '@/components/BuyButton';
import LivePrice from '@/components/LivePrice';
import StatsGrid from '@/components/StatsGrid';
import PieceCard from '@/components/PieceCard';
import CollectionStats from '@/components/CollectionStats';
import CollectionItems from '@/components/CollectionItems';
import { getCollection, loadCollections } from '@/lib/collections';
import { getAgent } from '@/lib/agents';
import { getRegistry } from '@/lib/kv-registry';
import type { RegistryEntry } from '@/lib/kv-registry';

type Piece = RegistryEntry;

function getPriceEth(dayNumber: number, startPrice: string, priceIncrement: string): string {
  const start = Number(startPrice) / 1e18;
  const inc   = Number(priceIncrement) / 1e18;
  return (start + (dayNumber - 1) * inc).toFixed(3);
}

function getPriceWei(dayNumber: number, startPrice: string, priceIncrement: string): string {
  return (BigInt(startPrice) + BigInt(priceIncrement) * BigInt(dayNumber - 1)).toString();
}

function getDayNumber(launchDate: string): number {
  const launch = new Date(launchDate);
  const now    = new Date();
  const diff   = Math.floor((now.getTime() - launch.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) return { title: 'Not Found' };

  const agent = getAgent(collection.agent);
  const creatorName = collection.creatorName ?? agent?.name ?? collection.agent;
  return {
    title: `${collection.name} by ${creatorName} — agentsea`,
    description: collection.description,
    openGraph: {
      title: `${collection.name} by ${creatorName}`,
      description: collection.description,
      siteName: 'agentsea',
      images: collection.native ? undefined : [{ url: collection.image }],
    },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();

  const agent = getAgent(collection.agent);

  // Native collections get the full storefront experience
  if (collection.native && agent) {
    const registry = await getRegistry();
    const pieces = registry.filter((p: Piece) => p.agent === collection.agent);
    const latest = pieces[pieces.length - 1];

    const dayNumber = latest?.dayNumber ?? getDayNumber(agent.launchDate);
    const priceEth  = latest?.priceEth ?? getPriceEth(dayNumber, agent.startPrice, agent.priceIncrement);
    const priceWei  = latest?.price ?? getPriceWei(dayNumber, agent.startPrice, agent.priceIncrement);
    const pieceDate = latest
      ? new Date(latest.date + 'T12:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
      <main className="min-h-screen text-white font-mono">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          {/* Hero image */}
          <div className="relative aspect-square w-full mb-8 bg-zinc-900 rounded overflow-hidden border border-zinc-800">
            <Image
              src={latest?.ipfsImage || `/api/today?agent=${collection.agent}`}
              alt={`${collection.name} — Day ${dayNumber}`}
              fill
              className="object-cover"
              priority
              unoptimized
            />
          </div>

          {/* Title */}
          <div className="mb-6">
            <p className="text-xs text-zinc-500 tracking-widest uppercase mb-1">
              Day {dayNumber} · {pieceDate}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">{collection.name}</h1>
            <p className="text-zinc-400 text-sm mt-1">by {agent.name} · 1/1</p>
            <div className="mt-3">
              <LivePrice tokenAddress={agent.tokenAddress} tokenSymbol={agent.tokenSymbol} />
            </div>
          </div>

          {/* Data strip */}
          {latest && (
            <div className="mb-8">
              <StatsGrid
                stats={latest.stats}
                palette={latest.palette}
                paletteLabel={latest.paletteLabel ?? latest.paletteName}
              />
            </div>
          )}

          {/* Buy button / sold state */}
          {latest?.sold ? (
            <div className="w-full rounded border border-zinc-700 bg-zinc-900 text-zinc-400 px-6 py-4 text-center text-sm font-mono">
              Claimed
              {latest.buyer && (
                <span className="block text-xs text-zinc-600 mt-1 truncate">
                  {latest.buyer}
                </span>
              )}
            </div>
          ) : (
            <BuyButton
              priceEth={priceEth}
              priceWei={priceWei}
              tokenId={latest?.tokenId ?? 1}
              dayNumber={dayNumber}
              saleContract={agent.nftContract}
            />
          )}

          <p className="text-xs text-zinc-600 mt-3 text-center">
            Price increases {Number(agent.priceIncrement) / 1e18} ETH each day for 365 days
          </p>

          <div className="mt-12 border-t border-zinc-800 pt-8 text-sm text-zinc-500 space-y-3">
            <p>{collection.description}</p>
            <p>Contract: <a
              href={`https://basescan.org/address/${collection.contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {collection.contractAddress.slice(0, 10)}…{collection.contractAddress.slice(-6)}
            </a></p>
          </div>

          {/* All Pieces */}
          {pieces.length > 0 && (
            <div className="mt-12 border-t border-zinc-800 pt-8">
              <h2 className="text-lg font-bold mb-6">All pieces</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[...pieces].reverse().map((piece: Piece) => (
                  <PieceCard
                    key={piece.tokenId}
                    tokenId={piece.tokenId}
                    dayNumber={piece.dayNumber}
                    date={piece.date}
                    ipfsImage={piece.ipfsImage}
                    priceEth={piece.priceEth}
                    sold={piece.sold}
                    palette={piece.palette}
                    paletteName={piece.paletteLabel ?? piece.paletteName}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // External collections — showcase with mint link
  const hostname = new URL(collection.externalUrl).hostname;
  const creatorName = collection.creatorName ?? agent?.name ?? collection.agent;
  const creatorUrl = collection.creatorUrl ?? (agent ? `/${agent.slug}` : null);

  return (
    <main className="min-h-screen text-white font-mono">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {/* Hero image */}
        <div
          className="relative w-full mb-8 bg-zinc-900 rounded overflow-hidden border border-zinc-800"
          style={{ aspectRatio: collection.aspectRatio || '1/1' }}
        >
          <Image
            src={collection.image}
            alt={collection.name}
            fill
            className="object-cover"
            priority
            unoptimized
          />
        </div>

        {/* Title + Creator */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{collection.name}</h1>
          <p className="text-zinc-400 text-sm mt-1">
            by{' '}
            {creatorUrl ? (
              <a
                href={creatorUrl}
                target={creatorUrl.startsWith('http') ? '_blank' : undefined}
                rel={creatorUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="text-zinc-300 hover:text-white transition-colors"
              >
                {creatorName} &rarr;
              </a>
            ) : (
              creatorName
            )}
          </p>
        </div>

        {/* Stats bar */}
        {collection.onchain && (
          <div className="mb-6">
            <CollectionStats
              contractAddress={collection.contractAddress}
              mintPrice={collection.mintPrice}
              supply={collection.supply}
            />
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-zinc-400 leading-relaxed mb-6">
          {collection.description}
        </p>

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
        <div className="mt-6 text-sm text-zinc-500">
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

        {/* Items grid */}
        {collection.onchain && (
          <div className="mt-12 border-t border-zinc-800 pt-8">
            <CollectionItems
              contractAddress={collection.contractAddress}
              collectionName={collection.name}
              aspectRatio={collection.aspectRatio}
            />
          </div>
        )}
      </div>
    </main>
  );
}

export function generateStaticParams() {
  return loadCollections().map((c) => ({ slug: c.slug }));
}
