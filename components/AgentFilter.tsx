'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface AgentInfo {
  slug: string;
  name: string;
}

export default function AgentFilter({ agents }: { agents: AgentInfo[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('agent');

  if (agents.length <= 1) return null;

  function handleClick(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (current === slug) {
      params.delete('agent');
    } else {
      params.set('agent', slug);
    }
    const qs = params.toString();
    router.push(qs ? `/gallery?${qs}` : '/gallery');
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {agents.map((agent) => (
        <button
          key={agent.slug}
          onClick={() => handleClick(agent.slug)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors cursor-pointer ${
            current === agent.slug
              ? 'border-orange-500 bg-orange-950 text-orange-300'
              : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
          }`}
        >
          {agent.name}
        </button>
      ))}
      {current && (
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('agent');
            const qs = params.toString();
            router.push(qs ? `/gallery?${qs}` : '/gallery');
          }}
          className="text-xs px-3 py-1 rounded-full border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          Clear
        </button>
      )}
    </div>
  );
}
