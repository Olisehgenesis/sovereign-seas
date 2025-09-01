import { createPublicClient, http, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

interface Deployment {
  contracts: {
    [key: string]: string;
  };
}

async function fixModuleInitialization() {
  console.log('🔧 Fixing Module Initialization');
  console.log('================================');

  // Load deployment info
  const deploymentPath = join(process.cwd(), 'deployments/alfajores/latest.json');
  const deployment: Deployment = JSON.parse(readFileSync(deploymentPath, 'utf8'));

  // Setup clients
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log('❌ PRIVATE_KEY not found in .env');
    return;
  }

  const deployerAccount = privateKeyToAccount(privateKey as `0x${string}`);
  const rpcUrl = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';

  console.log(`📡 Using RPC: ${rpcUrl}`);
  console.log(`👤 Deployer: ${deployerAccount.address}`);
  console.log(`🏗️  Main Contract: ${deployment.contracts.SovereignSeasV5}`);

  const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http(rpcUrl)
  });

  const deployerClient = createWalletClient({
    chain: celoAlfajores,
    transport: http(rpcUrl),
    account: deployerAccount
  });

  // Check deployer balance
  const balance = await publicClient.getBalance({ address: deployerAccount.address });
  console.log(`💰 Balance: ${balance} wei`);

  // Define modules to initialize
  const modules = [
    { id: 'projects', name: 'ProjectsModule', address: deployment.contracts.projectsModule },
    { id: 'campaigns', name: 'CampaignsModule', address: deployment.contracts.campaignsModule },
    { id: 'voting', name: 'VotingModule', address: deployment.contracts.votingModule },
    { id: 'treasury', name: 'TreasuryModule', address: deployment.contracts.treasuryModule },
    { id: 'pools', name: 'PoolsModule', address: deployment.contracts.poolsModule },
    { id: 'migration', name: 'MigrationModule', address: deployment.contracts.migrationModule }
  ];

  console.log('\n🔧 Initializing Modules:');
  console.log('=======================');

  for (const module of modules) {
    console.log(`\n📝 ${module.name}:`);
    console.log(`   Address: ${module.address}`);

    try {
      // Check if already initialized
      try {
        await publicClient.readContract({
          address: module.address as `0x${string}`,
          abi: [{
            name: 'owner',
            type: 'function',
            inputs: [],
            outputs: [{ name: '', type: 'address' }],
            stateMutability: 'view'
          }],
          functionName: 'owner'
        });
        console.log(`   ✅ Already initialized`);
        continue;
      } catch (error: any) {
        // Not initialized, proceed with initialization
      }

      console.log(`   ⏳ Initializing...`);

      // Call initialize directly on the module
      const hash = await deployerClient.writeContract({
        address: module.address as `0x${string}`,
        abi: [{
          name: 'initialize',
          type: 'function',
          inputs: [
            { name: '_proxy', type: 'address' },
            { name: '_data', type: 'bytes' }
          ],
          outputs: [],
          stateMutability: 'nonpayable'
        }],
        functionName: 'initialize',
        args: [
          deployment.contracts.SovereignSeasV5 as `0x${string}`,
          '0x' // empty data
        ],
        chain: celoAlfajores,
        account: deployerAccount.address
      });

      console.log(`   📝 Transaction hash: ${hash}`);
      
      // Wait for transaction
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ Initialized successfully!`);
      console.log(`   📊 Gas used: ${receipt.gasUsed}`);

    } catch (error: any) {
      if (error.message.includes('already initialized') || error.message.includes('Initializable')) {
        console.log(`   ✅ Already initialized`);
      } else {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }
  }

  console.log('\n🎉 Module initialization completed!');
}

fixModuleInitialization().catch(console.error);
