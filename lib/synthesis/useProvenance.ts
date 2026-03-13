/**
 * React hook for ProvenanceVerifier contract interaction.
 * Verify that an NFT was minted by a registered ERC-8004 agent.
 */
import { useReadContract } from 'wagmi';

const PROVENANCE_ABI = [
  {
    inputs: [
      { name: 'collectionContract', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    name: 'verifyProvenance',
    outputs: [
      { name: 'verified', type: 'bool' },
      { name: 'agentWallet', type: 'address' },
      { name: 'erc8004Identity', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'collectionContract', type: 'address' },
      { name: 'tokenIds', type: 'uint256[]' },
    ],
    name: 'batchVerifyProvenance',
    outputs: [
      { name: 'verified', type: 'bool[]' },
      { name: 'agentWallet', type: 'address' },
      { name: 'erc8004Identity', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'collectionContract', type: 'address' }],
    name: 'getAgentForCollection',
    outputs: [
      { name: 'registered', type: 'bool' },
      { name: 'agentWallet', type: 'address' },
      { name: 'erc8004Identity', type: 'address' },
      { name: 'erc8004TokenId', type: 'uint256' },
      { name: 'name', type: 'string' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const PROVENANCE_CONTRACT = process.env.NEXT_PUBLIC_PROVENANCE_CONTRACT as `0x${string}` | undefined;

export interface ProvenanceResult {
  verified: boolean;
  agentWallet: `0x${string}` | null;
  erc8004Identity: `0x${string}` | null;
}

export interface AgentInfo {
  registered: boolean;
  agentWallet: `0x${string}`;
  erc8004Identity: `0x${string}`;
  erc8004TokenId: bigint;
  name: string;
}

/**
 * Verify provenance for a single NFT.
 */
export function useVerifyProvenance(collectionContract?: `0x${string}`, tokenId?: number) {
  const { data, isLoading, error } = useReadContract({
    address: PROVENANCE_CONTRACT,
    abi: PROVENANCE_ABI,
    functionName: 'verifyProvenance',
    args: collectionContract && tokenId !== undefined
      ? [collectionContract, BigInt(tokenId)]
      : undefined,
    query: {
      enabled: !!PROVENANCE_CONTRACT && !!collectionContract && tokenId !== undefined,
    },
  });

  if (!data) {
    return { provenance: null, isLoading, error };
  }

  const [verified, agentWallet, erc8004Identity] = data as [boolean, `0x${string}`, `0x${string}`];

  const provenance: ProvenanceResult = {
    verified,
    agentWallet: verified ? agentWallet : null,
    erc8004Identity: verified ? erc8004Identity : null,
  };

  return { provenance, isLoading, error };
}

/**
 * Batch verify provenance for multiple NFTs.
 */
export function useBatchVerifyProvenance(collectionContract?: `0x${string}`, tokenIds?: number[]) {
  const { data, isLoading, error } = useReadContract({
    address: PROVENANCE_CONTRACT,
    abi: PROVENANCE_ABI,
    functionName: 'batchVerifyProvenance',
    args: collectionContract && tokenIds && tokenIds.length > 0
      ? [collectionContract, tokenIds.map(id => BigInt(id))]
      : undefined,
    query: {
      enabled: !!PROVENANCE_CONTRACT && !!collectionContract && !!tokenIds && tokenIds.length > 0,
    },
  });

  if (!data) {
    return { results: null, agentWallet: null, erc8004Identity: null, isLoading, error };
  }

  const [verified, agentWallet, erc8004Identity] = data as [boolean[], `0x${string}`, `0x${string}`];

  return {
    results: verified,
    agentWallet,
    erc8004Identity,
    isLoading,
    error,
  };
}

/**
 * Get agent info for a collection contract.
 */
export function useAgentForCollection(collectionContract?: `0x${string}`) {
  const { data, isLoading, error } = useReadContract({
    address: PROVENANCE_CONTRACT,
    abi: PROVENANCE_ABI,
    functionName: 'getAgentForCollection',
    args: collectionContract ? [collectionContract] : undefined,
    query: {
      enabled: !!PROVENANCE_CONTRACT && !!collectionContract,
    },
  });

  if (!data) {
    return { agent: null, isLoading, error };
  }

  const [registered, agentWallet, erc8004Identity, erc8004TokenId, name] = data as [
    boolean,
    `0x${string}`,
    `0x${string}`,
    bigint,
    string
  ];

  if (!registered) {
    return { agent: null, isLoading, error };
  }

  const agent: AgentInfo = {
    registered,
    agentWallet,
    erc8004Identity,
    erc8004TokenId,
    name,
  };

  return { agent, isLoading, error };
}
