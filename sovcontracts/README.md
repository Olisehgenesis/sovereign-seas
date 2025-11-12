# Sample Hardhat 3 Beta Project (`node:test` and `viem`)

This project showcases a Hardhat 3 Beta project using the native Node.js test runner (`node:test`) and the `viem` library for Ethereum interactions.

To learn more about the Hardhat 3 Beta, please visit the [Getting Started guide](https://hardhat.org/docs/getting-started#getting-started-with-hardhat-3). To share your feedback, join our [Hardhat 3 Beta](https://hardhat.org/hardhat3-beta-telegram-group) Telegram group or [open an issue](https://github.com/NomicFoundation/hardhat/issues/new) in our GitHub issue tracker.

## Project Overview

This example project includes:

- A simple Hardhat configuration file.
- Foundry-compatible Solidity unit tests.
- TypeScript integration tests using [`node:test`](nodejs.org/api/test.html), the new Node.js native test runner, and [`viem`](https://viem.sh/).
- Examples demonstrating how to connect to different types of networks, including locally simulating OP mainnet.

## Usage

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat test
```

You can also selectively run the Solidity or `node:test` tests:

```shell
npx hardhat test solidity
npx hardhat test nodejs
```

### Make a deployment to Sepolia

This project includes an example Ignition module to deploy the contract. You can deploy this module to a locally simulated chain or to Sepolia.

To run the deployment to a local chain:

```shell
npx hardhat ignition deploy ignition/modules/Counter.ts
```

To run the deployment to Sepolia, you need an account with funds to send the transaction. The provided Hardhat configuration includes a Configuration Variable called `SEPOLIA_PRIVATE_KEY`, which you can use to set the private key of the account you want to use.

You can set the `SEPOLIA_PRIVATE_KEY` variable using the `hardhat-keystore` plugin or by setting it as an environment variable.

To set the `SEPOLIA_PRIVATE_KEY` config variable using `hardhat-keystore`:

```shell
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

After setting the variable, you can run the deployment with the Sepolia network:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```

## Deploying MilestoneBasedFunding Contract

The MilestoneBasedFunding contract interacts with the deployed SovereignSeasV4 contract:
- **Celo Mainnet**: [0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a](https://celoscan.io/address/0x0cc096b1cc568a22c1f02dab769881d1afe6161a#code) (hardcoded)
- **Celo Sepolia**: Set `SEAS4_SEPOLIA_ADDRESS` in your `.env` file if Seas4 is deployed on Sepolia

### Setting Up Private Keys with dotenvx

This project uses [dotenvx](https://dotenvx.sh) to securely manage environment variables from `.env` files. All scripts automatically load variables from `.env` files.

1. **Create a `.env` file** in the project root:

```bash
# .env file
# You can use a single PRIVATE_KEY for all networks, or set specific keys for each network
PRIVATE_KEY=your_private_key_here_without_0x_prefix

# Or set specific keys for each network:
# CELO_PRIVATE_KEY=your_celo_mainnet_private_key_here
# CELO_SEPOLIA_PRIVATE_KEY=your_celo_sepolia_private_key_here
# SEPOLIA_PRIVATE_KEY=your_sepolia_private_key_here

# RPC URLs (optional - defaults are used if not set)
# CELO_RPC_URL=https://forno.celo.org
# CELO_SEPOLIA_RPC_URL=https://forno.celo-sepolia.org

# Seas4 Contract Addresses (optional - mainnet address is hardcoded)
# SEAS4_SEPOLIA_ADDRESS=0x... (set if Seas4 is deployed on Celo Sepolia)
```

2. **The `.env` file is automatically ignored by git** (already in `.gitignore`)

3. **All npm scripts use dotenvx** to automatically load your `.env` file - no additional setup needed!

**Alternative: Using Hardhat Keystore**

You can also use Hardhat's keystore (scripts will fallback to it if `.env` is not set):

```shell
npx hardhat keystore set PRIVATE_KEY
# or
npx hardhat keystore set CELO_PRIVATE_KEY
npx hardhat keystore set CELO_SEPOLIA_PRIVATE_KEY
```

### Deployment Options

#### Option 1: Using Hardhat Script (Simple)

Deploy to Celo Mainnet:
```shell
pnpm run deploy:milestone:celo
```

Deploy to Celo Sepolia Testnet:
```shell
pnpm run deploy:milestone:celo-sepolia
```

#### Option 2: Using Hardhat Ignition (Recommended for Production)

Deploy to Celo Mainnet:
```shell
pnpm run deploy:milestone:ignition:celo
```

Deploy to Celo Sepolia Testnet:
```shell
pnpm run deploy:milestone:ignition:celo-sepolia
```

### Verification

After deployment, verify the contract on CeloScan:
- Celo Mainnet: `https://celoscan.io/address/<DEPLOYED_ADDRESS>#code`
- Celo Sepolia: `https://sepolia.celoscan.io/address/<DEPLOYED_ADDRESS>#code`

The deployment script will automatically verify the Seas4 contract address and display the deployed contract address with verification links.
