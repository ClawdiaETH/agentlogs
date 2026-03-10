import { NextResponse } from 'next/server';
import { getAgent } from '@/lib/agents';
import { getProvenanceEvents, getProvenanceCount } from '@/lib/kv-provenance';
import type { ProvenanceEventType } from '@/lib/types/agent-profile';

export const revalidate = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const agent = getAgent(slug.toLowerCase());
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const type = url.searchParams.get('type') as ProvenanceEventType | null;

  const [events, total] = await Promise.all([
    getProvenanceEvents(slug.toLowerCase(), {
      limit,
      offset,
      type: type ?? undefined,
    }),
    getProvenanceCount(slug.toLowerCase()),
  ]);

  return NextResponse.json({ events, total, limit, offset });
}
