import { exec } from 'child_process'
import { promisify } from 'util'
import dotenv from 'dotenv'
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config()

const execAsync = promisify(exec)

const NETWORK = process.argv[2] || 'alfajores' // Default to testnet for safety

// Network configuration
const NETWORK_CONFIG = {
  'alfajores': {
    name: 'Celo Alfajores Testnet',
    explorer: 'https://alfajores.celoscan.io',
    apiUrl: 'https://api-alfajores.celoscan.io/api',
    safe: true
  },
  'celo': {
    name: 'Celo Mainnet',
    explorer: 'https://celoscan.io',
    apiUrl: 'https://api.celoscan.io/api',
    safe: false
  },
  'baklava': {
    name: 'Celo Baklava Testnet',
    explorer: 'https://baklava.celoscan.io',
    apiUrl: 'https://api-baklava.celoscan.io/api',
    safe: true
  }
};

const currentNetwork = NETWORK_CONFIG[NETWORK] || NETWORK_CONFIG['alfajores'];

function loadDeployment(): Record<string, string> {
  try {
    const files = require('fs').readdirSync('.').filter((f: string) => f.startsWith(`deployment-${NETWORK}-`) && f.endsWith('.json'));
    if (files.length > 0) {
      const latestFile = files.sort().pop();
      console.log(`📁 Loading existing deployment from: ${latestFile}`);
      const deployment = JSON.parse(readFileSync(latestFile, 'utf8'));
      return deployment.contracts || {};
    }
  } catch (error) {
    console.log('📁 No existing deployment found, starting fresh');
  }
  return {};
}
//get contracts from deployment
const CONTRACTS = loadDeployment()



// Function to verify contract using hardhat verify command
async function verifyContract(contractName: string, contractAddress: string) {
  try {
    console.log(`\n🔍 Verifying ${contractName}...`)
    console.log(`   Address: ${contractAddress}`)
    console.log(`   Network: ${currentNetwork.name}`)
    
    const verifyCommand = `npx hardhat verify --network ${NETWORK} ${contractAddress}`
    console.log(`   🚀 Running: ${verifyCommand}`)
    
    const { stdout, stderr } = await execAsync(verifyCommand)
    
    if (stdout) {
      console.log(`   ✅ Verification successful!`)
      console.log(`   📄 Output: ${stdout.trim()}`)
    }
    
    if (stderr) {
      console.log(`   ⚠️  stderr: ${stderr.trim()}`)
    }
    
    console.log(`   🔗 View on ${currentNetwork.name}: ${currentNetwork.explorer}/address/${contractAddress}`)
    return true
    
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log(`   ✅ Contract already verified on ${currentNetwork.name}`)
      console.log(`   🔗 View on ${currentNetwork.name}: ${currentNetwork.explorer}/address/${contractAddress}`)
      return true
    } else {
      console.log(`   ❌ Verification failed: ${error.message}`)
      console.log(`   🔗 Manual verification: ${currentNetwork.explorer}/address/${contractAddress}`)
      return false
    }
  }
}

async function main() {
  console.log('🚀 SovereignSeas V5 Contract Verification Script')
  console.log(`🌐 Network: ${currentNetwork.name}`)
  console.log(`📍 Network ID: ${NETWORK}`)
  
  // Network safety check
  if (!currentNetwork.safe) {
    console.log('\n🚨 WARNING: You are verifying on MAINNET!')
    console.log('🚨 This will use real API calls and may have rate limits!')
    console.log('🚨 Make sure this is what you want!')
    console.log('\n⏰ Waiting 5 seconds before proceeding...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  } else {
    console.log('✅ Verifying on testnet - safe for testing');
  }
  
  console.log('\n📋 Contracts to verify:')
  Object.entries(CONTRACTS).forEach(([name, address]) => {
    console.log(`   ${name}: ${address}`)
  })
  
  console.log('\n🔍 Starting verification process...')
  
  // Verify each contract
  for (const [contractName, contractAddress] of Object.entries(CONTRACTS)) {
    await verifyContract(contractName, contractAddress as string)
  }
  
  console.log('\n🎉 Verification script completed!')
  console.log(`\n🔗 All contracts on ${currentNetwork.name}:`)
  Object.entries(CONTRACTS).forEach(([name, address]) => {
    console.log(`   ${name}: ${currentNetwork.explorer}/address/${address}`)
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
