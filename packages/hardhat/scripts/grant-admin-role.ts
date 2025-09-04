import { createWalletClient, createPublicClient, http } from 'viem';
import { celoAlfajores } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { loadLatestDeployment } from './utils/deployments';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  rpcUrl: 'https://alfajores-forno.celo-testnet.org',
  network: 'alfajores'
};

const SOVEREIGN_SEAS_V5_ABI = [
  {
    name: 'ADMIN_ROLE',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }]
  },
  {
    name: 'hasRole',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'grantRole',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    outputs: []
  }
] as const;

async function grantAdminRole() {
  console.log('🔑 Granting ADMIN_ROLE to deployer...');
  
  const deployment = await loadLatestDeployment('alfajores');
  if (!deployment) {
    throw new Error('❌ No deployment found for alfajores');
  }
  
  const deployerPrivateKey = process.env.PRIVATE_KEY;
  if (!deployerPrivateKey) {
    throw new Error('❌ PRIVATE_KEY not found in environment variables');
  }
  
  const deployerAccount = privateKeyToAccount(deployerPrivateKey as `0x${string}`);
  const proxyAddress = deployment.record.contracts.sovereignSeasV5 as `0x${string}`;
  
  console.log(`🏭 Deployer: ${deployerAccount.address}`);
  console.log(`📍 Proxy: ${proxyAddress}`);
  
  const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http(config.rpcUrl),
  });
  
  const walletClient = createWalletClient({
    chain: celoAlfajores,
    transport: http(config.rpcUrl),
    account: deployerAccount,
  });
  
  // Check current admin role status
  const adminRole = await publicClient.readContract({
    address: proxyAddress,
    abi: SOVEREIGN_SEAS_V5_ABI,
    functionName: 'ADMIN_ROLE'
  });
  
  const hasAdminRole = await publicClient.readContract({
    address: proxyAddress,
    abi: SOVEREIGN_SEAS_V5_ABI,
    functionName: 'hasRole',
    args: [adminRole, deployerAccount.address]
  });
  
  console.log(`🔍 Current ADMIN_ROLE status: ${hasAdminRole ? '✅ Has role' : '❌ Missing role'}`);
  
  if (hasAdminRole) {
    console.log('✅ Deployer already has ADMIN_ROLE');
    return;
  }
  
  // Grant ADMIN_ROLE to deployer
  console.log('🔑 Granting ADMIN_ROLE to deployer...');
  const grantHash = await walletClient.writeContract({
    address: proxyAddress,
    abi: SOVEREIGN_SEAS_V5_ABI,
    functionName: 'grantRole',
    args: [adminRole, deployerAccount.address]
  });
  
  console.log(`⏳ Grant role transaction: ${grantHash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: grantHash });
  console.log(`✅ ADMIN_ROLE granted successfully!`);
  console.log(`Gas used: ${receipt.gasUsed}`);
  
  // Verify the role was granted
  const newHasAdminRole = await publicClient.readContract({
    address: proxyAddress,
    abi: SOVEREIGN_SEAS_V5_ABI,
    functionName: 'hasRole',
    args: [adminRole, deployerAccount.address]
  });
  
  console.log(`🔍 New ADMIN_ROLE status: ${newHasAdminRole ? '✅ Has role' : '❌ Still missing role'}`);
}

grantAdminRole().catch(console.error);
