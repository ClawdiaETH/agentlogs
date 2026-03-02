import { ethers } from 'ethers';

const COLLECTION_ABI = [
  'function mint(string calldata uri) external returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function getPrice(uint256 dayNumber) external view returns (uint256)',
];

const RPC_URL = 'https://mainnet.base.org';

interface MintResult {
  tokenId: number;
  txHash: string;
}

/**
 * Mint an NFT on the AgentCollection contract.
 * Returns tokenId and transaction hash.
 */
export async function mintNFT(
  metadataUri: string,
  contractAddress: string,
  privateKey: string,
): Promise<MintResult> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const collection = new ethers.Contract(contractAddress, COLLECTION_ABI, wallet);

  const tx = await collection.mint(metadataUri);
  const receipt = await tx.wait();

  // Get minted token ID from Transfer event
  const transferTopic = ethers.id('Transfer(address,address,uint256)');
  const transferLog = receipt.logs.find(
    (l: { topics: string[] }) => l.topics[0] === transferTopic,
  );
  if (!transferLog) {
    throw new Error('Could not find Transfer event in mint receipt');
  }
  const tokenId = parseInt(transferLog.topics[3], 16);

  return { tokenId, txHash: tx.hash };
}
