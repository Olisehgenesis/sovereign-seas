# SovAds Smart Contracts

## Overview

SovAds is a decentralized advertising system that allows crypto and Web3 websites (publishers) to serve ads and earn revenue from verified impressions and clicks. Advertisers create and fund campaigns with stablecoins, and publishers integrate ads via an SDK. SovAds ensures transparent, fraud-resistant, and on-chain accountable ad settlements.

## Contract Features

### 🎯 Campaign Management
- **Create Campaign**: Advertisers can create campaigns with ERC20 token funding
- **Edit Campaign**: Campaign creators can update metadata and extend duration
- **Pause/Resume**: Campaign creators can pause and resume their campaigns
- **Budget Tracking**: Real-time tracking of campaign spending

### 👥 Publisher Management
- **Subscribe**: Publishers register with their website domains
- **Site Management**: Add/remove websites from publisher's portfolio
- **Verification**: Admin can verify publishers
- **Ban/Unban**: Admin can ban/unban publishers

### 💰 Order-Based Claim System
- **Create Claim Order**: Publishers request rewards for their performance
- **Admin Review**: Admin reviews and approves/rejects claims
- **Flexible Approval**: Admin can approve different amounts than requested
- **Transparent Process**: All claim orders are tracked on-chain

### 🔧 Admin Functions
- **Fund Disbursal**: Manual fund distribution to recipients
- **Fee Collection**: Collect protocol fees
- **User Management**: Ban/unban users
- **Token Management**: Add/remove supported ERC20 tokens
- **Fee Configuration**: Set protocol fee percentage

### 🛡️ Security Features
- **Reentrancy Protection**: Prevents reentrancy attacks
- **Pausable**: Contract can be paused in emergencies
- **Access Control**: Role-based access control
- **Input Validation**: Comprehensive input validation

## Contract Architecture

### SovAdsManager.sol
Main contract that manages:
- Campaign lifecycle with on-chain JSON metadata
- Publisher registration
- Claim order processing
- Admin functions
- Fee management

## Supported Networks

- **Celo Alfajores** (Testnet): `0x874069Fa1Eb16D44d13F0F66B92D3971647cE6c9` (cUSD)
- **Celo Mainnet**: Production deployment
- **Base Sepolia** (Testnet): Test deployment
- **Base Mainnet**: Production deployment

## Supported Tokens

The contract supports multiple ERC20 tokens:
- **cUSD** (Celo Dollar)
- **USDC** (USD Coin)
- **Custom tokens** (added by admin)

## Usage Examples

### 1. Deploy Contract
```bash
# Install dependencies
npm install

# Deploy to Celo Alfajores
npm run deploy:alfajores

# Deploy to Base Sepolia
npm run deploy:base
```

### 2. Create Campaign
```solidity
// Approve tokens first
IERC20(cUSD).approve(sovAdsManager.address, amount);

// Create campaign with JSON metadata
string memory metadata = '{"name":"DeFi Campaign","description":"Promote DeFi","banner":"https://example.com/banner.png","targetUrl":"https://celo.org","tags":["DeFi","Celo"]}';

sovAdsManager.createCampaign(
    cUSD_ADDRESS,           // Token address
    ethers.utils.parseEther("100"), // Amount
    86400,                  // Duration (1 day)
    metadata                // JSON metadata stored on-chain
);
```

### 3. Subscribe as Publisher
```solidity
string[] memory sites = new string[](2);
sites[0] = "example.com";
sites[1] = "test.com";

sovAdsManager.subscribePublisher(sites);
```

### 4. Create Claim Order
```solidity
sovAdsManager.createClaimOrder(
    1,                      // Campaign ID
    ethers.utils.parseEther("10") // Requested amount
);
```

### 5. Process Claim Order (Admin)
```solidity
sovAdsManager.processClaimOrder(
    1,                      // Order ID
    ethers.utils.parseEther("8"),  // Approved amount
    false,                  // Not rejected
    "Approved for good performance" // Reason
);
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run coverage
```

## Deployment Scripts

- `deploy.ts`: Main deployment script
- `interact.ts`: Contract interaction examples
- `verify.ts`: Contract verification script

## Environment Setup

1. Copy `env.example` to `.env`
2. Add your private key and RPC URLs
3. Add API keys for contract verification

## Gas Optimization

The contract is optimized for gas efficiency:
- Packed structs
- Efficient storage patterns
- Minimal external calls
- Optimized loops

## Security Considerations

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Pausable**: Emergency stop functionality
- **Access Control**: Role-based permissions
- **Input Validation**: Comprehensive checks
- **Safe Math**: Overflow protection

## Events

All important actions emit events for transparency:
- `CampaignCreated`
- `PublisherSubscribed`
- `ClaimOrderCreated`
- `ClaimOrderProcessed`
- `PublisherBanned`
- `FundsDisbursed`
- `FeeCollected`

## Integration with Frontend

The contract integrates with the SovAds frontend:
- Publisher dashboard for site management
- Advertiser dashboard for campaign creation
- Admin dashboard for order processing
- Real-time analytics and reporting

## Future Enhancements

- Multi-signature admin functions
- Time-locked admin actions
- Automated claim processing
- Cross-chain support
- Advanced fraud detection
- Token staking mechanisms
