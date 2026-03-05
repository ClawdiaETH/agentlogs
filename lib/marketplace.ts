import { rpcCall, rpcGetBlockNumber, rpcGetLogs } from './rpc';
import { formatEther, keccak256, toHex } from 'viem';

const MARKET_ADDRESS = process.env.NEXT_PUBLIC_MARKET_CONTRACT || '';

// Listed(address indexed nft, uint256 indexed tokenId, address indexed seller, uint256 price)
const LISTED_TOPIC = keccak256(toHex('Listed(address,uint256,address,uint256)'));

// 7 days of blocks on Base (2s block time) — marketplace is new
const SCAN_BLOCKS = 7 * 24 * 60 * 30; // ~302,400

function formatEthDisplay(valueWei: bigint): string {
  const [whole, fraction = ''] = formatEther(valueWei).split('.');
  return `${whole}.${fraction.padEnd(4, '0').slice(0, 4)}`;
}

export interface MarketListing<TTokenId extends string | number = string | number> {
  nftAddress: string;
  tokenId: TTokenId;
  seller: string;
  price: string; // wei
  priceEth: string;
}

/**
 * Check if a specific token is listed on the marketplace.
 * Uses direct contract read — efficient for checking individual tokens.
 */
export async function getTokenListing<TTokenId extends string | number>(
  nftAddress: string,
  tokenId: TTokenId,
): Promise<MarketListing<TTokenId> | null> {
  if (!MARKET_ADDRESS) return null;

  try {
    // getListing(address nft, uint256 tokenId) → (address seller, uint256 price)
    // selector: first 4 bytes of keccak256("getListing(address,uint256)")
    const selector = '0x88700d1c'; // keccak256("getListing(address,uint256)")
    const paddedNft = nftAddress.slice(2).toLowerCase().padStart(64, '0');
    const paddedId = BigInt(tokenId).toString(16).padStart(64, '0');

    const result = await rpcCall(MARKET_ADDRESS, `${selector}${paddedNft}${paddedId}`);
    if (!result || result === '0x') return null;

    const stripped = result.slice(2);
    const seller = '0x' + stripped.slice(24, 64); // address is right-aligned in 32 bytes
    const priceHex = stripped.slice(64, 128);
    const priceWei = BigInt('0x' + priceHex);

    // Zero seller means not listed
    if (seller === '0x' + '0'.repeat(40)) return null;
    if (priceWei === BigInt(0)) return null;

    return {
      nftAddress,
      tokenId,
      seller,
      price: priceWei.toString(),
      priceEth: formatEthDisplay(priceWei),
    };
  } catch {
    return null;
  }
}

export function getMarketAddress(): string {
  return MARKET_ADDRESS;
}

/**
 * Scan Listed events to discover all active marketplace listings.
 * Deduplicates by nft+tokenId (latest event wins), then validates
 * each against getListing() to filter sold/delisted items.
 */
export async function getAllActiveListings(): Promise<MarketListing<string>[]> {
  if (!MARKET_ADDRESS) return [];

  try {
    const head = await rpcGetBlockNumber();
    const fromBlock = Math.max(0, head - SCAN_BLOCKS);

    const logs = await rpcGetLogs({
      address: MARKET_ADDRESS,
      topics: [LISTED_TOPIC],
      fromBlock,
      toBlock: head,
    });

    // Deduplicate: keep latest event per nft+tokenId
    const candidates = new Map<string, { nft: string; tokenId: string }>();
    for (const log of logs) {
      if (log.topics.length < 4) continue;
      const nft = '0x' + log.topics[1].slice(26);
      const tokenId = BigInt(log.topics[2]).toString();
      candidates.set(`${nft.toLowerCase()}:${tokenId}`, { nft, tokenId });
    }

    // Validate each candidate is still actively listed
    const results = await Promise.all(
      Array.from(candidates.values()).map(({ nft, tokenId }) =>
        getTokenListing(nft, tokenId),
      ),
    );

    return results.filter((r): r is MarketListing<string> => r !== null);
  } catch {
    return [];
  }
}
