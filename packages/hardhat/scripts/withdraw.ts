import { createWalletClient, http, createPublicClient, formatEther, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo, celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';
import celoSwapperV3Abi from '../artifacts/contracts/swapVote.sol/CeloSwapperV3.json';
import erc20Abi from './abi/erc20.json';

dotenv.config();

// Configuration
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const USE_TESTNET = process.env.USE_TESTNET === 'true' || false;
const RPC_URL = process.env.CELO_RPC_URL || (USE_TESTNET 
  ? 'https://alfajores-forno.celo-testnet.org' 
  : 'https://rpc.ankr.com/celo');
const SWAPPER_V3_ADDRESS = process.env.SWAPPER_V3_ADDRESS;
const CELO_TOKEN = "0x471EcE3750Da237f93B8E339c536989b8978a438"; // CELO token address

// Validate input
if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

if (!SWAPPER_V3_ADDRESS) {
  console.error('Error: SWAPPER_V3_ADDRESS environment variable is required');
  process.exit(1);
}

/**
 * Withdraws all funds from the CeloSwapperV3 contract to the deployer wallet
 */
async function withdrawAllFunds() {
  try {
    console.log('Withdrawing all funds from CeloSwapperV3...');
    console.log(`Network: ${USE_TESTNET ? 'Alfajores Testnet' : 'Celo Mainnet'}`);
    console.log(`Contract: ${SWAPPER_V3_ADDRESS}`);
    
    // Setup wallet and public clients
    const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
    const chain = USE_TESTNET ? celoAlfajores : celo;
    
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(RPC_URL)
    });
    
    const publicClient = createPublicClient({
      chain,
      transport: http(RPC_URL)
    });
    
    console.log(`Wallet address: ${account.address}`);
    
    // Check if wallet is admin or owner
    const isOwner = await publicClient.readContract({
      address: SWAPPER_V3_ADDRESS as `0x${string}`,
      abi: celoSwapperV3Abi.abi,
      functionName: 'owner',
    }) as string;
    
    const isAdmin = await publicClient.readContract({
      address: SWAPPER_V3_ADDRESS as `0x${string}`,
      abi: celoSwapperV3Abi.abi,
      functionName: 'admins',
      args: [account.address]
    }) as boolean;
    
    if (isOwner.toLowerCase() !== account.address.toLowerCase() && !isAdmin) {
      console.error('Error: Your wallet is not the owner or admin of the contract');
      process.exit(1);
    }
    
    console.log(`Authorization check: ${isOwner.toLowerCase() === account.address.toLowerCase() ? 'You are the owner' : 'You are an admin'}`);
    
    // 1. Get supported tokens
    console.log('\nGetting supported tokens...');
    const tokenCount = await publicClient.readContract({
      address: SWAPPER_V3_ADDRESS as `0x${string}`,
      abi: celoSwapperV3Abi.abi,
      functionName: 'getSupportedTokenCount',
    }) as bigint;
    
    console.log(`Found ${tokenCount} supported tokens`);
    
    const supportedTokensPromises = [];
    for (let i = 0; i < Number(tokenCount); i++) {
      supportedTokensPromises.push(
        publicClient.readContract({
          address: SWAPPER_V3_ADDRESS as `0x${string}`,
          abi: celoSwapperV3Abi.abi,
          functionName: 'supportedTokenList',
          args: [BigInt(i)],
        })
      );
    }
    
    const supportedTokens = await Promise.all(supportedTokensPromises) as string[];
    const processedTokens = new Set();
    
    // Add CELO to the list
    supportedTokens.push(CELO_TOKEN);
    
    // 2. Withdraw fees for each token
    console.log('\nWithdrawing accumulated fees...');
    for (const token of supportedTokens) {
      // Skip if already processed (avoid duplicates)
      if (processedTokens.has(token.toLowerCase())) continue;
      processedTokens.add(token.toLowerCase());
      
      // Get token symbol if possible
      let symbol;
      try {
        symbol = await publicClient.readContract({
          address: token as `0x${string}`,
          abi: erc20Abi,
          functionName: 'symbol',
        }) as string;
      } catch {
        symbol = token === CELO_TOKEN ? 'CELO' : 'Unknown';
      }
      
      // Get accumulated fees
      const accumulatedFees = await publicClient.readContract({
        address: SWAPPER_V3_ADDRESS as `0x${string}`,
        abi: celoSwapperV3Abi.abi,
        functionName: 'getAccumulatedFees',
        args: [token as `0x${string}`],
      }) as bigint;
      
      console.log(`${symbol} accumulated fees: ${formatEther(accumulatedFees)} ${symbol}`);
      
      if (accumulatedFees > 0n) {
        console.log(`Withdrawing ${formatEther(accumulatedFees)} ${symbol} accumulated fees...`);
        
        const withdrawFeeTx = await walletClient.writeContract({
          address: SWAPPER_V3_ADDRESS as `0x${string}`,
          abi: celoSwapperV3Abi.abi,
          functionName: 'withdrawFees',
          args: [
            token as `0x${string}`,
            account.address,
            0n // 0 means withdraw all accumulated fees
          ],
        });
        
        console.log(`Withdrawal transaction sent: ${withdrawFeeTx}`);
        
        await publicClient.waitForTransactionReceipt({
          hash: withdrawFeeTx,
        });
        
        console.log(`Successfully withdrawn ${symbol} accumulated fees`);
      }
    }
    
    // 3. Withdraw remaining ERC20 balances
    console.log('\nWithdrawing remaining token balances...');
    for (const token of supportedTokens) {
      if (token === CELO_TOKEN) continue; // Skip CELO, will handle separately
      
      // Get token symbol
      let symbol;
      try {
        symbol = await publicClient.readContract({
          address: token as `0x${string}`,
          abi: erc20Abi,
          functionName: 'symbol',
        }) as string;
      } catch {
        symbol = 'Unknown';
      }
      
      // Get token balance
      const balance = await publicClient.readContract({
        address: token as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [SWAPPER_V3_ADDRESS as `0x${string}`],
      }) as bigint;
      
      // Get token decimals for proper formatting
      let decimals;
      try {
        decimals = await publicClient.readContract({
          address: token as `0x${string}`,
          abi: erc20Abi,
          functionName: 'decimals',
        }) as number;
      } catch {
        decimals = 18;
      }
      
      // Format balance based on decimals
      const formattedBalance = Number(balance) / 10**decimals;
      console.log(`${symbol} balance: ${formattedBalance} ${symbol}`);
      
      if (balance > 0n) {
        console.log(`Withdrawing ${formattedBalance} ${symbol}...`);
        
        try {
          const withdrawERC20Tx = await walletClient.writeContract({
            address: SWAPPER_V3_ADDRESS as `0x${string}`,
            abi: celoSwapperV3Abi.abi,
            functionName: 'withdrawERC20',
            args: [
              token as `0x${string}`,
              account.address,
              balance
            ],
          });
          
          console.log(`Withdrawal transaction sent: ${withdrawERC20Tx}`);
          
          await publicClient.waitForTransactionReceipt({
            hash: withdrawERC20Tx,
          });
          
          console.log(`Successfully withdrawn ${symbol}`);
        } catch (error) {
          console.error(`Error withdrawing ${symbol}:`, error.message);
          console.log('This may be because all the balance is in accumulated fees which we already withdrew.');
        }
      }
    }
    
    // 4. Withdraw remaining CELO
    console.log('\nWithdrawing remaining CELO...');
    
    // Get contract CELO balance
    const celoBalance = await publicClient.getBalance({
      address: SWAPPER_V3_ADDRESS as `0x${string}`,
    });
    
    console.log(`CELO balance: ${formatEther(celoBalance)} CELO`);
    
    if (celoBalance > 0n) {
      console.log(`Withdrawing ${formatEther(celoBalance)} CELO...`);
      
      try {
        const withdrawCeloTx = await walletClient.writeContract({
          address: SWAPPER_V3_ADDRESS as `0x${string}`,
          abi: celoSwapperV3Abi.abi,
          functionName: 'withdrawCELO',
          args: [
            account.address,
            celoBalance
          ],
        });
        
        console.log(`Withdrawal transaction sent: ${withdrawCeloTx}`);
        
        await publicClient.waitForTransactionReceipt({
          hash: withdrawCeloTx,
        });
        
        console.log(`Successfully withdrawn CELO`);
      } catch (error) {
        console.error('Error withdrawing CELO:', error.message);
        console.log('This may be because all the balance is in accumulated fees which we already withdrew.');
      }
    }
    
    // 5. Final check
    console.log('\nFinal balances check:');
    
    // Check CELO balance
    const finalCeloBalance = await publicClient.getBalance({
      address: SWAPPER_V3_ADDRESS as `0x${string}`,
    });
    
    console.log(`Final CELO balance: ${formatEther(finalCeloBalance)} CELO`);
    
    // Check token balances
    for (const token of supportedTokens) {
      if (token === CELO_TOKEN) continue;
      
      let symbol;
      try {
        symbol = await publicClient.readContract({
          address: token as `0x${string}`,
          abi: erc20Abi,
          functionName: 'symbol',
        }) as string;
      } catch {
        symbol = 'Unknown';
      }
      
      const finalBalance = await publicClient.readContract({
        address: token as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [SWAPPER_V3_ADDRESS as `0x${string}`],
      }) as bigint;
      
      console.log(`Final ${symbol} balance: ${formatEther(finalBalance)} ${symbol}`);
    }
    
    console.log('\nWithdrawal process completed!');
    
  } catch (error) {
    console.error('Error in withdrawal process:', error);
    console.error('Error details:', error.message);
    
    if (error.cause) {
      console.error('Error cause:', error.cause.message);
    }
  }
}

// Execute the script
withdrawAllFunds().catch(console.error);