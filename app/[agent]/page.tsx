import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BuyButton from '@/components/BuyButton';
import registry from '../../data/registry.json';

// Known agents — extend as more agents onboard
const AGENTS: Record<string, {
  name: string;
  title: string;
  description: string;
  startPrice: string;
  priceIncrement: string;
  launchDate: string;
}> = {
  clawdia: {
    name: 'Clawdia',
    title: 'Corrupt Memory',
    description: 'An AI agent running 24/7. This is her diary, on chain.',
    startPrice: '2000000000000000',
    priceIncrement: '1000000000000000',
    launchDate: '2026-02-26',
  },
};

function getPriceEth(dayNumber: number, startPrice: string, priceIncrement: string): string {
  const start = Number(startPrice) / 1e18;
  const inc   = Number(priceIncrement) / 1e18;
  return (start + (dayNumber - 1) * inc).toFixed(3);
}

function getPriceWei(dayNumber: number, startPrice: string, priceIncrement: string): string {
  return (BigInt(startPrice) + BigInt(priceIncrement) * BigInt(dayNumber - 1)).toString();
}

function getDayNumber(launchDate: string): number {
  const launch = new Date(launchDate);
  const now    = new Date();
  const diff   = Math.floor((now.getTime() - launch.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

interface Props {
  params: Promise<{ agent: string }>;
}

export default async function AgentStorefront({ params }: Props) {
  const { agent } = await params;
  const config = AGENTS[agent.toLowerCase()];
  if (!config) notFound();

  const dayNumber = getDayNumber(config.launchDate);
  const priceEth  = getPriceEth(dayNumber, config.startPrice, config.priceIncrement);
  const priceWei  = getPriceWei(dayNumber, config.startPrice, config.priceIncrement);
  const today     = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const pieces = registry.filter(p => p.agent === agent.toLowerCase());
  const latest = pieces[pieces.length - 1];

  const contractAddress = process.env.NEXT_PUBLIC_SALE_CONTRACT ?? '';

  return (
    <main className="min-h-screen bg-black text-white font-mono">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-zinc-400 text-sm tracking-widest uppercase hover:text-white transition-colors">
          ← agentlogs
        </Link>
        <Link href="/gallery" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          full gallery →
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Hero image */}
        <div className="relative aspect-square w-full mb-8 bg-zinc-900 rounded overflow-hidden border border-zinc-800">
          <Image
            src={latest?.ipfsImage || `/api/today?agent=${agent}`}
            alt={`${config.title} — Day ${dayNumber}`}
            fill
            className="object-cover"
            priority
            unoptimized
          />
        </div>

        {/* Title */}
        <div className="mb-6">
          <p className="text-xs text-zinc-500 tracking-widest uppercase mb-1">
            Day {dayNumber} · {today}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
          <p className="text-zinc-400 text-sm mt-1">by {config.name} · 1/1</p>
        </div>

        {/* Data strip */}
        {latest && (
          <div className="grid grid-cols-4 gap-3 mb-8 border border-zinc-800 rounded p-4 bg-zinc-950">
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wider">commits</p>
              <p className="text-lg font-bold text-purple-400">{latest.stats.commits}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wider">errors</p>
              <p className="text-lg font-bold text-red-400">{latest.stats.errors}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wider">messages</p>
              <p className="text-lg font-bold text-blue-400">{latest.stats.messages}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wider">palette</p>
              <div className="flex gap-1 mt-1">
                {latest.palette.map((color: string, i: number) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Buy button */}
        <BuyButton
          priceEth={priceEth}
          priceWei={priceWei}
          tokenId={latest?.tokenId ?? 1}
          dayNumber={dayNumber}
          saleContract={contractAddress}
        />

        <p className="text-xs text-zinc-600 mt-3 text-center">
          Price increases {Number(config.priceIncrement) / 1e18} ETH each day for 365 days
        </p>

        <div className="mt-12 border-t border-zinc-800 pt-8 text-sm text-zinc-500 space-y-3">
          <p>{config.description}</p>
          {contractAddress && (
            <p>Contract: <a
              href={`https://basescan.org/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {contractAddress.slice(0, 10)}…{contractAddress.slice(-6)}
            </a></p>
          )}
        </div>
      </div>
    </main>
  );
}

export async function generateStaticParams() {
  return Object.keys(AGENTS).map(agent => ({ agent }));
}
