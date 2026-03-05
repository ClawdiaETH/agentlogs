'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSendTransaction, useSwitchChain, useReadContract } from 'wagmi';
import { base } from 'wagmi/chains';
import { encodeFunctionData, parseAbi, parseEther } from 'viem';
import { getMarketAddress } from '@/lib/marketplace';

interface ListModalProps {
  nftAddress: string;
  tokenId: number;
  tokenName: string;
  onClose: () => void;
  onListed: () => void;
}

const approvalAbi = parseAbi([
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function setApprovalForAll(address operator, bool approved)',
]);

const marketAbi = parseAbi([
  'function list(address nft, uint256 tokenId, uint256 price)',
]);

export default function ListModal({ nftAddress, tokenId, tokenName, onClose, onListed }: ListModalProps) {
  const { address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { sendTransaction, isPending, isSuccess, data: txHash, error: txError, reset } = useSendTransaction();

  const marketAddress = getMarketAddress();
  const [priceInput, setPriceInput] = useState('');
  const [step, setStep] = useState<'approve' | 'list'>('approve');
  const [error, setError] = useState<string | null>(null);
  const [approvalPending, setApprovalPending] = useState(false);

  // Check if marketplace is already approved
  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: nftAddress as `0x${string}`,
    abi: approvalAbi,
    functionName: 'isApprovedForAll',
    args: address ? [address, marketAddress as `0x${string}`] : undefined,
    chainId: base.id,
    query: { enabled: !!address && !!marketAddress },
  });

  useEffect(() => {
    if (isApproved) setStep('list');
  }, [isApproved]);

  // Handle tx success
  useEffect(() => {
    if (isSuccess && txHash) {
      if (step === 'approve') {
        setApprovalPending(false);
        // Wait a bit for the approval to be indexed, then refetch
        setTimeout(() => {
          refetchApproval();
          setStep('list');
          reset();
        }, 2000);
      } else {
        // Listing succeeded
        onListed();
      }
    }
  }, [isSuccess, txHash, step, refetchApproval, reset, onListed]);

  useEffect(() => {
    if (txError) {
      const msg = (txError as Error)?.message ?? '';
      if (msg.includes('User rejected') || msg.includes('denied')) {
        setError('Transaction cancelled.');
      } else {
        setError('Transaction failed.');
      }
      setApprovalPending(false);
    }
  }, [txError]);

  if (chain?.id !== base.id) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => switchChain({ chainId: base.id })}
            className="w-full rounded border border-yellow-700 bg-yellow-950 text-yellow-300 font-bold px-4 py-3 text-sm transition-colors hover:bg-yellow-900 cursor-pointer"
          >
            Switch to Base
          </button>
        </div>
      </div>
    );
  }

  function handleApprove() {
    setError(null);
    reset();

    if (!marketAddress) {
      setError('Marketplace not configured.');
      return;
    }

    setApprovalPending(true);

    const data = encodeFunctionData({
      abi: approvalAbi,
      functionName: 'setApprovalForAll',
      args: [marketAddress as `0x${string}`, true],
    });

    sendTransaction({
      to: nftAddress as `0x${string}`,
      data,
    });
  }

  function handleList() {
    setError(null);
    reset();

    if (!marketAddress) {
      setError('Marketplace not configured.');
      return;
    }

    const price = priceInput.trim();
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      setError('Enter a valid price in ETH.');
      return;
    }

    const priceWei = parseEther(price);
    const data = encodeFunctionData({
      abi: marketAbi,
      functionName: 'list',
      args: [nftAddress as `0x${string}`, BigInt(tokenId), priceWei],
    });

    sendTransaction({
      to: marketAddress as `0x${string}`,
      data,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">List for sale</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-lg cursor-pointer">&times;</button>
        </div>

        <p className="text-xs text-zinc-400">{tokenName || `#${tokenId}`}</p>

        {/* Success state */}
        {isSuccess && step === 'list' && (
          <div className="rounded border border-green-800 bg-green-950 text-green-300 px-4 py-3 text-center text-sm">
            Listed successfully!
          </div>
        )}

        {/* Step 1: Approve */}
        {step === 'approve' && !isSuccess && (
          <>
            <p className="text-xs text-zinc-500">
              First, approve the marketplace to transfer your NFTs.
            </p>
            <button
              onClick={handleApprove}
              disabled={isPending || approvalPending}
              className="w-full rounded bg-white text-black font-bold px-4 py-3 text-sm transition-colors hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPending || approvalPending ? 'Approving...' : 'Approve Marketplace'}
            </button>
          </>
        )}

        {/* Step 2: Set price + list */}
        {step === 'list' && !(isSuccess && txHash) && (
          <>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Price (ETH)</label>
              <input
                type="text"
                inputMode="decimal"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="0.01"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-purple-600"
              />
            </div>
            <button
              onClick={handleList}
              disabled={isPending}
              className="w-full rounded bg-purple-700 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold px-4 py-3 text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isPending ? 'Listing...' : 'List for sale'}
            </button>
          </>
        )}

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      </div>
    </div>
  );
}
