'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const PALETTE_NAMES = [
  'Incident', 'Graveyard', 'Sunrise', 'DeFi Day', 'Hypersocial', 'Twilight',
  'Meridian', 'Golden Hour', 'Bankr Mode', 'Farcaster', 'Dormant', 'Surge',
];

export default function PaletteFilter({ activePalettes }: { activePalettes: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('palette');

  function handleClick(palette: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (current === palette) {
      params.delete('palette');
    } else {
      params.set('palette', palette);
    }
    const qs = params.toString();
    router.push(qs ? `/gallery?${qs}` : '/gallery');
  }

  // Only show palettes that actually exist in the registry
  const available = PALETTE_NAMES.filter((p) => activePalettes.includes(p));
  if (available.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {available.map((palette) => (
        <button
          key={palette}
          onClick={() => handleClick(palette)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors cursor-pointer ${
            current === palette
              ? 'border-purple-500 bg-purple-950 text-purple-300'
              : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
          }`}
        >
          {palette}
        </button>
      ))}
      {current && (
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('palette');
            router.push('/gallery');
          }}
          className="text-xs px-3 py-1 rounded-full border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          Clear
        </button>
      )}
    </div>
  );
}
