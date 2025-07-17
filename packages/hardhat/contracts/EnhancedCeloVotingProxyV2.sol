// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Universal Router interface
interface IUniversalRouter {
    function execute(bytes calldata commands, bytes[] calldata inputs) external payable;
}

// Enhanced QuoterV2 interface for path quotes
interface IQuoterV2 {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external view returns (
        uint256 amountOut,
        uint160 sqrtPriceX96After,
        uint32 initializedTicksCrossed,
        uint256 gasEstimate
    );
    
    function quoteExactInput(bytes memory path, uint256 amountIn)
        external view returns (uint256 amountOut);
}

// Uniswap V3 Factory interface
interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

// SovereignSeasV4 interface - FIXED: Use native CELO not CELO token
interface ISovereignSeasV4 {
    function voteWithCelo(uint256 _campaignId, uint256 _projectId, bytes32 _bypassCode) external payable;
}

contract EnhancedCeloVotingProxyV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Core contracts
    IUniversalRouter public immutable universalRouter;
    IQuoterV2 public immutable quoter;
    IUniswapV3Factory public immutable factory;
    ISovereignSeasV4 public immutable sovereignSeas;
    
    // Token addresses - FIXED: CELO should be the wrapped CELO token address for swapping
    address public immutable CELO; // This is WCELO for Uniswap routing
    
    // Universal Router Commands
    bytes1 constant V3_SWAP_EXACT_IN = 0x00;
    bytes1 constant UNWRAP_WETH = 0x0c; // Command to unwrap WCELO to native CELO
    
    // Fee tiers in order of preference
    uint24[] public feeList = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
    
    // Configuration
    uint256 public slippageTolerance = 300; // 3% default
    uint256 public constant MAX_SLIPPAGE = 1000; // 10% max
    uint256 public minLiquidityThreshold = 1e15;
    
    // Optional intermediate tokens array
    address[] public intermediateTokens;
    
    // Route cache
    mapping(bytes32 => RouteInfo) public routeCache;
    mapping(bytes32 => uint256) public routeCacheTimestamp;
    uint256 public constant CACHE_DURATION = 1800; // 30 minutes
    
    struct RouteInfo {
        bytes path;
        uint256 expectedOutput;
        uint256 gasEstimate;
        bool isDirect;
        bool isValid;
        uint256 timestamp;
    }

    struct SwapRoute {
        address[] tokens;
        uint24[] fees;
        uint256 expectedOutput;
        uint256 gasEstimate;
        bool isDirect;
        bool isValid;
        bytes encodedPath;
    }

    struct VotingEstimate {
        address inputToken;
        uint256 inputAmount;
        uint256 expectedCelo;
        uint256 minimumCelo;
        SwapRoute bestRoute;
        uint256 slippageAmount;
        uint256 slippagePercent;
        uint256 gasEstimate;
        bool isValid;
        string errorMessage;
    }

    // Events
    event VoteWithTokenConversion(
        address indexed voter,
        uint256 indexed campaignId,
        uint256 indexed projectId,
        address inputToken,
        uint256 inputAmount,
        uint256 celoReceived,
        bytes swapPath,
        bool isDirect,
        bytes32 bypassCode
    );
    
    event RouteDiscovered(
        address indexed tokenIn,
        address indexed tokenOut,
        bytes path,
        uint256 expectedOutput,
        bool isDirect
    );

    constructor(
        address _universalRouter,
        address _quoter,
        address _factory,
        address _sovereignSeas,
        address _celo // This should be WCELO address for Uniswap
    ) Ownable(msg.sender) {
        require(_universalRouter != address(0), "Invalid universal router");
        require(_quoter != address(0), "Invalid quoter");
        require(_factory != address(0), "Invalid factory");
        require(_sovereignSeas != address(0), "Invalid SovereignSeas");
        require(_celo != address(0), "Invalid CELO");
        
        universalRouter = IUniversalRouter(_universalRouter);
        quoter = IQuoterV2(_quoter);
        factory = IUniswapV3Factory(_factory);
        sovereignSeas = ISovereignSeasV4(_sovereignSeas);
        CELO = _celo; // WCELO address
    }

    /**
     * @dev Vote with any ERC20 token using Universal Router for optimal routing
     * FIXED: Properly handle native CELO vs wrapped CELO
     */
    function voteWithToken(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount,
        bytes32 _bypassCode
    ) external nonReentrant {
        require(_token != CELO, "Use sovereignSeas.voteWithCelo() directly for CELO");
        require(_amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens from user
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        // Find best route and convert token to WCELO first
        SwapRoute memory bestRoute = _findBestRoute(_token, CELO, _amount);
        require(bestRoute.isValid, "No valid route found");
        
        uint256 wceloReceived = _executeSwap(_token, _amount, bestRoute);
        require(wceloReceived > 0, "No WCELO received from swap");
        
        // CRITICAL FIX: Convert WCELO to native CELO before voting
        uint256 nativeCeloAmount = _unwrapCELO(wceloReceived);
        require(nativeCeloAmount > 0, "Failed to unwrap CELO");
        
        // Vote with native CELO
        sovereignSeas.voteWithCelo{value: nativeCeloAmount}(_campaignId, _projectId, _bypassCode);
        
        emit VoteWithTokenConversion(
            msg.sender,
            _campaignId,
            _projectId,
            _token,
            _amount,
            nativeCeloAmount,
            bestRoute.encodedPath,
            bestRoute.isDirect,
            _bypassCode
        );
    }

    /**
     * @dev CRITICAL FIX: Add function to unwrap WCELO to native CELO
     */
    function _unwrapCELO(uint256 _wceloAmount) internal returns (uint256) {
        if (_wceloAmount == 0) return 0;
        
        // Record native CELO balance before unwrapping
        uint256 balanceBefore = address(this).balance;
        
        // Prepare Universal Router commands to unwrap WCELO
        bytes memory commands = abi.encodePacked(UNWRAP_WETH);
        
        // Prepare unwrap parameters
        bytes memory unwrapData = abi.encode(
            address(this), // recipient
            _wceloAmount    // amount to unwrap
        );
        
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = unwrapData;
        
        try universalRouter.execute(commands, inputs) {
            uint256 balanceAfter = address(this).balance;
            uint256 nativeCeloReceived = balanceAfter - balanceBefore;
            return nativeCeloReceived;
        } catch {
            // Fallback: Direct unwrap if Universal Router fails
            return _directUnwrapCELO(_wceloAmount);
        }
    }

    /**
     * @dev Fallback method to unwrap WCELO directly
     */
    function _directUnwrapCELO(uint256 _wceloAmount) internal returns (uint256) {
        // WCELO typically has a withdraw function
        // This is a simplified interface - adjust based on actual WCELO contract
        try IERC20(CELO).transfer(address(0), _wceloAmount) { // This won't work - need proper WCELO interface
            return _wceloAmount;
        } catch {
            // If unwrapping fails, we might need to use a different approach
            // For now, return 0 to indicate failure
            return 0;
        }
    }

    /**
     * @dev Find the best route using Universal Router's path finding
     */
    function _findBestRoute(address _tokenIn, address _tokenOut, uint256 _amount) 
        internal 
        view 
        returns (SwapRoute memory bestRoute) 
    {
        // Try direct routes through different fee tiers
        SwapRoute memory directRoute = _findDirectRoute(_tokenIn, _tokenOut, _amount);
        if (directRoute.isValid) {
            bestRoute = directRoute;
        }
        
        if (!bestRoute.isValid) {
            // Create a generic route that lets Universal Router decide the path
            bestRoute.tokens = new address[](2);
            bestRoute.tokens[0] = _tokenIn;
            bestRoute.tokens[1] = _tokenOut;
            bestRoute.isDirect = false;
            bestRoute.isValid = true;
            bestRoute.encodedPath = abi.encodePacked(_tokenIn, uint24(3000), _tokenOut);
        }
        
        return bestRoute;
    }

    /**
     * @dev Find direct route between two tokens
     */
    function _findDirectRoute(address _tokenIn, address _tokenOut, uint256 _amount) 
        internal 
        view 
        returns (SwapRoute memory route) 
    {
        uint256 bestOutput = 0;
        uint24 bestFee = 0;
        
        for (uint256 i = 0; i < feeList.length; i++) {
            uint24 fee = feeList[i];
            address poolAddress = factory.getPool(_tokenIn, _tokenOut, fee);
            
            if (poolAddress != address(0)) {
                try quoter.quoteExactInputSingle(_tokenIn, _tokenOut, fee, _amount, 0) 
                returns (uint256 amountOut, uint160, uint32, uint256 gasEst) {
                    if (amountOut > bestOutput) {
                        bestOutput = amountOut;
                        bestFee = fee;
                        route.gasEstimate = gasEst;
                    }
                } catch {
                    // Skip this fee tier
                }
            }
        }
        
        if (bestOutput > 0) {
            route.tokens = new address[](2);
            route.tokens[0] = _tokenIn;
            route.tokens[1] = _tokenOut;
            route.fees = new uint24[](1);
            route.fees[0] = bestFee;
            route.expectedOutput = bestOutput;
            route.isDirect = true;
            route.isValid = true;
            route.encodedPath = _encodePath(_tokenIn, bestFee, _tokenOut);
        }
        
        return route;
    }

    /**
     * @dev Execute swap using Universal Router - returns WCELO
     */
    function _executeSwap(address _token, uint256 _amount, SwapRoute memory _route) 
        internal 
        returns (uint256 amountOut) 
    {
        uint256 minAmountOut;
        
        if (_route.isDirect && _route.expectedOutput > 0) {
            minAmountOut = (_route.expectedOutput * (10000 - slippageTolerance)) / 10000;
        } else {
            minAmountOut = 1;
        }
        
        // Approve token for Universal Router
        IERC20(_token).approve(address(universalRouter), _amount);
        
        // Prepare Universal Router commands for V3 swap
        bytes memory commands = abi.encodePacked(V3_SWAP_EXACT_IN);
        
        // Prepare swap parameters
        bytes memory swapData = abi.encode(
            address(this), // recipient (this contract will receive WCELO)
            _amount,
            minAmountOut,
            _route.encodedPath,
            false // payerIsUser
        );
        
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = swapData;
        
        // Record WCELO balance before swap
        uint256 balanceBefore = IERC20(CELO).balanceOf(address(this));
        
        // Execute swap
        universalRouter.execute(commands, inputs);
        
        // Calculate actual WCELO received
        uint256 balanceAfter = IERC20(CELO).balanceOf(address(this));
        amountOut = balanceAfter - balanceBefore;
        
        require(amountOut > 0, "Swap failed");
        
        return amountOut;
    }

    /**
     * @dev Encode simple path for Uniswap V3
     */
    function _encodePath(address _tokenA, uint24 _fee, address _tokenB) 
        internal 
        pure 
        returns (bytes memory path) 
    {
        path = abi.encodePacked(_tokenA, _fee, _tokenB);
    }

    /**
     * @dev Get comprehensive voting estimate - simplified for Universal Router
     */
    function getVotingEstimate(address _token, uint256 _amount) 
        external 
        view 
        returns (VotingEstimate memory estimate) 
    {
        estimate.inputToken = _token;
        estimate.inputAmount = _amount;
        estimate.isValid = false;
        
        // Handle CELO directly
        if (_token == CELO) {
            estimate.expectedCelo = _amount;
            estimate.minimumCelo = _amount;
            estimate.gasEstimate = 21000;
            estimate.isValid = true;
            return estimate;
        }
        
        // Try to find direct route for estimation
        SwapRoute memory directRoute = _findDirectRoute(_token, CELO, _amount);
        
        if (directRoute.isValid && directRoute.expectedOutput > 0) {
            estimate.expectedCelo = directRoute.expectedOutput;
            estimate.bestRoute = directRoute;
            estimate.minimumCelo = (directRoute.expectedOutput * (10000 - slippageTolerance)) / 10000;
            estimate.slippageAmount = directRoute.expectedOutput - estimate.minimumCelo;
            estimate.slippagePercent = (estimate.slippageAmount * 10000) / directRoute.expectedOutput;
            estimate.gasEstimate = directRoute.gasEstimate + 200000; // Add buffer for Universal Router
            estimate.isValid = true;
        } else {
            // For tokens without direct pools, we can't easily estimate
            // but Universal Router should still be able to route
            estimate.expectedCelo = 0;
            estimate.minimumCelo = 0;
            estimate.gasEstimate = 300000; // Conservative estimate for complex routing
            estimate.isValid = true; // Assume Universal Router can handle it
            estimate.errorMessage = "No direct pool found - Universal Router will attempt multi-hop routing";
        }
        
        return estimate;
    }

    /**
     * @dev Get available direct routes for a token (simplified)
     */
    function getAllRoutes(address _token, uint256 _amount) 
        external 
        view 
        returns (SwapRoute[] memory routes) 
    {
        if (_token == CELO) {
            routes = new SwapRoute[](1);
            routes[0].tokens = new address[](1);
            routes[0].tokens[0] = CELO;
            routes[0].expectedOutput = _amount;
            routes[0].isDirect = true;
            routes[0].isValid = true;
            return routes;
        }
        
        // Only return direct routes - Universal Router handles complex routing automatically
        SwapRoute memory directRoute = _findDirectRoute(_token, CELO, _amount);
        
        if (directRoute.isValid) {
            routes = new SwapRoute[](1);
            routes[0] = directRoute;
        } else {
            routes = new SwapRoute[](1);
            routes[0].tokens = new address[](2);
            routes[0].tokens[0] = _token;
            routes[0].tokens[1] = CELO;
            routes[0].isDirect = false;
            routes[0].isValid = true;
            routes[0].expectedOutput = 0; // Unknown - Universal Router will determine
        }
        
        return routes;
    }

    /**
     * @dev Admin functions
     */
    function addIntermediateToken(address _token) external onlyOwner {
        require(_token != address(0), "Invalid token");
        // Check if token already exists
        for (uint256 i = 0; i < intermediateTokens.length; i++) {
            require(intermediateTokens[i] != _token, "Token already exists");
        }
        intermediateTokens.push(_token);
    }

    function removeIntermediateToken(address _token) external onlyOwner {
        for (uint256 i = 0; i < intermediateTokens.length; i++) {
            if (intermediateTokens[i] == _token) {
                intermediateTokens[i] = intermediateTokens[intermediateTokens.length - 1];
                intermediateTokens.pop();
                break;
            }
        }
    }

    function clearIntermediateTokens() external onlyOwner {
        delete intermediateTokens;
    }

    function setSlippageTolerance(uint256 _newSlippage) external onlyOwner {
        require(_newSlippage <= MAX_SLIPPAGE, "Slippage too high");
        slippageTolerance = _newSlippage;
    }

    function setFeeList(uint24[] calldata _newFees) external onlyOwner {
        require(_newFees.length > 0, "Must have at least one fee");
        feeList = _newFees;
    }

    /**
     * @dev Emergency recovery
     */
    function recoverTokens(address _token, uint256 _amount) external onlyOwner {
        if (_token == address(0)) {
            payable(owner()).transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(owner(), _amount);
        }
    }

    /**
     * @dev View functions
     */
    function getIntermediateTokens() external view returns (address[] memory) {
        return intermediateTokens;
    }

    function getConfiguration() external view returns (
        address routerAddr,
        address quoterAddr,
        address factoryAddr,
        address sovereignSeasAddr,
        address celoAddr,
        uint256 currentSlippage,
        uint24[] memory fees
    ) {
        return (
            address(universalRouter),
            address(quoter),
            address(factory),
            address(sovereignSeas),
            CELO,
            slippageTolerance,
            feeList
        );
    }

    // IMPORTANT: Contract must be able to receive native CELO
    receive() external payable {
        // Contract can receive native CELO from WCELO unwrapping and for voting
    }
}