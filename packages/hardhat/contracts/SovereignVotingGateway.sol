// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Ubeswap V2 Router interface
interface IUbeswapV2Router02 {
    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);

    function factory() external pure returns (address);
    function WETH() external pure returns (address);
}

// Ubeswap V2 Factory interface
interface IUbeswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

// Ubeswap V2 Pair interface
interface IUbeswapV2Pair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

// SovereignSeas interface for voting
interface ISovereignSeasV4 {
    function voteWithCelo(uint256 _campaignId, uint256 _projectId, bytes32 _bypassCode) external payable;
}

/**
 * @title SovereignVotingGateway
 * @dev Streamlined contract for voting with any token via Ubeswap conversion to native CELO
 * @notice This contract automatically discovers factory and WETH addresses from the router
 */
contract SovereignVotingGateway is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Core contracts (only what we need as constructor params)
    IUbeswapV2Router02 public immutable router;
    ISovereignSeasV4 public immutable sovereignSeas;
    
    // Auto-discovered addresses
    IUbeswapV2Factory public immutable factory;
    address public immutable WETH;
    
    // Configuration
    uint256 public slippageTolerance = 300; // 3% default (300 basis points)
    uint256 public constant MAX_SLIPPAGE = 1000; // 10% maximum
    uint256 public constant SWAP_DEADLINE = 300; // 5 minutes
    
    // Gas optimization for route discovery
    mapping(address => address[]) private cachedRoutes;
    mapping(address => uint256) private routeTimestamps;
    uint256 private constant ROUTE_CACHE_TTL = 1 hours;
    
    // Events
    event TokenVote(
        address indexed voter,
        uint256 indexed campaignId,
        uint256 indexed projectId,
        address token,
        uint256 tokenAmount,
        uint256 celoReceived,
        address[] route,
        bytes32 bypassCode
    );
    
    event NativeVote(
        address indexed voter,
        uint256 indexed campaignId,
        uint256 indexed projectId,
        uint256 celoAmount,
        bytes32 bypassCode
    );
    
    event SlippageUpdated(uint256 oldSlippage, uint256 newSlippage);
    event EmergencyWithdraw(address token, uint256 amount);

    // Structs for better UX
    struct VoteQuote {
        address token;
        uint256 inputAmount;
        uint256 expectedCelo;
        uint256 minimumCelo;
        address[] route;
        uint256 priceImpact; // in basis points
        bool isValid;
        string reason; // Why invalid if applicable
    }

    struct RouteInfo {
        address[] path;
        uint256 expectedOutput;
        bool exists;
        bool usesDirect;
    }

    constructor(
        address _router,
        address _sovereignSeas
    ) Ownable(msg.sender) {
        require(_router != address(0), "Invalid router");
        require(_sovereignSeas != address(0), "Invalid SovereignSeas");
        
        router = IUbeswapV2Router02(_router);
        sovereignSeas = ISovereignSeasV4(_sovereignSeas);
        
        // Auto-discover factory and WETH from router
        factory = IUbeswapV2Factory(router.factory());
        WETH = router.WETH();
        
        require(address(factory) != address(0), "Router returned invalid factory");
        require(WETH != address(0), "Router returned invalid WETH");
    }

    /**
     * @dev Vote with any ERC20 token (automatically converts to CELO)
     */
    function voteWithToken(
        uint256 campaignId,
        uint256 projectId,
        address token,
        uint256 amount,
        bytes32 bypassCode,
        uint256 minCeloOut // Slippage protection
    ) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(token != address(0), "Invalid token");
        
        // Transfer tokens from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Get best route and convert to CELO
        uint256 celoReceived = _swapTokenToCelo(token, amount, minCeloOut);
        require(celoReceived > 0, "No CELO received from swap");
        
        // Vote with converted CELO
        sovereignSeas.voteWithCelo{value: celoReceived}(campaignId, projectId, bypassCode);
        
        // Get route for event (cached or fresh)
        address[] memory route = _getBestRoute(token);
        
        emit TokenVote(
            msg.sender,
            campaignId,
            projectId,
            token,
            amount,
            celoReceived,
            route,
            bypassCode
        );
    }

    /**
     * @dev Vote with native CELO directly
     */
    function voteWithCelo(
        uint256 campaignId,
        uint256 projectId,
        bytes32 bypassCode
    ) external payable nonReentrant {
        require(msg.value > 0, "Must send CELO");
        
        // Vote directly with native CELO
        sovereignSeas.voteWithCelo{value: msg.value}(campaignId, projectId, bypassCode);
        
        emit NativeVote(msg.sender, campaignId, projectId, msg.value, bypassCode);
    }

    /**
     * @dev Internal function to swap any token to CELO
     */
    function _swapTokenToCelo(
        address token,
        uint256 amount,
        uint256 minCeloOut
    ) internal returns (uint256) {
        // Get best route
        address[] memory route = _getBestRoute(token);
        require(route.length >= 2, "No route found");
        
        // Approve token for router
        IERC20(token).approve(address(router), amount);
        
        uint256 deadline = block.timestamp + SWAP_DEADLINE;
        
        // Execute swap based on route
        uint256[] memory amounts;
        if (route[route.length - 1] == WETH) {
            // Swap to WETH then convert to native CELO
            amounts = router.swapExactTokensForETH(
                amount,
                minCeloOut,
                route,
                address(this),
                deadline
            );
            return amounts[amounts.length - 1];
        } else {
            // This shouldn't happen as CELO is native, but keeping for safety
            amounts = router.swapExactTokensForTokens(
                amount,
                minCeloOut,
                route,
                address(this),
                deadline
            );
            return amounts[amounts.length - 1];
        }
    }

    /**
     * @dev Find the best route for token to CELO (with caching)
     */
    function _getBestRoute(address token) internal returns (address[] memory) {
        // Check cache first
        if (block.timestamp - routeTimestamps[token] < ROUTE_CACHE_TTL && 
            cachedRoutes[token].length > 0) {
            return cachedRoutes[token];
        }
        
        address[] memory route = _findOptimalRoute(token);
        
        // Cache the route
        cachedRoutes[token] = route;
        routeTimestamps[token] = block.timestamp;
        
        return route;
    }

    /**
     * @dev Find optimal route (direct or through WETH)
     */
    function _findOptimalRoute(address token) internal view returns (address[] memory) {
        // Try direct route to WETH first (since CELO is native)
        if (_pairExists(token, WETH)) {
            address[] memory directRoute = new address[](2);
            directRoute[0] = token;
            directRoute[1] = WETH;
            return directRoute;
        }
        
        // If no direct route, this token might not be tradeable
        revert("No route available for this token");
    }

    /**
     * @dev Check if a trading pair exists
     */
    function _pairExists(address tokenA, address tokenB) internal view returns (bool) {
        return factory.getPair(tokenA, tokenB) != address(0);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Get quote for voting with a specific token
     */
    function getVoteQuote(
        address token,
        uint256 amount
    ) external view returns (VoteQuote memory quote) {
        quote.token = token;
        quote.inputAmount = amount;
        
        if (amount == 0) {
            quote.reason = "Amount cannot be zero";
            return quote;
        }
        
        // Try to find route
        try this.findBestRouteView(token) returns (address[] memory route) {
            quote.route = route;
            
            // Get expected output
            try router.getAmountsOut(amount, route) returns (uint256[] memory amounts) {
                quote.expectedCelo = amounts[amounts.length - 1];
                quote.minimumCelo = (quote.expectedCelo * (10000 - slippageTolerance)) / 10000;
                quote.priceImpact = _calculatePriceImpact(token, amount, quote.expectedCelo);
                quote.isValid = true;
            } catch {
                quote.reason = "Cannot get price quote - insufficient liquidity";
            }
        } catch {
            quote.reason = "No trading route available";
        }
        
        return quote;
    }

    /**
     * @dev Public view function for route finding (for external calls)
     */
    function findBestRouteView(address token) external view returns (address[] memory) {
        return _findOptimalRoute(token);
    }

    /**
     * @dev Calculate price impact (simplified)
     */
    function _calculatePriceImpact(
        address token,
        uint256 inputAmount,
        uint256 outputAmount
    ) internal view returns (uint256) {
        // Simplified price impact calculation
        // In production, you'd want more sophisticated price impact calculation
        if (outputAmount == 0) return 10000; // 100% impact
        
        try this.getSmallTradeOutput(token, inputAmount / 100) returns (uint256 smallOutput) {
            if (smallOutput == 0) return 0;
            
            uint256 expectedLargeOutput = smallOutput * 100;
            if (expectedLargeOutput <= outputAmount) return 0;
            
            uint256 impact = ((expectedLargeOutput - outputAmount) * 10000) / expectedLargeOutput;
            return impact > 10000 ? 10000 : impact;
        } catch {
            return 0; // Cannot calculate, assume no impact
        }
    }

    /**
     * @dev Helper for price impact calculation
     */
    function getSmallTradeOutput(address token, uint256 amount) external view returns (uint256) {
        if (amount == 0) return 0;
        address[] memory route = _findOptimalRoute(token);
        uint256[] memory amounts = router.getAmountsOut(amount, route);
        return amounts[amounts.length - 1];
    }

    /**
     * @dev Check if token is supported (has a route to CELO)
     */
    function isTokenSupported(address token) external view returns (bool) {
        try this.findBestRouteView(token) returns (address[] memory) {
            return true;
        } catch {
            return false;
        }
    }

    /**
     * @dev Get contract configuration
     */
    function getConfig() external view returns (
        address routerAddress,
        address factoryAddress,
        address wethAddress,
        address sovereignSeasAddress,
        uint256 currentSlippage,
        uint256 maxSlippage
    ) {
        return (
            address(router),
            address(factory),
            WETH,
            address(sovereignSeas),
            slippageTolerance,
            MAX_SLIPPAGE
        );
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Update slippage tolerance
     */
    function setSlippageTolerance(uint256 newSlippage) external onlyOwner {
        require(newSlippage <= MAX_SLIPPAGE, "Slippage too high");
        uint256 oldSlippage = slippageTolerance;
        slippageTolerance = newSlippage;
        emit SlippageUpdated(oldSlippage, newSlippage);
    }

    /**
     * @dev Clear route cache for a specific token
     */
    function clearRouteCache(address token) external onlyOwner {
        delete cachedRoutes[token];
        delete routeTimestamps[token];
    }

    /**
     * @dev Emergency withdraw function
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            // Withdraw native CELO
            uint256 balance = address(this).balance;
            uint256 withdrawAmount = amount == 0 ? balance : amount;
            require(withdrawAmount <= balance, "Insufficient balance");
            payable(owner()).transfer(withdrawAmount);
            emit EmergencyWithdraw(address(0), withdrawAmount);
        } else {
            // Withdraw ERC20 token
            IERC20 tokenContract = IERC20(token);
            uint256 balance = tokenContract.balanceOf(address(this));
            uint256 withdrawAmount = amount == 0 ? balance : amount;
            require(withdrawAmount <= balance, "Insufficient balance");
            tokenContract.safeTransfer(owner(), withdrawAmount);
            emit EmergencyWithdraw(token, withdrawAmount);
        }
    }

    /**
     * @dev Batch get quotes for multiple tokens
     */
    function batchGetQuotes(
        address[] calldata tokens,
        uint256[] calldata amounts
    ) external view returns (VoteQuote[] memory quotes) {
        require(tokens.length == amounts.length, "Array length mismatch");
        
        quotes = new VoteQuote[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            quotes[i] = this.getVoteQuote(tokens[i], amounts[i]);
        }
        
        return quotes;
    }

    // Allow contract to receive native CELO
    receive() external payable {
        // Can receive CELO from swaps or direct transfers
    }

    fallback() external payable {
        // Handle any unexpected calls
    }
}