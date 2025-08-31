import { ethers } from "hardhat";
import { config } from "dotenv";

config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log('🔧 Fixing Migration Module Roles');
  console.log('================================');
  console.log(`👤 Deployer: ${deployer.address}`);
  
  // Load deployment
  const files = require('fs').readdirSync('.').filter((f: string) => f.startsWith(`deployment-alfajores-`) && f.endsWith('.json'));
  if (files.length === 0) {
    console.log('❌ No deployment found');
    return;
  }
  
  const latestFile = files.sort().pop();
  const deployment = JSON.parse(require('fs').readFileSync(latestFile, 'utf8'));
  const contracts = deployment.contracts || {};
  
  if (!contracts.migrationModule || !contracts.sovereignSeasV5) {
    console.log('❌ Required contracts not found in deployment');
    return;
  }
  
  console.log(`🔗 Migration Module: ${contracts.migrationModule}`);
  console.log(`🔗 V5 Proxy: ${contracts.sovereignSeasV5}`);
  
  try {
    const sovereignSeasV5 = await ethers.getContractAt("SovereignSeasV5", contracts.sovereignSeasV5);
    const migrationModule = await ethers.getContractAt("MigrationModule", contracts.migrationModule);
    
    // Check current roles
    console.log('\n🔍 Checking current migration module roles...');
    const ADMIN_ROLE = await migrationModule.ADMIN_ROLE();
    const hasAdminRole = await migrationModule.hasRole(ADMIN_ROLE, deployer.address);
    console.log(`   Has ADMIN_ROLE: ${hasAdminRole ? '✅ YES' : '❌ NO'}`);
    
    if (hasAdminRole) {
      console.log('✅ You already have ADMIN_ROLE on migration module!');
      console.log('💡 You can now run the migration script');
      return;
    }
    
    // The issue is that the migration module needs to be re-initialized
    // Since you have DEFAULT_ADMIN_ROLE on V5, we can call the module's initialize function
    console.log('\n🔄 Attempting to re-initialize migration module...');
    
    try {
      // Call initialize on the migration module directly
      const tx = await migrationModule.initialize(deployer.address);
      await tx.wait();
      console.log('✅ Successfully re-initialized migration module!');
      
      // Verify the role was granted
      const hasAdminRoleAfter = await migrationModule.hasRole(ADMIN_ROLE, deployer.address);
      console.log(`   Has ADMIN_ROLE after init: ${hasAdminRoleAfter ? '✅ YES' : '❌ NO'}`);
      
      if (hasAdminRoleAfter) {
        console.log('\n🎉 Migration module roles fixed! You can now run the migration.');
        console.log('💡 Run: npm run migrate:v4-to-v5');
      }
      
    } catch (error) {
      console.log('❌ Failed to re-initialize migration module:', error.message);
      console.log('\n💡 Alternative solution: Redeploy the migration module');
      console.log('   This will ensure proper role initialization');
    }
    
  } catch (error) {
    console.log('❌ Error fixing migration module roles:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
