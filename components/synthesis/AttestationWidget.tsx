'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import {
  useAttestationStats,
  useUserAttestation,
  useAttest,
} from '@/lib/synthesis/useAttestation';

interface AttestationWidgetProps {
  collectionContract: `0x${string}`;
  tokenId: number;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function AttestationWidget({ collectionContract, tokenId }: AttestationWidgetProps) {
  const { address } = useAccount();
  const { stats, isLoading: statsLoading } = useAttestationStats(collectionContract, tokenId);
  const { attestation } = useUserAttestation(collectionContract, tokenId, address);
  const { attest, isPending, isConfirming, isSuccess } = useAttest();

  const [rating, setRating] = useState(attestation?.rating || 5);
  const [authentic, setAuthentic] = useState(attestation?.authentic ?? true);
  const [comment, setComment] = useState(attestation?.comment || '');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attest(collectionContract, tokenId, rating, authentic, comment);
  };

  const handleEdit = () => {
    if (attestation && attestation.attester !== ZERO_ADDRESS) {
      setRating(attestation.rating);
      setAuthentic(attestation.authentic);
      setComment(attestation.comment);
    }
    setShowForm(true);
  };

  if (!address) {
    return (
      <div className="border border-zinc-800 rounded-lg p-4 bg-black/50">
        <p className="text-sm text-zinc-400">Connect wallet to attest</p>
      </div>
    );
  }

  if (statsLoading) {
    return (
      <div className="border border-zinc-800 rounded-lg p-4 bg-black/50">
        <p className="text-sm text-zinc-400">Loading attestations...</p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 rounded-lg p-4 bg-black/50 space-y-4">
      {/* Stats summary */}
      {stats && stats.count > 0 && (
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-zinc-400">Attestations:</span>{' '}
            <span className="text-white font-medium">{stats.count}</span>
          </div>
          <div>
            <span className="text-zinc-400">Avg rating:</span>{' '}
            <span className="text-white font-medium">{stats.avgRating.toFixed(1)}/5</span>
          </div>
          <div>
            <span className="text-zinc-400">Verified authentic:</span>{' '}
            <span className="text-white font-medium">{stats.authenticityPct}%</span>
          </div>
        </div>
      )}

      {/* User's attestation or form */}
      {attestation && attestation.attester !== ZERO_ADDRESS && !showForm ? (
        <div className="text-sm">
          <p className="text-zinc-400 mb-2">Your attestation:</p>
          <div className="flex items-center gap-4 mb-2">
            <span className="text-white">{attestation.rating}/5 stars</span>
            {attestation.authentic && (
              <span className="text-green-400 text-xs">✓ Verified authentic</span>
            )}
          </div>
          {attestation.comment && (
            <p className="text-zinc-300 text-xs italic">{attestation.comment}</p>
          )}
          <button
            onClick={handleEdit}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300"
          >
            Update attestation
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-2xl ${
                    star <= rating ? 'text-yellow-400' : 'text-zinc-700'
                  } hover:text-yellow-300 transition-colors`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="authentic"
              checked={authentic}
              onChange={(e) => setAuthentic(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700"
            />
            <label htmlFor="authentic" className="text-sm text-zinc-300">
              I verify this was created by the agent
            </label>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your thoughts..."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
              rows={2}
            />
          </div>

          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium rounded transition-colors text-sm"
          >
            {isPending || isConfirming ? 'Submitting...' : 'Submit Attestation'}
          </button>

          {isSuccess && (
            <p className="text-green-400 text-xs text-center">Attestation submitted!</p>
          )}
        </form>
      )}
    </div>
  );
}
