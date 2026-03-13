/**
 * React hook for ERC8004Registry contract interaction.
 * Agents register their collections + ERC-8004 identity for onchain discovery.
 */
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

const REGISTRY_ABI = [
  {
    inputs: [
      { name: 'collectionContract', type: 'address' },
      { name: 'erc8004Identity', type: 'address' },
      { name: 'erc8004TokenId', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'metadataURI', type: 'string' },
    ],
    name: 'register',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'metadataURI', type: 'string' }],
    name: 'updateMetadata',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'deactivate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'reactivate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'wallet', type: 'address' }],
    name: 'getAgent',
    outputs: [
      {
        components: [
          { name: 'wallet', type: 'address' },
          { name: 'collectionContract', type: 'address' },
          { name: 'erc8004Identity', type: 'address' },
          { name: 'erc8004TokenId', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'metadataURI', type: 'string' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getActiveAgents',
    outputs: [
      {
        components: [
          { name: 'wallet', type: 'address' },
          { name: 'collectionContract', type: 'address' },
          { name: 'erc8004Identity', type: 'address' },
          { name: 'erc8004TokenId', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'metadataURI', type: 'string' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalAgents',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'index', type: 'uint256' }],
    name: 'getAgentByIndex',
    outputs: [
      {
        components: [
          { name: 'wallet', type: 'address' },
          { name: 'collectionContract', type: 'address' },
          { name: 'erc8004Identity', type: 'address' },
          { name: 'erc8004TokenId', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'metadataURI', type: 'string' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const REGISTRY_CONTRACT = process.env.NEXT_PUBLIC_REGISTRY_CONTRACT as `0x${string}` | undefined;

export interface AgentRegistration {
  wallet: `0x${string}`;
  collectionContract: `0x${string}`;
  erc8004Identity: `0x${string}`;
  erc8004TokenId: bigint;
  name: string;
  metadataURI: string;
  registeredAt: bigint;
  active: boolean;
}

/**
 * Get agent registration by wallet address.
 */
export function useAgent(wallet?: `0x${string}`) {
  const { data, isLoading, error } = useReadContract({
    address: REGISTRY_CONTRACT,
    abi: REGISTRY_ABI,
    functionName: 'getAgent',
    args: wallet ? [wallet] : undefined,
    query: {
      enabled: !!REGISTRY_CONTRACT && !!wallet,
    },
  });

  const agent = data ? (data as AgentRegistration) : null;

  // Filter out unregistered agents (wallet === 0x0)
  const isRegistered = agent && agent.wallet !== '0x0000000000000000000000000000000000000000';

  return { agent: isRegistered ? agent : null, isLoading, error };
}

/**
 * Get all active agents for discovery.
 */
export function useActiveAgents() {
  const { data, isLoading, error } = useReadContract({
    address: REGISTRY_CONTRACT,
    abi: REGISTRY_ABI,
    functionName: 'getActiveAgents',
    query: {
      enabled: !!REGISTRY_CONTRACT,
    },
  });

  const agents = data ? (data as AgentRegistration[]) : [];

  return { agents, isLoading, error };
}

/**
 * Get total agent count (active + inactive).
 */
export function useTotalAgents() {
  const { data, isLoading, error } = useReadContract({
    address: REGISTRY_CONTRACT,
    abi: REGISTRY_ABI,
    functionName: 'totalAgents',
    query: {
      enabled: !!REGISTRY_CONTRACT,
    },
  });

  return { totalAgents: data ? Number(data) : 0, isLoading, error };
}

/**
 * Get agent by index (for enumeration).
 */
export function useAgentByIndex(index?: number) {
  const { data, isLoading, error } = useReadContract({
    address: REGISTRY_CONTRACT,
    abi: REGISTRY_ABI,
    functionName: 'getAgentByIndex',
    args: index !== undefined ? [BigInt(index)] : undefined,
    query: {
      enabled: !!REGISTRY_CONTRACT && index !== undefined,
    },
  });

  const agent = data ? (data as AgentRegistration) : null;

  return { agent, isLoading, error };
}

/**
 * Register an agent with ERC-8004 identity.
 */
export function useRegisterAgent() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const register = (
    collectionContract: `0x${string}`,
    erc8004Identity: `0x${string}`,
    erc8004TokenId: number | bigint,
    name: string,
    metadataURI: string = ''
  ) => {
    if (!REGISTRY_CONTRACT) {
      throw new Error('Registry contract not configured');
    }

    writeContract({
      address: REGISTRY_CONTRACT,
      abi: REGISTRY_ABI,
      functionName: 'register',
      args: [collectionContract, erc8004Identity, BigInt(erc8004TokenId), name, metadataURI],
    });
  };

  return {
    register,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

/**
 * Update agent metadata URI.
 */
export function useUpdateMetadata() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const updateMetadata = (metadataURI: string) => {
    if (!REGISTRY_CONTRACT) {
      throw new Error('Registry contract not configured');
    }

    writeContract({
      address: REGISTRY_CONTRACT,
      abi: REGISTRY_ABI,
      functionName: 'updateMetadata',
      args: [metadataURI],
    });
  };

  return {
    updateMetadata,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

/**
 * Deactivate agent (hides from discovery).
 */
export function useDeactivateAgent() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const deactivate = () => {
    if (!REGISTRY_CONTRACT) {
      throw new Error('Registry contract not configured');
    }

    writeContract({
      address: REGISTRY_CONTRACT,
      abi: REGISTRY_ABI,
      functionName: 'deactivate',
    });
  };

  return {
    deactivate,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

/**
 * Reactivate agent.
 */
export function useReactivateAgent() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const reactivate = () => {
    if (!REGISTRY_CONTRACT) {
      throw new Error('Registry contract not configured');
    }

    writeContract({
      address: REGISTRY_CONTRACT,
      abi: REGISTRY_ABI,
      functionName: 'reactivate',
    });
  };

  return {
    reactivate,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}
