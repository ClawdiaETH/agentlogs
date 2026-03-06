import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * Force-revalidate specific pages or all NFT-related pages.
 *
 * GET /api/admin/revalidate?secret=CRON_SECRET[&path=/clawdia]
 *
 * Without &path, revalidates all NFT display pages.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  const targetPath = searchParams.get('path');

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const paths = targetPath
    ? [targetPath]
    : ['/', '/clawdia', '/gallery', '/collections/corrupt-memory'];

  for (const p of paths) {
    revalidatePath(p);
  }

  return NextResponse.json({ revalidated: paths, timestamp: Date.now() });
}
