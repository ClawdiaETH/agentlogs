#!/usr/bin/env node
/**
 * Deploy Synthesis contracts to Base (mainnet or testnet).
 * Usage:
 *   node deploy-synthesis.mjs                    # Base mainnet
 *   node deploy-synthesis.mjs --testnet          # Base Sepolia
 *   node deploy-synthesis.mjs --verify           # Deploy + verify on Basescan
 */
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse args
const args = process.argv.slice(2);
const IS_TESTNET = args.includes('--testnet');
const VERIFY = args.includes('--verify');

// Network config
const NETWORK = IS_TESTNET ? 'base-sepolia' : 'base';
const RPC_URL = IS_TESTNET
  ? 'https://sepolia.base.org'
  : 'https://mainnet.base.org';
const CHAIN_ID = IS_TESTNET ? 84532 : 8453;
const EXPLORER = IS_TESTNET
  ? 'https://sepolia.basescan.org'
  : 'https://basescan.org';

// Load deployer private key from env
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY env var required');
  process.exit(1);
}

// Compiled artifact paths
const ARTIFACTS_DIR = path.join(__dirname, 'artifacts', 'src', 'synthesis');

const CONTRACTS = [
  {
    name: 'ERC8004Registry',
    path: path.join(ARTIFACTS_DIR, 'ERC8004Registry.sol', 'ERC8004Registry.json'),
    args: [], // No constructor args
  },
  {
    name: 'ArtAttestation',
    path: path.join(ARTIFACTS_DIR, 'ArtAttestation.sol', 'ArtAttestation.json'),
    args: [],
  },
  {
    name: 'ProvenanceVerifier',
    path: path.join(ARTIFACTS_DIR, 'ProvenanceVerifier.sol', 'ProvenanceVerifier.json'),
    args: (deployed) => [deployed.ERC8004Registry], // Takes registry address
  },
];

async function main() {
  console.log(`\n🚀 Deploying Synthesis contracts to ${NETWORK} (chainId ${CHAIN_ID})\n`);

  // Check artifacts exist
  for (const contract of CONTRACTS) {
    if (!fs.existsSync(contract.path)) {
      console.error(`❌ Artifact not found: ${contract.path}`);
      console.error('Run: npx hardhat compile');
      process.exit(1);
    }
  }

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`📍 Deployer: ${wallet.address}\n`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  if (balance === 0n) {
    console.error('❌ Deployer has 0 ETH');
    process.exit(1);
  }

  const deployed = {};

  // Deploy contracts sequentially (ProvenanceVerifier depends on ERC8004Registry)
  for (const contract of CONTRACTS) {
    console.log(`\n📦 Deploying ${contract.name}...`);

    const artifact = JSON.parse(fs.readFileSync(contract.path, 'utf8'));
    const abi = artifact.abi;
    const bytecode = artifact.bytecode;

    const args = typeof contract.args === 'function'
      ? contract.args(deployed)
      : contract.args;

    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const deployedContract = await factory.deploy(...args);

    console.log(`⏳ Tx: ${deployedContract.deploymentTransaction().hash}`);
    await deployedContract.waitForDeployment();

    const address = await deployedContract.getAddress();
    deployed[contract.name] = address;

    console.log(`✅ ${contract.name}: ${address}`);
    console.log(`   ${EXPLORER}/address/${address}`);
  }

  // Save deployment info
  const deploymentInfo = {
    network: NETWORK,
    chainId: CHAIN_ID,
    deployedAt: new Date().toISOString(),
    deployer: wallet.address,
    contracts: deployed,
  };

  const outputPath = path.join(__dirname, `synthesis-deployment-${NETWORK}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved: ${outputPath}`);

  // Contract verification instructions
  if (VERIFY) {
    console.log('\n🔍 Verifying contracts on Basescan...');
    console.log('⚠️  Automated verification requires Hardhat verify plugin.');
    console.log('Run manually:');
    for (const [name, address] of Object.entries(deployed)) {
      const contract = CONTRACTS.find(c => c.name === name);
      const args = typeof contract.args === 'function'
        ? contract.args(deployed)
        : contract.args;
      const argsStr = args.length > 0 ? ` ${args.join(' ')}` : '';
      console.log(`  npx hardhat verify --network ${NETWORK} ${address}${argsStr}`);
    }
  }

  console.log('\n✨ Deployment complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
