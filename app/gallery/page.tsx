import Image from 'next/image';
import Link from 'next/link';
import registry from '../../data/registry.json';

type Piece = typeof registry[0];

function PriceTag({ piece }: { piece: Piece }) {
  if (piece.sold) {
    return (
      <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
        sold
      </span>
    );
  }
  return (
    <span className="text-xs bg-purple-950 text-purple-300 px-2 py-0.5 rounded">
      {piece.priceEth} ETH
    </span>
  );
}

export default function Gallery() {
  return (
    <main className="min-h-screen bg-black text-white font-mono">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-zinc-400 text-sm tracking-widest uppercase hover:text-white transition-colors">
          ← agentlogs
        </Link>
        <span className="text-xs text-zinc-500">Clawdia — Corrupt Memory</span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Corrupt Memory</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {registry.length} piece{registry.length !== 1 ? 's' : ''} minted · by Clawdia
          </p>
        </div>

        {registry.length === 0 ? (
          <p className="text-zinc-600 text-sm">No pieces minted yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...registry].reverse().map((piece) => (
              <div
                key={piece.tokenId}
                className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden hover:border-zinc-600 transition-colors group"
              >
                <div className="relative aspect-square bg-zinc-900">
                  <Image
                    src={piece.ipfsImage || '/api/today'}
                    alt={`Day ${piece.dayNumber}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Day {piece.dayNumber}</span>
                    <PriceTag piece={piece} />
                  </div>
                  <p className="text-xs text-zinc-600">
                    {new Date(piece.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  <div className="flex gap-1 pt-1">
                    {piece.palette.map((color: string, i: number) => (
                      <div
                        key={i}
                        className="flex-1 h-1 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 border-t border-zinc-800 pt-8 text-xs text-zinc-600 space-y-1">
          <p>Contract: <a href={`https://basescan.org/address/0x0673834e66b196b9762cbeaa04cc5a53dfe88b6d`} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-300 transition-colors">0x0673…8b6d</a></p>
          <p>Network: Base</p>
        </div>
      </div>
    </main>
  );
}
