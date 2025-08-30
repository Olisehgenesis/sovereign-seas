import { createPublicClient, http, createWalletClient, parseEther, getContract } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Configuration
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS
const KEY = process.env.PRIVATE_KEY as `0x${string}`
//append 0x to the key
const DEPLOYER_PRIVATE_KEY = '0x' + KEY


if (!SOVEREIGN_SEAS_V4_ADDRESS) {
  throw new Error('SOVEREIGN_SEAS_V4_ADDRESS environment variable is required')
}

if (!DEPLOYER_PRIVATE_KEY) {
  throw new Error('DEPLOYER_PRIVATE_KEY environment variable is required')
}

const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY as `0x${string}`)

const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
})

const walletClient = createWalletClient({
  account,
  chain: celo,
  transport: http(),
})

// Contract ABIs
const V6_ABI = JSON.parse(readFileSync(join(__dirname, '../artifacts/contracts/SovereignSeasV6.sol/SovereignSeasV6.json'), 'utf8')).abi
const V4_ABI = JSON.parse(readFileSync(join(__dirname, '../artifacts/contracts/SovereignSeasV4.sol/SovereignSeasV4.json'), 'utf8')).abi

// Contract addresses from V4
const V4_CONTRACT = getContract({
  address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
  abi: V4_ABI,
  client: publicClient
})

async function deployV6() {
  console.log('🚀 Deploying SovereignSeasV6...')
  console.log('📋 Configuration:')
  console.log(`   V4 Contract: ${SOVEREIGN_SEAS_V4_ADDRESS}`)
  console.log(`   Deployer: ${account.address}`)

  try {
    // Get current nonce
    const nonce = await publicClient.getTransactionCount({ address: account.address })
    console.log(`   Nonce: ${nonce}`)

    // Deploy V6 contract (constructor takes no arguments)
    console.log('\n📦 Deploying contract...')
    
    const deployTx = await walletClient.deployContract({
      abi: V6_ABI,
      bytecode: JSON.parse(readFileSync(join(__dirname, '../artifacts/contracts/SovereignSeasV6.sol/SovereignSeasV6.json'), 'utf8')).bytecode,
      args: [] // V6 constructor takes no arguments
    })

    console.log(`   Deploy transaction: ${deployTx}`)
    console.log('   Waiting for deployment confirmation...')

    // Wait for deployment
    const receipt = await publicClient.waitForTransactionReceipt({ hash: deployTx })
    console.log(`   ✅ Contract deployed at: ${receipt.contractAddress}`)

    // Initialize the contract
    console.log('\n🔧 Initializing contract...')
    
    const v6Contract = getContract({
      address: receipt.contractAddress!,
      abi: V6_ABI,
      client: walletClient
    })

    // Initialize with admin role
    const initTx = await v6Contract.write.initialize([account.address])
    console.log(`   Initialize transaction: ${initTx}`)
    console.log('   Waiting for initialization confirmation...')

    const initReceipt = await publicClient.waitForTransactionReceipt({ hash: initTx })
    console.log('   ✅ Contract initialized successfully')

    // Set contract addresses after initialization
    console.log('\n🔧 Setting contract addresses...')
    
    // Get V4 data for configuration
    
    const mentoBroker = await V4_CONTRACT.read.mentoTokenBroker([])
    const celoToken = await V4_CONTRACT.read.celoToken([])
    // Set native token and cUSD token addresses (CELO mainnet addresses)
    const nativeToken = '0x471EcE3750Da237f93B8E339c536989b8978a438' // CELO
    const cusdToken = '0x765DE816845861e75A25fCA122bb6898B8B1282a' // cUSD
    
    const setAddressesTx = await v6Contract.write.setContractAddresses([nativeToken, cusdToken])
    console.log(`   Set addresses transaction: ${setAddressesTx}`)
    console.log('   Waiting for confirmation...')

    const setAddressesReceipt = await publicClient.waitForTransactionReceipt({ hash: setAddressesTx })
    console.log('   ✅ Contract addresses set successfully')

    // Set broker and CELO token if available
    if (mentoBroker !== '0x0000000000000000000000000000000000000000') {
      console.log('\n🔧 Setting broker address...')
      const setBrokerTx = await v6Contract.write.setBrokerAddress([mentoBroker])
      await publicClient.waitForTransactionReceipt({ hash: setBrokerTx })
      console.log('   ✅ Broker address set')
    }

    if (celoToken !== '0x0000000000000000000000000000000000000000') {
      console.log('\n🔧 Setting CELO token address...')
      const setCeloTx = await v6Contract.write.setCeloToken([celoToken])
      await publicClient.waitForTransactionReceipt({ hash: setCeloTx })
      console.log('   ✅ CELO token address set')
    }

    // Get V4 data for verification
    console.log('\n📊 Verifying V4 contract data...')
    
    let v4ProjectCount = 0n
    let v4CampaignCount = 0n
    
    try {
      // V4 uses nextProjectId and nextCampaignId for counting
      v4ProjectCount = await V4_CONTRACT.read.nextProjectId([]) as bigint
      v4CampaignCount = await V4_CONTRACT.read.nextCampaignId([]) as bigint
      
      console.log(`   V4 Projects: ${v4ProjectCount}`)
      console.log(`   V4 Campaigns: ${v4CampaignCount}`)
      
      // Test basic V4 functionality
      if (v4ProjectCount > 0n || v4CampaignCount > 0n) {
        console.log('\n🧪 Testing V4 contract access...')
        
        // Try to read a project if it exists
        if (v4ProjectCount > 0n) {
          try {
            const project = await V4_CONTRACT.read.projects([0n]) as { name: string }
            console.log(`   ✅ V4 Project #0 accessible: ${project.name}`)
          } catch (error) {
            console.log('   ⚠️  Could not read V4 project data')
          }
        }
        
        // Try to read a campaign if it exists
        if (v4CampaignCount > 0n) {
          try {
            const campaign = await V4_CONTRACT.read.campaigns([0n]) as { name: string }
            console.log(`   ✅ V4 Campaign #0 accessible: ${campaign.name}`)
          } catch (error) {
            console.log('   ⚠️  Could not read V4 campaign data')
          }
        }
      }
    } catch (error) {
      console.log('   ⚠️  Could not read V4 data (contract might not be deployed or accessible)')
    }

    // Create deployment JSON
    const deploymentData = {
      network: 'celo',
      contract: 'SovereignSeasV6',
      address: receipt.contractAddress,
      deployer: account.address,
      transactionHash: deployTx,
      initTransactionHash: initTx,
      blockNumber: receipt.blockNumber,
      timestamp: new Date().toISOString(),
      configuration: {
        v4Contract: SOVEREIGN_SEAS_V4_ADDRESS,
        mentoBroker: mentoBroker,
        celoToken: celoToken,
        nativeToken: nativeToken,
        cusdToken: cusdToken,
        admin: account.address
      },
      verification: {
        v4Projects: Number(v4ProjectCount),
        v4Campaigns: Number(v4CampaignCount)
      }
    }

    const deploymentPath = join(__dirname, '../deployments/v6-deployment.json')
    writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2))
    console.log(`\n📄 Deployment data saved to: ${deploymentPath}`)

    // Display deployment summary
    console.log('\n🎉 Deployment Summary:')
    console.log(`   Contract: ${receipt.contractAddress}`)
    console.log(`   Network: Celo`)
    console.log(`   Admin: ${account.address}`)
    console.log(`   V4 Contract: ${SOVEREIGN_SEAS_V4_ADDRESS}`)
    console.log(`   Native Token: ${nativeToken}`)
    console.log(`   cUSD Token: ${cusdToken}`)
    console.log(`   Gas Used: ${receipt.gasUsed}`)
    console.log(`   Block: ${receipt.blockNumber}`)

    return {
      contractAddress: receipt.contractAddress,
      transactionHash: deployTx,
      initTransactionHash: initTx,
      deploymentData
    }

  } catch (error) {
    console.error('❌ Deployment failed:', error)
    throw error
  }
}

// Main execution
if (require.main === module) {
  deployV6()
    .then(() => {
      console.log('\n✅ Deployment completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Deployment failed:', error)
      process.exit(1)
    })
}

export { deployV6 }
