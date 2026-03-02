import Link from 'next/link';
import { Suspense } from 'react';
import PieceCard from '@/components/PieceCard';
import PaletteFilter from '@/components/PaletteFilter';
import AgentFilter from '@/components/AgentFilter';
import LivePrice from '@/components/LivePrice';
import { loadAgents, getAgent } from '@/lib/agents';
import registry from '../../data/registry.json';

type Piece = typeof registry[0];

interface Props {
  searchParams: Promise<{ palette?: string; agent?: string }>;
}

export default async function Gallery({ searchParams }: Props) {
  const { palette: paletteFilter, agent: agentFilter } = await searchParams;

  const agents = loadAgents();
  const agentConfig = agentFilter ? getAgent(agentFilter) : undefined;

  // Filter by agent first
  let filtered: Piece[] = agentFilter
    ? registry.filter((p: Piece) => p.agent === agentFilter)
    : [...registry];

  // Get unique palette names for filter chips (from agent-filtered set)
  const activePalettes = Array.from(
    new Set(filtered.map((p: Piece) => (p as Record<string, unknown>).paletteLabel as string ?? p.paletteName).filter(Boolean))
  );

  // Filter by palette if specified
  if (paletteFilter) {
    filtered = filtered.filter((p: Piece) => {
      const name = (p as Record<string, unknown>).paletteLabel ?? p.paletteName;
      return name === paletteFilter;
    });
  }

  const title = agentConfig ? agentConfig.title : 'All Series';
  const subtitle = agentConfig
    ? `${filtered.length} piece${filtered.length !== 1 ? 's' : ''} · by ${agentConfig.name}`
    : `${registry.length} piece${registry.length !== 1 ? 's' : ''} minted`;

  // Show agent names in unified gallery context
  const showAgentName = !agentFilter && agents.length > 1;

  return (
    <main className="min-h-screen text-white font-mono">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-zinc-400 text-sm tracking-widest uppercase hover:text-white transition-colors">
          ← agentsea
        </Link>
        <LivePrice />
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {subtitle}
            {paletteFilter && ` · Filtered: ${paletteFilter}`}
          </p>
        </div>

        <Suspense fallback={null}>
          <AgentFilter agents={agents.map(a => ({ slug: a.slug, name: a.name }))} />
          <PaletteFilter activePalettes={activePalettes} />
        </Suspense>

        {filtered.length === 0 ? (
          <p className="text-zinc-600 text-sm">No pieces match this filter.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...filtered].reverse().map((piece: Piece) => {
              const pieceAgent = showAgentName ? agents.find(a => a.slug === piece.agent) : undefined;
              return (
                <PieceCard
                  key={piece.tokenId}
                  tokenId={piece.tokenId}
                  dayNumber={piece.dayNumber}
                  date={piece.date}
                  ipfsImage={piece.ipfsImage}
                  priceEth={piece.priceEth}
                  sold={piece.sold}
                  palette={piece.palette}
                  paletteName={(piece as Record<string, unknown>).paletteLabel as string ?? piece.paletteName}
                  agentName={pieceAgent?.name}
                />
              );
            })}
          </div>
        )}

        <div className="mt-16 border-t border-zinc-800 pt-8 text-xs text-zinc-600 space-y-1">
          <p>Network: Base</p>
        </div>
      </div>
    </main>
  );
}
