"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const config = {
    networks: {
        alfajores: {
            accounts: [process.env.PRIVATE_KEY ?? '0x0'],
            url: 'https://alfajores-forno.celo-testnet.org',
        },
        celo: {
            accounts: [process.env.PRIVATE_KEY ?? '0x0'],
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
                chainId: 44787,
                network: 'alfajores',
                urls: {
                    apiURL: 'https://api-alfajores.celoscan.io/api',
                    browserURL: 'https://alfajores.celoscan.io',
                },
            },
            {
                chainId: 42220,
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
    solidity: '0.8.24',
};
exports.default = config;
