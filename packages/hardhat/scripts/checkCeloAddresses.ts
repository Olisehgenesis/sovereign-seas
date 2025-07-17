import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

// Celo Mainnet Addresses
const CELO_MAINNET_ADDRESSES = {
  CELO_TOKEN: '0x471EcE3750Da237f93B8E339c536989b8978a438',
  UNISWAP_V2_ROUTER: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // This might be different on Celo
  UNISWAP_V3_ROUTER: '0x5615CDAb10dc425a742d643d949a7F474C01abc4', // This might be different on Celo
  UNISWAP_V3_QUOTER: '0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8', // This might be different on Celo
  WETH: '0x122013fd7dF1C6F636a5bb8f03108E876548b455', // Wrapped CELO on Celo
  WETH9: '0x122013fd7dF1C6F636a5bb8f03108E876548b455', // WETH9 on Celo
};

// Alfajores Testnet Addresses
const ALFAJORES_ADDRESSES = {
  CELO_TOKEN: '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9',
  UNISWAP_V2_ROUTER: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  UNISWAP_V3_ROUTER: '0x5615CDAb10dc425a742d643d949a7F474C01abc4', // This might be different on Alfajores
  UNISWAP_V3_QUOTER: '0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8', // This might be different on Alfajores
  WETH: '0x122013fd7dF1C6F636a5bb8f03108E876548b455',
  WETH9: '0x122013fd7dF1C6F636a5bb8f03108E876548b455',
};

async function checkAddresses() {
  console.log('=== Celo Network Address Checker ===\n');
  
  // Check current environment variables
  console.log('Current Environment Variables:');
  console.log(`CELO_TOKEN_ADDRESS: ${process.env.CELO_TOKEN_ADDRESS || 'NOT SET'}`);
  console.log(`UNISWAP_V2_ROUTER_ADDRESS: ${process.env.UNISWAP_V2_ROUTER_ADDRESS || 'NOT SET'}`);
  console.log(`UNISWAP_V3_ROUTER_ADDRESS: ${process.env.UNISWAP_V3_ROUTER_ADDRESS || 'NOT SET'}`);
  console.log(`UNISWAP_V3_QUOTER_ADDRESS: ${process.env.UNISWAP_V3_QUOTER_ADDRESS || 'NOT SET'}`);
  console.log(`WETH9_ADDRESS: ${process.env.WETH9_ADDRESS || 'NOT SET'}`);
  console.log(`SOVEREIGN_SEAS_V4_ADDRESS: ${process.env.SOVEREIGN_SEAS_V4_ADDRESS || 'NOT SET'}`);
  console.log(`CELO_RPC_URL: ${process.env.CELO_RPC_URL || 'NOT SET'}`);
  
  console.log('\n=== Recommended Addresses ===');
  console.log('\nFor Celo Mainnet:');
  console.log(`CELO_TOKEN_ADDRESS=${CELO_MAINNET_ADDRESSES.CELO_TOKEN}`);
  console.log(`UNISWAP_V2_ROUTER_ADDRESS=${CELO_MAINNET_ADDRESSES.UNISWAP_V2_ROUTER}`);
  console.log(`UNISWAP_V3_ROUTER_ADDRESS=${CELO_MAINNET_ADDRESSES.UNISWAP_V3_ROUTER}`);
  console.log(`UNISWAP_V3_QUOTER_ADDRESS=${CELO_MAINNET_ADDRESSES.UNISWAP_V3_QUOTER}`);
  console.log(`WETH9_ADDRESS=${CELO_MAINNET_ADDRESSES.WETH9}`);
  console.log(`CELO_RPC_URL=https://rpc.ankr.com/celo`);
  
  console.log('\nFor Alfajores Testnet:');
  console.log(`CELO_TOKEN_ADDRESS=${ALFAJORES_ADDRESSES.CELO_TOKEN}`);
  console.log(`UNISWAP_V2_ROUTER_ADDRESS=${ALFAJORES_ADDRESSES.UNISWAP_V2_ROUTER}`);
  console.log(`UNISWAP_V3_ROUTER_ADDRESS=${ALFAJORES_ADDRESSES.UNISWAP_V3_ROUTER}`);
  console.log(`UNISWAP_V3_QUOTER_ADDRESS=${ALFAJORES_ADDRESSES.UNISWAP_V3_QUOTER}`);
  console.log(`WETH9_ADDRESS=${ALFAJORES_ADDRESSES.WETH9}`);
  console.log(`CELO_RPC_URL=https://alfajores-forno.celo-testnet.org`);
  
  console.log('\n=== Issues Found ===');
  
  // Check for issues
  if (!process.env.CELO_TOKEN_ADDRESS) {
    console.log('❌ CELO_TOKEN_ADDRESS is not set');
  }
  
  if (!process.env.UNISWAP_V2_ROUTER_ADDRESS) {
    console.log('❌ UNISWAP_V2_ROUTER_ADDRESS is not set');
  }
  
  if (!process.env.UNISWAP_V3_ROUTER_ADDRESS) {
    console.log('❌ UNISWAP_V3_ROUTER_ADDRESS is not set');
  }
  
  if (!process.env.UNISWAP_V3_QUOTER_ADDRESS) {
    console.log('❌ UNISWAP_V3_QUOTER_ADDRESS is not set');
  }
  
  if (!process.env.WETH9_ADDRESS) {
    console.log('❌ WETH9_ADDRESS is not set');
  }
  
  if (!process.env.SOVEREIGN_SEAS_V4_ADDRESS) {
    console.log('❌ SOVEREIGN_SEAS_V4_ADDRESS is not set');
  }
  
  if (process.env.CELO_TOKEN_ADDRESS === process.env.UNISWAP_V2_ROUTER_ADDRESS) {
    console.log('❌ CELO_TOKEN_ADDRESS and UNISWAP_V2_ROUTER_ADDRESS are the same!');
  }
  
  if (process.env.CELO_TOKEN_ADDRESS === process.env.UNISWAP_V3_ROUTER_ADDRESS) {
    console.log('❌ CELO_TOKEN_ADDRESS and UNISWAP_V3_ROUTER_ADDRESS are the same!');
  }
  
  if (process.env.CELO_RPC_URL && process.env.CELO_RPC_URL.includes('alfajores')) {
    console.log('⚠️  Using Alfajores RPC but deploying to Celo mainnet');
  }
  
  console.log('\n=== Next Steps ===');
  console.log('1. Update your .env file with the correct addresses');
  console.log('2. Make sure SOVEREIGN_SEAS_V4_ADDRESS is set to your deployed SovereignSeas contract');
  console.log('3. Verify the Uniswap V2 Router address for Celo mainnet (it might be different from Ethereum)');
  console.log('4. Run: pnpm run deploy:uniswap-proxy:celo');
}

checkAddresses(); 