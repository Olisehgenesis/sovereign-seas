// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Ubeswap V2 Router interface
interface IUbeswapV2Router02 {
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
    function allPairsLength() external view returns (uint);
}

// Ubeswap V2 Pair interface
interface IUbeswapV2Pair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

// SovereignSeasV4 interface for voting
interface ISovereignSeasV4 {
    function voteWithCelo(uint256 _campaignId, uint256 _projectId, bytes32 _bypassCode) external payable;
}

contract UbeswapVotingProxy is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Immutable contract addresses (set from constructor/env)
    IUbeswapV2Router02 public immutable ubeswapRouter;
    IUbeswapV2Factory public immutable ubeswapFactory;
    ISovereignSeasV4 public immutable sovereignSeas;
    address public immutable CELO;
    address public immutable WETH; // Only used if absolutely necessary for routing
    
    // Configuration
    uint256 public slippageTolerance = 300; // 3% default slippage tolerance (300 basis points)
    uint256 public constant MAX_SLIPPAGE = 1000; // 10% maximum slippage allowed
    uint256 public constant SWAP_DEADLINE_BUFFER = 300; // 5 minutes
    
    // Dust collection
    mapping(address => uint256) public dustBalances;
    uint256 public dustThreshold = 1e15; // 0.001 CELO equivalent threshold for dust
    
    // Routing preferences (prefer direct routes over WETH routes)
    bool public allowWETHRouting = false; // Start with false, can be enabled if needed
    
    // Structs for comprehensive estimates
    struct VotingEstimate {
        address inputToken;
        uint256 inputAmount;
        uint256 expectedCelo;
        uint256 minimumCelo;
        address[] routePath;
        uint256 slippageAmount;
        uint256 slippagePercent; // in basis points (100 = 1%)
        bool isValid;
        bool usesWETH;
    }

    struct PairInfo {
        address pairAddress;
        uint112 reserve0;
        uint112 reserve1;
        address token0;
        address token1;
        bool exists;
    }

    // Events
    event VoteWithTokenConversion(
        address indexed voter,
        uint256 indexed campaignId,
        uint256 indexed projectId,
        address inputToken,
        uint256 inputAmount,
        uint256 celoReceived,
        address[] routePath,
        bool usedWETH,
        bytes32 bypassCode
    );
    event SlippageToleranceUpdated(uint256 oldTolerance, uint256 newTolerance);
    event WETHRoutingToggled(bool enabled);
    event DustCollected(address indexed token, uint256 amount, uint256 celoValue);
    event DustClaimed(address indexed token, address indexed recipient, uint256 amount);
    event DustThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event TokensRecovered(address indexed token, address indexed recipient, uint256 amount);

    constructor(
        address _ubeswapRouter,
        address _ubeswapFactory,
        address _sovereignSeas,
        address _celo
    ) Ownable(msg.sender) {
        require(_ubeswapRouter != address(0), "Invalid router address");
        require(_ubeswapFactory != address(0), "Invalid factory address");
        require(_sovereignSeas != address(0), "Invalid SovereignSeas address");
        require(_celo != address(0), "Invalid CELO address");
        
        ubeswapRouter = IUbeswapV2Router02(_ubeswapRouter);
        ubeswapFactory = IUbeswapV2Factory(_ubeswapFactory);
        sovereignSeas = ISovereignSeasV4(_sovereignSeas);
        CELO = _celo;
        WETH = IUbeswapV2Router02(_ubeswapRouter).WETH();
    }

    /**
     * @dev Vote with any ERC20 token by converting it to CELO via Ubeswap V2
     * @param _campaignId Campaign ID to vote for
     * @param _projectId Project ID to vote for
     * @param _token Token to convert to CELO
     * @param _amount Amount of token to convert
     * @param _bypassCode Bypass code for the vote
     * @param _forceWETHRoute Force routing through WETH (only if enabled)
     */
    function voteWithToken(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount,
        bytes32 _bypassCode,
        bool _forceWETHRoute
    ) external nonReentrant {
        require(_token != CELO, "Use sovereignSeas.voteWithCelo() directly for CELO");
        require(_amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens from user
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        // Convert token to CELO
        (uint256 celoReceived, address[] memory path, bool usedWETH) = _convertTokenToCelo(_token, _amount, _forceWETHRoute);
        require(celoReceived > 0, "No CELO received from conversion");
        
        // Check for dust after conversion
        _collectDust(_token);
        
        // Vote with converted CELO
        sovereignSeas.voteWithCelo{value: celoReceived}(_campaignId, _projectId, _bypassCode);
        
        emit VoteWithTokenConversion(
            msg.sender,
            _campaignId,
            _projectId,
            _token,
            _amount,
            celoReceived,
            path,
            usedWETH,
            _bypassCode
        );
    }

    /**
     * @dev Convert ERC20 token to CELO via Ubeswap V2
     */
    function _convertTokenToCelo(
        address _token,
        uint256 _amount,
        bool _forceWETHRoute
    ) internal returns (uint256, address[] memory, bool) {
        // Approve token for Ubeswap router
        IERC20(_token).approve(address(ubeswapRouter), _amount);
        
        // Determine best route
        (address[] memory path, bool usesWETH) = _getBestRoute(_token, CELO, _forceWETHRoute);
        require(path.length >= 2, "No valid route found");
        
        // Get expected output with slippage protection
        uint256[] memory amountsOut = ubeswapRouter.getAmountsOut(_amount, path);
        uint256 expectedOut = amountsOut[amountsOut.length - 1];
        require(expectedOut > 0, "No liquidity available for this route");
        
        uint256 minAmountOut = (expectedOut * (10000 - slippageTolerance)) / 10000;
        
        // Perform the swap
        uint256[] memory amounts = ubeswapRouter.swapExactTokensForTokens(
            _amount,
            minAmountOut,
            path,
            address(this),
            block.timestamp + SWAP_DEADLINE_BUFFER
        );
        
        return (amounts[amounts.length - 1], path, usesWETH);
    }

    /**
     * @dev Get the best route for token swap (direct vs through WETH)
     */
    function _getBestRoute(
        address _tokenIn,
        address _tokenOut,
        bool _forceWETHRoute
    ) internal view returns (address[] memory bestPath, bool usesWETH) {
        // Try direct route first (preferred)
        if (!_forceWETHRoute && _pairExists(_tokenIn, _tokenOut)) {
            address[] memory directPath = new address[](2);
            directPath[0] = _tokenIn;
            directPath[1] = _tokenOut;
            return (directPath, false);
        }
        
        // Try WETH route if enabled and direct route failed or was forced
        if (allowWETHRouting && (_forceWETHRoute || !_pairExists(_tokenIn, _tokenOut))) {
            if (_pairExists(_tokenIn, WETH) && _pairExists(WETH, _tokenOut)) {
                address[] memory wethPath = new address[](3);
                wethPath[0] = _tokenIn;
                wethPath[1] = WETH;
                wethPath[2] = _tokenOut;
                return (wethPath, true);
            }
        }
        
        // If no route found, revert with helpful message
        if (_pairExists(_tokenIn, _tokenOut)) {
            address[] memory directPath = new address[](2);
            directPath[0] = _tokenIn;
            directPath[1] = _tokenOut;
            return (directPath, false);
        }
        
        revert("No valid route found - enable WETH routing or ensure pair exists");
    }

    /**
     * @dev Check if a pair exists for two tokens
     */
    function _pairExists(address _tokenA, address _tokenB) internal view returns (bool) {
        address pair = ubeswapFactory.getPair(_tokenA, _tokenB);
        return pair != address(0);
    }

    /**
     * @dev Get pair information
     */
    function _getPairInfo(address _tokenA, address _tokenB) internal view returns (PairInfo memory info) {
        address pairAddress = ubeswapFactory.getPair(_tokenA, _tokenB);
        info.pairAddress = pairAddress;
        info.exists = pairAddress != address(0);
        
        if (info.exists) {
            IUbeswapV2Pair pair = IUbeswapV2Pair(pairAddress);
            (info.reserve0, info.reserve1,) = pair.getReserves();
            info.token0 = pair.token0();
            info.token1 = pair.token1();
        }
        
        return info;
    }

    /**
     * @dev Collect dust amounts that are below threshold
     */
    function _collectDust(address _token) internal {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance > 0) {
            uint256 celoValue = _estimateCeloValue(_token, balance);
            if (celoValue <= dustThreshold) {
                dustBalances[_token] += balance;
                emit DustCollected(_token, balance, celoValue);
            }
        }
    }

    /**
     * @dev Estimate CELO value of a token amount (best effort, no revert)
     */
    function _estimateCeloValue(address _token, uint256 _amount) internal view returns (uint256) {
        if (_token == CELO) return _amount;
        if (_amount == 0) return 0;
        
        // Try direct route first
        if (_pairExists(_token, CELO)) {
            try this.getExpectedCeloOutputView(_token, _amount, false) returns (uint256 output, bool success) {
                if (success && output > 0) return output;
            } catch {}
        }
        
        // Try WETH route if enabled
        if (allowWETHRouting && _pairExists(_token, WETH) && _pairExists(WETH, CELO)) {
            try this.getExpectedCeloOutputView(_token, _amount, true) returns (uint256 output, bool success) {
                if (success && output > 0) return output;
            } catch {}
        }
        
        return 0; // No route found
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Get expected CELO output for a token swap (PURE VIEW FUNCTION)
     * @param _token Input token address
     * @param _amount Input amount
     * @param _useWETHRoute Whether to route through WETH
     * @return expectedCelo Expected CELO output amount
     * @return success Whether the swap is possible
     */
    function getExpectedCeloOutputView(
        address _token,
        uint256 _amount,
        bool _useWETHRoute
    ) external view returns (uint256 expectedCelo, bool success) {
        if (_token == CELO) return (_amount, true);
        if (_amount == 0) return (0, false);
        
        (address[] memory path, bool usesWETH) = _getBestRoute(_token, CELO, _useWETHRoute);
        
        if (path.length < 2) return (0, false);
        
        try ubeswapRouter.getAmountsOut(_amount, path) returns (uint256[] memory amounts) {
            return (amounts[amounts.length - 1], true);
        } catch {
            return (0, false);
        }
    }

    /**
     * @dev Get comprehensive voting cost estimate (VIEW)
     * @param _token Input token address
     * @param _amount Input amount
     * @param _useWETHRoute Whether to route through WETH
     * @return estimate Comprehensive estimate struct
     */
    function getVotingCostEstimate(
        address _token,
        uint256 _amount,
        bool _useWETHRoute
    ) external view returns (VotingEstimate memory estimate) {
        estimate.inputToken = _token;
        estimate.inputAmount = _amount;
        estimate.isValid = false;

        if (_token == CELO) {
            estimate.expectedCelo = _amount;
            estimate.minimumCelo = _amount;
            estimate.routePath = new address[](1);
            estimate.routePath[0] = CELO;
            estimate.slippageAmount = 0;
            estimate.slippagePercent = 0;
            estimate.usesWETH = false;
            estimate.isValid = true;
            return estimate;
        }

        (address[] memory path, bool usesWETH) = _getBestRoute(_token, CELO, _useWETHRoute);
        
        if (path.length >= 2) {
            try ubeswapRouter.getAmountsOut(_amount, path) returns (uint256[] memory amounts) {
                uint256 expectedCelo = amounts[amounts.length - 1];
                if (expectedCelo > 0) {
                    estimate.expectedCelo = expectedCelo;
                    estimate.routePath = path;
                    estimate.usesWETH = usesWETH;
                    estimate.minimumCelo = (expectedCelo * (10000 - slippageTolerance)) / 10000;
                    estimate.slippageAmount = expectedCelo - estimate.minimumCelo;
                    estimate.slippagePercent = (estimate.slippageAmount * 10000) / expectedCelo;
                    estimate.isValid = true;
                }
            } catch {}
        }

        return estimate;
    }

    /**
     * @dev Batch estimate for multiple tokens (VIEW)
     * @param _tokens Array of token addresses
     * @param _amounts Array of amounts (must match tokens length)
     * @param _useWETHRoute Whether to route through WETH for all
     * @return estimates Array of voting estimates
     */
    function batchEstimateVoting(
        address[] calldata _tokens,
        uint256[] calldata _amounts,
        bool _useWETHRoute
    ) external view returns (VotingEstimate[] memory estimates) {
        require(_tokens.length == _amounts.length, "Arrays length mismatch");
        
        estimates = new VotingEstimate[](_tokens.length);
        
        for (uint256 i = 0; i < _tokens.length; i++) {
            estimates[i] = this.getVotingCostEstimate(_tokens[i], _amounts[i], _useWETHRoute);
        }
        
        return estimates;
    }

    /**
     * @dev Check if a direct pair exists between token and CELO
     * @param _token Token to check
     * @return hasDirectPair True if direct pair exists
     * @return pairAddress Address of the pair contract
     */
    function checkDirectPairWithCelo(address _token) external view returns (bool hasDirectPair, address pairAddress) {
        pairAddress = ubeswapFactory.getPair(_token, CELO);
        hasDirectPair = pairAddress != address(0);
        return (hasDirectPair, pairAddress);
    }

    /**
     * @dev Get detailed pair information
     * @param _tokenA First token
     * @param _tokenB Second token
     * @return info Detailed pair information
     */
    function getPairInfo(address _tokenA, address _tokenB) external view returns (PairInfo memory info) {
        return _getPairInfo(_tokenA, _tokenB);
    }

    /**
     * @dev Get token exchange rate to CELO (VIEW)
     * @param _token Token to check rate for
     * @param _useWETHRoute Whether to route through WETH
     * @return rate How much CELO you get per 1 unit of token (scaled by token decimals)
     * @return routePath Path used for the swap
     * @return hasLiquidity Whether liquidity exists
     */
    function getTokenToCeloRate(
        address _token,
        bool _useWETHRoute
    ) external view returns (uint256 rate, address[] memory routePath, bool hasLiquidity) {
        if (_token == CELO) {
            routePath = new address[](1);
            routePath[0] = CELO;
            return (1e18, routePath, true);
        }
        
        try IERC20Metadata(_token).decimals() returns (uint8 decimals) {
            uint256 oneToken = 10 ** decimals;
            (uint256 expectedCelo, bool success) = this.getExpectedCeloOutputView(_token, oneToken, _useWETHRoute);
            (address[] memory path,) = _getBestRoute(_token, CELO, _useWETHRoute);
            return (expectedCelo, path, success);
        } catch {
            routePath = new address[](0);
            return (0, routePath, false);
        }
    }

    /**
     * @dev Get all available routes for a token to CELO
     * @param _token Token to check routes for
     * @return hasDirectRoute Whether direct route exists
     * @return hasWETHRoute Whether WETH route exists (if enabled)
     * @return directRate Rate for direct route (0 if not available)
     * @return wethRate Rate for WETH route (0 if not available)
     */
    function getAvailableRoutes(address _token) external view returns (
        bool hasDirectRoute,
        bool hasWETHRoute,
        uint256 directRate,
        uint256 wethRate
    ) {
        if (_token == CELO) {
            return (true, false, 1e18, 0);
        }

        try IERC20Metadata(_token).decimals() returns (uint8 decimals) {
            uint256 oneToken = 10 ** decimals;
            
            // Check direct route
            hasDirectRoute = _pairExists(_token, CELO);
            if (hasDirectRoute) {
                (directRate,) = this.getExpectedCeloOutputView(_token, oneToken, false);
            }
            
            // Check WETH route (only if enabled)
            if (allowWETHRouting) {
                hasWETHRoute = _pairExists(_token, WETH) && _pairExists(WETH, CELO);
                if (hasWETHRoute) {
                    (wethRate,) = this.getExpectedCeloOutputView(_token, oneToken, true);
                }
            }
        } catch {
            // Token doesn't support decimals() or other error
            return (false, false, 0, 0);
        }

        return (hasDirectRoute, hasWETHRoute, directRate, wethRate);
    }

    // ============ DUST MANAGEMENT ============

    /**
     * @dev Get dust information for a token (VIEW)
     */
    function getDustInfo(address _token) external view returns (
        uint256 dustAmount,
        uint256 currentBalance,
        uint256 estimatedCeloValue,
        bool isCurrentBalanceDust
    ) {
        dustAmount = dustBalances[_token];
        
        if (_token == address(0)) {
            currentBalance = address(this).balance;
            estimatedCeloValue = currentBalance;
        } else {
            currentBalance = IERC20(_token).balanceOf(address(this));
            estimatedCeloValue = _estimateCeloValue(_token, currentBalance);
        }
        
        isCurrentBalanceDust = currentBalance > 0 && estimatedCeloValue <= dustThreshold;
        
        return (dustAmount, currentBalance, estimatedCeloValue, isCurrentBalanceDust);
    }

    /**
     * @dev Batch get dust information for multiple tokens (VIEW)
     */
    function batchGetDustInfo(address[] calldata _tokens) external view returns (
        uint256[] memory dustAmounts,
        uint256[] memory currentBalances,
        uint256[] memory estimatedValues,
        bool[] memory isDustArray
    ) {
        dustAmounts = new uint256[](_tokens.length);
        currentBalances = new uint256[](_tokens.length);
        estimatedValues = new uint256[](_tokens.length);
        isDustArray = new bool[](_tokens.length);
        
        for (uint256 i = 0; i < _tokens.length; i++) {
            (
                dustAmounts[i],
                currentBalances[i],
                estimatedValues[i],
                isDustArray[i]
            ) = this.getDustInfo(_tokens[i]);
        }
        
        return (dustAmounts, currentBalances, estimatedValues, isDustArray);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Update slippage tolerance (only owner)
     */
    function setSlippageTolerance(uint256 _newSlippage) external onlyOwner {
        require(_newSlippage <= MAX_SLIPPAGE, "Slippage tolerance too high");
        uint256 oldTolerance = slippageTolerance;
        slippageTolerance = _newSlippage;
        emit SlippageToleranceUpdated(oldTolerance, _newSlippage);
    }

    /**
     * @dev Toggle WETH routing (only owner)
     */
    function setWETHRouting(bool _enabled) external onlyOwner {
        allowWETHRouting = _enabled;
        emit WETHRoutingToggled(_enabled);
    }

    /**
     * @dev Update dust collection threshold (only owner)
     */
    function setDustThreshold(uint256 _newThreshold) external onlyOwner {
        require(_newThreshold <= 1e18, "Dust threshold too high");
        uint256 oldThreshold = dustThreshold;
        dustThreshold = _newThreshold;
        emit DustThresholdUpdated(oldThreshold, _newThreshold);
    }

    /**
     * @dev Claim accumulated dust tokens (only owner)
     */
    function claimDust(
        address _token,
        address _recipient,
        uint256 _amount
    ) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        uint256 dustAmount = dustBalances[_token];
        require(dustAmount > 0, "No dust available for this token");
        
        uint256 amountToClaim = _amount == 0 ? dustAmount : _amount;
        require(amountToClaim <= dustAmount, "Insufficient dust balance");
        
        dustBalances[_token] -= amountToClaim;
        
        if (_token == address(0)) {
            payable(_recipient).transfer(amountToClaim);
        } else {
            IERC20(_token).safeTransfer(_recipient, amountToClaim);
        }
        
        emit DustClaimed(_token, _recipient, amountToClaim);
    }

    /**
     * @dev Batch claim dust from multiple tokens (only owner)
     */
    function batchClaimDust(
        address[] calldata _tokens,
        address _recipient
    ) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        
        for (uint256 i = 0; i < _tokens.length; i++) {
            uint256 dustAmount = dustBalances[_tokens[i]];
            if (dustAmount > 0) {
                dustBalances[_tokens[i]] = 0;
                
                if (_tokens[i] == address(0)) {
                    payable(_recipient).transfer(dustAmount);
                } else {
                    IERC20(_tokens[i]).safeTransfer(_recipient, dustAmount);
                }
                
                emit DustClaimed(_tokens[i], _recipient, dustAmount);
            }
        }
    }

    /**
     * @dev Manually collect dust for a specific token (only owner)
     */
    function manualCollectDust(address _token) external onlyOwner {
        _collectDust(_token);
    }

    /**
     * @dev Emergency function to recover stuck tokens
     */
    function recoverTokens(
        address _token,
        address _recipient,
        uint256 _amount
    ) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        
        if (_token == address(0)) {
            uint256 balance = address(this).balance;
            uint256 amountToRecover = _amount == 0 ? balance : _amount;
            require(amountToRecover <= balance, "Insufficient CELO balance");
            payable(_recipient).transfer(amountToRecover);
        } else {
            IERC20 token = IERC20(_token);
            uint256 balance = token.balanceOf(address(this));
            uint256 amountToRecover = _amount == 0 ? balance : _amount;
            require(amountToRecover <= balance, "Insufficient token balance");
            token.safeTransfer(_recipient, amountToRecover);
        }
        
        emit TokensRecovered(_token, _recipient, _amount);
    }

    /**
     * @dev Get contract configuration
     */
    function getConfiguration() external view returns (
        address router,
        address factory,
        address sovereignSeasContract,
        address celoToken,
        address wethToken,
        uint256 currentSlippage,
        uint256 maxSlippage,
        uint256 currentDustThreshold,
        bool wethRoutingEnabled
    ) {
        return (
            address(ubeswapRouter),
            address(ubeswapFactory),
            address(sovereignSeas),
            CELO,
            WETH,
            slippageTolerance,
            MAX_SLIPPAGE,
            dustThreshold,
            allowWETHRouting
        );
    }

    // Allow contract to receive native CELO
    receive() external payable {
        // Can receive CELO from swaps or direct transfers
    }
}