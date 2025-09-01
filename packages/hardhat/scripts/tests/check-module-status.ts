import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function checkModuleStatus() {
  console.log('🔍 Checking Module Status');
  console.log('==========================');

  // Load deployment info
  const deploymentPath = path.join(__dirname, '../../deployments/alfajores/latest.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  console.log(`📡 Using RPC: ${process.env.CELO_RPC_URL}`);
  console.log(`👤 Deployer: ${deployment.deployer}`);
  console.log(`🏗️  Main Contract: ${deployment.contracts.sovereignSeasV5}`);

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.CELO_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  // Create ProjectsModule contract interface
  const projectsModule = new ethers.Contract(
    deployment.contracts.projectsModule,
    [
      'function moduleActive() external view returns (bool)',
      'function getProjectCount() external view returns (uint256)',
      'function feesEnabled() external view returns (bool)',
      'function creationFee() external view returns (uint256)',
    ],
    provider // Use provider for read-only calls
  );

  try {
    console.log('\n🔍 Checking ProjectsModule status...');
    
    // Try to read moduleActive
    try {
      const isActive = await projectsModule.moduleActive();
      console.log(`📋 Module active: ${isActive}`);
    } catch (error: any) {
      console.log(`❌ Cannot read moduleActive: ${error.message}`);
    }

    // Try to read project count
    try {
      const projectCount = await projectsModule.getProjectCount();
      console.log(`📊 Project count: ${projectCount}`);
    } catch (error: any) {
      console.log(`❌ Cannot read project count: ${error.message}`);
    }

    // Try to read fees
    try {
      const feesEnabled = await projectsModule.feesEnabled();
      const creationFee = await projectsModule.creationFee();
      console.log(`💰 Fees enabled: ${feesEnabled}`);
      console.log(`💵 Creation fee: ${ethers.formatEther(creationFee)} CELO`);
    } catch (error: any) {
      console.log(`❌ Cannot read fees: ${error.message}`);
    }

  } catch (error: any) {
    console.error('❌ Error checking module status:', error.message);
  }
}

checkModuleStatus().catch(console.error);
