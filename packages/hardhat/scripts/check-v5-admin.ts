import { createPublicClient, http, getContract } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Configuration
const KEY = process.env.PRIVATE_KEY as `0x${string}`
const DEPLOYER_PRIVATE_KEY = '0x' + KEY
const CELO_RPC_URL = process.env.CELO_RPC_URL || 'https://celo.drpc.org'

// Contract address from deployment
const SOVEREIGN_SEAS_V5_ADDRESS = '0xb9a75525c5e8b4cbe556f2b75f37d7a219eb4089'

if (!DEPLOYER_PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable is required')
}

const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY as `0x${string}`)

const publicClient = createPublicClient({
  chain: celo,
  transport: http(CELO_RPC_URL),
})

// Contract ABI (just the functions we need)
const SOVEREIGN_SEAS_V5_ABI = [
  {
    inputs: [],
    name: "ADMIN_ROLE",
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "DEFAULT_ADMIN_ROLE",
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ type: "bytes32" }, { type: "address" }],
    name: "hasRole",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ type: "bytes32" }],
    name: "getRoleMemberCount",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ type: "bytes32" }, { type: "uint256" }],
    name: "getRoleMember",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function"
  }
]

async function checkV5Admin() {
  try {
    console.log('🔍 Checking SovereignSeas V5 Admin Status...')
    console.log(`📋 Contract: ${SOVEREIGN_SEAS_V5_ADDRESS}`)
    console.log(`👤 Your Account: ${account.address}`)
    
    const contract = getContract({
      address: SOVEREIGN_SEAS_V5_ADDRESS as `0x${string}`,
      abi: SOVEREIGN_SEAS_V5_ABI,
      client: publicClient
    })

    // Get role hashes
    const ADMIN_ROLE = await contract.read.ADMIN_ROLE([])
    const DEFAULT_ADMIN_ROLE = await contract.read.DEFAULT_ADMIN_ROLE([])
    
    console.log('\n🔑 Role Hashes:')
    console.log(`   ADMIN_ROLE: ${ADMIN_ROLE}`)
    console.log(`   DEFAULT_ADMIN_ROLE: ${DEFAULT_ADMIN_ROLE}`)
    
    // Check if your account has roles
    const hasAdminRole = await contract.read.hasRole([ADMIN_ROLE, account.address])
    const hasDefaultAdminRole = await contract.read.hasRole([DEFAULT_ADMIN_ROLE, account.address])
    
    console.log('\n👤 Your Account Permissions:')
    console.log(`   Has ADMIN_ROLE: ${hasAdminRole ? '✅ YES' : '❌ NO'}`)
    console.log(`   Has DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRole ? '✅ YES' : '❌ NO'}`)
    
    // Check who has DEFAULT_ADMIN_ROLE (this is usually the deployer)
    const defaultAdminCount = await contract.read.getRoleMemberCount([DEFAULT_ADMIN_ROLE])
    console.log(`\n👑 DEFAULT_ADMIN_ROLE holders: ${defaultAdminCount}`)
    
    // Ensure defaultAdminCount is a number for safe comparison and iteration
    const defaultAdminCountNum = typeof defaultAdminCount === 'bigint'
      ? Number(defaultAdminCount)
      : typeof defaultAdminCount === 'number'
        ? defaultAdminCount
        : 0;

    if (defaultAdminCountNum > 0) {
      for (let i = 0; i < Math.min(defaultAdminCountNum, 5); i++) {
        try {
          const member = await contract.read.getRoleMember([DEFAULT_ADMIN_ROLE, BigInt(i)])
          console.log(`   ${i + 1}. ${member}`)
        } catch (error) {
          console.log(`   ${i + 1}. Error reading member: ${error}`)
        }
      }
    }
    
    // Check who has ADMIN_ROLE
    const adminCount = await contract.read.getRoleMemberCount([ADMIN_ROLE])
    console.log(`\n👑 ADMIN_ROLE holders: ${adminCount}`)

    // Ensure adminCount is a number for safe comparison and iteration
    const adminCountNum = typeof adminCount === 'bigint'
      ? Number(adminCount)
      : typeof adminCount === 'number'
        ? adminCount
        : 0;

    if (adminCountNum > 0) {
      for (let i = 0; i < Math.min(adminCountNum, 5); i++) {
        try {
          const member = await contract.read.getRoleMember([ADMIN_ROLE, BigInt(i)])
          console.log(`   ${i + 1}. ${member}`)
        } catch (error) {
          console.log(`   ${i + 1}. Error reading member: ${error}`)
        }
      }
    }
    
    console.log('\n📊 Summary:')
    if (hasDefaultAdminRole || hasAdminRole) {
      console.log('✅ You have admin access! You can proceed with module registration.')
    } else {
      console.log('❌ You do NOT have admin access.')
      console.log('💡 Solutions:')
      console.log('   1. Deploy a NEW contract with your account as admin')
      console.log('   2. Ask the current admin to grant you ADMIN_ROLE')
      console.log('   3. Use the account that has admin access')
    }
    
  } catch (error) {
    console.error('❌ Error checking admin status:', error)
  }
}

checkV5Admin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
