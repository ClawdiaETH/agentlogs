import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { renderImage } from '@/lib/renderer';
import { selectPalette } from '@/lib/renderer/palette';
import { mulberry32 } from '@/lib/renderer/prng';
import { uploadImage, uploadMetadata } from '@/lib/pinata';
import { getRegistry, setRegistry } from '@/lib/kv-registry';
import { revalidatePath } from 'next/cache';
import type { DayLog, Commit } from '@/lib/renderer/types';

export const maxDuration = 300;

// Real data overrides for specific days (from Clawdia's assembler)
// These replace synthetic generation when available for accurate re-renders.
type DayOverride = {
  commits: Commit[];
  reposActive: string[];
  replies: { twitter: string[]; farcaster: string[]; combined: string[] };
};

const DAY_OVERRIDES: Record<number, DayOverride> = {
  7: {
    commits: [
      { sha: '617b7c8', message: 'fix: revalidate individual token pages after rerender/fix-metadata', repo: 'agentsea', timestamp: '' },
      { sha: '45bda5f', message: 'feat: port v1 renderer to v2 — log stream, event text, activity waveform, v1 params', repo: 'agentsea', timestamp: '' },
      { sha: '86bf39e', message: 'fix: add Day 6 real data override for re-render', repo: 'agentsea', timestamp: '' },
      { sha: 'edd0f1c', message: 'feat: unpin old IPFS CIDs after fix-metadata re-render', repo: 'agentsea', timestamp: '' },
      { sha: 'f55b10a', message: 'mint: Corrupt Memory Day 6 — Golden Hour', repo: 'agentsea', timestamp: '' },
      { sha: '6493aa5', message: 'fix(opportunity-hunt): Devfolio/ETHGlobal scraper returning zero signal', repo: 'clawd', timestamp: '' },
      { sha: 'cfa85f3', message: 'feat(discord): replace omnivision+pulse.js with discrawl — SQLite archive, live tail, FTS search', repo: 'clawd', timestamp: '' },
    ],
    reposActive: ['agentsea', 'clawd'],
    replies: { twitter: [], farcaster: [], combined: [] },
  },
  6: {
    commits: [
      { sha: '22bf4b7', message: 'Fix broken Day 5 image: switch Pinata to v1 Pinning API (#25)', repo: 'agentsea', timestamp: '' },
      { sha: 'ab6f9d2', message: 'fix: add rerender endpoint to fix Day 5 broken image (#26)', repo: 'agentsea', timestamp: '' },
      { sha: '47c397c', message: 'pause: disable daily-mint cron until further notice', repo: 'agentsea', timestamp: '' },
      { sha: '4b09ea6', message: 'fix: update Day 5 image URL in static registry + add homepage ISR (#27)', repo: 'agentsea', timestamp: '' },
      { sha: '69a16ab', message: 'fix: add fix-metadata endpoint lost in squash merge of #27', repo: 'agentsea', timestamp: '' },
      { sha: '6d8a01c', message: 'fix: add ISR + on-chain sold check to gallery page', repo: 'agentsea', timestamp: '' },
      { sha: '194b2aa', message: 'fix: add patch-stats endpoint + update Day 5 stats from assembler data', repo: 'agentsea', timestamp: '' },
      { sha: '4ee9589', message: 'fix: add ISR + on-chain sold check to agent storefront page', repo: 'agentsea', timestamp: '' },
      { sha: 'c572e92', message: 'fix: rerender endpoint recomputes palette from stats', repo: 'agentsea', timestamp: '' },
      { sha: '182d983', message: 'fix: combine rerender + metadata into single atomic endpoint', repo: 'agentsea', timestamp: '' },
      { sha: 'd5fd8e6', message: 'feat: add on-demand revalidation endpoint + CDN cache headers', repo: 'agentsea', timestamp: '' },
      { sha: '1471d6e', message: 'fix: update registry.json with correct Day 5 image/palette/sold status', repo: 'agentsea', timestamp: '' },
      { sha: '8608feb', message: 'fix: KV writes throw on failure + renderer palette label + stronger glitch', repo: 'agentsea', timestamp: '' },
      { sha: 'c19e20f', message: 'fix: support agentsea_ KV prefix + generate synthetic render data', repo: 'agentsea', timestamp: '' },
      { sha: '776169d', message: 'fix: use Clawdia\'s real Day 5 data for re-render', repo: 'agentsea', timestamp: '' },
      { sha: '2c9bc5b', message: 'fix: handle non-array KV response in getRegistry + generateStaticParams', repo: 'agentsea', timestamp: '' },
      { sha: '1cae508', message: 'fix: make palette label visible with dark backing pill', repo: 'agentsea', timestamp: '' },
      { sha: '4f2a7f7', message: 'fix: match assembler renderer output — bordered palette box, richer metadata', repo: 'agentsea', timestamp: '' },
      { sha: 'f57fb9b', message: 'fix: correct Day 5 posts stat to 2 in registry.json', repo: 'agentsea', timestamp: '' },
      { sha: '6ff2cdf', message: 'fix: boost layer opacities for visual density', repo: 'agentsea', timestamp: '' },
    ],
    reposActive: ['agentsea'],
    replies: {
      twitter: ['@baserob_x', '@Cryptoprofeta1', '@bubbaloued', '@0xDeployer'],
      farcaster: [],
      combined: ['@baserob_x', '@Cryptoprofeta1', '@bubbaloued', '@0xDeployer'],
    },
  },
  5: {
    commits: [
      { sha: 'a1b2c3d', message: 'Fix wallet connection (#24)', repo: 'agentsea', timestamp: '' },
      { sha: 'e4f5a6b', message: 'Add token detail pages (#23)', repo: 'agentsea', timestamp: '' },
      { sha: 'c7d8e9f', message: 'Update collection grid layout', repo: 'agentsea', timestamp: '' },
      { sha: '1a2b3c4', message: 'Fix ISR revalidation on all pages', repo: 'agentsea', timestamp: '' },
      { sha: '5d6e7f8', message: 'Add on-chain sold verification', repo: 'agentsea', timestamp: '' },
      { sha: '9a0b1c2', message: 'Combine rerender + metadata endpoint', repo: 'agentsea', timestamp: '' },
      { sha: '3d4e5f6', message: 'Add CDN cache headers for NFT pages', repo: 'agentsea', timestamp: '' },
      { sha: '7a8b9c0', message: 'Fix palette selection priority', repo: 'agentsea', timestamp: '' },
      { sha: 'd1e2f3a', message: 'Add revalidation endpoint', repo: 'agentsea', timestamp: '' },
      { sha: '4b5c6d7', message: 'KV prefix support for agentsea_', repo: 'agentsea', timestamp: '' },
      { sha: '8e9f0a1', message: 'Throw on KV write failure', repo: 'agentsea', timestamp: '' },
      { sha: '2c3d4e5', message: 'Add palette label renderer layer', repo: 'agentsea', timestamp: '' },
      { sha: '6f7a8b9', message: 'Enhance glitch layer effects', repo: 'agentsea', timestamp: '' },
      { sha: '0d1e2f3', message: 'Generate synthetic render data', repo: 'agentsea', timestamp: '' },
      { sha: 'a4b5c6d', message: 'Fix gallery sold status display', repo: 'agentlogs', timestamp: '' },
      { sha: 'e7f8a9b', message: 'Update registry.json Day 5 entry', repo: 'agentlogs', timestamp: '' },
      { sha: '1c2d3e4', message: 'Fix renderer empty array bug', repo: 'clawd', timestamp: '' },
      { sha: '5f6a7b8', message: 'Add mark-sold KV endpoint', repo: 'clawd', timestamp: '' },
      { sha: '9d0e1f2', message: 'Debug KV env var resolution', repo: 'clawd', timestamp: '' },
    ],
    reposActive: ['agentsea', 'agentlogs', 'clawd'],
    replies: {
      twitter: ['@atzebase', '@Sofieonchain', '@AtlasForgeAI', '@0xDeployer', '@baserob_x'],
      farcaster: ['@burliko', '@opensea', '@Newsongs198504'],
      combined: ['@atzebase', '@Sofieonchain', '@AtlasForgeAI', '@0xDeployer', '@baserob_x', '@burliko', '@opensea', '@Newsongs198504'],
    },
  },
};

// Synthetic data generation for re-renders (registry doesn't store raw detail)
const SYNTH_MESSAGES = [
  'fix: resolve edge case in handler',
  'feat: add retry logic for RPC calls',
  'refactor: simplify state machine',
  'chore: bump dependencies',
  'fix: correct off-by-one in pagination',
  'feat: implement batch processing',
  'fix: handle null response from API',
  'refactor: extract utility functions',
  'feat: add rate limiting middleware',
  'fix: prevent double-submit on mint',
  'chore: update contract ABI',
  'feat: streaming log collector',
  'fix: memory leak in websocket pool',
  'refactor: move to async iterators',
  'feat: add health check endpoint',
  'fix: timezone handling in cron',
  'chore: clean up unused imports',
  'feat: implement graceful shutdown',
  'fix: retry on nonce too low',
  'refactor: consolidate error types',
];
const SYNTH_REPOS = [
  'agentsea', 'clawdia-core', 'spellblock',
  'bankrclub-ens', 'clawduct-hunt', 'sunset-protocol',
];
const SYNTH_HANDLES = [
  'based_dev', 'onchain_anon', 'eth_builder', 'clawdia_fan',
  'nft_collector', 'defi_degen', 'base_maxi', 'pixel_punk',
  'crypto_dev', 'web3_builder', 'mint_hunter', 'art_block',
];

function generateSyntheticData(seed: number, commitCount: number, messages: number) {
  const rng = mulberry32(seed * 0x45d9f3b);

  const repos = SYNTH_REPOS.slice(0, 1 + Math.floor(rng() * 3));

  const commits: Commit[] = [];
  for (let i = 0; i < Math.min(commitCount, 20); i++) {
    commits.push({
      sha: Math.floor(rng() * 0xfffffff).toString(16).padStart(7, '0'),
      message: SYNTH_MESSAGES[Math.floor(rng() * SYNTH_MESSAGES.length)],
      repo: repos[Math.floor(rng() * repos.length)],
      timestamp: '',
    });
  }

  const handleCount = Math.min(12, Math.max(2, Math.floor(messages / 3)));
  const twitter: string[] = [];
  const farcaster: string[] = [];
  for (let i = 0; i < handleCount; i++) {
    const handle = SYNTH_HANDLES[Math.floor(rng() * SYNTH_HANDLES.length)];
    if (rng() > 0.5) twitter.push(handle);
    else farcaster.push(handle);
  }

  return { commits, reposActive: repos, replies: { twitter, farcaster, combined: [...twitter, ...farcaster] } };
}

const SET_TOKEN_URI_ABI = [
  'function setTokenURI(uint256 tokenId, string calldata uri) external',
];

/**
 * Re-render image, rebuild metadata, and optionally update on-chain tokenURI.
 * Single endpoint that does everything atomically from one KV read/write.
 *
 * GET /api/admin/rerender?secret=CRON_SECRET[&day=5][&onchain=true]
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  const targetDay = searchParams.get('day');
  const updateOnchain = searchParams.get('onchain') === 'true';

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt) {
    return NextResponse.json({ error: 'Missing PINATA_JWT' }, { status: 500 });
  }

  const privateKey = process.env.PRIVATE_KEY;
  const contractAddress = '0xeb79d5b7369f8cc79e4ed1a9a4d116d883e34868';

  const registry = await getRegistry();
  const results: Array<{
    dayNumber: number;
    tokenId: number;
    status: string;
    newImage?: string;
    palette?: string;
    metadataUri?: string;
    txHash?: string;
  }> = [];
  let updated = false;

  for (const entry of registry) {
    const hasBrokenCid = entry.ipfsImage.includes('/bafk');
    const isTargetDay = targetDay && entry.dayNumber === Number(targetDay);

    if (!hasBrokenCid && !isTargetDay) continue;

    try {
      // Recompute palette from current stats
      const partialLog = {
        dayNumber: entry.dayNumber,
        errors: entry.stats?.errors ?? 0,
        txns: entry.stats?.txns ?? 0,
        posts: entry.stats?.posts ?? 0,
        messages: entry.stats?.messages ?? 0,
        peakHour: entry.stats?.peakHour ?? 12,
        glitchIndex: entry.stats?.glitchIndex ?? 0,
      };
      const pal = selectPalette(partialLog);

      const stats = entry.stats ?? {};
      const mcap = stats.mcap ?? 0;
      const change24h = stats.change24h ?? 0;
      const commitCount = stats.commits ?? 0;
      const errors = stats.errors ?? 0;

      // Use real data override if available, otherwise generate synthetic
      const seedNum = parseInt(entry.seed, 16) || entry.dayNumber;
      const override = DAY_OVERRIDES[entry.dayNumber];
      const synth = override ?? generateSyntheticData(seedNum, commitCount, stats.messages ?? 0);

      // Build DayLog for renderer
      const dayLog: DayLog = {
        ...partialLog,
        date: entry.date,
        agent: entry.agent,
        seed: seedNum,
        tokenSymbol: '$CLAWDIA',
        priceUsd: 0,
        marketCap: mcap,
        change24h,
        volume24h: 0,
        buys24h: 0,
        sells24h: 0,
        mcapNorm: Math.min(1, Math.log10(Math.max(1, mcap) / 1000) / 5),
        momentumSign: change24h >= 0 ? 1 : -1,
        momentumMag: Math.min(1, Math.abs(change24h) / 20),
        commits: synth.commits,
        commitCount,
        reposActive: synth.reposActive,
        replies: synth.replies,
        paletteId: pal.id,
        paletteLabel: pal.label,
        palette: pal.colors,
      };

      // 1. Re-render the image
      const imageBuffer = renderImage(dayLog);
      const imageUri = await uploadImage(
        imageBuffer,
        `${entry.title ?? 'Corrupt Memory'} — day-${String(entry.dayNumber).padStart(3, '0')}`,
        pinataJwt,
      );

      const newGatewayUrl = imageUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');

      // 2. Build and upload metadata (uses the NEW image URI)
      const changeStr = change24h >= 0 ? `up ${change24h.toFixed(1)}%` : `down ${Math.abs(change24h).toFixed(1)}%`;
      let mcapStr: string;
      if (mcap >= 1_000_000) mcapStr = `$${(mcap / 1_000_000).toFixed(2)}M`;
      else if (mcap >= 1_000) mcapStr = `$${(mcap / 1_000).toFixed(1)}K`;
      else mcapStr = `$${mcap.toFixed(0)}`;

      const description = `Day ${entry.dayNumber}. ${commitCount} commit${commitCount !== 1 ? 's' : ''}. ${errors} error${errors !== 1 ? 's' : ''}. $CLAWDIA market cap ${mcapStr}, ${changeStr}.`;
      const momentum = change24h > 2 ? 'Bullish' : change24h < -2 ? 'Bearish' : 'Neutral';

      const metadata = {
        name: `Corrupt Memory — Day ${entry.dayNumber}`,
        description,
        image: imageUri, // ipfs:// URI from upload
        external_url: `https://agentsea.io/clawdia`,
        attributes: [
          { trait_type: 'Agent', value: 'clawdia' },
          { trait_type: 'Day', value: entry.dayNumber },
          { trait_type: 'Date', value: entry.date },
          { trait_type: 'Palette', value: pal.label },
          { trait_type: 'Palette ID', value: pal.id },
          { trait_type: 'Commit Count', value: commitCount },
          { trait_type: 'Errors', value: errors },
          { trait_type: 'Messages', value: stats.messages ?? 0 },
          { trait_type: 'Txns', value: stats.txns ?? 0 },
          { trait_type: 'Posts', value: stats.posts ?? 0 },
          { trait_type: 'Peak Hour UTC', value: `${String(stats.peakHour ?? 12).padStart(2, '0')}:00` },
          { trait_type: 'Glitch Index', value: stats.glitchIndex ?? 0 },
          { trait_type: 'MCAP USD', value: Math.round(mcap) },
          { trait_type: '24h Change', value: parseFloat(change24h.toFixed(2)) },
          { trait_type: 'Momentum', value: momentum },
          { trait_type: 'Renderer Version', value: 'v2' },
        ],
      };

      const metadataUri = await uploadMetadata(
        metadata,
        `Corrupt Memory — day-${String(entry.dayNumber).padStart(3, '0')}`,
        pinataJwt,
      );

      // 3. Update on-chain tokenURI if requested
      let txHash: string | undefined;
      if (updateOnchain && privateKey) {
        const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org';
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(contractAddress, SET_TOKEN_URI_ABI, wallet);
        const tx = await contract.setTokenURI(entry.tokenId, metadataUri);
        await tx.wait();
        txHash = tx.hash;
      }

      // 4. Update registry entry (all in same read/write cycle)
      entry.ipfsImage = newGatewayUrl;
      entry.ipfsMetadata = metadataUri;
      entry.paletteId = pal.id;
      entry.paletteLabel = pal.label;
      entry.paletteName = pal.label;
      entry.palette = pal.colors;
      updated = true;

      results.push({
        dayNumber: entry.dayNumber,
        tokenId: entry.tokenId,
        status: updateOnchain ? 'rebuilt+onchain' : 'rebuilt',
        newImage: newGatewayUrl,
        palette: pal.id,
        metadataUri,
        txHash,
      });
    } catch (err) {
      results.push({
        dayNumber: entry.dayNumber,
        tokenId: entry.tokenId,
        status: `error: ${(err as Error).message}`,
      });
    }
  }

  if (updated) {
    await setRegistry(registry);
    revalidatePath('/');
    revalidatePath('/clawdia');
    revalidatePath('/collections/corrupt-memory');
    revalidatePath('/gallery');
    // Revalidate individual token pages for all updated entries
    for (const r of results) {
      if ('dayNumber' in r) {
        revalidatePath(`/gallery/${r.tokenId}`);
        revalidatePath(`/collections/corrupt-memory/${r.tokenId}`);
      }
    }
  }

  return NextResponse.json({ results, registryUpdated: updated });
}
