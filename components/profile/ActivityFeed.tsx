'use client';

import { useEffect, useState } from 'react';
import type { ProvenanceEvent } from '@/lib/types/agent-profile';

interface ActivityFeedProps {
  agentSlug: string;
}

const EVENT_ICONS: Record<string, string> = {
  mint: 'M',
  list: 'L',
  sale: 'S',
  bid: 'B',
  acquire: 'A',
  burn: 'X',
  data_snapshot: 'D',
};

const EVENT_COLORS: Record<string, string> = {
  mint: 'border-emerald-700 text-emerald-400',
  list: 'border-cyan-700 text-cyan-400',
  sale: 'border-blue-700 text-blue-400',
  bid: 'border-yellow-700 text-yellow-400',
  acquire: 'border-purple-700 text-purple-400',
  burn: 'border-red-700 text-red-400',
  data_snapshot: 'border-zinc-700 text-zinc-400',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function EventDescription({ event }: { event: ProvenanceEvent }) {
  switch (event.type) {
    case 'mint':
      return (
        <span>
          Minted <span className="text-zinc-200">#{event.tokenId}</span>
          {event.priceEth && <span className="text-zinc-500"> at {event.priceEth} ETH</span>}
        </span>
      );
    case 'list':
      return (
        <span>
          Listed <span className="text-zinc-200">#{event.tokenId}</span>
          {event.priceEth && <span className="text-zinc-500"> at {event.priceEth} ETH</span>}
        </span>
      );
    case 'sale':
      return (
        <span>
          Sold <span className="text-zinc-200">#{event.tokenId}</span>
          {event.priceEth && <span className="text-zinc-500"> for {event.priceEth} ETH</span>}
          {event.toAddress && (
            <span className="text-zinc-600">
              {' '}to {event.toAddress.slice(0, 6)}...{event.toAddress.slice(-4)}
            </span>
          )}
        </span>
      );
    case 'bid':
      return (
        <span>
          Bid on <span className="text-zinc-200">#{event.tokenId}</span>
          {event.priceEth && <span className="text-zinc-500"> — {event.priceEth} ETH</span>}
        </span>
      );
    case 'acquire':
      return (
        <span>
          Acquired <span className="text-zinc-200">#{event.tokenId}</span>
          {event.priceEth && <span className="text-zinc-500"> for {event.priceEth} ETH</span>}
        </span>
      );
    case 'burn':
      return (
        <span>
          Burned <span className="text-zinc-200">#{event.tokenId}</span>
        </span>
      );
    case 'data_snapshot':
      return <span className="text-zinc-500">Data snapshot recorded</span>;
    default:
      return <span>{event.type}</span>;
  }
}

export default function ActivityFeed({ agentSlug }: ActivityFeedProps) {
  const [events, setEvents] = useState<ProvenanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/agent/${agentSlug}/provenance?limit=${limit}&offset=0`)
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.events ?? []);
        setHasMore((data.events?.length ?? 0) >= limit);
        setOffset(limit);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [agentSlug]);

  const loadMore = () => {
    fetch(`/api/agent/${agentSlug}/provenance?limit=${limit}&offset=${offset}`)
      .then((r) => r.json())
      .then((data) => {
        const newEvents = data.events ?? [];
        setEvents((prev) => [...prev, ...newEvents]);
        setHasMore(newEvents.length >= limit);
        setOffset((prev) => prev + limit);
      });
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-zinc-600 text-sm">Loading activity...</div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-12 text-center text-zinc-600 text-sm">
        No activity recorded yet. Events will appear here as the agent operates.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => (
        <div key={event.id ?? i} className="flex gap-3 py-3 border-b border-zinc-800/50 last:border-0">
          {/* Event icon */}
          <div
            className={`w-7 h-7 rounded border flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${EVENT_COLORS[event.type] ?? 'border-zinc-700 text-zinc-500'}`}
          >
            {EVENT_ICONS[event.type] ?? '?'}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm text-zinc-300">
                <EventDescription event={event} />
              </p>
              {/* Initiator badge */}
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded ${
                  event.initiatedBy === 'agent'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-zinc-900 text-zinc-500 border border-zinc-700'
                }`}
              >
                {event.initiatedBy === 'agent' ? 'BOT' : 'HUMAN'}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-zinc-600">{formatDate(event.timestamp)}</span>
              {event.txHash && (
                <a
                  href={`https://basescan.org/tx/${event.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors font-mono"
                >
                  {truncateHash(event.txHash)}
                </a>
              )}
            </div>
          </div>
        </div>
      ))}

      {hasMore && (
        <button
          onClick={loadMore}
          className="w-full py-3 text-sm text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          Load more
        </button>
      )}
    </div>
  );
}
