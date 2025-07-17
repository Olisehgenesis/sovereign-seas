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
}

// Interface for Ubeswap V2 Pair
interface IUbeswapV2Pair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLatch);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

// Interface for SovereignSeas voting - FIXED to use voteWithCelo for CELO
interface ISovereignSeas {
    function voteWithCelo(uint256 _campaignId, uint256 _projectId, bytes32 _bypassCode) external payable;
    function vote(uint256 _campaignId, uint256 _projectId, address _token, uint256 _amount, bytes32 _bypassCode) external;
}

contract GoodDollarVoter is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Contract addresses
    address public constant GOOD_DOLLAR = 0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A;
    address public constant CELO = 0x471EcE3750Da237f93B8E339c536989b8978a438;
    
    // Ubeswap V2 (working pool with good liquidity)
    address public constant UBESWAP_V2_ROUTER = 0xE3D8bd6Aed4F159bc8000a9cD47CffDb95F96121;
    address public constant DEFAULT_GS_CELO_PAIR = 0x25878951ae130014E827e6f54fd3B4CCa057a7e8;
    
    ISovereignSeas public immutable sovereignSeas;
    IUbeswapV2Router public immutable ubeswapRouter;
    IERC20 public immutable goodDollar;
    
    // Pool management for future expansion
    struct Pool {
        address pairAddress;
        address tokenA;
        address tokenB;
        bool active;
        string name;
    }
    
    mapping(uint256 => Pool) public pools;
    uint256 public poolCount;
    uint256 public defaultPoolId;
    
    // Configuration
    uint256 public constant MIN_LIQUIDITY_THRESHOLD = 50e18; // 50 CELO minimum liquidity
    
    // Events
    event SwapAndVote(
        address indexed voter,
        uint256 indexed campaignId,
        uint256 indexed projectId,
        uint256 gsAmount,
        uint256 celoAmount,
        uint256 poolId,
        string route
    );
    
    event PoolAdded(
        uint256 indexed poolId,
        address indexed pairAddress,
        address indexed tokenA,
        address tokenB,
        string name
    );
    
    event PoolUpdated(
        uint256 indexed poolId,
        bool active
    );
    
    event DefaultPoolChanged(
        uint256 indexed oldPoolId,
        uint256 indexed newPoolId
    );

    constructor(address _sovereignSeas) Ownable(msg.sender) {
        require(_sovereignSeas != address(0), "Invalid SovereignSeas address");
        
        sovereignSeas = ISovereignSeas(_sovereignSeas);
        ubeswapRouter = IUbeswapV2Router(UBESWAP_V2_ROUTER);
        goodDollar = IERC20(GOOD_DOLLAR);
        
        // Approve tokens for Ubeswap router
        goodDollar.approve(UBESWAP_V2_ROUTER, type(uint256).max);
        
        // Add default pool (GS/CELO Ubeswap V2)
        _addPool(DEFAULT_GS_CELO_PAIR, GOOD_DOLLAR, CELO, "UbeswapV2_GS_CELO");
        defaultPoolId = 0;
    }

    /**
     * @notice Swap GoodDollar to CELO and vote using voteWithCelo
     * @param _campaignId Campaign ID to vote in
     * @param _projectId Project ID to vote for
     * @param _gsAmount Amount of GoodDollar to swap
     * @param _minCeloOut Minimum CELO to receive
     * @param _bypassCode Bypass code for voting (if any)
     */
    function swapAndVote(
        uint256 _campaignId,
        uint256 _projectId,
        uint256 _gsAmount,
        uint256 _minCeloOut,
        bytes32 _bypassCode
    ) external nonReentrant {
        require(_gsAmount > 0, "Amount must be greater than 0");
        
        // Transfer GoodDollar from user
        goodDollar.safeTransferFrom(msg.sender, address(this), _gsAmount);
        
        // Swap GS → CELO using default pool
        uint256 celoReceived = _swapGSToCELO(_gsAmount, _minCeloOut, defaultPoolId);
        
        // Vote with CELO using voteWithCelo (sends native CELO)
        sovereignSeas.voteWithCelo{value: celoReceived}(_campaignId, _projectId, _bypassCode);
        
        emit SwapAndVote(
            msg.sender, 
            _campaignId, 
            _projectId, 
            _gsAmount, 
            celoReceived, 
            defaultPoolId,
            pools[defaultPoolId].name
        );
    }

    /**
     * @notice Swap GoodDollar to CELO using specified pool
     * @param _campaignId Campaign ID to vote in
     * @param _projectId Project ID to vote for
     * @param _gsAmount Amount of GoodDollar to swap
     * @param _minCeloOut Minimum CELO to receive
     * @param _poolId Pool ID to use for swap
     * @param _bypassCode Bypass code for voting (if any)
     */
    function swapAndVoteWithPool(
        uint256 _campaignId,
        uint256 _projectId,
        uint256 _gsAmount,
        uint256 _minCeloOut,
        uint256 _poolId,
        bytes32 _bypassCode
    ) external nonReentrant {
        require(_gsAmount > 0, "Amount must be greater than 0");
        require(_poolId < poolCount, "Invalid pool ID");
        require(pools[_poolId].active, "Pool not active");
        
        // Transfer GoodDollar from user
        goodDollar.safeTransferFrom(msg.sender, address(this), _gsAmount);
        
        // Swap GS → CELO using specified pool
        uint256 celoReceived = _swapGSToCELO(_gsAmount, _minCeloOut, _poolId);
        
        // Vote with CELO using voteWithCelo (sends native CELO)
        sovereignSeas.voteWithCelo{value: celoReceived}(_campaignId, _projectId, _bypassCode);
        
        emit SwapAndVote(
            msg.sender, 
            _campaignId, 
            _projectId, 
            _gsAmount, 
            celoReceived, 
            _poolId,
            pools[_poolId].name
        );
    }

    /**
     * @notice Internal function to swap GS to CELO using Ubeswap V2
     */
    function _swapGSToCELO(uint256 _gsAmount, uint256 _minCeloOut, uint256 _poolId) internal returns (uint256) {
        Pool storage pool = pools[_poolId];
        require(pool.active, "Pool not active");
        
        // Check liquidity
        require(_checkPoolLiquidity(_poolId), "Insufficient pool liquidity");
        
        address[] memory path = new address[](2);
        path[0] = pool.tokenA; // Should be GOOD_DOLLAR
        path[1] = pool.tokenB; // Should be CELO
        
        require(path[0] == GOOD_DOLLAR && path[1] == CELO, "Invalid pool tokens");
        
        uint256[] memory amounts = ubeswapRouter.swapExactTokensForTokens(
            _gsAmount,
            _minCeloOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        return amounts[1]; // CELO received
    }

    /**
     * @notice Check if pool has sufficient liquidity
     */
    function _checkPoolLiquidity(uint256 _poolId) internal view returns (bool) {
        Pool storage pool = pools[_poolId];
        
        try IUbeswapV2Pair(pool.pairAddress).getReserves() returns (
            uint112 reserve0, 
            uint112 reserve1, 
            uint32
        ) {
            // Check which token is CELO and ensure it has enough liquidity
            address token0 = IUbeswapV2Pair(pool.pairAddress).token0();
            uint256 celoReserve = (token0 == CELO) ? reserve0 : reserve1;
            return celoReserve >= MIN_LIQUIDITY_THRESHOLD;
        } catch {
            return false;
        }
    }

    /**
     * @notice Get quote for GS → CELO swap
     */
    function getQuote(uint256 _gsAmount) external view returns (uint256 estimatedCelo) {
        return getQuoteForPool(_gsAmount, defaultPoolId);
    }

    /**
     * @notice Get quote for specific pool
     */
    function getQuoteForPool(uint256 _gsAmount, uint256 _poolId) public view returns (uint256 estimatedCelo) {
        if (_gsAmount == 0 || _poolId >= poolCount || !pools[_poolId].active) return 0;
        
        Pool storage pool = pools[_poolId];
        
        try this._getUbeswapV2Quote(_gsAmount, pool.tokenA, pool.tokenB) returns (uint256 amount) {
            return amount;
        } catch {
            return 0;
        }
    }

    /**
     * @notice External function for getting Ubeswap V2 quotes (for try/catch)
     */
    function _getUbeswapV2Quote(uint256 _gsAmount, address _tokenA, address _tokenB) external view returns (uint256) {
        require(msg.sender == address(this), "Internal only");
        
        address[] memory path = new address[](2);
        path[0] = _tokenA;
        path[1] = _tokenB;
        
        uint256[] memory amounts = ubeswapRouter.getAmountsOut(_gsAmount, path);
        return amounts[1];
    }

    // === POOL MANAGEMENT FUNCTIONS ===

    /**
     * @notice Add a new pool
     * @param _pairAddress Uniswap/Ubeswap pair address
     * @param _tokenA First token (should be GOOD_DOLLAR for input)
     * @param _tokenB Second token (output token)
     * @param _name Descriptive name for the pool
     */
    function addPool(
        address _pairAddress,
        address _tokenA,
        address _tokenB,
        string memory _name
    ) external onlyOwner returns (uint256 poolId) {
        return _addPool(_pairAddress, _tokenA, _tokenB, _name);
    }

    /**
     * @notice Internal function to add pool
     */
    function _addPool(
        address _pairAddress,
        address _tokenA,
        address _tokenB,
        string memory _name
    ) internal returns (uint256 poolId) {
        require(_pairAddress != address(0), "Invalid pair address");
        require(_tokenA != address(0) && _tokenB != address(0), "Invalid token addresses");
        
        poolId = poolCount++;
        pools[poolId] = Pool({
            pairAddress: _pairAddress,
            tokenA: _tokenA,
            tokenB: _tokenB,
            active: true,
            name: _name
        });
        
        // Approve tokens for router if needed
        if (_tokenA != GOOD_DOLLAR) {
            IERC20(_tokenA).approve(UBESWAP_V2_ROUTER, type(uint256).max);
        }
        
        emit PoolAdded(poolId, _pairAddress, _tokenA, _tokenB, _name);
        return poolId;
    }

    /**
     * @notice Update pool status
     */
    function setPoolActive(uint256 _poolId, bool _active) external onlyOwner {
        require(_poolId < poolCount, "Invalid pool ID");
        pools[_poolId].active = _active;
        emit PoolUpdated(_poolId, _active);
    }

    /**
     * @notice Set default pool for swapAndVote
     */
    function setDefaultPool(uint256 _poolId) external onlyOwner {
        require(_poolId < poolCount, "Invalid pool ID");
        require(pools[_poolId].active, "Pool not active");
        
        uint256 oldPoolId = defaultPoolId;
        defaultPoolId = _poolId;
        emit DefaultPoolChanged(oldPoolId, _poolId);
    }

    // === VIEW FUNCTIONS ===

    /**
     * @notice Check if contract is operational (default pool has liquidity)
     */
    function isOperational() external view returns (bool) {
        if (poolCount == 0) return false;
        return _checkPoolLiquidity(defaultPoolId);
    }

    /**
     * @notice Get pool information
     */
    function getPool(uint256 _poolId) external view returns (
        address pairAddress,
        address tokenA,
        address tokenB,
        bool active,
        string memory name,
        bool hasLiquidity
    ) {
        require(_poolId < poolCount, "Invalid pool ID");
        Pool storage pool = pools[_poolId];
        
        return (
            pool.pairAddress,
            pool.tokenA,
            pool.tokenB,
            pool.active,
            pool.name,
            _checkPoolLiquidity(_poolId)
        );
    }

    /**
     * @notice Get all active pools
     */
    function getActivePools() external view returns (uint256[] memory activePoolIds) {
        uint256 activeCount = 0;
        
        // Count active pools
        for (uint256 i = 0; i < poolCount; i++) {
            if (pools[i].active) activeCount++;
        }
        
        // Create array of active pool IDs
        activePoolIds = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < poolCount; i++) {
            if (pools[i].active) {
                activePoolIds[index++] = i;
            }
        }
        
        return activePoolIds;
    }

    // === EMERGENCY FUNCTIONS ===

    /**
     * @notice Emergency withdrawal function
     */
    function emergencyWithdraw(address _token, address _recipient, uint256 _amount) external onlyOwner {
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
    }

    // Allow contract to receive native CELO (needed for voteWithCelo)
    receive() external payable {}
}