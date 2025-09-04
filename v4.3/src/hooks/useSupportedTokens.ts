//export celo token details , and cusd, address get from env

interface SupportedToken {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
}

const celoToken = import.meta.env.VITE_CELO_TOKEN;
const cusdToken = import.meta.env.VITE_CUSD_TOKEN;
const goodDollarToken = import.meta.env.VITE_GOOD_DOLLAR_TOKEN;

if (!celoToken || !cusdToken || !goodDollarToken) {
    throw new Error('CELO_TOKEN, CUSD_TOKEN, or VITE_GOOD_DOLLAR_TOKEN is not defined');
}

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