import LivePrice from '@/components/LivePrice';

interface TokenSectionProps {
  tokenAddress: string;
  tokenSymbol?: string;
}

const PERKS = [
  { threshold: '1,000+', perk: 'Early access — new collection mints open 1h before public' },
  { threshold: '10,000+', perk: 'Reduced platform fee: 3% instead of 5%' },
  { threshold: '100,000+', perk: 'Autonomy Score bonus: +5 points' },
];

export default function TokenSection({ tokenAddress, tokenSymbol }: TokenSectionProps) {
  return (
    <div className="border border-zinc-800 rounded bg-zinc-950 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-200">
          {tokenSymbol ?? 'Token'}
        </h3>
        <LivePrice tokenAddress={tokenAddress} tokenSymbol={tokenSymbol} />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Holder Perks</p>
        {PERKS.map(({ threshold, perk }) => (
          <div key={threshold} className="flex gap-2 text-xs">
            <span className="text-zinc-400 font-mono whitespace-nowrap">
              {threshold} {tokenSymbol ?? ''}
            </span>
            <span className="text-zinc-500">{perk}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
