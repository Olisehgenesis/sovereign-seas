// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// Good Dollar interfaces
interface ISuperGoodDollar {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function mint(address to, uint256 amount) external;
}

interface IDirectPaymentsFactory {
    function createPool(
        string memory _projectId,
        string memory _ipfs,
        PoolSettings memory _settings,
        SafetyLimits memory _limits,
        uint32 _managerFeeBps
    ) external returns (address pool);
    
    struct PoolSettings {
        uint32 nftType;
        uint16[] validEvents;
        uint128[] rewardPerEvent;
        address manager;
        address membersValidator;
        address uniquenessValidator;
        address rewardToken;
        bool allowRewardOverride;
    }
    
    struct SafetyLimits {
        uint256 maxTotalPerMonth;
        uint256 maxMemberPerMonth;
        uint256 maxMemberPerDay;
    }
}

interface IDirectPaymentsPool {
    function addMember(address member) external;
    function removeMember(address member) external;
    function reward(address member, uint256 amount, uint16 eventType, string calldata eventUri) external;
    function isMember(address member) external view returns (bool);
    function getPoolBalance() external view returns (uint256);
}

// SovereignSeasV4 interface - complete interface
interface ISovereignSeasV4 {
    // Structs from original contract
    struct ProjectMetadata { string bio; string contractInfo; string additionalData; }
    struct CampaignMetadata { string mainInfo; string additionalInfo; }
    
    // View functions
    function projects(uint256 _projectId) external view returns (
        uint256 id, address owner, string memory name, string memory description,
        bool transferrable, bool active, uint256 createdAt
    );
    
    function campaigns(uint256 _campaignId) external view returns (
        uint256 id, address admin, string memory name, string memory description,
        uint256 startTime, uint256 endTime, uint256 adminFeePercentage, uint256 maxWinners,
        bool useQuadraticDistribution, bool useCustomDistribution, address payoutToken,
        bool active, uint256 totalFunds
    );
    
    function projectParticipations(uint256 _campaignId, uint256 _projectId) external view returns (
        uint256 projectId, uint256 campaignId, bool approved, uint256 voteCount, uint256 fundsReceived
    );
    
    function getProjectCount() external view returns (uint256);
    function getCampaignCount() external view returns (uint256);
    function isCampaignAdmin(uint256 _campaignId, address _admin) external view returns (bool);
    function getSortedProjects(uint256 _campaignId) external view returns (uint256[] memory);
    function getProject(uint256 _projectId) external view returns (
        uint256 id, address owner, string memory name, string memory description,
        bool transferrable, bool active, uint256 createdAt, uint256[] memory campaignIds
    );
    function getCampaign(uint256 _campaignId) external view returns (
        uint256 id, address admin, string memory name, string memory description,
        uint256 startTime, uint256 endTime, uint256 adminFeePercentage, uint256 maxWinners,
        bool useQuadraticDistribution, bool useCustomDistribution, address payoutToken,
        bool active, uint256 totalFunds
    );
    
    // Fee and admin functions
    function campaignCreationFee() external view returns (uint256);
    function projectAdditionFee() external view returns (uint256);
    function superAdmins(address _admin) external view returns (bool);
    
    // State-changing functions
    function createProject(
        string memory _name, string memory _description, string memory _bioPart,
        string memory _contractInfoPart, string memory _additionalDataPart,
        address[] memory _contracts, bool _transferrable
    ) external;
    
    function createCampaign(
        string memory _name, string memory _description, string memory _mainInfo,
        string memory _additionalInfo, uint256 _startTime, uint256 _endTime,
        uint256 _adminFeePercentage, uint256 _maxWinners, bool _useQuadraticDistribution,
        bool _useCustomDistribution, string memory _customDistributionData,
        address _payoutToken, address _feeToken
    ) external payable;
    
    function addProjectToCampaign(uint256 _campaignId, uint256 _projectId, address _feeToken) external payable;
    function approveProject(uint256 _campaignId, uint256 _projectId) external;
    function vote(uint256 _campaignId, uint256 _projectId, address _token, uint256 _amount, bytes32 _bypassCode) external;
    function voteWithCelo(uint256 _campaignId, uint256 _projectId, bytes32 _bypassCode) external payable;
    function distributeFunds(uint256 _campaignId) external;
}

/**
 * @title SovSeasBridge V2
 * @dev Enhanced bridge contract that integrates SovereignSeasV4 with Good Dollar functionality
 * Manages Good Dollar pools for campaigns and handles distribution
 */
contract SovSeasBridge is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Core contracts
    ISovereignSeasV4 public sovSeasContract;
    ISuperGoodDollar public goodDollar;
    IDirectPaymentsFactory public directPaymentsFactory;
    
    // Celo mainnet addresses
    address public constant GOOD_DOLLAR_TOKEN = 0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A;
    address public constant DIRECT_PAYMENTS_FACTORY = 0xb1C7F09156d04BFf6F412447A73a0F72929b6ea4;
    
    // Campaign pool mappings
    mapping(uint256 => CampaignGoodDollarPool) public campaignPools;
    mapping(uint256 => address) public campaignToPoolAddress;
    mapping(address => uint256) public poolToCampaignId;
    mapping(uint256 => address[]) public campaignMembers;
    mapping(uint256 => mapping(address => bool)) public isCampaignMember;
    
    // Good Dollar settings
    uint256 public defaultPoolSize = 1000 * 1e18; // 1,000 G$
    uint256 public projectCreationReward = 50 * 1e18; // 50 G$
    uint256 public membershipReward = 25 * 1e18; // 25 G$ for joining campaign
    uint256 public distributionReward = 10 * 1e18; // 10 G$ base reward
    
    // Pool management
    uint256 public nextPoolId = 1;
    uint32 public managerFeeBps = 500; // 5%
    
    struct CampaignGoodDollarPool {
        uint256 campaignId;
        uint256 poolId;
        address poolAddress;
        uint256 totalAmount;
        uint256 distributedAmount;
        uint256 memberCount;
        bool isActive;
        bool hasCustomDistribution;
        uint256 createdAt;
        string projectId;
        string ipfs;
        mapping(address => uint256) memberRewards;
        mapping(address => bool) hasReceivedReward;
    }
    
    struct PoolCreationParams {
        uint256 campaignId;
        uint256 poolAmount;
        string projectId;
        string ipfs;
        uint256 maxMembersPerMonth;
        uint256 maxMemberRewardPerMonth;
        uint256 maxMemberRewardPerDay;
    }
    
    struct DistributionParams {
        uint256 campaignId;
        address[] members;
        uint256[] amounts;
        string[] eventUris;
        bool useVoteWeighting;
        bool equalDistribution;
    }

    // Events
    event SovSeasContractUpdated(address indexed oldContract, address indexed newContract);
    event GoodDollarPoolCreated(uint256 indexed campaignId, address indexed poolAddress, uint256 amount);
    event MemberAddedToPool(uint256 indexed campaignId, address indexed member, uint256 reward);
    event MemberRemovedFromPool(uint256 indexed campaignId, address indexed member);
    event GoodDollarDistributed(uint256 indexed campaignId, address indexed recipient, uint256 amount);
    event PoolDistributionCompleted(uint256 indexed campaignId, uint256 totalDistributed, uint256 recipientCount);
    event ProjectCreationRewarded(address indexed creator, uint256 amount);
    event PoolSettingsUpdated(uint256 defaultPoolSize, uint256 projectReward, uint256 membershipReward);
    event EmergencyWithdraw(address indexed token, uint256 amount, address indexed recipient);
    
    // Modifiers
    modifier onlySovSeasAdmin(uint256 _campaignId) {
        require(
            sovSeasContract.isCampaignAdmin(_campaignId, msg.sender) || 
            owner() == msg.sender,
            "Not authorized for this campaign"
        );
        _;
    }
    
    modifier validCampaign(uint256 _campaignId) {
        require(_campaignId < sovSeasContract.getCampaignCount(), "Invalid campaign ID");
        _;
    }
    
    modifier validProject(uint256 _projectId) {
        require(_projectId < sovSeasContract.getProjectCount(), "Invalid project ID");
        _;
    }

    constructor(
        address _sovSeasContract,
        address _goodDollarToken,
        address _directPaymentsFactory
    ) Ownable(msg.sender) {
        require(_sovSeasContract != address(0), "Invalid SovSeas contract");
        require(_goodDollarToken != address(0), "Invalid Good Dollar token");
        require(_directPaymentsFactory != address(0), "Invalid factory");
        
        sovSeasContract = ISovereignSeasV4(_sovSeasContract);
        goodDollar = ISuperGoodDollar(_goodDollarToken);
        directPaymentsFactory = IDirectPaymentsFactory(_directPaymentsFactory);
        
        // Approve Good Dollar for transfers
        goodDollar.approve(address(directPaymentsFactory), type(uint256).max);
    }

    // =============================================================================
    // SOVSEAS PROXY FUNCTIONS - All original functions with added Good Dollar logic
    // =============================================================================

    /**
     * @dev Create project with Good Dollar reward
     */
    function createProject(
        string memory _name,
        string memory _description,
        string memory _bioPart,
        string memory _contractInfoPart,
        string memory _additionalDataPart,
        address[] memory _contracts,
        bool _transferrable
    ) external whenNotPaused {
        // Create project in main contract
        sovSeasContract.createProject(
            _name, _description, _bioPart, _contractInfoPart,
            _additionalDataPart, _contracts, _transferrable
        );
        
        // Reward creator with Good Dollars
        if (projectCreationReward > 0 && goodDollar.balanceOf(address(this)) >= projectCreationReward) {
            goodDollar.transfer(msg.sender, projectCreationReward);
            emit ProjectCreationRewarded(msg.sender, projectCreationReward);
        }
    }

    /**
     * @dev Create campaign with automatic Good Dollar pool
     */
    function createCampaign(
        string memory _name,
        string memory _description,
        string memory _mainInfo,
        string memory _additionalInfo,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _adminFeePercentage,
        uint256 _maxWinners,
        bool _useQuadraticDistribution,
        bool _useCustomDistribution,
        string memory _customDistributionData,
        address _payoutToken,
        address _feeToken,
        uint256 _goodDollarPoolAmount,
        string memory _poolProjectId,
        string memory _poolIpfs
    ) external payable whenNotPaused {
        // Get campaign count before creation
        uint256 campaignId = sovSeasContract.getCampaignCount();
        
        // Check if user is super admin
        bool isSuperAdmin = sovSeasContract.superAdmins(msg.sender);
        
        // Validate and collect fee if needed
        uint256 requiredFee = sovSeasContract.campaignCreationFee();
        if (requiredFee > 0 && !isSuperAdmin) {
            require(msg.value >= requiredFee, "Insufficient CELO sent for campaign creation fee");
            // Validate bridge has sufficient balance
            _validateBridgeBalance(requiredFee);
            // Refund excess CELO
            _refundExcessCelo(requiredFee);
        }
        
        // Create campaign in main contract with exact fee amount
        uint256 feeToSend = (requiredFee > 0 && !isSuperAdmin) ? requiredFee : 0;
        
        // Log fee information for debugging
        emit GoodDollarPoolCreated(campaignId, address(0), feeToSend);
        
        // Forward the exact fee amount to the main contract
        sovSeasContract.createCampaign{value: feeToSend}(
            _name, _description, _mainInfo, _additionalInfo,
            _startTime, _endTime, _adminFeePercentage, _maxWinners,
            _useQuadraticDistribution, _useCustomDistribution,
            _customDistributionData, _payoutToken, _feeToken
        );
        
        // Create Good Dollar pool
        uint256 poolAmount = _goodDollarPoolAmount > 0 ? _goodDollarPoolAmount : defaultPoolSize;
        _createGoodDollarPool(campaignId, poolAmount, _poolProjectId, _poolIpfs);
    }

    /**
     * @dev Add project to campaign and Good Dollar pool
     */
    function addProjectToCampaign(
        uint256 _campaignId,
        uint256 _projectId,
        address _feeToken
    ) external payable validCampaign(_campaignId) validProject(_projectId) whenNotPaused {
        // Check if user is super admin
        bool isSuperAdmin = sovSeasContract.superAdmins(msg.sender);
        
        // Validate and collect fee if needed
        uint256 requiredFee = sovSeasContract.projectAdditionFee();
        if (requiredFee > 0 && !isSuperAdmin) {
            require(msg.value >= requiredFee, "Insufficient CELO sent for project addition fee");
            // Refund excess CELO
            _refundExcessCelo(requiredFee);
        }
        
        // Add to main contract with exact fee amount
        uint256 feeToSend = (requiredFee > 0 && !isSuperAdmin) ? requiredFee : 0;
        
        // Forward the exact fee amount to the main contract
        sovSeasContract.addProjectToCampaign{value: feeToSend}(_campaignId, _projectId, _feeToken);
        
        // Get project owner
        (, address projectOwner,,,,,,) = sovSeasContract.getProject(_projectId);
        
        // Add to Good Dollar pool as member
        _addMemberToPool(_campaignId, projectOwner);
    }

    /**
     * @dev Approve project and ensure pool membership
     */
    function approveProject(uint256 _campaignId, uint256 _projectId) 
        external 
        onlySovSeasAdmin(_campaignId) 
        validCampaign(_campaignId) 
        validProject(_projectId) 
    {
        // Approve in main contract
        sovSeasContract.approveProject(_campaignId, _projectId);
        
        // Ensure project owner is in Good Dollar pool
        (, address projectOwner,,,,,,) = sovSeasContract.getProject(_projectId);
        
        if (!isCampaignMember[_campaignId][projectOwner]) {
            _addMemberToPool(_campaignId, projectOwner);
        }
    }

    /**
     * @dev Vote with token delegation
     */
    function vote(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount,
        bytes32 _bypassCode
    ) external payable validCampaign(_campaignId) validProject(_projectId) {
        // Transfer tokens to this contract first
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        // Approve main contract to spend
        IERC20(_token).approve(address(sovSeasContract), _amount);
        
        // Vote in main contract
        sovSeasContract.vote(_campaignId, _projectId, _token, _amount, _bypassCode);
    }

    /**
     * @dev Vote with CELO
     */
    function voteWithCelo(
        uint256 _campaignId,
        uint256 _projectId,
        bytes32 _bypassCode
    ) external payable validCampaign(_campaignId) validProject(_projectId) {
        // Forward CELO to main contract
        sovSeasContract.voteWithCelo{value: msg.value}(_campaignId, _projectId, _bypassCode);
    }

    /**
     * @dev Enhanced fund distribution with Good Dollar rewards
     */
    function distributeFunds(uint256 _campaignId) 
        external 
        onlySovSeasAdmin(_campaignId) 
        validCampaign(_campaignId) 
        nonReentrant 
    {
        // Distribute main campaign funds
        sovSeasContract.distributeFunds(_campaignId);
        
        // Distribute Good Dollar pool rewards
        _distributeGoodDollarRewards(_campaignId);
    }

    // =============================================================================
    // GOOD DOLLAR POOL MANAGEMENT
    // =============================================================================

    /**
     * @dev Create Good Dollar pool for campaign
     */
    function _createGoodDollarPool(
        uint256 _campaignId,
        uint256 _poolAmount,
        string memory _projectId,
        string memory _ipfs
    ) internal {
        require(_poolAmount > 0, "Pool amount must be positive");
        require(campaignToPoolAddress[_campaignId] == address(0), "Pool already exists");
        
        // Create pool settings
        IDirectPaymentsFactory.PoolSettings memory settings = IDirectPaymentsFactory.PoolSettings({
            nftType: uint32(_campaignId + 1000),
            validEvents: new uint16[](3),
            rewardPerEvent: new uint128[](3),
            manager: address(this),
            membersValidator: address(0),
            uniquenessValidator: address(0),
            rewardToken: GOOD_DOLLAR_TOKEN,
            allowRewardOverride: true
        });
        
        settings.validEvents[0] = 1; // Project membership
        settings.validEvents[1] = 2; // Vote participation
        settings.validEvents[2] = 3; // Campaign completion
        
        settings.rewardPerEvent[0] = uint128(membershipReward);
        settings.rewardPerEvent[1] = uint128(distributionReward);
        settings.rewardPerEvent[2] = uint128(distributionReward * 2);
        
        // Safety limits
        IDirectPaymentsFactory.SafetyLimits memory limits = IDirectPaymentsFactory.SafetyLimits({
            maxTotalPerMonth: _poolAmount,
            maxMemberPerMonth: _poolAmount / 10,
            maxMemberPerDay: _poolAmount / 300
        });
        
        // Create pool
        address poolAddress = directPaymentsFactory.createPool(
            _projectId,
            _ipfs,
            settings,
            limits,
            managerFeeBps
        );
        
        // Store pool data
        uint256 poolId = nextPoolId++;
        CampaignGoodDollarPool storage pool = campaignPools[_campaignId];
        pool.campaignId = _campaignId;
        pool.poolId = poolId;
        pool.poolAddress = poolAddress;
        pool.totalAmount = _poolAmount;
        pool.isActive = true;
        pool.createdAt = block.timestamp;
        pool.projectId = _projectId;
        pool.ipfs = _ipfs;
        
        campaignToPoolAddress[_campaignId] = poolAddress;
        poolToCampaignId[poolAddress] = _campaignId;
        
        // Fund the pool
        if (goodDollar.balanceOf(address(this)) >= _poolAmount) {
            goodDollar.transfer(poolAddress, _poolAmount);
        }
        
        emit GoodDollarPoolCreated(_campaignId, poolAddress, _poolAmount);
    }

    /**
     * @dev Add member to Good Dollar pool
     */
    function _addMemberToPool(uint256 _campaignId, address _member) internal {
        require(campaignToPoolAddress[_campaignId] != address(0), "Pool does not exist");
        require(!isCampaignMember[_campaignId][_member], "Already a member");
        
        address poolAddress = campaignToPoolAddress[_campaignId];
        CampaignGoodDollarPool storage pool = campaignPools[_campaignId];
        
        // Add to pool
        IDirectPaymentsPool(poolAddress).addMember(_member);
        
        // Update local tracking
        campaignMembers[_campaignId].push(_member);
        isCampaignMember[_campaignId][_member] = true;
        pool.memberCount++;
        
        // Reward for joining
        if (membershipReward > 0) {
            try IDirectPaymentsPool(poolAddress).reward(
                _member, 
                membershipReward, 
                1, 
                "Project membership reward"
            ) {
                pool.memberRewards[_member] += membershipReward;
                emit MemberAddedToPool(_campaignId, _member, membershipReward);
            } catch {
                emit MemberAddedToPool(_campaignId, _member, 0);
            }
        }
    }

    /**
     * @dev Distribute Good Dollar rewards based on campaign results
     */
    function _distributeGoodDollarRewards(uint256 _campaignId) internal {
        CampaignGoodDollarPool storage pool = campaignPools[_campaignId];
        require(pool.isActive, "Pool not active");
        require(campaignToPoolAddress[_campaignId] != address(0), "Pool does not exist");
        
        address poolAddress = campaignToPoolAddress[_campaignId];
        uint256[] memory sortedProjects = sovSeasContract.getSortedProjects(_campaignId);
        
        if (sortedProjects.length == 0) return;
        
        // Get campaign info
        (,,,,,,,uint256 maxWinners,,,,,) = sovSeasContract.getCampaign(_campaignId);
        
        uint256 winnersCount = maxWinners == 0 || maxWinners >= sortedProjects.length 
            ? sortedProjects.length : maxWinners;
        
        uint256 totalDistributed = 0;
        uint256 recipientCount = 0;
        
        // Distribute rewards to winners
        for (uint256 i = 0; i < winnersCount && i < sortedProjects.length; i++) {
            uint256 projectId = sortedProjects[i];
            
            // Get project owner
            (, address projectOwner,,,,,,) = sovSeasContract.getProject(projectId);
            
            if (isCampaignMember[_campaignId][projectOwner]) {
                // Calculate reward based on position
                uint256 positionMultiplier = winnersCount - i;
                uint256 reward = distributionReward * positionMultiplier;
                
                try IDirectPaymentsPool(poolAddress).reward(
                    projectOwner,
                    reward,
                    3,
                    string(abi.encodePacked("Position ", uintToString(i + 1), " reward"))
                ) {
                    pool.memberRewards[projectOwner] += reward;
                    pool.distributedAmount += reward;
                    totalDistributed += reward;
                    recipientCount++;
                    
                    emit GoodDollarDistributed(_campaignId, projectOwner, reward);
                } catch {
                    // Continue if reward fails
                }
            }
        }
        
        emit PoolDistributionCompleted(_campaignId, totalDistributed, recipientCount);
    }

    // =============================================================================
    // POOL ADMINISTRATION
    // =============================================================================

    /**
     * @dev Create pool manually for existing campaign
     */
    function createPoolForCampaign(
        uint256 _campaignId,
        uint256 _poolAmount,
        string memory _projectId,
        string memory _ipfs
    ) external onlySovSeasAdmin(_campaignId) validCampaign(_campaignId) {
        require(campaignToPoolAddress[_campaignId] == address(0), "Pool already exists");
        _createGoodDollarPool(_campaignId, _poolAmount, _projectId, _ipfs);
    }

    /**
     * @dev Add member manually to pool
     */
    function addMemberToPool(uint256 _campaignId, address _member) 
        external 
        onlySovSeasAdmin(_campaignId) 
        validCampaign(_campaignId) 
    {
        require(_member != address(0), "Invalid member address");
        _addMemberToPool(_campaignId, _member);
    }

    /**
     * @dev Remove member from pool
     */
    function removeMemberFromPool(uint256 _campaignId, address _member) 
        external 
        onlySovSeasAdmin(_campaignId) 
        validCampaign(_campaignId) 
    {
        require(isCampaignMember[_campaignId][_member], "Not a member");
        
        address poolAddress = campaignToPoolAddress[_campaignId];
        CampaignGoodDollarPool storage pool = campaignPools[_campaignId];
        
        // Remove from pool
        IDirectPaymentsPool(poolAddress).removeMember(_member);
        
        // Update tracking
        isCampaignMember[_campaignId][_member] = false;
        pool.memberCount--;
        
        // Remove from members array
        address[] storage members = campaignMembers[_campaignId];
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == _member) {
                members[i] = members[members.length - 1];
                members.pop();
                break;
            }
        }
        
        emit MemberRemovedFromPool(_campaignId, _member);
    }

    /**
     * @dev Custom distribution to specific members
     */
    function distributeCustomRewards(
        uint256 _campaignId,
        address[] memory _recipients,
        uint256[] memory _amounts,
        string[] memory _eventUris
    ) external onlySovSeasAdmin(_campaignId) validCampaign(_campaignId) nonReentrant {
        require(_recipients.length == _amounts.length, "Array length mismatch");
        require(_amounts.length == _eventUris.length, "Array length mismatch");
        
        address poolAddress = campaignToPoolAddress[_campaignId];
        require(poolAddress != address(0), "Pool does not exist");
        
        CampaignGoodDollarPool storage pool = campaignPools[_campaignId];
        uint256 totalDistributed = 0;
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            if (isCampaignMember[_campaignId][_recipients[i]] && _amounts[i] > 0) {
                try IDirectPaymentsPool(poolAddress).reward(
                    _recipients[i],
                    _amounts[i],
                    2,
                    _eventUris[i]
                ) {
                    pool.memberRewards[_recipients[i]] += _amounts[i];
                    pool.distributedAmount += _amounts[i];
                    totalDistributed += _amounts[i];
                    
                    emit GoodDollarDistributed(_campaignId, _recipients[i], _amounts[i]);
                } catch {
                    // Continue if reward fails
                }
            }
        }
        
        emit PoolDistributionCompleted(_campaignId, totalDistributed, _recipients.length);
    }

    // =============================================================================
    // CONFIGURATION
    // =============================================================================

    /**
     * @dev Update SovSeas contract address
     */
    function updateSovSeasContract(address _newContract) external onlyOwner {
        require(_newContract != address(0), "Invalid contract address");
        address oldContract = address(sovSeasContract);
        sovSeasContract = ISovereignSeasV4(_newContract);
        emit SovSeasContractUpdated(oldContract, _newContract);
    }

    /**
     * @dev Update Good Dollar settings
     */
    function updateGoodDollarSettings(
        uint256 _defaultPoolSize,
        uint256 _projectCreationReward,
        uint256 _membershipReward,
        uint256 _distributionReward
    ) external onlyOwner {
        defaultPoolSize = _defaultPoolSize;
        projectCreationReward = _projectCreationReward;
        membershipReward = _membershipReward;
        distributionReward = _distributionReward;
        
        emit PoolSettingsUpdated(_defaultPoolSize, _projectCreationReward, _membershipReward);
    }

    /**
     * @dev Update manager fee
     */
    function updateManagerFee(uint32 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= 1000, "Fee too high"); // Max 10%
        managerFeeBps = _newFeeBps;
    }

    /**
     * @dev Pause/unpause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================

    function getCampaignPool(uint256 _campaignId) external view returns (
        uint256 campaignId,
        uint256 poolId,
        address poolAddress,
        uint256 totalAmount,
        uint256 distributedAmount,
        uint256 memberCount,
        bool isActive,
        uint256 createdAt
    ) {
        CampaignGoodDollarPool storage pool = campaignPools[_campaignId];
        return (
            pool.campaignId,
            pool.poolId,
            pool.poolAddress,
            pool.totalAmount,
            pool.distributedAmount,
            pool.memberCount,
            pool.isActive,
            pool.createdAt
        );
    }

    function getCampaignMembers(uint256 _campaignId) external view returns (address[] memory) {
        return campaignMembers[_campaignId];
    }

    function getMemberReward(uint256 _campaignId, address _member) external view returns (uint256) {
        return campaignPools[_campaignId].memberRewards[_member];
    }

    function getPoolBalance(uint256 _campaignId) external view returns (uint256) {
        address poolAddress = campaignToPoolAddress[_campaignId];
        if (poolAddress == address(0)) return 0;
        return IDirectPaymentsPool(poolAddress).getPoolBalance();
    }

    // =============================================================================
    // PROXY VIEW FUNCTIONS - Delegate to SovSeas contract
    // =============================================================================

   function getProjectCount() external view returns (uint256) {
   return sovSeasContract.getProjectCount();
}

function getCampaignCount() external view returns (uint256) {
   return sovSeasContract.getCampaignCount();
}

function getProject(uint256 _projectId) external view returns (
   uint256 id, address owner, string memory name, string memory description,
   bool transferrable, bool active, uint256 createdAt, uint256[] memory campaignIds
) {
   return sovSeasContract.getProject(_projectId);
}

function getCampaign(uint256 _campaignId) external view returns (
   uint256 id, address admin, string memory name, string memory description,
   uint256 startTime, uint256 endTime, uint256 adminFeePercentage, uint256 maxWinners,
   bool useQuadraticDistribution, bool useCustomDistribution, address payoutToken,
   bool active, uint256 totalFunds
) {
   return sovSeasContract.getCampaign(_campaignId);
}

function isCampaignAdmin(uint256 _campaignId, address _admin) external view returns (bool) {
   return sovSeasContract.isCampaignAdmin(_campaignId, _admin);
}

function getSortedProjects(uint256 _campaignId) external view returns (uint256[] memory) {
   return sovSeasContract.getSortedProjects(_campaignId);
}

function getProjectParticipation(uint256 _campaignId, uint256 _projectId) external view returns (
   uint256 projectId, uint256 campaignId, bool approved, uint256 voteCount, uint256 fundsReceived
) {
   return sovSeasContract.projectParticipations(_campaignId, _projectId);
}

// =============================================================================
// EMERGENCY FUNCTIONS
// =============================================================================

/**
* @dev Emergency withdraw function
*/
function emergencyWithdraw(address _token, uint256 _amount, address _recipient) 
   external 
   onlyOwner 
   nonReentrant 
{
   require(_recipient != address(0), "Invalid recipient");
   
   if (_token == address(0)) {
       // Withdraw native token (CELO)
       uint256 balance = address(this).balance;
       uint256 withdrawAmount = _amount == 0 ? balance : _amount;
       require(withdrawAmount <= balance, "Insufficient balance");
       payable(_recipient).transfer(withdrawAmount);
   } else {
       // Withdraw ERC20 token
       IERC20 token = IERC20(_token);
       uint256 balance = token.balanceOf(address(this));
       uint256 withdrawAmount = _amount == 0 ? balance : _amount;
       require(withdrawAmount <= balance, "Insufficient balance");
       token.safeTransfer(_recipient, withdrawAmount);
   }
   
   emit EmergencyWithdraw(_token, _amount, _recipient);
}

/**
* @dev Emergency withdraw Good Dollar tokens
*/
function emergencyWithdrawGoodDollar(address _recipient, uint256 _amount) external onlyOwner {
    require(_recipient != address(0), "Invalid recipient");
    require(_amount > 0, "Amount must be positive");
    
    uint256 balance = goodDollar.balanceOf(address(this));
    require(balance >= _amount, "Insufficient Good Dollar balance");
    
    goodDollar.transfer(_recipient, _amount);
    emit EmergencyWithdraw(address(goodDollar), _amount, _recipient);
}

/**
* @dev Fund the bridge with CELO for fee payments
*/
function fundBridgeWithCelo() external payable {
    require(msg.value > 0, "Must send CELO to fund bridge");
    emit GoodDollarPoolCreated(0, address(0), msg.value);
}

/**
* @dev Fund the bridge with Good Dollars
*/
function fundBridge(uint256 _amount) external {
    require(_amount > 0, "Amount must be positive");
    goodDollar.transferFrom(msg.sender, address(this), _amount);
}

/**
* @dev Get bridge Good Dollar balance
*/
function getBridgeGoodDollarBalance() external view returns (uint256) {
   return goodDollar.balanceOf(address(this));
}

/**
 * @dev Fund a specific campaign pool with Good Dollars
 */
function fundCampaignPool(uint256 _campaignId, uint256 _amount) external onlyOwner {
    require(_amount > 0, "Amount must be positive");
    require(campaignToPoolAddress[_campaignId] != address(0), "Pool does not exist");
    
    address poolAddress = campaignToPoolAddress[_campaignId];
    CampaignGoodDollarPool storage pool = campaignPools[_campaignId];
    
    // Transfer Good Dollars to the pool
    goodDollar.transfer(poolAddress, _amount);
    pool.totalAmount += _amount;
    
    emit GoodDollarPoolCreated(_campaignId, poolAddress, _amount);
}

/**
 * @dev Withdraw collected fees
 */
function withdrawFees(address _recipient) external onlyOwner {
    require(_recipient != address(0), "Invalid recipient");
    
    uint256 balance = address(this).balance;
    require(balance > 0, "No fees to withdraw");
    
    payable(_recipient).transfer(balance);
    emit EmergencyWithdraw(address(0), balance, _recipient);
}

/**
 * @dev Validate that bridge has sufficient CELO balance for operations
 */
function _validateBridgeBalance(uint256 _requiredAmount) internal view {
    require(address(this).balance >= _requiredAmount, "Bridge contract has insufficient CELO balance");
}

/**
 * @dev Get bridge CELO balance
 */
function getBridgeCeloBalance() external view returns (uint256) {
    return address(this).balance;
}

/**
 * @dev Check if user can bypass fees
 */
function canBypassFees(address _user) external view returns (bool) {
    return sovSeasContract.superAdmins(_user);
}

/**
 * @dev Get required campaign creation fee
 */
function getCampaignCreationFee() external view returns (uint256) {
    return sovSeasContract.campaignCreationFee();
}

/**
 * @dev Get required project addition fee
 */
function getProjectAdditionFee() external view returns (uint256) {
    return sovSeasContract.projectAdditionFee();
}

/**
 * @dev Get comprehensive fee information
 */
function getFeeInfo(address _user) external view returns (
    uint256 campaignCreationFee,
    uint256 projectAdditionFee,
    bool canBypass,
    uint256 bridgeBalance,
    uint256 userSentValue
) {
    campaignCreationFee = sovSeasContract.campaignCreationFee();
    projectAdditionFee = sovSeasContract.projectAdditionFee();
    canBypass = sovSeasContract.superAdmins(_user);
    bridgeBalance = address(this).balance;
    userSentValue = 0; // This will be 0 in view functions
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
* @dev Convert uint to string
*/
function uintToString(uint256 _value) internal pure returns (string memory) {
   if (_value == 0) {
       return "0";
   }
   uint256 temp = _value;
   uint256 digits;
   while (temp != 0) {
       digits++;
       temp /= 10;
   }
   bytes memory buffer = new bytes(digits);
   while (_value != 0) {
       digits -= 1;
       buffer[digits] = bytes1(uint8(48 + uint256(_value % 10)));
       _value /= 10;
   }
   return string(buffer);
}

/**
* @dev Batch add members to pool
*/
function batchAddMembers(uint256 _campaignId, address[] memory _members) 
   external 
   onlySovSeasAdmin(_campaignId) 
   validCampaign(_campaignId) 
{
   for (uint256 i = 0; i < _members.length; i++) {
       if (!isCampaignMember[_campaignId][_members[i]]) {
           _addMemberToPool(_campaignId, _members[i]);
       }
   }
}

/**
* @dev Check if address is member of campaign pool
*/
function isPoolMember(uint256 _campaignId, address _member) external view returns (bool) {
   return isCampaignMember[_campaignId][_member];
}

/**
* @dev Get total rewards distributed to a member across all campaigns
*/
function getTotalMemberRewards(address _member) external view returns (uint256) {
   uint256 total = 0;
   uint256 campaignCount = sovSeasContract.getCampaignCount();
   
   for (uint256 i = 0; i < campaignCount; i++) {
       total += campaignPools[i].memberRewards[_member];
   }
   
   return total;
}

/**
* @dev Get pool statistics
*/
function getPoolStats(uint256 _campaignId) external view returns (
   uint256 totalMembers,
   uint256 totalDistributed,
   uint256 remainingBalance,
   uint256 averageRewardPerMember
) {
   CampaignGoodDollarPool storage pool = campaignPools[_campaignId];
   address poolAddress = campaignToPoolAddress[_campaignId];
   
   totalMembers = pool.memberCount;
   totalDistributed = pool.distributedAmount;
   remainingBalance = poolAddress != address(0) ? IDirectPaymentsPool(poolAddress).getPoolBalance() : 0;
   averageRewardPerMember = totalMembers > 0 ? totalDistributed / totalMembers : 0;
}

/**
* @dev Check if pool exists for campaign
*/
function hasGoodDollarPool(uint256 _campaignId) external view returns (bool) {
   return campaignToPoolAddress[_campaignId] != address(0);
}

// =============================================================================
// FALLBACK FUNCTIONS
// =============================================================================

/**
* @dev Receive function to accept CELO
*/
receive() external payable {
   // Contract can receive CELO for fee payments
}

/**
* @dev Fallback function
*/
fallback() external payable {
   revert("Function does not exist");
}

    /**
     * @dev Refund excess CELO sent by user
     */
    function _refundExcessCelo(uint256 _requiredFee) internal {
        if (msg.value > _requiredFee) {
            uint256 excess = msg.value - _requiredFee;
            payable(msg.sender).transfer(excess);
        }
    }
}