import { rpcCall, rpcGetBlockNumber, rpcGetLogs } from './rpc';
import { formatEther, keccak256, toHex } from 'viem';

const MARKET_V2_ADDRESS = process.env.NEXT_PUBLIC_MARKET_V2_CONTRACT || '';

// Event topics
const LISTED_TOPIC = keccak256(toHex('Listed(address,uint256,address,uint256)'));
const OFFER_MADE_TOPIC = keccak256(toHex('OfferMade(address,uint256,address,uint256,uint256)'));
const OFFER_CANCELLED_TOPIC = keccak256(toHex('OfferCancelled(address,uint256,address)'));
const OFFER_ACCEPTED_TOPIC = keccak256(toHex('OfferAccepted(address,uint256,address,uint256)'));

// 14 days of blocks on Base (~2s block time)
const SCAN_BLOCKS = 14 * 24 * 60 * 30;

function formatEthDisplay(valueWei: bigint): string {
  const [whole, fraction = ''] = formatEther(valueWei).split('.');
  return `${whole}.${fraction.padEnd(4, '0').slice(0, 4)}`;
}

export interface MarketV2Listing {
  nftAddress: string;
  tokenId: string;
  seller: string;
  price: string; // wei
  priceEth: string;
}

export interface MarketV2Offer {
  nftAddress: string;
  tokenId: string;
  offerer: string;
  amount: string; // wei
  amountEth: string;
  expiry: number; // unix timestamp
  active: boolean;
}

export function getMarketV2Address(): string {
  return MARKET_V2_ADDRESS;
}

/**
 * Read a single listing from the V2 contract.
 */
export async function getV2Listing(
  nftAddress: string,
  tokenId: string | number,
): Promise<MarketV2Listing | null> {
  if (!MARKET_V2_ADDRESS) return null;

  try {
    // getListing(address,uint256) selector
    const selector = '0x88700d1c';
    const paddedNft = nftAddress.slice(2).toLowerCase().padStart(64, '0');
    const paddedId = BigInt(tokenId).toString(16).padStart(64, '0');

    const result = await rpcCall(MARKET_V2_ADDRESS, `${selector}${paddedNft}${paddedId}`);
    if (!result || result === '0x') return null;

    const stripped = result.slice(2);
    const seller = '0x' + stripped.slice(24, 64);
    const priceHex = stripped.slice(64, 128);
    const priceWei = BigInt('0x' + priceHex);

    if (seller === '0x' + '0'.repeat(40)) return null;
    if (priceWei === BigInt(0)) return null;

    return {
      nftAddress,
      tokenId: String(tokenId),
      seller,
      price: priceWei.toString(),
      priceEth: formatEthDisplay(priceWei),
    };
  } catch {
    return null;
  }
}

/**
 * Read a single offer from the V2 contract.
 */
export async function getV2Offer(
  nftAddress: string,
  tokenId: string | number,
  offerer: string,
): Promise<MarketV2Offer | null> {
  if (!MARKET_V2_ADDRESS) return null;

  try {
    // getOffer(address,uint256,address) — compute selector
    const selector = keccak256(toHex('getOffer(address,uint256,address)')).slice(0, 10);
    const paddedNft = nftAddress.slice(2).toLowerCase().padStart(64, '0');
    const paddedId = BigInt(tokenId).toString(16).padStart(64, '0');
    const paddedOfferer = offerer.slice(2).toLowerCase().padStart(64, '0');

    const result = await rpcCall(MARKET_V2_ADDRESS, `${selector}${paddedNft}${paddedId}${paddedOfferer}`);
    if (!result || result === '0x') return null;

    const stripped = result.slice(2);
    const amount = BigInt('0x' + stripped.slice(0, 64));
    const expiry = Number(BigInt('0x' + stripped.slice(64, 128)));
    const active = BigInt('0x' + stripped.slice(128, 192)) !== BigInt(0);

    if (!active || amount === BigInt(0)) return null;

    return {
      nftAddress,
      tokenId: String(tokenId),
      offerer,
      amount: amount.toString(),
      amountEth: formatEthDisplay(amount),
      expiry,
      active,
    };
  } catch {
    return null;
  }
}

/**
 * Discover all active listings on V2 by scanning Listed events.
 */
export async function getAllV2Listings(): Promise<MarketV2Listing[]> {
  if (!MARKET_V2_ADDRESS) return [];

  try {
    const head = await rpcGetBlockNumber();
    const fromBlock = Math.max(0, head - SCAN_BLOCKS);

    const logs = await rpcGetLogs({
      address: MARKET_V2_ADDRESS,
      topics: [LISTED_TOPIC],
      fromBlock,
      toBlock: head,
    });

    // Deduplicate: latest event per nft+tokenId
    const candidates = new Map<string, { nft: string; tokenId: string }>();
    for (const log of logs) {
      if (log.topics.length < 4) continue;
      const nft = '0x' + log.topics[1].slice(26);
      const tokenId = BigInt(log.topics[2]).toString();
      candidates.set(`${nft.toLowerCase()}:${tokenId}`, { nft, tokenId });
    }

    // Validate each is still listed
    const results = await Promise.all(
      Array.from(candidates.values()).map(({ nft, tokenId }) =>
        getV2Listing(nft, tokenId),
      ),
    );

    return results.filter((r): r is MarketV2Listing => r !== null);
  } catch {
    return [];
  }
}

/**
 * Discover active offers for a specific token by scanning OfferMade events.
 */
export async function getOffersForToken(
  nftAddress: string,
  tokenId: string | number,
): Promise<MarketV2Offer[]> {
  if (!MARKET_V2_ADDRESS) return [];

  try {
    const head = await rpcGetBlockNumber();
    const fromBlock = Math.max(0, head - SCAN_BLOCKS);

    const paddedNft = '0x' + nftAddress.slice(2).toLowerCase().padStart(64, '0');
    const paddedId = '0x' + BigInt(tokenId).toString(16).padStart(64, '0');

    const [madeLogs, cancelledLogs, acceptedLogs] = await Promise.all([
      rpcGetLogs({ address: MARKET_V2_ADDRESS, topics: [OFFER_MADE_TOPIC, paddedNft, paddedId], fromBlock }),
      rpcGetLogs({ address: MARKET_V2_ADDRESS, topics: [OFFER_CANCELLED_TOPIC, paddedNft, paddedId], fromBlock }),
      rpcGetLogs({ address: MARKET_V2_ADDRESS, topics: [OFFER_ACCEPTED_TOPIC, paddedNft, paddedId], fromBlock }),
    ]);

    // Collect unique offerers from OfferMade
    const offerers = new Set<string>();
    for (const log of madeLogs) {
      if (log.topics.length >= 4) {
        offerers.add('0x' + log.topics[3].slice(26));
      }
    }

    // Remove cancelled/accepted offerers
    const removedOfferers = new Set<string>();
    for (const log of [...cancelledLogs, ...acceptedLogs]) {
      if (log.topics.length >= 4) {
        removedOfferers.add('0x' + log.topics[3].slice(26));
      }
    }

    // Validate remaining offers onchain
    const activeOfferers = [...offerers].filter((o) => !removedOfferers.has(o));
    const results = await Promise.all(
      activeOfferers.map((offerer) => getV2Offer(nftAddress, tokenId, offerer)),
    );

    return results.filter((r): r is MarketV2Offer => r !== null);
  } catch {
    return [];
  }
}
