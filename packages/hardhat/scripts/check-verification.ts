import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Network configuration
const NETWORK_CONFIG = {
  'alfajores': {
    name: 'Celo Alfajores Testnet',
    explorer: 'https://alfajores.celoscan.io',
    safe: true
  },
  'celo': {
    name: 'Celo Mainnet',
    explorer: 'https://celoscan.io',
    safe: false
  },
  'baklava': {
    name: 'Celo Baklava Testnet',
    explorer: 'https://baklava.celoscan.io',
    safe: true
  }
};

function loadDeployment(network: string): Record<string, string> {
  try {
    const files = readdirSync('.').filter((f: string) => f.startsWith(`deployment-${network}-`) && f.endsWith('.json'));
    if (files.length > 0) {
      const latestFile = files.sort().pop();
      console.log(`📁 Loading deployment from: ${latestFile}`);
      const deployment = JSON.parse(readFileSync(latestFile, 'utf8'));
      return deployment.contracts || {};
    }
  } catch (error) {
    console.log(`📁 No deployment found for network: ${network}`);
  }
  return {};
}

async function main() {
  const network = process.argv[2] || 'alfajores';
  const currentNetwork = NETWORK_CONFIG[network] || NETWORK_CONFIG['alfajores'];
  
  console.log('🔍 Contract Verification Status Check');
  console.log('====================================');
  console.log(`🌐 Network: ${currentNetwork.name}`);
  console.log(`📍 Network ID: ${network}`);
  
  if (!currentNetwork.safe) {
    console.log('\n🚨 WARNING: This is MAINNET verification!');
    console.log('🚨 Make sure you want to verify on mainnet!');
  } else {
    console.log('\n✅ Safe for testing - no real money involved');
  }
  
  const contracts = loadDeployment(network);
  
  if (Object.keys(contracts).length === 0) {
    console.log('\n❌ No contracts found for verification');
    console.log('💡 Deploy contracts first using: npm run deploy:v5');
    return;
  }
  
  console.log('\n📋 Contracts to verify:');
  Object.entries(contracts).forEach(([name, address]) => {
    console.log(`   ${name}: ${address}`);
  });
  
  console.log('\n🔗 Verification commands:');
  console.log(`   npm run verify:v5:${network === 'alfajores' ? 'testnet' : network}`);
  
  console.log('\n🔗 Explorer links:');
  Object.entries(contracts).forEach(([name, address]) => {
    console.log(`   ${name}: ${currentNetwork.explorer}/address/${address}`);
  });
  
  console.log('\n💡 To verify all contracts:');
  console.log(`   npm run verify:v5:${network === 'alfajores' ? 'testnet' : network}`);
  
  if (network === 'alfajores') {
    console.log('\n💡 To switch to mainnet verification:');
    console.log('   npm run verify:v5:mainnet');
  } else if (network === 'celo') {
    console.log('\n💡 To switch to testnet verification:');
    console.log('   npm run verify:v5:testnet');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
