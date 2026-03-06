import { keccak256, toHex } from 'viem';
import { rpcCall } from '@/lib/rpc';

const GET_LISTING_SELECTOR = keccak256(toHex('getListing(uint256)')).slice(0, 10);

export async function isTokenListed(saleContract: string, tokenId: number): Promise<boolean> {
  const paddedId = BigInt(tokenId).toString(16).padStart(64, '0');
  const result = await rpcCall(saleContract, `${GET_LISTING_SELECTOR}${paddedId}`);

  // Conservatively treat unexpected RPC payloads as "still listed".
  if (!result || result.length < 130) return true;

  const isListedHex = result.slice(2 + 64, 2 + 128);
  return BigInt('0x' + isListedHex) !== BigInt(0);
}
