// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IBroker {
    function swapIn(
        address exchangeProvider,
        bytes32 exchangeId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) external returns (uint256 amountOut);
    
    function getAmountOut(
        address exchangeProvider,
        bytes32 exchangeId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut);
    
    function exchangeProviders(uint256 index) external view returns (address);
}

// Interface for interacting with SovereignSeas contract
interface ISovereignSeas {
    function vote(uint256 _campaignId, uint256 _projectId) external payable;
    
    function getCampaign(uint256 _campaignId) external view returns (
        uint256 id,
        address admin,
        string memory name,
        string memory description,
        string memory logo,
        string memory demoVideo,
        uint256 startTime,
        uint256 endTime,
        uint256 adminFeePercentage,
        uint256 voteMultiplier,
        uint256 maxWinners,
        bool useQuadraticDistribution,
        bool active,
        uint256 totalFunds
    );
    
    function getProject(uint256 _campaignId, uint256 _projectId) external view returns (
        uint256 id,
        uint256 campaignId,
        address payable owner,
        string memory name,
        string memory description,
        string memory githubLink,
        string memory socialLink,
        string memory testingLink,
        string memory logo,
        string memory demoVideo,
        address[] memory contracts,
        bool approved,
        bool active,
        uint256 voteCount,
        uint256 fundsReceived
    );
    
    function getUserVotesForProject(uint256 _campaignId, address _user, uint256 _projectId)
        external
        view
        returns (uint256);
}

/**
 * @title CeloSwapperV3
 * @notice This contract swaps various tokens to CELO and votes in SovereignSeas
 * @dev Supports multiple tokens and provides admin controls for maintenance
 */
contract CeloSwapperV3 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Alfajores addresses - replace with mainnet addresses if deploying to mainnet
    address public constant CELO = 0x471EcE3750Da237f93B8E339c536989b8978a438; // CELO on Alfajores
    address public immutable broker;
    address public immutable sovereignSeas;
    
    // Default exchange provider - shared among all tokens
    address public exchangeProvider;
    
    // Slippage protection - default values
    uint256 public constant DEFAULT_SLIPPAGE = 50; // 0.5%
    uint256 public constant SLIPPAGE_DENOMINATOR = 10000;
    
    // Fee for using the service (0 initially, can be set by owner)
    uint256 public serviceFee; // Fee in basis points (1/100th of a percent)
    
    // Truncation setting (default to 0.01 CELO = 10^16 wei)
    uint256 public truncationThreshold = 10**16;
    
    // Accumulated fees by token
    mapping(address => uint256) public accumulatedFees;
    
    // Token configuration struct
    struct TokenConfig {
        bool supported;       // Whether the token is supported
        bytes32 exchangeId;   // Exchange ID for this token
        uint256 minAmount;    // Minimum amount that can be swapped
    }
    
    // Mapping of token address to token configuration
    mapping(address => TokenConfig) public supportedTokens;
    
    // Array to track all supported token addresses
    address[] public supportedTokenList;
    
    // User votes mapping for tracking (user => token => campaignId => projectId => amount)
    mapping(address => mapping(address => mapping(uint256 => mapping(uint256 => uint256)))) public userTokenVotes;
    
    // Admins mapping
    mapping(address => bool) public admins;
    
    // Events
    event SwappedAndVoted(
        address indexed user,
        address indexed token,
        uint256 campaignId,
        uint256 projectId,
        uint256 tokenAmount,
        uint256 celoSwapped,
        uint256 celoVoted
    );
    event ServiceFeeUpdated(uint256 oldFee, uint256 newFee);
    event TruncationThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event TokenAdded(address indexed token, bytes32 exchangeId, uint256 minAmount);
    event TokenUpdated(address indexed token, bytes32 exchangeId, uint256 minAmount);
    event TokenRemoved(address indexed token);
    event FeesWithdrawn(address indexed to, address indexed token, uint256 amount);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event FundsWithdrawn(address indexed token, address indexed to, uint256 amount);
    
    /**
     * @notice Modifier to restrict access to admin or owner
     */
    modifier onlyAdminOrOwner() {
        require(admins[msg.sender] || msg.sender == owner(), "Not admin or owner");
        _;
    }
    
    /**
     * @notice Constructor
     * @param _broker The address of the Broker contract
     * @param _sovereignSeas The address of the SovereignSeas contract
     * @param _exchangeProvider The initial exchange provider to use
     * @param _initialTokens Array of initial tokens to support
     * @param _initialExchangeIds Array of exchange IDs for the initial tokens
     * @param _initialMinAmounts Array of minimum amounts for the initial tokens
     */
    constructor(
        address _broker,
        address _sovereignSeas,
        address _exchangeProvider,
        address[] memory _initialTokens,
        bytes32[] memory _initialExchangeIds,
        uint256[] memory _initialMinAmounts
    ) Ownable(msg.sender) {
        require(_broker != address(0), "Broker address cannot be zero");
        require(_sovereignSeas != address(0), "SovereignSeas address cannot be zero");
        require(_exchangeProvider != address(0), "Exchange provider cannot be zero");
        require(
            _initialTokens.length == _initialExchangeIds.length && 
            _initialTokens.length == _initialMinAmounts.length,
            "Array lengths mismatch"
        );
        
        broker = _broker;
        sovereignSeas = _sovereignSeas;
        exchangeProvider = _exchangeProvider;
        
        // Initially set service fee to 0
        serviceFee = 0;
        
        // Add initial tokens
        for (uint256 i = 0; i < _initialTokens.length; i++) {
            _addToken(_initialTokens[i], _initialExchangeIds[i], _initialMinAmounts[i]);
        }
        
        // Add the deployer as an admin
        admins[msg.sender] = true;
        emit AdminAdded(msg.sender);
    }
    
    /**
     * @notice Add a new supported token
     * @param token The token address
     * @param exchangeId The exchange ID for this token
     * @param minAmount The minimum amount that can be swapped
     */
    function addToken(
        address token,
        bytes32 exchangeId,
        uint256 minAmount
    ) external onlyAdminOrOwner {
        _addToken(token, exchangeId, minAmount);
    }
    
    /**
     * @notice Internal function to add a new token
     */
    function _addToken(
        address token,
        bytes32 exchangeId,
        uint256 minAmount
    ) internal {
        require(token != address(0), "Token address cannot be zero");
        require(!supportedTokens[token].supported, "Token already supported");
        
        supportedTokens[token] = TokenConfig({
            supported: true,
            exchangeId: exchangeId,
            minAmount: minAmount
        });
        
        supportedTokenList.push(token);
        
        // Approve broker to spend this token
        IERC20(token).approve(broker, type(uint256).max);
        
        emit TokenAdded(token, exchangeId, minAmount);
    }
    
    /**
     * @notice Update a supported token's configuration
     * @param token The token address
     * @param exchangeId The new exchange ID
     * @param minAmount The new minimum amount
     */
    function updateToken(
        address token,
        bytes32 exchangeId,
        uint256 minAmount
    ) external onlyAdminOrOwner {
        require(supportedTokens[token].supported, "Token not supported");
        
        supportedTokens[token].exchangeId = exchangeId;
        supportedTokens[token].minAmount = minAmount;
        
        emit TokenUpdated(token, exchangeId, minAmount);
    }
    
    /**
     * @notice Remove a supported token
     * @param token The token address to remove
     */
    function removeToken(address token) external onlyAdminOrOwner {
        require(supportedTokens[token].supported, "Token not supported");
        
        // Find the token in the array and remove it
        for (uint256 i = 0; i < supportedTokenList.length; i++) {
            if (supportedTokenList[i] == token) {
                // Move the last element to this position and pop the last element
                supportedTokenList[i] = supportedTokenList[supportedTokenList.length - 1];
                supportedTokenList.pop();
                break;
            }
        }
        
        // Mark as not supported
        supportedTokens[token].supported = false;
        
        emit TokenRemoved(token);
    }
    
    /**
     * @notice Get the count of supported tokens
     * @return The number of supported tokens
     */
    function getSupportedTokenCount() external view returns (uint256) {
        return supportedTokenList.length;
    }
    
    /**
     * @notice Check if a token is supported
     * @param token The token address to check
     * @return Whether the token is supported
     */
    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token].supported;
    }
    
    /**
     * @notice Swap a token to CELO and vote in SovereignSeas
     * @param token The token to swap
     * @param campaignId The campaign ID to vote for
     * @param projectId The project ID to vote for
     * @param tokenAmount The amount of token to swap and vote with
     * @param minCeloAmount The minimum amount of CELO expected from the swap
     * @return celoVoted The amount of CELO used for voting
     */
    function swapAndVoteToken(
        address token,
        uint256 campaignId,
        uint256 projectId,
        uint256 tokenAmount,
        uint256 minCeloAmount
    ) public nonReentrant returns (uint256 celoVoted) {
        // Check if token is supported
        TokenConfig memory config = supportedTokens[token];
        require(config.supported, "Token not supported");
        require(tokenAmount >= config.minAmount, "Amount below minimum");
        
        // Transfer token from user to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenAmount);
        
        // Get the expected CELO amount
        uint256 expectedCeloAmount = IBroker(broker).getAmountOut(
            exchangeProvider,
            config.exchangeId,
            token,
            CELO,
            tokenAmount
        );
        
        // Make sure we get at least the minimum expected
        require(expectedCeloAmount >= minCeloAmount, "Expected CELO amount below minimum");
        
        // Record CELO balance before swap
        uint256 celoBalanceBefore = IERC20(CELO).balanceOf(address(this));
        
        // Execute the swap
        uint256 celoReceived = IBroker(broker).swapIn(
            exchangeProvider,
            config.exchangeId,
            token,
            CELO,
            tokenAmount,
            minCeloAmount
        );
        
        // Verify that we received the CELO
        uint256 celoBalanceAfter = IERC20(CELO).balanceOf(address(this));
        require(celoBalanceAfter >= celoBalanceBefore + celoReceived, "CELO not received");
        
        // Calculate service fee
        uint256 feeAmount = 0;
        if (serviceFee > 0) {
            feeAmount = (celoReceived * serviceFee) / SLIPPAGE_DENOMINATOR;
            accumulatedFees[CELO] += feeAmount;
        }
        
        // Calculate amount to vote with, truncating to nearest whole unit if needed
        uint256 truncatedAmount = 0;
        celoVoted = celoReceived - feeAmount;
        
        // Truncate the fractional part if above threshold
        if (truncationThreshold > 0) {
            uint256 wholeCelo = (celoVoted / 1 ether) * 1 ether; // Truncate to whole CELO
            truncatedAmount = celoVoted - wholeCelo;
            
            if (truncatedAmount > 0 && truncatedAmount <= truncationThreshold) {
                celoVoted = wholeCelo;
                accumulatedFees[CELO] += truncatedAmount;
            }
        }
        
        // Track user's token votes for our records
        userTokenVotes[msg.sender][token][campaignId][projectId] += tokenAmount;
        
        // Vote on SovereignSeas with the received CELO (minus fees and truncation)
        (bool success, ) = sovereignSeas.call{value: celoVoted}(
            abi.encodeWithSignature("vote(uint256,uint256)", campaignId, projectId)
        );
        require(success, "Vote failed");
        
        emit SwappedAndVoted(
            msg.sender, 
            token, 
            campaignId, 
            projectId, 
            tokenAmount, 
            celoReceived, 
            celoVoted
        );
        
        return celoVoted;
    }
    
    /**
     * @notice Simplified method for cUSD to maintain backward compatibility
     * @param campaignId The campaign ID to vote for
     * @param projectId The project ID to vote for
     * @param cusdAmount The amount of cUSD to swap and vote with
     * @param minCeloAmount The minimum amount of CELO expected from the swap
     * @return celoVoted The amount of CELO used for voting
     */
    function swapAndVote(
        uint256 campaignId,
        uint256 projectId,
        uint256 cusdAmount,
        uint256 minCeloAmount
    ) external returns (uint256) {
        // Use the first token in the supportedTokenList as cUSD
        require(supportedTokenList.length > 0, "No supported tokens");
        address cusdToken = supportedTokenList[0]; // Assuming the first added token is cUSD
        
        return swapAndVoteToken(
            cusdToken,
            campaignId,
            projectId,
            cusdAmount,
            minCeloAmount
        );
    }
    
    /**
     * @notice Get the expected amount of CELO for a given amount of token
     * @param token The token to swap
     * @param tokenAmount The amount of token to swap
     * @return expectedCelo The expected amount of CELO before fees
     * @return voteAmount The amount that would be used for voting after fees and truncation
     */
    function getExpectedVoteAmount(address token, uint256 tokenAmount) 
        external 
        view 
        returns (uint256 expectedCelo, uint256 voteAmount) 
    {
        require(supportedTokens[token].supported, "Token not supported");
        
        expectedCelo = IBroker(broker).getAmountOut(
            exchangeProvider,
            supportedTokens[token].exchangeId,
            token,
            CELO,
            tokenAmount
        );
        
        // Calculate fee
        uint256 feeAmount = (expectedCelo * serviceFee) / SLIPPAGE_DENOMINATOR;
        voteAmount = expectedCelo - feeAmount;
        
        // Apply truncation if needed
        if (truncationThreshold > 0) {
            uint256 wholeCelo = (voteAmount / 1 ether) * 1 ether; // Truncate to whole CELO
            uint256 truncatedAmount = voteAmount - wholeCelo;
            
            if (truncatedAmount > 0 && truncatedAmount <= truncationThreshold) {
                voteAmount = wholeCelo;
            }
        }
        
        return (expectedCelo, voteAmount);
    }
    
    /**
     * @notice Helper function to calculate minimum CELO amount based on slippage
     * @param token The token to swap
     * @param tokenAmount The amount of token
     * @param slippageInBps The maximum allowed slippage in basis points (1/100 of a percent)
     * @return The minimum expected CELO amount
     */
    function calculateMinCeloAmount(
        address token, 
        uint256 tokenAmount, 
        uint256 slippageInBps
    ) 
        external 
        view 
        returns (uint256) 
    {
        require(supportedTokens[token].supported, "Token not supported");
        
        uint256 expectedCelo = IBroker(broker).getAmountOut(
            exchangeProvider,
            supportedTokens[token].exchangeId,
            token,
            CELO,
            tokenAmount
        );
        
        // Calculate minimum amount with slippage protection
        return expectedCelo * (SLIPPAGE_DENOMINATOR - slippageInBps) / SLIPPAGE_DENOMINATOR;
    }
    
    /**
     * @notice Get the amount of a specific token a user has voted with for a specific project
     * @param user The user address
     * @param token The token address
     * @param campaignId The campaign ID
     * @param projectId The project ID
     * @return The amount of token the user has voted with
     */
    function getUserTokenVotes(
        address user, 
        address token, 
        uint256 campaignId, 
        uint256 projectId
    ) 
        external 
        view 
        returns (uint256) 
    {
        return userTokenVotes[user][token][campaignId][projectId];
    }
    
    /**
     * @notice Update the exchange provider
     * @param _exchangeProvider The new exchange provider
     */
    function updateExchangeProvider(address _exchangeProvider) external onlyAdminOrOwner {
        require(_exchangeProvider != address(0), "Exchange provider cannot be zero");
        exchangeProvider = _exchangeProvider;
    }
    
    /**
     * @notice Update the service fee
     * @param newFee The new service fee in basis points (1/100 of a percent)
     */
    function updateServiceFee(uint256 newFee) external onlyAdminOrOwner {
        require(newFee <= 300, "Fee cannot exceed 3%"); // Cap at 3%
        
        uint256 oldFee = serviceFee;
        serviceFee = newFee;
        
        emit ServiceFeeUpdated(oldFee, newFee);
    }
    
    /**
     * @notice Update the truncation threshold
     * @param newThreshold The new truncation threshold
     */
    function updateTruncationThreshold(uint256 newThreshold) external onlyAdminOrOwner {
        uint256 oldThreshold = truncationThreshold;
        truncationThreshold = newThreshold;
        
        emit TruncationThresholdUpdated(oldThreshold, newThreshold);
    }
    
    /**
     * @notice Add a new admin
     * @param newAdmin The address to add as admin
     */
    function addAdmin(address newAdmin) external onlyOwner {
        require(newAdmin != address(0), "Admin address cannot be zero");
        require(!admins[newAdmin], "Already an admin");
        
        admins[newAdmin] = true;
        emit AdminAdded(newAdmin);
    }
    
    /**
     * @notice Remove an admin
     * @param admin The admin address to remove
     */
    function removeAdmin(address admin) external onlyOwner {
        require(admins[admin], "Not an admin");
        
        admins[admin] = false;
        emit AdminRemoved(admin);
    }
    
    /**
     * @notice Withdraw accumulated fees for a specific token
     * @param token The token to withdraw fees for (use CELO address for CELO fees)
     * @param to The address to send fees to
     * @param amount The amount to withdraw (0 for all)
     */
    function withdrawFees(address token, address to, uint256 amount) external onlyAdminOrOwner {
        require(to != address(0), "Cannot withdraw to zero address");
        
        uint256 withdrawAmount = amount == 0 ? accumulatedFees[token] : amount;
        require(withdrawAmount <= accumulatedFees[token], "Insufficient accumulated fees");
        
        accumulatedFees[token] -= withdrawAmount;
        
        if (token == CELO) {
            // For CELO, we use native transfer
            (bool success, ) = to.call{value: withdrawAmount}("");
            require(success, "CELO transfer failed");
        } else {
            // For ERC20 tokens
            IERC20(token).safeTransfer(to, withdrawAmount);
        }
        
        emit FeesWithdrawn(to, token, withdrawAmount);
    }
    
    /**
     * @notice Get accumulated fees for a specific token
     * @param token The token address
     * @return The amount of accumulated fees
     */
    function getAccumulatedFees(address token) external view returns (uint256) {
        return accumulatedFees[token];
    }
    
    /**
     * @notice Emergency withdraw of any ERC20 token (excluding accumulated fees)
     * @param token The token address
     * @param to The address to send tokens to
     * @param amount The amount to withdraw
     */
    function withdrawERC20(address token, address to, uint256 amount) external onlyAdminOrOwner {
        require(to != address(0), "Cannot withdraw to zero address");
        
        // Make sure we're not withdrawing from accumulated fees
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 availableBalance = balance - accumulatedFees[token];
        require(amount <= availableBalance, "Amount exceeds available balance");
        
        IERC20(token).safeTransfer(to, amount);
        
        emit FundsWithdrawn(token, to, amount);
    }
    
    /**
     * @notice Emergency withdraw of any native CELO (excluding accumulated fees)
     * @param to The address to send CELO to
     * @param amount The amount to withdraw
     */
    function withdrawCELO(address to, uint256 amount) external onlyAdminOrOwner {
        require(to != address(0), "Cannot withdraw to zero address");
        
        // Make sure we're not withdrawing from accumulated fees
        uint256 balance = address(this).balance;
        uint256 availableBalance = balance - accumulatedFees[CELO];
        require(amount <= availableBalance, "Amount exceeds available balance");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "CELO transfer failed");
        
        emit FundsWithdrawn(CELO, to, amount);
    }
    
    /**
     * @notice Fallback function to receive CELO
     */
    receive() external payable {}
}