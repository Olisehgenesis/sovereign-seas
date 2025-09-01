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

async function analyzeModuleInitialization() {
  console.log('🔍 Analyzing Module Initialization');
  console.log('=====================================');

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

  // Define modules to check
  const modules = [
    { id: 'projects', name: 'ProjectsModule', address: deployment.contracts.projectsModule },
    { id: 'campaigns', name: 'CampaignsModule', address: deployment.contracts.campaignsModule },
    { id: 'voting', name: 'VotingModule', address: deployment.contracts.votingModule },
    { id: 'treasury', name: 'TreasuryModule', address: deployment.contracts.treasuryModule },
    { id: 'pools', name: 'PoolsModule', address: deployment.contracts.poolsModule },
    { id: 'migration', name: 'MigrationModule', address: deployment.contracts.migrationModule }
  ];

  console.log('\n📋 Module Analysis:');
  console.log('==================');

  for (const module of modules) {
    console.log(`\n🔧 ${module.name}:`);
    console.log(`   Address: ${module.address}`);
    console.log(`   Module ID: ${module.id}`);

    try {
      // Check if module is registered
      const isRegistered = await publicClient.readContract({
        address: deployment.contracts.SovereignSeasV5 as `0x${string}`,
        abi: [{
          name: 'getModuleAddress',
          type: 'function',
          inputs: [{ name: '_moduleId', type: 'string' }],
          outputs: [{ name: '', type: 'address' }],
          stateMutability: 'view'
        }],
        functionName: 'getModuleAddress',
        args: [module.id]
      });

      console.log(`   ✅ Registered: ${isRegistered}`);

      // Try to call initialize directly on the module
      try {
        const initData = await publicClient.readContract({
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
          ]
        });
        console.log(`   ✅ Already initialized`);
      } catch (error: any) {
        if (error.message.includes('already initialized') || error.message.includes('Initializable')) {
          console.log(`   ✅ Already initialized`);
        } else {
          console.log(`   ⏳ Needs initialization`);
          console.log(`   📝 Initialize call format:`);
          console.log(`      Module: ${module.address}`);
          console.log(`      Function: initialize(address _proxy, bytes _data)`);
          console.log(`      Args: [${deployment.contracts.SovereignSeasV5}, "0x"]`);
        }
      }

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n🎯 Recommended Solution:');
  console.log('========================');
  console.log('1. Call initialize() directly on each module contract');
  console.log('2. Use the module address, not the proxy');
  console.log('3. Pass the proxy address as the first parameter');
  console.log('4. Pass empty bytes (0x) as the second parameter');
}

analyzeModuleInitialization().catch(console.error);
