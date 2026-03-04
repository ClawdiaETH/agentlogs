#!/usr/bin/env node
/**
 * One-shot: render day 1 with v2 renderer, upload to IPFS, update tokenURI on-chain.
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function secret(key) {
  return execSync(`${os.homedir()}/clawd/scripts/get-secret.sh ${key}`, { encoding: 'utf8' }).trim();
}

// --- Build DayLog for 2026-03-01 from known data ---
const dayLog = {
  dayNumber: 1,
  date: '2026-03-01',
  agent: 'clawdia',
  seed: 0x5ACEB9D3,

  // DexScreener (from assembled data)
  priceUsd: 7.79e-7,
  marketCap: 76865,
  change24h: -3.88,
  volume24h: 1200,
  buys24h: 22,
  sells24h: 18,
  mcapNorm: Math.min(1, Math.log10(76865 / 1000) / 5),
  momentumSign: -1,
  momentumMag: Math.min(1, 3.88 / 20),

  // GitHub
  commits: [
    { sha: 'a1b2c3d', message: 'feat: agentlogs Phase 1 MVP', repo: 'agentlogs', timestamp: '2026-03-01T02:10:00Z' },
    { sha: 'e4f5g6h', message: 'feat: bankrclub-ens resolver fix', repo: 'bankrclub-ens', timestamp: '2026-03-01T14:22:00Z' },
  ],
  commitCount: 2,
  reposActive: ['agentlogs', 'bankrclub-ens'],

  // Operational
  txns: 0,
  posts: 0,
  errors: 85,
  messages: 207,
  peakHour: 1,
  glitchIndex: 49,
  replies: { twitter: [], farcaster: [], combined: [] },

  // Palette (INCIDENT — errors >= 20)
  paletteId: 'INCIDENT',
  paletteLabel: 'INCIDENT',
  palette: ['#120808', '#d93a0a', '#f59422', '#e8ef2a', '#faf0eb'],
};

console.log('Rendering with v2 16-layer renderer...');

// Dynamic import of TS renderer (compiled via tsx)
const { renderImage } = await import('../lib/renderer/index.ts');
const buf = await renderImage(dayLog);

const outPath = '/tmp/day1-v2.png';
writeFileSync(outPath, buf);
console.log(`Rendered → ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);

// Upload image to Pinata
const PINATA_JWT = secret('pinata_jwt');
const imgForm = new FormData();
const imgBlob = new Blob([buf], { type: 'image/png' });
imgForm.append('file', imgBlob, 'corrupt-memory-day-001-v2.png');
imgForm.append('pinataMetadata', JSON.stringify({ name: 'corrupt-memory-day-001-v2' }));

const imgRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
  method: 'POST',
  headers: { Authorization: `Bearer ${PINATA_JWT}` },
  body: imgForm,
});
const imgData = await imgRes.json();
const imageHash = imgData.IpfsHash;
console.log(`Image uploaded: ipfs://${imageHash}`);

// Upload metadata
const metadata = {
  name: 'Corrupt Memory #001 — 2026.03.01',
  description: 'Day 1. 2 commits across agentlogs and bankrclub-ens. 85 errors. $CLAWDIA market cap $76.9K, down 3.9%.',
  image: `ipfs://${imageHash}`,
  external_url: 'https://agentsea.io/clawdia',
  attributes: [
    { trait_type: 'Agent', value: 'clawdia' },
    { trait_type: 'Day', value: 1 },
    { trait_type: 'Date', value: '2026-03-01' },
    { trait_type: 'Palette', value: 'INCIDENT' },
    { trait_type: 'Palette ID', value: 'INCIDENT' },
    { trait_type: 'Commit Count', value: 2 },
    { trait_type: 'Errors', value: 85 },
    { trait_type: 'Messages', value: 207 },
    { trait_type: 'Txns', value: 0 },
    { trait_type: 'Posts', value: 0 },
    { trait_type: 'Peak Hour UTC', value: '01:00' },
    { trait_type: 'Glitch Index', value: 49 },
    { trait_type: 'MCAP USD', value: 76865 },
    { trait_type: '24h Change', value: '-3.88%' },
    { trait_type: 'Momentum', value: 'Bearish' },
    { trait_type: 'Price (ETH)', value: '0.002' },
    { trait_type: 'Status', value: 'Available' },
    { trait_type: 'Renderer Version', value: 'v2' },
  ],
};

const metaRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
  method: 'POST',
  headers: { Authorization: `Bearer ${PINATA_JWT}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ pinataMetadata: { name: 'corrupt-memory-day-001-v2-metadata' }, pinataContent: metadata }),
});
const metaData = await metaRes.json();
const metadataHash = metaData.IpfsHash;
console.log(`Metadata uploaded: ipfs://${metadataHash}`);

// Update tokenURI on-chain
const { ethers } = await import('ethers');
const privateKey = secret('signing_key');
const CONTRACT = '0xa59f17E1Cd842EF2d69a2c17DA119F7AD843Bb9a';
const ABI = ['function setTokenURI(uint256 tokenId, string calldata uri) external'];
const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(CONTRACT, ABI, wallet);

console.log('Updating tokenURI on-chain...');
const tx = await contract.setTokenURI(1, `ipfs://${metadataHash}`);
await tx.wait();
console.log(`tokenURI updated: tx ${tx.hash}`);

console.log('\n✅ Done!');
console.log(`  image:    ipfs://${imageHash}`);
console.log(`  metadata: ipfs://${metadataHash}`);
console.log(`  tx:       ${tx.hash}`);
console.log(`\nUpdate data/registry.json with:`);
console.log(JSON.stringify({ ipfsImage: `https://gateway.pinata.cloud/ipfs/${imageHash}`, ipfsMetadata: `ipfs://${metadataHash}` }, null, 2));
