/**
 * Contract configuration utility that handles testnet vs mainnet contract addresses
 */

const isTestnet = import.meta.env.VITE_ENV === 'testnet' || import.meta.env.VITE_IS_TESTNET === 'true';

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
  const mainnetContract = import.meta.env.VITE_CONTRACT_V4 as string;
  const testnetContract = import.meta.env.VITE_CONTRACT_V4_TESTNET as string;
  
  console.log('Contract Address Selection:', {
    isTestnet,
    VITE_ENV: import.meta.env.VITE_ENV,
    VITE_IS_TESTNET: import.meta.env.VITE_IS_TESTNET,
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
  const mainnetContract = import.meta.env.VITE_TIP_CONTRACT_V4 as string;
  const testnetContract = import.meta.env.VITE_TIP_CONTRACT_V4_TESTNET as string;
  
  return getContractAddress(mainnetContract, testnetContract);
}

/**
 * Get the Good Dollar voter contract address with testnet support
 */
export function getGoodDollarVoterAddress(): `0x${string}` {
  const mainnetContract = import.meta.env.VITE_GOODDOLLAR_VOTER_CONTRACT as string;
  const testnetContract = import.meta.env.VITE_GOODDOLLAR_VOTER_CONTRACT_TESTNET as string;
  
  return getContractAddress(mainnetContract, testnetContract);
}

/**
 * Get the bridge contract address with testnet support
 */
export function getBridgeContractAddress(): `0x${string}` {
  const mainnetContract = import.meta.env.VITE_SIMPLE_BRIDGE_V1 as string;
  const testnetContract = import.meta.env.VITE_SIMPLE_BRIDGE_V1_TESTNET as string;
  
  return getContractAddress(mainnetContract, testnetContract);
}

/**
 * Get the CELO token address with testnet support
 */
export function getCeloTokenAddress(): `0x${string}` {
  const mainnetToken = import.meta.env.VITE_CELO_TOKEN as string;
  const testnetToken = import.meta.env.VITE_CELO_TOKEN_TESTNET as string;
  
  return getContractAddress(mainnetToken, testnetToken);
}

/**
 * Get the cUSD token address with testnet support
 */
export function getCusdTokenAddress(): `0x${string}` {
  const mainnetToken = import.meta.env.VITE_CUSD_TOKEN as string;
  const testnetToken = import.meta.env.VITE_CUSD_TOKEN_TESTNET as string;
  
  return getContractAddress(mainnetToken, testnetToken);
}

/**
 * Get the Good Dollar token address with testnet support
 */
export function getGoodDollarTokenAddress(): `0x${string}` {
  const mainnetToken = import.meta.env.VITE_GOOD_DOLLAR_TOKEN as string;
  const testnetToken = import.meta.env.VITE_GOOD_DOLLAR_TOKEN_TESTNET as string;
  
  return getContractAddress(mainnetToken, testnetToken);
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
