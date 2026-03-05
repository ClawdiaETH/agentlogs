'use client';

import { useState, useRef, useEffect } from 'react';
import {
  useAccount,
  useAccountEffect,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from 'wagmi';
import { base } from 'wagmi/chains';
import { pickPreferredConnector } from '@/lib/wallet';

export default function ConnectButton() {
  const { address, chain, isConnecting } = useAccount();
  const { connectors, connect, error: connectError, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const [stuckTimeout, setStuckTimeout] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useAccountEffect({
    onConnect: () => setOpen(false),
    onDisconnect: () => setOpen(false),
  });

  // Reset stuck state when connection succeeds or errors
  useEffect(() => {
    if (!isConnecting) {
      setStuckTimeout(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [isConnecting]);

  // Clear stuck flag on error
  useEffect(() => {
    if (connectError) {
      setStuckTimeout(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [connectError]);

  // Close dropdown on outside click/touch
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  function autoConnect() {
    reset();
    setStuckTimeout(false);

    const connector = pickPreferredConnector(connectors);
    if (!connector) return;

    connect({ connector });

    // If still connecting after 10s, show retry option
    timeoutRef.current = setTimeout(() => {
      setStuckTimeout(true);
    }, 10_000);
  }

  // Wrong chain
  if (address && chain?.id !== base.id) {
    return (
      <button
        onClick={() => switchChain({ chainId: base.id })}
        className="rounded border border-yellow-700 bg-yellow-950 text-yellow-300 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-yellow-900 cursor-pointer whitespace-nowrap"
      >
        Switch to Base
      </button>
    );
  }

  // Connected — address button with disconnect dropdown
  if (address) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="rounded border border-zinc-700 bg-zinc-900 text-zinc-300 px-3 py-1.5 text-xs font-mono transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
        >
          {address.slice(0, 6)}…{address.slice(-4)}
        </button>
        {open && (
          <div className="absolute right-0 mt-1 w-40 rounded border border-zinc-700 bg-zinc-900 py-1 z-[100] shadow-lg">
            <button
              onClick={() => { disconnect(); setOpen(false); }}
              className="block w-full px-3 py-2 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // Stuck — let user retry
  if (isConnecting && stuckTimeout) {
    return (
      <button
        onClick={() => {
          reset();
          setStuckTimeout(false);
        }}
        className="rounded border border-red-900 bg-red-950 text-red-300 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-red-900 cursor-pointer whitespace-nowrap"
      >
        Retry
      </button>
    );
  }

  // Connection error
  if (connectError) {
    return (
      <button
        onClick={autoConnect}
        className="rounded border border-red-900 bg-red-950 text-red-300 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-red-900 cursor-pointer whitespace-nowrap"
      >
        Retry
      </button>
    );
  }

  // Not connected — single "Connect" button
  return (
    <button
      onClick={autoConnect}
      disabled={isConnecting}
      className="rounded bg-purple-700 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
    >
      {isConnecting ? 'Connecting…' : 'Connect'}
    </button>
  );
}
