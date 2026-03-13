/**
 * React hook for ArtAttestation contract interaction.
 * Lets collectors attest to NFT quality/authenticity onchain.
 */
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

const ATTESTATION_ABI = [
  {
    inputs: [
      { name: 'collectionContract', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'rating', type: 'uint8' },
      { name: 'authentic', type: 'bool' },
      { name: 'comment', type: 'string' },
    ],
    name: 'attest',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'collectionContract', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    name: 'getStats',
    outputs: [
      { name: 'count', type: 'uint256' },
      { name: 'avgRating', type: 'uint256' },
      { name: 'authenticityPct', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'collectionContract', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'attester', type: 'address' },
    ],
    name: 'getAttestation',
    outputs: [
      {
        components: [
          { name: 'attester', type: 'address' },
          { name: 'rating', type: 'uint8' },
          { name: 'authentic', type: 'bool' },
          { name: 'comment', type: 'string' },
          { name: 'timestamp', type: 'uint256' },
        ],
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'collectionContract', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'attester', type: 'address' },
    ],
    name: 'hasAttested',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'collectionContract', type: 'address' },
      { name: 'maxTokenId', type: 'uint256' },
    ],
    name: 'getCollectionReputation',
    outputs: [
      { name: 'totalAttestations', type: 'uint256' },
      { name: 'avgRating', type: 'uint256' },
      { name: 'avgAuthenticity', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const ATTESTATION_CONTRACT = process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT as `0x${string}` | undefined;

export interface AttestationStats {
  count: number;
  avgRating: number; // 1-5 scale (frontend divides by 100)
  authenticityPct: number; // 0-100
}

export interface Attestation {
  attester: `0x${string}`;
  rating: number; // 1-5
  authentic: boolean;
  comment: string;
  timestamp: bigint;
}

/**
 * Get attestation stats for an NFT.
 */
export function useAttestationStats(collectionContract?: `0x${string}`, tokenId?: number) {
  const { data, isLoading, error } = useReadContract({
    address: ATTESTATION_CONTRACT,
    abi: ATTESTATION_ABI,
    functionName: 'getStats',
    args: collectionContract && tokenId !== undefined ? [collectionContract, BigInt(tokenId)] : undefined,
    query: {
      enabled: !!ATTESTATION_CONTRACT && !!collectionContract && tokenId !== undefined,
    },
  });

  if (!data) {
    return { stats: null, isLoading, error };
  }

  const [count, avgRating, authenticityPct] = data as [bigint, bigint, bigint];

  const stats: AttestationStats = {
    count: Number(count),
    avgRating: Number(avgRating) / 100, // Scale back to 1-5
    authenticityPct: Number(authenticityPct),
  };

  return { stats, isLoading, error };
}

/**
 * Get a specific user's attestation for an NFT.
 */
export function useUserAttestation(
  collectionContract?: `0x${string}`,
  tokenId?: number,
  attester?: `0x${string}`
) {
  const { data, isLoading, error } = useReadContract({
    address: ATTESTATION_CONTRACT,
    abi: ATTESTATION_ABI,
    functionName: 'getAttestation',
    args: collectionContract && tokenId !== undefined && attester
      ? [collectionContract, BigInt(tokenId), attester]
      : undefined,
    query: {
      enabled: !!ATTESTATION_CONTRACT && !!collectionContract && tokenId !== undefined && !!attester,
    },
  });

  if (!data) {
    return { attestation: null, isLoading, error };
  }

  const attestation = data as Attestation;
  return { attestation, isLoading, error };
}

/**
 * Check if a user has attested to an NFT.
 */
export function useHasAttested(
  collectionContract?: `0x${string}`,
  tokenId?: number,
  attester?: `0x${string}`
) {
  const { data, isLoading, error } = useReadContract({
    address: ATTESTATION_CONTRACT,
    abi: ATTESTATION_ABI,
    functionName: 'hasAttested',
    args: collectionContract && tokenId !== undefined && attester
      ? [collectionContract, BigInt(tokenId), attester]
      : undefined,
    query: {
      enabled: !!ATTESTATION_CONTRACT && !!collectionContract && tokenId !== undefined && !!attester,
    },
  });

  return { hasAttested: data as boolean | undefined, isLoading, error };
}

/**
 * Submit an attestation.
 */
export function useAttest() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const attest = (
    collectionContract: `0x${string}`,
    tokenId: number,
    rating: number,
    authentic: boolean,
    comment: string = ''
  ) => {
    if (!ATTESTATION_CONTRACT) {
      throw new Error('Attestation contract not configured');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be 1-5');
    }

    writeContract({
      address: ATTESTATION_CONTRACT,
      abi: ATTESTATION_ABI,
      functionName: 'attest',
      args: [collectionContract, BigInt(tokenId), rating, authentic, comment],
    });
  };

  return {
    attest,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

/**
 * Get collection-wide reputation stats.
 */
export function useCollectionReputation(collectionContract?: `0x${string}`, maxTokenId?: number) {
  const { data, isLoading, error } = useReadContract({
    address: ATTESTATION_CONTRACT,
    abi: ATTESTATION_ABI,
    functionName: 'getCollectionReputation',
    args: collectionContract && maxTokenId !== undefined
      ? [collectionContract, BigInt(maxTokenId)]
      : undefined,
    query: {
      enabled: !!ATTESTATION_CONTRACT && !!collectionContract && maxTokenId !== undefined,
    },
  });

  if (!data) {
    return { reputation: null, isLoading, error };
  }

  const [totalAttestations, avgRating, avgAuthenticity] = data as [bigint, bigint, bigint];

  const reputation = {
    totalAttestations: Number(totalAttestations),
    avgRating: Number(avgRating) / 100,
    avgAuthenticity: Number(avgAuthenticity),
  };

  return { reputation, isLoading, error };
}
