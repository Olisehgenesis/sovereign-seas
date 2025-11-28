//export celo token details , and cusd, address get from env
import { getCeloTokenAddress, getCusdTokenAddress, getGoodDollarTokenAddress } from '@/utils/contractConfig';
import { listTokens } from '@/utils/tokenRegistry';

interface SupportedToken {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
}

// Get testnet-aware token addresses
const celoToken = getCeloTokenAddress();
const cusdToken = getCusdTokenAddress();

const baseTokens: SupportedToken[] = [
  {
    address: celoToken,
    name: 'Celo',
    symbol: 'CELO',
    decimals: 18,
  },
  {
    address: cusdToken,
    name: 'cUSD',
    symbol: 'cUSD',
    decimals: 18,
  },
  {
    address: getGoodDollarTokenAddress() || '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A',
    name: 'GoodDollar',
    symbol: 'G$',
    decimals: 18,
  },
];

export const supportedTokens: SupportedToken[] = listTokens(baseTokens);