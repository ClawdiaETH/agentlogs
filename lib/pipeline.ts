import { assembleDayLog } from './assembler';
import { renderImage } from './renderer';
import { uploadImage, uploadMetadata } from './pinata';
import { mintNFT, autoListOnMarket } from './contract';
import { hasDayNumber, addEntry, getRegistry } from './kv-registry';
import { commitRegistry } from './github-commit';
import { addProvenanceEvent } from './kv-provenance';
import type { AgentConfig } from './agents';
import type { DayLog } from './renderer/types';

export interface PipelineSecrets {
  pinataJwt: string;
  privateKey: string;
  githubToken?: string;
  contractAddress: string;
  startPrice: string;
  priceIncrement: string;
  launchDate: string;
  agentSlug: string;
  tokenAddress?: string;
  githubUsername?: string;
  tokenSymbol?: string;
  seriesTitle?: string;
  agentConfig?: AgentConfig;
}

interface PipelineResult {
  tokenId: number;
  dayNumber: number;
  txHash: string;
  imageUri: string;
  metadataUri: string;
}

function getDayNumber(launchDate: string): number {
  // Cron runs each morning to publish YESTERDAY's data.
  // Day 1 = first day of data (launchDate). Published the day after.
  // On March 3 (2 days after March 1 launch): diff=2 → day 2. ✓
  const launch = new Date(launchDate);
  const now = new Date();
  const diff = Math.floor((now.getTime() - launch.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

function getDateStr(): string {
  // Yesterday's date — cron always publishes the previous day's logs
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function buildERC721Metadata(dayLog: DayLog, imageUri: string, agentSlug: string, seriesTitle?: string, tokenSymbol?: string) {
  const changeStr = dayLog.change24h >= 0 ? `up ${dayLog.change24h.toFixed(1)}%` : `down ${Math.abs(dayLog.change24h).toFixed(1)}%`;
  let mcapStr: string;
  if (dayLog.marketCap >= 1_000_000) mcapStr = `$${(dayLog.marketCap / 1_000_000).toFixed(2)}M`;
  else if (dayLog.marketCap >= 1_000) mcapStr = `$${(dayLog.marketCap / 1_000).toFixed(1)}K`;
  else mcapStr = `$${dayLog.marketCap.toFixed(0)}`;

  const symbol = tokenSymbol ?? dayLog.tokenSymbol ?? '$CLAWDIA';
  const description = `Day ${dayLog.dayNumber}. ${dayLog.commitCount} commit${dayLog.commitCount !== 1 ? 's' : ''}${dayLog.reposActive.length > 0 ? ` across ${dayLog.reposActive.join(' and ')}` : ''}. ${dayLog.errors} error${dayLog.errors !== 1 ? 's' : ''}. ${symbol} market cap ${mcapStr}, ${changeStr}.`;

  const momentum = dayLog.change24h > 2 ? 'Bullish' : dayLog.change24h < -2 ? 'Bearish' : 'Neutral';
  const title = seriesTitle ?? 'Corrupt Memory';

  return {
    name: `${title} — Day ${dayLog.dayNumber}`,
    description,
    image: imageUri,
    external_url: `https://agentsea.io/${agentSlug}`,
    attributes: [
      { trait_type: 'Agent', value: agentSlug },
      { trait_type: 'Day', value: dayLog.dayNumber },
      { trait_type: 'Date', value: dayLog.date },
      { trait_type: 'Palette', value: dayLog.paletteLabel },
      { trait_type: 'Palette ID', value: dayLog.paletteId },
      { trait_type: 'Commit Count', value: dayLog.commitCount },
      { trait_type: 'Repos Active', value: dayLog.reposActive.length },
      { trait_type: 'Active Projects', value: dayLog.reposActive.join(', ') || 'None' },
      { trait_type: 'Errors', value: dayLog.errors },
      { trait_type: 'Messages', value: dayLog.messages },
      { trait_type: 'Txns', value: dayLog.txns },
      { trait_type: 'Posts', value: dayLog.posts },
      { trait_type: 'Reply Count', value: dayLog.replies.combined.length },
      { trait_type: 'Peak Hour UTC', value: `${String(dayLog.peakHour).padStart(2, '0')}:00` },
      { trait_type: 'Glitch Index', value: Math.round(dayLog.glitchIndex) },
      { trait_type: 'MCAP USD', value: Math.round(dayLog.marketCap) },
      { trait_type: '24h Change', value: parseFloat(dayLog.change24h.toFixed(2)) },
      { trait_type: 'Momentum', value: momentum },
      { trait_type: 'Renderer Version', value: 'v2' },
    ],
  };
}

/**
 * Run the full daily pipeline: assemble → render → upload → mint → commit registry.
 */
export async function runPipeline(secrets: PipelineSecrets): Promise<PipelineResult> {
  const dayNumber = getDayNumber(secrets.launchDate);
  const date = getDateStr();

  // 0. Duplicate guard — check KV registry
  const alreadyMinted = await hasDayNumber(dayNumber);
  if (alreadyMinted) {
    throw new Error(`Day ${dayNumber} already minted — skipping to prevent duplicate`);
  }

  // 1. Assemble day log
  const dayLog = await assembleDayLog(dayNumber, date, secrets.agentSlug, secrets.agentConfig);

  // 2. Render image
  const imageBuffer = renderImage(dayLog);

  // 3. Upload image to IPFS
  const dayLabel = `day-${String(dayNumber).padStart(3, '0')}`;
  const seriesTitle = secrets.seriesTitle ?? 'Corrupt Memory';
  const imageUri = await uploadImage(imageBuffer, `${seriesTitle} — ${dayLabel}`, secrets.pinataJwt);

  // 4. Build + upload metadata to IPFS
  const metadata = buildERC721Metadata(dayLog, imageUri, secrets.agentSlug, secrets.seriesTitle, secrets.tokenSymbol);
  const metadataUri = await uploadMetadata(metadata, `${seriesTitle} — ${dayLabel}`, secrets.pinataJwt);

  // 5. Mint NFT
  const { tokenId, txHash } = await mintNFT(metadataUri, secrets.contractAddress, secrets.privateKey);

  // 6. Update KV registry
  const startPrice = BigInt(secrets.startPrice);
  const increment = BigInt(secrets.priceIncrement);
  const priceWei = startPrice + increment * BigInt(dayNumber - 1);
  const priceEth = (Number(priceWei) / 1e18).toFixed(3);
  const ipfsImageUrl = imageUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');

  const entry = {
    tokenId,
    dayNumber,
    date,
    agent: secrets.agentSlug,
    title: seriesTitle,
    ipfsImage: ipfsImageUrl,
    ipfsMetadata: metadataUri,
    price: priceWei.toString(),
    priceEth,
    sold: false,
    buyer: null,
    mintTx: txHash,
    paletteId: dayLog.paletteId,
    paletteLabel: dayLog.paletteLabel,
    paletteName: dayLog.paletteLabel,
    palette: dayLog.palette,
    seed: `0x${(dayLog.seed >>> 0).toString(16).toUpperCase().padStart(8, '0')}`,
    stats: {
      commits: dayLog.commitCount,
      errors: dayLog.errors,
      messages: dayLog.messages,
      events: 0,
      txns: dayLog.txns,
      posts: dayLog.posts,
      peakHour: dayLog.peakHour,
      glitchIndex: Math.round(dayLog.glitchIndex),
      mcap: Math.round(dayLog.marketCap),
      change24h: parseFloat(dayLog.change24h.toFixed(2)),
    },
  };

  // 7. Persist registry — KV if available, GitHub commit as fallback
  await addEntry(entry); // no-op when KV not configured

  if (!process.env.KV_REST_API_URL && secrets.githubToken) {
    const current = await getRegistry();
    await commitRegistry(
      JSON.stringify([...current, entry], null, 2),
      `mint: ${seriesTitle} Day ${dayNumber} — ${dayLog.paletteLabel}`,
      secrets.githubToken,
    );
  }

  // 8. Record provenance event
  await addProvenanceEvent({
    id: `${secrets.agentSlug}:mint:${txHash}`,
    agent: secrets.agentSlug,
    type: 'mint',
    initiatedBy: 'agent',
    timestamp: new Date().toISOString(),
    tokenId,
    txHash,
    priceWei: priceWei.toString(),
    priceEth,
  });

  // 9. Auto-list on V2 marketplace (if configured)
  const marketV2 = process.env.NEXT_PUBLIC_MARKET_V2_CONTRACT;
  if (marketV2 && secrets.contractAddress) {
    try {
      await autoListOnMarket(
        tokenId,
        priceWei.toString(),
        secrets.contractAddress,
        marketV2,
        secrets.privateKey,
      );
    } catch {
      // Non-fatal — piece is minted even if listing fails
    }
  }

  return { tokenId, dayNumber, txHash, imageUri, metadataUri };
}
