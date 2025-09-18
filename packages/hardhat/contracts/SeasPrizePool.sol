// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface ISovereignSeasV4 {
    function isCampaignAdmin(uint256 _campaignId, address _admin) external view returns (bool);
    function campaigns(uint256 _campaignId) external view returns (
        uint256 id,
        address admin,
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 adminFeePercentage,
        uint256 maxWinners,
        bool useQuadraticDistribution,
        bool useCustomDistribution,
        address payoutToken,
        bool active,
        uint256 totalFunds
    );
    function getSortedProjects(uint256 _campaignId) external view returns (uint256[] memory);
    function getProject(uint256 _projectId) external view returns (
        uint256 id,
        address owner,
        string memory name,
        string memory description,
        bool transferrable,
        bool active,
        uint256 createdAt,
        uint256[] memory campaignIds
    );
    function getParticipation(uint256 _campaignId, uint256 _projectId) external view returns (
        bool approved,
        uint256 voteCount,
        uint256 fundsReceived
    );
    function isTokenSupported(address _token) external view returns (bool);
    function superAdmins(address _admin) external view returns (bool);
    function nextCampaignId() external view returns (uint256);
}

/**
 * @title SeasPrizePool
 * @dev Enhanced prize pool contract with comprehensive error handling and super admin controls
 */
contract SeasPrizePool is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Custom errors for better gas efficiency and clarity
    error InvalidSeasContract();
    error PoolAlreadyExists(uint256 campaignId);
    error CampaignNotFound(uint256 campaignId);
    error CampaignNotActive(uint256 campaignId);
    error CampaignAlreadyEnded(uint256 campaignId);
    error NotAuthorized(address caller, uint256 poolId);
    error NotCampaignAdmin(address caller, uint256 campaignId);
    error NotSuperAdmin(address caller);
    error PoolNotFound(uint256 poolId);
    error PoolNotActive(uint256 poolId);
    error PoolIsPaused(uint256 poolId);
    error InvalidTokenForPool(address token, uint256 poolId);
    error TokenIsFrozen(address token, uint256 poolId);
    error TokenAlreadyAllowed(address token, uint256 poolId);
    error TokenNotAllowed(address token, uint256 poolId);
    error TokenHasBalance(address token, uint256 poolId);
    error InsufficientBalance(address token, uint256 available, uint256 required);
    error InvalidAmount(uint256 amount);
    error InvalidAddress(address addr);
    error ArrayLengthMismatch(uint256 length1, uint256 length2);
    error NoTokensSpecified();
    error AddressIsBlacklisted(address addr);
    error CannotDistributeYet(uint256 campaignId, uint256 currentTime, uint256 endTime);
    error RescueNotFound(bytes32 scheduleId);
    error RescueAlreadyProcessed(bytes32 scheduleId);
    error RescueNotReady(bytes32 scheduleId, uint256 currentTime, uint256 scheduledTime);
    error IncorrectETHAmount(uint256 sent, uint256 required);
    error ContractCallFailed(string reason);

    ISovereignSeasV4 public immutable seasContract;

    enum PoolType { UNIVERSAL, ERC20_SPECIFIC }

    struct Pool {
        uint256 id;
        uint256 campaignId;
        address admin;
        PoolType poolType;
        bool isActive;
        bool isPaused;
        address[] allowedTokens;
        mapping(address => uint256) balances;
        mapping(address => bool) isTokenAllowed;
        mapping(address => bool) isTokenFrozen;
        uint256 createdAt;
        string metadata;
        uint256 distributionNonce;
        uint256 totalDistributedAmount;
    }

    struct Donation {
        address donor;
        address token;
        uint256 amount;
        uint256 timestamp;
        string message;
    }

    struct ClaimRecord {
        address recipient;
        address token;
        uint256 amount;
        uint256 claimTime;
        bytes32 distributionHash;
        bool claimed;
    }

    struct Contributor {
        address contributorAddress;
        uint256 totalContributed;
        uint256 contributionCount;
        uint256 firstContributionTime;
        mapping(address => uint256) tokenContributions;
    }

    struct RescueRecord {
        address token;
        uint256 amount;
        address recipient;
        address admin;
        uint256 timestamp;
        string reason;
    }

    struct ScheduledRescue {
        uint256 poolId;
        address token;
        uint256 amount;
        address recipient;
        address initiator;
        uint256 scheduledTime;
        bool executed;
        bool cancelled;
    }

    // State variables
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => uint256) public campaignToPool;
    mapping(uint256 => address[]) public poolContributorsList;
    mapping(uint256 => mapping(address => Contributor)) public poolContributors;
    mapping(uint256 => mapping(address => bool)) public isPoolContributor;
    mapping(uint256 => Donation[]) public poolDonations;
    mapping(uint256 => mapping(address => mapping(bytes32 => bool))) public hasClaimedDistribution;
    mapping(uint256 => mapping(address => uint256)) public totalClaimedByUser;
    mapping(uint256 => mapping(address => ClaimRecord[])) public userClaimHistory;
    mapping(uint256 => RescueRecord[]) public poolRescueHistory;
    mapping(bytes32 => ScheduledRescue) public scheduledRescues;
    mapping(address => bool) public blacklistedAddresses;
    mapping(address => bool) public superAdmins;

    uint256 public nextPoolId;
    uint256 public rescueDelay = 24 hours;
    uint256 public largeRescueThreshold = 1000 * 1e18;

    // Events
    event PoolCreated(uint256 indexed poolId, uint256 indexed campaignId, address indexed admin, PoolType poolType);
    event AppreciationPoolCreated(uint256 indexed poolId, uint256 indexed campaignId, address indexed admin, PoolType poolType, string reason);
    event PoolFunded(uint256 indexed poolId, address indexed funder, address token, uint256 amount, bool isAdmin);
    event DonationMade(uint256 indexed poolId, address indexed donor, address token, uint256 amount, string message);
    event TokensRescued(uint256 indexed poolId, address token, uint256 amount, address recipient, string reason);
    event DistributionCreated(uint256 indexed poolId, bytes32 indexed distributionHash, uint256 totalAmount);
    event TokensClaimed(uint256 indexed poolId, address indexed recipient, address token, uint256 amount, bytes32 distributionHash);
    event TokenAllowed(uint256 indexed poolId, address token);
    event TokenRemoved(uint256 indexed poolId, address token);
    event TokenFrozen(uint256 indexed poolId, address token);
    event TokenUnfrozen(uint256 indexed poolId, address token);
    event PoolPaused(uint256 indexed poolId, string reason);
    event PoolUnpaused(uint256 indexed poolId);
    event RescueScheduled(bytes32 indexed scheduleId, uint256 indexed poolId, address token, uint256 amount);
    event RescueExecuted(bytes32 indexed scheduleId);
    event RescueCancelled(bytes32 indexed scheduleId);
    event SuperAdminAdded(address indexed admin);
    event SuperAdminRemoved(address indexed admin);
    event AddressBlacklisted(address indexed addr);
    event AddressUnblacklisted(address indexed addr);

    // Modifiers
    modifier onlyPoolAdmin(uint256 poolId) {
        if (!_isPoolAdmin(poolId, msg.sender)) {
            revert NotAuthorized(msg.sender, poolId);
        }
        _;
    }

    modifier onlyPoolAdminOrSuperAdmin(uint256 poolId) {
        if (!_isPoolAdmin(poolId, msg.sender) && !superAdmins[msg.sender]) {
            revert NotAuthorized(msg.sender, poolId);
        }
        _;
    }

    modifier onlySuperAdmin() {
        if (!superAdmins[msg.sender]) {
            revert NotSuperAdmin(msg.sender);
        }
        _;
    }

    modifier validPool(uint256 poolId) {
        if (poolId >= nextPoolId) {
            revert PoolNotFound(poolId);
        }
        if (!pools[poolId].isActive) {
            revert PoolNotActive(poolId);
        }
        _;
    }

    modifier notBlacklisted(address user) {
        if (blacklistedAddresses[user]) {
            revert AddressIsBlacklisted(user);
        }
        _;
    }

    modifier poolNotPaused(uint256 poolId) {
        if (pools[poolId].isPaused) {
            revert PoolIsPaused(poolId);
        }
        _;
    }

    modifier validAddress(address addr) {
        if (addr == address(0)) {
            revert InvalidAddress(addr);
        }
        _;
    }

    modifier validAmount(uint256 amount) {
        if (amount == 0) {
            revert InvalidAmount(amount);
        }
        _;
    }

    constructor(address _seasContract) Ownable(msg.sender) {
        if (_seasContract == address(0)) {
            revert InvalidSeasContract();
        }
        seasContract = ISovereignSeasV4(_seasContract);
        superAdmins[msg.sender] = true;
        emit SuperAdminAdded(msg.sender);
    }

    // Pool Creation Functions with enhanced error handling
    function createPoolUniversal(uint256 campaignId, string memory metadata) external returns (uint256) {
        // Validate campaign exists and is accessible
        if (!_campaignExists(campaignId)) {
            revert CampaignNotFound(campaignId);
        }
        
        // Check admin permissions (campaign admin OR super admin)
        if (!_hasCreatePermission(campaignId, msg.sender)) {
            revert NotCampaignAdmin(msg.sender, campaignId);
        }
        
        // Check if pool already exists
        if (campaignToPool[campaignId] != 0) {
            revert PoolAlreadyExists(campaignId);
        }
        
        uint256 poolId = nextPoolId++;
        Pool storage newPool = pools[poolId];
        
        newPool.id = poolId;
        newPool.campaignId = campaignId;
        newPool.admin = msg.sender;
        newPool.poolType = PoolType.UNIVERSAL;
        newPool.isActive = true;
        newPool.isPaused = false;
        newPool.createdAt = block.timestamp;
        newPool.metadata = metadata;
        newPool.distributionNonce = 0;
        newPool.totalDistributedAmount = 0;
        
        campaignToPool[campaignId] = poolId;
        
        emit PoolCreated(poolId, campaignId, msg.sender, PoolType.UNIVERSAL);
        return poolId;
    }

    function createPoolERC20(uint256 campaignId, address[] memory allowedTokens, string memory metadata) external returns (uint256) {
        // Validate campaign
        if (!_campaignExists(campaignId)) {
            revert CampaignNotFound(campaignId);
        }
        
        // Check admin permissions
        if (!_hasCreatePermission(campaignId, msg.sender)) {
            revert NotCampaignAdmin(msg.sender, campaignId);
        }
        
        // Check if pool already exists
        if (campaignToPool[campaignId] != 0) {
            revert PoolAlreadyExists(campaignId);
        }
        
        // Validate tokens array
        if (allowedTokens.length == 0) {
            revert NoTokensSpecified();
        }
        
        uint256 poolId = nextPoolId++;
        Pool storage newPool = pools[poolId];
        
        newPool.id = poolId;
        newPool.campaignId = campaignId;
        newPool.admin = msg.sender;
        newPool.poolType = PoolType.ERC20_SPECIFIC;
        newPool.isActive = true;
        newPool.isPaused = false;
        newPool.createdAt = block.timestamp;
        newPool.metadata = metadata;
        newPool.distributionNonce = 0;
        newPool.totalDistributedAmount = 0;
        
        // Set allowed tokens with validation
        for (uint256 i = 0; i < allowedTokens.length; i++) {
            if (allowedTokens[i] == address(0)) {
                revert InvalidAddress(allowedTokens[i]);
            }
            newPool.allowedTokens.push(allowedTokens[i]);
            newPool.isTokenAllowed[allowedTokens[i]] = true;
        }
        
        campaignToPool[campaignId] = poolId;
        
        emit PoolCreated(poolId, campaignId, msg.sender, PoolType.ERC20_SPECIFIC);
        return poolId;
    }

    // Appreciation Pool Creation (for completed campaigns)
    function createAppreciationPoolUniversal(uint256 campaignId, string memory metadata) external returns (uint256) {
        // More permissive validation for appreciation pools
        if (!_campaignExists(campaignId)) {
            revert CampaignNotFound(campaignId);
        }
        
        // Check admin permissions
        if (!_hasCreatePermission(campaignId, msg.sender)) {
            revert NotCampaignAdmin(msg.sender, campaignId);
        }
        
        // Check if pool already exists
        if (campaignToPool[campaignId] != 0) {
            revert PoolAlreadyExists(campaignId);
        }
        
        uint256 poolId = nextPoolId++;
        Pool storage newPool = pools[poolId];
        
        newPool.id = poolId;
        newPool.campaignId = campaignId;
        newPool.admin = msg.sender;
        newPool.poolType = PoolType.UNIVERSAL;
        newPool.isActive = true;
        newPool.isPaused = false;
        newPool.createdAt = block.timestamp;
        newPool.metadata = metadata;
        newPool.distributionNonce = 0;
        newPool.totalDistributedAmount = 0;
        
        campaignToPool[campaignId] = poolId;
        
        emit AppreciationPoolCreated(poolId, campaignId, msg.sender, PoolType.UNIVERSAL, metadata);
        return poolId;
    }

    function createAppreciationPoolERC20(uint256 campaignId, address[] memory allowedTokens, string memory metadata) external returns (uint256) {
        if (!_campaignExists(campaignId)) {
            revert CampaignNotFound(campaignId);
        }
        
        if (!_hasCreatePermission(campaignId, msg.sender)) {
            revert NotCampaignAdmin(msg.sender, campaignId);
        }
        
        if (campaignToPool[campaignId] != 0) {
            revert PoolAlreadyExists(campaignId);
        }
        
        if (allowedTokens.length == 0) {
            revert NoTokensSpecified();
        }
        
        uint256 poolId = nextPoolId++;
        Pool storage newPool = pools[poolId];
        
        newPool.id = poolId;
        newPool.campaignId = campaignId;
        newPool.admin = msg.sender;
        newPool.poolType = PoolType.ERC20_SPECIFIC;
        newPool.isActive = true;
        newPool.isPaused = false;
        newPool.createdAt = block.timestamp;
        newPool.metadata = metadata;
        newPool.distributionNonce = 0;
        newPool.totalDistributedAmount = 0;
        
        // Set allowed tokens
        for (uint256 i = 0; i < allowedTokens.length; i++) {
            if (allowedTokens[i] == address(0)) {
                revert InvalidAddress(allowedTokens[i]);
            }
            newPool.allowedTokens.push(allowedTokens[i]);
            newPool.isTokenAllowed[allowedTokens[i]] = true;
        }
        
        campaignToPool[campaignId] = poolId;
        
        emit AppreciationPoolCreated(poolId, campaignId, msg.sender, PoolType.ERC20_SPECIFIC, metadata);
        return poolId;
    }

    // Token Management for ERC20 Pools
    function addAllowedToken(uint256 poolId, address token) external onlyPoolAdminOrSuperAdmin(poolId) validPool(poolId) validAddress(token) {
        if (pools[poolId].poolType != PoolType.ERC20_SPECIFIC) {
            revert InvalidTokenForPool(token, poolId);
        }
        
        if (pools[poolId].isTokenAllowed[token]) {
            revert TokenAlreadyAllowed(token, poolId);
        }
        
        pools[poolId].allowedTokens.push(token);
        pools[poolId].isTokenAllowed[token] = true;
        
        emit TokenAllowed(poolId, token);
    }

    function removeAllowedToken(uint256 poolId, address token) external onlyPoolAdminOrSuperAdmin(poolId) validPool(poolId) {
        if (pools[poolId].poolType != PoolType.ERC20_SPECIFIC) {
            revert InvalidTokenForPool(token, poolId);
        }
        
        if (!pools[poolId].isTokenAllowed[token]) {
            revert TokenNotAllowed(token, poolId);
        }
        
        if (pools[poolId].balances[token] > 0) {
            revert TokenHasBalance(token, poolId);
        }
        
        pools[poolId].isTokenAllowed[token] = false;
        
        // Remove from array
        address[] storage allowedTokens = pools[poolId].allowedTokens;
        for (uint256 i = 0; i < allowedTokens.length; i++) {
            if (allowedTokens[i] == token) {
                allowedTokens[i] = allowedTokens[allowedTokens.length - 1];
                allowedTokens.pop();
                break;
            }
        }
        
        emit TokenRemoved(poolId, token);
    }

    function freezeToken(uint256 poolId, address token) external onlyPoolAdminOrSuperAdmin(poolId) validPool(poolId) {
        if (!_isTokenValidForPool(poolId, token)) {
            revert InvalidTokenForPool(token, poolId);
        }
        
        pools[poolId].isTokenFrozen[token] = true;
        emit TokenFrozen(poolId, token);
    }

    function unfreezeToken(uint256 poolId, address token) external onlyPoolAdminOrSuperAdmin(poolId) validPool(poolId) {
        pools[poolId].isTokenFrozen[token] = false;
        emit TokenUnfrozen(poolId, token);
    }

    // Funding Functions
    function fundPool(uint256 poolId, address token, uint256 amount) 
        external 
        payable 
        nonReentrant 
        onlyPoolAdminOrSuperAdmin(poolId) 
        validPool(poolId) 
        poolNotPaused(poolId) 
        validAmount(amount) 
    {
        if (!_isTokenValidForPool(poolId, token)) {
            revert InvalidTokenForPool(token, poolId);
        }
        
        if (pools[poolId].isTokenFrozen[token]) {
            revert TokenIsFrozen(token, poolId);
        }
        
        if (token == address(0)) {
            if (msg.value != amount) {
                revert IncorrectETHAmount(msg.value, amount);
            }
            pools[poolId].balances[token] += amount;
        } else {
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            pools[poolId].balances[token] += amount;
        }
        
        _recordContribution(poolId, msg.sender, token, amount);
        
        emit PoolFunded(poolId, msg.sender, token, amount, true);
    }

    function donateToPool(uint256 poolId, address token, uint256 amount, string memory message) 
        external 
        payable 
        nonReentrant 
        validPool(poolId) 
        poolNotPaused(poolId) 
        notBlacklisted(msg.sender) 
        validAmount(amount) 
    {
        if (!_isTokenValidForPool(poolId, token)) {
            revert InvalidTokenForPool(token, poolId);
        }
        
        if (pools[poolId].isTokenFrozen[token]) {
            revert TokenIsFrozen(token, poolId);
        }
        
        if (token == address(0)) {
            if (msg.value != amount) {
                revert IncorrectETHAmount(msg.value, amount);
            }
            pools[poolId].balances[token] += amount;
        } else {
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            pools[poolId].balances[token] += amount;
        }
        
        _recordContribution(poolId, msg.sender, token, amount);
        
        // Record donation
        poolDonations[poolId].push(Donation({
            donor: msg.sender,
            token: token,
            amount: amount,
            timestamp: block.timestamp,
            message: message
        }));
        
        emit DonationMade(poolId, msg.sender, token, amount, message);
    }

    // Distribution Functions with enhanced error handling
    function distribute(uint256 poolId, bool distributeInSovereignSeas) external nonReentrant onlyPoolAdminOrSuperAdmin(poolId) validPool(poolId) {
        if (!_canDistribute(poolId)) {
            (,,,,,uint256 endTime,,,,,,bool active,) = seasContract.campaigns(pools[poolId].campaignId);
            revert CannotDistributeYet(pools[poolId].campaignId, block.timestamp, endTime);
        }
        
        uint256[] memory projectIds = seasContract.getSortedProjects(pools[poolId].campaignId);
        address[] memory recipients = new address[](projectIds.length);
        
        // Get approved project owners
        uint256 validRecipients = 0;
        for (uint256 i = 0; i < projectIds.length; i++) {
            (bool approved,,) = seasContract.getParticipation(pools[poolId].campaignId, projectIds[i]);
            if (approved) {
                (, address owner,,,,,,) = seasContract.getProject(projectIds[i]);
                recipients[validRecipients] = owner;
                validRecipients++;
            }
        }
        
        // Resize recipients array
        assembly {
            mstore(recipients, validRecipients)
        }
        
        bytes32 distributionHash = _createDistributionHash(poolId);
        
        if (distributeInSovereignSeas) {
            _distributeToRecipientsQuadratic(poolId, recipients, projectIds, distributionHash);
        } else {
            // If not distributing in sovereign seas, revert
            revert ContractCallFailed("Distribution must be done in sovereign seas");
        }
        
        pools[poolId].distributionNonce++;
        emit DistributionCreated(poolId, distributionHash, _getPoolTotalValue(poolId));
    }

    function distributeManual(uint256 poolId, uint256[] memory projectIds, uint256[] memory amounts, address token) 
        external 
        nonReentrant 
        onlyPoolAdminOrSuperAdmin(poolId) 
        validPool(poolId) 
    {
        if (projectIds.length != amounts.length) {
            revert ArrayLengthMismatch(projectIds.length, amounts.length);
        }
        
        if (!_isTokenValidForPool(poolId, token)) {
            revert InvalidTokenForPool(token, poolId);
        }
        
        if (pools[poolId].balances[token] == 0) {
            revert InsufficientBalance(token, 0, 1);
        }
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        if (pools[poolId].balances[token] < totalAmount) {
            revert InsufficientBalance(token, pools[poolId].balances[token], totalAmount);
        }
        
        bytes32 distributionHash = _createDistributionHash(poolId);
        
        for (uint256 i = 0; i < projectIds.length; i++) {
            // Verify project is in campaign
            (bool approved,,) = seasContract.getParticipation(pools[poolId].campaignId, projectIds[i]);
            if (!approved) {
                continue; // Skip non-approved projects instead of reverting
            }
            
            if (amounts[i] > 0) {
                (, address owner,,,,,,) = seasContract.getProject(projectIds[i]);
                pools[poolId].balances[token] -= amounts[i];
                
                if (token == address(0)) {
                    payable(owner).transfer(amounts[i]);
                } else {
                    IERC20(token).safeTransfer(owner, amounts[i]);
                }
                
                // Record claim
                userClaimHistory[poolId][owner].push(ClaimRecord({
                    recipient: owner,
                    token: token,
                    amount: amounts[i],
                    claimTime: block.timestamp,
                    distributionHash: distributionHash,
                    claimed: true
                }));
                
                totalClaimedByUser[poolId][owner] += amounts[i];
                hasClaimedDistribution[poolId][owner][distributionHash] = true;
                
                emit TokensClaimed(poolId, owner, token, amounts[i], distributionHash);
            }
        }
        
        pools[poolId].distributionNonce++;
        emit DistributionCreated(poolId, distributionHash, totalAmount);
    }

    // Super Admin Functions
    function addSuperAdmin(address admin) external onlyOwner validAddress(admin) {
        superAdmins[admin] = true;
        emit SuperAdminAdded(admin);
    }

    function removeSuperAdmin(address admin) external onlyOwner {
        superAdmins[admin] = false;
        emit SuperAdminRemoved(admin);
    }

    function blacklistAddress(address suspect) external onlySuperAdmin validAddress(suspect) {
        blacklistedAddresses[suspect] = true;
        emit AddressBlacklisted(suspect);
    }

    function unblacklistAddress(address suspect) external onlySuperAdmin {
        blacklistedAddresses[suspect] = false;
        emit AddressUnblacklisted(suspect);
    }

    function pausePool(uint256 poolId, string memory reason) external onlyPoolAdminOrSuperAdmin(poolId) {
        pools[poolId].isPaused = true;
        emit PoolPaused(poolId, reason);
    }

    function unpausePool(uint256 poolId) external onlyPoolAdminOrSuperAdmin(poolId) {
        pools[poolId].isPaused = false;
        emit PoolUnpaused(poolId);
    }

    function setRescueDelay(uint256 newDelay) external onlyOwner {
        rescueDelay = newDelay;
    }

    function setLargeRescueThreshold(uint256 newThreshold) external onlyOwner {
        largeRescueThreshold = newThreshold;
    }

    function emergencyPause() external onlySuperAdmin {
        _pause();
    }

    function emergencyUnpause() external onlySuperAdmin {
        _unpause();
    }

    // Enhanced Token Rescue Functions
    function rescueTokens(uint256 poolId, address token, uint256 amount, address recipient, string memory reason) 
        external 
        onlyPoolAdminOrSuperAdmin(poolId) 
        validAddress(recipient)
        validAmount(amount)
    {
        uint256 balance;
        if (token == address(0)) {
            balance = address(this).balance;
            if (balance < amount) {
                revert InsufficientBalance(token, balance, amount);
            }
            payable(recipient).transfer(amount);
        } else {
            balance = IERC20(token).balanceOf(address(this));
            if (balance < amount) {
                revert InsufficientBalance(token, balance, amount);
            }
            IERC20(token).safeTransfer(recipient, amount);
        }
        
        // Record rescue
        poolRescueHistory[poolId].push(RescueRecord({
            token: token,
            amount: amount,
            recipient: recipient,
            admin: msg.sender,
            timestamp: block.timestamp,
            reason: reason
        }));
        
        emit TokensRescued(poolId, token, amount, recipient, reason);
    }

    function scheduleTokenRescue(uint256 poolId, address token, uint256 amount, address recipient) 
        external 
        onlyPoolAdminOrSuperAdmin(poolId) 
        validAddress(recipient)
        returns (bytes32 scheduleId) 
    {
        if (amount < largeRescueThreshold) {
            revert InvalidAmount(amount);
        }
        
        scheduleId = keccak256(abi.encodePacked(poolId, token, amount, recipient, block.timestamp, msg.sender));
        
        scheduledRescues[scheduleId] = ScheduledRescue({
            poolId: poolId,
            token: token,
            amount: amount,
            recipient: recipient,
            initiator: msg.sender,
            scheduledTime: block.timestamp + rescueDelay,
            executed: false,
            cancelled: false
        });
        
        emit RescueScheduled(scheduleId, poolId, token, amount);
    }
    function executeScheduledRescue(bytes32 scheduleId) external nonReentrant {
        ScheduledRescue storage rescue = scheduledRescues[scheduleId];
        
        if (rescue.initiator == address(0)) {
            revert RescueNotFound(scheduleId);
        }
        
        if (rescue.executed || rescue.cancelled) {
            revert RescueAlreadyProcessed(scheduleId);
        }
        
        if (block.timestamp < rescue.scheduledTime) {
            revert RescueNotReady(scheduleId, block.timestamp, rescue.scheduledTime);
        }
        
        if (!_isPoolAdmin(rescue.poolId, msg.sender) && !superAdmins[msg.sender]) {
            revert NotAuthorized(msg.sender, rescue.poolId);
        }
        
        rescue.executed = true;
        
        if (rescue.token == address(0)) {
            payable(rescue.recipient).transfer(rescue.amount);
        } else {
            IERC20(rescue.token).safeTransfer(rescue.recipient, rescue.amount);
        }
        
        emit RescueExecuted(scheduleId);
    }

    function cancelScheduledRescue(bytes32 scheduleId) external {
        ScheduledRescue storage rescue = scheduledRescues[scheduleId];
        
        if (rescue.initiator != msg.sender && !superAdmins[msg.sender]) {
            revert NotAuthorized(msg.sender, 0);
        }
        
        if (rescue.executed || rescue.cancelled) {
            revert RescueAlreadyProcessed(scheduleId);
        }
        
        rescue.cancelled = true;
        emit RescueCancelled(scheduleId);
    }

    // Enhanced View Functions
    function getRecipients(uint256 poolId) external view returns (address[] memory) {
        uint256[] memory projectIds = seasContract.getSortedProjects(pools[poolId].campaignId);
        address[] memory recipients = new address[](projectIds.length);
        uint256 validCount = 0;
        
        for (uint256 i = 0; i < projectIds.length; i++) {
            try seasContract.getParticipation(pools[poolId].campaignId, projectIds[i]) returns (bool approved, uint256, uint256) {
                if (approved) {
                    try seasContract.getProject(projectIds[i]) returns (uint256, address owner, string memory, string memory, bool, bool, uint256, uint256[] memory) {
                        recipients[validCount] = owner;
                        validCount++;
                    } catch {
                        // Skip if can't get project info
                        continue;
                    }
                }
            } catch {
                // Skip if can't get participation info
                continue;
            }
        }
        
        // Resize array
        assembly {
            mstore(recipients, validCount)
        }
        return recipients;
    }

    function getPoolBalance(uint256 poolId) external view returns (address[] memory tokens, uint256[] memory balances) {
        Pool storage pool = pools[poolId];
        
        if (pool.poolType == PoolType.UNIVERSAL) {
            // For universal pools, return ETH balance (simplified)
            tokens = new address[](1);
            balances = new uint256[](1);
            tokens[0] = address(0); // ETH
            balances[0] = pool.balances[address(0)];
        } else {
            tokens = pool.allowedTokens;
            balances = new uint256[](tokens.length);
            for (uint256 i = 0; i < tokens.length; i++) {
                balances[i] = pool.balances[tokens[i]];
            }
        }
    }

    function getPoolContributors(uint256 poolId) external view returns (address[] memory) {
        return poolContributorsList[poolId];
    }

    function getContributorDetails(uint256 poolId, address contributor) external view returns (
        uint256 totalContributed,
        uint256 contributionCount,
        uint256 firstContributionTime,
        address[] memory tokens,
        uint256[] memory amounts
    ) {
        Contributor storage contrib = poolContributors[poolId][contributor];
        
        totalContributed = contrib.totalContributed;
        contributionCount = contrib.contributionCount;
        firstContributionTime = contrib.firstContributionTime;
        
        // Get tokens contributed
        Pool storage pool = pools[poolId];
        if (pool.poolType == PoolType.ERC20_SPECIFIC) {
            tokens = pool.allowedTokens;
            amounts = new uint256[](tokens.length);
            for (uint256 i = 0; i < tokens.length; i++) {
                amounts[i] = contrib.tokenContributions[tokens[i]];
            }
        } else {
            tokens = new address[](1);
            amounts = new uint256[](1);
            tokens[0] = address(0);
            amounts[0] = contrib.tokenContributions[address(0)];
        }
    }

    function getUserReceivedAmount(uint256 poolId, address user) external view returns (uint256) {
        return totalClaimedByUser[poolId][user];
    }

    function getUserClaimHistory(uint256 poolId, address user) external view returns (ClaimRecord[] memory) {
        return userClaimHistory[poolId][user];
    }

    function getPoolDonations(uint256 poolId) external view returns (Donation[] memory) {
        return poolDonations[poolId];
    }

    function getRescueHistory(uint256 poolId) external view returns (RescueRecord[] memory) {
        return poolRescueHistory[poolId];
    }

    function getPoolInfo(uint256 poolId) external view returns (
        uint256 id,
        uint256 campaignId,
        address admin,
        PoolType poolType,
        bool isActive,
        bool isPaused,
        uint256 createdAt,
        string memory metadata
    ) {
        Pool storage pool = pools[poolId];
        return (
            pool.id,
            pool.campaignId,
            pool.admin,
            pool.poolType,
            pool.isActive,
            pool.isPaused,
            pool.createdAt,
            pool.metadata
        );
    }

    function getAllowedTokens(uint256 poolId) external view returns (address[] memory) {
        return pools[poolId].allowedTokens;
    }

    function isTokenAllowedInPool(uint256 poolId, address token) external view returns (bool) {
        return _isTokenValidForPool(poolId, token);
    }

    function isTokenFrozenInPool(uint256 poolId, address token) external view returns (bool) {
        return pools[poolId].isTokenFrozen[token];
    }

    function getPoolStats(uint256 poolId) external view returns (
        uint256 totalValue,
        uint256 contributorCount,
        uint256 distributedAmount,
        uint256 distributionCount
    ) {
        totalValue = _getPoolTotalValue(poolId);
        contributorCount = poolContributorsList[poolId].length;
        distributionCount = pools[poolId].distributionNonce;
        distributedAmount = _getTotalDistributedAmount(poolId);
    }

    function canUserClaimFromDistribution(uint256 poolId, address user, bytes32 distributionHash) external view returns (bool) {
        return !hasClaimedDistribution[poolId][user][distributionHash];
    }

    function getScheduledRescue(bytes32 scheduleId) external view returns (
        uint256 poolId,
        address token,
        uint256 amount,
        address recipient,
        address initiator,
        uint256 scheduledTime,
        bool executed,
        bool cancelled
    ) {
        ScheduledRescue storage rescue = scheduledRescues[scheduleId];
        return (
            rescue.poolId,
            rescue.token,
            rescue.amount,
            rescue.recipient,
            rescue.initiator,
            rescue.scheduledTime,
            rescue.executed,
            rescue.cancelled
        );
    }

    // Batch operations
    function batchFundPool(uint256 poolId, address[] memory tokens, uint256[] memory amounts) 
        external 
        payable 
        nonReentrant 
        onlyPoolAdminOrSuperAdmin(poolId) 
        validPool(poolId) 
        poolNotPaused(poolId) 
    {
        if (tokens.length != amounts.length) {
            revert ArrayLengthMismatch(tokens.length, amounts.length);
        }
        
        uint256 totalETHRequired = 0;
        for (uint256 i = 0; i < tokens.length; i++) {
            if (!_isTokenValidForPool(poolId, tokens[i])) {
                revert InvalidTokenForPool(tokens[i], poolId);
            }
            
            if (pools[poolId].isTokenFrozen[tokens[i]]) {
                revert TokenIsFrozen(tokens[i], poolId);
            }
            
            if (amounts[i] == 0) {
                revert InvalidAmount(amounts[i]);
            }
            
            if (tokens[i] == address(0)) {
                totalETHRequired += amounts[i];
            }
        }
        
        if (msg.value != totalETHRequired) {
            revert IncorrectETHAmount(msg.value, totalETHRequired);
        }
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == address(0)) {
                pools[poolId].balances[tokens[i]] += amounts[i];
            } else {
                IERC20(tokens[i]).safeTransferFrom(msg.sender, address(this), amounts[i]);
                pools[poolId].balances[tokens[i]] += amounts[i];
            }
            
            _recordContribution(poolId, msg.sender, tokens[i], amounts[i]);
            emit PoolFunded(poolId, msg.sender, tokens[i], amounts[i], true);
        }
    }

    // Pool management
    function closePool(uint256 poolId) external onlyPoolAdminOrSuperAdmin(poolId) validPool(poolId) {
        if (!_canDistribute(poolId)) {
            (,,,,,uint256 endTime,,,,,,bool active,) = seasContract.campaigns(pools[poolId].campaignId);
            revert CannotDistributeYet(pools[poolId].campaignId, block.timestamp, endTime);
        }
        
        pools[poolId].isActive = false;
    }

    function updatePoolMetadata(uint256 poolId, string memory newMetadata) external onlyPoolAdminOrSuperAdmin(poolId) validPool(poolId) {
        pools[poolId].metadata = newMetadata;
    }

    function transferPoolAdmin(uint256 poolId, address newAdmin) external onlyPoolAdminOrSuperAdmin(poolId) validPool(poolId) validAddress(newAdmin) {
        if (!_hasCreatePermission(pools[poolId].campaignId, newAdmin)) {
            revert NotCampaignAdmin(newAdmin, pools[poolId].campaignId);
        }
        
        pools[poolId].admin = newAdmin;
    }

    // Internal Functions with enhanced error handling
    function _isPoolAdmin(uint256 poolId, address user) internal view returns (bool) {
        if (poolId >= nextPoolId) return false;
        
        return pools[poolId].admin == user || 
               _hasCreatePermission(pools[poolId].campaignId, user);
    }

    // Simplified and robust campaign validation
    function _campaignExists(uint256 campaignId) internal view returns (bool) {
        try seasContract.nextCampaignId() returns (uint256 totalCampaigns) {
            return campaignId < totalCampaigns && campaignId > 0;
        } catch {
            // Fallback: try to get the campaign directly
            try seasContract.campaigns(campaignId) returns (uint256 id, address, string memory, string memory, uint256, uint256, uint256, uint256, bool, bool, address, bool, uint256) {
                return id == campaignId;
            } catch {
                return false;
            }
        }
    }

    // Better permission checking with fallbacks
    function _hasCreatePermission(uint256 campaignId, address user) internal view returns (bool) {
        // Super admins can always create pools
        if (superAdmins[user]) {
            return true;
        }
        
        // Check if user is campaign admin via Seas contract
        try seasContract.isCampaignAdmin(campaignId, user) returns (bool isAdmin) {
            return isAdmin;
        } catch {
            // Fallback: check if user is super admin in Seas contract
            try seasContract.superAdmins(user) returns (bool isSuperAdmin) {
                return isSuperAdmin;
            } catch {
                return false;
            }
        }
    }

    // Public testing functions
    function campaignExists(uint256 campaignId) external view returns (bool) {
        return _campaignExists(campaignId);
    }

    function hasCreatePermission(uint256 campaignId, address user) external view returns (bool) {
        return _hasCreatePermission(campaignId, user);
    }

    function _isTokenValidForPool(uint256 poolId, address token) internal view returns (bool) {
        if (poolId >= nextPoolId) return false;
        
        Pool storage pool = pools[poolId];
        if (pool.poolType == PoolType.UNIVERSAL) {
            return true; // Universal pools accept any token
        } else {
            return pool.isTokenAllowed[token];
        }
    }

    function _canDistribute(uint256 poolId) internal view returns (bool) {
        try seasContract.campaigns(pools[poolId].campaignId) returns (
            uint256,
            address,
            string memory,
            string memory,
            uint256,
            uint256 endTime,
            uint256,
            uint256,
            bool,
            bool,
            address,
            bool,
            uint256
        ) {
            return block.timestamp > endTime;
        } catch {
            return false;
        }
    }

    function _recordContribution(uint256 poolId, address contributor, address token, uint256 amount) internal {
        if (!isPoolContributor[poolId][contributor]) {
            poolContributorsList[poolId].push(contributor);
            isPoolContributor[poolId][contributor] = true;
            poolContributors[poolId][contributor].contributorAddress = contributor;
            poolContributors[poolId][contributor].firstContributionTime = block.timestamp;
        }
        
        Contributor storage contrib = poolContributors[poolId][contributor];
        contrib.totalContributed += amount;
        contrib.contributionCount += 1;
        contrib.tokenContributions[token] += amount;
    }

    function _createDistributionHash(uint256 poolId) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            poolId,
            pools[poolId].distributionNonce,
            block.timestamp,
            msg.sender
        ));
    }

    function _getPoolTotalValue(uint256 poolId) internal view returns (uint256) {
        uint256 total = 0;
        Pool storage pool = pools[poolId];
        
        if (pool.poolType == PoolType.ERC20_SPECIFIC) {
            for (uint256 i = 0; i < pool.allowedTokens.length; i++) {
                total += pool.balances[pool.allowedTokens[i]];
            }
        } else {
            total += pool.balances[address(0)]; // ETH balance for universal pools
        }
        
        return total;
    }

    function _getTotalDistributedAmount(uint256 poolId) internal view returns (uint256) {
        return pools[poolId].totalDistributedAmount;
    }

    function _distributeToRecipientsQuadratic(uint256 poolId, address[] memory recipients, uint256[] memory projectIds, bytes32 distributionHash) internal {
        // Simplified quadratic distribution
        uint256[] memory voteWeights = new uint256[](recipients.length);
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < recipients.length; i++) {
            try seasContract.getParticipation(pools[poolId].campaignId, projectIds[i]) returns (bool, uint256 voteCount, uint256) {
                voteWeights[i] = _sqrt(voteCount);
                totalWeight += voteWeights[i];
            } catch {
                voteWeights[i] = 0;
            }
        }
        
        if (totalWeight == 0) return;
        
        // Distribute ETH proportionally (simplified)
        uint256 totalETH = pools[poolId].balances[address(0)];
        uint256 totalDistributed = 0;
        
        for (uint256 i = 0; i < recipients.length; i++) {
            if (voteWeights[i] > 0) {
                uint256 share = (totalETH * voteWeights[i]) / totalWeight;
                if (share > 0) {
                    pools[poolId].balances[address(0)] -= share;
                    payable(recipients[i]).transfer(share);
                    totalDistributed += share;
                    
                    // Record claim
                    userClaimHistory[poolId][recipients[i]].push(ClaimRecord({
                        recipient: recipients[i],
                        token: address(0),
                        amount: share,
                        claimTime: block.timestamp,
                        distributionHash: distributionHash,
                        claimed: true
                    }));
                    
                    totalClaimedByUser[poolId][recipients[i]] += share;
                    hasClaimedDistribution[poolId][recipients[i]][distributionHash] = true;
                    
                    emit TokensClaimed(poolId, recipients[i], address(0), share, distributionHash);
                }
            }
        }
        
        // Update total distributed amount tracking
        pools[poolId].totalDistributedAmount += totalDistributed;
    }

    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }


    // Receive function to accept ETH
    receive() external payable {
        // Contract can receive ETH
    }

    // Fallback function
    fallback() external payable {
        revert ContractCallFailed("Function not found");
    }
}