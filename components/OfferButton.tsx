'use client';

import { useState } from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, encodeFunctionData } from 'viem';

interface OfferButtonProps {
  nftAddress: string;
  tokenId: number;
  marketAddress: string;
}

const MAKE_OFFER_ABI = [{
  name: 'makeOffer',
  type: 'function',
  stateMutability: 'payable',
  inputs: [
    { name: 'nft', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
  ],
  outputs: [],
}] as const;

export default function OfferButton({ nftAddress, tokenId, marketAddress }: OfferButtonProps) {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [showInput, setShowInput] = useState(false);

  const { data: txHash, sendTransaction, isPending } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (!isConnected || !marketAddress) return null;

  const handleOffer = () => {
    if (!amount || parseFloat(amount) <= 0) return;

    const data = encodeFunctionData({
      abi: MAKE_OFFER_ABI,
      functionName: 'makeOffer',
      args: [nftAddress as `0x${string}`, BigInt(tokenId)],
    });

    sendTransaction({
      to: marketAddress as `0x${string}`,
      data,
      value: parseEther(amount),
    });
  };

  if (isSuccess) {
    return (
      <div className="text-sm text-emerald-400 border border-emerald-800 rounded px-4 py-2 text-center">
        Offer placed successfully
      </div>
    );
  }

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="text-sm text-zinc-400 border border-zinc-700 rounded px-4 py-2 hover:border-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
      >
        Make Offer
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        step="0.001"
        min="0"
        placeholder="ETH"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-24 text-sm bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 font-mono"
      />
      <button
        onClick={handleOffer}
        disabled={isPending || isConfirming || !amount}
        className="text-sm bg-zinc-800 border border-zinc-600 rounded px-3 py-1.5 text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Confirm...' : isConfirming ? 'Placing...' : 'Submit'}
      </button>
      <button
        onClick={() => setShowInput(false)}
        className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
      >
        Cancel
      </button>
    </div>
  );
}
