import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline';
import { loadAgents } from '@/lib/agents';

export const maxDuration = 300;

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const privateKey = process.env.PRIVATE_KEY;
  const pinataJwt = process.env.PINATA_JWT;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!privateKey || !pinataJwt || !githubToken) {
    return NextResponse.json(
      { error: 'Missing required environment variables' },
      { status: 500 },
    );
  }

  const agents = loadAgents();
  const results: Record<string, unknown>[] = [];

  // Sequential to avoid registry.json race conditions
  for (const agent of agents) {
    try {
      const result = await runPipeline({
        pinataJwt,
        privateKey,
        githubToken,
        contractAddress: agent.nftContract,
        startPrice: agent.startPrice,
        priceIncrement: agent.priceIncrement,
        launchDate: agent.launchDate,
        agentSlug: agent.slug,
        tokenAddress: agent.tokenAddress,
        githubUsername: agent.githubUsername,
        tokenSymbol: agent.tokenSymbol,
        seriesTitle: agent.title,
        agentConfig: agent,
      });

      results.push({ agent: agent.slug, success: true, ...result });
    } catch (err) {
      console.error(`Pipeline failed for ${agent.slug}:`, err);
      results.push({
        agent: agent.slug,
        success: false,
        error: (err as Error).message,
      });
    }
  }

  return NextResponse.json({ results });
}
