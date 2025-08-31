import { ethers } from "hardhat";
import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

config();

// Configuration
const NETWORK = process.argv[2] || 'alfajores'; // Default to testnet for safety
const V4_CONTRACT_ADDRESS = "0x1F3c0902e2c05D53Af2Cd00bd3F0a62EC4000942"; // SovereignSeas V4
const DEPLOYMENT_FILE = `deployment-${NETWORK}-${Date.now()}.json`;

// Network configuration
const NETWORK_CONFIG = {
  'alfajores': {
    name: 'Celo Alfajores Testnet',
    safe: true
  },
  'celo': {
    name: 'Celo Mainnet',
    safe: false
  },
  'baklava': {
    name: 'Celo Baklava Testnet',
    safe: true
  }
};

const currentNetwork = NETWORK_CONFIG[NETWORK] || NETWORK_CONFIG['alfajores'];

// Load existing deployment
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

// Save migration progress
function saveMigrationProgress(contracts: Record<string, string>, migrationData: any) {
  const deployment = {
    network: NETWORK,
    timestamp: new Date().toISOString(),
    contracts,
    migration: migrationData
  };
  writeFileSync(DEPLOYMENT_FILE, JSON.stringify(deployment, null, 2));
  console.log(`💾 Migration progress saved to: ${DEPLOYMENT_FILE}`);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log('🚀 SovereignSeas V4 to V5 Migration Script');
  console.log('==========================================');
  console.log(`🌐 Network: ${currentNetwork.name}`);
  console.log(`📍 Network ID: ${NETWORK}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`🔗 V4 Contract: ${V4_CONTRACT_ADDRESS}`);
  
  // Network safety check
  if (!currentNetwork.safe) {
    console.log('\n🚨 WARNING: You are migrating on MAINNET!');
    console.log('🚨 This will migrate real data and may have real consequences!');
    console.log('🚨 Make sure this is what you want!');
    console.log('\n⏰ Waiting 10 seconds before proceeding...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  } else {
    console.log('✅ Migrating on testnet - safe for testing');
  }
  
  // Load deployment
  const DEPLOYED_ADDRESSES = loadDeployment();
  
  if (!DEPLOYED_ADDRESSES.sovereignSeasV5) {
    console.log('\n❌ SovereignSeas V5 not deployed yet!');
    console.log('💡 Please deploy V5 first using: npm run deploy:v5');
    return;
  }
  
  console.log('\n📊 Current Deployment Status:');
  Object.entries(DEPLOYED_ADDRESSES).forEach(([contract, address]) => {
    console.log(`   ✅ ${contract}: ${address}`);
  });
  
  // Get contract instances
  const sovereignSeasV5 = await ethers.getContractAt("SovereignSeasV5", DEPLOYED_ADDRESSES.sovereignSeasV5);
  const migrationModule = await ethers.getContractAt("MigrationModule", DEPLOYED_ADDRESSES.migrationModule);
  
  // Verify V4 contract exists and is accessible
  console.log('\n🔍 Verifying V4 contract accessibility...');
  try {
    const v4Contract = await ethers.getContractAt("contracts/interfaces/ISovereignSeasV4.sol:ISovereignSeasV4", V4_CONTRACT_ADDRESS);
    
    // Test basic V4 contract functions
    const projectCount = await v4Contract.nextProjectId();
    const campaignCount = await v4Contract.nextCampaignId();
    const supportedTokens = await v4Contract.getSupportedTokens();
    
    console.log('✅ V4 contract is accessible!');
    console.log(`   📊 Projects: ${projectCount.toString()}`);
    console.log(`   📊 Campaigns: ${campaignCount.toString()}`);
    console.log(`   📊 Supported Tokens: ${supportedTokens.length}`);
    
    if (projectCount > 0) {
      console.log('\n📋 Sample V4 Project Data:');
      const project = await v4Contract.getProject(0);
      console.log(`   Project 0: ${project.name} (${project.description})`);
    }
    
    if (campaignCount > 0) {
      console.log('\n📋 Sample V4 Campaign Data:');
      const campaign = await v4Contract.getCampaign(0);
      console.log(`   Campaign 0: ${campaign.name} (${campaign.description})`);
    }
    
  } catch (error) {
    console.log('❌ Failed to access V4 contract:', error.message);
    console.log('💡 Make sure the V4 contract address is correct and accessible');
    return;
  }
  
  // Check current migration status
  console.log('\n📊 Current Migration Status:');
  try {
    const migrationData = await migrationModule.getV4MigrationData();
    console.log(`   📊 V4 Projects: ${migrationData.projectCount.toString()}`);
    console.log(`   📊 V4 Campaigns: ${migrationData.campaignCount.toString()}`);
    console.log(`   📊 Total Votes: ${migrationData.totalVotes.toString()}`);
    console.log(`   📊 Total Fees: ${ethers.formatEther(migrationData.totalFees)} CELO`);
    console.log(`   📊 Supported Tokens: ${migrationData.supportedTokensCount.toString()}`);
    console.log(`   📊 Migration Complete: ${migrationData.isComplete ? 'Yes' : 'No'}`);
  } catch (error) {
    console.log('   📊 Migration status unavailable (contract may not be initialized)');
  }
  
  // Step 1: Set V4 contract address in migration module
  console.log('\n1️⃣ Setting V4 contract address...');
  try {
    const tx = await migrationModule.setV4ContractAddress(V4_CONTRACT_ADDRESS);
    await tx.wait();
    console.log('✅ V4 contract address set successfully!');
  } catch (error) {
    console.log('❌ Failed to set V4 contract address:', error.message);
    return;
  }
  
  // Step 2: Verify V4 contract address was set
  console.log('\n2️⃣ Verifying V4 contract address...');
  try {
    const v4Address = await migrationModule.v4Contract();
    if (v4Address === V4_CONTRACT_ADDRESS) {
      console.log('✅ V4 contract address verified!');
    } else {
      console.log('❌ V4 contract address mismatch!');
      console.log(`   Expected: ${V4_CONTRACT_ADDRESS}`);
      console.log(`   Got: ${v4Address}`);
      return;
    }
  } catch (error) {
    console.log('❌ Failed to verify V4 contract address:', error.message);
    return;
  }
  
  // Step 3: Start migration process
  console.log('\n3️⃣ Starting migration process...');
  
  const migrationSteps = [
    { name: 'Core Configuration', function: 'migrateCoreConfiguration' },
    { name: 'Supported Tokens', function: 'migrateSupportedTokens' },
    { name: 'Exchange Providers', function: 'migrateTokenExchangeProviders' },
    { name: 'Projects', function: 'migrateProjects' },
    { name: 'Campaigns', function: 'migrateCampaigns' },
    { name: 'Project Participations', function: 'migrateProjectParticipations' },
    { name: 'Votes', function: 'migrateVotes' },
    { name: 'Fees & Treasury', function: 'migrateFeesAndTreasury' }
  ];
  
  let migrationProgress = {
    completed: 0,
    failed: 0,
    total: migrationSteps.length
  };
  
  for (const step of migrationSteps) {
    console.log(`\n🔄 Migrating ${step.name}...`);
    try {
      const tx = await migrationModule[step.function]();
      await tx.wait();
      console.log(`✅ ${step.name} migrated successfully!`);
      migrationProgress.completed++;
      
      // Save progress
      saveMigrationProgress(DEPLOYED_ADDRESSES, migrationProgress);
      
    } catch (error) {
      console.log(`❌ Failed to migrate ${step.name}:`, error.message);
      migrationProgress.failed++;
      
      // Save progress
      saveMigrationProgress(DEPLOYED_ADDRESSES, migrationProgress);
      
      // Continue with next step instead of failing completely
      console.log(`⚠️  Continuing with next migration step...`);
    }
  }
  
  // Step 4: Complete migration if all steps succeeded
  if (migrationProgress.failed === 0) {
    console.log('\n4️⃣ Completing migration...');
    try {
      const tx = await migrationModule.completeMigration();
      await tx.wait();
      console.log('✅ Migration completed successfully!');
    } catch (error) {
      console.log('❌ Failed to complete migration:', error.message);
      console.log('💡 Some migration steps may have failed');
    }
  } else {
    console.log('\n⚠️  Migration completed with some failures');
    console.log(`   ✅ Completed: ${migrationProgress.completed}`);
    console.log(`   ❌ Failed: ${migrationProgress.failed}`);
    console.log(`   📊 Total: ${migrationProgress.total}`);
  }
  
  // Step 5: Verify final migration status
  console.log('\n5️⃣ Verifying final migration status...');
  try {
    const finalMigrationData = await migrationModule.getV4MigrationData();
    const migrationProgress = await migrationModule.getMigrationProgress();
    
    console.log('\n📊 Final Migration Status:');
    console.log(`   📊 V4 Projects: ${finalMigrationData.projectCount.toString()}`);
    console.log(`   📊 V4 Campaigns: ${finalMigrationData.campaignCount.toString()}`);
    console.log(`   📊 Total Votes: ${finalMigrationData.totalVotes.toString()}`);
    console.log(`   📊 Total Fees: ${ethers.formatEther(finalMigrationData.totalFees)} CELO`);
    console.log(`   📊 Supported Tokens: ${finalMigrationData.supportedTokensCount.toString()}`);
    console.log(`   📊 Migration Complete: ${finalMigrationData.isComplete ? 'Yes' : 'No'}`);
    
    console.log('\n📊 Migration Progress Details:');
    console.log(`   🔧 Core Config: ${migrationProgress.coreConfigCompleted ? '✅' : '❌'}`);
    console.log(`   🪙 Supported Tokens: ${migrationProgress.supportedTokensCompleted ? '✅' : '❌'}`);
    console.log(`   🔄 Exchange Providers: ${migrationProgress.exchangeProvidersCompleted ? '✅' : '❌'}`);
    console.log(`   📁 Projects: ${migrationProgress.projectsCompleted ? '✅' : '❌'}`);
    console.log(`   🎯 Campaigns: ${migrationProgress.campaignsCompleted ? '✅' : '❌'}`);
    console.log(`   🤝 Project Participations: ${migrationProgress.projectParticipationsCompleted ? '✅' : '❌'}`);
    console.log(`   🗳️  Votes: ${migrationProgress.votesCompleted ? '✅' : '❌'}`);
    console.log(`   💰 Fees & Treasury: ${migrationProgress.feesTreasuryCompleted ? '✅' : '❌'}`);
    
  } catch (error) {
    console.log('❌ Failed to get final migration status:', error.message);
  }
  
  // Step 6: Test V5 functionality with migrated data
  console.log('\n6️⃣ Testing V5 functionality with migrated data...');
  try {
    const projectsModule = await ethers.getContractAt("ProjectsModule", DEPLOYED_ADDRESSES.projectsModule);
    const campaignsModule = await ethers.getContractAt("CampaignsModule", DEPLOYED_ADDRESSES.campaignsModule);
    
    // Check V5 proxy functionality
    const contractVersion = await sovereignSeasV5.getContractVersion();
    const implementationVersion = await sovereignSeasV5.getImplementationVersion();
    const moduleCount = await sovereignSeasV5.getModuleCount();
    
    console.log('✅ V5 proxy functionality test successful:');
    console.log(`   📊 Contract version: ${contractVersion}`);
    console.log(`   📊 Implementation version: ${implementationVersion.toString()}`);
    console.log(`   📊 Module count: ${moduleCount.toString()}`);
    
    // Check module functionality
    try {
      const projectCount = await projectsModule.getProjectCount();
      const campaignCount = await campaignsModule.getCampaignCount();
      
      console.log('✅ V5 modules functionality test successful:');
      console.log(`   📊 Project count: ${projectCount.toString()}`);
      console.log(`   📊 Campaign count: ${campaignCount.toString()}`);
      
    } catch (error) {
      console.log('⚠️  Module functions not available yet (may need migration):', error.message);
    }
    
  } catch (error) {
    console.log('❌ V5 functionality test failed:', error.message);
  }
  
  console.log('\n🎉 Migration script completed!');
  console.log('\n📋 Summary:');
  console.log(`   🌐 Network: ${currentNetwork.name}`);
  console.log(`   🔗 V4 Contract: ${V4_CONTRACT_ADDRESS}`);
  console.log(`   🔗 V5 Contract: ${DEPLOYED_ADDRESSES.sovereignSeasV5}`);
  console.log(`   📊 Migration Steps: ${migrationProgress.completed}/${migrationProgress.total} completed`);
  
  if (migrationProgress.failed > 0) {
    console.log('\n⚠️  Some migration steps failed. You may need to:');
    console.log('   1. Check the error messages above');
    console.log('   2. Verify V4 contract state');
    console.log('   3. Retry failed migration steps manually');
    console.log('   4. Contact support if issues persist');
  } else {
    console.log('\n✅ All migration steps completed successfully!');
    console.log('   Your V5 system is now ready with all V4 data migrated.');
  }
  
  console.log('\n💾 Migration progress saved to:', DEPLOYMENT_FILE);
  console.log('Use this file for verification and troubleshooting');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
