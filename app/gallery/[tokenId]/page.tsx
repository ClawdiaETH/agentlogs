import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BuyButton from '@/components/BuyButton';
import StatsGrid from '@/components/StatsGrid';
import { getAgent } from '@/lib/agents';
import registry from '../../../data/registry.json';

type Piece = typeof registry[0];

interface Props {
  params: Promise<{ tokenId: string }>;
}

export default async function GalleryDetail({ params }: Props) {
  const { tokenId } = await params;
  const id = parseInt(tokenId, 10);
  const piece = registry.find((p: Piece) => p.tokenId === id);

  if (!piece) notFound();

  const idx = registry.findIndex((p: Piece) => p.tokenId === id);
  const prev = idx > 0 ? registry[idx - 1] : null;
  const next = idx < registry.length - 1 ? registry[idx + 1] : null;

  const agentConfig = getAgent(piece.agent);
  const contractAddress = agentConfig?.nftContract ?? process.env.NEXT_PUBLIC_SALE_CONTRACT ?? '0x0673834e66b196b9762cbeaa04cc5a53dfe88b6d';
  const agentName = agentConfig?.name ?? piece.agent;
  const seriesTitle = agentConfig?.title ?? piece.title ?? 'Corrupt Memory';

  const ipfsImageCid = piece.ipfsImage.includes('/ipfs/')
    ? piece.ipfsImage.split('/ipfs/')[1]
    : null;
  const ipfsMetadataCid = piece.ipfsMetadata?.startsWith('ipfs://')
    ? piece.ipfsMetadata.replace('ipfs://', '')
    : null;

  return (
    <main className="min-h-screen text-white font-mono">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Navigation */}
        <div className="flex justify-between mb-4 text-xs">
          {prev ? (
            <Link href={`/gallery/${prev.tokenId}`} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              ← Day {prev.dayNumber}
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/gallery/${next.tokenId}`} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              Day {next.dayNumber} →
            </Link>
          ) : <span />}
        </div>

        {/* Full-width image */}
        <div className="relative aspect-square w-full max-w-[760px] mx-auto mb-8 bg-zinc-900 rounded overflow-hidden border border-zinc-800">
          <Image
            src={piece.ipfsImage || '/api/today'}
            alt={`${seriesTitle} — Day ${piece.dayNumber}`}
            fill
            className="object-cover"
            priority
            unoptimized
          />
        </div>

        {/* Title + date */}
        <div className="mb-6">
          <p className="text-xs text-zinc-500 tracking-widest uppercase mb-1">
            Day {piece.dayNumber} · {new Date(piece.date).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{seriesTitle}</h1>
          <p className="text-zinc-400 text-sm mt-1">by {agentName} · 1/1</p>
        </div>

        {/* Stats grid */}
        <div className="mb-8">
          <StatsGrid
            stats={piece.stats}
            palette={piece.palette}
            paletteLabel={(piece as Record<string, unknown>).paletteLabel as string ?? piece.paletteName}
            paletteId={(piece as Record<string, unknown>).paletteId as string ?? piece.paletteName}
          />
        </div>

        {/* Buy / Sold indicator */}
        {piece.sold ? (
          <div className="w-full rounded border border-zinc-700 bg-zinc-900 text-zinc-400 px-6 py-4 text-center text-sm mb-8">
            Sold{piece.buyer ? ` to ${(piece.buyer as string).slice(0, 8)}…` : ''}
          </div>
        ) : (
          <div className="mb-8">
            <BuyButton
              priceEth={piece.priceEth}
              priceWei={piece.price}
              tokenId={piece.tokenId}
              dayNumber={piece.dayNumber}
              saleContract={contractAddress}
            />
          </div>
        )}

        {/* Links */}
        <div className="border-t border-zinc-800 pt-6 text-xs text-zinc-500 space-y-2">
          {ipfsImageCid && (
            <p>
              Image: <a href={`https://gateway.pinata.cloud/ipfs/${ipfsImageCid}`} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-200 transition-colors">IPFS ↗</a>
            </p>
          )}
          {ipfsMetadataCid && (
            <p>
              Metadata: <a href={`https://gateway.pinata.cloud/ipfs/${ipfsMetadataCid}`} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-200 transition-colors">IPFS ↗</a>
            </p>
          )}
          {piece.mintTx && (
            <p>
              Mint tx: <a href={`https://basescan.org/tx/${piece.mintTx}`} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-200 transition-colors">
                {(piece.mintTx as string).slice(0, 14)}… ↗
              </a>
            </p>
          )}
          <p>
            Contract: <a href={`https://basescan.org/address/${contractAddress}`} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-200 transition-colors">
              {contractAddress.slice(0, 10)}…{contractAddress.slice(-6)} ↗
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

export async function generateStaticParams() {
  return registry.map((p: Piece) => ({ tokenId: String(p.tokenId) }));
}
