import { rpcGetLogs, rpcGetBlockNumber } from './rpc';
import type { Collector } from './types/agent-profile';

// ERC-721 Transfer(address,address,uint256) topic
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO_ADDRESS = '0x' + '0'.repeat(40);

// Base ~2s block time, scan last 180 days
const SCAN_BLOCKS = 180 * 24 * 60 * 30;

interface TransferEvent {
  from: string;
  to: string;
  tokenId: number;
  blockNumber: number;
}

/**
 * Discover all current collectors of an NFT contract by scanning Transfer events.
 * Returns deduplicated collector list with pieces held and token IDs.
 */
export async function discoverCollectors(
  nftContract: string,
  agentWallet: string,
): Promise<Collector[]> {
  const head = await rpcGetBlockNumber();
  const fromBlock = Math.max(0, head - SCAN_BLOCKS);

  const logs = await rpcGetLogs({
    address: nftContract,
    topics: [TRANSFER_TOPIC],
    fromBlock,
    toBlock: head,
  });

  // Parse transfer events
  const transfers: TransferEvent[] = logs.map((log) => ({
    from: '0x' + (log.topics[1]?.slice(26) ?? ''),
    to: '0x' + (log.topics[2]?.slice(26) ?? ''),
    tokenId: parseInt(log.topics[3] ?? '0', 16),
    blockNumber: parseInt(log.blockNumber, 16),
  }));

  // Build current ownership map: tokenId → owner
  const ownership = new Map<number, string>();
  // Track first acquisition per address+token
  const firstAcquired = new Map<string, number>(); // address → earliest block

  for (const t of transfers) {
    ownership.set(t.tokenId, t.to.toLowerCase());

    const key = t.to.toLowerCase();
    if (key !== ZERO_ADDRESS) {
      const existing = firstAcquired.get(key);
      if (!existing || t.blockNumber < existing) {
        firstAcquired.set(key, t.blockNumber);
      }
    }
  }

  // Group by owner, excluding zero address and agent wallet
  const agentLower = agentWallet.toLowerCase();
  const collectorMap = new Map<string, number[]>();

  for (const [tokenId, owner] of ownership) {
    if (owner === ZERO_ADDRESS || owner === agentLower) continue;
    const existing = collectorMap.get(owner) ?? [];
    existing.push(tokenId);
    collectorMap.set(owner, existing);
  }

  // Estimate dates from block numbers (~2s per block on Base)
  const now = Date.now();
  const msPerBlock = 2000;

  const collectors: Collector[] = [];
  for (const [address, tokenIds] of collectorMap) {
    const acquiredBlock = firstAcquired.get(address) ?? head;
    const blockAge = head - acquiredBlock;
    const acquiredDate = new Date(now - blockAge * msPerBlock);

    collectors.push({
      address,
      piecesHeld: tokenIds.length,
      tokenIds: tokenIds.sort((a, b) => a - b),
      firstAcquired: acquiredDate.toISOString().slice(0, 10),
    });
  }

  // Sort by pieces held (descending), then first acquired (ascending)
  collectors.sort((a, b) => b.piecesHeld - a.piecesHeld || a.firstAcquired.localeCompare(b.firstAcquired));

  return collectors;
}
