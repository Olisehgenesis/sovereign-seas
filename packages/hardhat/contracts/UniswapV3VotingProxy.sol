// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external payable returns (uint256 amountOut);

    function exactInput(ExactInputParams calldata params)
        external payable returns (uint256 amountOut);

    function refundETH() external payable;
    function unwrapWETH9(uint256 amountMinimum, address recipient) external payable;
}

// Uniswap V3 Quoter interface
interface IQuoterV2 {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);

    function quoteExactInput(bytes memory path, uint256 amountIn)
        external returns (uint256 amountOut);
}

// SovereignSeasV4 interface for voting
interface ISovereignSeasV4 {
    function voteWithCelo(uint256 _campaignId, uint256 _projectId, bytes32 _bypassCode) external payable;
    function getTokenToCeloEquivalent(address _token, uint256 _amount) external view returns (uint256);
}

contract UniswapV3VotingProxy is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    ISwapRouter02 public immutable uniswapRouter;
    IQuoterV2 public immutable quoter;
    ISovereignSeasV4 public immutable sovereignSeas;
    address public immutable WETH9;
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
    
    // Events
    event VoteWithTokenConversion(
        address indexed voter,
        uint256 indexed campaignId,
        uint256 indexed projectId,
        address inputToken,
        uint256 inputAmount,
        uint256 celoReceived,
        uint24 feeUsed,
        bool usedMultihop,
        bytes32 bypassCode
    );
    event SlippageToleranceUpdated(uint256 oldTolerance, uint256 newTolerance);
    event PreferredFeesUpdated(uint24[] newFees);
    event TokensRecovered(address indexed token, address indexed recipient, uint256 amount);

    constructor(
        address _uniswapRouter,
        address _quoter,
        address _sovereignSeas,
        address _celo,
        address _weth9
    ) Ownable(msg.sender) {
        require(_uniswapRouter != address(0), "Invalid router address");
        require(_quoter != address(0), "Invalid quoter address");
        require(_sovereignSeas != address(0), "Invalid SovereignSeas address");
        require(_celo != address(0), "Invalid CELO address");
        require(_weth9 != address(0), "Invalid WETH9 address");
        
        uniswapRouter = ISwapRouter02(_uniswapRouter);
        quoter = IQuoterV2(_quoter);
        sovereignSeas = ISovereignSeasV4(_sovereignSeas);
        CELO = _celo;
        WETH9 = _weth9;
    }

    /**
     * @dev Vote with any ERC20 token by converting it to CELO via Uniswap V3
     * @param _campaignId Campaign ID to vote for
     * @param _projectId Project ID to vote for
     * @param _token Token to convert to CELO
     * @param _amount Amount of token to convert
     * @param _bypassCode Bypass code for the vote
     * @param _preferredFee Preferred fee tier (0 for auto-selection)
     * @param _useMultihop Whether to use multihop routing through WETH
     */
    function voteWithToken(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount,
        bytes32 _bypassCode,
        uint24 _preferredFee,
        bool _useMultihop
    ) external nonReentrant {
        require(_token != CELO, "Use voteWithCelo directly for CELO");
        require(_amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens from user
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        // Convert token to CELO
        (uint256 celoReceived, uint24 feeUsed) = _convertTokenToCelo(_token, _amount, _preferredFee, _useMultihop);
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
            _useMultihop,
            _bypassCode
        );
    }

    /**
     * @dev Vote with ETH by converting it to CELO
     * @param _campaignId Campaign ID to vote for
     * @param _projectId Project ID to vote for
     * @param _bypassCode Bypass code for the vote
     * @param _preferredFee Preferred fee tier (0 for auto-selection)
     */
    function voteWithETH(
        uint256 _campaignId,
        uint256 _projectId,
        bytes32 _bypassCode,
        uint24 _preferredFee
    ) external payable nonReentrant {
        require(msg.value > 0, "Must send ETH to vote");
        
        // Convert ETH to CELO via WETH9
        (uint256 celoReceived, uint24 feeUsed) = _convertETHToCelo(msg.value, _preferredFee);
        require(celoReceived > 0, "No CELO received from conversion");
        
        // Vote with converted CELO
        sovereignSeas.voteWithCelo{value: celoReceived}(_campaignId, _projectId, _bypassCode);
        
        // Refund any remaining ETH
        uniswapRouter.refundETH();
        if (address(this).balance > 0) {
            payable(msg.sender).transfer(address(this).balance);
        }
        
        emit VoteWithTokenConversion(
            msg.sender,
            _campaignId,
            _projectId,
            address(0), // Use address(0) to represent ETH
            msg.value,
            celoReceived,
            feeUsed,
            false,
            _bypassCode
        );
    }

    /**
     * @dev Convert ERC20 token to CELO via Uniswap V3
     */
    function _convertTokenToCelo(
        address _token,
        uint256 _amount,
        uint24 _preferredFee,
        bool _useMultihop
    ) internal returns (uint256, uint24) {
        // Approve token for Uniswap router
        IERC20(_token).approve(address(uniswapRouter), _amount);
        
        if (_useMultihop) {
            return _convertTokenToCeloMultihop(_token, _amount, _preferredFee);
        } else {
            return _convertTokenToCeloDirect(_token, _amount, _preferredFee);
        }
    }

    /**
     * @dev Direct conversion: Token -> CELO
     */
    function _convertTokenToCeloDirect(
        address _token,
        uint256 _amount,
        uint24 _preferredFee
    ) internal returns (uint256, uint24) {
        uint24 bestFee = _preferredFee == 0 ? _findBestFee(_token, CELO, _amount) : _preferredFee;
        
        // Get expected output with slippage
        uint256 expectedOut = _getQuote(_token, CELO, bestFee, _amount);
        uint256 minAmountOut = (expectedOut * (10000 - slippageTolerance)) / 10000;
        
        // Perform swap
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
     * @dev Multihop conversion: Token -> WETH -> CELO
     */
    function _convertTokenToCeloMultihop(
        address _token,
        uint256 _amount,
        uint24 _preferredFee
    ) internal returns (uint256, uint24) {
        uint24 fee1 = _preferredFee == 0 ? _findBestFee(_token, WETH9, _amount) : _preferredFee;
        uint24 fee2 = _preferredFee == 0 ? _findBestFee(WETH9, CELO, 0) : _preferredFee;
        
        // Build path: token -> WETH -> CELO
        bytes memory path = abi.encodePacked(_token, fee1, WETH9, fee2, CELO);
        
        // Get expected output with slippage
        uint256 expectedOut = _getQuoteMultihop(path, _amount);
        uint256 minAmountOut = (expectedOut * (10000 - slippageTolerance)) / 10000;
        
        // Perform swap
        ISwapRouter02.ExactInputParams memory params = ISwapRouter02.ExactInputParams({
            path: path,
            recipient: address(this),
            amountIn: _amount,
            amountOutMinimum: minAmountOut
        });
        
        uint256 amountOut = uniswapRouter.exactInput(params);
        return (amountOut, fee1); // Return first fee used
    }

    /**
     * @dev Convert ETH to CELO via Uniswap V3
     */
    function _convertETHToCelo(uint256 _ethAmount, uint24 _preferredFee) internal returns (uint256, uint24) {
        uint24 bestFee = _preferredFee == 0 ? _findBestFee(WETH9, CELO, _ethAmount) : _preferredFee;
        
        // Get expected output with slippage
        uint256 expectedOut = _getQuote(WETH9, CELO, bestFee, _ethAmount);
        uint256 minAmountOut = (expectedOut * (10000 - slippageTolerance)) / 10000;
        
        // Perform swap (ETH automatically wraps to WETH9)
        ISwapRouter02.ExactInputSingleParams memory params = ISwapRouter02.ExactInputSingleParams({
            tokenIn: WETH9,
            tokenOut: CELO,
            fee: bestFee,
            recipient: address(this),
            amountIn: _ethAmount,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0
        });
        
        uint256 amountOut = uniswapRouter.exactInputSingle{value: _ethAmount}(params);
        return (amountOut, bestFee);
    }

    /**
     * @dev Find the best fee tier for a token pair
     */
    function _findBestFee(address _tokenIn, address _tokenOut, uint256 _amount) internal returns (uint24) {
        uint256 bestOutput = 0;
        uint24 bestFee = preferredFees[0];
        
        // Use a small amount for testing if _amount is 0
        uint256 testAmount = _amount > 0 ? _amount : 1e18;
        
        for (uint256 i = 0; i < preferredFees.length; i++) {
            try quoter.quoteExactInputSingle(_tokenIn, _tokenOut, preferredFees[i], testAmount, 0) returns (uint256 output) {
                if (output > bestOutput) {
                    bestOutput = output;
                    bestFee = preferredFees[i];
                }
            } catch {
                // Pool doesn't exist for this fee tier
                continue;
            }
        }
        
        return bestFee;
    }

    /**
     * @dev Get quote for single hop swap
     */
    function _getQuote(address _tokenIn, address _tokenOut, uint24 _fee, uint256 _amount) internal returns (uint256) {
        try quoter.quoteExactInputSingle(_tokenIn, _tokenOut, _fee, _amount, 0) returns (uint256 output) {
            return output;
        } catch {
            return 0;
        }
    }

    /**
     * @dev Get quote for multihop swap
     */
    function _getQuoteMultihop(bytes memory _path, uint256 _amount) internal returns (uint256) {
        try quoter.quoteExactInput(_path, _amount) returns (uint256 output) {
            return output;
        } catch {
            return 0;
        }
    }

    /**
     * @dev Get expected CELO output for a token swap
     * @param _token Input token address
     * @param _amount Input amount
     * @param _preferredFee Preferred fee tier (0 for auto-selection)
     * @param _useMultihop Whether to use multihop routing
     * @return expectedCelo Expected CELO output amount
     * @return feeUsed Fee tier that would be used
     */
    function getExpectedCeloOutput(
        address _token,
        uint256 _amount,
        uint24 _preferredFee,
        bool _useMultihop
    ) external returns (uint256 expectedCelo, uint24 feeUsed) {
        if (_token == CELO) return (_amount, 0);
        
        if (_useMultihop) {
            uint24 fee1 = _preferredFee == 0 ? _findBestFee(_token, WETH9, _amount) : _preferredFee;
            uint24 fee2 = _preferredFee == 0 ? _findBestFee(WETH9, CELO, 0) : _preferredFee;
            bytes memory path = abi.encodePacked(_token, fee1, WETH9, fee2, CELO);
            return (_getQuoteMultihop(path, _amount), fee1);
        } else {
            uint24 bestFee = _preferredFee == 0 ? _findBestFee(_token, CELO, _amount) : _preferredFee;
            return (_getQuote(_token, CELO, bestFee, _amount), bestFee);
        }
    }

    /**
     * @dev Get expected CELO output for ETH swap
     * @param _ethAmount ETH amount to swap
     * @param _preferredFee Preferred fee tier (0 for auto-selection)
     * @return expectedCelo Expected CELO output amount
     * @return feeUsed Fee tier that would be used
     */
    function getExpectedCeloOutputForETH(
        uint256 _ethAmount,
        uint24 _preferredFee
    ) external returns (uint256 expectedCelo, uint24 feeUsed) {
        uint24 bestFee = _preferredFee == 0 ? _findBestFee(WETH9, CELO, _ethAmount) : _preferredFee;
        return (_getQuote(WETH9, CELO, bestFee, _ethAmount), bestFee);
    }

    /**
     * @dev Check if a pool exists for given token pair and fee
     * @param _tokenA First token
     * @param _tokenB Second token  
     * @param _fee Fee tier to check
     * @return exists True if pool exists
     */
    function poolExists(address _tokenA, address _tokenB, uint24 _fee) external returns (bool exists) {
        try quoter.quoteExactInputSingle(_tokenA, _tokenB, _fee, 1e18, 0) returns (uint256) {
            return true;
        } catch {
            return false;
        }
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
        preferredFees = _newFees;
        emit PreferredFeesUpdated(_newFees);
    }

    /**
     * @dev Emergency function to recover stuck tokens
     * @param _token Token to recover (address(0) for ETH)
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
            // Recover ETH
            uint256 balance = address(this).balance;
            uint256 amountToRecover = _amount == 0 ? balance : _amount;
            require(amountToRecover <= balance, "Insufficient ETH balance");
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
        address weth9Token,
        uint256 currentSlippage,
        uint256 maxSlippage,
        uint24[] memory fees
    ) {
        return (
            address(uniswapRouter),
            address(quoter),
            address(sovereignSeas),
            CELO,
            WETH9,
            slippageTolerance,
            MAX_SLIPPAGE,
            preferredFees
        );
    }

    // Allow contract to receive ETH
    receive() external payable {
        // ETH received for swapping
    }

    // Fallback function
    fallback() external payable {
        revert("Function not found");
    }
}