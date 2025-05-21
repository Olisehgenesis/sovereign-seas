/**
 * Utils for formatting addresses and values
 */

/**
 * Abbreviates a blockchain address to a more readable format
 * @param address - The full blockchain address
 * @returns Abbreviated address in format "0x1234...5678"
 */
export const abbreviateAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Formats a balance with 3 decimal places and adds comma separators for thousands
 * @param value - The balance as a string or number
 * @returns Formatted balance string
 */
export const formatBalance = (value: string | number): string => {
  // Convert to number and handle errors
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  // Format with 3 decimal places
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });
  
  return formatted;
};

/**
 * Formats a balance with custom precision and adds symbol
 * @param value - The balance as a string or number
 * @param symbol - The token symbol to append
 * @param decimals - Number of decimal places to show
 * @returns Formatted balance string with symbol
 */
export const formatBalanceWithSymbol = (
  value: string | number, 
  symbol: string,
  decimals: number = 3
): string => {
  // Convert to number and handle errors
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return `0 ${symbol}`;
  
  // Format with specified decimal places
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
  
  return `${formatted} ${symbol}`;
};

/**
 * Creates a color based on an address or string
 * @param input - String to generate color from (usually an address)
 * @returns A tailwind CSS color class
 */
export const getColorFromString = (input: string): string => {
  const colors = [
    'blue',
    'indigo',
    'violet',
    'purple',
    'pink',
    'rose',
    'orange',
    'amber',
    'yellow',
    'lime',
    'green',
    'emerald',
    'teal',
    'cyan',
    'sky',
  ];
  
  // Generate a number from the string
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Pick a color based on the hash
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};