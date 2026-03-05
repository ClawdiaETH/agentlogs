import { rpcCall } from './rpc';
import { formatEther } from 'viem';

const MARKET_ADDRESS = process.env.NEXT_PUBLIC_MARKET_CONTRACT || '';

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
