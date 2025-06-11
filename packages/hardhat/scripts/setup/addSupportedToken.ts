// scripts/addSupportedTokens.ts

import { createWalletClient, createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import sovereignSeasV4Abi from '../../artifacts/contracts/SovereignSeasV4.sol/SovereignSeasV4.json';

dotenv.config();

const RPC_URL = process.env.CELO_RPC_URL;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Token addresses from environment variables - only the essential three
const CELO_TOKEN_ADDRESS = process.env.CELO_TOKEN_ADDRESS;
const CUSD_TOKEN_ADDRESS = process.env.CUSD_TOKEN_ADDRESS;
const CEUR_TOKEN_ADDRESS = process.env.CEUR_TOKEN_ADDRESS;

if (!RPC_URL || !SOVEREIGN_SEAS_V4_ADDRESS || !PRIVATE_KEY) {
  throw new Error('Missing required environment variables: CELO_RPC_URL, SOVEREIGN_SEAS_V4_ADDRESS, PRIVATE_KEY');
}

interface TokenInfo {
  name: string;
  symbol: string;
  address: string;
  envVar: string;
  network: string;
}

// Define supported tokens with their details - focused on essential three
const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    name: 'Celo',
    symbol: 'CELO',
    address: CELO_TOKEN_ADDRESS || '',
    envVar: 'CELO_TOKEN_ADDRESS',
    network: 'Celo Alfajores'
  },
  {
    name: 'Celo Dollar',
    symbol: 'cUSD',
    address: CUSD_TOKEN_ADDRESS || '',
    envVar: 'CUSD_TOKEN_ADDRESS',
    network: 'Celo Alfajores'
  },
  
  
  
];

async function checkTokenSupported(tokenAddress: string, tokenSymbol: string): Promise<boolean> {
  try {
    const publicClient = createPublicClient({
      chain: celo,
      transport: http(RPC_URL)
    });

    const isSupported = await publicClient.readContract({
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'isTokenSupported',
      args: [tokenAddress as `0x${string}`]
    });

    console.log(`  ✓ ${tokenSymbol} support status: ${isSupported ? '✅ Already supported' : '❌ Not supported'}`);
    return isSupported as boolean;
  } catch (error) {
    console.error(`  ❌ Error checking ${tokenSymbol} support:`, error);
    return false;
  }
}

async function addSupportedToken(tokenAddress: string, tokenInfo: TokenInfo): Promise<boolean> {
  try {
    console.log(`🔄 Adding ${tokenInfo.symbol} (${tokenInfo.name}) as supported token...`);
    console.log(`   Address: ${tokenAddress}`);
    
    const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
    
    const publicClient = createPublicClient({
      chain: celo,
      transport: http(RPC_URL)
    });

    const walletClient = createWalletClient({
      account,
      chain: celo,
      transport: http(RPC_URL)
    });

    // Simulate the transaction first
    const { request } = await publicClient.simulateContract({
      account,
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'addSupportedToken',
      args: [tokenAddress as `0x${string}`]
    });

    // Execute transaction
    const hash = await walletClient.writeContract(request);
    
    console.log(`   📤 Transaction submitted: ${hash}`);
    console.log(`   ⏳ Waiting for confirmation...`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log(`   ✅ ${tokenInfo.symbol} added successfully!`);
      console.log(`   📋 Transaction hash: ${hash}`);
      console.log(`   🧱 Block number: ${receipt.blockNumber}`);
      console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
      return true;
    } else {
      console.log(`   ❌ Transaction failed for ${tokenInfo.symbol}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error adding ${tokenInfo.symbol}:`, error);
    
    // Parse specific error messages
    if (error.message?.includes('Token already supported')) {
      console.log(`   ℹ️  ${tokenInfo.symbol} is already supported`);
      return true;
    } else if (error.message?.includes('Only super admin')) {
      console.error(`   🔒 Access denied: Only super admin can add tokens`);
    } else if (error.message?.includes('Invalid token address')) {
      console.error(`   📍 Invalid token address: ${tokenAddress}`);
    }
    
    return false;
  }
}

async function checkSuperAdminStatus(): Promise<boolean> {
  try {
    const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
    
    const publicClient = createPublicClient({
      chain: celo,
      transport: http(RPC_URL)
    });

    const isSuperAdmin = await publicClient.readContract({
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'superAdmins',
      args: [account.address]
    });

    console.log(`🔍 Super Admin Status: ${isSuperAdmin ? '✅ Authorized' : '❌ Not authorized'}`);
    console.log(`   Account: ${account.address}`);
    
    return isSuperAdmin as boolean;
  } catch (error) {
    console.error('❌ Error checking super admin status:', error);
    return false;
  }
}

async function addAllSupportedTokens() {
  try {
    console.log('\n🚀 Adding Supported Tokens to SovereignSeas V4');
    console.log('================================================');
    console.log(`📄 Contract: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`🌐 Network: Celo Alfajores Testnet`);
    
    // Check super admin status
    const isSuperAdmin = await checkSuperAdminStatus();
    if (!isSuperAdmin) {
      console.error('\n❌ Current account is not a super admin. Cannot add tokens.');
      console.log('💡 Make sure you are using the deployer account or have been added as a super admin.');
      return;
    }
    
    // Filter tokens that have addresses defined
    const validTokens = SUPPORTED_TOKENS.filter(token => {
      if (!token.address) {
        console.log(`⚠️  Skipping ${token.symbol}: No address found in ${token.envVar}`);
        return false;
      }
      if (!token.address.startsWith('0x') || token.address.length !== 42) {
        console.log(`⚠️  Skipping ${token.symbol}: Invalid address format in ${token.envVar}`);
        return false;
      }
      return true;
    });
    
    if (validTokens.length === 0) {
      console.error('\n❌ No valid token addresses found in environment variables.');
      console.log('\n💡 Make sure to set these environment variables:');
      SUPPORTED_TOKENS.forEach(token => {
        console.log(`   - ${token.envVar}=0x...`);
      });
      return;
    }
    
    console.log(`\n📋 Found ${validTokens.length} valid token(s) to process:`);
    validTokens.forEach(token => {
      console.log(`   • ${token.symbol} (${token.name}) - ${token.address}`);
    });
    
    console.log('\n🔍 Checking current support status...');
    
    // Check which tokens are already supported
    const tokenStatuses = await Promise.all(
      validTokens.map(async (token) => {
        const isSupported = await checkTokenSupported(token.address, token.symbol);
        return { ...token, isSupported };
      })
    );
    
    const tokensToAdd = tokenStatuses.filter(token => !token.isSupported);
    
    if (tokensToAdd.length === 0) {
      console.log('\n✅ All tokens are already supported!');
      return;
    }
    
    console.log(`\n🔄 Adding ${tokensToAdd.length} new token(s)...`);
    
    let successCount = 0;
    let failureCount = 0;
    
    // Add each token sequentially to avoid nonce issues
    for (const token of tokensToAdd) {
      const success = await addSupportedToken(token.address, token);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
      
      // Small delay between transactions
      if (tokensToAdd.indexOf(token) < tokensToAdd.length - 1) {
        console.log('   ⏳ Waiting 2 seconds before next transaction...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('===========');
    console.log(`✅ Successfully added: ${successCount} token(s)`);
    console.log(`❌ Failed to add: ${failureCount} token(s)`);
    console.log(`📍 Already supported: ${tokenStatuses.length - tokensToAdd.length} token(s)`);
    console.log(`📋 Total processed: ${tokenStatuses.length} token(s)`);
    
    if (successCount > 0) {
      console.log('\n🎉 Token addition completed successfully!');
      console.log('💡 You can now use these tokens in campaigns and votes.');
    }
    
  } catch (error) {
    console.error('\n❌ Error in main function:', error);
    throw error;
  }
}

async function addSingleToken(tokenSymbol: string) {
  try {
    const token = SUPPORTED_TOKENS.find(t => 
      t.symbol.toLowerCase() === tokenSymbol.toLowerCase()
    );
    
    if (!token) {
      console.error(`❌ Token ${tokenSymbol} not found in supported tokens list.`);
      console.log('\n📋 Available tokens:');
      SUPPORTED_TOKENS.forEach(t => {
        console.log(`   • ${t.symbol} (${t.name}) - ${t.envVar}`);
      });
      return;
    }
    
    if (!token.address) {
      console.error(`❌ No address found for ${token.symbol} in ${token.envVar}`);
      return;
    }
    
    console.log(`\n🚀 Adding ${token.symbol} (${token.name}) as supported token`);
    console.log('================================================');
    console.log(`📄 Contract: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`🪙 Token: ${token.address}`);
    
    // Check super admin status
    const isSuperAdmin = await checkSuperAdminStatus();
    if (!isSuperAdmin) {
      console.error('\n❌ Current account is not a super admin. Cannot add token.');
      return;
    }
    
    // Check if already supported
    const isSupported = await checkTokenSupported(token.address, token.symbol);
    if (isSupported) {
      console.log(`\n✅ ${token.symbol} is already supported!`);
      return;
    }
    
    // Add the token
    const success = await addSupportedToken(token.address, token);
    
    if (success) {
      console.log(`\n🎉 ${token.symbol} added successfully!`);
    } else {
      console.log(`\n❌ Failed to add ${token.symbol}`);
    }
    
  } catch (error) {
    console.error('❌ Error adding single token:', error);
    throw error;
  }
}

async function listCurrentTokens() {
  try {
    console.log('\n📋 Current Token Support Status');
    console.log('================================');
    console.log(`📄 Contract: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    
    for (const token of SUPPORTED_TOKENS) {
      if (token.address) {
        console.log(`\n🪙 ${token.symbol} (${token.name})`);
        console.log(`   Address: ${token.address}`);
        await checkTokenSupported(token.address, token.symbol);
      } else {
        console.log(`\n⚠️  ${token.symbol} (${token.name})`);
        console.log(`   ❌ No address in ${token.envVar}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error listing tokens:', error);
    throw error;
  }
}

async function main() {
  try {
    const command = process.argv[2];
    const parameter = process.argv[3];
    
    if (!command) {
      console.log('\n🔧 SovereignSeas V4 - Token Management');
      console.log('=====================================');
      console.log('\nUsage:');
      console.log('  npm run add-tokens [command] [parameter]');
      console.log('\nCommands:');
      console.log('  add-all      Add all tokens from environment variables');
      console.log('  add [symbol] Add a specific token (e.g., add CUSD)');
      console.log('  list         List current token support status');
      console.log('  status       Check super admin status');
      console.log('\nExamples:');
      console.log('  npm run add-tokens add-all');
      console.log('  npm run add-tokens add CUSD');
      console.log('  npm run add-tokens list');
      console.log('  npm run add-tokens status');
      return;
    }
    
    switch (command.toLowerCase()) {
      case 'add-all':
        await addAllSupportedTokens();
        break;
        
      case 'add':
        if (!parameter) {
          console.error('❌ Please specify a token symbol (e.g., CUSD)');
          return;
        }
        await addSingleToken(parameter);
        break;
        
      case 'list':
        await listCurrentTokens();
        break;
        
      case 'status':
        await checkSuperAdminStatus();
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('💡 Use one of: add-all, add [symbol], list, status');
    }
    
  } catch (error) {
    console.error('❌ Error in main function:', error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });