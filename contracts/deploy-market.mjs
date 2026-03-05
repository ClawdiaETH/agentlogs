#!/usr/bin/env node
/**
 * Deploy AgentSeaMarket.sol to Base mainnet.
 *
 * Usage: node deploy-market.mjs [--testnet] [--verify]
 *
 * Reads private key via: ~/clawd/scripts/get-secret.sh signing_key
 * Requires: BASESCAN_API_KEY env var for --verify
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

const TREASURY = '0xf17b5dD382B048Ff4c05c1C9e4E24cfC5C6adAd9';

function getSecret(key) {
  return execSync(`${os.homedir()}/clawd/scripts/get-secret.sh ${key}`, { encoding: 'utf8' }).trim();
}

function loadArtifact() {
  const artifactPath = path.join(__dirname, 'artifacts/src/AgentSeaMarket.sol/AgentSeaMarket.json');
  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `Artifact not found at ${artifactPath}.\n` +
      `Run: cd contracts && npx hardhat compile`
    );
  }
  return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
}

async function main() {
  console.log(`Deploying AgentSeaMarket to ${TESTNET ? 'Base Sepolia testnet' : 'Base mainnet'}…\n`);

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
  const contract = await factory.deploy(TREASURY);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\n✅ AgentSeaMarket deployed at: ${address}\n`);

  // --- Summary ---
  console.log(`${'═'.repeat(50)}`);
  console.log(`AgentSeaMarket deployed at: ${address}`);
  console.log(`Network: ${TESTNET ? 'Base Sepolia' : 'Base mainnet'}`);
  console.log(`Treasury: ${TREASURY}`);
  console.log(`Fee: 2.5% (250 bps)`);
  console.log(`${'═'.repeat(50)}\n`);

  // --- Save ABI ---
  const abiPath = path.join(__dirname, 'AgentSeaMarket.abi.json');
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
          `npx hardhat verify --network ${network} ${address} "${TREASURY}"`,
          { cwd: __dirname, stdio: 'inherit', env: { ...process.env, BASESCAN_API_KEY: apiKey } }
        );
        console.log('✅ Contract verified on Basescan');
      } catch (e) {
        console.error('⚠️  Verification failed:', e.message);
        console.log('You can retry manually:');
        console.log(`  cd contracts && BASESCAN_API_KEY=$BASESCAN_API_KEY npx hardhat verify --network base ${address} "${TREASURY}"`);
      }
    }
  }

  console.log('\n📋 Next steps:');
  console.log(`  1. Set NEXT_PUBLIC_MARKET_CONTRACT=${address} in your .env`);
  console.log('  2. Redeploy frontend');
}

main().catch(err => {
  console.error('Deploy failed:', err.message);
  process.exit(1);
});
