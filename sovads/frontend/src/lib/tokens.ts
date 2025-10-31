/**
 * Token configuration for Celo Sepolia Testnet
 * Maps token addresses to their display information
 */

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
}

/**
 * Known tokens on Celo Sepolia Testnet
 * Addresses are stored in lowercase for consistent lookups
 */
export const CELO_SEPOLIA_TOKENS: Record<string, TokenInfo> = {
  // Celo Dollar (cUSD)
  '0xef4d55d6de8e8d73232827cd1e9b2f2dbb45bc80': {
    symbol: 'cUSD',
    name: 'Celo Dollar',
    decimals: 18,
    address: '0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80'
  },
  // USDC
  '0x01c5c0122039549ad1493b8220cabedd739bc44e': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    address: '0x01C5C0122039549AD1493B8220cABEdD739BC44E'
  },
  // USDT (Tether USD)
  '0xd077a400968890eacc75cdc901f0356c943e4fdb': {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    address: '0xd077A400968890Eacc75cdc901F0356c943e4fDb'
  },
  // CELO (ERC20)
  '0x471ece3750da237f93b8e339c536989b8978a438': {
    symbol: 'CELO',
    name: 'Celo Native Token',
    decimals: 18,
    address: '0x471EcE3750Da237f93B8E339c536989b8978a438'
  },
  // Alternative cUSD address (if it exists)
  '0xde9e4c3ce781b4ba68120d6261cbad65ce0ab00b': {
    symbol: 'cUSD',
    name: 'Celo Dollar (Alt)',
    decimals: 18,
    address: '0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b'
  }
};

/**
 * Get token information by address
 * @param address - Token contract address
 * @returns TokenInfo or undefined if not found
 */
export function getTokenInfo(address: string | null | undefined): TokenInfo | undefined {
  if (!address) return undefined;
  return CELO_SEPOLIA_TOKENS[address.toLowerCase()];
}

/**
 * Get token symbol by address
 * @param address - Token contract address
 * @returns Token symbol or 'TOKEN' if not found
 */
export function getTokenSymbol(address: string | null | undefined): string {
  return getTokenInfo(address)?.symbol || 'TOKEN';
}

/**
 * Get token name by address
 * @param address - Token contract address
 * @returns Token name or 'Token' if not found
 */
export function getTokenName(address: string | null | undefined): string {
  return getTokenInfo(address)?.name || 'Token';
}

/**
 * Get formatted token label (symbol — name)
 * @param address - Token contract address
 * @returns Formatted label or truncated address if not found
 */
export function getTokenLabel(address: string | null | undefined): string {
  const info = getTokenInfo(address);
  if (info) {
    return `${info.symbol} — ${info.name}`;
  }
  if (address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  return 'Unknown Token';
}

