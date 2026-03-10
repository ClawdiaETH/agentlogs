import { NextResponse } from 'next/server';
import { loadAgents } from '@/lib/agents';
import { getRegistry } from '@/lib/kv-registry';
import { getOffersForToken, getV2Listing } from '@/lib/market-v2';
import { evaluateOffer } from '@/lib/offer-evaluator';
import { computeAgentStats } from '@/lib/agent-stats';

export const maxDuration = 120;

/**
 * GET /api/cron/evaluate-offers
 *
 * Scans pending offers for all agent-owned tokens, evaluates each
 * against the heuristic, and returns accept/reject decisions.
 *
 * Actual acceptance is handled by calling /api/market/accept — this
 * cron only evaluates and reports. Auto-accept can be enabled by
 * uncommenting the accept call below.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const agents = loadAgents();
  const registry = await getRegistry();
  const results: Record<string, unknown[]> = {};

  for (const agent of agents) {
    const agentEntries = registry.filter((e) => e.agent === agent.slug && !e.sold);
    const stats = computeAgentStats(
      registry.filter((e) => e.agent === agent.slug),
      [],
      [],
    );
    const floorPriceWei = BigInt(stats.floorPrice || '0');
    const decisions: unknown[] = [];

    for (const entry of agentEntries) {
      try {
        const offers = await getOffersForToken(agent.nftContract, entry.tokenId);
        if (offers.length === 0) continue;

        const listing = await getV2Listing(agent.nftContract, entry.tokenId);
        const listingPriceWei = listing ? BigInt(listing.price) : BigInt(entry.price);

        // Calculate token age
        const mintDate = new Date(entry.date);
        const tokenAgeDays = Math.floor(
          (Date.now() - mintDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        for (const offer of offers) {
          const decision = evaluateOffer({
            offerWei: BigInt(offer.amount),
            listingPriceWei,
            floorPriceWei,
            tokenAgeDays,
          });

          decisions.push({
            tokenId: entry.tokenId,
            offerer: offer.offerer,
            offerEth: offer.amountEth,
            decision: decision.accept ? 'ACCEPT' : 'REJECT',
            reason: decision.reason,
          });

          // Uncomment to enable auto-accept:
          // if (decision.accept) {
          //   await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/market/accept`, {
          //     method: 'POST',
          //     headers: {
          //       'Content-Type': 'application/json',
          //       'Authorization': `Bearer ${cronSecret}`,
          //     },
          //     body: JSON.stringify({
          //       agentSlug: agent.slug,
          //       tokenId: entry.tokenId,
          //       offerer: offer.offerer,
          //     }),
          //   });
          // }
        }
      } catch {
        // Skip tokens that fail
      }
    }

    if (decisions.length > 0) {
      results[agent.slug] = decisions;
    }
  }

  return NextResponse.json({ ok: true, results });
}
