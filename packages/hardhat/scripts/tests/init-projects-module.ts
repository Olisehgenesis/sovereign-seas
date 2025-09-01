import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function initializeProjectsModule() {
  console.log('🔧 Initializing Projects Module');
  console.log('=====================================');

  // Load deployment info
  const deploymentPath = path.join(__dirname, '../../deployments/alfajores/latest.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  console.log(`📡 Using RPC: ${process.env.CELO_RPC_URL}`);
  console.log(`👤 Deployer: ${deployment.deployer}`);
  console.log(`🏗️  Main Contract: ${deployment.contracts.sovereignSeasV5}`);

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.CELO_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  // Check deployer balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} CELO`);

  // Create proxy contract interface
  const proxyContract = new ethers.Contract(
    deployment.contracts.sovereignSeasV5,
    [
      'function initializeModule(string _moduleId, bytes _data) external returns (bool)',
      'function isModuleRegistered(string _moduleId) external view returns (bool)',
      'function getModuleAddress(string _moduleId) external view returns (address)',
    ],
    wallet
  );

  // Create ProjectsModule contract interface
  const projectsModule = new ethers.Contract(
    deployment.contracts.projectsModule,
    [
      'function initialize(address _proxy, bytes calldata _data) external',
    ],
    wallet
  );

  try {
    console.log('\n🔍 Checking current status...');
    const isRegistered = await proxyContract.isModuleRegistered('projects');
    const moduleAddress = await proxyContract.getModuleAddress('projects');
    console.log(`📋 Projects module registered: ${isRegistered}`);
    console.log(`📍 Module address: ${moduleAddress}`);

    console.log('\n🚀 Attempting to initialize ProjectsModule directly...');
    
    // Try to initialize the ProjectsModule directly
    const initTx = await projectsModule.initialize(
      deployment.contracts.sovereignSeasV5,
      '0x' // Empty data
    );
    
    console.log(`📝 Initialization transaction: ${initTx.hash}`);
    const receipt = await initTx.wait();
    console.log(`✅ Initialization completed! Gas used: ${receipt.gasUsed}`);

    console.log('\n🔍 Verifying initialization...');
    const isRegisteredAfter = await proxyContract.isModuleRegistered('projects');
    const moduleAddressAfter = await proxyContract.getModuleAddress('projects');
    console.log(`📋 Projects module registered: ${isRegisteredAfter}`);
    console.log(`📍 Module address: ${moduleAddressAfter}`);

  } catch (error: any) {
    console.error('❌ Initialization failed:', error.message);
    
    // Try alternative approach - initialize through proxy
    console.log('\n🔄 Trying alternative approach through proxy...');
    try {
      const proxyInitTx = await proxyContract.initializeModule(
        'projects',
        '0x' // Empty data
      );
      
      console.log(`📝 Proxy initialization transaction: ${proxyInitTx.hash}`);
      const receipt = await proxyInitTx.wait();
      console.log(`✅ Proxy initialization completed! Gas used: ${receipt.gasUsed}`);
      
    } catch (proxyError: any) {
      console.error('❌ Proxy initialization also failed:', proxyError.message);
    }
  }
}

initializeProjectsModule().catch(console.error);
