import { ethers } from "hardhat";
import { config } from "dotenv";

config();

// Configuration
const NETWORK = process.argv[2] || 'alfajores';
const V4_CONTRACT_ADDRESS = "0x1F3c0902e2c05D53Af2Cd00bd3F0a62EC4000942";

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

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log('🔍 SovereignSeas V4 to V5 Migration Status Check');
  console.log('================================================');
  console.log(`🌐 Network: ${currentNetwork.name}`);
  console.log(`📍 Network ID: ${NETWORK}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`🔗 V4 Contract: ${V4_CONTRACT_ADDRESS}`);
  
  // Check if V5 is deployed
  console.log('\n📊 Checking V5 deployment status...');
  
  try {
    // Try to find deployment file
    const files = require('fs').readdirSync('.').filter((f: string) => f.startsWith(`deployment-${NETWORK}-`) && f.endsWith('.json'));
    if (files.length === 0) {
      console.log('❌ No V5 deployment found for this network');
      console.log('💡 Deploy V5 first using: npm run deploy:v5');
      return;
    }
    
    const latestFile = files.sort().pop();
    const deployment = JSON.parse(require('fs').readFileSync(latestFile, 'utf8'));
    const contracts = deployment.contracts || {};
    
    console.log('✅ V5 deployment found!');
    console.log('\n📋 Deployed Contracts:');
    Object.entries(contracts).forEach(([name, address]) => {
      console.log(`   ${name}: ${address}`);
    });
    
    if (!contracts.sovereignSeasV5 || !contracts.migrationModule) {
      console.log('\n❌ Missing required contracts for migration');
      console.log('💡 Make sure both SovereignSeasV5 and MigrationModule are deployed');
      return;
    }
    
    // Check V4 contract accessibility
    console.log('\n🔍 Checking V4 contract accessibility...');
    try {
      const v4Contract = await ethers.getContractAt("contracts/interfaces/ISovereignSeasV4.sol:ISovereignSeasV4", V4_CONTRACT_ADDRESS);
      
      const projectCount = await v4Contract.nextProjectId();
      const campaignCount = await v4Contract.nextCampaignId();
      const supportedTokens = await v4Contract.getSupportedTokens();
      
      console.log('✅ V4 contract is accessible!');
      console.log(`   📊 Projects: ${projectCount.toString()}`);
      console.log(`   📊 Campaigns: ${campaignCount.toString()}`);
      console.log(`   📊 Supported Tokens: ${supportedTokens.length}`);
      
    } catch (error) {
      console.log('❌ V4 contract not accessible:', error.message);
      console.log('💡 Check if the V4 contract address is correct and accessible');
      return;
    }
    
    // Check migration module status
    console.log('\n🔍 Checking migration module status...');
    try {
      const migrationModule = await ethers.getContractAt("MigrationModule", contracts.migrationModule);
      
      // Check if V4 address is set
      const v4Address = await migrationModule.v4Contract();
      if (v4Address === ethers.ZeroAddress) {
        console.log('❌ V4 contract address not set in migration module');
        console.log('💡 Run migration script to set V4 address: npm run migrate:v4-to-v5');
      } else if (v4Address === V4_CONTRACT_ADDRESS) {
        console.log('✅ V4 contract address is set correctly');
      } else {
        console.log('⚠️  V4 contract address mismatch');
        console.log(`   Expected: ${V4_CONTRACT_ADDRESS}`);
        console.log(`   Set: ${v4Address}`);
      }
      
      // Get migration data
      try {
        const migrationData = await migrationModule.getV4MigrationData();
        console.log('\n📊 V4 Migration Data:');
        console.log(`   📊 V4 Projects: ${migrationData.projectCount.toString()}`);
        console.log(`   📊 V4 Campaigns: ${migrationData.campaignCount.toString()}`);
        console.log(`   📊 Total Votes: ${migrationData.totalVotes.toString()}`);
        console.log(`   📊 Total Fees: ${ethers.formatEther(migrationData.totalFees)} CELO`);
        console.log(`   📊 Supported Tokens: ${migrationData.supportedTokensCount.toString()}`);
        console.log(`   📊 Migration Complete: ${migrationData.isComplete ? 'Yes' : 'No'}`);
        
        if (migrationData.isComplete) {
          console.log('\n🎉 Migration is complete! All V4 data has been migrated to V5.');
        } else {
          console.log('\n⏳ Migration is not complete. Some data still needs to be migrated.');
        }
        
      } catch (error) {
        console.log('⚠️  Could not get migration data (module may not be fully initialized)');
      }
      
      // Get detailed migration progress
      try {
        const progress = await migrationModule.getMigrationProgress();
        console.log('\n📊 Detailed Migration Progress:');
        console.log(`   🔧 Core Config: ${progress.coreConfigCompleted ? '✅' : '❌'}`);
        console.log(`   🪙 Supported Tokens: ${progress.supportedTokensCompleted ? '✅' : '❌'}`);
        console.log(`   🔄 Exchange Providers: ${progress.exchangeProvidersCompleted ? '✅' : '❌'}`);
        console.log(`   📁 Projects: ${progress.projectsCompleted ? '✅' : '❌'}`);
        console.log(`   🎯 Campaigns: ${progress.campaignsCompleted ? '✅' : '❌'}`);
        console.log(`   🤝 Project Participations: ${progress.projectParticipationsCompleted ? '✅' : '❌'}`);
        console.log(`   🗳️  Votes: ${progress.votesCompleted ? '✅' : '❌'}`);
        console.log(`   💰 Fees & Treasury: ${progress.feesTreasuryCompleted ? '✅' : '❌'}`);
        
        // Count completed vs incomplete
        const completed = [
          progress.coreConfigCompleted,
          progress.supportedTokensCompleted,
          progress.exchangeProvidersCompleted,
          progress.projectsCompleted,
          progress.campaignsCompleted,
          progress.projectParticipationsCompleted,
          progress.votesCompleted,
          progress.feesTreasuryCompleted
        ].filter(Boolean).length;
        
        console.log(`\n📈 Overall Progress: ${completed}/8 steps completed`);
        
        if (completed === 8) {
          console.log('🎉 All migration steps are complete!');
        } else if (completed > 0) {
          console.log('⏳ Migration is partially complete. Run migration script to continue.');
        } else {
          console.log('🚀 Migration has not started. Run migration script to begin.');
        }
        
      } catch (error) {
        console.log('⚠️  Could not get detailed progress (module may not be fully initialized)');
      }
      
    } catch (error) {
      console.log('❌ Could not access migration module:', error.message);
      console.log('💡 Make sure the migration module is properly deployed and initialized');
      return;
    }
    
    // Check V5 functionality
    console.log('\n🔍 Checking V5 functionality...');
    try {
      const sovereignSeasV5 = await ethers.getContractAt("SovereignSeasV5", contracts.sovereignSeasV5);
      const projectsModule = await ethers.getContractAt("ProjectsModule", contracts.projectsModule);
      const campaignsModule = await ethers.getContractAt("CampaignsModule", contracts.campaignsModule);
      
      // Check V5 proxy functionality
      const contractVersion = await sovereignSeasV5.getContractVersion();
      const implementationVersion = await sovereignSeasV5.getImplementationVersion();
      const moduleCount = await sovereignSeasV5.getModuleCount();
      
      console.log('✅ V5 proxy system is functional!');
      console.log(`   📊 Contract version: ${contractVersion}`);
      console.log(`   📊 Implementation version: ${implementationVersion.toString()}`);
      console.log(`   📊 Module count: ${moduleCount.toString()}`);
      
      // Check module functionality
      try {
        const projectCount = await projectsModule.getProjectCount();
        const campaignCount = await campaignsModule.getCampaignCount();
        
        console.log('✅ V5 modules are functional!');
        console.log(`   📊 Project count: ${projectCount.toString()}`);
        console.log(`   📊 Campaign count: ${campaignCount.toString()}`);
        
      } catch (error) {
        console.log('⚠️  Module functions not available yet (may need migration):', error.message);
      }
      
    } catch (error) {
      console.log('❌ V5 system not functional:', error.message);
      console.log('💡 Check if V5 contract is properly deployed and initialized');
    }
    
  } catch (error) {
    console.log('❌ Error checking deployment status:', error.message);
    return;
  }
  
  console.log('\n📋 Available Commands:');
  console.log('   npm run migrate:v4-to-v5          - Start migration (testnet)');
  console.log('   npm run migrate:v4-to-v5:mainnet  - Start migration (mainnet)');
  console.log('   npm run check:network             - Check network configuration');
  console.log('   npm run check:verification        - Check verification status');
  
  if (currentNetwork.safe) {
    console.log('\n💡 You are on testnet - safe to run migration');
  } else {
    console.log('\n🚨 You are on mainnet - migration will affect real data!');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Status check failed:", error);
    process.exit(1);
  });
