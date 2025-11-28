/**
 * Contract configuration utility that handles testnet vs mainnet contract addresses
 */

const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet' || process.env.NEXT_PUBLIC_IS_TESTNET === 'true';

/**
 * Get the appropriate contract address based on the current environment
 * @param mainnetAddress - The mainnet contract address
 * @param testnetAddress - The testnet contract address or testnet address from the environment variable (optional, falls back to mainnet if not provided)
 * @returns The appropriate contract address for the current environment
 */
export function getContractAddress(
  mainnetAddress: string,
  testnetAddress?: string
): `0x${string}` {
  if (isTestnet && testnetAddress) {
    return testnetAddress as `0x${string}`;
  }
  return mainnetAddress as `0x${string}`;
}

/**
 * Get the main contract address (VITE_CONTRACT_V4) with testnet support
 */
export function getMainContractAddress(): `0x${string}` {
  const mainnetContract = process.env.NEXT_PUBLIC_CONTRACT_V4 as string;
  const testnetContract = process.env.NEXT_PUBLIC_CONTRACT_V4_TESTNET as string;
  
  console.log('Contract Address Selection:', {
    isTestnet,
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
    NEXT_PUBLIC_IS_TESTNET: process.env.NEXT_PUBLIC_IS_TESTNET,
    mainnetContract,
    testnetContract,
    selectedContract: getContractAddress(mainnetContract, testnetContract)
  });
  
  return getContractAddress(mainnetContract, testnetContract);
}

/**
 * Get the tipping contract address with testnet support
 */
export function getTippingContractAddress(): `0x${string}` {
  const mainnetContract = process.env.NEXT_PUBLIC_TIP_CONTRACT_V4 as string;
  const testnetContract = process.env.NEXT_PUBLIC_TIP_CONTRACT_V4_TESTNET as string;
  
  return getContractAddress(mainnetContract, testnetContract);
}

/**
 * Get the Good Dollar voter contract address with testnet support
 */
export function getGoodDollarVoterAddress(): `0x${string}` {
  const mainnetContract = process.env.NEXT_PUBLIC_GOODDOLLAR_VOTER_CONTRACT as string;
  const testnetContract = process.env.NEXT_PUBLIC_GOODDOLLAR_VOTER_CONTRACT_TESTNET as string;
  
  return getContractAddress(mainnetContract, testnetContract);
}

/**
 * Get the bridge contract address with testnet support
 */
export function getBridgeContractAddress(): `0x${string}` {
  const mainnetContract = process.env.NEXT_PUBLIC_SIMPLE_BRIDGE_V1 as string;
  const testnetContract = process.env.NEXT_PUBLIC_SIMPLE_BRIDGE_V1_TESTNET as string;
  
  return getContractAddress(mainnetContract, testnetContract);
}

/**
 * Get the CELO token address with testnet support
 */
export function getCeloTokenAddress(): `0x${string}` {
  const mainnetToken = process.env.NEXT_PUBLIC_CELO_TOKEN as string;
  const testnetToken = process.env.NEXT_PUBLIC_CELO_TOKEN_TESTNET as string;
  
  return getContractAddress(mainnetToken, testnetToken);
}

/**
 * Get the cUSD token address with testnet support
 */
export function getCusdTokenAddress(): `0x${string}` {
  const mainnetToken = process.env.NEXT_PUBLIC_CUSD_TOKEN as string;
  const testnetToken = process.env.NEXT_PUBLIC_CUSD_TOKEN_TESTNET as string;
  
  return getContractAddress(mainnetToken, testnetToken);
}

/**
 * Get the Good Dollar token address with testnet support
 */
export function getGoodDollarTokenAddress(): `0x${string}` {
  const mainnetToken = process.env.NEXT_PUBLIC_GOOD_DOLLAR_TOKEN as string;
  const testnetToken = process.env.NEXT_PUBLIC_GOOD_DOLLAR_TOKEN_TESTNET as string;
  
  return getContractAddress(mainnetToken, testnetToken);
}

/**
 * Get the milestone contract address with testnet support
 */
export function getMilestoneContractAddress(): `0x${string}` {
  const mainnetContract = process.env.NEXT_PUBLIC_MILESTONE_CONTRACT_ADDRESS as string;
  const testnetContract = process.env.NEXT_PUBLIC_MILESTONE_CONTRACT_ADDRESS_TESTNET as string;
  
  return getContractAddress(mainnetContract, testnetContract);
}

/**
 * Get the BuilderRewardsNFT contract address with testnet support.
 * Falls back to the canonical mainnet deployment if env vars are missing.
 */
const FALLBACK_BUILDER_REWARDS_ADDRESS = '0x70b8d1b5bD6dC55A060C020915a03a448243966f';

export function getBuilderRewardsContractAddress(): `0x${string}` {
  const mainnetContract =
    (process.env.NEXT_PUBLIC_BUILDER_REWARDS_CONTRACT_ADDRESS as string) ||
    FALLBACK_BUILDER_REWARDS_ADDRESS;
  const testnetContract =
    (process.env.NEXT_PUBLIC_BUILDER_REWARDS_CONTRACT_ADDRESS_TESTNET as string) ||
    mainnetContract;

  return getContractAddress(mainnetContract, testnetContract);
}

/**
 * Get the current chain ID based on environment
 */
export function getCurrentChainId(): number {
  return isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet
}

/**
 * Check if currently running on testnet
 */
export function isTestnetEnvironment(): boolean {
  return isTestnet;
}

/**
 * Get environment name for logging/debugging
 */
export function getEnvironmentName(): string {
  return isTestnet ? 'testnet' : 'mainnet';
}
