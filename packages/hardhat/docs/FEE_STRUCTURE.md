# SovereignSeas V5 Fee Structure

## Overview

The SovereignSeas V5 system implements a flexible, dynamic fee structure where:

- **Global fees are in CELO by default** - These are set by admins and apply to all operations
- **Campaigns can override with custom fee tokens** - Individual campaigns can specify their own fee tokens and amounts
- **Fees are dynamically configurable** - Admins can update fees for testing and production use

## Fee Types

### 1. Project Creation Fees
- **Location**: ProjectsModule
- **Default**: 0.5 CELO
- **Configurable**: Yes (admin only)
- **Token**: Always CELO (global setting)

### 2. Campaign Creation Fees
- **Location**: TreasuryModule
- **Default**: 0.5 CELO
- **Configurable**: Yes (admin only)
- **Token**: Always CELO (global setting)

### 3. Project Addition Fees (Adding projects to campaigns)
- **Location**: CampaignsModule
- **Default**: 0.5 CELO (from TreasuryModule)
- **Configurable**: Yes (campaign admin or global admin)
- **Token**: CELO (default) or custom campaign token

### 4. Voting Fees
- **Location**: CampaignsModule
- **Default**: 0.5 CELO (from TreasuryModule)
- **Configurable**: Yes (campaign admin or global admin)
- **Token**: CELO (default) or custom campaign token

### 5. Admin Fees (Percentage of campaign funds)
- **Location**: CampaignsModule
- **Default**: 5%
- **Configurable**: Yes (campaign admin or global admin)
- **Token**: CELO (default) or custom campaign token

### 6. Platform Distribution Fees
- **Location**: TreasuryModule
- **Default**: 15%
- **Configurable**: Yes (admin only)
- **Token**: Always CELO

## Fee Management Functions

### Treasury Module (Global Fees)

```solidity
// Set all fees to zero for testing
function setZeroFeesForTesting() external onlyAdmin

// Set all fees to 0.1 CELO for testing
function setTestFees() external onlyAdmin

// Update fee structure completely
function updateFeeStructure(
    uint256 _platformFeePercentage,
    uint256 _campaignCreationFee,
    uint256 _projectAdditionFee,
    uint256 _projectCreationFee,
    bool _feesEnabled
) external onlyAdmin

// Update specific fee amounts
function updateFeeAmounts(
    uint256 _campaignCreationFee,
    uint256 _projectAdditionFee,
    uint256 _projectCreationFee
) external onlyAdmin

// Toggle fees on/off
function toggleFees(bool _feesEnabled) external onlyAdmin
```

### Campaigns Module (Campaign-Specific Fees)

```solidity
// Set all default fees to zero (only affects campaigns using default fees)
function setZeroFeesForTesting() external onlyAdmin

// Set all default fees to 0.1 CELO (only affects campaigns using default fees)
function setTestFees() external onlyAdmin

// Update global campaign fees (only affects campaigns using default fees)
function updateGlobalCampaignFees(
    uint256 _adminFeePercentage,
    address _defaultFeeToken
) external onlyAdmin

// Update global project addition fees (only affects campaigns using default fees)
function updateGlobalProjectAdditionFees(
    address _defaultProjectAdditionFeeToken,
    uint256 _defaultProjectAdditionFeeAmount
) external onlyAdmin

// Update specific campaign fees
function updateCampaignFees(
    uint256 _campaignId,
    uint256 _adminFeePercentage,
    address _feeToken,
    uint256 _projectAdditionFeeAmount,
    uint256 _votingFee
) external onlyCampaignAdmin

// Update project addition fee token for specific campaign
function updateProjectAdditionFeeToken(
    uint256 _campaignId,
    address _newToken
) external onlyCampaignAdmin

// Get campaigns by fee type
function getCampaignsByFeeType() external view returns (
    uint256[] memory customFeeCampaigns,
    uint256[] memory defaultFeeCampaigns
)

// Get campaign fee configuration
function getCampaignFeeConfig(uint256 _campaignId) external view returns (
    uint256 adminFeePercentage,
    address feeToken,
    address projectAdditionFeeToken,
    uint256 projectAdditionFeeAmount,
    uint256 votingFee,
    bool usesCustomFees
)
```

### Projects Module (Project Creation Fees)

```solidity
// Set project creation fee to zero for testing
function setZeroProjectCreationFeeForTesting() external onlyAdmin

// Set project creation fee to 0.1 CELO for testing
function setTestProjectCreationFee() external onlyAdmin

// Update project creation fee amount
function updateProjectCreationFee(uint256 _newFee) external onlyAdmin

// Toggle project creation fees on/off
function toggleProjectCreationFees(bool _feesEnabled) external onlyAdmin
```

## Usage Examples

### Setting All Fees to Zero for Testing

```bash
# Set all global fees to zero
npx hardhat run scripts/set-zero-fees.ts --network alfajores
```

### Setting All Fees to 0.1 CELO for Testing

```bash
# Set all global fees to 0.1 CELO
npx hardhat run scripts/set-test-fees.ts --network alfajores
```

### Running Comprehensive Fee Tests

```bash
# Run all fee management tests
npx hardhat run scripts/tests/fee-management-test.ts --network alfajores
```

### Testing JSON Metadata Functionality

```bash
# Test JSON metadata for projects and campaigns
npx hardhat run scripts/tests/json-metadata-test.ts --network alfajores
```

## Environment Variables Required

```bash
export ADMIN_PRIVATE_KEY="your_admin_private_key"
export TEST_USER_PRIVATE_KEY="your_test_user_private_key"
export NETWORK="alfajores"
export RPC_URL="https://alfajores-forno.celo-testnet.org"
```

## Fee Priority

1. **Campaign-Specific Fees**: If a campaign has custom fee tokens/amounts, these take precedence
2. **Global Default Fees**: If no campaign-specific fees are set, global defaults are used
3. **Zero Fees**: If fees are disabled globally, no fees are collected

## Important Notes

- **Global fee updates only affect campaigns using default fees**
- **Campaigns with custom fee tokens are unaffected by global fee changes**
- **All global fees are always in CELO**
- **Campaigns can choose any supported token for their fees**
- **Fee changes are immediate and affect new operations only**
- **Existing campaign participants are not affected by fee changes**

## Testing Scenarios

### Scenario 1: Zero Fees for Testing
- All global fees set to 0 CELO
- Users can create projects and participate in campaigns without fees
- Campaigns with custom fee tokens maintain their fees

### Scenario 2: Test Fees (0.1 CELO)
- All global fees set to 0.1 CELO
- Standard fee collection for testing
- Campaigns with custom fee tokens maintain their fees

### Scenario 3: Production Fees
- Global fees set to production amounts
- Standard fee collection for production use
- Campaigns can still override with custom fees

## Security Considerations

- Only admin accounts can modify global fees
- Campaign admins can only modify their own campaign fees
- Fee changes are logged as events for transparency
- Emergency pause functionality available for fee-related issues
- All fee functions include proper access control checks
