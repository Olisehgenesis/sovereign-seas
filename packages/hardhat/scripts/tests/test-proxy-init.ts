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

async function testProxyModuleInitialization() {
  console.log('🧪 Testing Proxy-Based Module Initialization');
  console.log('============================================');

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

  // Create proxy contract interface with new functions
  const proxyContract = new ethers.Contract(
    deployment.contracts.SovereignSeasV5,
    [
      'function initializeModule(string _moduleId, bytes _data) external returns (bool)',
      'function initializeModulesBatch(string[] _moduleIds, bytes[] _dataArray) external returns (bool[])',
      'function isModuleRegistered(string _moduleId) external view returns (bool)',
      'function getModuleAddress(string _moduleId) external view returns (address)',
      'function getRegisteredModules() external view returns (string[])',
      'function hasRole(bytes32 role, address account) external view returns (bool)',
      'function ADMIN_ROLE() external view returns (bytes32)'
    ],
    wallet
  );

  // Check if deployer has admin role
  try {
    const adminRole = await proxyContract.ADMIN_ROLE();
    const hasAdminRole = await proxyContract.hasRole(adminRole, wallet.address);
    console.log(`🔐 Admin role check: ${hasAdminRole ? '✅' : '❌'}`);
    
    if (!hasAdminRole) {
      console.log('❌ Deployer does not have admin role. Cannot test initialization.');
      return;
    }
  } catch (error: any) {
    console.log(`⚠️  Could not verify admin role: ${error.message}`);
  }

  // Get registered modules
  try {
    const registeredModules = await proxyContract.getRegisteredModules();
    console.log(`📋 Registered modules: ${registeredModules.join(', ')}`);
    
    if (registeredModules.length === 0) {
      console.log('❌ No modules registered. Please register modules first.');
      return;
    }
  } catch (error: any) {
    console.log(`❌ Failed to get registered modules: ${error.message}`);
    return;
  }

  // Test single module initialization
  console.log('\n🧪 Testing Single Module Initialization...');
  console.log('==========================================');
  
  const testModuleId = 'projects';
  const isRegistered = await proxyContract.isModuleRegistered(testModuleId);
  
  if (!isRegistered) {
    console.log(`❌ Module ${testModuleId} is not registered`);
    return;
  }
  
  try {
    console.log(`🔧 Initializing module: ${testModuleId}`);
    const tx = await proxyContract.initializeModule(testModuleId, '0x');
    console.log(`📝 Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Initialization successful! Gas used: ${receipt.gasUsed.toString()}`);
    
  } catch (error: any) {
    if (error.message.includes('already initialized')) {
      console.log(`✅ Module ${testModuleId} is already initialized`);
    } else {
      console.log(`❌ Initialization failed: ${error.message}`);
    }
  }

  // Test batch initialization
  console.log('\n🧪 Testing Batch Module Initialization...');
  console.log('==========================================');
  
  try {
    const moduleIds = ['projects', 'campaigns', 'voting', 'treasury', 'pools', 'migration'];
    const registeredModuleIds = moduleIds.filter(id => 
      registeredModules.includes(id)
    );
    
    if (registeredModuleIds.length === 0) {
      console.log('❌ No registered modules to test batch initialization');
      return;
    }
    
    console.log(`🚀 Testing batch initialization for: ${registeredModuleIds.join(', ')}`);
    
    const initDataArray = new Array(registeredModuleIds.length).fill('0x');
    const tx = await proxyContract.initializeModulesBatch(registeredModuleIds, initDataArray);
    console.log(`📝 Batch transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Batch initialization completed! Gas used: ${receipt.gasUsed.toString()}`);
    
    // Get results
    const results = await proxyContract.initializeModulesBatch(registeredModuleIds, initDataArray);
    console.log('\n📊 Batch Initialization Results:');
    for (let i = 0; i < registeredModuleIds.length; i++) {
      const status = results[i] ? '✅' : '❌';
      console.log(`   ${status} ${registeredModuleIds[i]}: ${results[i] ? 'Success' : 'Failed'}`);
    }
    
  } catch (error: any) {
    console.log(`❌ Batch initialization failed: ${error.message}`);
  }

  console.log('\n🎉 Proxy-based module initialization test completed!');
}

testProxyModuleInitialization().catch(console.error);
