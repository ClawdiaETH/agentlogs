import { rpcCall } from './rpc';

export type HolderTier = 'whale' | 'holder' | 'none';

export interface HolderPerks {
  tier: HolderTier;
  balance: string; // raw token balance
  earlyAccess: boolean;
  reducedFee: boolean;
  autonomyBonus: boolean;
}

const TIERS = {
  whale: { threshold: BigInt('100000000000000000000000'), earlyAccess: true, reducedFee: true, autonomyBonus: true },    // 100k
  holder: { threshold: BigInt('1000000000000000000000'), earlyAccess: true, reducedFee: false, autonomyBonus: false },   // 1k
} as const;

/**
 * Check ERC-20 balance and determine holder tier + perks.
 */
export async function getHolderPerks(
  walletAddress: string,
  tokenAddress: string,
): Promise<HolderPerks> {
  const defaultResult: HolderPerks = {
    tier: 'none',
    balance: '0',
    earlyAccess: false,
    reducedFee: false,
    autonomyBonus: false,
  };

  if (!walletAddress || !tokenAddress) return defaultResult;

  try {
    // balanceOf(address) = 0x70a08231
    const paddedAddr = walletAddress.slice(2).toLowerCase().padStart(64, '0');
    const result = await rpcCall(tokenAddress, `0x70a08231${paddedAddr}`);
    if (!result || result === '0x') return defaultResult;

    const balance = BigInt(result);
    if (balance === BigInt(0)) return defaultResult;

    if (balance >= TIERS.whale.threshold) {
      return { tier: 'whale', balance: balance.toString(), ...TIERS.whale };
    }

    if (balance >= TIERS.holder.threshold) {
      return { tier: 'holder', balance: balance.toString(), ...TIERS.holder };
    }

    return { ...defaultResult, balance: balance.toString() };
  } catch {
    return defaultResult;
  }
}
