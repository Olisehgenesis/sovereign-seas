// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

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

// Uniswap V3 Quoter interface
interface IQuoterV2 {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external view returns (uint256 amountOut);
}

// SovereignSeasV4 interface for voting
interface ISovereignSeasV4 {
    function voteWithCelo(uint256 _campaignId, uint256 _projectId, bytes32 _bypassCode) external payable;
}

contract CeloUniswapV3VotingProxy is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    ISwapRouter02 public immutable uniswapRouter;
    IQuoterV2 public immutable quoter;
    ISovereignSeasV4 public immutable sovereignSeas;
    address public immutable CELO;
    
    // Common fee tiers for Uniswap V3
    uint24 public constant FEE_LOW = 500;      // 0.05%
    uint24 public constant FEE_MEDIUM = 3000;  // 0.3%
    uint24 public constant FEE_HIGH = 10000;   // 1%
    
    // Configuration
    uint256 public slippageTolerance = 300; // 3% default slippage tolerance (300 basis points)
    uint256 public constant MAX_SLIPPAGE = 1000; // 10% maximum slippage allowed
    
    // Pool fee preferences (ordered by preference)
    uint24[] public preferredFees = [FEE_MEDIUM, FEE_LOW, FEE_HIGH];
    
    // Dust collection
    mapping(address => uint256) public dustBalances;
    uint256 public dustThreshold = 1e15; // 0.001 CELO equivalent threshold for dust
    
    // Structs for comprehensive estimates
    struct VotingEstimate {
        address inputToken;
        uint256 inputAmount;
        uint256 expectedCelo;
        uint256 minimumCelo;
        uint24 feeUsed;
        uint256 slippageAmount;
        uint256 slippagePercent; // in basis points (100 = 1%)
        bool isValid;
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
        bytes32 bypassCode
    );
    event SlippageToleranceUpdated(uint256 oldTolerance, uint256 newTolerance);
    event PreferredFeesUpdated(uint24[] newFees);
    event TokensRecovered(address indexed token, address indexed recipient, uint256 amount);
    event DustCollected(address indexed token, uint256 amount, uint256 celoValue);
    event DustClaimed(address indexed token, address indexed recipient, uint256 amount);
    event DustThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    constructor(
        address _uniswapRouter,
        address _quoter,
        address _sovereignSeas,
        address _celo
    ) Ownable(msg.sender) {
        require(_uniswapRouter != address(0), "Invalid router address");
        require(_quoter != address(0), "Invalid quoter address");
        require(_sovereignSeas != address(0), "Invalid SovereignSeas address");
        require(_celo != address(0), "Invalid CELO address");
        
        uniswapRouter = ISwapRouter02(_uniswapRouter);
        quoter = IQuoterV2(_quoter);
        sovereignSeas = ISovereignSeasV4(_sovereignSeas);
        CELO = _celo;
    }

    /**
     * @dev Vote with any ERC20 token by converting it to CELO via Uniswap V3
     * @param _campaignId Campaign ID to vote for
     * @param _projectId Project ID to vote for
     * @param _token Token to convert to CELO
     * @param _amount Amount of token to convert
     * @param _bypassCode Bypass code for the vote
     * @param _preferredFee Preferred fee tier (0 for auto-selection)
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
        (uint256 celoReceived, uint24 feeUsed) = _convertTokenToCelo(_token, _amount, _preferredFee);
        require(celoReceived > 0, "No CELO received from conversion");
        
        // Check if there's any dust left from conversion
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
            feeUsed,
            _bypassCode
        );
    }

    /**
     * @dev Convert ERC20 token directly to CELO via Uniswap V3
     */
    function _convertTokenToCelo(
        address _token,
        uint256 _amount,
        uint24 _preferredFee
    ) internal returns (uint256, uint24) {
        // Approve token for Uniswap router
        IERC20(_token).approve(address(uniswapRouter), _amount);
        
        // Find best fee tier if not specified
        uint24 bestFee = _preferredFee == 0 ? _findBestFee(_token, CELO, _amount) : _preferredFee;
        
        // Get expected output with slippage protection
        uint256 expectedOut = _getQuote(_token, CELO, bestFee, _amount);
        require(expectedOut > 0, "No liquidity available for this token pair");
        
        uint256 minAmountOut = (expectedOut * (10000 - slippageTolerance)) / 10000;
        
        // Perform the swap
        ISwapRouter02.ExactInputSingleParams memory params = ISwapRouter02.ExactInputSingleParams({
            tokenIn: _token,
            tokenOut: CELO,
            fee: bestFee,
            recipient: address(this),
            amountIn: _amount,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0
        });
        
        uint256 amountOut = uniswapRouter.exactInputSingle(params);
        return (amountOut, bestFee);
    }

    /**
     * @dev Collect dust amounts that are below threshold
     */
    function _collectDust(address _token) internal {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance > 0) {
            // Check if balance is below dust threshold in CELO terms
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
        
        // Try each fee tier to get an estimate
        for (uint256 i = 0; i < preferredFees.length; i++) {
            uint256 estimate = _getQuoteView(_token, CELO, preferredFees[i], _amount);
            if (estimate > 0) return estimate;
        }
        return 0; // No liquidity found
    }

    /**
     * @dev Find the best fee tier for a token pair by testing all preferred fees
     */
    function _findBestFee(address _tokenIn, address _tokenOut, uint256 _amount) internal returns (uint24) {
        uint256 bestOutput = 0;
        uint24 bestFee = preferredFees[0];
        
        // Use actual amount for testing to get accurate quotes
        for (uint256 i = 0; i < preferredFees.length; i++) {
            uint256 output = _getQuote(_tokenIn, _tokenOut, preferredFees[i], _amount);
            if (output > bestOutput) {
                bestOutput = output;
                bestFee = preferredFees[i];
            }
        }
        
        require(bestOutput > 0, "No valid pool found for token pair");
        return bestFee;
    }

    /**
     * @dev Get quote for swap, returns 0 if pool doesn't exist
     */
    function _getQuote(address _tokenIn, address _tokenOut, uint24 _fee, uint256 _amount) internal returns (uint256) {
        try quoter.quoteExactInputSingle(_tokenIn, _tokenOut, _fee, _amount, 0) returns (uint256 output) {
            return output;
        } catch {
            return 0; // Pool doesn't exist or other error
        }
    }

    /**
     * @dev Get quote for swap (view version using staticcall)
     */
    function _getQuoteView(address _tokenIn, address _tokenOut, uint24 _fee, uint256 _amount) internal view returns (uint256) {
        try quoter.quoteExactInputSingle(_tokenIn, _tokenOut, _fee, _amount, 0) returns (uint256 output) {
            return output;
        } catch {
            return 0; // Pool doesn't exist or other error
        }
    }

    /**
     * @dev External function to be called via staticcall for view functions
     */
    function getQuoteExternal(address _tokenIn, address _tokenOut, uint24 _fee, uint256 _amount) external returns (uint256) {
        return quoter.quoteExactInputSingle(_tokenIn, _tokenOut, _fee, _amount, 0);
    }

    /**
     * @dev Get expected CELO output for a token swap (PURE VIEW FUNCTION)
     * @param _token Input token address
     * @param _amount Input amount
     * @param _preferredFee Preferred fee tier (0 for auto-selection)
     * @return expectedCelo Expected CELO output amount
     * @return feeUsed Fee tier that would be used
     * @return success Whether the swap is possible
     */
    function estimateVoteOutput(
        address _token,
        uint256 _amount,
        uint24 _preferredFee
    ) external view returns (uint256 expectedCelo, uint24 feeUsed, bool success) {
        if (_token == CELO) return (_amount, 0, true);
        
        if (_preferredFee == 0) {
            // Find best fee tier
            uint256 bestOutput = 0;
            uint24 bestFee = preferredFees[0];
            
            for (uint256 i = 0; i < preferredFees.length; i++) {
                uint256 output = _getQuoteView(_token, CELO, preferredFees[i], _amount);
                if (output > bestOutput) {
                    bestOutput = output;
                    bestFee = preferredFees[i];
                }
            }
            
            return (bestOutput, bestFee, bestOutput > 0);
        } else {
            // Use specified fee tier
            uint256 output = _getQuoteView(_token, CELO, _preferredFee, _amount);
            return (output, _preferredFee, output > 0);
        }
    }

    /**
     * @dev Get minimum CELO output after slippage protection (VIEW)
     * @param _token Input token address
     * @param _amount Input amount
     * @param _preferredFee Preferred fee tier (0 for auto-selection)
     * @return minCelo Minimum CELO output after slippage
     * @return maxSlippage Maximum CELO that could be lost to slippage
     */
    function estimateMinimumVoteOutput(
        address _token,
        uint256 _amount,
        uint24 _preferredFee
    ) external view returns (uint256 minCelo, uint256 maxSlippage) {
        (uint256 expectedCelo, , bool success) = this.estimateVoteOutput(_token, _amount, _preferredFee);
        if (!success) return (0, 0);
        
        minCelo = (expectedCelo * (10000 - slippageTolerance)) / 10000;
        maxSlippage = expectedCelo - minCelo;
        return (minCelo, maxSlippage);
    }

    /**
     * @dev Check if a pool exists for given token pair and fee (VIEW)
     * @param _tokenA First token
     * @param _tokenB Second token  
     * @param _fee Fee tier to check
     * @return exists True if pool exists
     */
    function checkPoolExists(address _tokenA, address _tokenB, uint24 _fee) external view returns (bool exists) {
        return _getQuoteView(_tokenA, _tokenB, _fee, 1e18) > 0;
    }

    /**
     * @dev Get all available pools for a token paired with CELO (VIEW)
     * @param _token Token to check
     * @return availableFees Array of fee tiers that have liquidity
     * @return expectedOutputs Expected CELO outputs for 1 token unit at each fee tier
     * @return bestFee Fee tier with highest output
     * @return bestOutput Highest CELO output amount
     */
    function getAvailablePoolsView(address _token) external view returns (
        uint24[] memory availableFees, 
        uint256[] memory expectedOutputs,
        uint24 bestFee,
        uint256 bestOutput
    ) {
        if (_token == CELO) {
            availableFees = new uint24[](1);
            expectedOutputs = new uint256[](1);
            availableFees[0] = 0;
            expectedOutputs[0] = 1e18; // 1:1 for CELO
            return (availableFees, expectedOutputs, 0, 1e18);
        }

        uint256 count = 0;
        uint256 testAmount = 1e18; // 1 token unit for testing
        bestOutput = 0;
        bestFee = preferredFees[0];

        // First pass: count available pools and find best
        for (uint256 i = 0; i < preferredFees.length; i++) {
            uint256 output = _getQuoteView(_token, CELO, preferredFees[i], testAmount);
            if (output > 0) {
                count++;
                if (output > bestOutput) {
                    bestOutput = output;
                    bestFee = preferredFees[i];
                }
            }
        }

        // Second pass: populate arrays
        availableFees = new uint24[](count);
        expectedOutputs = new uint256[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < preferredFees.length; i++) {
            uint256 output = _getQuoteView(_token, CELO, preferredFees[i], testAmount);
            if (output > 0) {
                availableFees[index] = preferredFees[i];
                expectedOutputs[index] = output;
                index++;
            }
        }

        return (availableFees, expectedOutputs, bestFee, bestOutput);
    }

    /**
     * @dev Get comprehensive voting cost estimate (VIEW)
     * @param _token Input token address
     * @param _amount Input amount
     * @param _preferredFee Preferred fee tier (0 for auto-selection)
     * @return estimate Comprehensive estimate struct
     */
    function getVotingCostEstimate(
        address _token,
        uint256 _amount,
        uint24 _preferredFee
    ) external view returns (VotingEstimate memory estimate) {
        estimate.inputToken = _token;
        estimate.inputAmount = _amount;
        estimate.isValid = false;

        if (_token == CELO) {
            estimate.expectedCelo = _amount;
            estimate.minimumCelo = _amount;
            estimate.feeUsed = 0;
            estimate.slippageAmount = 0;
            estimate.slippagePercent = 0;
            estimate.isValid = true;
            return estimate;
        }

        (uint256 expectedCelo, uint24 feeUsed, bool success) = this.estimateVoteOutput(_token, _amount, _preferredFee);
        
        if (success && expectedCelo > 0) {
            estimate.expectedCelo = expectedCelo;
            estimate.feeUsed = feeUsed;
            estimate.minimumCelo = (expectedCelo * (10000 - slippageTolerance)) / 10000;
            estimate.slippageAmount = expectedCelo - estimate.minimumCelo;
            estimate.slippagePercent = (estimate.slippageAmount * 10000) / expectedCelo; // basis points
            estimate.isValid = true;
        }

        return estimate;
    }

    /**
     * @dev Batch estimate for multiple tokens (VIEW)
     * @param _tokens Array of token addresses
     * @param _amounts Array of amounts (must match tokens length)
     * @param _preferredFee Preferred fee tier for all (0 for auto-selection)
     * @return estimates Array of voting estimates
     */
    function batchEstimateVoting(
        address[] calldata _tokens,
        uint256[] calldata _amounts,
        uint24 _preferredFee
    ) external view returns (VotingEstimate[] memory estimates) {
        require(_tokens.length == _amounts.length, "Arrays length mismatch");
        
        estimates = new VotingEstimate[](_tokens.length);
        
        for (uint256 i = 0; i < _tokens.length; i++) {
            estimates[i] = this.getVotingCostEstimate(_tokens[i], _amounts[i], _preferredFee);
        }
        
        return estimates;
    }

    /**
     * @dev Get token exchange rate to CELO (VIEW)
     * @param _token Token to check rate for
     * @param _feeOverride Specific fee tier (0 for best available)
     * @return rate How much CELO you get per 1 unit of token (scaled by token decimals)
     * @return feeUsed Fee tier used for this rate
     * @return hasLiquidity Whether liquidity exists
     */
    function getTokenToCeloRate(
        address _token,
        uint24 _feeOverride
    ) external view returns (uint256 rate, uint24 feeUsed, bool hasLiquidity) {
        if (_token == CELO) return (1e18, 0, true);
        
        uint256 oneToken = 10 ** IERC20Metadata(_token).decimals();
        (uint256 expectedCelo, uint24 fee, bool success) = this.estimateVoteOutput(_token, oneToken, _feeOverride);
        
        return (expectedCelo, fee, success);
    }

    /**
     * @dev Update slippage tolerance (only owner)
     * @param _newSlippage New slippage tolerance in basis points (100 = 1%)
     */
    function setSlippageTolerance(uint256 _newSlippage) external onlyOwner {
        require(_newSlippage <= MAX_SLIPPAGE, "Slippage tolerance too high");
        uint256 oldTolerance = slippageTolerance;
        slippageTolerance = _newSlippage;
        emit SlippageToleranceUpdated(oldTolerance, _newSlippage);
    }

    /**
     * @dev Update preferred fee tiers (only owner)
     * @param _newFees New fee tier preferences
     */
    function setPreferredFees(uint24[] calldata _newFees) external onlyOwner {
        require(_newFees.length > 0, "Must have at least one fee tier");
        for (uint256 i = 0; i < _newFees.length; i++) {
            require(_newFees[i] == FEE_LOW || _newFees[i] == FEE_MEDIUM || _newFees[i] == FEE_HIGH, "Invalid fee tier");
        }
        preferredFees = _newFees;
        emit PreferredFeesUpdated(_newFees);
    }

    /**
     * @dev Update dust collection threshold (only owner)
     * @param _newThreshold New dust threshold in CELO equivalent (18 decimals)
     */
    function setDustThreshold(uint256 _newThreshold) external onlyOwner {
        require(_newThreshold <= 1e18, "Dust threshold too high"); // Max 1 CELO
        uint256 oldThreshold = dustThreshold;
        dustThreshold = _newThreshold;
        emit DustThresholdUpdated(oldThreshold, _newThreshold);
    }

    /**
     * @dev Claim accumulated dust tokens (only owner)
     * @param _token Token to claim dust for
     * @param _recipient Recipient address
     * @param _amount Amount to claim (0 for all dust)
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
        
        // Update dust balance
        dustBalances[_token] -= amountToClaim;
        
        if (_token == address(0)) {
            // Claim native CELO dust
            payable(_recipient).transfer(amountToClaim);
        } else {
            // Claim ERC20 dust
            IERC20(_token).safeTransfer(_recipient, amountToClaim);
        }
        
        emit DustClaimed(_token, _recipient, amountToClaim);
    }

    /**
     * @dev Batch claim dust from multiple tokens (only owner)
     * @param _tokens Array of token addresses to claim dust from
     * @param _recipient Recipient address
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
     * @param _token Token to collect dust for
     */
    function manualCollectDust(address _token) external onlyOwner {
        _collectDust(_token);
    }

    /**
     * @dev Get dust information for a token (VIEW)
     * @param _token Token to check dust for
     * @return dustAmount Amount of dust collected
     * @return currentBalance Current token balance in contract
     * @return estimatedCeloValue Estimated CELO value of current balance
     * @return isCurrentBalanceDust Whether current balance would be considered dust
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
            estimatedCeloValue = currentBalance; // Native CELO
        } else {
            currentBalance = IERC20(_token).balanceOf(address(this));
            estimatedCeloValue = _estimateCeloValue(_token, currentBalance);
        }
        
        isCurrentBalanceDust = currentBalance > 0 && estimatedCeloValue <= dustThreshold;
        
        return (dustAmount, currentBalance, estimatedCeloValue, isCurrentBalanceDust);
    }

    /**
     * @dev Get dust information for multiple tokens (VIEW)
     * @param _tokens Array of tokens to check
     * @return dustAmounts Array of dust amounts
     * @return currentBalances Array of current balances
     * @return estimatedValues Array of estimated CELO values
     * @return isDustArray Array indicating if current balance is dust
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

    /**
     * @dev Emergency function to recover stuck tokens
     * @param _token Token to recover (address(0) for native CELO)
     * @param _recipient Recipient address
     * @param _amount Amount to recover (0 for full balance)
     */
    function recoverTokens(
        address _token,
        address _recipient,
        uint256 _amount
    ) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        
        if (_token == address(0)) {
            // Recover native CELO
            uint256 balance = address(this).balance;
            uint256 amountToRecover = _amount == 0 ? balance : _amount;
            require(amountToRecover <= balance, "Insufficient CELO balance");
            payable(_recipient).transfer(amountToRecover);
        } else {
            // Recover ERC20 tokens
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
        address quoterContract,
        address sovereignSeasContract,
        address celoToken,
        uint256 currentSlippage,
        uint256 maxSlippage,
        uint24[] memory fees,
        uint256 currentDustThreshold
    ) {
        return (
            address(uniswapRouter),
            address(quoter),
            address(sovereignSeas),
            CELO,
            slippageTolerance,
            MAX_SLIPPAGE,
            preferredFees,
            dustThreshold
        );
    }

    // Allow contract to receive native CELO
    receive() external payable {
        // Can receive CELO from swaps or direct transfers
    }
}