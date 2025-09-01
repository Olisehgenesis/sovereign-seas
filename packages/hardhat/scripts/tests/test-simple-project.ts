import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

// Load ABI
const PROJECTS_MODULE_ABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../../artifacts/contracts/v5/modules/ProjectsModule.sol/ProjectsModule.json'), 'utf8')).abi;
const SOVEREIGN_SEAS_V5_ABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../../artifacts/contracts/v5/SovereignSeasV5.sol/SovereignSeasV5.json'), 'utf8')).abi;

async function testSimpleProject() {
  console.log('🧪 Testing Simple Project Creation');
  console.log('===================================');

  // Load deployment info
  const deploymentPath = path.join(__dirname, '../../deployments/alfajores/latest.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  console.log(`🏗️ Main Contract: ${deployment.contracts.sovereignSeasV5}`);

  // Setup clients
  const rpcUrl = 'https://alfajores-forno.celo-testnet.org';
  
  const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http(rpcUrl),
  });

  // Use test wallet 1 (same as comprehensive test)
  const walletsPath = path.join(__dirname, '../../wallets/alfajores-wallets.json');
  const wallets = (JSON.parse(fs.readFileSync(walletsPath, 'utf8')) as { wallets: any[] }).wallets;
  const testWallet = wallets[0]; // First wallet

  const account = privateKeyToAccount(testWallet.privateKey);
  const walletClient = createWalletClient({
    account,
    chain: celoAlfajores,
    transport: http(rpcUrl),
  });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Balance: ${Number(balance) / 1e18} CELO`);

  // Test 1: Simple metadata (like debug script)
  console.log('\n🧪 Test 1: Simple metadata...');
  const simpleMetadata = {
    bio: "Simple bio",
    contractInfo: "Simple contract info",
    additionalData: "Simple additional data",
    jsonMetadata: JSON.stringify({ tags: ["simple", "test"] }),
    category: "Test",
    website: "https://test.com",
    github: "https://github.com/test",
    twitter: "@test",
    discord: "test#1234",
    websiteUrl: "https://test.com",
    socialMediaHandle: "@test"
  };

  try {
    const simpleData = encodeFunctionData({
      abi: PROJECTS_MODULE_ABI,
      functionName: "createProject",
      args: ["Simple Test Project", "A simple test project", simpleMetadata, [], false],
    });

    const simpleTx = await walletClient.writeContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: SOVEREIGN_SEAS_V5_ABI,
      functionName: "callModule",
      args: ["projects", simpleData],
      value: parseEther('0.5'),
    });

    console.log(`✅ Simple metadata success! Hash: ${simpleTx}`);
    const simpleReceipt = await publicClient.waitForTransactionReceipt({ hash: simpleTx });
    console.log(`📊 Gas used: ${simpleReceipt.gasUsed}`);

  } catch (error: any) {
    console.error('❌ Simple metadata failed:', error.message);
  }

  // Test 2: Complex metadata (like comprehensive test)
  console.log('\n🧪 Test 2: Complex metadata...');
  const complexMetadata = {
    bio: "Bio for Ocean Cleanup Initiative",
    contractInfo: "Contract info for Ocean Cleanup Initiative",
    additionalData: "Additional data for Ocean Cleanup Initiative",
    jsonMetadata: JSON.stringify({
      tags: ["general", "testing"],
      difficulty: "beginner",
      estimatedTime: "2-4 weeks",
      techStack: ["solidity", "react"],
      teamSize: 1,
      fundingNeeded: "1000 CELO",
      milestones: [
        { name: "MVP", description: "Basic functionality", reward: "500 CELO" },
        { name: "Beta", description: "User testing", reward: "500 CELO" }
      ],
      socialLinks: {
        github: "https://github.com/test",
        twitter: "@testproject",
        discord: "test#1234"
      }
    }),
    category: "Environment",
    website: "https://test.com",
    github: "https://github.com/test",
    twitter: "@test",
    discord: "test#1234",
    websiteUrl: "https://test.com",
    socialMediaHandle: "@test"
  };

  try {
    const complexData = encodeFunctionData({
      abi: PROJECTS_MODULE_ABI,
      functionName: "createProject",
      args: ["Complex Test Project", "A complex test project", complexMetadata, [], false],
    });

    const complexTx = await walletClient.writeContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: SOVEREIGN_SEAS_V5_ABI,
      functionName: "callModule",
      args: ["projects", complexData],
      value: parseEther('0.5'),
    });

    console.log(`✅ Complex metadata success! Hash: ${complexTx}`);
    const complexReceipt = await publicClient.waitForTransactionReceipt({ hash: complexTx });
    console.log(`📊 Gas used: ${complexReceipt.gasUsed}`);

  } catch (error: any) {
    console.error('❌ Complex metadata failed:', error.message);
  }
}

testSimpleProject().catch(console.error);
