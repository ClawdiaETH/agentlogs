'use client';

import { useState } from 'react';

interface BuyButtonProps {
  priceEth:  string;
  priceWei:  string;
  tokenId:   number;
  dayNumber: number;
  saleContract?: string;
}

type TxStatus = 'idle' | 'confirm' | 'pending' | 'success' | 'error';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export default function BuyButton({
  priceEth,
  priceWei,
  tokenId,
  dayNumber,
  saleContract = process.env.NEXT_PUBLIC_SALE_CONTRACT ?? '',
}: BuyButtonProps) {
  const [status, setStatus]   = useState<TxStatus>('idle');
  const [txHash, setTxHash]   = useState<string | null>(null);
  const [error,  setError]    = useState<string | null>(null);

  async function handleBuy() {
    setError(null);

    if (!window.ethereum) {
      setError('No wallet detected. Install MetaMask or a Base-compatible wallet.');
      return;
    }

    if (!saleContract) {
      setError('Sale contract not configured yet. Check back soon.');
      return;
    }

    try {
      setStatus('confirm');

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      const from = accounts[0];

      // Switch to Base mainnet (chainId 0x2105 = 8453)
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }],
        });
      } catch (switchErr: unknown) {
        // Chain not added — add it
        if ((switchErr as { code: number }).code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId:          '0x2105',
              chainName:        'Base',
              nativeCurrency:   { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls:          ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          });
        } else {
          throw switchErr;
        }
      }

      // Encode buy(uint256 tokenId) calldata
      // Function selector: keccak256("buy(uint256)") = 0xd96a094a
      const tokenIdHex = BigInt(tokenId).toString(16).padStart(64, '0');
      const data = `0xd96a094a${tokenIdHex}`;

      setStatus('pending');

      const txHashResult = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to:    saleContract,
          value: `0x${BigInt(priceWei).toString(16)}`,
          data,
        }],
      }) as string;

      setTxHash(txHashResult);
      setStatus('success');
    } catch (err: unknown) {
      setStatus('error');
      if ((err as { code: number }).code === 4001) {
        setError('Transaction cancelled.');
      } else {
        setError((err as Error).message ?? 'Transaction failed.');
      }
    }
  }

  if (status === 'success') {
    return (
      <div className="space-y-3">
        <div className="w-full rounded border border-green-800 bg-green-950 text-green-300 px-6 py-4 text-center text-sm">
          ✓ Purchased — Day {dayNumber}
        </div>
        {txHash && (
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            View on Basescan →
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleBuy}
        disabled={status === 'pending' || status === 'confirm'}
        className="w-full rounded bg-purple-700 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold px-6 py-4 text-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        {status === 'confirm' && 'Confirm in wallet…'}
        {status === 'pending' && 'Transaction pending…'}
        {(status === 'idle' || status === 'error') && `Buy — ${priceEth} ETH`}
      </button>

      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
