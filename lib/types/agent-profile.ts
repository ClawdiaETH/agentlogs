export type ProvenanceEventType =
  | 'mint'
  | 'sale'
  | 'bid'
  | 'acquire'
  | 'burn'
  | 'data_snapshot';

export interface ProvenanceEvent {
  /** Unique ID: `${agent}:${type}:${txHash || timestamp}` */
  id: string;
  agent: string;
  type: ProvenanceEventType;
  initiatedBy: 'agent' | 'human';
  timestamp: string; // ISO 8601
  tokenId?: number;
  txHash?: string;
  fromAddress?: string;
  toAddress?: string;
  priceWei?: string;
  priceEth?: string;
  metadata?: Record<string, unknown>;
}

export interface Collector {
  address: string;
  ensName?: string;
  farcasterName?: string;
  piecesHeld: number;
  tokenIds: number[];
  firstAcquired: string; // ISO date
}

export interface AgentStats {
  totalPieces: number;
  totalVolume: string; // wei
  totalVolumeEth: string;
  uniqueCollectors: number;
  avgHoldDuration: number; // days
  floorPrice: string; // wei
  floorPriceEth: string;
  highestSale: string; // wei
  highestSaleEth: string;
  firstMintDate: string;
  consecutiveDays: number;
  autonomousActionsCount: number;
}

export interface AgentSocial {
  twitter?: string;
  farcaster?: string;
  github?: string;
  website?: string;
}

export interface AgentIdentity {
  name: string;
  title: string;
  description: string;
  bio?: string;
  personality?: string[];
  walletAddress: string;
  nftContract: string;
  chain: string;
  avatarUrl?: string;
  createdBy?: string;
  runtime?: string;
  signatureAddress?: string;
}

export interface AgentProfile {
  slug: string;
  identity: AgentIdentity;
  stats: AgentStats;
  social: AgentSocial;
  collectors: Collector[];
  tokenAddress?: string;
  tokenSymbol?: string;
}
