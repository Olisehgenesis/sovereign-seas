import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

const CONTRACT_ADDRESS = process.env.ENHANCED_CELO_VOTING_PROXY_ADDRESS;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS || '0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a';
const WCELO_ADDRESS = process.env.WCELO_ADDRESS || '0x471EcE3750Da237f93B8E339c536989b8978a438';

if (!CONTRACT_ADDRESS) {
  console.error('Error: ENHANCED_CELO_VOTING_PROXY_ADDRESS environment variable is required');
  process.exit(1);
}

// WorkingCeloVotingProxy only takes 2 constructor parameters
const verifyCmd = `npx hardhat verify --network celo ${CONTRACT_ADDRESS} ${SOVEREIGN_SEAS_V4_ADDRESS} ${WCELO_ADDRESS}`;

console.log('🔍 Verifying WorkingCeloVotingProxy on Celo...');
console.log('📋 Constructor parameters:');
console.log(`- SovereignSeas: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
console.log(`- WCELO: ${WCELO_ADDRESS}`);
console.log(`- Universal Router: 0x643770E279d5D0733F21d6DC03A8efbABf3255B4 (hardcoded in contract)\n`);
console.log('Running command:');
console.log(verifyCmd);

try {
  const output = execSync(verifyCmd, { stdio: 'inherit' });
  console.log('✅ Verification complete!');
} catch (error) {
  console.error('❌ Verification failed. See above for details.');
  console.error('💡 Common solutions:');
  console.error('   - Wait a few minutes after deployment before verifying');
  console.error('   - Check that the contract address is correct');
  console.error('   - Ensure constructor parameters match exactly');
  process.exit(1);
}