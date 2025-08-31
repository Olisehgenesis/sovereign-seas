import { ethers, upgrades } from "hardhat";
import { config } from "dotenv";
import { readFileSync, writeFileSync } from 'fs';

config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log('🚀 Upgrading V5 Proxy with Fixed Module Initialization');
  console.log('======================================================');
  console.log(`👤 Deployer: ${deployer.address}`);
  
  // Load existing deployment
  const files = require('fs').readdirSync('.').filter((f: string) => f.startsWith(`deployment-alfajores-`) && f.endsWith('.json'));
  if (files.length === 0) {
    console.log('❌ No deployment found');
    return;
  }
  
  const latestFile = files.sort().pop();
  const deployment = JSON.parse(readFileSync(latestFile, 'utf8'));
  const contracts = deployment.contracts || {};
  
  if (!contracts.sovereignSeasV5) {
    console.log('❌ V5 proxy not found in deployment');
    return;
  }
  
  console.log(`🔗 Current V5 Proxy: ${contracts.sovereignSeasV5}`);
  
  try {
    // Get the current implementation address
    const currentImplementation = await upgrades.erc1967.getImplementationAddress(contracts.sovereignSeasV5);
    console.log(`🔧 Current Implementation: ${currentImplementation}`);
    
    // Upgrade the proxy to the new implementation
    console.log('\n1️⃣ Upgrading V5 proxy implementation...');
    const SovereignSeasV5 = await ethers.getContractFactory("SovereignSeasV5");
    const upgradedProxy = await upgrades.upgradeProxy(contracts.sovereignSeasV5, SovereignSeasV5);
    await upgradedProxy.waitForDeployment();
    
    console.log('✅ V5 proxy upgraded successfully!');
    
    // Get the new implementation address
    const newImplementation = await upgrades.erc1967.getImplementationAddress(contracts.sovereignSeasV5);
    console.log(`🔧 New Implementation: ${newImplementation}`);
    
    // Now let's test the fixed module initialization by upgrading the migration module
    console.log('\n2️⃣ Testing fixed module initialization with migration module...');
    
    // First, let's deregister the current migration module
    const sovereignSeasV5 = await ethers.getContractAt("SovereignSeasV5", contracts.sovereignSeasV5);
    console.log('   Deregistering current migration module...');
    const deregisterTx = await sovereignSeasV5.deregisterModule("migration");
    await deregisterTx.wait();
    console.log('   ✅ Migration module deregistered');
    
    // Now redeploy the migration module
    console.log('   Deploying new migration module...');
    const MigrationModule = await ethers.getContractFactory("MigrationModule");
    const newMigrationModule = await MigrationModule.deploy();
    await newMigrationModule.waitForDeployment();
    const newMigrationModuleAddress = await newMigrationModule.getAddress();
    console.log('   ✅ New migration module deployed to:', newMigrationModuleAddress);
    
    // Register it with the fixed V5 proxy
    console.log('   Registering new migration module with fixed V5 proxy...');
    const registerTx = await sovereignSeasV5.registerModule("migration", newMigrationModuleAddress);
    await registerTx.wait();
    console.log('   ✅ Migration module registered with fixed V5 proxy');
    
    // Check if the roles are now properly set
    console.log('\n3️⃣ Verifying fixed module initialization...');
    const newMigrationModuleInstance = await ethers.getContractAt("MigrationModule", newMigrationModuleAddress);
    
    const ADMIN_ROLE = await newMigrationModuleInstance.ADMIN_ROLE();
    const hasAdminRole = await newMigrationModuleInstance.hasRole(ADMIN_ROLE, deployer.address);
    console.log(`   Deployer has ADMIN_ROLE: ${hasAdminRole ? '✅ YES' : '❌ NO'}`);
    
    // Check if the proxy also has admin role
    const proxyHasAdminRole = await newMigrationModuleInstance.hasRole(ADMIN_ROLE, contracts.sovereignSeasV5);
    console.log(`   V5 Proxy has ADMIN_ROLE: ${proxyHasAdminRole ? '✅ YES' : '❌ NO'}`);
    
    if (hasAdminRole) {
      console.log('\n🎉 Module initialization is now fixed!');
      console.log('💡 Both you and the V5 proxy have admin roles');
      console.log('💡 You can now run the migration script');
      console.log('   Run: npm run migrate:v4-to-v5');
    } else {
      console.log('\n⚠️  Module initialization still has issues');
      console.log('   This suggests the fix didn\'t work as expected');
    }
    
    // Update deployment file
    const updatedDeployment = {
      ...deployment,
      contracts: {
        ...deployment.contracts,
        migrationModule: newMigrationModuleAddress,
        implementation: newImplementation
      }
    };
    
    const newDeploymentFile = `deployment-alfajores-${Date.now()}.json`;
    writeFileSync(newDeploymentFile, JSON.stringify(updatedDeployment, null, 2));
    console.log(`\n💾 Updated deployment saved to: ${newDeploymentFile}`);
    
    console.log('\n📋 Summary:');
    console.log(`   🌐 Network: alfajores`);
    console.log(`   🔗 V5 Proxy: ${contracts.sovereignSeasV5}`);
    console.log(`   🔧 New Implementation: ${newImplementation}`);
    console.log(`   🔗 New Migration Module: ${newMigrationModuleAddress}`);
    console.log(`   💾 Deployment File: ${newDeploymentFile}`);
    
  } catch (error) {
    console.log('❌ Error upgrading V5 proxy:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
