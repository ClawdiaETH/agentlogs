import { rpcGetLogs } from './rpc';

// ERC721 Transfer(address,address,uint256) topic0
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Base chain launched around block 1 — most contracts deployed after block 1_000_000
const DEFAULT_FROM_BLOCK = 1_000_000;

/**
 * Discover token IDs owned by `ownerAddress` for a given ERC721 contract.
 * Scans Transfer event logs: received - sent = currently owned.
 */
export async function discoverOwnedTokens(
  contractAddress: string,
  ownerAddress: string,
  fromBlock = DEFAULT_FROM_BLOCK,
): Promise<string[]> {
  const paddedOwner = '0x' + ownerAddress.slice(2).toLowerCase().padStart(64, '0');

  // Query Transfer events TO this address (topic2 = receiver)
  const receivedLogs = await rpcGetLogs({
    address: contractAddress,
    topics: [TRANSFER_TOPIC, null, paddedOwner],
    fromBlock,
  });

  // Query Transfer events FROM this address (topic1 = sender)
  const sentLogs = await rpcGetLogs({
    address: contractAddress,
    topics: [TRANSFER_TOPIC, paddedOwner, null],
    fromBlock,
  });

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
