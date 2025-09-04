import { createPublicClient, http, decodeFunctionResult } from 'viem';
import { celoAlfajores } from 'viem/chains';
import fs from 'fs';

const client = createPublicClient({
  chain: celoAlfajores,
  transport: http('https://alfajores-forno.celo-testnet.org')
});

const deployment = JSON.parse(fs.readFileSync('deployments/alfajores/latest.json', 'utf8'));

async function checkProjectsDirect() {
  try {
    console.log('🔍 Checking projects directly from module...');
    console.log(`📍 Projects module address: ${deployment.contracts.projectsModule}`);
    
    // Try to get project count directly from the projects module
    const projectCount = await client.readContract({
      address: deployment.contracts.projectsModule as `0x${string}`,
      abi: [{
        inputs: [],
        name: 'getProjectCount',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
      }],
      functionName: 'getProjectCount',
      args: []
    });
    
    console.log(`📊 Total projects: ${projectCount}`);
    
    if (projectCount > 0) {
      // Check first few projects
      for (let i = 1; i <= Math.min(Number(projectCount), 5); i++) {
        try {
          const projectData = await client.readContract({
            address: deployment.contracts.projectsModule as `0x${string}`,
            abi: [{
              inputs: [{ name: '_projectId', type: 'uint256' }],
              name: 'getProject',
              outputs: [
                { name: 'id', type: 'uint256' },
                { name: 'owner', type: 'address' },
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string' },
                { name: 'active', type: 'bool' },
                { name: 'transferrable', type: 'bool' },
                { name: 'createdAt', type: 'uint256' }
              ],
              stateMutability: 'view',
              type: 'function'
            }],
            functionName: 'getProject',
            args: [BigInt(i)]
          });
          
          const isProxyOwner = projectData[1].toLowerCase() === deployment.contracts.sovereignSeasV5.toLowerCase();
          console.log(`📋 Project ${i}: "${projectData[2]}" (Owner: ${projectData[1]}) ${isProxyOwner ? '❌ PROXY OWNER' : '✅ INDIVIDUAL OWNER'}`);
        } catch (e: any) {
          console.log(`❌ Project ${i}: Error - ${e.message}`);
        }
      }
    } else {
      console.log('📋 No projects found');
    }
    
  } catch (e: any) {
    console.log(`❌ Error: ${e.message}`);
  }
}

checkProjectsDirect();
