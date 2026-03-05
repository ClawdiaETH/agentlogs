#!/usr/bin/env node
/**
 * Deploy AgentCollectionV2.sol to Base mainnet and migrate 4 pieces
 * from the old contract (0xa59f17E1Cd842EF2d69a2c17DA119F7AD843Bb9a).
 *
 * Usage: node deploy-v2.mjs [--testnet] [--verify]
 *
 * Reads private key via: ~/clawd/scripts/get-secret.sh signing_key
 * Requires: BASESCAN_API_KEY env var for --verify
 *
 * Migration mapping (old tokenId → new tokenId):
 *   1 → 1  (sold to 0x0Fc0...2F6E)
 *   2 → 2  (sold to 0x1657...0cD9f)
 *   4 → 3  (sold to 0xe515...4042)
 *   6 → 4  (unsold, auto-listed at 0.005 ETH)
 */

import { execSync } from 'child_process';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TESTNET = process.argv.includes('--testnet');
const VERIFY  = process.argv.includes('--verify');
const RPC_URL = TESTNET
  ? 'https://sepolia.base.org'
  : 'https://mainnet.base.org';

// Collection config (same as V1)
const COLLECTION_NAME = 'Corrupt Memory';
const COLLECTION_SYMBOL = 'CORRUPT';
const CLAWDIA_WALLET = '0xf17b5dD382B048Ff4c05c1C9e4E24cfC5C6adAd9';
const START_PRICE = '2000000000000000';   // 0.002 ETH
const PRICE_INC   = '1000000000000000';   // 0.001 ETH
const TREASURY    = CLAWDIA_WALLET;

// Migration data: pieces to migrate from old contract
// Order matters — they'll get sequential tokenIds 1, 2, 3, 4
const MIGRATION_PIECES = [
  {
    // Old tokenId 1 → new tokenId 1
    owner: '0x0Fc0F78fc939606db65F5BBF2F3715262C0b2F6E',
    uri: 'ipfs://QmRgmypGtixs8SW5S6FJoPiHqA8Bu9Qu3xb7Tybha2wipz',
    sold: true,
  },
  {
    // Old tokenId 2 → new tokenId 2
    owner: '0x1657ef43F54A20919a1dc2E6a406F3ee58C0cD9f',
    uri: 'ipfs://QmWYYRNEBSwXToPvEzZjKAk4bthHDorMzCkQWEDd9Aa9nv',
    sold: true,
  },
  {
    // Old tokenId 4 → new tokenId 3
    owner: '0xe515A80dE3b0dcDF7B3F96078664e4F135644042',
    uri: 'ipfs://QmWhpGBMbYG8nBYv9RSCHkXjJcvqMSGGtssTEWhx2VD4Sp',
    sold: true,
  },
  {
    // Old tokenId 6 → new tokenId 4
    owner: CLAWDIA_WALLET,
    uri: 'ipfs://bafkreif3e3dy4iqho7fy5fjrbbpa5l7cvxqrwzqnrrsd7s5zjaxqequyam',
    sold: false,
  },
];

function getSecret(key) {
  return execSync(`${os.homedir()}/clawd/scripts/get-secret.sh ${key}`, { encoding: 'utf8' }).trim();
}

function loadArtifact() {
  const artifactPath = path.join(__dirname, 'artifacts/src/AgentCollectionV2.sol/AgentCollectionV2.json');
  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `Artifact not found at ${artifactPath}.\n` +
      `Run: cd contracts && npx hardhat compile`
    );
  }
  return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
}

function updateConfig(contractAddress) {
  const configDir  = path.join(os.homedir(), '.agentlogs');
  const configPath = path.join(configDir, 'config.json');
  fs.mkdirSync(configDir, { recursive: true });

  let config = {};
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  config = {
    agentSlug:       config.agentSlug      ?? 'clawdia',
    contractAddress: contractAddress,
    ownerAddress:    CLAWDIA_WALLET,
    startPrice:      START_PRICE,
    priceIncrement:  PRICE_INC,
    launchDate:      config.launchDate     ?? '2026-02-26',
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Config updated: ${configPath}`);
}

async function main() {
  console.log(`Deploying AgentCollectionV2 to ${TESTNET ? 'Base Sepolia testnet' : 'Base mainnet'}…\n`);

  const privateKey = getSecret('signing_key');
  const provider   = new ethers.JsonRpcProvider(RPC_URL);
  const wallet     = new ethers.Wallet(privateKey, provider);

  console.log(`Deployer: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  // --- Deploy ---
  const artifact = loadArtifact();
  const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log('Deploying contract…');
  const contract = await factory.deploy(
    COLLECTION_NAME,
    COLLECTION_SYMBOL,
    START_PRICE,
    PRICE_INC,
    TREASURY
  );
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\n✅ AgentCollectionV2 deployed at: ${address}\n`);

  // --- Migrate pieces ---
  console.log('Migrating pieces…');
  for (let i = 0; i < MIGRATION_PIECES.length; i++) {
    const piece = MIGRATION_PIECES[i];
    const newTokenId = i + 1;

    if (piece.sold) {
      // Sold piece — mint directly to buyer (no listing)
      console.log(`  mintTo(${piece.owner.slice(0,6)}…, uri) → tokenId ${newTokenId} (sold)`);
      const tx = await contract.mintTo(piece.owner, piece.uri);
      await tx.wait();
    } else {
      // Unsold piece — mint to owner (auto-listed)
      const price = ethers.formatEther(BigInt(START_PRICE) + BigInt(PRICE_INC) * BigInt(newTokenId - 1));
      console.log(`  mint(uri) → tokenId ${newTokenId} (listed at ${price} ETH)`);
      const tx = await contract.mint(piece.uri);
      await tx.wait();

      if (wallet.address.toLowerCase() !== CLAWDIA_WALLET.toLowerCase()) {
        console.log(`  transferFrom(${wallet.address.slice(0,6)}…, ${CLAWDIA_WALLET.slice(0,6)}…) → tokenId ${newTokenId}`);
        const transferTx = await contract.transferFrom(wallet.address, CLAWDIA_WALLET, newTokenId);
        await transferTx.wait();
      }
    }
  }

  // --- Transfer ownership if deployer != Clawdia wallet ---
  if (wallet.address.toLowerCase() !== CLAWDIA_WALLET.toLowerCase()) {
    console.log(`\nTransferring ownership to ${CLAWDIA_WALLET}…`);
    const tx = await contract.transferOwnership(CLAWDIA_WALLET);
    await tx.wait();
    console.log('Ownership transferred.');
  }

  // --- Summary ---
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`AgentCollectionV2 deployed at: ${address}`);
  console.log(`Network: ${TESTNET ? 'Base Sepolia' : 'Base mainnet'}`);
  console.log(`Name: ${COLLECTION_NAME} (${COLLECTION_SYMBOL})`);
  console.log(`Owner: ${CLAWDIA_WALLET}`);
  console.log(`Start price: ${ethers.formatEther(START_PRICE)} ETH`);
  console.log(`Price increment: ${ethers.formatEther(PRICE_INC)} ETH/day`);
  console.log(`Treasury: ${TREASURY} (5% royalty)`);
  console.log(`Pieces migrated: ${MIGRATION_PIECES.length}`);
  console.log(`Next mint will be tokenId: ${MIGRATION_PIECES.length + 1}`);
  console.log(`${'═'.repeat(50)}\n`);

  // --- Update config ---
  updateConfig(address);

  // --- Save ABI ---
  const abiPath = path.join(__dirname, 'AgentCollectionV2.abi.json');
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log(`ABI saved to: ${abiPath}`);

  // --- Basescan verification ---
  if (VERIFY) {
    const apiKey = process.env.BASESCAN_API_KEY;
    if (!apiKey) {
      console.log('\n⚠️  BASESCAN_API_KEY not set — skipping verification');
    } else {
      console.log('\nVerifying on Basescan…');
      try {
        const network = TESTNET ? 'base-sepolia' : 'base';
        execSync(
          `npx hardhat verify --network ${network} ${address} ` +
          `"${COLLECTION_NAME}" "${COLLECTION_SYMBOL}" "${START_PRICE}" "${PRICE_INC}" "${TREASURY}"`,
          { cwd: __dirname, stdio: 'inherit', env: { ...process.env, BASESCAN_API_KEY: apiKey } }
        );
        console.log('✅ Contract verified on Basescan');
      } catch (e) {
        console.error('⚠️  Verification failed:', e.message);
        console.log('You can retry manually:');
        console.log(`  cd contracts && BASESCAN_API_KEY=$BASESCAN_API_KEY npx hardhat verify --network base ${address} "${COLLECTION_NAME}" "${COLLECTION_SYMBOL}" "${START_PRICE}" "${PRICE_INC}" "${TREASURY}"`);
      }
    }
  }
}

main().catch(err => {
  console.error('Deploy failed:', err.message);
  process.exit(1);
});
