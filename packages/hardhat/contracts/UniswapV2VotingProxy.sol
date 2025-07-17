// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Uniswap V2 Router interface
interface IUniswapV2Router02 {
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

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts);

    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);

    function WETH() external pure returns (address);
}

// SovereignSeasV4 interface for voting
interface ISovereignSeasV4 {
    function voteWithCelo(uint256 _campaignId, uint256 _projectId, bytes32 _bypassCode) external payable;
    function getTokenToCeloEquivalent(address _token, uint256 _amount) external view returns (uint256);
}

contract UniswapV2VotingProxy is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    IUniswapV2Router02 public immutable uniswapRouter;
    ISovereignSeasV4 public immutable sovereignSeas;
    address public immutable WETH;
    address public immutable CELO;
    
    // Configuration
    uint256 public slippageTolerance = 300; // 3% default slippage tolerance (300 basis points)
    uint256 public constant MAX_SLIPPAGE = 1000; // 10% maximum slippage allowed
    
    // Events
    event VoteWithTokenConversion(
        address indexed voter,
        uint256 indexed campaignId,
        uint256 indexed projectId,
        address inputToken,
        uint256 inputAmount,
        uint256 celoReceived,
        bytes32 bypassCode
    );
    event SlippageToleranceUpdated(uint256 oldTolerance, uint256 newTolerance);
    event TokensRecovered(address indexed token, address indexed recipient, uint256 amount);

    constructor(
        address _uniswapRouter,
        address _sovereignSeas,
        address _celo
    ) Ownable(msg.sender) {
        require(_uniswapRouter != address(0), "Invalid router address");
        require(_sovereignSeas != address(0), "Invalid SovereignSeas address");
        require(_celo != address(0), "Invalid CELO address");
        
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);
        sovereignSeas = ISovereignSeasV4(_sovereignSeas);
        CELO = _celo;
        WETH = IUniswapV2Router02(_uniswapRouter).WETH();
    }

    /**
     * @dev Vote with any ERC20 token by converting it to CELO via Uniswap V2
     * @param _campaignId Campaign ID to vote for
     * @param _projectId Project ID to vote for
     * @param _token Token to convert to CELO
     * @param _amount Amount of token to convert
     * @param _bypassCode Bypass code for the vote
     * @param _useWETHPath Whether to use WETH as intermediate token (for tokens without direct CELO pair)
     */
    function voteWithToken(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount,
        bytes32 _bypassCode,
        bool _useWETHPath
    ) external nonReentrant {
        require(_token != CELO, "Use voteWithCelo directly for CELO");
        require(_amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens from user
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        // Convert token to CELO
        uint256 celoReceived = _convertTokenToCelo(_token, _amount, _useWETHPath);
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
            _bypassCode
        );
    }

    /**
     * @dev Vote with ETH by converting it to CELO
     * @param _campaignId Campaign ID to vote for
     * @param _projectId Project ID to vote for
     * @param _bypassCode Bypass code for the vote
     */
    function voteWithETH(
        uint256 _campaignId,
        uint256 _projectId,
        bytes32 _bypassCode
    ) external payable nonReentrant {
        require(msg.value > 0, "Must send ETH to vote");
        
        // Convert ETH to CELO via WETH
        uint256 celoReceived = _convertETHToCelo(msg.value);
        require(celoReceived > 0, "No CELO received from conversion");
        
        // Vote with converted CELO
        sovereignSeas.voteWithCelo{value: celoReceived}(_campaignId, _projectId, _bypassCode);
        
        emit VoteWithTokenConversion(
            msg.sender,
            _campaignId,
            _projectId,
            address(0), // Use address(0) to represent ETH
            msg.value,
            celoReceived,
            _bypassCode
        );
    }

    /**
     * @dev Convert ERC20 token to CELO via Uniswap V2
     */
    function _convertTokenToCelo(
        address _token,
        uint256 _amount,
        bool _useWETHPath
    ) internal returns (uint256) {
        // Approve token for Uniswap router
        IERC20(_token).approve(address(uniswapRouter), _amount);
        
        // Build swap path
        address[] memory path;
        if (_useWETHPath) {
            // Token -> WETH -> CELO
            path = new address[](3);
            path[0] = _token;
            path[1] = WETH;
            path[2] = CELO;
        } else {
            // Token -> CELO (direct pair)
            path = new address[](2);
            path[0] = _token;
            path[1] = CELO;
        }
        
        // Get expected output
        uint256[] memory amountsOut = uniswapRouter.getAmountsOut(_amount, path);
        uint256 expectedCelo = amountsOut[amountsOut.length - 1];
        
        // Calculate minimum output with slippage tolerance
        uint256 minAmountOut = (expectedCelo * (10000 - slippageTolerance)) / 10000;
        
        // Perform swap
        uint256[] memory amounts = uniswapRouter.swapExactTokensForTokens(
            _amount,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300 // 5 minutes deadline
        );
        
        return amounts[amounts.length - 1];
    }

    /**
     * @dev Convert ETH to CELO via Uniswap V2
     */
    function _convertETHToCelo(uint256 _ethAmount) internal returns (uint256) {
        // Build swap path: ETH -> WETH -> CELO
        address[] memory path = new address[](2);
        path[0] = WETH;
        path[1] = CELO;
        
        // Get expected output
        uint256[] memory amountsOut = uniswapRouter.getAmountsOut(_ethAmount, path);
        uint256 expectedCelo = amountsOut[amountsOut.length - 1];
        
        // Calculate minimum output with slippage tolerance
        uint256 minAmountOut = (expectedCelo * (10000 - slippageTolerance)) / 10000;
        
        // Perform swap (ETH to CELO)
        uint256[] memory amounts = uniswapRouter.swapExactETHForTokens{value: _ethAmount}(
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300 // 5 minutes deadline
        );
        
        return amounts[amounts.length - 1];
    }

    /**
     * @dev Get expected CELO output for a token swap
     * @param _token Input token address
     * @param _amount Input amount
     * @param _useWETHPath Whether to use WETH as intermediate
     * @return expectedCelo Expected CELO output amount
     */
    function getExpectedCeloOutput(
        address _token,
        uint256 _amount,
        bool _useWETHPath
    ) external view returns (uint256 expectedCelo) {
        if (_token == CELO) return _amount;
        
        address[] memory path;
        if (_useWETHPath) {
            path = new address[](3);
            path[0] = _token;
            path[1] = WETH;
            path[2] = CELO;
        } else {
            path = new address[](2);
            path[0] = _token;
            path[1] = CELO;
        }
        
        try uniswapRouter.getAmountsOut(_amount, path) returns (uint256[] memory amounts) {
            return amounts[amounts.length - 1];
        } catch {
            return 0;
        }
    }

    /**
     * @dev Get expected CELO output for ETH swap
     * @param _ethAmount ETH amount to swap
     * @return expectedCelo Expected CELO output amount
     */
    function getExpectedCeloOutputForETH(uint256 _ethAmount) external view returns (uint256 expectedCelo) {
        address[] memory path = new address[](2);
        path[0] = WETH;
        path[1] = CELO;
        
        try uniswapRouter.getAmountsOut(_ethAmount, path) returns (uint256[] memory amounts) {
            return amounts[amounts.length - 1];
        } catch {
            return 0;
        }
    }

    /**
     * @dev Get minimum CELO output after slippage tolerance
     * @param _token Input token address
     * @param _amount Input amount
     * @param _useWETHPath Whether to use WETH as intermediate
     * @return minCelo Minimum CELO output after slippage
     */
    function getMinimumCeloOutput(
        address _token,
        uint256 _amount,
        bool _useWETHPath
    ) external view returns (uint256 minCelo) {
        uint256 expectedCelo = this.getExpectedCeloOutput(_token, _amount, _useWETHPath);
        return (expectedCelo * (10000 - slippageTolerance)) / 10000;
    }

    /**
     * @dev Check if a direct pair exists between token and CELO
     * @param _token Token to check
     * @return hasDirectPair True if direct pair exists
     */
    function hasDirectPairWithCelo(address _token) external view returns (bool hasDirectPair) {
        if (_token == CELO) return true;
        
        address[] memory path = new address[](2);
        path[0] = _token;
        path[1] = CELO;
        
        try uniswapRouter.getAmountsOut(1e18, path) returns (uint256[] memory) {
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
        address sovereignSeasContract,
        address celoToken,
        address wethToken,
        uint256 currentSlippage,
        uint256 maxSlippage
    ) {
        return (
            address(uniswapRouter),
            address(sovereignSeas),
            CELO,
            WETH,
            slippageTolerance,
            MAX_SLIPPAGE
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