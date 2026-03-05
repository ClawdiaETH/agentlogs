interface StatsGridProps {
  stats: Record<string, unknown>;
  palette?: string[];
  paletteLabel?: string;
  paletteId?: string;
}

function formatValue(key: string, val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (key === 'mcap') {
    const n = Number(val);
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n}`;
  }
  if (key === 'change24h') return `${Number(val) >= 0 ? '+' : ''}${Number(val).toFixed(2)}%`;
  return String(val);
}

export default function StatsGrid({ stats, palette, paletteLabel }: StatsGridProps) {
  const entries = Object.entries(stats).filter(([, v]) => v !== undefined && v !== null);

  return (
    <div className="border border-zinc-800 rounded bg-zinc-950 p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {entries.map(([key, value]) => (
          <div key={key}>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1')}</p>
            <p className="text-sm font-bold text-zinc-300">{formatValue(key, value)}</p>
          </div>
        ))}
        {paletteLabel && (
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Palette</p>
            <p className="text-sm font-bold text-zinc-300">{paletteLabel}</p>
          </div>
        )}
      </div>
      {palette && palette.length > 0 && (
        <div className="flex gap-2 pt-2 border-t border-zinc-800">
          {palette.map((color, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-sm border border-zinc-700" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-zinc-500 font-mono">{color}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
