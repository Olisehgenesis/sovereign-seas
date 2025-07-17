import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

const CONTRACT_ADDRESS = process.env.GOOD_DOLLAR_VOTER_ADDRESS;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS || '0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a';

// Determine network from environment
const args = process.argv.slice(2);
const isMainnet = true;

const network = isMainnet ? 'celo' : 'alfajores';

if (!CONTRACT_ADDRESS) {
  console.error('Error: GOOD_DOLLAR_VOTER_ADDRESS environment variable is required');
  console.error('Add this to your .env file after deployment:');
  console.error('GOOD_DOLLAR_VOTER_ADDRESS=0x...');
  process.exit(1);
}

// GoodDollarVoter only takes 1 constructor parameter
const verifyCmd = `npx hardhat verify --network ${network} ${CONTRACT_ADDRESS} ${SOVEREIGN_SEAS_V4_ADDRESS}`;

console.log('🔍 Verifying GoodDollarVoter contract...');
console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
console.log(`🌐 Network: ${network}`);
console.log('📋 Constructor parameters:');
console.log(`- SovereignSeas: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
console.log('📋 Hardcoded addresses in contract:');
console.log('- GoodDollar: 0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A');
console.log('- WCELO: 0x471EcE3750Da237f93B8E339c536989b8978a438');
console.log('- Uniswap V3 Pool: 0x11EeA4c62288186239241cE21F54034006C79B3F\n');

console.log('Running command:');
console.log(verifyCmd);
console.log('');

try {
  const output = execSync(verifyCmd, { stdio: 'inherit' });
  console.log('\n✅ Verification complete!');
  console.log('🔗 Your contract is now verified on CeloScan');
  console.log(`📍 View at: https://celoscan.io/address/${CONTRACT_ADDRESS}#code`);
  console.log('\n📋 Next steps:');
  console.log('1. Run the test script: npm run test:good-dollar-voter');
  console.log('2. Users can now interact with the verified contract');
} catch (error) {
  console.error('\n❌ Verification failed. See above for details.');
  console.error('\n💡 Common solutions:');
  console.error('   - Wait a few minutes after deployment before verifying');
  console.error('   - Check that the contract address is correct in .env');
  console.error('   - Ensure constructor parameters match exactly');
  console.error('   - Make sure you compiled the contract: npx hardhat compile');
  console.error('   - Verify network matches deployment network');
  
  console.error('\n🔧 Debug information:');
  console.error(`   Contract: ${CONTRACT_ADDRESS}`);
  console.error(`   Network: ${network}`);
  console.error(`   Constructor args: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
  
  process.exit(1);
}