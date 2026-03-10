'use client';

import { useState, useEffect } from 'react';
import type { AgentProfile } from '@/lib/types/agent-profile';
import type { RegistryEntry } from '@/lib/kv-registry';
import PieceCard from '@/components/PieceCard';
import ActivityFeed from './ActivityFeed';
import CollectorRow from './CollectorRow';

interface ProfileTabsProps {
  profile: AgentProfile;
  pieces: RegistryEntry[];
}

type Tab = 'collections' | 'activity' | 'collectors' | 'marketplace';

const TABS: { key: Tab; label: string }[] = [
  { key: 'collections', label: 'Collections' },
  { key: 'activity', label: 'Activity' },
  { key: 'collectors', label: 'Collectors' },
  { key: 'marketplace', label: 'Marketplace' },
];

export default function ProfileTabs({ profile, pieces }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('collections');

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-zinc-800 mb-6">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm transition-colors cursor-pointer ${
              activeTab === key
                ? 'text-white border-b-2 border-white -mb-px'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {label}
            {key === 'collectors' && profile.collectors.length > 0 && (
              <span className="ml-1.5 text-[10px] text-zinc-600">
                {profile.collectors.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'collections' && (
        <CollectionsContent pieces={pieces} />
      )}
      {activeTab === 'activity' && (
        <ActivityFeed agentSlug={profile.slug} />
      )}
      {activeTab === 'collectors' && (
        <CollectorsContent collectors={profile.collectors} />
      )}
      {activeTab === 'marketplace' && (
        <MarketplaceContent slug={profile.slug} />
      )}
    </div>
  );
}

function CollectionsContent({ pieces }: { pieces: RegistryEntry[] }) {
  if (pieces.length === 0) {
    return (
      <div className="py-12 text-center text-zinc-600 text-sm">
        No pieces minted yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {[...pieces].reverse().map((piece) => (
        <PieceCard
          key={piece.tokenId}
          tokenId={piece.tokenId}
          dayNumber={piece.dayNumber}
          date={piece.date}
          ipfsImage={piece.ipfsImage}
          priceEth={piece.priceEth}
          sold={piece.sold}
          palette={piece.palette}
          paletteName={piece.paletteLabel ?? piece.paletteName}
        />
      ))}
    </div>
  );
}

function CollectorsContent({ collectors }: { collectors: AgentProfile['collectors'] }) {
  if (collectors.length === 0) {
    return (
      <div className="py-12 text-center text-zinc-600 text-sm">
        No collectors yet. Pieces will appear here once they&apos;re acquired.
      </div>
    );
  }

  return (
    <div>
      {collectors.map((c, i) => (
        <CollectorRow key={c.address} collector={c} rank={i + 1} />
      ))}
    </div>
  );
}

function MarketplaceContent({ slug }: { slug: string }) {
  const [listings, setListings] = useState<Array<{
    nftAddress: string;
    tokenId: string;
    seller: string;
    price: string;
    priceEth: string;
    source: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/market/listings?agent=${slug}`)
      .then((r) => r.json())
      .then((data) => setListings(data.listings ?? []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="py-12 text-center text-zinc-600 text-sm">Loading marketplace...</div>;
  }

  if (listings.length === 0) {
    return (
      <div className="py-12 text-center text-zinc-600 text-sm">
        <p>No active listings.</p>
        <a
          href="/marketplace"
          className="text-zinc-400 hover:text-zinc-200 transition-colors mt-2 inline-block text-sm"
        >
          View global marketplace
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((l) => (
        <div
          key={`${l.nftAddress}:${l.tokenId}`}
          className="flex items-center justify-between border border-zinc-800 rounded bg-zinc-950 px-4 py-3"
        >
          <div>
            <p className="text-sm text-zinc-200 font-bold">#{l.tokenId}</p>
            <p className="text-[10px] text-zinc-600 font-mono">
              {l.nftAddress.slice(0, 8)}...{l.nftAddress.slice(-6)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-zinc-200">{l.priceEth} ETH</p>
            <p className="text-[10px] text-zinc-600">{l.source === 'v2' ? 'V2 Market' : 'V1 Market'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
