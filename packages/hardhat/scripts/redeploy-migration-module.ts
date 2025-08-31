import { ethers, upgrades } from "hardhat";
import { config } from "dotenv";
import { readFileSync, writeFileSync } from 'fs';

config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log('🚀 Redeploying Migration Module with Fixed Roles');
  console.log('===============================================');
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
  
  console.log(`🔗 V5 Proxy: ${contracts.sovereignSeasV5}`);
  console.log(`🔗 Old Migration Module: ${contracts.migrationModule}`);
  
  try {
    const sovereignSeasV5 = await ethers.getContractAt("SovereignSeasV5", contracts.sovereignSeasV5);
    
    // Deploy new migration module
    console.log('\n1️⃣ Deploying new MigrationModule...');
    const MigrationModule = await ethers.getContractFactory("MigrationModule");
    const newMigrationModule = await MigrationModule.deploy();
    await newMigrationModule.waitForDeployment();
    const newMigrationModuleAddress = await newMigrationModule.getAddress();
    
    console.log('✅ New MigrationModule deployed to:', newMigrationModuleAddress);
    
    // Upgrade the module in V5 proxy
    console.log('\n2️⃣ Upgrading migration module in V5 proxy...');
    const tx = await sovereignSeasV5.upgradeModule("migration", newMigrationModuleAddress);
    await tx.wait();
    console.log('✅ Migration module upgraded successfully!');
    
    // Update deployment file
    const updatedDeployment = {
      ...deployment,
      contracts: {
        ...deployment.contracts,
        migrationModule: newMigrationModuleAddress
      }
    };
    
    const newDeploymentFile = `deployment-alfajores-${Date.now()}.json`;
    writeFileSync(newDeploymentFile, JSON.stringify(updatedDeployment, null, 2));
    console.log(`💾 Updated deployment saved to: ${newDeploymentFile}`);
    
    // Verify the new module has proper roles
    console.log('\n3️⃣ Verifying new migration module roles...');
    const newMigrationModuleInstance = await ethers.getContractAt("MigrationModule", newMigrationModuleAddress);
    
    const ADMIN_ROLE = await newMigrationModuleInstance.ADMIN_ROLE();
    const hasAdminRole = await newMigrationModuleInstance.hasRole(ADMIN_ROLE, deployer.address);
    console.log(`   Has ADMIN_ROLE: ${hasAdminRole ? '✅ YES' : '❌ NO'}`);
    
    if (hasAdminRole) {
      console.log('\n🎉 New migration module is properly configured!');
      console.log('💡 You can now run the migration script');
      console.log('   Run: npm run migrate:v4-to-v5');
    } else {
      console.log('\n⚠️  New migration module still has role issues');
      console.log('   This suggests a deeper problem with the initialization');
    }
    
    console.log('\n📋 Summary:');
    console.log(`   🌐 Network: alfajores`);
    console.log(`   🔗 New Migration Module: ${newMigrationModuleAddress}`);
    console.log(`   🔗 V5 Proxy: ${contracts.sovereignSeasV5}`);
    console.log(`   💾 Deployment File: ${newDeploymentFile}`);
    
  } catch (error) {
    console.log('❌ Error redeploying migration module:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
