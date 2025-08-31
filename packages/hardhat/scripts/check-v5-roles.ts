import { ethers } from "hardhat";
import { config } from "dotenv";

config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log('🔍 Checking V5 Proxy Roles and Permissions');
  console.log('==========================================');
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
  
  if (!contracts.sovereignSeasV5) {
    console.log('❌ V5 proxy not found in deployment');
    return;
  }
  
  console.log(`🔗 V5 Proxy: ${contracts.sovereignSeasV5}`);
  
  try {
    const sovereignSeasV5 = await ethers.getContractAt("SovereignSeasV5", contracts.sovereignSeasV5);
    
    // Check roles
    console.log('\n🔑 Checking V5 Proxy Roles...');
    
    const ADMIN_ROLE = await sovereignSeasV5.ADMIN_ROLE();
    const MANAGER_ROLE = await sovereignSeasV5.MANAGER_ROLE();
    const OPERATOR_ROLE = await sovereignSeasV5.OPERATOR_ROLE();
    const EMERGENCY_ROLE = await sovereignSeasV5.EMERGENCY_ROLE();
    
    console.log(`   ADMIN_ROLE: ${ADMIN_ROLE}`);
    console.log(`   MANAGER_ROLE: ${MANAGER_ROLE}`);
    console.log(`   OPERATOR_ROLE: ${OPERATOR_ROLE}`);
    console.log(`   EMERGENCY_ROLE: ${EMERGENCY_ROLE}`);
    
    // Check if deployer has roles
    console.log('\n👤 Checking Deployer Permissions on V5...');
    
    const hasAdminRole = await sovereignSeasV5.hasRole(ADMIN_ROLE, deployer.address);
    const hasManagerRole = await sovereignSeasV5.hasRole(MANAGER_ROLE, deployer.address);
    const hasOperatorRole = await sovereignSeasV5.hasRole(OPERATOR_ROLE, deployer.address);
    const hasEmergencyRole = await sovereignSeasV5.hasRole(EMERGENCY_ROLE, deployer.address);
    
    console.log(`   Has ADMIN_ROLE: ${hasAdminRole ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has MANAGER_ROLE: ${hasManagerRole ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has OPERATOR_ROLE: ${hasOperatorRole ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has EMERGENCY_ROLE: ${hasEmergencyRole ? '✅ YES' : '❌ NO'}`);
    
    // Check who has DEFAULT_ADMIN_ROLE
    try {
      const DEFAULT_ADMIN_ROLE = await sovereignSeasV5.DEFAULT_ADMIN_ROLE();
      const hasDefaultAdminRole = await sovereignSeasV5.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
      console.log(`   Has DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRole ? '✅ YES' : '❌ NO'}`);
      
      if (hasDefaultAdminRole) {
        console.log('✅ You have DEFAULT_ADMIN_ROLE on V5 - you can grant roles to modules');
      }
    } catch (error) {
      console.log('⚠️  Could not check DEFAULT_ADMIN_ROLE');
    }
    
    // Check if we can grant roles to the migration module
    if (hasAdminRole) {
      console.log('\n💡 Solution: Grant roles to the migration module');
      console.log('   You can call: migrationModule.grantRole(ADMIN_ROLE, your_address)');
      
      // Try to grant the role directly
      console.log('\n🔄 Attempting to grant ADMIN_ROLE to migration module...');
      try {
        const migrationModule = await ethers.getContractAt("MigrationModule", contracts.migrationModule);
        const ADMIN_ROLE_MIGRATION = await migrationModule.ADMIN_ROLE();
        
        const tx = await migrationModule.grantRole(ADMIN_ROLE_MIGRATION, deployer.address);
        await tx.wait();
        console.log('✅ Successfully granted ADMIN_ROLE to yourself on migration module!');
        
      } catch (error) {
        console.log('❌ Failed to grant role:', error.message);
        console.log('💡 You may need to call this from the V5 proxy instead');
      }
    } else {
      console.log('\n❌ You have no admin roles on V5 proxy');
      console.log('   This is a deeper issue - the deployment may not have set up roles correctly');
    }
    
  } catch (error) {
    console.log('❌ Error checking V5 proxy:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
