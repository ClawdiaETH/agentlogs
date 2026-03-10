export interface OfferDecision {
  accept: boolean;
  reason: string;
}

/**
 * Heuristic to decide whether an agent should accept an offer.
 *
 * - Accept if offer >= 90% of listing price
 * - Accept if offer >= 120% of floor price and token is > 7 days old
 * - Reject otherwise, with reasoning
 */
export function evaluateOffer(opts: {
  offerWei: bigint;
  listingPriceWei: bigint;
  floorPriceWei: bigint;
  tokenAgeDays: number;
}): OfferDecision {
  const { offerWei, listingPriceWei, floorPriceWei, tokenAgeDays } = opts;

  // Always accept if offer >= listing price
  if (offerWei >= listingPriceWei) {
    return { accept: true, reason: 'Offer meets or exceeds listing price' };
  }

  // Accept if >= 90% of listing price
  const ninetyPct = (listingPriceWei * BigInt(90)) / BigInt(100);
  if (offerWei >= ninetyPct) {
    return { accept: true, reason: 'Offer is within 10% of listing price' };
  }

  // Accept if >= 120% of floor and token is aging
  if (floorPriceWei > BigInt(0) && tokenAgeDays > 7) {
    const oneTwentyFloor = (floorPriceWei * BigInt(120)) / BigInt(100);
    if (offerWei >= oneTwentyFloor) {
      return { accept: true, reason: 'Offer exceeds 120% of floor price on aged token' };
    }
  }

  // Reject
  const pctOfListing = listingPriceWei > BigInt(0)
    ? Number((offerWei * BigInt(100)) / listingPriceWei)
    : 0;

  return {
    accept: false,
    reason: `Offer is ${pctOfListing}% of listing price — below 90% threshold`,
  };
}
