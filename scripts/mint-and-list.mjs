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
 *   node scripts/mint-and-list.mjs --dry-run    # skip on-chain + IPFS, render only
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
      trades:   0,
      palette:  ['#1a0533', '#6b21a8', '#a855f7', '#d8b4fe', '#f5f0ff'],
    };
    fs.writeFileSync('/tmp/daylog.json', JSON.stringify(stub, null, 2));
    return stub;
  }

  // assembler takes [YYYY-MM-DD] [--out path]
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  await exec(`node ${assemblerPath} ${yesterday} --out /tmp/daylog.json`);
  return JSON.parse(fs.readFileSync('/tmp/daylog.json', 'utf8'));
}

// ─── Step 2: Render image ─────────────────────────────────────────────────────

async function renderImage(dayLog) {
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
      { trait_type: 'Agent',      value: config.agentSlug     },
      { trait_type: 'Day',        value: dayLog.dayNumber      },
      { trait_type: 'Date',       value: dayLog.date           },
      { trait_type: 'Commits',    value: dayLog.commits ?? 0   },
      { trait_type: 'Errors',     value: dayLog.errors  ?? 0   },
      { trait_type: 'Messages',   value: dayLog.messages ?? 0  },
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
  const registryPath = path.join(AGENTLOGS_DIR, 'site/data/registry.json');
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
    palette:      dayLog.palette ?? ['#1a0533', '#6b21a8', '#a855f7', '#d8b4fe', '#f5f0ff'],
    stats: {
      commits:  dayLog.commits  ?? 0,
      errors:   dayLog.errors   ?? 0,
      messages: dayLog.messages ?? 0,
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
    log('\n✅ Dry run complete. Image at /tmp/piece.png. Day log at /tmp/daylog.json.');
    log('   Re-run without --dry-run to mint and list on-chain.');
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
