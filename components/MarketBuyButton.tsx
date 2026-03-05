'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useSendTransaction, useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains';
import { encodeFunctionData, parseAbi } from 'viem';
import { pickPreferredConnector } from '@/lib/wallet';
import { getMarketAddress } from '@/lib/marketplace';

interface MarketBuyButtonProps {
  nftAddress: string;
  tokenId: number;
  priceWei: string;
  priceEth: string;
  onBought?: () => void;
}

const buyAbi = parseAbi(['function buy(address nft, uint256 tokenId) payable']);

function friendlyError(err: unknown): string {
  const msg = (err as Error)?.message ?? String(err);
  if (msg.includes('insufficient funds')) return 'Insufficient funds.';
  if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('denied'))
    return 'Transaction cancelled.';
  if (msg.includes('not listed')) return 'This item is no longer listed.';
  if (msg.includes('wrong price')) return 'Price changed — please refresh.';
  return 'Transaction failed.';
}

export default function MarketBuyButton({ nftAddress, tokenId, priceWei, priceEth, onBought }: MarketBuyButtonProps) {
  const { address, chain, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { switchChain } = useSwitchChain();
  const { sendTransaction, isPending, isSuccess, data: txHash, error: txError, reset } = useSendTransaction();

  const marketAddress = getMarketAddress();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (txError) setError(friendlyError(txError));
  }, [txError]);

  useEffect(() => {
    if (isSuccess && onBought) onBought();
  }, [isSuccess, onBought]);

  if (isSuccess && txHash) {
    return (
      <div className="space-y-2">
        <div className="w-full rounded border border-green-800 bg-green-950 text-green-300 px-4 py-2.5 text-center text-xs">
          Purchased!
        </div>
        <a
          href={`https://basescan.org/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          View on Basescan
        </a>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <button
        onClick={() => {
          setError(null);
          const connector = pickPreferredConnector(connectors);
          if (connector) connect({ connector });
        }}
        className="w-full rounded bg-purple-700 hover:bg-purple-600 text-white font-bold px-3 py-2 text-xs transition-colors cursor-pointer"
      >
        Connect to buy
      </button>
    );
  }

  if (chain?.id !== base.id) {
    return (
      <button
        onClick={() => switchChain({ chainId: base.id })}
        className="w-full rounded border border-yellow-700 bg-yellow-950 text-yellow-300 font-bold px-3 py-2 text-xs transition-colors hover:bg-yellow-900 cursor-pointer"
      >
        Switch to Base
      </button>
    );
  }

  function handleBuy() {
    setError(null);
    reset();

    if (!marketAddress) {
      setError('Marketplace not configured.');
      return;
    }

    const data = encodeFunctionData({
      abi: buyAbi,
      functionName: 'buy',
      args: [nftAddress as `0x${string}`, BigInt(tokenId)],
    });

    sendTransaction({
      to: marketAddress as `0x${string}`,
      value: BigInt(priceWei),
      data,
    });
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleBuy}
        disabled={isPending}
        className="w-full rounded bg-purple-700 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold px-3 py-2 text-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        {isPending ? 'Pending…' : `Buy — ${priceEth} ETH`}
      </button>
      {error && <p className="text-[10px] text-red-400 text-center">{error}</p>}
    </div>
  );
}
