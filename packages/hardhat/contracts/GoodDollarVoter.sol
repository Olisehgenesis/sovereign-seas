// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Interface for Ubeswap V2 Router
interface IUbeswapV2Router {
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
}

// Interface for Ubeswap V2 Factory
interface IUbeswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

// Interface for Ubeswap V2 Pair
interface IUbeswapV2Pair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

// Interface for the Uniswap V3 Pool (fallback)
interface IUniswapV3Pool {
    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1);
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
}

// Interface for SovereignSeas voting
interface ISovereignSeas {
    function voteWithCelo(uint256 _campaignId, uint256 _projectId, bytes32 _bypassCode) external payable;
    function vote(uint256 _campaignId, uint256 _projectId, address _token, uint256 _amount, bytes32 _bypassCode) external;
}

// Uniswap V3 Swap Callback interface (for fallback)
interface IUniswapV3SwapCallback {
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external;
}

contract GoodDollarVoter is IUniswapV3SwapCallback, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Contract addresses
    address public constant GOOD_DOLLAR = 0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A; // GoodDollar token
    address public constant CELO = 0x471EcE3750Da237f93B8E339c536989b8978a438; // CELO token
    address public constant CUSD = 0x765DE816845861e75A25fCA122bb6898B8B1282a; // cUSD token
    
    // Ubeswap V2 (primary route)
    address public constant UBESWAP_V2_ROUTER = 0xE3D8bd6Aed4F159bc8000a9cD47CffDb95F96121; // Ubeswap V2 Router
    address public constant UBESWAP_V2_GS_CELO_PAIR = 0x25878951ae130014e827e6f54fd3b4cca057a7e8; // GS/CELO Ubeswap V2 pair
    
    // Uniswap V3 (fallback route)
    address public constant UNISWAP_V3_GS_CELO_POOL = 0x98287d4f15eede6517f215b3fcc10480c231e840; // GS/CELO Uniswap V3 pool
    address public constant UNISWAP_V3_GS_CUSD_POOL = 0x11EeA4c62288186239241cE21F54034006C79B3F; // GS/cUSD Uniswap V3 pool
    
    ISovereignSeas public immutable sovereignSeas;
    IUbeswapV2Router public immutable ubeswapRouter;
    IUbeswapV2Factory public immutable ubeswapFactory;
    IERC20 public immutable goodDollar;
    IERC20 public immutable celo;
    IERC20 public immutable cusd;
    
    // Configuration
    uint256 public constant MIN_LIQUIDITY_THRESHOLD = 100e18; // Minimum liquidity in CELO for Ubeswap V2
    uint256 public slippageTolerance = 300; // 3% slippage tolerance (300 basis points)
    
    // Events
    event SwapAndVote(
        address indexed voter,
        uint256 indexed campaignId,
        uint256 indexed projectId,
        uint256 gsAmount,
        uint256 outputAmount,
        address outputToken,
        string route
    );
    
    event RouteUsed(string route, uint256 inputAmount, uint256 outputAmount, address outputToken);
    
    event EmergencyWithdraw(
        address indexed token,
        address indexed recipient,
        uint256 amount
    );

    // Struct to pass data to the Uniswap V3 swap callback
    struct SwapCallbackData {
        address tokenIn;
        address tokenOut;
        address payer;
        uint256 amountIn;
    }

    constructor(address _sovereignSeas) Ownable(msg.sender) {
        require(_sovereignSeas != address(0), "Invalid SovereignSeas address");
        
        sovereignSeas = ISovereignSeas(_sovereignSeas);
        ubeswapRouter = IUbeswapV2Router(UBESWAP_V2_ROUTER);
        ubeswapFactory = IUbeswapV2Factory(ubeswapRouter.factory());
        goodDollar = IERC20(GOOD_DOLLAR);
        celo = IERC20(CELO);
        cusd = IERC20(CUSD);
        
        // Approve tokens for Ubeswap router
        goodDollar.approve(UBESWAP_V2_ROUTER, type(uint256).max);
    }

    /**
     * @notice Swap GoodDollar and vote in SovereignSeas campaign with intelligent routing
     * @param _campaignId Campaign ID to vote in
     * @param _projectId Project ID to vote for
     * @param _gsAmount Amount of GoodDollar to swap
     * @param _minOutputAmount Minimum output to receive (slippage protection)
     * @param _bypassCode Bypass code for voting (if any)
     */
    function swapAndVote(
        uint256 _campaignId,
        uint256 _projectId,
        uint256 _gsAmount,
        uint256 _minOutputAmount,
        bytes32 _bypassCode
    ) external nonReentrant {
        require(_gsAmount > 0, "Amount must be greater than 0");
        
        // Transfer GoodDollar from user
        goodDollar.safeTransferFrom(msg.sender, address(this), _gsAmount);
        
        // Determine best route and execute swap
        (uint256 outputAmount, address outputToken, string memory route) = _executeOptimalSwap(_gsAmount, _minOutputAmount);
        
        // Vote with the received tokens
        if (outputToken == CELO) {
            // Vote with CELO tokens (ERC20)
            celo.approve(address(sovereignSeas), outputAmount);
            sovereignSeas.vote(_campaignId, _projectId, CELO, outputAmount, _bypassCode);
        } else if (outputToken == CUSD) {
            // Vote with cUSD tokens
            cusd.approve(address(sovereignSeas), outputAmount);
            sovereignSeas.vote(_campaignId, _projectId, CUSD, outputAmount, _bypassCode);
        }
        
        emit SwapAndVote(msg.sender, _campaignId, _projectId, _gsAmount, outputAmount, outputToken, route);
    }

    /**
     * @notice Execute optimal swap route based on liquidity and conditions
     */
    function _executeOptimalSwap(uint256 _gsAmount, uint256 _minOutputAmount) 
        internal 
        returns (uint256 outputAmount, address outputToken, string memory route) 
    {
        // Try Ubeswap V2 GS → CELO first (primary route)
        if (_checkUbeswapV2Liquidity()) {
            try this._swapUbeswapV2(_gsAmount, _minOutputAmount) returns (uint256 amount) {
                return (amount, CELO, "UbeswapV2_GS_CELO");
            } catch {
                // Ubeswap V2 failed, continue to fallback
            }
        }
        
        // Fallback 1: Uniswap V3 GS → CELO
        try this._swapUniswapV3GSCELO(_gsAmount, _minOutputAmount) returns (uint256 amount) {
            return (amount, CELO, "UniswapV3_GS_CELO");
        } catch {
            // Uniswap V3 GS→CELO failed, try GS→cUSD
        }
        
        // Fallback 2: Uniswap V3 GS → cUSD (final fallback)
        uint256 cusdAmount = _swapUniswapV3GStoUSD(_gsAmount, _minOutputAmount);
        return (cusdAmount, CUSD, "UniswapV3_GS_cUSD");
    }

    /**
     * @notice Check if Ubeswap V2 has sufficient liquidity
     */
    function _checkUbeswapV2Liquidity() internal view returns (bool) {
        try IUbeswapV2Pair(UBESWAP_V2_GS_CELO_PAIR).getReserves() returns (
            uint112 reserve0, 
            uint112 reserve1, 
            uint32
        ) {
            // Check which token is CELO and ensure it has enough liquidity
            address token0 = IUbeswapV2Pair(UBESWAP_V2_GS_CELO_PAIR).token0();
            uint256 celoReserve = (token0 == CELO) ? reserve0 : reserve1;
            return celoReserve >= MIN_LIQUIDITY_THRESHOLD;
        } catch {
            return false;
        }
    }

    /**
     * @notice Swap using Ubeswap V2 GS → CELO
     */
    function _swapUbeswapV2(uint256 _gsAmount, uint256 _minCeloOut) external returns (uint256) {
        require(msg.sender == address(this), "Internal only");
        
        address[] memory path = new address[](2);
        path[0] = GOOD_DOLLAR;
        path[1] = CELO;
        
        uint256[] memory amounts = ubeswapRouter.swapExactTokensForTokens(
            _gsAmount,
            _minCeloOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 celoReceived = amounts[1];
        emit RouteUsed("UbeswapV2_GS_CELO", _gsAmount, celoReceived, CELO);
        return celoReceived;
    }

    /**
     * @notice Swap using Uniswap V3 GS → CELO
     */
    function _swapUniswapV3GSCELO(uint256 _gsAmount, uint256 _minCeloOut) external returns (uint256) {
        require(msg.sender == address(this), "Internal only");
        
        IUniswapV3Pool pool = IUniswapV3Pool(UNISWAP_V3_GS_CELO_POOL);
        
        // Determine swap direction
        address token0 = pool.token0();
        bool zeroForOne = token0 == GOOD_DOLLAR;
        
        // Calculate price limit
        uint160 sqrtPriceLimitX96 = zeroForOne 
            ? 4295128739  // MIN_SQRT_RATIO + 1
            : 1461446703485210103287273052203988822378723970341; // MAX_SQRT_RATIO - 1
        
        SwapCallbackData memory callbackData = SwapCallbackData({
            tokenIn: GOOD_DOLLAR,
            tokenOut: CELO,
            payer: address(this),
            amountIn: _gsAmount
        });
        
        uint256 celoBalanceBefore = celo.balanceOf(address(this));
        
        pool.swap(
            address(this),
            zeroForOne,
            int256(_gsAmount),
            sqrtPriceLimitX96,
            abi.encode(callbackData)
        );
        
        uint256 celoReceived = celo.balanceOf(address(this)) - celoBalanceBefore;
        require(celoReceived >= _minCeloOut, "Insufficient CELO received");
        
        emit RouteUsed("UniswapV3_GS_CELO", _gsAmount, celoReceived, CELO);
        return celoReceived;
    }

    /**
     * @notice Swap using Uniswap V3 GS → cUSD (final fallback)
     */
    function _swapUniswapV3GStoUSD(uint256 _gsAmount, uint256 _minCusdOut) internal returns (uint256) {
        IUniswapV3Pool pool = IUniswapV3Pool(UNISWAP_V3_GS_CUSD_POOL);
        
        // Determine swap direction
        address token0 = pool.token0();
        bool zeroForOne = token0 == GOOD_DOLLAR;
        
        // Calculate price limit
        uint160 sqrtPriceLimitX96 = zeroForOne 
            ? 4295128739  // MIN_SQRT_RATIO + 1
            : 1461446703485210103287273052203988822378723970341; // MAX_SQRT_RATIO - 1
        
        SwapCallbackData memory callbackData = SwapCallbackData({
            tokenIn: GOOD_DOLLAR,
            tokenOut: CUSD,
            payer: address(this),
            amountIn: _gsAmount
        });
        
        uint256 cusdBalanceBefore = cusd.balanceOf(address(this));
        
        pool.swap(
            address(this),
            zeroForOne,
            int256(_gsAmount),
            sqrtPriceLimitX96,
            abi.encode(callbackData)
        );
        
        uint256 cusdReceived = cusd.balanceOf(address(this)) - cusdBalanceBefore;
        require(cusdReceived >= _minCusdOut, "Insufficient cUSD received");
        
        emit RouteUsed("UniswapV3_GS_cUSD", _gsAmount, cusdReceived, CUSD);
        return cusdReceived;
    }

    /**
     * @notice Uniswap V3 swap callback
     */
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external override {
        require(
            msg.sender == UNISWAP_V3_GS_CELO_POOL || msg.sender == UNISWAP_V3_GS_CUSD_POOL, 
            "Invalid callback caller"
        );
        
        SwapCallbackData memory callbackData = abi.decode(data, (SwapCallbackData));
        
        // Transfer the required input token
        if (amount0Delta > 0) {
            IERC20(IUniswapV3Pool(msg.sender).token0()).safeTransfer(msg.sender, uint256(amount0Delta));
        }
        if (amount1Delta > 0) {
            IERC20(IUniswapV3Pool(msg.sender).token1()).safeTransfer(msg.sender, uint256(amount1Delta));
        }
    }

    /**
     * @notice Get quote for optimal route
     */
    function getOptimalQuote(uint256 _gsAmount) external view returns (
        uint256 bestOutput,
        address bestOutputToken,
        string memory bestRoute
    ) {
        if (_gsAmount == 0) return (0, address(0), "");
        
        // Check Ubeswap V2 quote
        if (_checkUbeswapV2Liquidity()) {
            try this._getUbeswapV2Quote(_gsAmount) returns (uint256 celoOut) {
                bestOutput = celoOut;
                bestOutputToken = CELO;
                bestRoute = "UbeswapV2_GS_CELO";
            } catch {
                // Continue to other options
            }
        }
        
        // Check Uniswap V3 GS→CELO quote
        try this._getUniswapV3Quote(UNISWAP_V3_GS_CELO_POOL, _gsAmount) returns (uint256 celoOut) {
            if (celoOut > bestOutput) {
                bestOutput = celoOut;
                bestOutputToken = CELO;
                bestRoute = "UniswapV3_GS_CELO";
            }
        } catch {
            // Continue
        }
        
        // Check Uniswap V3 GS→cUSD quote
        try this._getUniswapV3Quote(UNISWAP_V3_GS_CUSD_POOL, _gsAmount) returns (uint256 cusdOut) {
            if (cusdOut > bestOutput) {
                bestOutput = cusdOut;
                bestOutputToken = CUSD;
                bestRoute = "UniswapV3_GS_cUSD";
            }
        } catch {
            // Continue
        }
    }

    /**
     * @notice Get Ubeswap V2 quote
     */
    function _getUbeswapV2Quote(uint256 _gsAmount) external view returns (uint256) {
        require(msg.sender == address(this), "Internal only");
        
        address[] memory path = new address[](2);
        path[0] = GOOD_DOLLAR;
        path[1] = CELO;
        
        uint256[] memory amounts = ubeswapRouter.getAmountsOut(_gsAmount, path);
        return amounts[1];
    }

    /**
     * @notice Get Uniswap V3 quote (simplified)
     */
    function _getUniswapV3Quote(address poolAddress, uint256 _gsAmount) external view returns (uint256) {
        require(msg.sender == address(this), "Internal only");
        
        IUniswapV3Pool pool = IUniswapV3Pool(poolAddress);
        (uint160 sqrtPriceX96, , , , , , ) = pool.slot0();
        
        if (sqrtPriceX96 == 0) return 0;
        
        // Simple approximation - in production you'd use more sophisticated pricing
        uint256 price = (uint256(sqrtPriceX96) * uint256(sqrtPriceX96)) >> 192;
        return (_gsAmount * price) / 1e18;
    }

    /**
     * @notice Update slippage tolerance (only owner)
     */
    function updateSlippageTolerance(uint256 _newSlippage) external onlyOwner {
        require(_newSlippage <= 1000, "Slippage too high"); // Max 10%
        slippageTolerance = _newSlippage;
    }

    /**
     * @notice Emergency function to withdraw tokens
     */
    function emergencyWithdraw(
        address _token,
        address _recipient,
        uint256 _amount
    ) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        
        if (_token == address(0)) {
            // Withdraw native CELO
            uint256 balance = address(this).balance;
            uint256 withdrawAmount = _amount == 0 ? balance : _amount;
            require(withdrawAmount <= balance, "Insufficient balance");
            payable(_recipient).transfer(withdrawAmount);
        } else {
            // Withdraw ERC20 tokens
            IERC20 token = IERC20(_token);
            uint256 balance = token.balanceOf(address(this));
            uint256 withdrawAmount = _amount == 0 ? balance : _amount;
            require(withdrawAmount <= balance, "Insufficient balance");
            token.safeTransfer(_recipient, withdrawAmount);
        }
        
        emit EmergencyWithdraw(_token, _recipient, _amount);
    }

    /**
     * @notice Check if the contract can perform swaps
     */
    function isOperational() external view returns (bool) {
        return _checkUbeswapV2Liquidity();
    }

    // Allow contract to receive native CELO
    receive() external payable {}
}