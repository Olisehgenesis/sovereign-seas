import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import enhancedProxyArtifact from '../../artifacts/contracts/EnhancedCeloVotingProxyV2.sol/EnhancedCeloVotingProxyV2.json';

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const UNIVERSAL_ROUTER = process.env.UNIVERSAL_ROUTER;
const QUOTER = process.env.QUOTER;
const FACTORY = process.env.FACTORY;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;
const WCELO_ADDRESS = process.env.WCELO_ADDRESS;

const args = process.argv.slice(2);
const isMainnet = args.includes('--network') && args[args.indexOf('--network') + 1] === 'celo' || 
                  RPC_URL.includes('rpc.ankr.com/celo') || 
                  process.env.NETWORK === 'celo';
const chain = isMainnet ? celo : celoAlfajores;

if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}
if (!UNIVERSAL_ROUTER) {
  console.error('Error: UNIVERSAL_ROUTER environment variable is required');
  process.exit(1);
}
if (!QUOTER) {
  console.error('Error: QUOTER environment variable is required');
  process.exit(1);
}
if (!FACTORY) {
  console.error('Error: FACTORY environment variable is required');
  process.exit(1);
}
if (!SOVEREIGN_SEAS_V4_ADDRESS) {
  console.error('Error: SOVEREIGN_SEAS_V4_ADDRESS environment variable is required');
  process.exit(1);
}
if (!WCELO_ADDRESS) {
  console.error('Error: WCELO_ADDRESS environment variable is required');
  process.exit(1);
}

const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
const publicClient = createPublicClient({
  chain: chain,
  transport: http(RPC_URL)
});

async function deployEnhancedCeloVotingProxy() {
  try {
    console.log('🚀 Deploying EnhancedCeloVotingProxyV2 contract...\n');
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Account balance: ${Number(balance) / 1e18} CELO`);
    if (balance < 1000000000000000000n) {
      console.warn('⚠️  Warning: Low CELO balance for gas fees');
    }
    const walletClient = createWalletClient({
      account,
      chain: chain,
      transport: http(RPC_URL)
    });
    console.log(`Using account: ${account.address}`);
    console.log(`Network: ${isMainnet ? 'Celo Mainnet' : 'Alfajores Testnet'}`);
    console.log(`Universal Router: ${UNIVERSAL_ROUTER}`);
    console.log(`Quoter: ${QUOTER}`);
    console.log(`Factory: ${FACTORY}`);
    console.log(`SovereignSeas V4 address: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`WCELO address: ${WCELO_ADDRESS}\n`);
    console.log('📦 Deploying contract...');
    const deployHash = await walletClient.deployContract({
      abi: enhancedProxyArtifact.abi,
      bytecode: enhancedProxyArtifact.bytecode as `0x${string}`,
      args: [
        UNIVERSAL_ROUTER as `0x${string}`,
        QUOTER as `0x${string}`,
        FACTORY as `0x${string}`,
        SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
        WCELO_ADDRESS as `0x${string}`
      ],
      gas: 3500000n
    });
    console.log(`Deploy transaction hash: ${deployHash}`);
    console.log('⏳ Waiting for deployment confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: deployHash,
      timeout: 90000
    });
    if (receipt.status === 'success') {
      const contractAddress = receipt.contractAddress;
      console.log(`\n✅ EnhancedCeloVotingProxyV2 deployed successfully!`);
      console.log(`📍 Contract Address: ${contractAddress}`);
      console.log(`🔗 View on CeloScan: https://celoscan.io/address/${contractAddress}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toLocaleString()}`);
      console.log(`🧾 Block number: ${receipt.blockNumber}`);
      // Verify deployment by calling getConfiguration
      console.log('\n🔍 Verifying deployment...');
      const configData = await publicClient.readContract({
        address: contractAddress!,
        abi: enhancedProxyArtifact.abi,
        functionName: 'getConfiguration',
        args: []
      });
      console.log('✅ Contract Configuration Verified:');
      console.log(`- Universal Router: ${(configData as any[])[0]}`);
      console.log(`- Quoter: ${(configData as any[])[1]}`);
      console.log(`- Factory: ${(configData as any[])[2]}`);
      console.log(`- SovereignSeas: ${(configData as any[])[3]}`);
      console.log(`- CELO: ${(configData as any[])[4]}`);
      console.log(`- Slippage: ${(configData as any[])[5]}`);
      console.log(`- Fees: ${(configData as any[])[6]}`);
      console.log('\n📋 Next Steps:');
      console.log('1. Update your .env file:');
      console.log(`   ENHANCED_CELO_VOTING_PROXY_ADDRESS=${contractAddress}`);
      console.log('2. Run your voting test script');
      console.log('3. The proxy will automatically route G$ → CELO → Vote');
      console.log('\nTo verify the contract, run:');
      console.log(`npx hardhat verify --network celo ${contractAddress} ${UNIVERSAL_ROUTER} ${QUOTER} ${FACTORY} ${SOVEREIGN_SEAS_V4_ADDRESS} ${WCELO_ADDRESS}`);
      return contractAddress;
    } else {
      console.error('❌ Deployment failed!');
      console.error('Transaction was reverted');
      return null;
    }
  } catch (error) {
    console.error('❌ Error deploying contract:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.message.includes('insufficient funds')) {
        console.error('💡 Solution: Add more CELO to your wallet for gas fees');
      } else if (error.message.includes('nonce')) {
        console.error('💡 Solution: Wait a moment and try again (nonce issue)');
      } else if (error.message.includes('gas')) {
        console.error('💡 Solution: Try increasing the gas limit');
      } else if (error.message.includes('revert')) {
        console.error('💡 Solution: Check constructor parameters and contract dependencies');
      }
    }
    return null;
  }
}

deployEnhancedCeloVotingProxy()
  .then((contractAddress) => {
    if (contractAddress) {
      console.log('\n🎉 Deployment completed successfully!');
      process.exit(0);
    } else {
      console.log('\n💥 Deployment failed!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Fatal deployment error:', error);
    process.exit(1);
  }); 