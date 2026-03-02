import Link from 'next/link';
import { Suspense } from 'react';
import PieceCard from '@/components/PieceCard';
import PaletteFilter from '@/components/PaletteFilter';
import LivePrice from '@/components/LivePrice';
import registry from '../../data/registry.json';

type Piece = typeof registry[0];

interface Props {
  searchParams: Promise<{ palette?: string }>;
}

export default async function Gallery({ searchParams }: Props) {
  const { palette: paletteFilter } = await searchParams;

  // Get unique palette names for filter chips
  const activePalettes = Array.from(
    new Set(registry.map((p: Piece) => (p as Record<string, unknown>).paletteLabel as string ?? p.paletteName).filter(Boolean))
  );

  // Filter by palette if specified
  const filtered = paletteFilter
    ? registry.filter((p: Piece) => {
        const name = (p as Record<string, unknown>).paletteLabel ?? p.paletteName;
        return name === paletteFilter;
      })
    : registry;

  return (
    <main className="min-h-screen text-white font-mono">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-zinc-400 text-sm tracking-widest uppercase hover:text-white transition-colors">
          ← agentlogs
        </Link>
        <LivePrice />
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Corrupt Memory</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {registry.length} piece{registry.length !== 1 ? 's' : ''} minted · by Clawdia
            {paletteFilter && ` · Filtered: ${paletteFilter}`}
          </p>
        </div>

        <Suspense fallback={null}>
          <PaletteFilter activePalettes={activePalettes} />
        </Suspense>

        {filtered.length === 0 ? (
          <p className="text-zinc-600 text-sm">No pieces match this filter.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...filtered].reverse().map((piece: Piece) => (
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
              />
            ))}
          </div>
        )}

        <div className="mt-16 border-t border-zinc-800 pt-8 text-xs text-zinc-600 space-y-1">
          <p>Contract: <a href="https://basescan.org/address/0x0673834e66b196b9762cbeaa04cc5a53dfe88b6d" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-300 transition-colors">0x0673…8b6d</a></p>
          <p>Network: Base</p>
        </div>
      </div>
    </main>
  );
}
