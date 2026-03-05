'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useSendTransaction, useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains';
import { encodeFunctionData, parseAbi } from 'viem';

interface BuyButtonProps {
  priceEth:  string;
  priceWei:  string;
  tokenId:   number;
  dayNumber: number;
  saleContract?: string;
}

const abi = parseAbi(['function buy(uint256 tokenId) payable']);

function friendlyError(err: unknown): string {
  const msg = (err as Error)?.message ?? String(err);
  if (msg.includes('insufficient funds')) return 'Insufficient funds.';
  if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('denied'))
    return 'Transaction cancelled.';
  if (msg.includes('already sold') || msg.includes('already claimed'))
    return 'Already sold.';
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
            // Connect with first available connector
            const connector = connectors[0];
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

    const data = encodeFunctionData({ abi, functionName: 'buy', args: [BigInt(tokenId)] });

    sendTransaction({
      to: saleContract as `0x${string}`,
      value: BigInt(priceWei),
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
        {isPending ? 'Transaction pending…' : `Buy — ${priceEth} ETH`}
      </button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
}
