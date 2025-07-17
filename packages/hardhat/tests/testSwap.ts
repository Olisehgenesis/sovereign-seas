import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, getContract } from 'viem'
import { celo } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import 'dotenv/config'

// Uniswap V3 Contract Addresses on Celo
const POOL_FACTORY_CONTRACT_ADDRESS = '0xAfE208a311B21f13EF87E33A90049fC17A7acDEc'
const QUOTER_CONTRACT_ADDRESS = '0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8'
const SWAP_ROUTER_CONTRACT_ADDRESS = '0x5615CDAb10dc425a742d643d949a7F474C01abc4'

// Contract ABIs (simplified for this example)
const FACTORY_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "tokenA", "type": "address"},
      {"internalType": "address", "name": "tokenB", "type": "address"},
      {"internalType": "uint24", "name": "fee", "type": "uint24"}
    ],
    "name": "getPool",
    "outputs": [{"internalType": "address", "name": "pool", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
]

const QUOTER_ABI = [
  {
    "inputs": [
      {
        "components": [
          {"internalType": "address", "name": "tokenIn", "type": "address"},
          {"internalType": "address", "name": "tokenOut", "type": "address"},
          {"internalType": "uint24", "name": "fee", "type": "uint24"},
          {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
          {"internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160"}
        ],
        "internalType": "struct IQuoterV2.QuoteExactInputSingleParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "quoteExactInputSingle",
    "outputs": [
      {"internalType": "uint256", "name": "amountOut", "type": "uint256"},
      {"internalType": "uint160", "name": "sqrtPriceX96After", "type": "uint160"},
      {"internalType": "uint32", "name": "initializedTicksCrossed", "type": "uint32"},
      {"internalType": "uint256", "name": "gasEstimate", "type": "uint256"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

const SWAP_ROUTER_ABI = [
  {
    "inputs": [
      {
        "components": [
          {"internalType": "address", "name": "tokenIn", "type": "address"},
          {"internalType": "address", "name": "tokenOut", "type": "address"},
          {"internalType": "uint24", "name": "fee", "type": "uint24"},
          {"internalType": "address", "name": "recipient", "type": "address"},
          {"internalType": "uint256", "name": "deadline", "type": "uint256"},
          {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
          {"internalType": "uint256", "name": "amountOutMinimum", "type": "uint256"},
          {"internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160"}
        ],
        "internalType": "struct ISwapRouter.ExactInputSingleParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "exactInputSingle",
    "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
    "stateMutability": "payable",
    "type": "function"
  }
]

const POOL_ABI = [
  {
    "inputs": [],
    "name": "fee",
    "outputs": [{"internalType": "uint24", "name": "", "type": "uint24"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token0",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token1",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
]

const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
]

// Create clients
const publicClient = createPublicClient({
  chain: celo,
  transport: http(process.env.RPC_URL || 'https://forno.celo.org')
})

const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`)
const walletClient = createWalletClient({
  account,
  chain: celo,
  transport: http(process.env.RPC_URL || 'https://forno.celo.org')
})

// Default token addresses on Celo
const DEFAULT_TOKENS = {
  CELO: '0x471EcE3750Da237f93B8E339c536989b8978a438', // Wrapped CELO
  cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a', // Celo Dollar
  cEUR: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73', // Celo Euro
  cREAL: '0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787' // Celo Real
}

async function getTokenInfo(tokenAddress) {
  const tokenContract = getContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    client: publicClient
  })

  const [decimals, symbol] = await Promise.all([
    tokenContract.read.decimals(),
    tokenContract.read.symbol()
  ])

  return { decimals, symbol, address: tokenAddress }
}

async function approveToken(tokenAddress, amount, decimals) {
  try {
    const tokenContract = getContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      client: walletClient
    })

    const amountToApprove = parseUnits(amount.toString(), decimals)

    console.log(`-------------------------------`)
    console.log(`Sending Approval Transaction...`)
    console.log(`-------------------------------`)

    const hash = await tokenContract.write.approve([
      SWAP_ROUTER_CONTRACT_ADDRESS,
      amountToApprove
    ])

    console.log(`Transaction Sent: ${hash}`)
    console.log(`-------------------------------`)

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`Approval Transaction Confirmed! https://celoscan.io/tx/${receipt.transactionHash}`)
    
    return amountToApprove
  } catch (error) {
    console.error("An error occurred during token approval:", error)
    throw new Error("Token approval failed")
  }
}

async function getPoolInfo(tokenIn, tokenOut) {
  const factoryContract = getContract({
    address: POOL_FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    client: publicClient
  })

  const poolAddress = await factoryContract.read.getPool([tokenIn.address, tokenOut.address, 3000])
  
  if (!poolAddress || poolAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error("Failed to get pool address - pool may not exist")
  }

  const poolContract = getContract({
    address: poolAddress,
    abi: POOL_ABI,
    client: publicClient
  })

  const [token0, token1, fee] = await Promise.all([
    poolContract.read.token0(),
    poolContract.read.token1(),
    poolContract.read.fee()
  ])

  return { poolContract, poolAddress, token0, token1, fee }
}

async function getQuote(tokenIn, tokenOut, fee, amountIn) {
  const quoterContract = getContract({
    address: QUOTER_CONTRACT_ADDRESS,
    abi: QUOTER_ABI,
    client: publicClient
  })

  const quoteParams = {
    tokenIn: tokenIn.address,
    tokenOut: tokenOut.address,
    fee: fee,
    amountIn: amountIn,
    sqrtPriceLimitX96: 0n
  }

  try {
    const [amountOut] = await quoterContract.read.quoteExactInputSingle([quoteParams])
    
    console.log(`-------------------------------`)
    console.log(`Token Swap will result in: ${formatUnits(amountOut, tokenOut.decimals)} ${tokenOut.symbol} for ${formatUnits(amountIn, tokenIn.decimals)} ${tokenIn.symbol}`)
    console.log(`-------------------------------`)
    
    return amountOut
  } catch (error) {
    console.error("Error getting quote:", error)
    throw new Error("Failed to get swap quote")
  }
}

async function executeSwap(tokenIn, tokenOut, fee, amountIn, amountOutMinimum) {
  const swapRouter = getContract({
    address: SWAP_ROUTER_CONTRACT_ADDRESS,
    abi: SWAP_ROUTER_ABI,
    client: walletClient
  })

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20) // 20 minutes from now

  const swapParams = {
    tokenIn: tokenIn.address,
    tokenOut: tokenOut.address,
    fee: fee,
    recipient: account.address,
    deadline: deadline,
    amountIn: amountIn,
    amountOutMinimum: amountOutMinimum,
    sqrtPriceLimitX96: 0n
  }

  try {
    console.log(`-------------------------------`)
    console.log(`Executing Swap...`)
    console.log(`-------------------------------`)

    const hash = await swapRouter.write.exactInputSingle([swapParams])
    
    console.log(`Transaction Sent: ${hash}`)
    console.log(`-------------------------------`)

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`Swap Transaction Confirmed! https://celoscan.io/tx/${receipt.transactionHash}`)
    console.log(`-------------------------------`)

    return receipt
  } catch (error) {
    console.error("Error executing swap:", error)
    throw new Error("Swap execution failed")
  }
}

async function swapTokens(tokenInAddress, tokenOutAddress, amount, slippageTolerance = 0.5) {
  try {
    // Get token information
    const [tokenIn, tokenOut] = await Promise.all([
      getTokenInfo(tokenInAddress),
      getTokenInfo(tokenOutAddress)
    ])

    console.log(`-------------------------------`)
    console.log(`Swapping ${amount} ${tokenIn.symbol} to ${tokenOut.symbol}`)
    console.log(`-------------------------------`)

    // Parse the input amount
    const amountIn = parseUnits(amount.toString(), tokenIn.decimals)

    // Approve tokens
    await approveToken(tokenIn.address, amount, tokenIn.decimals)

    // Get pool information
    const { poolContract, fee } = await getPoolInfo(tokenIn, tokenOut)

    // Get quote
    const amountOut = await getQuote(tokenIn, tokenOut, fee, amountIn)

    // Calculate minimum amount out with slippage tolerance
    const slippageMultiplier = BigInt(Math.floor((100 - slippageTolerance) * 100))
    const amountOutMinimum = (amountOut * slippageMultiplier) / 10000n

    console.log(`Minimum amount out (${slippageTolerance}% slippage): ${formatUnits(amountOutMinimum, tokenOut.decimals)} ${tokenOut.symbol}`)

    // Execute swap
    await executeSwap(tokenIn, tokenOut, fee, amountIn, amountOutMinimum)

    console.log(`-------------------------------`)
    console.log(`Swap completed successfully!`)
    console.log(`-------------------------------`)

  } catch (error) {
    console.error("An error occurred during the swap:", error.message)
    process.exit(1)
  }
}

// Main execution
async function main() {
  // Parse command line arguments, filtering out flags
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'))
  
  if (args.length < 3) {
    console.log(`
Usage: node swap.js <tokenInAddress> <tokenOutAddress> <amount> [slippageTolerance]

Examples:
  # Swap 1 CELO for cUSD
  node swap.js ${DEFAULT_TOKENS.CELO} ${DEFAULT_TOKENS.cUSD} 1

  # Swap 10 cUSD for CELO with 1% slippage tolerance
  node swap.js ${DEFAULT_TOKENS.cUSD} ${DEFAULT_TOKENS.CELO} 10 1

Available default tokens:
  CELO: ${DEFAULT_TOKENS.CELO}
  cUSD: ${DEFAULT_TOKENS.cUSD}
  cEUR: ${DEFAULT_TOKENS.cEUR}
  cREAL: ${DEFAULT_TOKENS.cREAL}

Note: Flags like --network are automatically filtered out.
    `)
    process.exit(1)
  }

  const tokenInAddress = args[0]
  const tokenOutAddress = args[1]
  const amount = parseFloat(args[2])
  const slippageTolerance = args[3] ? parseFloat(args[3]) : 0.5

  // Validate addresses
  if (!tokenInAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    console.error(`Invalid tokenIn address: ${tokenInAddress}`)
    process.exit(1)
  }
  
  if (!tokenOutAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    console.error(`Invalid tokenOut address: ${tokenOutAddress}`)
    process.exit(1)
  }

  if (isNaN(amount) || amount <= 0) {
    console.error(`Invalid amount: ${amount}`)
    process.exit(1)
  }

  await swapTokens(tokenInAddress, tokenOutAddress, amount, slippageTolerance)
}

// Run the script
main().catch(console.error)