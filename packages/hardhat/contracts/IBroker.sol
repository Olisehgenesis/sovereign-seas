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

/**
 * @title CeloSwapper
 * @notice This contract swaps cUSD to CELO using the Broker and keeps the CELO in the contract
 */
contract CeloSwapper is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Alfajores addresses - replace with mainnet addresses if deploying to mainnet
    address public constant CUSD = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1; // cUSD on Alfajores
    address public constant CELO = 0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9; // CELO on Alfajores
    address public immutable broker;
    
    // Default exchange provider and exchange ID - these should be configured for your specific use case
    address public exchangeProvider;
    bytes32 public exchangeId;
    
    // Events
    event SwappedCusdToCelo(address indexed user, uint256 cusdAmount, uint256 celoReceived);
    event CeloWithdrawn(address indexed to, uint256 amount);
    
    /**
     * @notice Constructor
     * @param _broker The address of the Broker contract
     * @param _exchangeProvider The initial exchange provider to use
     * @param _exchangeId The initial exchange ID to use for swaps
     */
    constructor(address _broker, address _exchangeProvider, bytes32 _exchangeId) Ownable(msg.sender) {
        require(_broker != address(0), "Broker address cannot be zero");
        require(_exchangeProvider != address(0), "Exchange provider cannot be zero");
        
        broker = _broker;
        exchangeProvider = _exchangeProvider;
        exchangeId = _exchangeId;
        
        // Approve broker to spend cUSD
        IERC20(CUSD).approve(_broker, type(uint256).max);
    }
    
    /**
     * @notice Swap cUSD to CELO and keep CELO in the contract
     * @param cusdAmount The amount of cUSD to swap
     * @param minCeloAmount The minimum amount of CELO expected in return
     * @return celoReceived The amount of CELO received from the swap
     */
    function swapCusdToCelo(uint256 cusdAmount, uint256 minCeloAmount) external nonReentrant returns (uint256 celoReceived) {
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
        celoReceived = IBroker(broker).swapIn(
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
        
        emit SwappedCusdToCelo(msg.sender, cusdAmount, celoReceived);
        return celoReceived;
    }
    
    /**
     * @notice Get the expected amount of CELO for a given amount of cUSD
     * @param cusdAmount The amount of cUSD to swap
     * @return The expected amount of CELO
     */
    function getExpectedCeloAmount(uint256 cusdAmount) external view returns (uint256) {
        return IBroker(broker).getAmountOut(
            exchangeProvider,
            exchangeId,
            CUSD,
            CELO,
            cusdAmount
        );
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
     * @notice Withdraw CELO from the contract to the specified address
     * @param to The address to send CELO to
     * @param amount The amount of CELO to withdraw
     */
    function withdrawCelo(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot withdraw to zero address");
        require(amount > 0, "Amount must be greater than zero");
        
        IERC20(CELO).safeTransfer(to, amount);
        emit CeloWithdrawn(to, amount);
    }
    
    /**
     * @notice Get the CELO balance of the contract
     * @return The amount of CELO held by the contract
     */
    function getCeloBalance() external view returns (uint256) {
        return IERC20(CELO).balanceOf(address(this));
    }
}