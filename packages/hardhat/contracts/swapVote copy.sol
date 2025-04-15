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
 * @title CeloSwapperV2
 * @notice This contract swaps cUSD to CELO and votes in SovereignSeas
 * @dev This contract acts as a proxy for users who want to vote with cUSD instead of CELO
 */
contract CeloSwapperV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Alfajores addresses - replace with mainnet addresses if deploying to mainnet
    address public constant CUSD = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1; // cUSD on Alfajores
    address public constant CELO = 0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9; // CELO on Alfajores
    address public immutable broker;
    address public immutable sovereignSeas;
    
    // Default exchange provider and exchange ID - these should be configured for your specific use case
    address public exchangeProvider;
    bytes32 public exchangeId;
    
    // Slippage protection - default values
    uint256 public constant DEFAULT_SLIPPAGE = 50; // 0.5%
    uint256 public constant SLIPPAGE_DENOMINATOR = 10000;
    
    // Fee for using the service (0 initially, can be set by owner)
    uint256 public serviceFee; // Fee in basis points (1/100th of a percent)
    uint256 public accumulatedFees;
    
    // User votes mapping for tracking
    mapping(address => mapping(uint256 => mapping(uint256 => uint256))) public userVotesCusd;
    
    // Events
    event SwappedAndVoted(
        address indexed user,
        uint256 campaignId,
        uint256 projectId,
        uint256 cusdAmount,
        uint256 celoSwapped,
        uint256 celoVoted
    );
    event ServiceFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeesWithdrawn(address indexed to, uint256 amount);
    
    /**
     * @notice Constructor
     * @param _broker The address of the Broker contract
     * @param _sovereignSeas The address of the SovereignSeas contract
     * @param _exchangeProvider The initial exchange provider to use
     * @param _exchangeId The initial exchange ID to use for swaps
     */
    constructor(
        address _broker,
        address _sovereignSeas,
        address _exchangeProvider,
        bytes32 _exchangeId
    ) Ownable(msg.sender) {
        require(_broker != address(0), "Broker address cannot be zero");
        require(_sovereignSeas != address(0), "SovereignSeas address cannot be zero");
        require(_exchangeProvider != address(0), "Exchange provider cannot be zero");
        
        broker = _broker;
        sovereignSeas = _sovereignSeas;
        exchangeProvider = _exchangeProvider;
        exchangeId = _exchangeId;
        
        // Initially set service fee to 0
        serviceFee = 0;
        
        // Approve broker to spend cUSD
        IERC20(CUSD).approve(_broker, type(uint256).max);
    }
    
    /**
     * @notice Swap cUSD to CELO and vote in SovereignSeas
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
    ) external nonReentrant returns (uint256 celoVoted) {
        // Transfer cUSD from user to this contract
        IERC20(CUSD).safeTransferFrom(msg.sender, address(this), cusdAmount);
        
        // Get the expected CELO amount
        uint256 expectedCeloAmount = IBroker(broker).getAmountOut(
            exchangeProvider,
            exchangeId,
            CUSD,
            CELO,
            cusdAmount
        );
        
        // Make sure we get at least the minimum expected
        require(expectedCeloAmount >= minCeloAmount, "Expected CELO amount below minimum");
        
        // Record CELO balance before swap
        uint256 celoBalanceBefore = IERC20(CELO).balanceOf(address(this));
        
        // Execute the swap
        uint256 celoReceived = IBroker(broker).swapIn(
            exchangeProvider,
            exchangeId,
            CUSD,
            CELO,
            cusdAmount,
            minCeloAmount
        );
        
        // Verify that we received the CELO
        uint256 celoBalanceAfter = IERC20(CELO).balanceOf(address(this));
        require(celoBalanceAfter >= celoBalanceBefore + celoReceived, "CELO not received");
        
        // Calculate service fee if any
        uint256 feeAmount = 0;
        if (serviceFee > 0) {
            feeAmount = (celoReceived * serviceFee) / SLIPPAGE_DENOMINATOR;
            accumulatedFees += feeAmount;
        }
        
        // Calculate amount to vote with
        celoVoted = celoReceived - feeAmount;
        
        // Track user's cUSD votes for our records
        userVotesCusd[msg.sender][campaignId][projectId] += cusdAmount;
        
        // Vote on SovereignSeas with the received CELO (minus fees)
        (bool success, ) = sovereignSeas.call{value: celoVoted}(
            abi.encodeWithSignature("vote(uint256,uint256)", campaignId, projectId)
        );
        require(success, "Vote failed");
        
        emit SwappedAndVoted(msg.sender, campaignId, projectId, cusdAmount, celoReceived, celoVoted);
        return celoVoted;
    }
    
    /**
     * @notice Get the expected amount of CELO for a given amount of cUSD
     * @param cusdAmount The amount of cUSD to swap
     * @return expectedCelo The expected amount of CELO before fees
     * @return voteAmount The amount that would be used for voting after fees
     */
    function getExpectedVoteAmount(uint256 cusdAmount) external view returns (uint256 expectedCelo, uint256 voteAmount) {
        expectedCelo = IBroker(broker).getAmountOut(
            exchangeProvider,
            exchangeId,
            CUSD,
            CELO,
            cusdAmount
        );
        
        // Calculate fee
        uint256 feeAmount = (expectedCelo * serviceFee) / SLIPPAGE_DENOMINATOR;
        voteAmount = expectedCelo - feeAmount;
        
        return (expectedCelo, voteAmount);
    }
    
    /**
     * @notice Helper function to calculate minimum CELO amount based on slippage
     * @param cusdAmount The amount of cUSD
     * @param slippageInBps The maximum allowed slippage in basis points (1/100 of a percent)
     * @return The minimum expected CELO amount
     */
    function calculateMinCeloAmount(uint256 cusdAmount, uint256 slippageInBps) external view returns (uint256) {
        uint256 expectedCelo = IBroker(broker).getAmountOut(
            exchangeProvider,
            exchangeId,
            CUSD,
            CELO,
            cusdAmount
        );
        
        // Calculate minimum amount with slippage protection
        return expectedCelo * (SLIPPAGE_DENOMINATOR - slippageInBps) / SLIPPAGE_DENOMINATOR;
    }
    
    /**
     * @notice Get the amount of cUSD a user has voted with for a specific project
     * @param user The user address
     * @param campaignId The campaign ID
     * @param projectId The project ID
     * @return The amount of cUSD the user has voted with
     */
    function getUserCusdVotes(address user, uint256 campaignId, uint256 projectId) external view returns (uint256) {
        return userVotesCusd[user][campaignId][projectId];
    }
    
    /**
     * @notice Update the exchange provider and ID
     * @param _exchangeProvider The new exchange provider
     * @param _exchangeId The new exchange ID
     */
    function updateExchangeConfig(address _exchangeProvider, bytes32 _exchangeId) external onlyOwner {
        require(_exchangeProvider != address(0), "Exchange provider cannot be zero");
        exchangeProvider = _exchangeProvider;
        exchangeId = _exchangeId;
    }
    
    /**
     * @notice Update the service fee
     * @param newFee The new service fee in basis points (1/100 of a percent)
     */
    function updateServiceFee(uint256 newFee) external onlyOwner {
        require(newFee <= 300, "Fee cannot exceed 3%"); // Cap at 3%
        
        uint256 oldFee = serviceFee;
        serviceFee = newFee;
        
        emit ServiceFeeUpdated(oldFee, newFee);
    }
    
    /**
     * @notice Withdraw accumulated fees
     * @param to The address to send fees to
     * @param amount The amount to withdraw (0 for all)
     */
    function withdrawFees(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot withdraw to zero address");
        
        uint256 withdrawAmount = amount == 0 ? accumulatedFees : amount;
        require(withdrawAmount <= accumulatedFees, "Insufficient accumulated fees");
        
        accumulatedFees -= withdrawAmount;
        
        IERC20(CELO).safeTransfer(to, withdrawAmount);
        emit FeesWithdrawn(to, withdrawAmount);
    }
    
    /**
     * @notice Get accumulated fees
     * @return The amount of accumulated fees
     */
    function getAccumulatedFees() external view returns (uint256) {
        return accumulatedFees;
    }
    
    /**
     * @notice Fallback function to receive CELO
     */
    receive() external payable {}
}