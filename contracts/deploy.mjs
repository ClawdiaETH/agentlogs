#!/usr/bin/env node
/**
 * Deploy AgentCollection.sol to Base mainnet (or testnet).
 * Usage: node deploy.mjs [--testnet]
 *
 * Reads private key via: ~/clawd/scripts/get-secret.sh signing_key
 * Updates ~/.agentlogs/config.json with deployed address.
 */

import { execSync } from 'child_process';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TESTNET = process.argv.includes('--testnet');
const RPC_URL = TESTNET
  ? 'https://sepolia.base.org'
  : 'https://mainnet.base.org';

// Clawdia collection config
const COLLECTION_NAME = 'Corrupt Memory';
const COLLECTION_SYMBOL = 'CORRUPT';
const OWNER_ADDRESS = '0xf17b5dD382B048Ff4c05c1C9e4E24cfC5C6adAd9';
const START_PRICE   = '2000000000000000';   // 0.002 ETH in wei
const PRICE_INC     = '1000000000000000';   // 0.001 ETH in wei

function getSecret(key) {
  return execSync(`${os.homedir()}/clawd/scripts/get-secret.sh ${key}`, { encoding: 'utf8' }).trim();
}

function loadArtifact() {
  const artifactPath = path.join(__dirname, 'artifacts/src/AgentCollection.sol/AgentCollection.json');
  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `Artifact not found at ${artifactPath}.\n` +
      `Run: cd contracts && npm install && npx hardhat compile`
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
    agentSlug:      config.agentSlug      ?? 'clawdia',
    contractAddress: contractAddress,
    ownerAddress:   OWNER_ADDRESS,
    startPrice:     START_PRICE,
    priceIncrement: PRICE_INC,
    launchDate:     config.launchDate     ?? '2026-02-26',
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Config updated: ${configPath}`);
}

async function main() {
  console.log(`Deploying AgentCollection to ${TESTNET ? 'Base Sepolia testnet' : 'Base mainnet'}…`);

  const privateKey = getSecret('signing_key');
  const provider   = new ethers.JsonRpcProvider(RPC_URL);
  const wallet     = new ethers.Wallet(privateKey, provider);

  console.log(`Deployer: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  const artifact = loadArtifact();
  const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log('Deploying…');
  const contract = await factory.deploy(
    COLLECTION_NAME,
    COLLECTION_SYMBOL,
    START_PRICE,
    PRICE_INC
  );
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\n✅ AgentCollection deployed at: ${address}`);
  console.log(`   Network: ${TESTNET ? 'Base Sepolia' : 'Base mainnet'}`);
  console.log(`   Name: ${COLLECTION_NAME}`);
  console.log(`   Symbol: ${COLLECTION_SYMBOL}`);
  console.log(`   Owner: ${OWNER_ADDRESS}`);
  console.log(`   Start price: ${ethers.formatEther(START_PRICE)} ETH`);
  console.log(`   Price increment: ${ethers.formatEther(PRICE_INC)} ETH/day`);

  updateConfig(address);

  // Save ABI for reference
  const abiPath = path.join(__dirname, 'AgentCollection.abi.json');
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log(`\nABI saved to: ${abiPath}`);
}

main().catch(err => {
  console.error('Deploy failed:', err.message);
  process.exit(1);
});
