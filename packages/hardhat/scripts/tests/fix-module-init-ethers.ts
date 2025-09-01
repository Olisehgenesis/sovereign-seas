import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

interface Deployment {
  contracts: {
    [key: string]: string;
  };
}

async function fixModuleInitializationWithEthers() {
  console.log('🔧 Fixing Module Initialization with Ethers');
  console.log('===========================================');

  // Load deployment info
  const deploymentPath = join(process.cwd(), 'deployments/alfajores/latest.json');
  const deployment: Deployment = JSON.parse(readFileSync(deploymentPath, 'utf8'));

  // Setup provider and wallet
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log('❌ PRIVATE_KEY not found in .env');
    return;
  }

  const rpcUrl = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
  console.log(`📡 Using RPC: ${rpcUrl}`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log(`👤 Deployer: ${wallet.address}`);
  console.log(`🏗️  Main Contract: ${deployment.contracts.SovereignSeasV5}`);

  // Check deployer balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} CELO`);

  // Create proxy contract interface
  const proxyContract = new ethers.Contract(
    deployment.contracts.sovereignSeasV5,
    [
      'function initializeModule(string _moduleId, bytes _data) external returns (bool)',
      'function initializeModulesBatch(string[] _moduleIds, bytes[] _dataArray) external returns (bool[])',
      'function isModuleRegistered(string _moduleId) external view returns (bool)',
      'function getModuleAddress(string _moduleId) external view returns (address)',
      'function getRegisteredModules() external view returns (string[])'
    ],
    wallet
  );

  // Define modules to initialize
  const modules = [
    { id: 'projects', name: 'ProjectsModule', address: deployment.contracts.projectsModule },
    { id: 'campaigns', name: 'CampaignsModule', address: deployment.contracts.campaignsModule },
    { id: 'voting', name: 'VotingModule', address: deployment.contracts.votingModule },
    { id: 'treasury', name: 'TreasuryModule', address: deployment.contracts.treasuryModule },
    { id: 'pools', name: 'PoolsModule', address: deployment.contracts.poolsModule },
    { id: 'migration', name: 'MigrationModule', address: deployment.contracts.migrationModule }
  ];

  console.log('\n🔧 Initializing Modules through Proxy:');
  console.log('=====================================');

  // Check which modules are registered
  const registeredModules = await proxyContract.getRegisteredModules();
  console.log(`📋 Currently registered modules: ${registeredModules.join(', ')}`);

  // Filter modules that are registered
  const modulesToInitialize = modules.filter(module => 
    registeredModules.includes(module.id)
  );

  if (modulesToInitialize.length === 0) {
    console.log('❌ No modules are registered with the proxy. Please register modules first.');
    return;
  }

  console.log(`\n🎯 Modules to initialize: ${modulesToInitialize.map(m => m.name).join(', ')}`);

  // Try batch initialization first
  try {
    console.log('\n🚀 Attempting batch initialization...');
    
    const moduleIds = modulesToInitialize.map(m => m.id);
    const initDataArray = new Array(moduleIds.length).fill('0x'); // Empty data for all modules
    
    const tx = await proxyContract.initializeModulesBatch(moduleIds, initDataArray);
    console.log(`📝 Batch initialization transaction hash: ${tx.hash}`);
    
    // Wait for transaction
    const receipt = await tx.wait();
    console.log(`✅ Batch initialization completed!`);
    console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
    
    // Get results
    const results = await proxyContract.initializeModulesBatch(moduleIds, initDataArray);
    console.log('\n📊 Batch Initialization Results:');
    for (let i = 0; i < moduleIds.length; i++) {
      const status = results[i] ? '✅' : '❌';
      console.log(`   ${status} ${modulesToInitialize[i].name}: ${results[i] ? 'Success' : 'Failed'}`);
    }
    
  } catch (error: any) {
    console.log(`⚠️  Batch initialization failed: ${error.message}`);
    console.log('🔄 Falling back to individual initialization...');
    
    // Fallback to individual initialization
    for (const module of modulesToInitialize) {
      console.log(`\n📝 ${module.name}:`);
      console.log(`   Address: ${module.address}`);

      try {
        console.log(`   ⏳ Initializing through proxy...`);

        // Call initialize through the proxy
        const tx = await proxyContract.initializeModule(module.id, '0x');
        console.log(`   📝 Transaction hash: ${tx.hash}`);
        
        // Wait for transaction
        const receipt = await tx.wait();
        console.log(`   ✅ Initialized successfully!`);
        console.log(`   📊 Gas used: ${receipt.gasUsed.toString()}`);

      } catch (error: any) {
        if (error.message.includes('already initialized') || 
            error.message.includes('Initializable') ||
            error.message.includes('initialized')) {
          console.log(`   ✅ Already initialized`);
        } else {
          console.log(`   ❌ Failed: ${error.message}`);
        }
      }
    }
  }

  console.log('\n🎉 Module initialization completed!');
  
  // Final verification
  console.log('\n🔍 Final Verification:');
  console.log('=====================');
  
  for (const module of modulesToInitialize) {
    try {
      const isRegistered = await proxyContract.isModuleRegistered(module.id);
      const address = await proxyContract.getModuleAddress(module.id);
      
      if (isRegistered && address === module.address) {
        console.log(`   ✅ ${module.name}: Registered and address matches`);
      } else {
        console.log(`   ⚠️  ${module.name}: Registration issue`);
      }
    } catch (error: any) {
      console.log(`   ❌ ${module.name}: Verification failed - ${error.message}`);
    }
  }
}

fixModuleInitializationWithEthers().catch(console.error);
