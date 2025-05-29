// scripts/addExchangeProviders.ts

import { createWalletClient, createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import sovereignSeasV4Abi from '../artifacts/contracts/SovereignSeasV4.sol/SovereignSeasV4.json';

dotenv.config();

const RPC_URL = process.env.CELO_RPC_URL;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Token and exchange provider addresses from environment variables
const CELO_TOKEN_ADDRESS = process.env.CELO_TOKEN_ADDRESS;
const CUSD_TOKEN_ADDRESS = process.env.CUSD_TOKEN_ADDRESS;
const CEUR_TOKEN_ADDRESS = process.env.CEUR_TOKEN_ADDRESS;
const EXCHANGE_PROVIDER = process.env.EXCHANGE_PROVIDER;
const EXCHANGE_ID = process.env.EXCHANGE_ID;

if (!RPC_URL || !SOVEREIGN_SEAS_V4_ADDRESS || !PRIVATE_KEY) {
  throw new Error('Missing required environment variables: CELO_RPC_URL, SOVEREIGN_SEAS_V4_ADDRESS, PRIVATE_KEY');
}

if (!EXCHANGE_PROVIDER || !EXCHANGE_ID) {
  throw new Error('Missing exchange provider environment variables: EXCHANGE_PROVIDER, EXCHANGE_ID');
}

interface ExchangeProviderInfo {
  name: string;
  symbol: string;
  address: string;
  envVar: string;
  exchangeProvider: string;
  exchangeId: string;
}

// Define tokens with their exchange provider details (CELO is native and doesn't need exchange provider)
const EXCHANGE_PROVIDERS: ExchangeProviderInfo[] = [
  {
    name: 'Celo Dollar',
    symbol: 'cUSD',
    address: CUSD_TOKEN_ADDRESS || '',
    envVar: 'CUSD_TOKEN_ADDRESS',
    exchangeProvider: EXCHANGE_PROVIDER,
    exchangeId: EXCHANGE_ID
  }
];

async function checkExchangeProvider(tokenAddress: string, tokenSymbol: string): Promise<{
  provider: string;
  exchangeId: string;
  active: boolean;
} | null> {
  try {
    const publicClient = createPublicClient({
      chain: celo,
      transport: http(RPC_URL)
    });

    const result = await publicClient.readContract({
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'getTokenExchangeProvider',
      args: [tokenAddress as `0x${string}`]
    }) as [string, string, boolean];

    const [provider, exchangeId, active] = result;
    
    console.log(`  ✓ ${tokenSymbol} exchange provider status:`);
    console.log(`    Provider: ${provider}`);
    console.log(`    Exchange ID: ${exchangeId}`);
    console.log(`    Active: ${active ? '✅ Yes' : '❌ No'}`);
    
    return { provider, exchangeId, active };
  } catch (error) {
    console.error(`  ❌ Error checking ${tokenSymbol} exchange provider:`, error);
    return null;
  }
}

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

    console.log(`  ✓ ${tokenSymbol} supported: ${isSupported ? '✅ Yes' : '❌ No'}`);
    return isSupported as boolean;
  } catch (error) {
    console.error(`  ❌ Error checking ${tokenSymbol} support:`, error);
    return false;
  }
}

async function setTokenExchangeProvider(
  tokenInfo: ExchangeProviderInfo,
  isUpdate: boolean = false
): Promise<boolean> {
  try {
    const functionName = isUpdate ? 'updateTokenExchangeProvider' : 'setTokenExchangeProvider';
    const action = isUpdate ? 'Updating' : 'Setting';
    
    console.log(`🔄 ${action} exchange provider for ${tokenInfo.symbol} (${tokenInfo.name})...`);
    console.log(`   Token Address: ${tokenInfo.address}`);
    console.log(`   Exchange Provider: ${tokenInfo.exchangeProvider}`);
    console.log(`   Exchange ID: ${tokenInfo.exchangeId}`);

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
      functionName: functionName,
      args: [
        tokenInfo.address as `0x${string}`,
        tokenInfo.exchangeProvider as `0x${string}`,
        tokenInfo.exchangeId as `0x${string}`
      ]
    });

    // Execute transaction
    const hash = await walletClient.writeContract(request);
    
    console.log(`   📤 Transaction submitted: ${hash}`);
    console.log(`   ⏳ Waiting for confirmation...`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log(`   ✅ ${tokenInfo.symbol} exchange provider ${isUpdate ? 'updated' : 'set'} successfully!`);
      console.log(`   📋 Transaction hash: ${hash}`);
      console.log(`   🧱 Block number: ${receipt.blockNumber}`);
      console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
      return true;
    } else {
      console.log(`   ❌ Transaction failed for ${tokenInfo.symbol}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error setting exchange provider for ${tokenInfo.symbol}:`, error);
    
    // Parse specific error messages
    if (error.message?.includes('Token not supported')) {
      console.error(`   🪙 Token ${tokenInfo.symbol} is not supported yet. Add it as a supported token first.`);
    } else if (error.message?.includes('Only super admin')) {
      console.error(`   🔒 Access denied: Only super admin can set exchange providers`);
    } else if (error.message?.includes('Invalid token address')) {
      console.error(`   📍 Invalid token address: ${tokenInfo.address}`);
    } else if (error.message?.includes('Invalid provider address')) {
      console.error(`   📍 Invalid provider address: ${tokenInfo.exchangeProvider}`);
    }
    
    return false;
  }
}

async function checkSuperAdminStatus(): Promise<boolean> {
  try {
    const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
    console.log(account.address);
    
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

async function addAllExchangeProviders() {
  try {
    console.log('\n🚀 Setting Exchange Providers for SovereignSeas V4');
    console.log('================================================');
    console.log(`📄 Contract: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`🌐 Network: Celo Alfajores Testnet`);
    console.log(`🔄 Exchange Provider: ${EXCHANGE_PROVIDER}`);
    console.log(`🆔 Exchange ID: ${EXCHANGE_ID}`);
    
    // Check super admin status
    const isSuperAdmin = await checkSuperAdminStatus();
    if (!isSuperAdmin) {
      console.error('\n❌ Current account is not a super admin. Cannot set exchange providers.');
      console.log('💡 Make sure you are using the deployer account or have been added as a super admin.');
      return;
    }
    
    // Filter tokens that have addresses defined
    const validTokens = EXCHANGE_PROVIDERS.filter(token => {
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
      console.log('\n💡 Make sure to set: CUSD_TOKEN_ADDRESS=0x...');
      return;
    }
    
    console.log(`\n📋 Found ${validTokens.length} valid token(s) to process:`);
    validTokens.forEach(token => {
      console.log(`   • ${token.symbol} (${token.name}) - ${token.address}`);
    });
    
    console.log('\n🔍 Checking current status...');
    
    // Check token support and exchange provider status
    const tokenStatuses = await Promise.all(
      validTokens.map(async (token) => {
        console.log(`\n📊 Checking ${token.symbol}:`);
        const isSupported = await checkTokenSupported(token.address, token.symbol);
        if (!isSupported) {
          console.log(`   ⚠️  ${token.symbol} is not supported yet. Please add it as a supported token first.`);
          return { ...token, isSupported, hasExchangeProvider: false, needsUpdate: false };
        }
        
        const exchangeInfo = await checkExchangeProvider(token.address, token.symbol);
        if (!exchangeInfo) {
          return { ...token, isSupported, hasExchangeProvider: false, needsUpdate: false };
        }
        
        const hasExchangeProvider = exchangeInfo.active && 
          exchangeInfo.provider !== '0x0000000000000000000000000000000000000000';
        
        const needsUpdate = hasExchangeProvider && 
          (exchangeInfo.provider.toLowerCase() !== token.exchangeProvider.toLowerCase() ||
           exchangeInfo.exchangeId.toLowerCase() !== token.exchangeId.toLowerCase());
        
        return { ...token, isSupported, hasExchangeProvider, needsUpdate, currentProvider: exchangeInfo };
      })
    );
    
    // Filter tokens that need action
    const unsupportedTokens = tokenStatuses.filter(token => !token.isSupported);
    const tokensToSet = tokenStatuses.filter(token => token.isSupported && !token.hasExchangeProvider);
    const tokensToUpdate = tokenStatuses.filter(token => token.isSupported && token.needsUpdate);
    
    if (unsupportedTokens.length > 0) {
      console.log(`\n⚠️  ${unsupportedTokens.length} token(s) are not supported yet:`);
      unsupportedTokens.forEach(token => {
        console.log(`   • ${token.symbol} - Add as supported token first`);
      });
    }
    
    if (tokensToSet.length === 0 && tokensToUpdate.length === 0) {
      console.log('\n✅ All supported tokens already have correct exchange providers!');
      return;
    }
    
    let successCount = 0;
    let failureCount = 0;
    
    // Set exchange providers for new tokens
    if (tokensToSet.length > 0) {
      console.log(`\n🔄 Setting exchange providers for ${tokensToSet.length} token(s)...`);
      
      for (const token of tokensToSet) {
        const success = await setTokenExchangeProvider(token, false);
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
        
        // Small delay between transactions
        if (tokensToSet.indexOf(token) < tokensToSet.length - 1) {
          console.log('   ⏳ Waiting 2 seconds before next transaction...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    // Update exchange providers for existing tokens
    if (tokensToUpdate.length > 0) {
      console.log(`\n🔄 Updating exchange providers for ${tokensToUpdate.length} token(s)...`);
      
      for (const token of tokensToUpdate) {
        const success = await setTokenExchangeProvider(token, true);
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
        
        // Small delay between transactions
        if (tokensToUpdate.indexOf(token) < tokensToUpdate.length - 1) {
          console.log('   ⏳ Waiting 2 seconds before next transaction...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('===========');
    console.log(`✅ Successfully processed: ${successCount} token(s)`);
    console.log(`❌ Failed to process: ${failureCount} token(s)`);
    console.log(`⚠️  Unsupported tokens: ${unsupportedTokens.length} token(s)`);
    console.log(`📋 Total checked: ${tokenStatuses.length} token(s)`);
    
    if (successCount > 0) {
      console.log('\n🎉 Exchange provider setup completed successfully!');
      console.log('💡 Tokens can now be converted during fund distribution.');
    }
    
  } catch (error) {
    console.error('\n❌ Error in main function:', error);
    throw error;
  }
}

async function setSingleExchangeProvider(tokenSymbol: string) {
  try {
    const token = EXCHANGE_PROVIDERS.find(t => 
      t.symbol.toLowerCase() === tokenSymbol.toLowerCase()
    );
    
    if (!token) {
      console.error(`❌ Token ${tokenSymbol} not found in exchange providers list.`);
      console.log('\n📋 Available tokens:');
      EXCHANGE_PROVIDERS.forEach(t => {
        console.log(`   • ${t.symbol} (${t.name}) - ${t.envVar}`);
      });
      return;
    }
    
    if (!token.address) {
      console.error(`❌ No address found for ${token.symbol} in ${token.envVar}`);
      return;
    }
    
    console.log(`\n🚀 Setting exchange provider for ${token.symbol} (${token.name})`);
    console.log('================================================');
    console.log(`📄 Contract: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`🪙 Token: ${token.address}`);
    console.log(`🔄 Exchange Provider: ${token.exchangeProvider}`);
    console.log(`🆔 Exchange ID: ${token.exchangeId}`);
    
    // Check super admin status
    const isSuperAdmin = await checkSuperAdminStatus();
    if (!isSuperAdmin) {
      console.error('\n❌ Current account is not a super admin. Cannot set exchange provider.');
      return;
    }
    
    // Check if token is supported
    const isSupported = await checkTokenSupported(token.address, token.symbol);
    if (!isSupported) {
      console.error(`\n❌ ${token.symbol} is not supported yet. Add it as a supported token first.`);
      return;
    }
    
    // Check current exchange provider
    const exchangeInfo = await checkExchangeProvider(token.address, token.symbol);
    if (!exchangeInfo) {
      console.error(`\n❌ Could not check current exchange provider for ${token.symbol}`);
      return;
    }
    
    const hasExchangeProvider = exchangeInfo.active && 
      exchangeInfo.provider !== '0x0000000000000000000000000000000000000000';
    
    const needsUpdate = hasExchangeProvider && 
      (exchangeInfo.provider.toLowerCase() !== token.exchangeProvider.toLowerCase() ||
       exchangeInfo.exchangeId.toLowerCase() !== token.exchangeId.toLowerCase());
    
    if (hasExchangeProvider && !needsUpdate) {
      console.log(`\n✅ ${token.symbol} already has the correct exchange provider set!`);
      return;
    }
    
    // Set or update the exchange provider
    const success = await setTokenExchangeProvider(token, hasExchangeProvider);
    
    if (success) {
      console.log(`\n🎉 ${token.symbol} exchange provider ${hasExchangeProvider ? 'updated' : 'set'} successfully!`);
    } else {
      console.log(`\n❌ Failed to ${hasExchangeProvider ? 'update' : 'set'} exchange provider for ${token.symbol}`);
    }
    
  } catch (error) {
    console.error('❌ Error setting single exchange provider:', error);
    throw error;
  }
}

async function listCurrentExchangeProviders() {
  try {
    console.log('\n📋 Current Exchange Provider Status');
    console.log('===================================');
    console.log(`📄 Contract: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`🔄 Target Exchange Provider: ${EXCHANGE_PROVIDER}`);
    console.log(`🆔 Target Exchange ID: ${EXCHANGE_ID}`);
    
    for (const token of EXCHANGE_PROVIDERS) {
      if (token.address) {
        console.log(`\n🪙 ${token.symbol} (${token.name})`);
        console.log(`   Address: ${token.address}`);
        
        const isSupported = await checkTokenSupported(token.address, token.symbol);
        if (isSupported) {
          await checkExchangeProvider(token.address, token.symbol);
        }
      } else {
        console.log(`\n⚠️  ${token.symbol} (${token.name})`);
        console.log(`   ❌ No address in ${token.envVar}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error listing exchange providers:', error);
    throw error;
  }
}

async function main() {
  try {
    const command = process.argv[2];
    const parameter = process.argv[3];
    
    if (!command) {
      console.log('\n🔧 SovereignSeas V4 - Exchange Provider Management');
      console.log('================================================');
      console.log('\nUsage:');
      console.log('  npm run add-exchange-providers [command] [parameter]');
      console.log('\nCommands:');
      console.log('  set-all      Set exchange providers for all tokens');
      console.log('  set [symbol] Set exchange provider for a specific token (e.g., set cUSD)');
      console.log('  list         List current exchange provider status');
      console.log('  status       Check super admin status');
      console.log('\nExamples:');
      console.log('  npm run add-exchange-providers set-all');
      console.log('  npm run add-exchange-providers set cUSD');
      console.log('  npm run add-exchange-providers list');
      console.log('  npm run add-exchange-providers status');
      console.log('\nEnvironment Variables Required:');
      console.log('  EXCHANGE_PROVIDER=0x9B64E8EaBD1a035b148cE970d3319c5C3Ad53EC3');
      console.log('  EXCHANGE_ID=0x3135b662c38265d0655177091f1b647b4fef511103d06c016efdf18b46930d2c');
      console.log('  CUSD_TOKEN_ADDRESS=0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1');
      return;
    }
    
    switch (command.toLowerCase()) {
      case 'set-all':
        await addAllExchangeProviders();
        break;
        
      case 'set':
        if (!parameter) {
          console.error('❌ Please specify a token symbol (e.g., cUSD)');
          return;
        }
        await setSingleExchangeProvider(parameter);
        break;
        
      case 'list':
        await listCurrentExchangeProviders();
        break;
        
      case 'status':
        await checkSuperAdminStatus();
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('💡 Use one of: set-all, set [symbol], list, status');
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