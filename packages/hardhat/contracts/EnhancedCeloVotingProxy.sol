// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Uniswap V3 Factory interface for pool discovery
interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

// Uniswap V3 Pool interface for liquidity checks
interface IUniswapV3Pool {
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

// Uniswap V3 Router interface
interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external payable returns (uint256 amountOut);
}

// Enhanced QuoterV2 interface
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
}

// SovereignSeasV4 interface for voting
interface ISovereignSeasV4 {
    function voteWithCelo(uint256 _campaignId, uint256 _projectId, bytes32 _bypassCode) external payable;
}

contract EnhancedCeloVotingProxy is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Core contracts
    ISwapRouter02 public immutable uniswapRouter;
    IQuoterV2 public immutable quoter;
    IUniswapV3Factory public immutable factory;
    ISovereignSeasV4 public immutable sovereignSeas;
    address public immutable CELO;
    
    // Fee tiers in order of preference
    uint24[] public feeList = [3000, 500, 10000]; // 0.3%, 0.05%, 1%
    
    // Configuration
    uint256 public slippageTolerance = 300; // 3% default
    uint256 public constant MAX_SLIPPAGE = 1000; // 10% max
    uint256 public minLiquidityThreshold = 1e15; // Minimum liquidity for valid pools
    
    // Pool cache to avoid redundant checks
    mapping(bytes32 => PoolInfo) public poolCache;
    mapping(bytes32 => uint256) public poolCacheTimestamp;
    uint256 public constant CACHE_DURATION = 3600; // 1 hour cache
    
    struct PoolInfo {
        address pool;
        uint24 fee;
        bool exists;
        uint128 liquidity;
        bool isValid;
    }

    struct VotingEstimate {
        address inputToken;
        uint256 inputAmount;
        uint256 expectedCelo;
        uint256 minimumCelo;
        uint24 feeUsed;
        address poolUsed;
        uint256 slippageAmount;
        uint256 slippagePercent;
        uint256 gasEstimate;
        bool isValid;
        string errorMessage;
    }

    struct PoolAnalysis {
        address pool;
        uint24 fee;
        bool exists;
        uint128 liquidity;
        uint256 expectedOutput;
        uint256 gasEstimate;
        bool isRecommended;
    }

    // Events
    event VoteWithTokenConversion(
        address indexed voter,
        uint256 indexed campaignId,
        uint256 indexed projectId,
        address inputToken,
        uint256 inputAmount,
        uint256 celoReceived,
        uint24 feeUsed,
        address poolUsed,
        bytes32 bypassCode
    );
    
    event PoolCacheUpdated(
        address indexed tokenA,
        address indexed tokenB,
        uint24 fee,
        address pool,
        bool isValid
    );
    
    event SlippageToleranceUpdated(uint256 oldTolerance, uint256 newTolerance);
    event FeeListUpdated(uint24[] newFees);
    event LiquidityThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    constructor(
        address _uniswapRouter,
        address _quoter,
        address _factory,
        address _sovereignSeas,
        address _celo
    ) Ownable(msg.sender) {
        require(_uniswapRouter != address(0), "Invalid router");
        require(_quoter != address(0), "Invalid quoter");
        require(_factory != address(0), "Invalid factory");
        require(_sovereignSeas != address(0), "Invalid SovereignSeas");
        require(_celo != address(0), "Invalid CELO");
        
        uniswapRouter = ISwapRouter02(_uniswapRouter);
        quoter = IQuoterV2(_quoter);
        factory = IUniswapV3Factory(_factory);
        sovereignSeas = ISovereignSeasV4(_sovereignSeas);
        CELO = _celo;
    }

    /**
     * @dev Vote with any ERC20 token by converting it to CELO via Uniswap V3
     */
    function voteWithToken(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount,
        bytes32 _bypassCode,
        uint24 _preferredFee
    ) external nonReentrant {
        require(_token != CELO, "Use sovereignSeas.voteWithCelo() directly for CELO");
        require(_amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens from user
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        // Convert token to CELO
        (uint256 celoReceived, uint24 feeUsed, address poolUsed) = _convertTokenToCelo(_token, _amount, _preferredFee);
        require(celoReceived > 0, "No CELO received from conversion");
        
        // Vote with converted CELO
        sovereignSeas.voteWithCelo{value: celoReceived}(_campaignId, _projectId, _bypassCode);
        
        emit VoteWithTokenConversion(
            msg.sender,
            _campaignId,
            _projectId,
            _token,
            _amount,
            celoReceived,
            feeUsed,
            poolUsed,
            _bypassCode
        );
    }

    /**
     * @dev Enhanced pool discovery with proper validation
     */
    function _findBestPool(address _tokenIn, address _tokenOut, uint256 _amount) 
        internal 
        returns (PoolInfo memory bestPool) 
    {
        uint256 bestOutput = 0;
        bestPool.exists = false;
        
        for (uint256 i = 0; i < feeList.length; i++) {
            uint24 fee = feeList[i];
            PoolInfo memory poolInfo = _getPoolInfo(_tokenIn, _tokenOut, fee);
            
            if (!poolInfo.exists || !poolInfo.isValid) continue;
            
            // Get quote with proper error handling
            (bool success, uint256 output, uint256 gasEst) = _safeGetQuote(
                _tokenIn, 
                _tokenOut, 
                fee, 
                _amount
            );
            
            if (success && output > bestOutput && output > 0) {
                bestOutput = output;
                bestPool = poolInfo;
                bestPool.fee = fee;
                bestPool.isValid = true;
            }
        }
        
        require(bestPool.exists && bestPool.isValid, "No valid pool found");
        return bestPool;
    }

    /**
     * @dev Get pool info with caching and validation
     */
    function _getPoolInfo(address _tokenA, address _tokenB, uint24 _fee) 
        internal 
        returns (PoolInfo memory poolInfo) 
    {
        bytes32 key = keccak256(abi.encodePacked(_tokenA, _tokenB, _fee));
        
        // Check cache validity
        if (poolCacheTimestamp[key] + CACHE_DURATION > block.timestamp) {
            return poolCache[key];
        }
        
        // Get pool address from factory
        address poolAddress = factory.getPool(_tokenA, _tokenB, _fee);
        
        poolInfo.pool = poolAddress;
        poolInfo.fee = _fee;
        poolInfo.exists = poolAddress != address(0);
        
        if (poolInfo.exists) {
            // Validate pool has liquidity and is active
            try IUniswapV3Pool(poolAddress).liquidity() returns (uint128 liquidity) {
                poolInfo.liquidity = liquidity;
                poolInfo.isValid = liquidity >= minLiquidityThreshold;
                
                // Additional checks for pool health
                if (poolInfo.isValid) {
                    try IUniswapV3Pool(poolAddress).slot0() returns (
                        uint160 sqrtPriceX96,
                        int24,
                        uint16,
                        uint16,
                        uint16,
                        uint8,
                        bool unlocked
                    ) {
                        poolInfo.isValid = sqrtPriceX96 > 0 && unlocked;
                    } catch {
                        poolInfo.isValid = false;
                    }
                }
            } catch {
                poolInfo.isValid = false;
            }
        }
        
        // Update cache
        poolCache[key] = poolInfo;
        poolCacheTimestamp[key] = block.timestamp;
        
        emit PoolCacheUpdated(_tokenA, _tokenB, _fee, poolAddress, poolInfo.isValid);
        
        return poolInfo;
    }

    /**
     * @dev Safe quote function with proper error handling
     */
    function _safeGetQuote(
        address _tokenIn,
        address _tokenOut,
        uint24 _fee,
        uint256 _amount
    ) internal view returns (bool success, uint256 amountOut, uint256 gasEstimate) {
        try quoter.quoteExactInputSingle(
            _tokenIn,
            _tokenOut,
            _fee,
            _amount,
            0
        ) returns (
            uint256 _amountOut,
            uint160,
            uint32,
            uint256 _gasEstimate
        ) {
            return (true, _amountOut, _gasEstimate);
        } catch {
            return (false, 0, 0);
        }
    }

    /**
     * @dev Convert ERC20 token to CELO via Uniswap V3
     */
    function _convertTokenToCelo(
        address _token,
        uint256 _amount,
        uint24 _preferredFee
    ) internal returns (uint256, uint24, address) {
        // Find best pool
        PoolInfo memory poolInfo;
        
        if (_preferredFee > 0) {
            // Try preferred fee first
            poolInfo = _getPoolInfo(_token, CELO, _preferredFee);
            if (!poolInfo.exists || !poolInfo.isValid) {
                poolInfo = _findBestPool(_token, CELO, _amount);
            }
        } else {
            poolInfo = _findBestPool(_token, CELO, _amount);
        }
        
        // Get expected output with slippage protection
        (bool success, uint256 expectedOut, ) = _safeGetQuote(
            _token, 
            CELO, 
            poolInfo.fee, 
            _amount
        );
        require(success && expectedOut > 0, "Cannot get quote for swap");
        
        uint256 minAmountOut = (expectedOut * (10000 - slippageTolerance)) / 10000;
        
        // Approve token for Uniswap router
        IERC20(_token).approve(address(uniswapRouter), _amount);
        
        // Perform the swap
        ISwapRouter02.ExactInputSingleParams memory params = ISwapRouter02.ExactInputSingleParams({
            tokenIn: _token,
            tokenOut: CELO,
            fee: poolInfo.fee,
            recipient: address(this),
            amountIn: _amount,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0
        });
        
        uint256 amountOut = uniswapRouter.exactInputSingle(params);
        return (amountOut, poolInfo.fee, poolInfo.pool);
    }

    /**
     * @dev Get comprehensive voting estimate with detailed analysis
     */
    function getVotingEstimate(
        address _token,
        uint256 _amount,
        uint24 _preferredFee
    ) external view returns (VotingEstimate memory estimate) {
        estimate.inputToken = _token;
        estimate.inputAmount = _amount;
        estimate.isValid = false;
        
        // Handle CELO directly
        if (_token == CELO) {
            estimate.expectedCelo = _amount;
            estimate.minimumCelo = _amount;
            estimate.feeUsed = 0;
            estimate.poolUsed = address(0);
            estimate.slippageAmount = 0;
            estimate.slippagePercent = 0;
            estimate.gasEstimate = 21000; // Basic transfer gas
            estimate.isValid = true;
            return estimate;
        }
        
        // Find best pool for estimate
        uint256 bestOutput = 0;
        uint24 bestFee = 0;
        address bestPool = address(0);
        uint256 bestGasEstimate = 0;
        string memory errorMsg = "";
        
        // Check preferred fee first if specified
        if (_preferredFee > 0) {
            bytes32 key = keccak256(abi.encodePacked(_token, CELO, _preferredFee));
            PoolInfo memory cachedPool = poolCache[key];
            
            if (cachedPool.exists && cachedPool.isValid) {
                (bool success, uint256 output, uint256 gasEst) = _safeGetQuote(
                    _token, CELO, _preferredFee, _amount
                );
                if (success && output > 0) {
                    bestOutput = output;
                    bestFee = _preferredFee;
                    bestPool = cachedPool.pool;
                    bestGasEstimate = gasEst;
                }
            }
        }
        
        // If preferred fee didn't work, try all fees
        if (bestOutput == 0) {
            for (uint256 i = 0; i < feeList.length; i++) {
                uint24 fee = feeList[i];
                bytes32 key = keccak256(abi.encodePacked(_token, CELO, fee));
                PoolInfo memory cachedPool = poolCache[key];
                
                if (cachedPool.exists && cachedPool.isValid) {
                    (bool success, uint256 output, uint256 gasEst) = _safeGetQuote(
                        _token, CELO, fee, _amount
                    );
                    if (success && output > bestOutput) {
                        bestOutput = output;
                        bestFee = fee;
                        bestPool = cachedPool.pool;
                        bestGasEstimate = gasEst;
                    }
                }
            }
            
            if (bestOutput == 0) {
                errorMsg = "No valid pools found with sufficient liquidity";
            }
        }
        
        if (bestOutput > 0) {
            estimate.expectedCelo = bestOutput;
            estimate.feeUsed = bestFee;
            estimate.poolUsed = bestPool;
            estimate.minimumCelo = (bestOutput * (10000 - slippageTolerance)) / 10000;
            estimate.slippageAmount = bestOutput - estimate.minimumCelo;
            estimate.slippagePercent = (estimate.slippageAmount * 10000) / bestOutput;
            estimate.gasEstimate = bestGasEstimate + 150000; // Add buffer for swap
            estimate.isValid = true;
        } else {
            estimate.errorMessage = errorMsg;
        }
        
        return estimate;
    }

    /**
     * @dev Analyze all available pools for a token pair
     */
    function analyzeAllPools(address _token, uint256 _amount) 
        external 
        view 
        returns (PoolAnalysis[] memory analyses) 
    {
        if (_token == CELO) {
            analyses = new PoolAnalysis[](1);
            analyses[0] = PoolAnalysis({
                pool: address(0),
                fee: 0,
                exists: true,
                liquidity: type(uint128).max,
                expectedOutput: _amount,
                gasEstimate: 21000,
                isRecommended: true
            });
            return analyses;
        }
        
        analyses = new PoolAnalysis[](feeList.length);
        uint256 bestOutput = 0;
        uint256 bestIndex = 0;
        
        for (uint256 i = 0; i < feeList.length; i++) {
            uint24 fee = feeList[i];
            bytes32 key = keccak256(abi.encodePacked(_token, CELO, fee));
            PoolInfo memory cachedPool = poolCache[key];
            
            analyses[i].fee = fee;
            analyses[i].pool = cachedPool.pool;
            analyses[i].exists = cachedPool.exists;
            analyses[i].liquidity = cachedPool.liquidity;
            
            if (cachedPool.exists && cachedPool.isValid) {
                (bool success, uint256 output, uint256 gasEst) = _safeGetQuote(
                    _token, CELO, fee, _amount
                );
                if (success) {
                    analyses[i].expectedOutput = output;
                    analyses[i].gasEstimate = gasEst;
                    if (output > bestOutput) {
                        bestOutput = output;
                        bestIndex = i;
                    }
                }
            }
        }
        
        if (bestOutput > 0) {
            analyses[bestIndex].isRecommended = true;
        }
        
        return analyses;
    }

    /**
     * @dev Batch estimate for multiple tokens
     */
    function batchEstimate(
        address[] calldata _tokens,
        uint256[] calldata _amounts,
        uint24 _preferredFee
    ) external view returns (VotingEstimate[] memory estimates) {
        require(_tokens.length == _amounts.length, "Array length mismatch");
        
        estimates = new VotingEstimate[](_tokens.length);
        for (uint256 i = 0; i < _tokens.length; i++) {
            estimates[i] = this.getVotingEstimate(_tokens[i], _amounts[i], _preferredFee);
        }
        
        return estimates;
    }

    /**
     * @dev Manual cache refresh for specific token pairs
     */
    function refreshPoolCache(address _tokenA, address _tokenB, uint24[] calldata _fees) 
        external 
    {
        for (uint256 i = 0; i < _fees.length; i++) {
            _getPoolInfo(_tokenA, _tokenB, _fees[i]);
        }
    }

    /**
     * @dev Admin functions for configuration
     */
    function setSlippageTolerance(uint256 _newSlippage) external onlyOwner {
        require(_newSlippage <= MAX_SLIPPAGE, "Slippage too high");
        uint256 oldTolerance = slippageTolerance;
        slippageTolerance = _newSlippage;
        emit SlippageToleranceUpdated(oldTolerance, _newSlippage);
    }

    function setFeeList(uint24[] calldata _newFees) external onlyOwner {
        require(_newFees.length > 0, "Must have at least one fee");
        for (uint256 i = 0; i < _newFees.length; i++) {
            require(_newFees[i] > 0, "Invalid fee tier");
        }
        feeList = _newFees;
        emit FeeListUpdated(_newFees);
    }

    function setLiquidityThreshold(uint256 _newThreshold) external onlyOwner {
        require(_newThreshold > 0, "Threshold must be positive");
        uint256 oldThreshold = minLiquidityThreshold;
        minLiquidityThreshold = _newThreshold;
        emit LiquidityThresholdUpdated(oldThreshold, _newThreshold);
    }

    /**
     * @dev Emergency recovery functions
     */
    function recoverTokens(address _token, uint256 _amount) external onlyOwner {
        if (_token == address(0)) {
            payable(owner()).transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(owner(), _amount);
        }
    }

    /**
     * @dev View functions for monitoring
     */
    function getConfiguration() external view returns (
        address router,
        address quoterAddr,
        address factoryAddr,
        address sovereignSeasAddr,
        address celoAddr,
        uint256 currentSlippage,
        uint24[] memory fees,
        uint256 liquidityThreshold
    ) {
        return (
            address(uniswapRouter),
            address(quoter),
            address(factory),
            address(sovereignSeas),
            CELO,
            slippageTolerance,
            feeList,
            minLiquidityThreshold
        );
    }

    function getCacheInfo(address _tokenA, address _tokenB, uint24 _fee) 
        external 
        view 
        returns (PoolInfo memory poolInfo, uint256 cacheAge, bool isExpired) 
    {
        bytes32 key = keccak256(abi.encodePacked(_tokenA, _tokenB, _fee));
        poolInfo = poolCache[key];
        uint256 timestamp = poolCacheTimestamp[key];
        cacheAge = timestamp > 0 ? block.timestamp - timestamp : 0;
        isExpired = timestamp + CACHE_DURATION <= block.timestamp;
        return (poolInfo, cacheAge, isExpired);
    }

    // Allow contract to receive CELO
    receive() external payable {}
}