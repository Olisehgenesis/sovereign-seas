# SovereignSeas Good Dollar Bridge

A comprehensive bridge contract that integrates SovereignSeas with the Good Dollar ecosystem on Celo, enabling automatic Good Dollar distribution for projects and campaigns.

## 🌟 Features

- **Project Creation Rewards**: Automatically reward project creators with Good Dollars
- **Campaign Pool Management**: Create and manage Good Dollar pools for campaigns
- **Automatic Distribution**: Distribute Good Dollars based on votes or custom percentages
- **Factory Pattern**: Deploy multiple bridge instances through a factory contract
- **Role-Based Access Control**: Secure role management for different operations
- **Upgradeable Contracts**: Built with OpenZeppelin upgradeable patterns

## 🏗️ Architecture

### Contracts

1. **SovereignSeasGoodDollarBridge**: Main bridge contract
   - Manages project creation rewards
   - Handles campaign Good Dollar pools
   - Distributes Good Dollars based on voting or custom rules
   - Integrates with Good Dollar Direct Payments system

2. **SovereignSeasGoodDollarBridgeFactory**: Factory contract
   - Deploys new bridge instances
   - Manages bridge templates and configurations
   - Provides analytics and management tools

### Key Components

- **Project Rewards**: 50 G$ per project creation (configurable)
- **Campaign Pools**: 1000 G$ default pool size (configurable)
- **Good Dollar Integration**: Direct integration with Celo Good Dollar ecosystem
- **Voting Distribution**: Automatic distribution based on campaign votes
- **Custom Distribution**: Support for custom percentage-based distribution

## 🚀 Deployment

### Prerequisites

- Node.js 18+ and pnpm
- Hardhat environment configured for Celo
- Private key with CELO and Good Dollars
- SovereignSeas contract address (optional)

### Quick Deployment

```bash
# Deploy to Celo mainnet
npx hardhat run scripts/deploy-good-dollar-bridge.ts --network celo <SOVEREIGN_SEAS_ADDRESS>

# Or use the integrated deploy script
npm run deploy:good-dollar-bridge
```

### Environment Variables

Create a `.env` file:

```env
PRIVATE_KEY=your_private_key_here
SOVEREIGN_SEAS_ADDRESS=0x... # Optional: SovereignSeas contract address
CELOSCAN_API_KEY=your_celoscan_api_key # For contract verification
```

### Deployment Steps

1. **Deploy Bridge Implementation**: Creates the upgradeable implementation contract
2. **Deploy Factory**: Creates the factory contract with proxy
3. **Deploy First Bridge**: Creates the first bridge instance (if SovereignSeas address provided)
4. **Fund Bridge**: Automatically funds the bridge with Good Dollars for rewards

### Configuration

The deployment script automatically configures:

- **Deployment Fee**: 0.01 CELO per bridge deployment
- **Max Bridges per User**: 10 bridges maximum
- **Default Pool Size**: 1000 G$ per campaign
- **Project Reward**: 50 G$ per project creation

## 🛠️ Management Scripts

### Role Management

```bash
# List all roles and members
npx hardhat run scripts/grant-roles.ts --network celo list

# Grant admin role to address
npx hardhat run scripts/grant-roles.ts --network celo grant admin 0x1234...

# View specific role members
npx hardhat run scripts/grant-roles.ts --network celo view operator

# Revoke role from address
npx hardhat run scripts/grant-roles.ts --network celo revoke admin 0x1234...
```

### Bridge Funding

```bash
# Check bridge balance
npx hardhat run scripts/fund-bridge.ts --network celo check

# Fund bridge with Good Dollars
npx hardhat run scripts/fund-bridge.ts --network celo fund 1000

# List all bridges
npx hardhat run scripts/fund-bridge.ts --network celo list

# Withdraw from bridge (admin only)
npx hardhat run scripts/fund-bridge.ts --network celo withdraw 500
```

## 📊 Usage Examples

### Creating a Project

```typescript
// Project creation parameters
const projectParams = {
  name: "My Awesome Project",
  description: "A revolutionary project description",
  bio: "Project creator bio",
  contractInfo: "Contract information",
  additionalData: "Additional metadata",
  contracts: [], // Array of contract addresses
  transferrable: false
};

// Create project and receive Good Dollar reward
const projectId = await bridge.createProjectWithReward(projectParams);
// Automatically receives 50 G$ reward
```

### Creating a Campaign

```typescript
// Campaign creation parameters
const campaignParams = {
  name: "Community Campaign",
  description: "Campaign description",
  mainInfo: "Main campaign information",
  additionalInfo: "Additional details",
  startTime: Math.floor(Date.now() / 1000),
  endTime: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
  adminFeePercentage: 500, // 5%
  maxWinners: 10,
  useQuadraticDistribution: true,
  useCustomDistribution: false,
  customDistributionData: "",
  payoutToken: "0x...", // Token address
  feeToken: "0x...", // Fee token address
  goodDollarPoolAmount: ethers.parseEther("2000"), // 2000 G$
  poolProjectId: "campaign-001",
  poolIpfs: "Qm..."
};

// Create campaign with Good Dollar pool
const campaignId = await bridge.createCampaignWithGoodDollarPool(campaignParams, {
  value: ethers.parseEther("0.1") // Campaign fee
});
```

### Distributing Good Dollars

```typescript
// Distribute based on votes (automatic)
await bridge.distributeGoodDollars(campaignId);

// Or set custom distribution
const projectIds = [1, 2, 3];
const percentages = [4000, 3500, 2500]; // 40%, 35%, 25%
await bridge.setCustomDistribution(campaignId, projectIds, percentages);
await bridge.distributeGoodDollars(campaignId);
```

## 🔧 Configuration

### Bridge Settings

```typescript
// Update default pool size
await bridge.updateGoodDollarPoolSize(ethers.parseEther("2000")); // 2000 G$

// Update project creation reward
await bridge.updateProjectCreationReward(ethers.parseEther("100")); // 100 G$

// Pause/unpause bridge
await bridge.pause();
await bridge.unpause();
```

### Factory Settings

```typescript
// Update deployment fee
await factory.updateDeploymentFee(ethers.parseEther("0.02")); // 0.02 CELO

// Update max bridges per user
await factory.updateMaxBridgesPerUser(20);

// Grant deployer role
await factory.grantDeployerRole(userAddress);
```

## 🧪 Testing

### Local Testing

```bash
# Run tests
npm test

# Run specific test file
npx hardhat test test/GoodDollarBridge.test.ts

# Run with coverage
npm run coverage
```

### Testnet Testing

```bash
# Deploy to Alfajores testnet
npx hardhat run scripts/deploy-good-dollar-bridge.ts --network alfajores

# Test on testnet
npx hardhat run scripts/test-bridge.ts --network alfajores
```

## 🔍 Verification

### Contract Verification

```bash
# Verify on Celoscan
npx hardhat verify --network celo <CONTRACT_ADDRESS> [CONSTRUCTOR_ARGS]

# Verify factory
npx hardhat verify --network celo <FACTORY_ADDRESS> <ADMIN_ADDRESS> <IMPLEMENTATION_ADDRESS>

# Verify bridge proxy
npx hardhat verify --network celo <BRIDGE_ADDRESS>
```

## 📈 Monitoring

### Key Metrics

- **Total Projects Created**: Track project creation activity
- **Total Campaigns**: Monitor campaign deployment
- **Good Dollars Distributed**: Track total G$ distributed
- **Bridge Utilization**: Monitor bridge usage patterns

### Events to Monitor

- `ProjectCreated`: New project creation
- `CampaignCreated`: New campaign deployment
- `GoodDollarDistributed`: G$ distribution events
- `ProjectGoodDollarReceived`: Individual project rewards

## 🚨 Emergency Procedures

### Pausing the Bridge

```typescript
// Pause all operations
await bridge.pause();

// Unpause when safe
await bridge.unpause();
```

### Emergency Recovery

```typescript
// Recover stuck tokens
await bridge.emergencyRecovery(
  tokenAddress,    // Token to recover
  recipientAddress, // Recipient address
  amount           // Amount to recover
);
```

### Upgrading Contracts

```typescript
// Upgrade bridge implementation
await factory.updateImplementation(newImplementationAddress);

// Upgrade specific bridge
await factory.upgradeBridge(bridgeAddress, newImplementationAddress);
```

## 🔐 Security Considerations

- **Role Management**: Regularly review and update role assignments
- **Access Control**: Limit admin access to trusted addresses
- **Fund Limits**: Set reasonable limits for pool sizes and rewards
- **Pause Functionality**: Use pause function during emergencies
- **Upgrade Control**: Control who can upgrade contracts

## 📚 Additional Resources

- [Good Dollar Documentation](https://docs.gooddollar.org/)
- [Celo Network Information](https://docs.celo.org/)
- [OpenZeppelin Upgradeable Contracts](https://docs.openzeppelin.com/upgrades-plugins/)
- [Hardhat Documentation](https://hardhat.org/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Join the SovereignSeas community
- Contact the development team

---

**Note**: This bridge integrates with live Good Dollar contracts on Celo mainnet. Always test thoroughly on testnets before mainnet deployment.
