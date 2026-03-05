'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useSendTransaction } from 'wagmi';
import { encodeFunctionData, parseAbi } from 'viem';
import { getMarketAddress } from '@/lib/marketplace';

interface OwnedPieceCardProps {
  tokenId: string;
  name: string;
  image: string;
  collectionName: string;
  collectionSlug: string;
  contractAddress?: string;
  aspectRatio?: string;
  pixelArt?: boolean;
  listingPrice?: string;
  onListClick?: () => void;
  onDelisted?: () => void;
  isOwner?: boolean;
}

const delistAbi = parseAbi(['function delist(address nft, uint256 tokenId)']);

function DelistButton({ contractAddress, tokenId, onDelisted }: { contractAddress: string; tokenId: string; onDelisted?: () => void }) {
  const { sendTransaction, isPending, isSuccess } = useSendTransaction();
  const marketAddress = getMarketAddress();

  useEffect(() => {
    if (isSuccess) {
      onDelisted?.();
    }
  }, [isSuccess, onDelisted]);

  if (isSuccess) {
    return (
      <span className="block w-full text-[10px] text-center text-green-400 py-1">Delisted</span>
    );
  }

  return (
    <button
      onClick={() => {
        if (!marketAddress) return;
        const data = encodeFunctionData({
          abi: delistAbi,
          functionName: 'delist',
          args: [contractAddress as `0x${string}`, BigInt(tokenId)],
        });
        sendTransaction({ to: marketAddress as `0x${string}`, data });
      }}
      disabled={isPending}
      className="w-full text-[10px] font-bold text-red-400 border border-red-900 rounded px-2 py-1 hover:bg-red-950 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Delisting...' : 'Delist'}
    </button>
  );
}

export default function OwnedPieceCard({
  tokenId,
  name,
  image,
  collectionName,
  collectionSlug,
  contractAddress,
  aspectRatio,
  pixelArt,
  listingPrice,
  onListClick,
  onDelisted,
  isOwner,
}: OwnedPieceCardProps) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden hover:border-zinc-600 transition-colors group">
      <Link href={`/collections/${collectionSlug}`}>
        <div className="relative bg-zinc-900" style={{ aspectRatio: aspectRatio || '1/1' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={name || `${collectionName} #${tokenId}`}
            className="w-full h-full object-cover"
            style={{ imageRendering: pixelArt ? 'pixelated' : undefined }}
          />
          <span className="absolute top-2 left-2 text-[10px] bg-zinc-900/80 text-zinc-300 px-1.5 py-0.5 rounded font-mono">
            #{tokenId}
          </span>
          {listingPrice && (
            <span className="absolute top-2 right-2 text-[10px] bg-purple-900/80 text-purple-300 px-1.5 py-0.5 rounded font-bold">
              {listingPrice} ETH
            </span>
          )}
        </div>
      </Link>
      <div className="p-2.5">
        <p className="text-xs text-zinc-300 truncate font-medium">
          {name || `${collectionName} #${tokenId}`}
        </p>
        {isOwner && (
          <div className="mt-2">
            {listingPrice && contractAddress ? (
              <DelistButton contractAddress={contractAddress} tokenId={tokenId} onDelisted={onDelisted} />
            ) : (
              <button
                onClick={onListClick}
                className="w-full text-[10px] font-bold text-purple-300 border border-purple-800 rounded px-2 py-1 hover:bg-purple-950 transition-colors cursor-pointer"
              >
                List for sale
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
