import { ethers } from 'ethers';

// Contract Addresses
const MENTO_TOKEN_BROKER = '0xD3Dff18E465bCa6241A244144765b4421Ac14D09';
const BI_POOL_MANAGER = '0x9B64E8EaBD1a035b148cE970d3319c5C3Ad53EC3';

// Known Celo Token Addresses
const TOKENS: Record<string, string> = {
    'CELO': '0x471EcE3750Da237f93B8E339c536989b8978a438',
    'cUSD': '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    'cEUR': '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
    'cREAL': '0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787',
    'USDC': '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
    'USDT': '0x88eeC49252c8cbc039DCdB394c0c2BA2f1637EA0',
    'GOOD': '0xa9000Aa66903b5E26F88Fa8462739CdCF7956EA6'
};

// ABIs for the contracts
const MENTO_BROKER_ABI = [
    "function getAmountOut(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 amountOut)",
    "function getAmountIn(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountOut) external view returns (uint256 amountIn)",
    "function getExchangeProviders() external view returns (address[] memory)"
];

const BI_POOL_MANAGER_ABI = [
    "function getExchanges() external view returns (tuple(bytes32 exchangeId, address[] assets)[] memory)",
    "function getPoolExchange(bytes32 exchangeId) external view returns (tuple(address asset0, address asset1, address pricingModule, uint256 bucket0, uint256 bucket1, uint256 lastBucketUpdate))",
    "function getAmountOut(bytes32 exchangeId, address assetIn, address assetOut, uint256 amountIn) external view returns (uint256 amountOut)",
    "function getAmountIn(bytes32 exchangeId, address assetIn, address assetOut, uint256 amountOut) external view returns (uint256 amountIn)"
];

const ERC20_ABI = [
    "function symbol() external view returns (string)",
    "function name() external view returns (string)",
    "function decimals() external view returns (uint8)",
    "function balanceOf(address owner) external view returns (uint256)"
];

// TypeScript interfaces
interface TokenInfo {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
}

interface ExchangeInfo {
    exchangeId: string;
    assets: string[];
    provider: string;
    poolDetails?: PoolDetails;
}

interface PoolDetails {
    asset0: string;
    asset1: string;
    bucket0: string;
    bucket1: string;
    lastUpdate: string;
}

interface ConversionResult {
    exchangeId: string;
    provider: string;
    amountOut: string;
    rate: number;
    poolDetails?: PoolDetails;
}

interface ConversionResponse {
    tokenIn: TokenInfo;
    tokenOut: TokenInfo;
    inputAmount: string;
    outputAmount: string;
    rate: number;
    bestRoute: ConversionResult;
    allRoutes: ConversionResult[];
    timestamp: string;
}

interface Exchange {
    exchangeId: string;
    assets: string[];
}

interface PoolExchange {
    asset0: string;
    asset1: string;
    pricingModule: string;
    bucket0: bigint;
    bucket1: bigint;
    lastBucketUpdate: bigint;
}

class MentoTokenConverter {
    private provider: ethers.JsonRpcProvider;
    private broker: ethers.Contract;
    private biPoolManager: ethers.Contract;
    private exchangeCache: Map<string, ExchangeInfo>;
    private tokenCache: Map<string, TokenInfo>;

    constructor(rpcUrl: string = 'https://forno.celo.org') {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.broker = new ethers.Contract(MENTO_TOKEN_BROKER, MENTO_BROKER_ABI, this.provider);
        this.biPoolManager = new ethers.Contract(BI_POOL_MANAGER, BI_POOL_MANAGER_ABI, this.provider);
        this.exchangeCache = new Map();
        this.tokenCache = new Map();
    }

    // Resolve token address from symbol or address
    resolveTokenAddress(tokenInput: string): string | null {
        if (ethers.isAddress(tokenInput)) {
            return tokenInput;
        }
        const upperInput = tokenInput.toUpperCase();
        return TOKENS[upperInput] || null;
    }

    // Get token information
    async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
        if (this.tokenCache.has(tokenAddress)) {
            return this.tokenCache.get(tokenAddress)!;
        }

        try {
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
            const [symbol, name, decimals] = await Promise.all([
                tokenContract.symbol(),
                tokenContract.name(),
                tokenContract.decimals()
            ]);

            const info: TokenInfo = { address: tokenAddress, symbol, name, decimals };
            this.tokenCache.set(tokenAddress, info);
            return info;
        } catch (error: any) {
            console.error(`Error getting token info for ${tokenAddress}:`, error.message);
            return { address: tokenAddress, symbol: 'UNKNOWN', name: 'Unknown Token', decimals: 18 };
        }
    }

    // Discover all available exchanges
    async discoverExchanges(): Promise<ExchangeInfo[]> {
        if (this.exchangeCache.size > 0) {
            return Array.from(this.exchangeCache.values());
        }

        console.log('🔍 Discovering Mento exchanges...');
        
        try {
            const exchanges: Exchange[] = await this.biPoolManager.getExchanges();
            console.log(`📊 Found ${exchanges.length} exchanges`);

            for (const exchange of exchanges) {
                const exchangeInfo: ExchangeInfo = {
                    exchangeId: exchange.exchangeId,
                    assets: exchange.assets,
                    provider: BI_POOL_MANAGER
                };

                // Get pool details
                try {
                    const poolInfo: PoolExchange = await this.biPoolManager.getPoolExchange(exchange.exchangeId);
                    exchangeInfo.poolDetails = {
                        asset0: poolInfo.asset0,
                        asset1: poolInfo.asset1,
                        bucket0: poolInfo.bucket0.toString(),
                        bucket1: poolInfo.bucket1.toString(),
                        lastUpdate: new Date(Number(poolInfo.lastBucketUpdate) * 1000).toISOString()
                    };
                } catch (error: any) {
                    console.warn(`Could not get pool details for exchange ${exchange.exchangeId}`);
                }

                this.exchangeCache.set(exchange.exchangeId, exchangeInfo);
            }

            return Array.from(this.exchangeCache.values());
        } catch (error: any) {
            console.error('Error discovering exchanges:', error.message);
            return [];
        }
    }

    // Find exchanges that include a specific token
    async findExchangesForToken(tokenAddress: string): Promise<ExchangeInfo[]> {
        const exchanges = await this.discoverExchanges();
        return exchanges.filter(exchange => 
            exchange.assets.some(asset => 
                asset.toLowerCase() === tokenAddress.toLowerCase()
            )
        );
    }

    // Get conversion rate using Mento Broker
    async getConversionRateViaBroker(tokenIn: string, tokenOut: string, amount: bigint): Promise<ConversionResult[]> {
        const exchanges = await this.findExchangesForToken(tokenIn);
        const results: ConversionResult[] = [];

        for (const exchange of exchanges) {
            // Check if this exchange has both tokens
            const hasTokenIn = exchange.assets.some(asset => 
                asset.toLowerCase() === tokenIn.toLowerCase()
            );
            const hasTokenOut = exchange.assets.some(asset => 
                asset.toLowerCase() === tokenOut.toLowerCase()
            );

            if (hasTokenIn && hasTokenOut) {
                try {
                    const amountOut: bigint = await this.broker.getAmountOut(
                        BI_POOL_MANAGER,
                        exchange.exchangeId,
                        tokenIn,
                        tokenOut,
                        amount
                    );

                    results.push({
                        exchangeId: exchange.exchangeId,
                        provider: 'Mento Broker',
                        amountOut: amountOut.toString(),
                        rate: Number(ethers.formatEther(amountOut)) / Number(ethers.formatEther(amount)),
                        poolDetails: exchange.poolDetails
                    });
                } catch (error: any) {
                    console.warn(`Broker conversion failed for exchange ${exchange.exchangeId}:`, error.message);
                }
            }
        }

        return results;
    }

    // Get conversion rate using BiPoolManager directly
    async getConversionRateViaBiPool(tokenIn: string, tokenOut: string, amount: bigint): Promise<ConversionResult[]> {
        const exchanges = await this.findExchangesForToken(tokenIn);
        const results: ConversionResult[] = [];

        for (const exchange of exchanges) {
            // Check if this exchange has both tokens
            const hasTokenIn = exchange.assets.some(asset => 
                asset.toLowerCase() === tokenIn.toLowerCase()
            );
            const hasTokenOut = exchange.assets.some(asset => 
                asset.toLowerCase() === tokenOut.toLowerCase()
            );

            if (hasTokenIn && hasTokenOut) {
                try {
                    const amountOut: bigint = await this.biPoolManager.getAmountOut(
                        exchange.exchangeId,
                        tokenIn,
                        tokenOut,
                        amount
                    );

                    results.push({
                        exchangeId: exchange.exchangeId,
                        provider: 'BiPoolManager',
                        amountOut: amountOut.toString(),
                        rate: Number(ethers.formatEther(amountOut)) / Number(ethers.formatEther(amount)),
                        poolDetails: exchange.poolDetails
                    });
                } catch (error: any) {
                    console.warn(`BiPool conversion failed for exchange ${exchange.exchangeId}:`, error.message);
                }
            }
        }

        return results;
    }

    // Main function to get token to CELO conversion
    async getTokenToCeloRate(tokenInput: string, amount: string = '1.0'): Promise<ConversionResponse | null> {
        console.log(`\n🔍 Getting ${tokenInput} to CELO conversion rate...`);
        
        try {
            // Resolve token addresses
            const tokenInAddress = this.resolveTokenAddress(tokenInput);
            const celoAddress = TOKENS.CELO;

            if (!tokenInAddress) {
                throw new Error(`Unknown token: ${tokenInput}`);
            }

            if (tokenInAddress.toLowerCase() === celoAddress.toLowerCase()) {
                console.log(`✨ ${tokenInput} is already CELO!`);
                return {
                    tokenIn: await this.getTokenInfo(tokenInAddress),
                    tokenOut: await this.getTokenInfo(celoAddress),
                    inputAmount: amount,
                    outputAmount: amount,
                    rate: 1,
                    bestRoute: {
                        exchangeId: 'DIRECT',
                        provider: 'Direct',
                        amountOut: ethers.parseEther(amount).toString(),
                        rate: 1
                    },
                    allRoutes: [],
                    timestamp: new Date().toISOString()
                };
            }

            // Get token info
            const [tokenInInfo, celoInfo] = await Promise.all([
                this.getTokenInfo(tokenInAddress),
                this.getTokenInfo(celoAddress)
            ]);

            console.log(`📊 Converting: ${amount} ${tokenInInfo.symbol} → CELO`);

            // Convert amount to wei
            const amountWei = ethers.parseUnits(amount, tokenInInfo.decimals);

            // Get rates from both broker and bipool
            const [brokerResults, bipoolResults] = await Promise.all([
                this.getConversionRateViaBroker(tokenInAddress, celoAddress, amountWei),
                this.getConversionRateViaBiPool(tokenInAddress, celoAddress, amountWei)
            ]);

            const allResults = [...brokerResults, ...bipoolResults];

            if (allResults.length === 0) {
                console.log(`❌ No conversion routes found for ${tokenInInfo.symbol} → CELO`);
                return null;
            }

            // Find best rate
            const bestResult = allResults.reduce((best, current) => 
                current.rate > best.rate ? current : best
            );

            const celoAmount = ethers.formatUnits(bestResult.amountOut, celoInfo.decimals);

            console.log(`\n✅ Conversion Results:`);
            console.log(`💰 ${amount} ${tokenInInfo.symbol} = ${celoAmount} CELO`);
            console.log(`📈 Rate: 1 ${tokenInInfo.symbol} = ${bestResult.rate.toFixed(6)} CELO`);
            console.log(`🏆 Best route: ${bestResult.provider} (Exchange: ${bestResult.exchangeId})`);

            if (allResults.length > 1) {
                console.log(`\n📊 All available rates:`);
                allResults.forEach((result, index) => {
                    const resultCelo = ethers.formatUnits(result.amountOut, celoInfo.decimals);
                    console.log(`   ${index + 1}. ${result.provider}: ${resultCelo} CELO (rate: ${result.rate.toFixed(6)})`);
                });
            }

            return {
                tokenIn: tokenInInfo,
                tokenOut: celoInfo,
                inputAmount: amount,
                outputAmount: celoAmount,
                rate: bestResult.rate,
                bestRoute: bestResult,
                allRoutes: allResults,
                timestamp: new Date().toISOString()
            };

        } catch (error: any) {
            console.error(`❌ Error:`, error.message);
            throw error;
        }
    }

    // Get rates for multiple tokens
    async getBatchRates(tokens: string[], amount: string = '1.0'): Promise<(ConversionResponse | null)[]> {
        console.log(`\n🔄 Getting batch conversion rates for ${tokens.length} tokens...`);
        
        const results: (ConversionResponse | null)[] = [];
        for (const token of tokens) {
            try {
                const result = await this.getTokenToCeloRate(token, amount);
                results.push(result);
            } catch (error: any) {
                console.error(`Failed to get rate for ${token}:`, error.message);
                results.push(null);
            }
        }
        
        return results;
    }

    // List all available tokens and exchanges
    async listAvailableTokens(): Promise<{ tokens: string[], exchanges: ExchangeInfo[] }> {
        console.log('\n📋 Available tokens and exchanges:');
        
        const exchanges = await this.discoverExchanges();
        const allTokens = new Set<string>();
        
        for (const exchange of exchanges) {
            exchange.assets.forEach(asset => allTokens.add(asset));
        }
        
        console.log(`\n🪙 Tokens found in exchanges: ${allTokens.size}`);
        
        for (const tokenAddress of allTokens) {
            try {
                const tokenInfo = await this.getTokenInfo(tokenAddress);
                console.log(`   ${tokenInfo.symbol}: ${tokenAddress}`);
            } catch (error) {
                console.log(`   UNKNOWN: ${tokenAddress}`);
            }
        }
        
        console.log(`\n🏪 Exchanges: ${exchanges.length}`);
        for (const exchange of exchanges) {
            console.log(`   ${exchange.exchangeId}: ${exchange.assets.length} assets`);
        }
        
        // Also list known tokens
        console.log(`\n🏷️ Known token shortcuts:`);
        Object.entries(TOKENS).forEach(([symbol, address]) => {
            console.log(`   ${symbol}: ${address}`);
        });
        
        return { tokens: Array.from(allTokens), exchanges };
    }

    // Quick rate check for specific token
    async quickRate(tokenSymbol: string): Promise<void> {
        const tokenAddress = this.resolveTokenAddress(tokenSymbol);
        if (!tokenAddress) {
            console.log(`❌ Unknown token: ${tokenSymbol}`);
            return;
        }

        try {
            const result = await this.getTokenToCeloRate(tokenSymbol, '1');
            if (result) {
                console.log(`\n⚡ Quick Rate: 1 ${result.tokenIn.symbol} = ${result.rate.toFixed(6)} CELO`);
                console.log(`💱 ${result.tokenIn.name} (${result.tokenIn.address})`);
            }
        } catch (error: any) {
            console.error(`❌ Failed to get quick rate: ${error.message}`);
        }
    }

    // Get all token rates at once
    async getAllTokenRates(): Promise<void> {
        console.log('\n🌍 Getting rates for all known tokens...');
        const tokenSymbols = Object.keys(TOKENS).filter(symbol => symbol !== 'CELO');
        
        const results = await this.getBatchRates(tokenSymbols, '1');
        
        console.log('\n📊 Summary of all rates:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        results.forEach((result, index) => {
            if (result) {
                console.log(`${result.tokenIn.symbol.padEnd(6)} │ 1 = ${result.rate.toFixed(6).padStart(10)} CELO`);
            } else {
                console.log(`${tokenSymbols[index].padEnd(6)} │ ${'ERROR'.padStart(10)}`);
            }
        });
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
}

// CLI Usage
async function main(): Promise<void> {
    const converter = new MentoTokenConverter();
    
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
🏛️  Mento Token to CELO Converter

Usage:
  ts-node mento-token-to-celo.ts <token> [amount]
  ts-node mento-token-to-celo.ts list
  ts-node mento-token-to-celo.ts batch <token1,token2,token3> [amount]
  ts-node mento-token-to-celo.ts quick <token>
  ts-node mento-token-to-celo.ts all

Examples:
  ts-node mento-token-to-celo.ts cUSD
  ts-node mento-token-to-celo.ts cUSD 100
  ts-node mento-token-to-celo.ts GOOD 50
  ts-node mento-token-to-celo.ts 0x765DE816845861e75A25fCA122bb6898B8B1282a 50
  ts-node mento-token-to-celo.ts list
  ts-node mento-token-to-celo.ts batch cUSD,cEUR,cREAL,GOOD
  ts-node mento-token-to-celo.ts quick GOOD
  ts-node mento-token-to-celo.ts all

Supported tokens: ${Object.keys(TOKENS).join(', ')}
        `);
        return;
    }
    
    try {
        const command = args[0].toLowerCase();
        
        switch (command) {
            case 'list':
                await converter.listAvailableTokens();
                break;
                
            case 'batch':
                const tokens = args[1] ? args[1].split(',') : ['cUSD', 'cEUR', 'cREAL', 'GOOD'];
                const amount = args[2] || '1.0';
                await converter.getBatchRates(tokens, amount);
                break;
                
            case 'quick':
                if (!args[1]) {
                    console.log('❌ Please provide a token symbol for quick rate check');
                    return;
                }
                await converter.quickRate(args[1]);
                break;
                
            case 'all':
                await converter.getAllTokenRates();
                break;
                
            default:
                const token = args[0];
                const convertAmount = args[1] || '1.0';
                await converter.getTokenToCeloRate(token, convertAmount);
                break;
        }
    } catch (error: any) {
        console.error('❌ Script failed:', error.message);
        process.exit(1);
    }
}

// Export for use as module
export default MentoTokenConverter;
export { MentoTokenConverter, TOKENS, MENTO_TOKEN_BROKER, BI_POOL_MANAGER };

// Run if called directly
if (require.main === module) {
    main();
}