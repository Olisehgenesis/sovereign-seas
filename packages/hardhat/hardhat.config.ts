// hardhat.config.ts
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import { config as dotEnvConfig } from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';

dotEnvConfig();

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      chainId: 1337,
      mining: {
        auto: true,
        interval: 5000
      }
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337
    },
    alfajores: {
      accounts: [
        process.env.PRIVATE_KEY ?? '0x0',
        process.env.PRIVATE_KEY_ADMIN ?? process.env.PRIVATE_KEY ?? '0x0',
        process.env.PRIVATE_KEY_PROJECT_OWNER_1 ?? process.env.PRIVATE_KEY ?? '0x0',
        process.env.PRIVATE_KEY_PROJECT_OWNER_2 ?? process.env.PRIVATE_KEY ?? '0x0',
        process.env.PRIVATE_KEY_VOTER_1 ?? process.env.PRIVATE_KEY ?? '0x0',
        process.env.PRIVATE_KEY_VOTER_2 ?? process.env.PRIVATE_KEY ?? '0x0',
        process.env.PRIVATE_KEY_VOTER_3 ?? process.env.PRIVATE_KEY ?? '0x0',
      ].filter(key => key !== '0x0'),
      url: 'https://alfajores-forno.celo-testnet.org',
    },
    celo: {
      accounts: [
        process.env.PRIVATE_KEY ?? '0x0',
        process.env.PRIVATE_KEY_ADMIN ?? process.env.PRIVATE_KEY ?? '0x0',
        process.env.PRIVATE_KEY_PROJECT_OWNER_1 ?? process.env.PRIVATE_KEY ?? '0x0',
        process.env.PRIVATE_KEY_PROJECT_OWNER_2 ?? process.env.PRIVATE_KEY ?? '0x0',
        process.env.PRIVATE_KEY_VOTER_1 ?? process.env.PRIVATE_KEY ?? '0x0',
        process.env.PRIVATE_KEY_VOTER_2 ?? process.env.PRIVATE_KEY ?? '0x0',
        process.env.PRIVATE_KEY_VOTER_3 ?? process.env.PRIVATE_KEY ?? '0x0',
      ].filter(key => key !== '0x0'),
      url: 'https://forno.celo.org',
    },
  },
  etherscan: {
    apiKey: {
      alfajores: process.env.CELOSCAN_API_KEY ?? '',
      celo: process.env.CELOSCAN_API_KEY ?? '',
    },
    customChains: [
      {
        chainId: 44_787,
        network: 'alfajores',
        urls: {
          apiURL: 'https://api-alfajores.celoscan.io/api',
          browserURL: 'https://alfajores.celoscan.io',
        },
      },
      {
        chainId: 42_220,
        network: 'celo',
        urls: {
          apiURL: 'https://api.celoscan.io/api',
          browserURL: 'https://celoscan.io/',
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  }
};

export default config;