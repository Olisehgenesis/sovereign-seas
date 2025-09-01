// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../base/BaseModule.sol";

/**
 * @title PoolsModule
 * @notice Manages funding pools and distribution in SovereignSeas V5
 * @dev Handles campaign pools, project pools, and fund distribution algorithms
 */
contract PoolsModule is BaseModule {
    using SafeERC20 for IERC20;

    // Pool type enum
    enum PoolType {
        CAMPAIGN,   // 0 - Campaign funding pool
        PROJECT     // 1 - Individual project pool
    }

    // Distribution method enum
    enum DistributionMethod {
        EQUAL,          // 0 - Equal distribution to all projects
        PROPORTIONAL,   // 1 - Proportional to vote percentages
        QUADRATIC,      // 2 - Quadratic distribution (rewards diversity)
        CUSTOM          // 3 - Custom distribution rules
    }

    // Pool struct
    struct Pool {
        uint256 id;
        PoolType poolType;
        uint256 campaignId;
        uint256 projectId;
        address token;
        uint256 totalBalance;
        uint256 distributedAmount;
        uint256 unclaimedAmount;
        DistributionMethod distributionMethod;
        bool active;
        uint256 createdAt;
        uint256 lastDistribution;
        mapping(address => uint256) tokenBalances;
        mapping(address => uint256) teamMemberPercentages;
        mapping(address => bool) teamMembers;
        address[] teamMemberList;
    }

    // Distribution result struct
    struct DistributionResult {
        uint256 projectId;
        uint256 amount;
        address token;
        uint256 timestamp;
        string comment;
        bytes metadata;
    }

    // Team member struct
    struct TeamMember {
        uint256 id;
        address wallet; 
        string name;
        uint256 claimPercentage;
        bool isActive;
        uint256 lastClaimTime;
    }

    // Distribution type enum
    enum DistributionType {
        AUTOMATIC,      // 0: Vote-based + voter diversity
        SEMI_AUTOMATIC, // 1: Automatic + admin adjustments  
        MANUAL          // 2: Admin sets exact amounts
    }

    // State variables
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => uint256[]) public campaignPools;
    mapping(uint256 => uint256[]) public projectPools;
    mapping(uint256 => DistributionResult[]) public distributionHistory;
    mapping(address => uint256[]) public userPools;
    
    // Enhanced mappings for missing functionality
    mapping(uint256 => mapping(address => uint256)) public tokenBalances; // poolId => token => amount
    mapping(uint256 => TeamMember[]) public teamMembers; // poolId => team members
    mapping(uint256 => mapping(address => bool)) public isTeamMember; // poolId => member => status
    mapping(uint256 => mapping(address => uint256)) public memberPercentages; // poolId => member => percentage
    mapping(uint256 => DistributionType) public poolDistributionType; // poolId => distribution type
    mapping(uint256 => uint256) public lastClaimTime; // poolId => timestamp
    mapping(uint256 => bool) public fundsDistributed; // poolId => distributed status
    
    uint256 public nextPoolId;
    uint256 public nextTeamMemberId;
    uint256 public totalPools;
    uint256 public activePools;
    uint256 public totalDistributed;
    
    // Constants
    uint256 public constant CLAIM_LOCK_PERIOD = 180 days; // 6 months
    uint256 public constant VOTER_DIVERSITY_BONUS = 5; // 5% bonus

    // Events
    event PoolCreated(uint256 indexed poolId, PoolType poolType, uint256 indexed campaignId, uint256 indexed projectId, address token);
    event PoolFunded(uint256 indexed poolId, address indexed funder, address token, uint256 amount);
    event FundsDistributed(uint256 indexed poolId, uint256 indexed projectId, uint256 amount, address token);
    event TeamMemberAdded(uint256 indexed poolId, address indexed member, uint256 percentage);
    event TeamMemberRemoved(uint256 indexed poolId, address indexed member);
    event TeamPercentageUpdated(uint256 indexed poolId, address indexed member, uint256 newPercentage);
    event FundsClaimed(uint256 indexed poolId, address indexed member, uint256 amount, address token);
    event UnclaimedFundsRecalled(uint256 indexed poolId, uint256 amount, address token);
    event DistributionMethodSet(uint256 indexed poolId, DistributionMethod method);
    event PoolAnalyticsUpdated(uint256 indexed poolId, uint256 totalBalance, uint256 distributedAmount);

    // Modifiers
    modifier poolExists(uint256 _poolId) {
        require(pools[_poolId].id != 0, "PoolsModule: Pool does not exist");
        _;
    }

    modifier onlyPoolAdmin(uint256 _poolId) {
        // This would need to check with the campaigns module
        _;
    }

    modifier onlyTeamMember(uint256 _poolId) {
        require(pools[_poolId].teamMembers[msg.sender], "PoolsModule: Only team member can call this function");
        _;
    }

    modifier onlyActivePool(uint256 _poolId) {
        require(pools[_poolId].active, "PoolsModule: Pool is not active");
        _;
    }

    /**
     * @notice Initialize the PoolsModule
     * @param _proxy The main proxy contract address
     * @param _data Additional initialization data
     */
    function initialize(address _proxy, bytes calldata _data) external override initializer {
        require(_proxy != address(0), "PoolsModule: Invalid proxy address");
        
        sovereignSeasProxy = ISovereignSeasV5(_proxy);
        moduleActive = true;

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);

        // Initialize inherited contracts
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        moduleName = "Pools Module";
        moduleDescription = "Manages funding pools and distribution";
        moduleDependencies = new string[](3);
        moduleDependencies[0] = "projects";
        moduleDependencies[1] = "campaigns";
        moduleDependencies[2] = "treasury";
        
        nextPoolId = 1;
    }

    /**
     * @notice Get the module's unique identifier
     * @return The module identifier string
     */
    function getModuleId() public pure override returns (string memory) {
        return "pools";
    }

    /**
     * @notice Get the module's version
     * @return The module version string
     */
    function getModuleVersion() public pure override returns (string memory) {
        return "1.0.0";
    }

    /**
     * @notice Create a campaign funding pool
     * @param _campaignId The campaign ID
     * @param _token The token address
     * @param _distributionMethod The distribution method
     * @return The new pool ID
     */
    function createCampaignPool(
        uint256 _campaignId,
        address _token,
        DistributionMethod _distributionMethod
    ) external whenActive returns (uint256) {
        require(_token != address(0), "PoolsModule: Invalid token address");

        uint256 poolId = nextPoolId++;
        
        Pool storage pool = pools[poolId];
        pool.id = poolId;
        pool.poolType = PoolType.CAMPAIGN;
        pool.campaignId = _campaignId;
        pool.token = _token;
        pool.distributionMethod = _distributionMethod;
        pool.active = true;
        pool.createdAt = block.timestamp;

        campaignPools[_campaignId].push(poolId);
        totalPools++;
        activePools++;

        emit PoolCreated(poolId, PoolType.CAMPAIGN, _campaignId, 0, _token);
        
        return poolId;
    }

    /**
     * @notice Create a project funding pool
     * @param _projectId The project ID
     * @param _token The token address
     * @param _distributionMethod The distribution method
     * @return The new pool ID
     */
    function createProjectPool(
        uint256 _projectId,
        address _token,
        DistributionMethod _distributionMethod
    ) external whenActive returns (uint256) {
        require(_token != address(0), "PoolsModule: Invalid token address");

        uint256 poolId = nextPoolId++;
        
        Pool storage pool = pools[poolId];
        pool.id = poolId;
        pool.poolType = PoolType.PROJECT;
        pool.projectId = _projectId;
        pool.token = _token;
        pool.distributionMethod = _distributionMethod;
        pool.active = true;
        pool.createdAt = block.timestamp;

        projectPools[_projectId].push(poolId);
        totalPools++;
        activePools++;

        emit PoolCreated(poolId, PoolType.PROJECT, 0, _projectId, _token);
        
        return poolId;
    }

    /**
     * @notice Add funds to a pool
     * @param _poolId The pool ID
     * @param _token The token address
     * @param _amount The amount to add
     */
    function addFundsToPool(
        uint256 _poolId,
        address _token,
        uint256 _amount
    ) external whenActive poolExists(_poolId) onlyActivePool(_poolId) {
        require(_amount > 0, "PoolsModule: Amount must be greater than 0");
        require(_token == pools[_poolId].token, "PoolsModule: Token mismatch");

        require(IERC20(_token).transferFrom(msg.sender, address(this), _amount), "PoolsModule: Transfer failed");

        Pool storage pool = pools[_poolId];
        pool.totalBalance += _amount;
        pool.tokenBalances[_token] += _amount;

        emit PoolFunded(_poolId, msg.sender, _token, _amount);
    }

    /**
     * @notice Distribute funds from a pool
     * @param _poolId The pool ID
     * @param _projectIds Array of project IDs to distribute to
     * @param _amounts Array of amounts for each project
     */
    function distributeFunds(
        uint256 _poolId,
        uint256[] calldata _projectIds,
        uint256[] calldata _amounts
    ) external whenActive poolExists(_poolId) onlyActivePool(_poolId) {
        require(_projectIds.length == _amounts.length, "PoolsModule: Arrays length mismatch");

        Pool storage pool = pools[_poolId];
        require(pool.totalBalance >= _calculateTotalAmount(_amounts), "PoolsModule: Insufficient pool balance");

        for (uint256 i = 0; i < _projectIds.length; i++) {
            _distributeToProject(_poolId, _projectIds[i], _amounts[i]);
        }

        pool.lastDistribution = block.timestamp;
        totalDistributed += _calculateTotalAmount(_amounts);
    }

    /**
     * @notice Get pool balance
     * @param _poolId The pool ID
     * @return The pool balance
     */
    function getPoolBalance(uint256 _poolId) external view poolExists(_poolId) returns (uint256) {
        return pools[_poolId].totalBalance;
    }

    /**
     * @notice Set distribution method for a pool
     * @param _poolId The pool ID
     * @param _method The distribution method
     */
    function setDistributionMethod(
        uint256 _poolId,
        DistributionMethod _method
    ) external whenActive poolExists(_poolId) onlyPoolAdmin(_poolId) {
        pools[_poolId].distributionMethod = _method;

        emit DistributionMethodSet(_poolId, _method);
    }

    /**
     * @notice Add team member to a pool
     * @param _poolId The pool ID
     * @param _member The team member address
     * @param _percentage The member's percentage (basis points)
     */
    function addTeamMember(
        uint256 _poolId,
        address _member,
        uint256 _percentage
    ) external whenActive poolExists(_poolId) onlyPoolAdmin(_poolId) {
        require(_member != address(0), "PoolsModule: Invalid member address");
        require(_percentage <= 10000, "PoolsModule: Percentage cannot exceed 100%");
        require(!pools[_poolId].teamMembers[_member], "PoolsModule: Member already exists");

        Pool storage pool = pools[_poolId];
        pool.teamMembers[_member] = true;
        pool.teamMemberPercentages[_member] = _percentage;
        pool.teamMemberList.push(_member);

        emit TeamMemberAdded(_poolId, _member, _percentage);
    }

    /**
     * @notice Set team member percentages
     * @param _poolId The pool ID
     * @param _members Array of member addresses
     * @param _percentages Array of percentages
     */
    function setTeamPercentages(
        uint256 _poolId,
        address[] calldata _members,
        uint256[] calldata _percentages
    ) external whenActive poolExists(_poolId) onlyPoolAdmin(_poolId) {
        require(_members.length == _percentages.length, "PoolsModule: Arrays length mismatch");

        Pool storage pool = pools[_poolId];
        
        for (uint256 i = 0; i < _members.length; i++) {
            require(pool.teamMembers[_members[i]], "PoolsModule: Member does not exist");
            require(_percentages[i] <= 10000, "PoolsModule: Percentage cannot exceed 100%");
            
            pool.teamMemberPercentages[_members[i]] = _percentages[i];
            emit TeamPercentageUpdated(_poolId, _members[i], _percentages[i]);
        }
    }

    /**
     * @notice Allow team member to claim funds
     * @param _poolId The pool ID
     * @param _amount The amount to claim
     */
    function claimFunds(
        uint256 _poolId,
        uint256 _amount
    ) external whenActive poolExists(_poolId) onlyActivePool(_poolId) onlyTeamMember(_poolId) {
        require(_amount > 0, "PoolsModule: Amount must be greater than 0");

        Pool storage pool = pools[_poolId];
        require(pool.unclaimedAmount >= _amount, "PoolsModule: Insufficient unclaimed amount");

        pool.unclaimedAmount -= _amount;
        pool.tokenBalances[pool.token] -= _amount;

        require(IERC20(pool.token).transfer(msg.sender, _amount), "PoolsModule: Transfer failed");

        emit FundsClaimed(_poolId, msg.sender, _amount, pool.token);
    }

    /**
     * @notice Recall unclaimed funds
     * @param _poolId The pool ID
     */
    function recallUnclaimedFunds(uint256 _poolId) external whenActive poolExists(_poolId) onlyPoolAdmin(_poolId) {
        Pool storage pool = pools[_poolId];
        require(pool.unclaimedAmount > 0, "PoolsModule: No unclaimed funds");

        uint256 unclaimedAmount = pool.unclaimedAmount;
        pool.unclaimedAmount = 0;
        pool.tokenBalances[pool.token] -= unclaimedAmount;

        // This would typically go back to the campaign admin or treasury
        require(IERC20(pool.token).transfer(msg.sender, unclaimedAmount), "PoolsModule: Transfer failed");

        emit UnclaimedFundsRecalled(_poolId, unclaimedAmount, pool.token);
    }

    /**
     * @notice Get pool analytics
     * @param _poolId The pool ID
     * @return totalBalance Total pool balance
     * @return distributedAmount Amount distributed
     * @return unclaimedAmount Unclaimed amount
     * @return teamMemberCount Number of team members
     */
    function getPoolAnalytics(uint256 _poolId) external view poolExists(_poolId) returns (
        uint256 totalBalance,
        uint256 distributedAmount,
        uint256 unclaimedAmount,
        uint256 teamMemberCount
    ) {
        Pool storage pool = pools[_poolId];
        return (
            pool.totalBalance,
            pool.distributedAmount,
            pool.unclaimedAmount,
            pool.teamMemberList.length
        );
    }

    /**
     * @notice Set pool settings
     * @param _poolId The pool ID
     * @param _active Whether the pool is active
     */
    function setPoolSettings(
        uint256 _poolId,
        bool _active
    ) external whenActive poolExists(_poolId) onlyPoolAdmin(_poolId) {
        Pool storage pool = pools[_poolId];
        bool oldActive = pool.active;
        pool.active = _active;

        if (oldActive && !_active) {
            activePools--;
        } else if (!oldActive && _active) {
            activePools++;
        }
    }

    /**
     * @notice Get team members for a pool
     * @param _poolId The pool ID
     * @return Array of team member addresses
     */
    function getTeamMembers(uint256 _poolId) external view poolExists(_poolId) returns (address[] memory) {
        return pools[_poolId].teamMemberList;
    }

    /**
     * @notice Calculate fund distribution
     * @param _poolId The pool ID
     * @param _projectIds Array of project IDs
     * @param _voteCounts Array of vote counts
     * @return Array of distribution amounts
     */
    function calculateDistribution(
        uint256 _poolId,
        uint256[] calldata _projectIds,
        uint256[] calldata _voteCounts
    ) external view poolExists(_poolId) returns (uint256[] memory) {
        require(_projectIds.length == _voteCounts.length, "PoolsModule: Arrays length mismatch");

        Pool storage pool = pools[_poolId];
        uint256[] memory amounts = new uint256[](_projectIds.length);

        if (pool.distributionMethod == DistributionMethod.EQUAL) {
            uint256 equalAmount = pool.totalBalance / _projectIds.length;
            for (uint256 i = 0; i < _projectIds.length; i++) {
                amounts[i] = equalAmount;
            }
        } else if (pool.distributionMethod == DistributionMethod.PROPORTIONAL) {
            uint256 totalVotes = _calculateTotalAmount(_voteCounts);
            for (uint256 i = 0; i < _projectIds.length; i++) {
                if (totalVotes > 0) {
                    amounts[i] = (pool.totalBalance * _voteCounts[i]) / totalVotes;
                }
            }
        } else if (pool.distributionMethod == DistributionMethod.QUADRATIC) {
            amounts = _calculateQuadraticDistribution(pool.totalBalance, _voteCounts);
        }

        return amounts;
    }

    /**
     * @notice Distribute funds in campaign token
     * @param _poolId The pool ID
     * @param _projectIds Array of project IDs
     * @param _amounts Array of amounts
     */
    function distributeInCampaignToken(
        uint256 _poolId,
        uint256[] calldata _projectIds,
        uint256[] calldata _amounts
    ) external whenActive poolExists(_poolId) onlyActivePool(_poolId) {
        require(_projectIds.length == _amounts.length, "PoolsModule: Arrays length mismatch");

        Pool storage pool = pools[_poolId];
        require(pool.poolType == PoolType.CAMPAIGN, "PoolsModule: Only campaign pools can use this function");

        for (uint256 i = 0; i < _projectIds.length; i++) {
            _distributeToProject(_poolId, _projectIds[i], _amounts[i]);
        }
    }

    /**
     * @notice Distribute funds in multiple tokens
     * @param _poolId The pool ID
     * @param _projectIds Array of project IDs
     * @param _tokens Array of token addresses
     * @param _amounts Array of amounts
     */
    function distributeInMultipleTokens(
        uint256 _poolId,
        uint256[] calldata _projectIds,
        address[] calldata _tokens,
        uint256[] calldata _amounts
    ) external whenActive poolExists(_poolId) onlyActivePool(_poolId) {
        require(_projectIds.length == _tokens.length && _tokens.length == _amounts.length, "PoolsModule: Arrays length mismatch");

        for (uint256 i = 0; i < _projectIds.length; i++) {
            _distributeToProjectWithToken(_poolId, _projectIds[i], _tokens[i], _amounts[i]);
        }
    }

    /**
     * @notice Convert tokens for distribution
     * @param _poolId The pool ID
     * @param _fromToken The source token
     * @param _toToken The target token
     * @param _amount The amount to convert
     * @return The converted amount
     */
    function convertForDistribution(
        uint256 _poolId,
        address _fromToken,
        address _toToken,
        uint256 _amount
    ) external whenActive poolExists(_poolId) returns (uint256) {
        // This would integrate with the treasury module for token conversion
        return _amount; // Simplified
    }

    /**
     * @notice Set team claim percentages
     * @param _poolId The pool ID
     * @param _members Array of member addresses
     * @param _percentages Array of claim percentages
     */
    function setTeamClaimPercentages(
        uint256 _poolId,
        address[] calldata _members,
        uint256[] calldata _percentages
    ) external whenActive poolExists(_poolId) onlyPoolAdmin(_poolId) {
        require(_members.length == _percentages.length, "PoolsModule: Arrays length mismatch");

        Pool storage pool = pools[_poolId];
        
        for (uint256 i = 0; i < _members.length; i++) {
            require(pool.teamMembers[_members[i]], "PoolsModule: Member does not exist");
            require(_percentages[i] <= 10000, "PoolsModule: Percentage cannot exceed 100%");
            
            pool.teamMemberPercentages[_members[i]] = _percentages[i];
        }
    }

    /**
     * @notice Get unclaimed funds amount
     * @param _poolId The pool ID
     * @return The unclaimed amount
     */
    function getUnclaimedFunds(uint256 _poolId) external view poolExists(_poolId) returns (uint256) {
        return pools[_poolId].unclaimedAmount;
    }

    /**
     * @notice Redistribute unclaimed funds
     * @param _poolId The pool ID
     * @param _projectIds Array of project IDs
     * @param _amounts Array of amounts
     */
    function redistributeUnclaimedFunds(
        uint256 _poolId,
        uint256[] calldata _projectIds,
        uint256[] calldata _amounts
    ) external whenActive poolExists(_poolId) onlyPoolAdmin(_poolId) {
        require(_projectIds.length == _amounts.length, "PoolsModule: Arrays length mismatch");

        Pool storage pool = pools[_poolId];
        require(pool.unclaimedAmount >= _calculateTotalAmount(_amounts), "PoolsModule: Insufficient unclaimed amount");

        for (uint256 i = 0; i < _projectIds.length; i++) {
            _distributeToProject(_poolId, _projectIds[i], _amounts[i]);
        }
    }

    // Internal helper functions
    function _distributeToProject(
        uint256 _poolId,
        uint256 _projectId,
        uint256 _amount
    ) internal {
        Pool storage pool = pools[_poolId];
        require(pool.totalBalance >= _amount, "PoolsModule: Insufficient pool balance");

        pool.totalBalance -= _amount;
        pool.distributedAmount += _amount;
        pool.unclaimedAmount += _amount;

        // Record distribution
        DistributionResult memory result = DistributionResult({
            projectId: _projectId,
            amount: _amount,
            token: pool.token,
            timestamp: block.timestamp,
            comment: "Fund distribution",
            metadata: ""
        });

        distributionHistory[_poolId].push(result);

        emit FundsDistributed(_poolId, _projectId, _amount, pool.token);
    }

    function _distributeToProjectWithToken(
        uint256 _poolId,
        uint256 _projectId,
        address _token,
        uint256 _amount
    ) internal {
        Pool storage pool = pools[_poolId];
        require(pool.tokenBalances[_token] >= _amount, "PoolsModule: Insufficient token balance");

        pool.tokenBalances[_token] -= _amount;
        pool.distributedAmount += _amount;

        // Record distribution
        DistributionResult memory result = DistributionResult({
            projectId: _projectId,
            amount: _amount,
            token: _token,
            timestamp: block.timestamp,
            comment: "Multi-token distribution",
            metadata: ""
        });

        distributionHistory[_poolId].push(result);

        emit FundsDistributed(_poolId, _projectId, _amount, _token);
    }

    function _calculateTotalAmount(uint256[] memory _amounts) internal pure returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            total += _amounts[i];
        }
        return total;
    }

    function _calculateQuadraticDistribution(
        uint256 _totalAmount,
        uint256[] memory _voteCounts
    ) internal pure returns (uint256[] memory) {
        uint256[] memory amounts = new uint256[](_voteCounts.length);
        uint256 totalQuadraticVotes = 0;

        // Calculate total quadratic votes
        for (uint256 i = 0; i < _voteCounts.length; i++) {
            totalQuadraticVotes += _sqrt(_voteCounts[i]);
        }

        // Distribute based on quadratic votes
        for (uint256 i = 0; i < _voteCounts.length; i++) {
            if (totalQuadraticVotes > 0) {
                amounts[i] = (_totalAmount * _sqrt(_voteCounts[i])) / totalQuadraticVotes;
            }
        }

        return amounts;
    }

    function _sqrt(uint256 _x) internal pure returns (uint256) {
        if (_x == 0) return 0;
        
        uint256 z = (_x + 1) / 2;
        uint256 y = _x;
        
        while (z < y) {
            y = z;
            z = (_x / z + z) / 2;
        }
        
        return y;
    }

    // ==================== MISSING CRITICAL FUNCTIONS ====================

    /**
     * @notice Enhanced Team Management System
     * @param _poolId The pool ID
     * @param _wallet Team member wallet address
     * @param _name Team member name
     * @param _claimPercentage Initial claim percentage (out of 100)
     */
    function addTeamMember(
        uint256 _poolId,
        address _wallet,
        string memory _name,
        uint256 _claimPercentage
    ) external whenActive poolExists(_poolId) onlyPoolAdmin(_poolId) {
        require(_wallet != address(0), "PoolsModule: Invalid wallet address");
        require(!isTeamMember[_poolId][_wallet], "PoolsModule: Member already exists");
        require(_claimPercentage <= 100, "PoolsModule: Invalid percentage");

        Pool storage pool = pools[_poolId];
        
        uint256 memberId = nextTeamMemberId++;
        TeamMember memory newMember = TeamMember({
            id: memberId,
            wallet: _wallet,
            name: _name,
            claimPercentage: _claimPercentage,
            isActive: true,
            lastClaimTime: 0
        });

        teamMembers[_poolId].push(newMember);
        isTeamMember[_poolId][_wallet] = true;
        memberPercentages[_poolId][_wallet] = _claimPercentage;
        pool.teamMembers[_wallet] = true;
        pool.teamMemberList.push(_wallet);

        emit TeamMemberAdded(_poolId, _wallet, _claimPercentage);
    }

    /**
     * @notice Remove team member
     * @param _poolId The pool ID
     * @param _wallet Team member wallet address
     */
    function removeTeamMember(
        uint256 _poolId,
        address _wallet
    ) external whenActive poolExists(_poolId) onlyPoolAdmin(_poolId) {
        require(isTeamMember[_poolId][_wallet], "PoolsModule: Member does not exist");

        Pool storage pool = pools[_poolId];
        
        // Mark as inactive
        TeamMember[] storage members = teamMembers[_poolId];
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i].wallet == _wallet) {
                members[i].isActive = false;
                break;
            }
        }

        isTeamMember[_poolId][_wallet] = false;
        memberPercentages[_poolId][_wallet] = 0;
        pool.teamMembers[_wallet] = false;

        // Remove from team member list
        address[] storage memberList = pool.teamMemberList;
        for (uint256 i = 0; i < memberList.length; i++) {
            if (memberList[i] == _wallet) {
                memberList[i] = memberList[memberList.length - 1];
                memberList.pop();
                break;
            }
        }

        emit TeamMemberRemoved(_poolId, _wallet);
    }

    /**
     * @notice Distribution Algorithms - Automatic Distribution
     * @param _campaignId The campaign ID
     */
    function distributeAutomatic(uint256 _campaignId) external whenActive {
        uint256[] memory poolIds = campaignPools[_campaignId];
        require(poolIds.length > 0, "PoolsModule: No pools for campaign");

        for (uint256 i = 0; i < poolIds.length; i++) {
            uint256 poolId = poolIds[i];
            Pool storage pool = pools[poolId];
            
            if (pool.active && !fundsDistributed[poolId] && pool.totalBalance > 0) {
                poolDistributionType[poolId] = DistributionType.AUTOMATIC;
                _performAutomaticDistribution(poolId);
                fundsDistributed[poolId] = true;
            }
        }

        emit FundsDistributed(0, _campaignId, 0, address(0)); // Campaign-level event
    }

    /**
     * @notice Distribution Algorithms - Semi-Automatic Distribution
     * @param _campaignId The campaign ID
     * @param _projectIds Array of project IDs for adjustments
     * @param _adjustments Array of adjustment amounts
     */
    function distributeSemiAutomatic(
        uint256 _campaignId,
        uint256[] memory _projectIds,
        uint256[] memory _adjustments
    ) external whenActive onlyAdmin {
        require(_projectIds.length == _adjustments.length, "PoolsModule: Arrays length mismatch");
        
        uint256[] memory poolIds = campaignPools[_campaignId];
        require(poolIds.length > 0, "PoolsModule: No pools for campaign");

        for (uint256 i = 0; i < poolIds.length; i++) {
            uint256 poolId = poolIds[i];
            Pool storage pool = pools[poolId];
            
            if (pool.active && !fundsDistributed[poolId] && pool.totalBalance > 0) {
                poolDistributionType[poolId] = DistributionType.SEMI_AUTOMATIC;
                _performSemiAutomaticDistribution(poolId, _projectIds, _adjustments);
                fundsDistributed[poolId] = true;
            }
        }

        emit FundsDistributed(0, _campaignId, 0, address(0)); // Campaign-level event
    }

    /**
     * @notice Treasury Integration - Distribute campaign funds to project
     * @param _campaignId The campaign ID
     * @param _projectId The project ID
     * @param _amount The amount to distribute
     * @param _token The token address
     */
    function distributeCampaignFundsToProject(
        uint256 _campaignId,
        uint256 _projectId,
        uint256 _amount,
        address _token
    ) external onlyMainContract {
        // Find campaign pool or create one
        uint256[] memory poolIds = campaignPools[_campaignId];
        uint256 targetPoolId = 0;
        
        if (poolIds.length == 0) {
            // Create new campaign pool
            targetPoolId = _createCampaignPool(_campaignId, _token);
        } else {
            targetPoolId = poolIds[0]; // Use first pool
        }

        Pool storage pool = pools[targetPoolId];
        
        // Transfer tokens from treasury to pool
        if (_token == address(0)) {
            // Native token
            require(address(this).balance >= _amount, "PoolsModule: Insufficient balance");
        } else {
            // ERC20 token
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        }

        // Update balances
        tokenBalances[targetPoolId][_token] += _amount;
        pool.totalBalance += _amount;

        // Distribute to specific project
        _distributeToProjectWithToken(targetPoolId, _projectId, _token, _amount);

        emit FundsDistributed(targetPoolId, _projectId, _amount, _token);
    }

    /**
     * @notice Claiming System with Time Locks - Claim project funds
     * @param _projectId The project ID
     */
    function claimProjectFunds(uint256 _projectId) external whenActive {
        uint256[] memory poolIds = projectPools[_projectId];
        require(poolIds.length > 0, "PoolsModule: No pools for project");

        for (uint256 i = 0; i < poolIds.length; i++) {
            uint256 poolId = poolIds[i];
            Pool storage pool = pools[poolId];
            
            require(isTeamMember[poolId][msg.sender], "PoolsModule: Not a team member");
            
            uint256 claimableAmount = _calculateClaimableAmount(poolId, msg.sender);
            require(claimableAmount > 0, "PoolsModule: No funds to claim");

            // Update last claim time
            lastClaimTime[poolId] = block.timestamp;
            _updateMemberClaimTime(poolId, msg.sender);

            // Transfer funds
            _transferToMember(poolId, msg.sender, claimableAmount, pool.token);

            emit FundsClaimed(poolId, msg.sender, claimableAmount, pool.token);
        }
    }

    /**
     * @notice Recall unclaimed funds after 6 months
     * @param _projectId The project ID
     */
    function recallUnclaimedFunds(uint256 _projectId) external whenActive onlyAdmin {
        uint256[] memory poolIds = projectPools[_projectId];
        require(poolIds.length > 0, "PoolsModule: No pools for project");

        for (uint256 i = 0; i < poolIds.length; i++) {
            uint256 poolId = poolIds[i];
            Pool storage pool = pools[poolId];
            
            // Check if 6 months have passed
            require(
                block.timestamp >= lastClaimTime[poolId] + CLAIM_LOCK_PERIOD ||
                lastClaimTime[poolId] == 0,
                "PoolsModule: Time lock not expired"
            );

            uint256 unclaimedAmount = pool.unclaimedAmount;
            require(unclaimedAmount > 0, "PoolsModule: No unclaimed funds");

            // Transfer unclaimed funds to admin
            pool.unclaimedAmount = 0;
            _transferToMember(poolId, msg.sender, unclaimedAmount, pool.token);

            emit UnclaimedFundsRecalled(poolId, unclaimedAmount, pool.token);
        }
    }

    /**
     * @notice Multi-token Pool Management - Contribute with specific token
     * @param _projectId The project ID
     * @param _token The token address
     * @param _amount The amount to contribute
     */
    function contributeWithToken(
        uint256 _projectId,
        address _token,
        uint256 _amount
    ) external payable whenActive {
        require(_amount > 0, "PoolsModule: Invalid amount");

        // Find or create project pool
        uint256[] memory poolIds = projectPools[_projectId];
        uint256 targetPoolId = 0;
        
        if (poolIds.length == 0) {
            // Create new project pool
            targetPoolId = _createProjectPool(_projectId, _token);
        } else {
            targetPoolId = poolIds[0]; // Use first pool
        }

        Pool storage pool = pools[targetPoolId];

        // Handle token transfer
        if (_token == address(0)) {
            // Native token
            require(msg.value == _amount, "PoolsModule: Incorrect native amount");
        } else {
            // ERC20 token
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        }

        // Update balances
        tokenBalances[targetPoolId][_token] += _amount;
        pool.totalBalance += _amount;

        emit PoolFunded(targetPoolId, msg.sender, _token, _amount);
    }

    // ==================== INTERNAL HELPER FUNCTIONS ====================

    /**
     * @notice Create campaign pool
     */
    function _createCampaignPool(uint256 _campaignId, address _token) internal returns (uint256) {
        uint256 poolId = nextPoolId++;
        
        Pool storage pool = pools[poolId];
        pool.id = poolId;
        pool.poolType = PoolType.CAMPAIGN;
        pool.campaignId = _campaignId;
        pool.token = _token;
        pool.active = true;
        pool.createdAt = block.timestamp;

        campaignPools[_campaignId].push(poolId);
        totalPools++;
        activePools++;

        emit PoolCreated(poolId, PoolType.CAMPAIGN, _campaignId, 0, _token);
        return poolId;
    }

    /**
     * @notice Create project pool
     */
    function _createProjectPool(uint256 _projectId, address _token) internal returns (uint256) {
        uint256 poolId = nextPoolId++;
        
        Pool storage pool = pools[poolId];
        pool.id = poolId;
        pool.poolType = PoolType.PROJECT;
        pool.projectId = _projectId;
        pool.token = _token;
        pool.active = true;
        pool.createdAt = block.timestamp;

        projectPools[_projectId].push(poolId);
        totalPools++;
        activePools++;

        emit PoolCreated(poolId, PoolType.PROJECT, 0, _projectId, _token);
        return poolId;
    }

    /**
     * @notice Perform automatic distribution based on votes
     */
    function _performAutomaticDistribution(uint256 _poolId) internal {
        Pool storage pool = pools[_poolId];
        
        // Get voting data from VotingModule
        try sovereignSeasProxy.callModule("voting", abi.encodeWithSignature("getCampaignVotingResults(uint256)", pool.campaignId)) 
        returns (bytes memory votingData) {
            (uint256[] memory projectIds, uint256[] memory voteCounts) = abi.decode(votingData, (uint256[], uint256[]));
            
            if (projectIds.length > 0) {
                uint256[] memory distributionAmounts = _calculateProportionalDistribution(pool.totalBalance, voteCounts);
                
                for (uint256 i = 0; i < projectIds.length; i++) {
                    if (distributionAmounts[i] > 0) {
                        _distributeToProject(_poolId, projectIds[i], distributionAmounts[i]);
                    }
                }
            }
        } catch {
            // Fallback to equal distribution
            _performEqualDistribution(_poolId);
        }
    }

    /**
     * @notice Perform semi-automatic distribution with adjustments
     */
    function _performSemiAutomaticDistribution(
        uint256 _poolId,
        uint256[] memory _projectIds,
        uint256[] memory _adjustments
    ) internal {
        // First perform automatic distribution
        _performAutomaticDistribution(_poolId);
        
        // Then apply manual adjustments
        Pool storage pool = pools[_poolId];
        for (uint256 i = 0; i < _projectIds.length; i++) {
            if (_adjustments[i] > 0 && pool.totalBalance >= _adjustments[i]) {
                _distributeToProject(_poolId, _projectIds[i], _adjustments[i]);
            }
        }
    }

    /**
     * @notice Perform equal distribution
     */
    function _performEqualDistribution(uint256 _poolId) internal {
        Pool storage pool = pools[_poolId];
        
        // Get campaign projects from CampaignsModule
        try sovereignSeasProxy.callModule("campaigns", abi.encodeWithSignature("getCampaignProjects(uint256)", pool.campaignId)) 
        returns (bytes memory projectData) {
            uint256[] memory projectIds = abi.decode(projectData, (uint256[]));
            
            if (projectIds.length > 0) {
                uint256 amountPerProject = pool.totalBalance / projectIds.length;
                
                for (uint256 i = 0; i < projectIds.length; i++) {
                    _distributeToProject(_poolId, projectIds[i], amountPerProject);
                }
            }
        } catch {
            // If campaigns module call fails, do nothing
        }
    }

    /**
     * @notice Calculate proportional distribution based on vote counts
     */
    function _calculateProportionalDistribution(
        uint256 _totalAmount,
        uint256[] memory _voteCounts
    ) internal pure returns (uint256[] memory) {
        uint256[] memory amounts = new uint256[](_voteCounts.length);
        uint256 totalVotes = 0;

        // Calculate total votes
        for (uint256 i = 0; i < _voteCounts.length; i++) {
            totalVotes += _voteCounts[i];
        }

        // Distribute proportionally
        if (totalVotes > 0) {
            for (uint256 i = 0; i < _voteCounts.length; i++) {
                amounts[i] = (_totalAmount * _voteCounts[i]) / totalVotes;
            }
        }

        return amounts;
    }

    /**
     * @notice Calculate claimable amount for team member
     */
    function _calculateClaimableAmount(uint256 _poolId, address _member) internal view returns (uint256) {
        Pool storage pool = pools[_poolId];
        uint256 memberPercentage = memberPercentages[_poolId][_member];
        
        if (memberPercentage == 0) return 0;
        
        return (pool.unclaimedAmount * memberPercentage) / 100;
    }

    /**
     * @notice Update member last claim time
     */
    function _updateMemberClaimTime(uint256 _poolId, address _member) internal {
        TeamMember[] storage members = teamMembers[_poolId];
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i].wallet == _member) {
                members[i].lastClaimTime = block.timestamp;
                break;
            }
        }
    }

    /**
     * @notice Transfer funds to team member
     */
    function _transferToMember(uint256 _poolId, address _member, uint256 _amount, address _token) internal {
        Pool storage pool = pools[_poolId];
        
        require(pool.unclaimedAmount >= _amount, "PoolsModule: Insufficient unclaimed funds");
        pool.unclaimedAmount -= _amount;

        if (_token == address(0)) {
            // Native token
            payable(_member).transfer(_amount);
        } else {
            // ERC20 token
            IERC20(_token).safeTransfer(_member, _amount);
        }
    }

    // ==================== VIEW FUNCTIONS ====================

    /**
     * @notice Get team members for a pool
     */
    function getTeamMembers(uint256 _poolId) external view returns (TeamMember[] memory) {
        return teamMembers[_poolId];
    }

    /**
     * @notice Get pool distribution type
     */
    function getPoolDistributionType(uint256 _poolId) external view returns (DistributionType) {
        return poolDistributionType[_poolId];
    }

    /**
     * @notice Check if funds are distributed for pool
     */
    function areFundsDistributed(uint256 _poolId) external view returns (bool) {
        return fundsDistributed[_poolId];
    }

    /**
     * @notice Get token balance for pool
     */
    function getTokenBalance(uint256 _poolId, address _token) external view returns (uint256) {
        return tokenBalances[_poolId][_token];
    }

    /**
     * @notice Get member claim percentage
     */
    function getMemberPercentage(uint256 _poolId, address _member) external view returns (uint256) {
        return memberPercentages[_poolId][_member];
    }
}
