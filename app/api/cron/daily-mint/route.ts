import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline';

export const maxDuration = 60;

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contractAddress = process.env.NEXT_PUBLIC_SALE_CONTRACT;
  const privateKey = process.env.PRIVATE_KEY;
  const pinataJwt = process.env.PINATA_JWT;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!contractAddress || !privateKey || !pinataJwt || !githubToken) {
    return NextResponse.json(
      { error: 'Missing required environment variables' },
      { status: 500 },
    );
  }

  try {
    const result = await runPipeline({
      pinataJwt,
      privateKey,
      githubToken,
      contractAddress,
      startPrice: '2000000000000000',
      priceIncrement: '1000000000000000',
      launchDate: '2026-02-26',
      agentSlug: 'clawdia',
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('Pipeline failed:', err);
    return NextResponse.json(
      { error: 'Pipeline failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
