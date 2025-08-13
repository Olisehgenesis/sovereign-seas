import { createPublicClient, http, formatEther } from 'viem';
import { celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import sovereignSeasV4Abi from '../artifacts/contracts/SovereignSeasV4.sol/SovereignSeasV4.json';

dotenv.config();

const RPC_URL = process.env.CELO_RPC_URL;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;
const CUSD_TOKEN_ADDRESS = process.env.CUSD_TOKEN_ADDRESS;
const CELO_TOKEN_ADDRESS = process.env.CELO_TOKEN_ADDRESS;

if (!RPC_URL || !SOVEREIGN_SEAS_V4_ADDRESS || !CUSD_TOKEN_ADDRESS || !CELO_TOKEN_ADDRESS) {
  throw new Error('Missing required environment variables');
}

async function main() {
  try {
    console.log('🔍 Fetching vote conversion rate for CUSD in Project #0, Campaign #0...\n');
    
    const publicClient = createPublicClient({
      chain: celo,
      transport: http(RPC_URL)
    });

    // Get the expected conversion rate for 1 CUSD to CELO
    const expectedVotes = await publicClient.readContract({
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: "getExpectedConversionRate",
      args: [
        CUSD_TOKEN_ADDRESS as `0x${string}`,  // from token (CUSD)
        CELO_TOKEN_ADDRESS as `0x${string}`,  // to token (CELO)
        1n * 10n ** 18n  // 1 CUSD (with 18 decimals)
      ]
    }) as bigint;

    console.log('💱 Vote Conversion Rate');
    console.log('═'.repeat(40));
    console.log(`1 CUSD = ${formatEther(expectedVotes)} CELO equivalent votes`);
    console.log(`\nThis means that when you vote with 1 CUSD, it counts as ${formatEther(expectedVotes)} CELO equivalent votes`);

  } catch (error) {
    console.error('Error fetching vote conversion rate:', error);
    if (error instanceof Error && error.message?.includes('revert')) {
      console.log('Token may not be supported or contract call failed.');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 