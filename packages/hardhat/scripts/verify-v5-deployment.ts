import { exec } from 'child_process'
import { promisify } from 'util'
import dotenv from 'dotenv'
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config()

const execAsync = promisify(exec)

const NETWORK = process.argv[2] || 'celo'


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
    
    const verifyCommand = `npx hardhat verify --network celo ${contractAddress}`
    console.log(`   🚀 Running: ${verifyCommand}`)
    
    const { stdout, stderr } = await execAsync(verifyCommand)
    
    if (stdout) {
      console.log(`   ✅ Verification successful!`)
      console.log(`   📄 Output: ${stdout.trim()}`)
    }
    
    if (stderr) {
      console.log(`   ⚠️  stderr: ${stderr.trim()}`)
    }
    
    console.log(`   🔗 View on CeloScan: https://celoscan.io/address/${contractAddress}`)
    return true
    
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log(`   ✅ Contract already verified on CeloScan`)
      console.log(`   🔗 View on CeloScan: https://celoscan.io/address/${contractAddress}`)
      return true
    } else {
      console.log(`   ❌ Verification failed: ${error.message}`)
      console.log(`   🔗 Manual verification: https://celoscan.io/address/${contractAddress}`)
      return false
    }
  }
}

async function main() {
  console.log('🚀 SovereignSeas V5 Contract Verification Script')
  console.log('🌐 Network: Celo Mainnet')
  
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
  console.log('\n🔗 All contracts on CeloScan:')
  Object.entries(CONTRACTS).forEach(([name, address]) => {
    console.log(`   ${name}: https://celoscan.io/address/${address}`)
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
