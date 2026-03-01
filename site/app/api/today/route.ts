import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type RegistryEntry = {
  ipfsImage: string;
  agent: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agent = searchParams.get('agent') ?? 'clawdia';

  const registryPath = path.join(process.cwd(), 'data/registry.json');
  if (!fs.existsSync(registryPath)) {
    return new NextResponse('Registry not found', { status: 404 });
  }

  const registry: RegistryEntry[] = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const pieces = registry.filter(p => p.agent === agent);
  const latest = pieces[pieces.length - 1];

  if (!latest?.ipfsImage) {
    return new NextResponse('No image available', { status: 404 });
  }

  // Redirect to IPFS gateway
  return NextResponse.redirect(latest.ipfsImage, 302);
}
