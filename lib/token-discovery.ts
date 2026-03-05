import { rpcGetLogs, rpcGetBlockNumber } from './rpc';

// ERC721 Transfer(address,address,uint256) topic0
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Base produces ~43,200 blocks/day (2s block time)
const BLOCKS_PER_DAY = 43_200;

/**
 * Estimate a starting block from a contract creation date.
 * Adds a 7-day safety margin to account for date inaccuracy.
 */
async function estimateFromBlock(createdAt?: string): Promise<number> {
  const head = await rpcGetBlockNumber();

  if (!createdAt) {
    // Default: scan last 120 days (~5.2M blocks)
    return Math.max(0, head - 120 * BLOCKS_PER_DAY);
  }

  const created = new Date(createdAt);
  const now = new Date();
  const daysAgo = Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  // Add 7-day margin
  const blocksBack = (daysAgo + 7) * BLOCKS_PER_DAY;
  return Math.max(0, head - blocksBack);
}

/**
 * Discover token IDs owned by `ownerAddress` for a given ERC721 contract.
 * Scans Transfer event logs: received - sent = currently owned.
 *
 * @param createdAt  ISO date string of contract creation (from collections.json)
 *                   Used to avoid scanning the entire chain history.
 */
export async function discoverOwnedTokens(
  contractAddress: string,
  ownerAddress: string,
  createdAt?: string,
): Promise<string[]> {
  const fromBlock = await estimateFromBlock(createdAt);
  const paddedOwner = '0x' + ownerAddress.slice(2).toLowerCase().padStart(64, '0');

  // Query Transfer events TO and FROM this address in parallel
  const [receivedLogs, sentLogs] = await Promise.all([
    rpcGetLogs({
      address: contractAddress,
      topics: [TRANSFER_TOPIC, null, paddedOwner],
      fromBlock,
    }),
    rpcGetLogs({
      address: contractAddress,
      topics: [TRANSFER_TOPIC, paddedOwner, null],
      fromBlock,
    }),
  ]);

  // Extract token IDs from logs — topic[3] for indexed tokenId
  const received = new Map<string, number>(); // tokenId → count
  for (const log of receivedLogs) {
    const tokenId = BigInt(log.topics[3]).toString();
    received.set(tokenId, (received.get(tokenId) ?? 0) + 1);
  }

  for (const log of sentLogs) {
    const tokenId = BigInt(log.topics[3]).toString();
    const current = received.get(tokenId) ?? 0;
    if (current <= 1) {
      received.delete(tokenId);
    } else {
      received.set(tokenId, current - 1);
    }
  }

  return Array.from(received.keys()).sort((a, b) => {
    const aBig = BigInt(a);
    const bBig = BigInt(b);
    if (aBig === bBig) return 0;
    return aBig < bBig ? -1 : 1;
  });
}
