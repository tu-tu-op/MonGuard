require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      mining: {
        auto: true,
        interval: 0,
      },
    },
    monadTestnet: {
      url: process.env.MONAD_TESTNET_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 41454, // Placeholder - Update with actual Monad testnet chain ID
      gasPrice: "auto",
    },
    monadMainnet: {
      url: process.env.MONAD_MAINNET_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 4145, // Placeholder - Update with actual Monad mainnet chain ID
      gasPrice: "auto",
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  etherscan: {
    apiKey: {
      monadTestnet: process.env.MONAD_EXPLORER_API_KEY || "",
      monadMainnet: process.env.MONAD_EXPLORER_API_KEY || "",
    },
    customChains: [
      {
        network: "monadTestnet",
        chainId: 41454,
        urls: {
          apiURL: process.env.MONAD_TESTNET_EXPLORER_API || "",
          browserURL: process.env.MONAD_TESTNET_EXPLORER || "",
        },
      },
      {
        network: "monadMainnet",
        chainId: 4145,
        urls: {
          apiURL: process.env.MONAD_MAINNET_EXPLORER_API || "",
          browserURL: process.env.MONAD_MAINNET_EXPLORER || "",
        },
      },
    ],
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};
