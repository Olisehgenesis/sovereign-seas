import { createPublicClient, http, createWalletClient, parseEther, getContract } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo, celoAlfajores } from 'viem/chains'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Configuration
const KEY = process.env.PRIVATE_KEY as `0x${string}`
const DEPLOYER_PRIVATE_KEY = '0x' + KEY
const NETWORK = process.argv[2] || 'alfajores' // Default to alfajores if no network specified
const CELO_RPC_URL = process.env.CELO_RPC_URL || 'https://celo.drpc.org'
const ALFAJORES_RPC_URL = 'https://alfajores-forno.celo-testnet.org'
const REDEPLOY = false // Set to true to redeploy all contracts

// Deployment tracking file
const DEPLOYMENT_FILE = `deployment-${NETWORK}-${Date.now()}.json`

// Load existing deployment if exists
function loadDeployment(): Record<string, string> {
  try {
    // Try to find the most recent deployment file for this network
    const files = require('fs').readdirSync('.').filter((f: string) => f.startsWith(`deployment-${NETWORK}-`) && f.endsWith('.json'))
    if (files.length > 0) {
      const latestFile = files.sort().pop() // Get the most recent file
      console.log(`📁 Loading existing deployment from: ${latestFile}`)
      const deployment = JSON.parse(readFileSync(latestFile, 'utf8'))
      return deployment.contracts || {}
    }
  } catch (error) {
    console.log('📁 No existing deployment found, starting fresh')
  }
  return {}
}

// Save deployment progress
function saveDeployment(contracts: Record<string, string>) {
  const deployment = {
    network: NETWORK,
    deployer: account.address,
    timestamp: new Date().toISOString(),
    contracts
  }
  writeFileSync(DEPLOYMENT_FILE, JSON.stringify(deployment, null, 2))
  console.log(`💾 Deployment progress saved to: ${DEPLOYMENT_FILE}`)
}

// Already deployed contract addresses (from previous deployment or loaded from file)
const DEPLOYED_ADDRESSES = loadDeployment()

// Display current deployment status
function displayDeploymentStatus() {
  console.log('\n📊 Current Deployment Status:')
  const status = {
    'ProjectsModule': DEPLOYED_ADDRESSES.projectsModule || '❌ Not deployed',
    'CampaignsModule': DEPLOYED_ADDRESSES.campaignsModule || '❌ Not deployed',
    'VotingModule': DEPLOYED_ADDRESSES.votingModule || '❌ Not deployed',
    'TreasuryModule': DEPLOYED_ADDRESSES.treasuryModule || '❌ Not deployed',
    'MigrationModule': DEPLOYED_ADDRESSES.migrationModule || '❌ Not deployed',
    'SovereignSeasV5': DEPLOYED_ADDRESSES.sovereignSeasV5 || '❌ Not deployed'
  }
  
  Object.entries(status).forEach(([contract, address]) => {
    const icon = address !== '❌ Not deployed' ? '✅' : '❌'
    console.log(`   ${icon} ${contract}: ${address}`)
  })
  
  const deployedCount = Object.values(DEPLOYED_ADDRESSES).filter(addr => addr !== '').length
  const totalCount = 6
  console.log(`\n📈 Progress: ${deployedCount}/${totalCount} contracts deployed`)
}

if (!DEPLOYER_PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable is required')
}

const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY as `0x${string}`)

// Select network
const selectedChain = NETWORK === 'celo' ? celo : celoAlfajores
const networkName = NETWORK === 'celo' ? 'Celo Mainnet' : 'Alfajores Testnet'

console.log(`🚀 Deploying SovereignSeas V5 Proxy Architecture to ${networkName}...`)
console.log(`📋 Configuration:`)
console.log(`   Network: ${NETWORK}`)
console.log(`   Deployer: ${account.address}`)
console.log(`   Celo RPC: ${CELO_RPC_URL}`)

const publicClient = createPublicClient({
  chain: selectedChain,
  transport: http(NETWORK === 'celo' ? CELO_RPC_URL : ALFAJORES_RPC_URL),
  pollingInterval: 1000,
})

const walletClient = createWalletClient({
  account,
  chain: selectedChain,
  transport: http(NETWORK === 'celo' ? CELO_RPC_URL : ALFAJORES_RPC_URL),
})

// Helper function to wait for transaction with retries
async function waitForTransaction(hash: `0x${string}`, maxRetries = 3): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await publicClient.waitForTransactionReceipt({ hash })
    } catch (error: any) {
      if (i === maxRetries - 1) throw error
      if (error.message?.includes('block is out of range') || error.message?.includes('timeout')) {
        console.log(`   ⏳ Retry ${i + 1}/${maxRetries} - waiting 5 seconds...`)
        await new Promise(resolve => setTimeout(resolve, 5000))
        continue
      }
      throw error
    }
  }
}

// Contract ABIs
const PROJECTS_MODULE_ABI = JSON.parse(readFileSync(join(__dirname, '../artifacts/contracts/ProjectsModule.sol/ProjectsModule.json'), 'utf8')).abi
const CAMPAIGNS_MODULE_ABI = JSON.parse(readFileSync(join(__dirname, '../artifacts/contracts/CampaignsModule.sol/CampaignsModule.json'), 'utf8')).abi
const VOTING_MODULE_ABI = JSON.parse(readFileSync(join(__dirname, '../artifacts/contracts/VotingModule.sol/VotingModule.json'), 'utf8')).abi
const TREASURY_MODULE_ABI = JSON.parse(readFileSync(join(__dirname, '../artifacts/contracts/TreasuryModule.sol/TreasuryModule.json'), 'utf8')).abi
const MIGRATION_MODULE_ABI = JSON.parse(readFileSync(join(__dirname, '../artifacts/contracts/MigrationModule.sol/MigrationModule.json'), 'utf8')).abi
const SOVEREIGN_SEAS_V5_ABI = JSON.parse(readFileSync(join(__dirname, '../artifacts/contracts/SovereignSeasV5Proxy.sol/SovereignSeasV5.json'), 'utf8')).abi

async function deployV5Proxy() {
  try {
    // Display current deployment status
    displayDeploymentStatus()
    
    // Get current nonce
    const nonce = await publicClient.getTransactionCount({ address: account.address })
    console.log(`   Nonce: ${nonce}`)

    let projectsModuleAddress: `0x${string}`
    let campaignsModuleAddress: `0x${string}`
    let votingModuleAddress: `0x${string}`
    let treasuryModuleAddress: `0x${string}`
    let migrationModuleAddress: `0x${string}`
    let sovereignSeasV5Address: `0x${string}`

    if (!REDEPLOY && DEPLOYED_ADDRESSES.projectsModule) {
      console.log('\n1️⃣ Using already deployed ProjectsModule...')
      projectsModuleAddress = DEPLOYED_ADDRESSES.projectsModule as `0x${string}`
      console.log(`✅ ProjectsModule address: ${projectsModuleAddress}`)
    } else {
      // 1. Deploy ProjectsModule
      console.log('\n1️⃣ Deploying ProjectsModule...')
      const projectsModuleTx = await walletClient.deployContract({
        abi: PROJECTS_MODULE_ABI,
        bytecode: JSON.parse(readFileSync(join(__dirname, '../artifacts/contracts/ProjectsModule.sol/ProjectsModule.json'), 'utf8')).bytecode,
        args: []
      })
      console.log(`   Deploy transaction: ${projectsModuleTx}`)
      const projectsModuleReceipt = await waitForTransaction(projectsModuleTx)
      projectsModuleAddress = projectsModuleReceipt.contractAddress!
      console.log(`✅ ProjectsModule deployed to: ${projectsModuleAddress}`)
      
      // Save progress immediately
      saveDeployment({
        projectsModule: projectsModuleAddress,
        campaignsModule: DEPLOYED_ADDRESSES.campaignsModule || '',
        votingModule: DEPLOYED_ADDRESSES.votingModule || '',
        treasuryModule: DEPLOYED_ADDRESSES.treasuryModule || '',
        migrationModule: DEPLOYED_ADDRESSES.migrationModule || '',
        sovereignSeasV5: DEPLOYED_ADDRESSES.sovereignSeasV5 || ''
      })
    }

    if (!REDEPLOY && DEPLOYED_ADDRESSES.campaignsModule) {
      console.log('\n2️⃣ Using already deployed CampaignsModule...')
      campaignsModuleAddress = DEPLOYED_ADDRESSES.campaignsModule as `0x${string}`
      console.log(`✅ CampaignsModule address: ${campaignsModuleAddress}`)
    } else {
      // 2. Deploy CampaignsModule
      console.log('\n2️⃣ Deploying CampaignsModule...')
      const campaignsModuleTx = await walletClient.deployContract({
        abi: CAMPAIGNS_MODULE_ABI,
        bytecode: JSON.parse(readFileSync(join(__dirname, '../artifacts/contracts/CampaignsModule.sol/CampaignsModule.json'), 'utf8')).bytecode,
        args: []
      })
      console.log(`   Deploy transaction: ${campaignsModuleTx}`)
      const campaignsModuleReceipt = await waitForTransaction(campaignsModuleTx)
      campaignsModuleAddress = campaignsModuleReceipt.contractAddress!
      console.log(`✅ CampaignsModule deployed to: ${campaignsModuleAddress}`)
      
      // Save progress immediately
      saveDeployment({
        projectsModule: projectsModuleAddress,
        campaignsModule: campaignsModuleAddress,
        votingModule: DEPLOYED_ADDRESSES.votingModule || '',
        treasuryModule: DEPLOYED_ADDRESSES.treasuryModule || '',
        migrationModule: DEPLOYED_ADDRESSES.migrationModule || '',
        sovereignSeasV5: DEPLOYED_ADDRESSES.sovereignSeasV5 || ''
      })
    }

    if (!REDEPLOY && DEPLOYED_ADDRESSES.votingModule) {
      console.log('\n3️⃣ Using already deployed VotingModule...')
      votingModuleAddress = DEPLOYED_ADDRESSES.votingModule as `0x${string}`
      console.log(`✅ VotingModule address: ${votingModuleAddress}`)
    } else {
      // 3. Deploy VotingModule
      console.log('\n3️⃣ Deploying VotingModule...')
      const votingModuleTx = await walletClient.deployContract({
        abi: VOTING_MODULE_ABI,
        bytecode: JSON.parse(readFileSync(join(__dirname, '../artifacts/contracts/VotingModule.sol/VotingModule.json'), 'utf8')).bytecode,
        args: []
      })
      console.log(`   Deploy transaction: ${votingModuleTx}`)
      const votingModuleReceipt = await waitForTransaction(votingModuleTx)
      votingModuleAddress = votingModuleReceipt.contractAddress!
      console.log(`✅ VotingModule deployed to: ${votingModuleAddress}`)
      
      // Save progress immediately
      saveDeployment({
        projectsModule: projectsModuleAddress,
        campaignsModule: campaignsModuleAddress,
        votingModule: votingModuleAddress,
        treasuryModule: DEPLOYED_ADDRESSES.treasuryModule || '',
        migrationModule: DEPLOYED_ADDRESSES.migrationModule || '',
        sovereignSeasV5: DEPLOYED_ADDRESSES.sovereignSeasV5 || ''
      })
    }

    if (!REDEPLOY && DEPLOYED_ADDRESSES.treasuryModule) {
      console.log('\n4️⃣ Using already deployed TreasuryModule...')
      treasuryModuleAddress = DEPLOYED_ADDRESSES.treasuryModule as `0x${string}`
      console.log(`✅ TreasuryModule address: ${treasuryModuleAddress}`)
    } else {
      // 4. Deploy TreasuryModule
      console.log('\n4️⃣ Deploying TreasuryModule...')
      const treasuryModuleTx = await walletClient.deployContract({
        abi: TREASURY_MODULE_ABI,
        bytecode: JSON.parse(readFileSync(join(__dirname, '../artifacts/contracts/TreasuryModule.sol/TreasuryModule.json'), 'utf8')).bytecode,
        args: []
      })
      console.log(`   Deploy transaction: ${treasuryModuleTx}`)
      const treasuryModuleReceipt = await waitForTransaction(treasuryModuleTx)
      treasuryModuleAddress = treasuryModuleReceipt.contractAddress!
      console.log(`✅ TreasuryModule deployed to: ${treasuryModuleAddress}`)
      
      // Save progress immediately
      saveDeployment({
        projectsModule: projectsModuleAddress,
        campaignsModule: campaignsModuleAddress,
        votingModule: votingModuleAddress,
        treasuryModule: treasuryModuleAddress,
        migrationModule: DEPLOYED_ADDRESSES.migrationModule || '',
        sovereignSeasV5: DEPLOYED_ADDRESSES.sovereignSeasV5 || ''
      })
    }

    if (!REDEPLOY && DEPLOYED_ADDRESSES.migrationModule) {
      console.log('\n5️⃣ Using already deployed MigrationModule...')
      migrationModuleAddress = DEPLOYED_ADDRESSES.migrationModule as `0x${string}`
      console.log(`✅ MigrationModule address: ${migrationModuleAddress}`)
    } else {
      // 5. Deploy MigrationModule
      console.log('\n5️⃣ Deploying MigrationModule...')
      const migrationModuleTx = await walletClient.deployContract({
        abi: MIGRATION_MODULE_ABI,
        bytecode: JSON.parse(readFileSync(join(__dirname, '../artifacts/contracts/MigrationModule.sol/MigrationModule.json'), 'utf8')).bytecode,
        args: []
      })
      console.log(`   Deploy transaction: ${migrationModuleTx}`)
      const migrationModuleReceipt = await waitForTransaction(migrationModuleTx)
      migrationModuleAddress = migrationModuleReceipt.contractAddress!
      console.log(`✅ MigrationModule deployed to: ${migrationModuleAddress}`)
      
      // Save progress immediately
      saveDeployment({
        projectsModule: projectsModuleAddress,
        campaignsModule: campaignsModuleAddress,
        votingModule: votingModuleAddress,
        treasuryModule: treasuryModuleAddress,
        migrationModule: migrationModuleAddress,
        sovereignSeasV5: DEPLOYED_ADDRESSES.sovereignSeasV5 || ''
      })
    }

    if (!REDEPLOY && DEPLOYED_ADDRESSES.sovereignSeasV5) {
      console.log('\n6️⃣ Using already deployed SovereignSeasV5...')
      sovereignSeasV5Address = DEPLOYED_ADDRESSES.sovereignSeasV5 as `0x${string}`
      console.log(`✅ SovereignSeasV5 address: ${sovereignSeasV5Address}`)
    } else {
      // 6. Deploy SovereignSeasV5 Proxy
      console.log('\n6️⃣ Deploying SovereignSeasV5 Proxy...')
      const sovereignSeasV5Tx = await walletClient.deployContract({
        abi: SOVEREIGN_SEAS_V5_ABI,
        bytecode: JSON.parse(readFileSync(join(__dirname, '../artifacts/contracts/SovereignSeasV5Proxy.sol/SovereignSeasV5.json'), 'utf8')).bytecode,
        args: [] // No constructor arguments needed
      })
      console.log(`   Deploy transaction: ${sovereignSeasV5Tx}`)
      const sovereignSeasV5Receipt = await waitForTransaction(sovereignSeasV5Tx)
      sovereignSeasV5Address = sovereignSeasV5Receipt.contractAddress!
      console.log(`✅ SovereignSeasV5 deployed to: ${sovereignSeasV5Address}`)
      
      // Save progress immediately
      saveDeployment({
        projectsModule: projectsModuleAddress,
        campaignsModule: campaignsModuleAddress,
        votingModule: votingModuleAddress,
        treasuryModule: treasuryModuleAddress,
        migrationModule: migrationModuleAddress,
        sovereignSeasV5: sovereignSeasV5Address
      })
    }

    // Create contract instance for all operations (whether newly deployed or existing)
    const sovereignSeasV5Contract = getContract({
      address: sovereignSeasV5Address,
      abi: SOVEREIGN_SEAS_V5_ABI,
      client: walletClient
    })

    // 7. Check admin roles and grant if needed
    console.log('\n7️⃣ Checking and setting up admin roles...')
    
    try {
      const ADMIN_ROLE = await sovereignSeasV5Contract.read.ADMIN_ROLE([])
      const DEFAULT_ADMIN_ROLE = await sovereignSeasV5Contract.read.DEFAULT_ADMIN_ROLE([])
      
      console.log('🔑 Role hashes:')
      console.log(`   ADMIN_ROLE: ${ADMIN_ROLE}`)
      console.log(`   DEFAULT_ADMIN_ROLE: ${DEFAULT_ADMIN_ROLE}`)
      
      // Check who currently has admin roles
      const hasAdminRole = await sovereignSeasV5Contract.read.hasRole([ADMIN_ROLE, account.address])
      const hasDefaultAdminRole = await sovereignSeasV5Contract.read.hasRole([DEFAULT_ADMIN_ROLE, account.address])
      
      console.log('👤 Current deployer permissions:')
      console.log(`   Has ADMIN_ROLE: ${hasAdminRole ? '✅ YES' : '❌ NO'}`)
      console.log(`   Has DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRole ? '✅ YES' : '❌ NO'}`)
      
      if (!hasAdminRole || !hasDefaultAdminRole) {
        console.log('⚠️  Deployer missing admin roles, attempting to initialize...')
        
        // Try to initialize the contract
        try {
          console.log('🆕 Attempting to initialize contract...')
          const initTx = await sovereignSeasV5Contract.write.initialize([account.address])
          console.log(`   Initialize transaction: ${initTx}`)
          await waitForTransaction(initTx)
          console.log(`✅ Contract initialized successfully`)
          
          // Verify roles were granted
          const newHasAdminRole = await sovereignSeasV5Contract.read.hasRole([ADMIN_ROLE, account.address])
          const newHasDefaultAdminRole = await sovereignSeasV5Contract.read.hasRole([DEFAULT_ADMIN_ROLE, account.address])
          console.log(`✅ After initialization - ADMIN_ROLE: ${newHasAdminRole}, DEFAULT_ADMIN_ROLE: ${newHasDefaultAdminRole}`)
          
        } catch (initError: any) {
          if (initError.message.includes("InvalidInitialization")) {
            console.log('❌ Contract already initialized by different account')
            console.log('💡 Attempting to grant admin role to deployer...')
            
            // Try to grant admin role using grantRole function
            try {
              console.log('🔑 Granting ADMIN_ROLE to deployer...')
              const grantAdminTx = await sovereignSeasV5Contract.write.grantRole([ADMIN_ROLE, account.address])
              console.log(`   Grant ADMIN_ROLE transaction: ${grantAdminTx}`)
              await waitForTransaction(grantAdminTx)
              console.log(`✅ ADMIN_ROLE granted successfully`)
              
              // Verify role was granted
              const newHasAdminRole = await sovereignSeasV5Contract.read.hasRole([ADMIN_ROLE, account.address])
              console.log(`✅ After granting - ADMIN_ROLE: ${newHasAdminRole}`)
              
            } catch (grantError: any) {
              console.log('❌ Failed to grant ADMIN_ROLE:', grantError.message)
              console.log('💡 You need to either:')
              console.log('   1. Deploy a NEW contract with your account as admin')
              console.log('   2. Ask the current admin to grant you ADMIN_ROLE')
              console.log('   3. Use the account that has admin access')
              
              // Try to continue with module registration (might fail)
              console.log('⚠️  Attempting to continue with module registration...')
            }
          } else {
            console.log('❌ Initialization failed:', initError.message)
            throw initError
          }
        }
      } else {
        console.log('✅ Deployer already has admin roles')
      }
      
    } catch (error) {
      console.log('❌ Error checking admin roles:', error)
      console.log('💡 This might mean the contract is not properly deployed or accessible')
      throw error
    }

    // 8. Register all modules (only if we have admin access)
    console.log('\n8️⃣ Registering modules...')
    
    try {
      await sovereignSeasV5Contract.write.registerModule(['projects', projectsModuleAddress])
      console.log('✅ Projects module registered')
      
      await sovereignSeasV5Contract.write.registerModule(['campaigns', campaignsModuleAddress])
      console.log('✅ Campaigns module registered')
      
      await sovereignSeasV5Contract.write.registerModule(['voting', votingModuleAddress])
      console.log('✅ Voting module registered')
      
      await sovereignSeasV5Contract.write.registerModule(['treasury', treasuryModuleAddress])
      console.log('✅ Treasury module registered')
      
      await sovereignSeasV5Contract.write.registerModule(['migration', migrationModuleAddress])
      console.log('✅ Migration module registered')
      
      console.log('✅ All modules registered successfully')
      
    } catch (error) {
      console.log('❌ Module registration failed:', error)
      console.log('💡 This usually means you don\'t have ADMIN_ROLE')
      throw error
    }

    // 9. Set up method routing
    console.log('\n9️⃣ Setting up method routing...')
    
    // Calculate method selectors for key functions
    const getProjectCountSelector = '0x' + 'getProjectCount()'.slice(0, 10)
    const getCampaignCountSelector = '0x' + 'getCampaignCount()'.slice(0, 10)
    const createProjectSelector = '0x' + 'createProject(string,string,string,string,string,address[],bool)'.slice(0, 10)
    const createCampaignSelector = '0x' + 'createCampaign(string,string,string,string,uint256,uint256,uint256,uint256,bool,bool,string,address,address)'.slice(0, 10)
    
    // Register method routes
    await sovereignSeasV5Contract.write.registerMethodRoute([getProjectCountSelector, projectsModuleAddress])
    await sovereignSeasV5Contract.write.registerMethodRoute([getCampaignCountSelector, campaignsModuleAddress])
    await sovereignSeasV5Contract.write.registerMethodRoute([createProjectSelector, projectsModuleAddress])
    await sovereignSeasV5Contract.write.registerMethodRoute([createCampaignSelector, campaignsModuleAddress])
    
    console.log('✅ Method routing configured')

    // 10. Verify roles are set correctly
    console.log('\n🔍 Verifying role assignments...')
    
    const ADMIN_ROLE = await sovereignSeasV5Contract.read.ADMIN_ROLE([])
    const MANAGER_ROLE = await sovereignSeasV5Contract.read.MANAGER_ROLE([])
    const OPERATOR_ROLE = await sovereignSeasV5Contract.read.OPERATOR_ROLE([])
    const EMERGENCY_ROLE = await sovereignSeasV5Contract.read.EMERGENCY_ROLE([])
    
    console.log('🔑 ADMIN_ROLE:', ADMIN_ROLE)
    console.log('🔑 MANAGER_ROLE:', MANAGER_ROLE)
    console.log('🔑 OPERATOR_ROLE:', OPERATOR_ROLE)
    console.log('🔑 EMERGENCY_ROLE:', EMERGENCY_ROLE)
    
    // Verify deployer has all roles
    const hasAdminRole = await sovereignSeasV5Contract.read.hasRole([ADMIN_ROLE, account.address])
    const hasManagerRole = await sovereignSeasV5Contract.read.hasRole([MANAGER_ROLE, account.address])
    const hasOperatorRole = await sovereignSeasV5Contract.read.hasRole([OPERATOR_ROLE, account.address])
    const hasEmergencyRole = await sovereignSeasV5Contract.read.hasRole([EMERGENCY_ROLE, account.address])
    
    console.log('👤 Deployer has ADMIN_ROLE:', hasAdminRole)
    console.log('👤 Deployer has MANAGER_ROLE:', hasManagerRole)
    console.log('👤 Deployer has OPERATOR_ROLE:', hasOperatorRole)
    console.log('👤 Deployer has EMERGENCY_ROLE:', hasEmergencyRole)

    // 11. Test module registration
    console.log('\n🔍 Testing module registration...')
    try {
      const modulesResult = await sovereignSeasV5Contract.read.getAllModules([]) as [string[], `0x${string}`[]]
      const moduleNames = modulesResult[0]
      const moduleAddresses = modulesResult[1]
      
      console.log('✅ Module registration verified:')
      for (let i = 0; i < moduleNames.length; i++) {
        console.log(`  🔗 ${moduleNames[i]}: ${moduleAddresses[i]}`)
      }
    } catch (error) {
      console.log('❌ Module registration verification failed:', error)
    }

    console.log('\n🎉 Deployment completed successfully!')
    console.log('\n📋 Contract Addresses:')
    console.log('ProjectsModule:', projectsModuleAddress)
    console.log('CampaignsModule:', campaignsModuleAddress)
    console.log('VotingModule:', votingModuleAddress)
    console.log('TreasuryModule:', treasuryModuleAddress)
    console.log('MigrationModule:', migrationModuleAddress)
    console.log('SovereignSeasV5:', sovereignSeasV5Address)
    
    console.log('\n🔗 Proxy Contract Features:')
    console.log('- All V4/V6 functions are accessible through the proxy')
    console.log('- Functions are automatically routed to appropriate modules')
    console.log('- Circuit breaker and emergency functions are centralized')
    console.log('- UUPS upgradeable architecture maintained')
    console.log('- Enhanced quadratic voting with voter diversity bonuses')
    console.log('- Preview distribution functionality')
    console.log('- Configurable slippage tolerance and fees')
    
    console.log('\n📊 Architecture Benefits:')
    console.log('- Modular design with focused responsibilities')
    console.log('- Easier maintenance and debugging')
    console.log('- Smaller attack surface per contract')
    console.log('- Teams can work on different modules independently')
    console.log('- Gas efficient deployment and upgrades')
    console.log('- Enhanced security without bypass codes')
    
    console.log('\n🚀 Next Steps:')
    console.log('1. Verify contracts on block explorer')
    console.log('2. Test advanced features (quadratic voting, preview distribution)')
    console.log('3. Configure treasury parameters (fees, slippage tolerance)')
    console.log('4. Set up bridge and tipping integrations if needed')
    
    // Save deployment info to file
    saveDeployment({
      projectsModule: projectsModuleAddress,
      campaignsModule: campaignsModuleAddress,
      votingModule: votingModuleAddress,
      treasuryModule: treasuryModuleAddress,
      migrationModule: migrationModuleAddress,
      sovereignSeasV5: sovereignSeasV5Address
    })

  } catch (error) {
    console.error('❌ Deployment failed:', error)
    process.exit(1)
  }
}

deployV5Proxy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
