//export celo token details , and cusd, address get from env

interface SupportedToken {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
}

const celoToken = process.env.NEXT_PUBLIC_CELO_TOKEN;
const cusdToken = process.env.NEXT_PUBLIC_CUSD_TOKEN;

if (!celoToken || !cusdToken) {
    throw new Error('CELO_TOKEN or CUSD_TOKEN is not defined');
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
    }
];