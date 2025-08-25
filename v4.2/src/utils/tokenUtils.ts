import { Address } from 'viem';

// Common token addresses on Celo
export const KNOWN_TOKENS: { [key: string]: TokenInfo } = {
  '0x0000000000000000000000000000000000000000': {
    symbol: 'CELO',
    name: 'CELO',
    decimals: 18,
    logo: '🌾',
    color: '#FCFF52',
    description: 'Native CELO token'
  },
  '0x765DE816845861e75A25fCA122bb6898B8B1282a': {
    symbol: 'cUSD',
    name: 'Celo Dollar',
    decimals: 18,
    logo: '💵',
    color: '#00D4AA',
    description: 'Celo Dollar stablecoin'
  },
  '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73': {
    symbol: 'cEUR',
    name: 'Celo Euro',
    decimals: 18,
    logo: '💶',
    color: '#FFD700',
    description: 'Celo Euro stablecoin'
  },
  '0xE919F65739c26a42616b7b8eedC6b5524d1e3aC4': {
    symbol: 'cREAL',
    name: 'Celo Real',
    decimals: 18,
    logo: '🇧🇷',
    color: '#009C3B',
    description: 'Celo Real stablecoin'
  },
  '0x471EcE3750Da237f93B8E339c536989b8978a438': {
    symbol: 'CELO',
    name: 'CELO (Wrapped)',
    decimals: 18,
    logo: '🌾',
    color: '#FCFF52',
    description: 'Wrapped CELO token'
  }
};

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  logo: string;
  color: string;
  description: string;
}

/**
 * Get token information for a given address
 * @param tokenAddress The token contract address
 * @returns TokenInfo object with token details
 */
export function getTokenInfo(tokenAddress: Address): TokenInfo {
  // Check if it's a known token
  if (KNOWN_TOKENS[tokenAddress]) {
    return KNOWN_TOKENS[tokenAddress];
  }

  // Check if it's the zero address (CELO)
  if (tokenAddress === '0x0000000000000000000000000000000000000000') {
    return KNOWN_TOKENS['0x0000000000000000000000000000000000000000'];
  }

  // Return default ERC20 info for unknown tokens
  return {
    symbol: 'ERC20',
    name: 'Unknown Token',
    decimals: 18,
    logo: '🪙',
    color: '#6B7280',
    description: 'ERC20 token'
  };
}

/**
 * Get token symbol for a given address
 * @param tokenAddress The token contract address
 * @returns Token symbol string
 */
export function getTokenSymbol(tokenAddress: Address): string {
  return getTokenInfo(tokenAddress).symbol;
}

/**
 * Get token name for a given address
 * @param tokenAddress The token contract address
 * @returns Token name string
 */
export function getTokenName(tokenAddress: Address): string {
  return getTokenInfo(tokenAddress).name;
}

/**
 * Get token decimals for a given address
 * @param tokenAddress The token contract address
 * @returns Token decimals number
 */
export function getTokenDecimals(tokenAddress: Address): number {
  return getTokenInfo(tokenAddress).decimals;
}

/**
 * Get token logo for a given address
 * @param tokenAddress The token contract address
 * @returns Token logo string (emoji or icon)
 */
export function getTokenLogo(tokenAddress: Address): string {
  return getTokenInfo(tokenAddress).logo;
}

/**
 * Get token color for a given address
 * @param tokenAddress The token contract address
 * @returns Token color hex string
 */
export function getTokenColor(tokenAddress: Address): string {
  return getTokenInfo(tokenAddress).color;
}

/**
 * Check if a token is CELO (native or wrapped)
 * @param tokenAddress The token contract address
 * @returns Boolean indicating if token is CELO
 */
export function isCeloToken(tokenAddress: Address): boolean {
  const symbol = getTokenSymbol(tokenAddress);
  return symbol === 'CELO';
}

/**
 * Check if a token is a stablecoin
 * @param tokenAddress The token contract address
 * @returns Boolean indicating if token is a stablecoin
 */
export function isStablecoin(tokenAddress: Address): boolean {
  const symbol = getTokenSymbol(tokenAddress);
  return ['cUSD', 'cEUR', 'cREAL'].includes(symbol);
}

/**
 * Get token display name with symbol
 * @param tokenAddress The token contract address
 * @returns Formatted token display name
 */
export function getTokenDisplayName(tokenAddress: Address): string {
  const info = getTokenInfo(tokenAddress);
  return `${info.name} (${info.symbol})`;
}

/**
 * Format token amount with proper decimals and symbol
 * @param amount The token amount in wei
 * @param tokenAddress The token contract address
 * @param showSymbol Whether to show the token symbol
 * @returns Formatted token amount string
 */
export function formatTokenAmount(
  amount: bigint, 
  tokenAddress: Address, 
  showSymbol: boolean = true
): string {
  const info = getTokenInfo(tokenAddress);
  const formattedAmount = (Number(amount) / Math.pow(10, info.decimals)).toFixed(6);
  
  if (showSymbol) {
    return `${formattedAmount} ${info.symbol}`;
  }
  
  return formattedAmount;
}

/**
 * Get token priority for sorting (CELO first, then stablecoins, then others)
 * @param tokenAddress The token contract address
 * @returns Priority number (lower = higher priority)
 */
export function getTokenPriority(tokenAddress: Address): number {
  if (isCeloToken(tokenAddress)) return 0;
  if (isStablecoin(tokenAddress)) return 1;
  return 2;
}

/**
 * Sort tokens by priority (CELO first, then stablecoins, then others)
 * @param tokenAddresses Array of token addresses
 * @returns Sorted array of token addresses
 */
export function sortTokensByPriority(tokenAddresses: Address[]): Address[] {
  return [...tokenAddresses].sort((a, b) => {
    const priorityA = getTokenPriority(a);
    const priorityB = getTokenPriority(b);
    return priorityA - priorityB;
  });
}

/**
 * Get all known token addresses
 * @returns Array of known token addresses
 */
export function getKnownTokenAddresses(): Address[] {
  return Object.keys(KNOWN_TOKENS) as Address[];
}

/**
 * Get token info for display in UI components
 * @param tokenAddress The token contract address
 * @returns Object with display properties for UI
 */
export function getTokenDisplayInfo(tokenAddress: Address) {
  const info = getTokenInfo(tokenAddress);
  return {
    ...info,
    displayName: getTokenDisplayName(tokenAddress),
    isCelo: isCeloToken(tokenAddress),
    isStablecoin: isStablecoin(tokenAddress),
    priority: getTokenPriority(tokenAddress)
  };
} 