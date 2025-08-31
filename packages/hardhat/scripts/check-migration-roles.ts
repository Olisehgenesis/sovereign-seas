import { ethers } from "hardhat";
import { config } from "dotenv";

config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log('🔍 Checking Migration Module Roles and Permissions');
  console.log('==================================================');
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
  
  if (!contracts.migrationModule) {
    console.log('❌ Migration module not found in deployment');
    return;
  }
  
  console.log(`🔗 Migration Module: ${contracts.migrationModule}`);
  
  try {
    const migrationModule = await ethers.getContractAt("MigrationModule", contracts.migrationModule);
    
    // Check roles
    console.log('\n🔑 Checking Roles...');
    
    const ADMIN_ROLE = await migrationModule.ADMIN_ROLE();
    const MIGRATOR_ROLE = await migrationModule.MIGRATOR_ROLE();
    const EMERGENCY_ROLE = await migrationModule.EMERGENCY_ROLE();
    
    console.log(`   ADMIN_ROLE: ${ADMIN_ROLE}`);
    console.log(`   MIGRATOR_ROLE: ${MIGRATOR_ROLE}`);
    console.log(`   EMERGENCY_ROLE: ${EMERGENCY_ROLE}`);
    
    // Check if deployer has roles
    console.log('\n👤 Checking Deployer Permissions...');
    
    const hasAdminRole = await migrationModule.hasRole(ADMIN_ROLE, deployer.address);
    const hasMigratorRole = await migrationModule.hasRole(MIGRATOR_ROLE, deployer.address);
    const hasEmergencyRole = await migrationModule.hasRole(EMERGENCY_ROLE, deployer.address);
    
    console.log(`   Has ADMIN_ROLE: ${hasAdminRole ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has MIGRATOR_ROLE: ${hasMigratorRole ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has EMERGENCY_ROLE: ${hasEmergencyRole ? '✅ YES' : '❌ NO'}`);
    
    // Check who has DEFAULT_ADMIN_ROLE
    try {
      const DEFAULT_ADMIN_ROLE = await migrationModule.DEFAULT_ADMIN_ROLE();
      const hasDefaultAdminRole = await migrationModule.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
      console.log(`   Has DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRole ? '✅ YES' : '❌ NO'}`);
      
      if (hasDefaultAdminRole) {
        console.log('✅ You have DEFAULT_ADMIN_ROLE - you can grant yourself other roles');
      }
    } catch (error) {
      console.log('⚠️  Could not check DEFAULT_ADMIN_ROLE');
    }
    
    // Check if deployer can call setV4ContractAddress
    if (hasAdminRole) {
      console.log('\n✅ You have ADMIN_ROLE - you should be able to set V4 contract address');
    } else if (hasMigratorRole) {
      console.log('\n⚠️  You have MIGRATOR_ROLE but not ADMIN_ROLE');
      console.log('   You need ADMIN_ROLE to set V4 contract address');
    } else {
      console.log('\n❌ You have no roles on the migration module');
      console.log('   This is why the migration failed');
    }
    
    // Check if we can grant roles
    if (hasAdminRole) {
      console.log('\n💡 Solution: Grant yourself the required roles');
      console.log('   You can call: grantRole(ADMIN_ROLE, your_address)');
    }
    
  } catch (error) {
    console.log('❌ Error checking migration module:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
