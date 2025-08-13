import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

const CONTRACT_ADDRESS = process.env.PROJECT_TIPPING_ADDRESS;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS || '0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a';

// Determine network from environment
const args = process.argv.slice(2);
const isMainnet = true;

const network = isMainnet ? 'celo' : 'alfajores';

if (!CONTRACT_ADDRESS) {
  console.error('Error: PROJECT_TIPPING_ADDRESS environment variable is required');
  console.error('Add this to your .env file after deployment:');
  console.error('PROJECT_TIPPING_ADDRESS=0x...');
  process.exit(1);
}

if (!SOVEREIGN_SEAS_V4_ADDRESS) {
  console.error('Error: SOVEREIGN_SEAS_V4_ADDRESS environment variable is required');
  console.error('Add this to your .env file:');
  console.error('SOVEREIGN_SEAS_V4_ADDRESS=0x...');
  process.exit(1);
}

// ProjectTipping only takes 1 constructor parameter
const verifyCmd = `npx hardhat verify --network ${network} ${CONTRACT_ADDRESS} ${SOVEREIGN_SEAS_V4_ADDRESS}`;

console.log('🔍 Verifying ProjectTipping contract...');
console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
console.log(`🌐 Network: ${isMainnet ? 'Celo Mainnet' : 'Alfajores Testnet'}`);
console.log('📋 Constructor parameters:');
console.log(`- SovereignSeas V4: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
console.log('📋 Contract features:');
console.log('- Platform Fee: 2% on all tips');
console.log('- Minimum Tip: 0.01 CELO equivalent');
console.log('- Multi-token support (ERC20 + native CELO)');
console.log('- Comprehensive analytics and tracking');
console.log('- Project owner withdrawal functions');
console.log('- Admin controls for fee management\n');

console.log('Running command:');
console.log(verifyCmd);
console.log('');

try {
  const output = execSync(verifyCmd, { stdio: 'inherit' });
  console.log('\n✅ Verification complete!');
  console.log('🔗 Your ProjectTipping contract is now verified on CeloScan');
  
  if (isMainnet) {
    console.log(`📍 View at: https://celoscan.io/address/${CONTRACT_ADDRESS}#code`);
  } else {
    console.log(`📍 View at: https://alfajores.celoscan.io/address/${CONTRACT_ADDRESS}#code`);
  }
  
  console.log('\n📋 Contract Functions Now Available:');
  console.log('🎯 Tipping Functions:');
  console.log('   - tipProjectWithCelo(projectId, message) - Tip with native CELO');
  console.log('   - tipProject(projectId, token, amount, message) - Tip with ERC20');
  
  console.log('\n💸 Withdrawal Functions (Project Owners):');
  console.log('   - withdrawTips(projectId, token) - Withdraw specific token');
  console.log('   - withdrawAllTips(projectId) - Withdraw all tokens');
  
  console.log('\n📊 Analytics Functions:');
  console.log('   - getProjectTipSummary(projectId) - Complete project tip data');
  console.log('   - getUserTipSummary(user) - User tipping profile');
  console.log('   - getTopTippedProjects(limit) - Leaderboard');
  console.log('   - getRecentTips(limit) - Recent platform activity');
  console.log('   - getContractStats() - Overall platform statistics');
  
  console.log('\n🔧 Admin Functions (Contract Owner):');
  console.log('   - withdrawPlatformFees(token, recipient, amount) - Collect fees');
  console.log('   - toggleTipping() - Enable/disable tipping');
  console.log('   - setMinimumTipAmount(amount) - Adjust minimum tip');
  console.log('   - emergencyWithdraw(token, recipient, amount) - Emergency recovery');
  
  console.log('\n📋 Integration Examples:');
  console.log('```javascript');
  console.log('// Tip a project with CELO');
  console.log('await contract.tipProjectWithCelo(projectId, "Great work!", {');
  console.log('  value: ethers.parseEther("1.0") // 1 CELO tip');
  console.log('});');
  console.log('');
  console.log('// Get project tip summary');
  console.log('const summary = await contract.getProjectTipSummary(projectId);');
  console.log('console.log(`Total tips: ${summary.totalTipsInCelo} CELO`);');
  console.log('console.log(`Tippers: ${summary.tipperCount}`);');
  console.log('```');
  
  console.log('\n📋 Next steps:');
  console.log('1. Update your frontend to interact with verified contract');
  console.log('2. Test tipping functionality with small amounts first');
  console.log('3. Implement tip analytics in your UI');
  console.log('4. Set up platform fee collection workflow');
  console.log('5. Consider integrating tip leaderboards');
  
} catch (error) {
  console.error('\n❌ Verification failed. See above for details.');
  console.error('\n💡 Common solutions:');
  console.error('   - Wait a few minutes after deployment before verifying');
  console.error('   - Check that the contract address is correct in .env');
  console.error('   - Ensure constructor parameters match exactly');
  console.error('   - Make sure you compiled the contract: npx hardhat compile');
  console.error('   - Verify network matches deployment network');
  console.error('   - Check that SovereignSeas V4 address is correct');
  
  console.error('\n🔧 Debug information:');
  console.error(`   Contract: ${CONTRACT_ADDRESS}`);
  console.error(`   Network: ${network}`);
  console.error(`   Constructor args: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
  console.error('   Expected contract: ProjectTipping.sol');
  
  console.error('\n🔍 Verification checklist:');
  console.error('   □ Contract deployed successfully');
  console.error('   □ PROJECT_TIPPING_ADDRESS set in .env');
  console.error('   □ SOVEREIGN_SEAS_V4_ADDRESS is correct');
  console.error('   □ Network parameter matches deployment network');
  console.error('   □ Contract compiled with same Solidity version');
  console.error('   □ All dependencies imported correctly');
  
  process.exit(1);
}