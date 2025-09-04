import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface TestWallet {
  name: string;
  privateKey: string;
  address: string;
  description: string;
  expectedRole: string;
}

interface TestEnvironment {
  wallets: TestWallet[];
  v4ContractAddress: string;
  v5DeploymentPath: string;
  testConfigPath: string;
}

async function main() {
  console.log('🔧 Setting up Test Environment for V4 to V5 Migration');
  console.log('====================================================');
  
  // Generate test wallets
  const testWallets: TestWallet[] = [
    {
      name: 'wallet1',
      privateKey: ethers.Wallet.createRandom().privateKey,
      address: '',
      description: 'Primary test wallet for project creation',
      expectedRole: 'Project Owner'
    },
    {
      name: 'wallet2',
      privateKey: ethers.Wallet.createRandom().privateKey,
      address: '',
      description: 'Secondary test wallet for project creation', 
      expectedRole: 'Project Owner'
    },
    {
      name: 'wallet3',
      privateKey: ethers.Wallet.createRandom().privateKey,
      address: '',
      description: 'Campaign admin wallet',
      expectedRole: 'Campaign Admin'
    },
    {
      name: 'wallet4',
      privateKey: ethers.Wallet.createRandom().privateKey,
      address: '',
      description: 'Campaign admin wallet',
      expectedRole: 'Campaign Admin'
    }
  ];

  // Generate addresses from private keys
  for (const wallet of testWallets) {
    const walletInstance = new ethers.Wallet(wallet.privateKey);
    wallet.address = walletInstance.address;
  }

  const testEnvironment: TestEnvironment = {
    wallets: testWallets,
    v4ContractAddress: "0x1F3c0902e2c05D53Af2Cd00bd3F0a62EC4000942",
    v5DeploymentPath: path.join(__dirname, '../../deployments/alfajores/latest.json'),
    testConfigPath: path.join(__dirname, 'test-config.json')
  };

  // Create .env.test file with test wallet private keys
  const envTestPath = path.join(__dirname, '../../.env.test');
  const envTestContent = [
    '# Test Environment Configuration',
    '# Generated test wallet private keys for V4 to V5 migration testing',
    '',
    `TEST_WALLET_1_PRIVATE_KEY=${testWallets[0].privateKey}`,
    `TEST_WALLET_2_PRIVATE_KEY=${testWallets[1].privateKey}`,
    `TEST_WALLET_3_PRIVATE_KEY=${testWallets[2].privateKey}`,
    `TEST_WALLET_4_PRIVATE_KEY=${testWallets[3].privateKey}`,
    '',
    '# V4 Contract Address',
    `V4_CONTRACT_ADDRESS=${testEnvironment.v4ContractAddress}`,
    '',
    '# Test Configuration',
    'PRESERVE_TEST_WALLETS=true',
    'TEST_MODE=true'
  ].join('\n');

  fs.writeFileSync(envTestPath, envTestContent);

  // Create test wallet info file
  const walletInfoPath = path.join(__dirname, '../../test-wallets.json');
  fs.writeFileSync(walletInfoPath, JSON.stringify(testWallets, null, 2));

  // Update test-config.json with generated wallet addresses
  const testConfigPath = path.join(__dirname, 'test-config.json');
  let testConfig;
  try {
    testConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
  } catch (error) {
    console.log('❌ Could not read test-config.json');
    return;
  }

  // Update wallet addresses in config
  for (const wallet of testWallets) {
    if (testConfig.testWallets[wallet.name]) {
      testConfig.testWallets[wallet.name].address = wallet.address;
      testConfig.testWallets[wallet.name].privateKey = wallet.privateKey;
    }
  }

  fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

  // Create test results directory
  const testResultsDir = path.join(__dirname, '../../test-results');
  fs.mkdirSync(testResultsDir, { recursive: true });

  // Display setup results
  console.log('\n✅ Test Environment Setup Complete!');
  console.log('===================================');
  console.log(`📁 Test wallets info: ${walletInfoPath}`);
  console.log(`📁 Test environment: ${envTestPath}`);
  console.log(`📁 Test results directory: ${testResultsDir}`);
  console.log(`📁 Updated test config: ${testConfigPath}`);
  
  console.log('\n🔑 Generated Test Wallets:');
  console.log('==========================');
  for (const wallet of testWallets) {
    console.log(`   ${wallet.name}: ${wallet.address}`);
    console.log(`   Role: ${wallet.expectedRole}`);
    console.log(`   Description: ${wallet.description}`);
    console.log('');
  }

  console.log('📋 Next Steps:');
  console.log('==============');
  console.log('1. Fund the test wallets with CELO for testing');
  console.log('2. Ensure V5 contracts are deployed');
  console.log('3. Run the migration test script');
  console.log('');
  console.log('💡 To fund wallets, you can use the Celo faucet or transfer CELO from your main wallet');
  console.log('💡 Each wallet needs at least 0.5 CELO for testing');
  console.log('💡 The main wallet needs at least 2 CELO for fees and distribution');

  // Check if V5 deployment exists
  try {
    const v5Deployment = JSON.parse(fs.readFileSync(testEnvironment.v5DeploymentPath, 'utf8'));
    console.log('\n✅ V5 Deployment Found:');
    console.log(`   SovereignSeas V5: ${v5Deployment.contracts.sovereignSeasV5}`);
    console.log(`   Migration Module: ${v5Deployment.contracts.migrationModule}`);
  } catch (error) {
    console.log('\n⚠️ V5 Deployment Not Found:');
    console.log('   Please deploy V5 contracts first using deploy-v5-enhanced.ts');
  }

  // Check main wallet balance
  try {
    const provider = new ethers.JsonRpcProvider(process.env.CELO_RPC_URL);
    const mainWallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const balance = await provider.getBalance(mainWallet.address);
    console.log(`\n💰 Main Wallet Balance: ${ethers.formatEther(balance)} CELO`);
    
    if (balance < ethers.parseEther("2")) {
      console.log('⚠️ Warning: Main wallet has insufficient balance for testing');
      console.log('   Recommended: At least 2 CELO for fees and distribution');
    }
  } catch (error) {
    console.log('\n⚠️ Could not check main wallet balance');
  }
}

main().catch(console.error);
