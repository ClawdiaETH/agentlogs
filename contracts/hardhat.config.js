require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  paths: {
    sources: "./src",    // Solidity files live in contracts/src/
    artifacts: "./artifacts",
    cache: "./cache",
  },
  solidity: {
    version: "0.8.27",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    base: {
      url: "https://mainnet.base.org",
      chainId: 8453
    },
    "base-sepolia": {
      url: "https://sepolia.base.org",
      chainId: 84532
    }
  },
  etherscan: {
    apiKey: process.env.BASESCAN_API_KEY || '',
    customChains: [{
      network: "base",
      chainId: 8453,
      urls: {
        apiURL: "https://api.etherscan.io/v2/api?chainid=8453",
        browserURL: "https://basescan.org"
      }
    }]
  }
};
