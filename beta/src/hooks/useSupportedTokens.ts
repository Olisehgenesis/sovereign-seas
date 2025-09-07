//export celo token details , and cusd, address get from env
import { getCeloTokenAddress, getCusdTokenAddress, getGoodDollarTokenAddress } from '@/utils/contractConfig';

interface SupportedToken {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
}

// Get testnet-aware token addresses
const celoToken = getCeloTokenAddress();
const cusdToken = getCusdTokenAddress();
const goodDollarToken = getGoodDollarTokenAddress();

export const supportedTokens: SupportedToken[] = [
    {
        address: celoToken,
        name: "Celo",
        symbol: "CELO",
        decimals: 18
    },
    {
        address: cusdToken,
        name: "cUSD",
        symbol: "cUSD",
        decimals: 18
    },
    {
        address: goodDollarToken,
        name: "GoodDollar",
        symbol: "G$",
        decimals: 18
    }
];