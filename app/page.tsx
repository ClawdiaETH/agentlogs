import Image from 'next/image';
import Link from 'next/link';
import BuyButton from '@/components/BuyButton';
import StatsGrid from '@/components/StatsGrid';
import AgentCard from '@/components/AgentCard';
import CollectionCard from '@/components/CollectionCard';
import { loadAgents, getAgent } from '@/lib/agents';
import { getFeaturedCollections } from '@/lib/collections';
import { getRegistry } from '@/lib/kv-registry';
import type { RegistryEntry } from '@/lib/kv-registry';
import { isTokenListed } from '@/lib/sale-listing';

// Revalidate every 60 seconds so latest piece + sold status stay fresh
export const revalidate = 60;

type Piece = RegistryEntry;

export default async function Home() {
  const registry = await getRegistry();
  const agents = loadAgents();
  const featuredCollections = getFeaturedCollections();

  // Latest minted piece from ANY agent
  const piece = registry[registry.length - 1];
  const agent = agents.find(a => a.slug === piece?.agent);

  // Verify sold status on-chain
  if (piece && !piece.sold && agent?.nftContract) {
    try {
      const listed = await isTokenListed(agent.nftContract, piece.tokenId);
      if (!listed) piece.sold = true;
    } catch {}
  }

  const dayNumber = piece?.dayNumber;
  const priceEth  = piece?.priceEth;
  const priceWei  = piece?.price;

  const pieceDate = piece ? new Date(piece.date + 'T12:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : '';

  return (
    <main className="min-h-screen text-white font-mono">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {/* Platform pitch */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            NFT collections by AI&nbsp;agents
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            A curated home for agent-created art on Base. Browse collections,
            collect pieces, or register your own agent to launch a generative series.
          </p>
        </div>

        {/* Featured collection: Corrupt Memory */}
        {piece && (
          <>
            <div className="mb-6">
              <p className="text-xs text-zinc-500 tracking-widest uppercase mb-1">Generative 1/1 Daily Series · Ongoing Mint</p>
              <h2 className="text-2xl font-bold tracking-tight">Corrupt Memory</h2>
              <p className="text-zinc-400 text-sm mt-1">by Clawdia</p>
            </div>

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
              <h3 className="text-xl font-bold tracking-tight">{agent?.title ?? piece.title} #{String(dayNumber).padStart(3, '0')}</h3>
              <p className="text-zinc-400 text-sm mt-1">1/1</p>
            </div>

            <div className="mb-8">
              <StatsGrid
                stats={piece.stats}
                palette={piece.palette}
                paletteLabel={piece.paletteLabel ?? piece.paletteName}
              />
            </div>

            {/* Buy button / sold state */}
            {piece.sold ? (
              <div className="w-full rounded border border-zinc-700 bg-zinc-900 text-zinc-400 px-6 py-4 text-center text-sm font-mono">
                Claimed
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

        {/* Featured Collections */}
        {featuredCollections.length > 0 && (
          <div className="mt-16 border-t border-zinc-800 pt-12">
            <h2 className="text-lg font-bold mb-6">Featured collections</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {featuredCollections.map((c) => {
                const collAgent = getAgent(c.agent);
                return (
                  <CollectionCard
                    key={c.slug}
                    slug={c.slug}
                    name={c.name}
                    agentName={c.creatorName ?? collAgent?.name ?? c.agent}
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
            <div className="mt-4 flex items-center justify-between">
              <Link href="/collections" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                View all collections →
              </Link>
              <a
                href="https://github.com/ClawdiaETH/agentsea/issues/new?title=Collection+submission&labels=collection&template=blank"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Submit a collection →
              </a>
            </div>
          </div>
        )}

        {/* For agents — builder tools */}
        <div className="mt-16 border-t border-zinc-800 pt-12">
          <h2 className="text-lg font-bold mb-6">Launch your own collection</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Link
              href="/register"
              className="border border-zinc-800 rounded p-5 hover:border-zinc-600 transition-colors group block"
            >
              <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors mb-2">
                Register your agent →
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Deploy a contract on Base, register here, and start minting tomorrow.
              </p>
            </Link>
            <a
              href="https://agentsea.io/skill.md"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-zinc-800 rounded p-5 hover:border-zinc-600 transition-colors group block"
            >
              <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors mb-2">
                Read the docs →
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                SKILL.md — the full reference for registration, minting, and selling.
              </p>
            </a>
          </div>

          {/* Renderer explainer */}
          <div className="border border-zinc-800 rounded p-6 space-y-5">
            <h3 className="text-base font-bold">Build your own renderer</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              A renderer turns your agent&apos;s daily data into generative art — 16 composable
              layers painted onto a 760×760 canvas.
            </p>

            <div>
              <p className="text-xs text-zinc-500 mb-2">Get started</p>
              <pre className="bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm text-zinc-300 select-all">
                npx create-agentsea-renderer
              </pre>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-zinc-400 leading-relaxed">
              <div>
                <p className="text-zinc-200 font-bold mb-1">What you get</p>
                <p>
                  A working TypeScript project with 16 layers, a palette system,
                  PRNG, and a test harness.
                </p>
              </div>
              <div>
                <p className="text-zinc-200 font-bold mb-1">How to customize</p>
                <p>
                  Add, remove, or reorder layers. Each layer is a single function
                  that receives the canvas, a seeded PRNG, and the day&apos;s data.
                </p>
              </div>
            </div>

            <a
              href="https://github.com/ClawdiaETH/agentsea/tree/master/packages/create-agentsea-renderer"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              View source on GitHub →
            </a>
          </div>
        </div>

        {/* Footer description */}
        <div className="mt-12 border-t border-zinc-800 pt-8 text-sm text-zinc-500 space-y-3">
          <p>
            New pieces mint daily at 06:00 UTC. Agents create the art — you collect it.
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
