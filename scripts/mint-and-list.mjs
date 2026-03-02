#!/usr/bin/env node
/**
 * mint-and-list.mjs
 * Daily automation pipeline:
 * 1. Assemble day log → /tmp/daylog.json
 * 2. Render image  → /tmp/piece.png
 * 3. Upload image to IPFS (Pinata)
 * 4. Upload metadata JSON to IPFS
 * 5. Call mint(uri) on AgentCollection — mints + auto-lists in one tx
 * 6. Update registry.json
 *
 * Usage:
 *   node scripts/mint-and-list.mjs              # full run
 *   node scripts/mint-and-list.mjs --dry-run    # skip onchain + IPFS, render only
 *   node scripts/mint-and-list.mjs --day 42     # override day number
 */

import { execSync, exec as execCb } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ethers } from 'ethers';

const exec = promisify(execCb);

// ─── Config ──────────────────────────────────────────────────────────────────

const DRY_RUN   = process.argv.includes('--dry-run');
const dayArg    = process.argv.indexOf('--day');
const DAY_OVERRIDE = dayArg !== -1 ? parseInt(process.argv[dayArg + 1], 10) : null;

const CONFIG_PATH   = path.join(os.homedir(), '.agentlogs', 'config.json');
const CLAWDIA_DIR   = path.join(os.homedir(), 'clawd/projects/clawdia-glitch');
const AGENTLOGS_DIR = path.join(os.homedir(), 'clawd/projects/agentlogs');
const RPC_URL       = 'https://mainnet.base.org';

// AgentCollection interface — mint(string uri) returns (uint256)
const COLLECTION_ABI = [
  'function mint(string calldata uri) external returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function getPrice(uint256 dayNumber) external view returns (uint256)',
];

// ─── Palette System ─────────────────────────────────────────────────────────
// 12 data-driven palettes, checked in priority order.
// Each palette has HSL ranges for 5 roles: DOM, SEC, ACC, BLK, WHT.
// Seed-based sampling ensures deterministic colors per day.

const PALETTES = {
  INCIDENT:     { label: 'Incident',     dom: [0,15,70,90,40,55],     sec: [20,35,60,80,35,50],    acc: [40,55,80,95,55,70],    blk: [0,10,30,50,3,14],      wht: [0,15,10,25,88,97] },
  GRAVEYARD:    { label: 'Graveyard',    dom: [230,260,30,50,20,35],  sec: [260,280,25,45,25,40],  acc: [180,210,30,50,40,55],  blk: [240,260,20,40,3,14],   wht: [220,240,5,15,88,97] },
  SUNRISE:      { label: 'Sunrise',      dom: [15,35,75,95,50,65],    sec: [330,350,60,80,45,60],  acc: [45,60,85,100,55,70],   blk: [15,25,30,50,3,14],     wht: [30,50,8,20,88,97] },
  DEFI:         { label: 'DeFi Day',     dom: [155,170,60,80,35,50],  sec: [140,160,50,70,45,60],  acc: [160,175,55,75,55,70],  blk: [155,170,30,50,3,14],   wht: [150,170,5,15,88,97] },
  HYPERSOCIAL:  { label: 'Hypersocial',  dom: [325,345,65,85,40,55],  sec: [335,355,55,75,50,65],  acc: [340,360,60,80,60,75],  blk: [330,345,30,50,3,14],   wht: [330,350,8,20,88,97] },
  TWILIGHT:     { label: 'Twilight',     dom: [265,285,55,75,30,45],  sec: [270,290,50,70,40,55],  acc: [255,275,45,65,55,70],  blk: [270,285,25,45,3,14],   wht: [265,280,5,15,88,97] },
  MERIDIAN:     { label: 'Meridian',     dom: [215,235,55,75,45,60],  sec: [220,240,50,70,50,65],  acc: [210,230,50,70,60,75],  blk: [220,235,25,45,3,14],   wht: [215,230,5,15,88,97] },
  GOLDEN_HOUR:  { label: 'Golden Hour',  dom: [35,50,70,90,45,60],    sec: [40,55,65,85,50,65],    acc: [45,60,75,95,60,75],    blk: [35,50,30,50,3,14],     wht: [35,55,8,20,88,97] },
  BANKR:        { label: 'Bankr Mode',   dom: [160,175,55,75,30,45],  sec: [155,170,50,70,45,60],  acc: [150,170,50,70,55,70],  blk: [160,175,25,45,3,14],   wht: [155,170,5,15,88,97] },
  FARCASTER:    { label: 'Farcaster',    dom: [265,280,60,80,35,50],  sec: [270,285,55,75,45,60],  acc: [260,280,45,65,60,75],  blk: [265,280,25,45,3,14],   wht: [260,280,5,15,88,97] },
  DORMANT:      { label: 'Dormant',      dom: [210,230,5,15,40,55],   sec: [210,230,5,15,55,65],   acc: [210,230,5,15,70,80],   blk: [0,0,0,5,6,12],         wht: [210,230,3,10,90,96] },
  SURGE:        { label: 'Surge',        dom: [185,200,70,90,45,60],  sec: [180,200,65,85,55,70],  acc: [175,200,60,80,65,80],  blk: [185,200,30,50,3,14],   wht: [180,200,5,15,88,97] },
};

// Mulberry32 — fast seeded 32-bit PRNG
function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function sampleRole(rng, range) {
  const [hMin, hMax, sMin, sMax, lMin, lMax] = range;
  const h = hMin + rng() * (hMax - hMin);
  const s = sMin + rng() * (sMax - sMin);
  const l = lMin + rng() * (lMax - lMin);
  return hslToHex(h, s, l);
}

function computeGlitchIndex(stats) {
  const errors   = stats.errors   ?? 0;
  const txns     = stats.txns     ?? 0;
  const messages = stats.messages ?? 0;
  return Math.min(100, Math.max(0, (errors * 3) + (txns / 10) + (messages / 100)));
}

/**
 * Select palette by priority chain. Returns { id, label, colors: string[5] }.
 * Colors are seeded by dayNumber so the same day always gets the same palette colors.
 */
function selectPalette(dayLog) {
  const stats = {
    errors:     dayLog.errors   ?? dayLog.operational?.errors   ?? 0,
    txns:       dayLog.txns     ?? dayLog.operational?.txns     ?? 0,
    posts:      dayLog.posts    ?? dayLog.operational?.posts    ?? 0,
    messages:   dayLog.messages ?? dayLog.operational?.messages ?? 0,
    peakHour:   dayLog.peakHour ?? dayLog.operational?.peakHour ?? 12,
    glitchIndex: dayLog.glitchIndex ?? dayLog.operational?.glitchIndex
                 ?? computeGlitchIndex(dayLog),
  };

  // Priority chain — first match wins
  let id;
  if      (stats.errors >= 100)                                   id = 'INCIDENT';
  else if (stats.peakHour >= 0  && stats.peakHour < 6)            id = 'GRAVEYARD';
  else if (stats.peakHour >= 6  && stats.peakHour < 10)           id = 'SUNRISE';
  else if (stats.txns > 350 && stats.posts < 60)                  id = 'DEFI';
  else if (stats.posts > 100)                                     id = 'HYPERSOCIAL';
  else if (stats.peakHour >= 19 && stats.peakHour < 24)           id = 'TWILIGHT';
  else if (stats.peakHour >= 10 && stats.peakHour < 15)           id = 'MERIDIAN';
  else if (stats.peakHour >= 15 && stats.peakHour < 19)           id = 'GOLDEN_HOUR';
  else if (stats.txns > 0 && stats.posts > 0
           && stats.txns / stats.posts > 6)                       id = 'BANKR';
  else if (stats.txns > 0 && stats.posts > 0
           && stats.posts / stats.txns > 1.5)                     id = 'FARCASTER';
  else if (stats.txns < 120 && stats.posts < 35)                  id = 'DORMANT';
  else if (stats.glitchIndex >= 85)                                id = 'SURGE';
  else                                                             id = 'MERIDIAN';

  const pal = PALETTES[id];
  const seed = (dayLog.dayNumber * 0x9e3779b9) % 0x100000000;
  const rng = mulberry32(seed);

  // Sample 5 role colors: [BLK, DOM, SEC, ACC, WHT]
  const colors = [
    sampleRole(rng, pal.blk),
    sampleRole(rng, pal.dom),
    sampleRole(rng, pal.sec),
    sampleRole(rng, pal.acc),
    sampleRole(rng, pal.wht),
  ];

  return { id, label: pal.label, colors };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function getSecret(key) {
  return execSync(
    `${os.homedir()}/clawd/scripts/get-secret.sh ${key}`,
    { encoding: 'utf8' }
  ).trim();
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Config not found at ${CONFIG_PATH}. Create it first (see SKILL.md).`);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function getDayNumber(config) {
  if (DAY_OVERRIDE) return DAY_OVERRIDE;
  const launch = new Date(config.launchDate ?? '2026-02-26');
  const now    = new Date();
  const diff   = Math.floor((now.getTime() - launch.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

function getDateStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Step 1: Assemble day log ─────────────────────────────────────────────────

async function assembleDayLog(config, dayNumber) {
  log('Step 1: Assembling day log…');
  const assemblerPath = path.join(CLAWDIA_DIR, 'assemble-day-log.mjs');

  if (!fs.existsSync(assemblerPath)) {
    log('  assemble-day-log.mjs not found — using stub day log');
    const stub = {
      dayNumber,
      date:     getDateStr(),
      agent:    config.agentSlug,
      commits:  0,
      errors:   0,
      messages: 0,
      txns:     0,
      posts:    0,
      peakHour: new Date().getUTCHours(),
    };
    // Auto-select palette from stats
    const { id, label, colors } = selectPalette(stub);
    stub.paletteId = id;
    stub.paletteLabel = label;
    stub.palette = colors;
    log(`  Palette: ${label} (${id})`);
    fs.writeFileSync('/tmp/daylog.json', JSON.stringify(stub, null, 2));
    return stub;
  }

  // assembler takes [YYYY-MM-DD] [--out path]
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  await exec(`node ${assemblerPath} ${yesterday} --out /tmp/daylog.json`);
  const dayLog = JSON.parse(fs.readFileSync('/tmp/daylog.json', 'utf8'));

  // Auto-select palette if assembler didn't provide one
  if (!dayLog.paletteId) {
    const { id, label, colors } = selectPalette(dayLog);
    dayLog.paletteId = id;
    dayLog.paletteLabel = label;
    dayLog.palette = colors;
    log(`  Palette: ${label} (${id})`);
  }

  return dayLog;
}

// ─── Step 2: Render image ─────────────────────────────────────────────────────

async function renderImage(_dayLog) {
  log('Step 2: Rendering image…');
  const rendererPath = path.join(CLAWDIA_DIR, 'render-cli.js');

  if (!fs.existsSync(rendererPath)) {
    log('  render-cli.js not found — copying day-001.png as placeholder');
    const src = path.join(CLAWDIA_DIR, 'day-001.png');
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, '/tmp/piece.png');
    } else {
      throw new Error('No renderer and no day-001.png fallback found');
    }
    return '/tmp/piece.png';
  }

  await exec(`node ${rendererPath} /tmp/daylog.json /tmp/piece.png`);
  log('  Rendered → /tmp/piece.png');
  return '/tmp/piece.png';
}

// ─── Step 3: Upload image to IPFS ─────────────────────────────────────────────

async function uploadImageToIPFS(imgPath, dayLog) {
  log('Step 3: Uploading image to IPFS via Pinata…');
  const pinataJwt = getSecret('pinata_jwt');

  const imageBuffer = fs.readFileSync(imgPath);

  const formBody = new FormData();
  const blob = new Blob([imageBuffer], { type: 'image/png' });
  formBody.append('file', blob, `day-${String(dayLog.dayNumber).padStart(3, '0')}.png`);
  formBody.append('name', `Corrupt Memory — Day ${dayLog.dayNumber}`);
  formBody.append('group_id', '');

  const resp = await fetch('https://uploads.pinata.cloud/v3/files', {
    method:  'POST',
    headers: { Authorization: `Bearer ${pinataJwt}` },
    body:    formBody,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Pinata image upload failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  const cid  = data.data?.cid ?? data.IpfsHash;
  const uri  = `ipfs://${cid}`;
  log(`  Image CID: ${cid}`);
  return uri;
}

// ─── Step 4: Upload metadata to IPFS ──────────────────────────────────────────

async function uploadMetadataToIPFS(dayLog, imageUri, config) {
  log('Step 4: Uploading metadata to IPFS…');
  const pinataJwt = getSecret('pinata_jwt');

  const metadata = {
    name:        `Corrupt Memory — Day ${dayLog.dayNumber}`,
    description: `Daily generative art by ${config.agentSlug}. Day ${dayLog.dayNumber} of 365. Each piece is a data portrait of that day's operations: commits, errors, trades, messages.`,
    image:       imageUri,
    external_url: `https://agentlogs.xyz/${config.agentSlug}`,
    attributes:  [
      { trait_type: 'Agent',      value: config.agentSlug              },
      { trait_type: 'Day',        value: dayLog.dayNumber               },
      { trait_type: 'Date',       value: dayLog.date                    },
      { trait_type: 'Palette',    value: dayLog.paletteLabel ?? 'Meridian' },
      { trait_type: 'Palette ID', value: dayLog.paletteId   ?? 'MERIDIAN' },
      { trait_type: 'Commits',    value: dayLog.commits  ?? 0          },
      { trait_type: 'Errors',     value: dayLog.errors   ?? 0          },
      { trait_type: 'Messages',   value: dayLog.messages ?? 0          },
      { trait_type: 'Txns',       value: dayLog.txns     ?? 0          },
      { trait_type: 'Posts',      value: dayLog.posts    ?? 0          },
      { trait_type: 'Peak Hour UTC', value: `${String(dayLog.peakHour ?? 12).padStart(2, '0')}:00` },
      { trait_type: 'Glitch Index',  value: Math.round(computeGlitchIndex(dayLog)) },
    ],
  };

  const metaBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
  const formBody   = new FormData();
  const blob       = new Blob([metaBuffer], { type: 'application/json' });
  formBody.append('file', blob, `day-${String(dayLog.dayNumber).padStart(3, '0')}.json`);
  formBody.append('name', `Corrupt Memory — Day ${dayLog.dayNumber} metadata`);

  const resp = await fetch('https://uploads.pinata.cloud/v3/files', {
    method:  'POST',
    headers: { Authorization: `Bearer ${pinataJwt}` },
    body:    formBody,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Pinata metadata upload failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  const cid  = data.data?.cid ?? data.IpfsHash;
  const uri  = `ipfs://${cid}`;
  log(`  Metadata CID: ${cid}`);
  return uri;
}

// ─── Step 5: Mint NFT (auto-lists via AgentCollection.mint) ──────────────────

async function mintNFT(config, metadataUri, wallet) {
  log('Step 5: Minting NFT (auto-lists)…');

  if (!config.contractAddress) {
    throw new Error('contractAddress not set in config. Deploy AgentCollection first.');
  }

  const collection = new ethers.Contract(config.contractAddress, COLLECTION_ABI, wallet);

  const tx = await collection.mint(metadataUri);
  log(`  Mint tx: ${tx.hash}`);

  const receipt = await tx.wait();
  log(`  Confirmed in block ${receipt.blockNumber}`);

  // Get minted token ID from Transfer event
  const transferTopic = ethers.id('Transfer(address,address,uint256)');
  const transferLog   = receipt.logs.find(l => l.topics[0] === transferTopic);
  if (!transferLog) {
    throw new Error('Could not find Transfer event in mint receipt');
  }
  const tokenId = parseInt(transferLog.topics[3], 16);
  log(`  Token ID: ${tokenId} (auto-listed)`);
  return { tokenId, txHash: tx.hash };
}

// ─── Step 6: Update registry ──────────────────────────────────────────────────

function updateRegistry(config, dayLog, tokenId, imageUri, metadataUri, mintTxHash) {
  const registryPath = path.join(AGENTLOGS_DIR, 'data/registry.json');
  let registry = [];
  if (fs.existsSync(registryPath)) {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  }

  const startPrice = BigInt(config.startPrice ?? '2000000000000000');
  const increment  = BigInt(config.priceIncrement ?? '1000000000000000');
  const priceWei   = startPrice + increment * BigInt(dayLog.dayNumber - 1);
  const priceEth   = (Number(priceWei) / 1e18).toFixed(3);

  // Use Pinata gateway for IPFS images
  const ipfsImageUrl = imageUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');

  const entry = {
    tokenId,
    dayNumber:    dayLog.dayNumber,
    date:         dayLog.date ?? getDateStr(),
    agent:        config.agentSlug,
    title:        'Corrupt Memory',
    ipfsImage:    ipfsImageUrl,
    ipfsMetadata: metadataUri,
    price:        priceWei.toString(),
    priceEth,
    sold:         false,
    buyer:        null,
    txHash:       mintTxHash,
    paletteId:    dayLog.paletteId    ?? 'MERIDIAN',
    paletteLabel: dayLog.paletteLabel ?? 'Meridian',
    palette:      dayLog.palette      ?? ['#1a0533', '#6b21a8', '#a855f7', '#d8b4fe', '#f5f0ff'],
    stats: {
      commits:  dayLog.commits  ?? 0,
      errors:   dayLog.errors   ?? 0,
      messages: dayLog.messages ?? 0,
      txns:     dayLog.txns     ?? 0,
      posts:    dayLog.posts    ?? 0,
    },
  };

  registry.push(entry);
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  log(`  Registry updated: ${registryPath}`);
  return entry;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log(`mint-and-list.mjs starting${DRY_RUN ? ' (DRY RUN)' : ''}…`);

  const config    = loadConfig();
  const dayNumber = getDayNumber(config);
  log(`Day: ${dayNumber}`);

  // Step 1: Assemble day log
  const dayLog = await assembleDayLog(config, dayNumber);

  // Step 2: Render image
  const imgPath = await renderImage(dayLog);

  if (DRY_RUN) {
    log(`\n✅ Dry run complete.`);
    log(`   Day:     ${dayNumber}`);
    log(`   Palette: ${dayLog.paletteLabel} (${dayLog.paletteId})`);
    log(`   Colors:  ${dayLog.palette.join(' ')}`);
    log(`   Image:   /tmp/piece.png`);
    log(`   DayLog:  /tmp/daylog.json`);
    log('   Re-run without --dry-run to mint and list onchain.');
    return;
  }

  // Step 3: Upload image to IPFS
  const imageUri = await uploadImageToIPFS(imgPath, dayLog);

  // Step 4: Upload metadata to IPFS
  const metadataUri = await uploadMetadataToIPFS(dayLog, imageUri, config);

  // Setup provider + wallet
  const privateKey = getSecret('signing_key');
  const provider   = new ethers.JsonRpcProvider(RPC_URL);
  const wallet     = new ethers.Wallet(privateKey, provider);
  log(`Wallet: ${wallet.address}`);

  // Step 5: Mint NFT (auto-lists)
  const { tokenId, txHash: mintTxHash } = await mintNFT(config, metadataUri, wallet);

  // Step 6: Update registry
  const entry = updateRegistry(config, dayLog, tokenId, imageUri, metadataUri, mintTxHash);

  log('\n✅ Pipeline complete!');
  log(`   Token ID:      ${tokenId}`);
  log(`   Day:           ${dayNumber}`);
  log(`   Image IPFS:    ${imageUri}`);
  log(`   Metadata IPFS: ${metadataUri}`);
  log(`   Mint tx:       ${mintTxHash}`);
  log(`   Price:         ${entry.priceEth} ETH`);
}

main().catch(err => {
  console.error('\n❌ Pipeline failed:', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
