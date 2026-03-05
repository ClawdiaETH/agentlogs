'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useSendTransaction, useSwitchChain, useReadContract } from 'wagmi';
import { base } from 'wagmi/chains';
import { encodeFunctionData, parseAbi, formatEther } from 'viem';
import { pickPreferredConnector } from '@/lib/wallet';

interface BuyButtonProps {
  priceEth:  string;
  priceWei:  string;
  tokenId:   number;
  dayNumber: number;
  saleContract?: string;
}

const buyAbi = parseAbi(['function buy(uint256 tokenId) payable']);
const priceAbi = parseAbi(['function getPrice(uint256 tokenId) view returns (uint256)']);

function friendlyError(err: unknown): string {
  const msg = (err as Error)?.message ?? String(err);
  if (msg.includes('insufficient funds')) return 'Insufficient funds.';
  if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('denied'))
    return 'Transaction cancelled.';
  if (msg.includes('already sold') || msg.includes('already claimed'))
    return 'Already sold.';
  if (msg.includes('wrong price')) return 'Price changed — please refresh the page.';
  return 'Transaction failed.';
}

export default function BuyButton({
  priceEth,
  priceWei,
  tokenId,
  dayNumber,
  saleContract = process.env.NEXT_PUBLIC_SALE_CONTRACT ?? '',
}: BuyButtonProps) {
  const { address, chain, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { switchChain } = useSwitchChain();
  const { sendTransaction, isPending, isSuccess, data: txHash, error: txError, reset } = useSendTransaction();

  // Fetch on-chain price for this tokenId — source of truth
  const { data: onchainPrice } = useReadContract({
    address: saleContract as `0x${string}`,
    abi: priceAbi,
    functionName: 'getPrice',
    args: [BigInt(tokenId)],
    chainId: base.id,
    query: { enabled: !!saleContract },
  });

  // Use on-chain price when available, fall back to registry price
  const hasOnchainPrice = onchainPrice != null;
  const actualPriceWei = hasOnchainPrice ? onchainPrice.toString() : priceWei;
  const actualPriceEth = hasOnchainPrice
    ? parseFloat(formatEther(onchainPrice)).toFixed(3)
    : priceEth;

  const [error, setError] = useState<string | null>(null);

  // Clear local error when tx state changes
  useEffect(() => {
    if (txError) setError(friendlyError(txError));
  }, [txError]);

  // Success state
  if (isSuccess && txHash) {
    return (
      <div className="space-y-3">
        <div className="w-full rounded border border-green-800 bg-green-950 text-green-300 px-6 py-4 text-center text-sm">
          Purchased — Day {dayNumber}
        </div>
        <a
          href={`https://basescan.org/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          View on Basescan
        </a>
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => {
            setError(null);
            const connector = pickPreferredConnector(connectors);
            if (connector) connect({ connector });
          }}
          className="w-full rounded bg-purple-700 hover:bg-purple-600 text-white font-bold px-6 py-4 text-lg transition-colors cursor-pointer"
        >
          Connect wallet
        </button>
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      </div>
    );
  }

  // Wrong chain
  if (chain?.id !== base.id) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => switchChain({ chainId: base.id })}
          className="w-full rounded border border-yellow-700 bg-yellow-950 text-yellow-300 font-bold px-6 py-4 text-lg transition-colors hover:bg-yellow-900 cursor-pointer"
        >
          Switch to Base
        </button>
      </div>
    );
  }

  // Ready / Pending
  function handleBuy() {
    setError(null);
    reset();

    if (!saleContract) {
      setError('Sale contract not configured yet. Check back soon.');
      return;
    }

    const data = encodeFunctionData({ abi: buyAbi, functionName: 'buy', args: [BigInt(tokenId)] });

    sendTransaction({
      to: saleContract as `0x${string}`,
      value: BigInt(actualPriceWei),
      data,
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleBuy}
        disabled={isPending}
        className="w-full rounded bg-purple-700 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold px-6 py-4 text-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        {isPending ? 'Transaction pending…' : `Buy — ${actualPriceEth} ETH`}
      </button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
}
