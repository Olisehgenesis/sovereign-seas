import { ethers } from "hardhat";
import { config } from "dotenv";

config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log('🔧 Fixing Migration Module Roles (Version 2)');
  console.log('============================================');
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
    
    // Check if you have DEFAULT_ADMIN_ROLE on the migration module
    try {
      const DEFAULT_ADMIN_ROLE = await migrationModule.DEFAULT_ADMIN_ROLE();
      const hasDefaultAdminRole = await migrationModule.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
      console.log(`   Has DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRole ? '✅ YES' : '❌ NO'}`);
      
      if (hasDefaultAdminRole) {
        console.log('\n🔄 Using grantRolesToV5Admin function to fix roles...');
        
        try {
          const tx = await migrationModule.grantRolesToV5Admin(deployer.address);
          await tx.wait();
          console.log('✅ Successfully granted roles to yourself!');
          
          // Verify the roles were granted
          const hasAdminRoleAfter = await migrationModule.hasRole(ADMIN_ROLE, deployer.address);
          const hasMigratorRoleAfter = await migrationModule.hasRole(await migrationModule.MIGRATOR_ROLE(), deployer.address);
          const hasEmergencyRoleAfter = await migrationModule.hasRole(await migrationModule.EMERGENCY_ROLE(), deployer.address);
          
          console.log('\n📊 Role Status After Fix:');
          console.log(`   ADMIN_ROLE: ${hasAdminRoleAfter ? '✅ YES' : '❌ NO'}`);
          console.log(`   MIGRATOR_ROLE: ${hasMigratorRoleAfter ? '✅ YES' : '❌ NO'}`);
          console.log(`   EMERGENCY_ROLE: ${hasEmergencyRoleAfter ? '✅ YES' : '❌ NO'}`);
          
          if (hasAdminRoleAfter) {
            console.log('\n🎉 Migration module roles fixed! You can now run the migration.');
            console.log('💡 Run: npm run migrate:v4-to-v5');
          }
          
        } catch (error) {
          console.log('❌ Failed to grant roles:', error.message);
        }
        
      } else {
        console.log('\n❌ You don\'t have DEFAULT_ADMIN_ROLE on migration module either');
        console.log('💡 This suggests the module wasn\'t initialized properly');
        console.log('   We need to redeploy the migration module with proper initialization');
      }
      
    } catch (error) {
      console.log('❌ Could not check DEFAULT_ADMIN_ROLE:', error.message);
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
