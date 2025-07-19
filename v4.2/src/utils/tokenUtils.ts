import { publicClient } from '@/utils/clients';
import { erc20ABI } from '@/abi/erc20ABI';

// Token list with icons
export const tokenList = [
  {
    address: import.meta.env.VITE_CELO_TOKEN,
    symbol: 'CELO',
    name: 'Celo',
    decimals: 18,
    icon: '/images/celo.png',
  },
  {
    address: import.meta.env.VITE_CUSD_TOKEN,
    symbol: 'cUSD',
    name: 'cUSD',
    decimals: 18,
    icon: '/images/cusd.png',
  },
  {
    address: '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A',
    symbol: 'G$',
    name: 'GoodDollar',
    decimals: 18,
    icon: '/images/good.png',
  },
];

// Fetch token details from chain
export async function getTokenDetails(address: string): Promise<{ symbol: string; name: string; decimals: number }> {
  const [symbol, name, decimals] = await Promise.all([
    publicClient.readContract({
      address: address as `0x${string}`,
      abi: erc20ABI,
      functionName: 'symbol',
    }) as Promise<string>,
    publicClient.readContract({
      address: address as `0x${string}`,
      abi: erc20ABI,
      functionName: 'name',
    }) as Promise<string>,
    publicClient.readContract({
      address: address as `0x${string}`,
      abi: erc20ABI,
      functionName: 'decimals',
    }) as Promise<number>,
  ]);
  return { symbol, name, decimals };
} 