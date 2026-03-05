'use client';

import { useEffect, useRef } from 'react';
import { useSendTransaction } from 'wagmi';
import { encodeFunctionData, parseAbi } from 'viem';
import { getMarketAddress } from '@/lib/marketplace';

const delistAbi = parseAbi(['function delist(address nft, uint256 tokenId)']);

interface DelistButtonProps {
  contractAddress: string;
  tokenId: string;
  onDelisted?: () => void;
  className?: string;
}

export default function DelistButton({ contractAddress, tokenId, onDelisted, className }: DelistButtonProps) {
  const { sendTransaction, isPending, isSuccess } = useSendTransaction();
  const marketAddress = getMarketAddress();
  const wasSuccessRef = useRef(false);

  useEffect(() => {
    if (isSuccess && !wasSuccessRef.current) {
      onDelisted?.();
    }
    wasSuccessRef.current = isSuccess;
  }, [isSuccess, onDelisted]);

  if (isSuccess) {
    return <span className="block w-full py-1 text-center text-[10px] text-green-400">Delisted</span>;
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
      className={className ?? 'w-full text-[10px] font-bold text-red-400 border border-red-900 rounded px-2 py-1 hover:bg-red-950 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'}
    >
      {isPending ? 'Delisting...' : 'Delist'}
    </button>
  );
}
