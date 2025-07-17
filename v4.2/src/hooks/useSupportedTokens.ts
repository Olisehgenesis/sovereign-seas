//export celo token details , and cusd, address get from env

interface SupportedToken {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
}

const celoToken = import.meta.env.VITE_CELO_TOKEN;
const cusdToken = import.meta.env.VITE_CUSD_TOKEN;

if (!celoToken || !cusdToken) {
    throw new Error('CELO_TOKEN or CUSD_TOKEN is not defined');
}

const goodDollarToken = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A';

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