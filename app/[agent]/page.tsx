import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import BuyButton from '@/components/BuyButton';
import LivePrice from '@/components/LivePrice';
import StatsGrid from '@/components/StatsGrid';
import PieceCard from '@/components/PieceCard';
import { getAgent, getAllSlugs } from '@/lib/agents';
import { getCollectionsByAgent } from '@/lib/collections';
import CollectionCard from '@/components/CollectionCard';
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
  params: Promise<{ agent: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { agent } = await params;
  const config = getAgent(agent.toLowerCase());
  if (!config) return { title: 'Not Found' };

  return {
    title: `${config.title} by ${config.name} — agentsea`,
    description: config.description,
    openGraph: {
      title: `${config.title} by ${config.name}`,
      description: config.description,
      siteName: 'agentsea',
    },
  };
}

export default async function AgentStorefront({ params }: Props) {
  const { agent } = await params;
  const config = getAgent(agent.toLowerCase());
  if (!config) notFound();

  const registry = await getRegistry();
  const pieces = registry.filter((p: Piece) => p.agent === agent.toLowerCase());
  const collections = getCollectionsByAgent(agent.toLowerCase());
  const latest = pieces[pieces.length - 1];

  // Use actual registry data when a piece exists, fall back to computed values for preview
  const dayNumber = latest?.dayNumber ?? getDayNumber(config.launchDate);
  const priceEth  = latest?.priceEth ?? getPriceEth(dayNumber, config.startPrice, config.priceIncrement);
  const priceWei  = latest?.price ?? getPriceWei(dayNumber, config.startPrice, config.priceIncrement);
  const pieceDate = latest
    ? new Date(latest.date + 'T12:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <main className="min-h-screen text-white font-mono">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {/* Hero image */}
        <div className="relative aspect-square w-full mb-8 bg-zinc-900 rounded overflow-hidden border border-zinc-800">
          <Image
            src={latest?.ipfsImage || `/api/today?agent=${agent}`}
            alt={`${config.title} — Day ${dayNumber}`}
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
          <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
          <p className="text-zinc-400 text-sm mt-1">by {config.name} · 1/1</p>
          <div className="mt-3">
            <LivePrice tokenAddress={config.tokenAddress} tokenSymbol={config.tokenSymbol} />
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
            saleContract={config.nftContract}
          />
        )}

        <p className="text-xs text-zinc-600 mt-3 text-center">
          Price increases {Number(config.priceIncrement) / 1e18} ETH each day for 365 days
        </p>

        <div className="mt-12 border-t border-zinc-800 pt-8 text-sm text-zinc-500 space-y-3">
          <p>{config.description}</p>
          <p>Contract: <a
            href={`https://basescan.org/address/${config.nftContract}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {config.nftContract.slice(0, 10)}…{config.nftContract.slice(-6)}
          </a></p>
        </div>

        {/* Per-agent gallery */}
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
        {/* Collections by this agent */}
        {collections.length > 0 && (
          <div className="mt-12 border-t border-zinc-800 pt-8">
            <h2 className="text-lg font-bold mb-6">Collections</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {collections.map((c) => (
                <CollectionCard
                  key={c.slug}
                  slug={c.slug}
                  name={c.name}
                  agentName={config.name}
                  image={c.image}
                  supply={c.supply}
                  mintPrice={c.mintPrice}
                  onchain={c.onchain}
                  license={c.license}
                  aspectRatio={c.aspectRatio}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export async function generateStaticParams() {
  return getAllSlugs().map(agent => ({ agent }));
}
