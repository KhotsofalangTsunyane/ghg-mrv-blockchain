require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Load from .env - never hardcode real keys/secrets in this file.
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const METAMASK_PRIVATE_KEY = process.env.METAMASK_PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Public testnet deployment (satisfies the assignment requirement).
    // RPC comes from Infura/Alchemy; the signing key is exported from
    // the MetaMask account you want to deploy from.
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: METAMASK_PRIVATE_KEY ? [METAMASK_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    // Local Ganache instance, useful for quick iteration before
    // spending testnet ETH on Sepolia.
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337
    },
    // Hardhat's own local network (npx hardhat node)
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  }
};