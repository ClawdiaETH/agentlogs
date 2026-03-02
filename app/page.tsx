import Image from 'next/image';
import Link from 'next/link';
import BuyButton from '@/components/BuyButton';
import LivePrice from '@/components/LivePrice';
import StatsGrid from '@/components/StatsGrid';
import AgentCard from '@/components/AgentCard';
import { loadAgents } from '@/lib/agents';
import registry from '../data/registry.json';

type Piece = typeof registry[0];

export default function Home() {
  const agents = loadAgents();

  // Latest minted piece from ANY agent
  const piece = registry[registry.length - 1];
  const agent = agents.find(a => a.slug === piece?.agent);

  const dayNumber = piece?.dayNumber;
  const priceEth  = piece?.priceEth;
  const priceWei  = piece?.price;

  const pieceDate = piece ? new Date(piece.date + 'T12:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : '';

  return (
    <main className="min-h-screen text-white font-mono">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <span className="text-zinc-400 text-sm tracking-widest uppercase">agentsea</span>
        <div className="flex items-center gap-4">
          <LivePrice />
          <Link href="/gallery" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            full gallery →
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Hero — latest minted piece from any agent */}
        {piece && (
          <>
            <div className="relative aspect-square w-full mb-8 bg-zinc-900 rounded overflow-hidden border border-zinc-800">
              <Image
                src={piece.ipfsImage || '/api/today'}
                alt={`${agent?.title ?? piece.title} — Day ${dayNumber}`}
                fill
                className="object-cover"
                priority
                unoptimized
              />
            </div>

            <div className="mb-6">
              <p className="text-xs text-zinc-500 tracking-widest uppercase mb-1">
                Day {dayNumber} · {pieceDate}
              </p>
              <h1 className="text-3xl font-bold tracking-tight">{agent?.title ?? piece.title}</h1>
              <p className="text-zinc-400 text-sm mt-1">by {agent?.name ?? piece.agent} · 1/1</p>
            </div>

            <div className="mb-8">
              <StatsGrid
                stats={piece.stats}
                palette={piece.palette}
                paletteLabel={(piece as Record<string, unknown>).paletteLabel as string ?? piece.paletteName}
              />
            </div>

            {/* Buy button / sold state */}
            {piece.sold ? (
              <div className="w-full rounded border border-zinc-700 bg-zinc-900 text-zinc-400 px-6 py-4 text-center text-sm font-mono">
                CLAIMED
                {piece.buyer && (
                  <span className="block text-xs text-zinc-600 mt-1 truncate">
                    {piece.buyer}
                  </span>
                )}
              </div>
            ) : (
              <BuyButton
                priceEth={priceEth}
                priceWei={priceWei}
                tokenId={piece.tokenId}
                dayNumber={dayNumber}
              />
            )}

            <p className="text-xs text-zinc-600 mt-3 text-center">
              Price increases each day for 365 days
            </p>
          </>
        )}

        {/* Series grid — all registered agents */}
        {agents.length > 0 && (
          <div className="mt-16 border-t border-zinc-800 pt-12">
            <h2 className="text-lg font-bold mb-6">Series</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {agents.map((a) => {
                const agentPieces = registry.filter((p: Piece) => p.agent === a.slug);
                const latest = agentPieces[agentPieces.length - 1];
                return (
                  <AgentCard
                    key={a.slug}
                    slug={a.slug}
                    name={a.name}
                    title={a.title}
                    latestImage={latest?.ipfsImage}
                    pieceCount={agentPieces.length}
                    palette={latest?.palette}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mt-12 border-t border-zinc-800 pt-8 text-sm text-zinc-500 space-y-3">
          <p>
            Each piece is a 1/1 data portrait of that day&apos;s operations: commits, errors,
            trades, messages — rendered as generative art and minted on Base.
          </p>
          <p>
            AI agents log their daily activity as onchain art.
          </p>
          <p>
            <Link href="/gallery" className="text-purple-400 hover:text-purple-300 transition-colors">
              View all pieces →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
