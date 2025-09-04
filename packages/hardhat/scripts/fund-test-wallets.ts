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

async function main() {
  console.log('💰 Funding Test Wallets for Migration Testing');
  console.log('=============================================');
  
  // Load test wallets
  const walletInfoPath = path.join(__dirname, '../../test-wallets.json');
  let testWallets: TestWallet[];
  
  try {
    testWallets = JSON.parse(fs.readFileSync(walletInfoPath, 'utf8'));
  } catch (error) {
    console.log('❌ Could not load test wallets. Please run setup-test-environment.ts first.');
    return;
  }

  // Setup provider and main wallet
  const provider = new ethers.JsonRpcProvider(process.env.CELO_RPC_URL);
  const mainWallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
  console.log(`📡 Using RPC: ${process.env.CELO_RPC_URL}`);
  console.log(`👤 Main wallet: ${mainWallet.address}`);
  
  // Check main wallet balance
  const balance = await provider.getBalance(mainWallet.address);
  console.log(`💰 Main wallet balance: ${ethers.formatEther(balance)} CELO`);
  
  if (balance < ethers.parseEther("3")) {
    console.log("❌ Insufficient balance for funding test wallets");
    console.log("   Recommended: At least 3 CELO (0.5 per wallet + fees)");
    return;
  }

  const fundingAmount = ethers.parseEther("0.5"); // 0.5 CELO per wallet
  const totalFunding = fundingAmount * BigInt(testWallets.length);
  
  console.log(`\n💸 Funding ${testWallets.length} wallets with ${ethers.formatEther(fundingAmount)} CELO each`);
  console.log(`📊 Total funding required: ${ethers.formatEther(totalFunding)} CELO`);
  
  // Fund each test wallet
  for (const wallet of testWallets) {
    try {
      console.log(`\n💸 Funding ${wallet.name} (${wallet.address})...`);
      
      // Check current balance
      const currentBalance = await provider.getBalance(wallet.address);
      console.log(`   Current balance: ${ethers.formatEther(currentBalance)} CELO`);
      
      if (currentBalance >= fundingAmount) {
        console.log(`   ✅ ${wallet.name} already has sufficient balance`);
        continue;
      }
      
      // Send CELO
      const tx = await mainWallet.sendTransaction({
        to: wallet.address,
        value: fundingAmount
      });
      
      console.log(`   📝 Transaction hash: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
      
      // Verify new balance
      const newBalance = await provider.getBalance(wallet.address);
      console.log(`   💰 New balance: ${ethers.formatEther(newBalance)} CELO`);
      
    } catch (error: any) {
      console.log(`   ❌ Failed to fund ${wallet.name}: ${error.message}`);
    }
  }

  // Summary
  console.log('\n📊 Funding Summary');
  console.log('==================');
  
  for (const wallet of testWallets) {
    try {
      const balance = await provider.getBalance(wallet.address);
      console.log(`   ${wallet.name}: ${ethers.formatEther(balance)} CELO`);
    } catch (error) {
      console.log(`   ${wallet.name}: Error checking balance`);
    }
  }

  // Check if all wallets are funded
  let allFunded = true;
  for (const wallet of testWallets) {
    const balance = await provider.getBalance(wallet.address);
    if (balance < fundingAmount) {
      allFunded = false;
      break;
    }
  }

  if (allFunded) {
    console.log('\n✅ All test wallets are funded and ready for testing!');
    console.log('\n🚀 Next Steps:');
    console.log('==============');
    console.log('1. Run the migration test: npm run test:migration');
    console.log('2. Or run directly: npx hardhat run scripts/test-migration-v4-to-v5.ts --network alfajores');
  } else {
    console.log('\n⚠️ Some wallets may not be fully funded. Please check and retry if needed.');
  }
}

main().catch(console.error);
