import { createPublicClient, http } from 'viem';
import { celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';
import sovereignSeasV4Abi from '../artifacts/contracts/SovereignSeasV4.sol/SovereignSeasV4.json';

dotenv.config();

const RPC_URL = process.env.CELO_RPC_URL;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;

if (!RPC_URL || !SOVEREIGN_SEAS_V4_ADDRESS) {
  throw new Error('Missing required environment variables');
}

async function viewProjects() {
  try {
    console.log('Connecting to SovereignSeasV4 contract...');
    
    const publicClient = createPublicClient({
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });

    // Get total number of projects
    const projectCount = await publicClient.readContract({
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'getProjectCount'
    });

    console.log(`\nTotal Projects: ${projectCount}\n`);

    // Get details for each project
    for (let i = 0; i < Number(projectCount); i++) {
      const project = await publicClient.readContract({
        address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
        abi: sovereignSeasV4Abi.abi,
        functionName: 'getProject',
        args: [i]
      });

      const metadata = await publicClient.readContract({
        address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
        abi: sovereignSeasV4Abi.abi,
        functionName: 'getProjectMetadata',
        args: [i]
      });

      console.log(`Project #${i}:`);
      console.log('----------------');
      console.log(`Name: ${project[2]}`);
      console.log(`Owner: ${project[1]}`);
      console.log(`Description: ${project[3]}`);
      console.log(`Transferrable: ${project[4]}`);
      console.log(`Active: ${project[5]}`);
      console.log(`Created At: ${new Date(Number(project[6]) * 1000).toLocaleString()}`);
      console.log(`Campaign IDs: ${project[7].join(', ') || 'None'}`);
      console.log('\nMetadata:');
      console.log(`Bio: ${metadata[0]}`);
      console.log(`Contract Info: ${metadata[1]}`);
      console.log(`Additional Data: ${metadata[2]}`);
      console.log(`Associated Contracts: ${metadata[3].join(', ') || 'None'}`);
      console.log('\n');
    }

  } catch (error) {
    console.error('Error viewing projects:', error);
  }
}

viewProjects()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 