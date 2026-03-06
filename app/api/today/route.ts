import { NextResponse } from 'next/server';
import { getRegistry } from '@/lib/kv-registry';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agent = searchParams.get('agent') ?? 'clawdia';

  const registry = await getRegistry();
  const pieces = registry.filter(p => p.agent === agent);
  const latest = pieces[pieces.length - 1];

  if (!latest?.ipfsImage) {
    return new NextResponse('No image available', { status: 404 });
  }

  // Redirect to IPFS gateway
  return NextResponse.redirect(latest.ipfsImage, 302);
}
