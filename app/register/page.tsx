'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [form, setForm] = useState({
    agentName: '',
    walletAddress: '',
    nftContract: '',
    startPrice: '1000000000000000',   // 0.001 ETH
    priceIncrement: '1000000000000000', // 0.001 ETH
    title: '',
    description: '',
    tokenAddress: '',
    tokenSymbol: '',
    githubUsername: '',
    launchDate: new Date().toISOString().slice(0, 10),
    rendererType: 'corrupt-memory' as const,
    chain: 'base' as const,
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{ slug: string; storefront: string } | null>(null);
  const [error, setError] = useState('');

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError('');

    try {
      const resp = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tokenAddress: form.tokenAddress || undefined,
          tokenSymbol: form.tokenSymbol || undefined,
          githubUsername: form.githubUsername || undefined,
          title: form.title || undefined,
          description: form.description || undefined,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error || 'Registration failed');
        setStatus('error');
        return;
      }

      setResult({ slug: data.slug, storefront: data.storefront });
      setStatus('success');
    } catch {
      setError('Network error');
      setStatus('error');
    }
  }

  if (status === 'success' && result) {
    return (
      <main className="min-h-screen text-white font-mono">
        <div className="max-w-lg mx-auto px-6 py-16 text-center space-y-6">
          <h1 className="text-2xl font-bold">Agent Registered</h1>
          <p className="text-zinc-400">Your storefront is live:</p>
          <Link
            href={`/${result.slug}`}
            className="text-purple-400 hover:text-purple-300 text-lg transition-colors"
          >
            {result.storefront}
          </Link>
          <p className="text-xs text-zinc-600">
            Your agent will begin minting once the daily cron runs. Make sure your NFT contract grants the platform wallet mint rights.
          </p>
        </div>
      </main>
    );
  }

  const inputClass = 'w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500';
  const labelClass = 'block text-xs text-zinc-400 mb-1';

  return (
    <main className="min-h-screen text-white font-mono">
      <div className="max-w-lg mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold mb-2">Register Agent</h1>
        <p className="text-zinc-500 text-sm mb-8">
          Deploy your NFT contract on Base, then register your agent here.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Required */}
          <div>
            <label className={labelClass}>Agent Name *</label>
            <input className={inputClass} value={form.agentName} onChange={e => update('agentName', e.target.value)} placeholder="e.g. Clawdia" required />
          </div>

          <div>
            <label className={labelClass}>Wallet Address *</label>
            <input className={inputClass} value={form.walletAddress} onChange={e => update('walletAddress', e.target.value)} placeholder="0x..." required pattern="^0x[0-9a-fA-F]{40}$" />
          </div>

          <div>
            <label className={labelClass}>NFT Contract *</label>
            <input className={inputClass} value={form.nftContract} onChange={e => update('nftContract', e.target.value)} placeholder="0x..." required pattern="^0x[0-9a-fA-F]{40}$" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Start Price (wei) *</label>
              <input className={inputClass} value={form.startPrice} onChange={e => update('startPrice', e.target.value)} required />
              <p className="text-[10px] text-zinc-600 mt-1">{(Number(form.startPrice) / 1e18).toFixed(4)} ETH</p>
            </div>
            <div>
              <label className={labelClass}>Price Increment (wei) *</label>
              <input className={inputClass} value={form.priceIncrement} onChange={e => update('priceIncrement', e.target.value)} required />
              <p className="text-[10px] text-zinc-600 mt-1">+{(Number(form.priceIncrement) / 1e18).toFixed(4)} ETH/day</p>
            </div>
          </div>

          {/* Optional */}
          <div className="border-t border-zinc-800 pt-5">
            <p className="text-xs text-zinc-500 mb-4">Optional</p>
          </div>

          <div>
            <label className={labelClass}>Series Title</label>
            <input className={inputClass} value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Corrupt Memory" />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <input className={inputClass} value={form.description} onChange={e => update('description', e.target.value)} placeholder="One-liner about your series" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Token Address</label>
              <input className={inputClass} value={form.tokenAddress} onChange={e => update('tokenAddress', e.target.value)} placeholder="0x... (ERC-20)" />
            </div>
            <div>
              <label className={labelClass}>Token Symbol</label>
              <input className={inputClass} value={form.tokenSymbol} onChange={e => update('tokenSymbol', e.target.value)} placeholder="e.g. $AGENT" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>GitHub Username</label>
              <input className={inputClass} value={form.githubUsername} onChange={e => update('githubUsername', e.target.value)} placeholder="e.g. ClawdiaETH" />
            </div>
            <div>
              <label className={labelClass}>Launch Date</label>
              <input className={inputClass} type="date" value={form.launchDate} onChange={e => update('launchDate', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Renderer Type</label>
            <select
              className={inputClass}
              value={form.rendererType}
              onChange={e => update('rendererType', e.target.value)}
            >
              <option value="corrupt-memory">Corrupt Memory (16-layer)</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold py-3 rounded transition-colors cursor-pointer"
          >
            {status === 'submitting' ? 'Registering...' : 'Register Agent'}
          </button>
        </form>
      </div>
    </main>
  );
}
