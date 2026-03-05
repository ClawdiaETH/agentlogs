'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains';

export default function ConnectButton() {
  const { address, chain, isConnecting } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Wrong chain
  if (address && chain?.id !== base.id) {
    return (
      <button
        onClick={() => switchChain({ chainId: base.id })}
        className="rounded border border-yellow-700 bg-yellow-950 text-yellow-300 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-yellow-900 cursor-pointer"
      >
        Switch to Base
      </button>
    );
  }

  // Connected
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
          <div className="absolute right-0 mt-1 w-40 rounded border border-zinc-700 bg-zinc-900 py-1 z-50 shadow-lg">
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

  // Not connected — show connector picker
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={isConnecting}
        className="rounded bg-purple-700 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        {isConnecting ? 'Connecting…' : 'Connect'}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 rounded border border-zinc-700 bg-zinc-900 py-1 z-50 shadow-lg">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => { connect({ connector }); setOpen(false); }}
              className="block w-full px-3 py-2 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
            >
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
