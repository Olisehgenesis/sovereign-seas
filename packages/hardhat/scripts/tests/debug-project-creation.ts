import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Load ABI
const PROJECTS_MODULE_ABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../../artifacts/contracts/v5/modules/ProjectsModule.sol/ProjectsModule.json'), 'utf8')).abi;

async function debugProjectCreation() {
  console.log('🔍 Debugging Project Creation');
  console.log('==============================');

  // Load deployment info
  const deploymentPath = path.join(__dirname, '../../deployments/alfajores/latest.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  console.log(`📡 Using RPC: https://alfajores-forno.celo-testnet.org`);
  console.log(`👤 Deployer: ${deployment.deployer}`);
  console.log(`🏗️  Main Contract: ${deployment.contracts.sovereignSeasV5}`);

  // Setup clients with Celo Forno RPC that supports transactions
  const rpcUrl = 'https://alfajores-forno.celo-testnet.org';
  
  const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http(rpcUrl),
  });

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: celoAlfajores,
    transport: http(rpcUrl),
  });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Balance: ${parseEther(balance.toString())} CELO`);

  // Test data
  const projectName = "Debug Test Project";
  const projectDescription = "A debug test project";
  const projectMetadata = {
    bio: "Debug bio",
    contractInfo: "Debug contract info",
    additionalData: "Debug additional data",
    jsonMetadata: JSON.stringify({ tags: ["debug", "test"] }),
    category: "Debug",
    website: "https://debug.com",
    github: "https://github.com/debug",
    twitter: "@debug",
    discord: "debug#1234",
    websiteUrl: "https://debug.com",
    socialMediaHandle: "@debug"
  };
  const contracts = [];
  const transferrable = false;

  try {
    console.log('\n🔍 Step 1: Testing ProjectsModule directly...');
    
    // Try to call ProjectsModule directly
    const directCallData = encodeFunctionData({
      abi: PROJECTS_MODULE_ABI,
      functionName: "createProject",
      args: [projectName, projectDescription, projectMetadata, contracts, transferrable],
    });

    console.log('📝 Attempting direct call to ProjectsModule...');
    const directTx = await walletClient.writeContract({
      address: deployment.contracts.projectsModule as `0x${string}`,
      abi: PROJECTS_MODULE_ABI,
      functionName: "createProject",
      args: [projectName, projectDescription, projectMetadata, contracts, transferrable],
      value: parseEther('0.5'),
    });

    console.log(`✅ Direct call successful! Hash: ${directTx}`);
    const directReceipt = await publicClient.waitForTransactionReceipt({ hash: directTx });
    console.log(`📊 Gas used: ${directReceipt.gasUsed}`);

    console.log('\n🔍 Step 2: Testing through proxy...');
    
    // Try through proxy
    const proxyCallData = encodeFunctionData({
      abi: PROJECTS_MODULE_ABI,
      functionName: "createProject",
      args: [projectName + " (Proxy)", projectDescription, projectMetadata, contracts, transferrable],
    });

    console.log('📝 Attempting call through proxy...');
    const proxyTx = await walletClient.writeContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: [{
        name: 'callModule',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
          { name: '_moduleId', type: 'string' },
          { name: '_data', type: 'bytes' }
        ],
        outputs: [{ name: '', type: 'bytes' }]
      }],
      functionName: "callModule",
      args: ["projects", proxyCallData],
      value: parseEther('0.5'),
    });

    console.log(`✅ Proxy call successful! Hash: ${proxyTx}`);
    const proxyReceipt = await publicClient.waitForTransactionReceipt({ hash: proxyTx });
    console.log(`📊 Gas used: ${proxyReceipt.gasUsed}`);

  } catch (directError: any) {
    console.error('❌ Direct call failed:', directError.message);
    
    console.log('\n🔍 Step 2: Testing through proxy...');
    
    try {
      // Try through proxy
      const proxyCallData = encodeFunctionData({
        abi: PROJECTS_MODULE_ABI,
        functionName: "createProject",
        args: [projectName, projectDescription, projectMetadata, contracts, transferrable],
      });

      console.log('📝 Attempting call through proxy...');
      const proxyTx = await walletClient.writeContract({
        address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: [{
          name: 'callModule',
          type: 'function',
          stateMutability: 'payable',
          inputs: [
            { name: '_moduleId', type: 'string' },
            { name: '_data', type: 'bytes' }
          ],
          outputs: [{ name: '', type: 'bytes' }]
        }],
        functionName: "callModule",
        args: ["projects", proxyCallData],
        value: parseEther('0.5'),
      });

      console.log(`✅ Proxy call successful! Hash: ${proxyTx}`);
      const proxyReceipt = await publicClient.waitForTransactionReceipt({ hash: proxyTx });
      console.log(`📊 Gas used: ${proxyReceipt.gasUsed}`);

    } catch (proxyError: any) {
      console.error('❌ Proxy call also failed:', proxyError.message);
      
      console.log('\n🔍 Step 3: Testing without fee...');
      
      try {
        // Try without fee
        const proxyCallData = encodeFunctionData({
          abi: PROJECTS_MODULE_ABI,
          functionName: "createProject",
          args: [projectName, projectDescription, projectMetadata, contracts, transferrable],
        });

        const noFeeTx = await walletClient.writeContract({
          address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
          abi: [{
            name: 'callModule',
            type: 'function',
            stateMutability: 'payable',
            inputs: [
              { name: '_moduleId', type: 'string' },
              { name: '_data', type: 'bytes' }
            ],
            outputs: [{ name: '', type: 'bytes' }]
          }],
          functionName: "callModule",
          args: ["projects", proxyCallData],
        });

        console.log(`✅ No-fee call successful! Hash: ${noFeeTx}`);
        const noFeeReceipt = await publicClient.waitForTransactionReceipt({ hash: noFeeTx });
        console.log(`📊 Gas used: ${noFeeReceipt.gasUsed}`);

      } catch (noFeeError: any) {
        console.error('❌ No-fee call also failed:', noFeeError.message);
      }
    }
  }
}

debugProjectCreation().catch(console.error);
