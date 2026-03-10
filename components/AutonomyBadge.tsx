'use client';

import { useEffect, useState } from 'react';
import type { AutonomyScore } from '@/lib/autonomy-score';

interface AutonomyBadgeProps {
  agentSlug: string;
  size?: 'sm' | 'md';
}

const TIER_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  emerald: {
    bg: 'bg-emerald-950/50',
    border: 'border-emerald-800',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  blue: {
    bg: 'bg-blue-950/50',
    border: 'border-blue-800',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  yellow: {
    bg: 'bg-yellow-950/50',
    border: 'border-yellow-800',
    text: 'text-yellow-400',
    dot: 'bg-yellow-400',
  },
  zinc: {
    bg: 'bg-zinc-900',
    border: 'border-zinc-700',
    text: 'text-zinc-400',
    dot: 'bg-zinc-500',
  },
};

export default function AutonomyBadge({ agentSlug, size = 'md' }: AutonomyBadgeProps) {
  const [data, setData] = useState<AutonomyScore | null>(null);

  useEffect(() => {
    fetch(`/api/agent/${agentSlug}/autonomy`)
      .then((r) => r.json())
      .then((d) => {
        if (d.score !== undefined) setData(d);
      })
      .catch(() => {});
  }, [agentSlug]);

  if (!data) return null;

  const style = TIER_STYLES[data.tierColor] ?? TIER_STYLES.zinc;
  const isSm = size === 'sm';

  return (
    <div
      className={`inline-flex items-center gap-1.5 border rounded-full ${style.bg} ${style.border} ${
        isSm ? 'px-2 py-0.5' : 'px-3 py-1'
      }`}
      title={`${data.tierLabel} — Score: ${data.score}/100`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span className={`font-bold ${style.text} ${isSm ? 'text-[10px]' : 'text-xs'}`}>
        {data.score}
      </span>
      {!isSm && (
        <span className={`text-[10px] ${style.text} opacity-70`}>
          {data.tierLabel}
        </span>
      )}
    </div>
  );
}
