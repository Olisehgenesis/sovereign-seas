# SovAds Smart Contract System Specification

## 🎯 Overview

SovAds is a decentralized advertising protocol built on EVM-compatible chains (Celo, Base) that enables Web3 websites to monetize through transparent, on-chain ad settlements. The system uses an order-based claim mechanism where publishers request rewards and admins manually approve/reject claims with flexible amounts.

## 🏗️ Core Architecture

### Smart Contract: SovAdsManager.sol

**Location**: `/contracts/contracts/SovAdsManager.sol`

**Key Features**:
- Campaign creation with ERC20 token funding
- Publisher subscription with website array management
- Order-based claim system (no automatic payouts)
- Admin-controlled fund disbursal and fee collection
- User banning/unbanning system
- Supported ERC20 tokens management

## 📋 Data Structures

### Campaign
```solidity
struct Campaign {
    uint256 id;              // Unique campaign ID
    address creator;         // Campaign creator address
    address token;           // ERC20 token used for funding
    uint256 amount;          // Total budget amount
    uint256 startTime;       // Campaign start timestamp
    uint256 endTime;         // Campaign end timestamp
    string metadataURI;       // IPFS URI for campaign metadata
    bool active;             // Campaign active status
    uint256 spent;           // Amount spent from campaign
    bool paused;             // Campaign paused status
}
```

### ClaimOrder
```solidity
struct ClaimOrder {
    uint256 id;              // Unique order ID
    address publisher;       // Publisher requesting claim
    uint256 campaignId;      // Campaign being claimed from
    uint256 requestedAmount; // Amount publisher requested
    uint256 approvedAmount;  // Amount admin approved (can differ)
    bool processed;          // Whether order was processed
    bool rejected;           // Whether order was rejected
    string reason;           // Reason for approval/rejection
    uint256 createdAt;       // Order creation timestamp
    uint256 processedAt;     // Order processing timestamp
}
```

### Publisher
```solidity
struct Publisher {
    address wallet;          // Publisher wallet address
    string[] sites;          // Array of website domains
    bool banned;             // Ban status
    uint256 totalEarned;     // Total earnings
    uint256 totalClaimed;    // Total claimed amount
    bool verified;           // Verification status
    uint256 subscriptionDate; // Subscription timestamp
}
```

## 🔧 Core Functions

### Campaign Management

#### `createCampaign(address _token, uint256 _amount, uint256 _duration, string calldata _metadataURI)`
- **Purpose**: Create new ad campaign
- **Requirements**: 
  - Token must be supported
  - Amount > 0
  - Duration > 0
  - Valid metadata URI
- **Process**: Transfers tokens from creator to contract
- **Events**: `CampaignCreated`

#### `editCampaign(uint256 _campaignId, string calldata _metadataURI, uint256 _newDuration)`
- **Purpose**: Update campaign details
- **Access**: Only campaign creator
- **Process**: Updates metadata and extends end time
- **Events**: `CampaignEdited`

#### `pauseCampaign(uint256 _campaignId)` / `resumeCampaign(uint256 _campaignId)`
- **Purpose**: Pause/resume campaign
- **Access**: Only campaign creator
- **Events**: `CampaignPaused` / `CampaignResumed`

### Publisher Management

#### `subscribePublisher(string[] calldata _sites)`
- **Purpose**: Register as publisher with websites
- **Requirements**: Not already subscribed, not banned, at least one site
- **Process**: Creates publisher record with site array
- **Events**: `PublisherSubscribed`

#### `addSite(string calldata _site)` / `removeSite(uint256 _siteIndex)`
- **Purpose**: Manage publisher's website list
- **Access**: Only publisher
- **Events**: `SiteAdded` / `SiteRemoved`

### Claim Order System

#### `createClaimOrder(uint256 _campaignId, uint256 _requestedAmount)`
- **Purpose**: Request reward payout
- **Requirements**: 
  - Must be publisher
  - Campaign must exist and be active
  - Amount > 0
  - Within campaign budget
- **Process**: Creates claim order for admin review
- **Events**: `ClaimOrderCreated`

#### `processClaimOrder(uint256 _orderId, uint256 _approvedAmount, bool _rejected, string calldata _reason)`
- **Purpose**: Admin processes claim order
- **Access**: Only contract owner
- **Process**: 
  - If rejected: Sets rejected flag
  - If approved: Transfers approved amount (can differ from requested)
  - Calculates and deducts protocol fee
  - Updates campaign spent amount
- **Events**: `ClaimOrderProcessed`

### Admin Functions

#### `banUser(address _user, string calldata _reason)` / `unbanUser(address _user)`
- **Purpose**: Ban/unban users
- **Access**: Only contract owner
- **Process**: Sets banned flag, prevents actions
- **Events**: `PublisherBanned` / `PublisherUnbanned`

#### `disburseFunds(uint256 _campaignId, address _recipient, uint256 _amount)`
- **Purpose**: Manual fund distribution
- **Access**: Only contract owner
- **Process**: Transfers tokens from campaign to recipient
- **Events**: `FundsDisbursed`

#### `collectFees(address _token, uint256 _amount)`
- **Purpose**: Collect protocol fees
- **Access**: Only contract owner
- **Process**: Transfers accumulated fees to owner
- **Events**: `FeeCollected`

#### `addSupportedToken(address _token)` / `removeSupportedToken(address _token)`
- **Purpose**: Manage supported ERC20 tokens
- **Access**: Only contract owner
- **Process**: Adds/removes tokens from supported list
- **Events**: `SupportedTokenAdded` / `SupportedTokenRemoved`

## 🛡️ Security Features

### Access Control
- **Ownable**: Contract owner has admin privileges
- **Modifiers**: Role-based access control
- **Publisher-only**: Functions restricted to registered publishers
- **Creator-only**: Campaign functions restricted to creators

### Protection Mechanisms
- **ReentrancyGuard**: Prevents reentrancy attacks
- **Pausable**: Emergency stop functionality
- **Input Validation**: Comprehensive parameter validation
- **Safe Math**: Built-in overflow protection

### State Management
- **Banned Users**: Cannot subscribe or create claims
- **Campaign States**: Active/inactive, paused/resumed
- **Order States**: Processed/unprocessed, approved/rejected

## 📊 Events & Transparency

### Campaign Events
- `CampaignCreated`: New campaign created
- `CampaignEdited`: Campaign details updated
- `CampaignPaused` / `CampaignResumed`: Campaign state changes

### Publisher Events
- `PublisherSubscribed`: New publisher registered
- `SiteAdded` / `SiteRemoved`: Website management
- `PublisherBanned` / `PublisherUnbanned`: User management

### Claim Events
- `ClaimOrderCreated`: New claim request
- `ClaimOrderProcessed`: Claim approved/rejected

### Admin Events
- `FundsDisbursed`: Manual fund distribution
- `FeeCollected`: Protocol fee collection
- `SupportedTokenAdded` / `SupportedTokenRemoved`: Token management

## 🔗 Integration Points

### Frontend Integration
- **Publisher Dashboard**: Site management, claim creation
- **Advertiser Dashboard**: Campaign creation, editing
- **Admin Dashboard**: Order processing, user management

### Backend Integration
- **Analytics**: Off-chain event tracking
- **Oracle**: Automated claim processing (future)
- **API**: Contract interaction endpoints

### Token Integration
- **ERC20 Support**: Multiple token types
- **Fee Calculation**: Automatic protocol fee deduction
- **Balance Tracking**: Real-time balance updates

## 🚀 Deployment Configuration

### Networks
- **Celo Alfajores**: Testnet deployment
- **Celo Mainnet**: Production deployment
- **Base Sepolia**: Testnet deployment
- **Base Mainnet**: Production deployment

### Default Tokens
- **cUSD**: `0x874069Fa1Eb16D44d13F0F66B92D3971647cE6c9` (Alfajores)
- **USDC**: `0x2C852e740B62308c46DD29B982FBb650D063Bd07` (Alfajores)

### Configuration
- **Protocol Fee**: 5% (configurable)
- **Gas Optimization**: 200 runs
- **Solidity Version**: 0.8.20

## 📝 Usage Examples

### Campaign Creation
```solidity
// 1. Approve tokens
IERC20(cUSD).approve(sovAdsManager.address, amount);

// 2. Create campaign
sovAdsManager.createCampaign(
    cUSD_ADDRESS,                    // Token
    ethers.utils.parseEther("100"),  // Amount
    86400,                          // Duration (1 day)
    "ipfs://QmMetadata123"          // Metadata
);
```

### Publisher Subscription
```solidity
string[] memory sites = new string[](2);
sites[0] = "example.com";
sites[1] = "test.com";

sovAdsManager.subscribePublisher(sites);
```

### Claim Order Creation
```solidity
sovAdsManager.createClaimOrder(
    1,                              // Campaign ID
    ethers.utils.parseEther("10")   // Requested amount
);
```

### Admin Claim Processing
```solidity
sovAdsManager.processClaimOrder(
    1,                              // Order ID
    ethers.utils.parseEther("8"),    // Approved amount (different from requested)
    false,                          // Not rejected
    "Approved for good performance"   // Reason
);
```

## 🔄 Workflow

### Publisher Workflow
1. **Subscribe**: Register with website domains
2. **Serve Ads**: Integrate SDK (off-chain)
3. **Track Performance**: Analytics collection (off-chain)
4. **Create Claim**: Request reward payout
5. **Receive Payment**: Admin approves and transfers tokens

### Advertiser Workflow
1. **Fund Campaign**: Deposit ERC20 tokens
2. **Create Campaign**: Set budget, duration, metadata
3. **Monitor Performance**: View analytics (off-chain)
4. **Manage Campaign**: Edit, pause, resume as needed

### Admin Workflow
1. **Review Claims**: Examine publisher performance
2. **Process Orders**: Approve/reject with custom amounts
3. **Manage Users**: Ban/unban as needed
4. **Collect Fees**: Withdraw protocol fees
5. **Token Management**: Add/remove supported tokens

## 🎯 Key Benefits

### For Publishers
- **Transparent Payouts**: On-chain claim orders
- **Flexible Approval**: Admin can adjust amounts
- **Multiple Sites**: Manage multiple websites
- **Fair Process**: Clear approval/rejection reasons

### For Advertisers
- **Full Control**: Manage campaigns directly
- **Budget Tracking**: Real-time spending monitoring
- **Token Flexibility**: Use any supported ERC20
- **Campaign Management**: Pause, edit, extend

### For Admins
- **Manual Review**: Control over all payouts
- **Fraud Prevention**: Ban suspicious users
- **Fee Collection**: Protocol revenue
- **Token Management**: Add new payment options

## 🔮 Future Enhancements

### Planned Features
- **Multi-signature Admin**: Enhanced security
- **Time-locked Actions**: Delayed admin functions
- **Automated Processing**: AI-powered claim approval
- **Cross-chain Support**: Multi-chain deployment
- **Advanced Analytics**: On-chain metrics storage

### Integration Opportunities
- **Oracle Networks**: Automated claim processing
- **DeFi Protocols**: Yield farming for idle funds
- **NFT Integration**: NFT-based ad formats
- **Governance Token**: DAO-based protocol management

## 📋 Implementation Checklist

### Contract Features ✅
- [x] Campaign creation with ERC20 funding
- [x] Campaign editing and management
- [x] Publisher subscription with site arrays
- [x] Order-based claim system
- [x] Admin approval/rejection with custom amounts
- [x] User banning/unbanning
- [x] Fund disbursal and fee collection
- [x] Supported tokens management
- [x] Security features (ReentrancyGuard, Pausable)
- [x] Comprehensive events and transparency

### Deployment Ready ✅
- [x] Hardhat configuration
- [x] Deployment scripts
- [x] Testing suite
- [x] Verification scripts
- [x] Documentation
- [x] Environment setup

### Integration Ready ✅
- [x] Frontend contract interfaces
- [x] Backend integration points
- [x] Event monitoring
- [x] Error handling
- [x] Gas optimization

This specification provides a complete overview of the SovAds smart contract system, ready for AI-assisted development and integration with the existing frontend infrastructure.
