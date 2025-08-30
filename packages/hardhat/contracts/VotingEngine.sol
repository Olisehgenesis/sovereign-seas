// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IBroker {
    function swapIn(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) external returns (uint256 amountOut);
    function getAmountOut(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 amountOut);
    function exchangeProviders(uint256 index) external view returns (address);
}

contract VotingEngine is AccessControlUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;
    
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // Token Conversion System
    address public mentoTokenBroker;
    address public celoToken;
    bytes32 public bypassSecretCode;
    
    struct TokenExchangeProvider {
        address provider;
        bytes32 exchangeId;
        bool active;
    }
    
    mapping(address => TokenExchangeProvider) public tokenExchangeProviders;
    address[] public supportedTokensList;
    
    // V4 Migration Support
    mapping(uint256 => bool) public v4CampaignsMigrated;
    mapping(uint256 => address[]) public campaignUsedTokens;
    
    // Enhanced Campaign Management
    mapping(uint256 => mapping(uint256 => bool)) public projectCampaignParticipation;
    mapping(uint256 => uint256[]) public campaignProjects;
    
    // Fee Management
    uint256 public projectAdditionFee;
    uint256 public campaignFee;
    uint256 public projectFee;
    mapping(address => uint256) public collectedFees;
    
    // Structs
    struct FundPool {
        uint256 id;
        uint256 campaignId;
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool active;
        uint256 totalDonations;
        uint256 totalVotes;
        bool fundsDistributed;
        uint256 createdAt;
        uint8 officialStatus;
    }
    
    struct Vote {
        address voter;
        uint256 campaignId;
        uint256 projectId;
        address token;
        uint256 amount;
        uint256 celoEquivalent;
        uint256 timestamp;
    }
    
    struct ProjectParticipation {
        uint256 projectId;
        uint256 campaignId;
        bool approved;
        uint256 voteCount;
        uint256 fundsReceived;
        mapping(address => uint256) tokenVotes;
    }
    
    struct ProjectPool {
        uint256 id;
        uint256 projectId;
        uint256 poolId;
        uint256 allocatedAmount;
        uint256 claimedAmount;
        uint256 claimDelay;
        bool milestonesEnabled;
        uint256[] milestoneAmounts;
        uint256 currentMilestone;
        uint256 createdAt;
    }
    
    // State variables
    mapping(uint256 => FundPool) public fundPools;
    mapping(uint256 => mapping(address => mapping(uint256 => mapping(address => uint256)))) public userVotes;
    mapping(uint256 => mapping(uint256 => ProjectParticipation)) public projectParticipations;
    mapping(uint256 => mapping(address => uint256)) public totalUserVotesInCampaign;
    mapping(uint256 => ProjectPool[]) public projectPools;
    mapping(address => bool) public supportedTokens;
    mapping(address => bool) public votingEnabledTokens;
    
    uint256 public poolCount;
    uint256 public projectPoolCount;
    uint256 public defaultClaimDelay;
    
    // Events
    event PoolCreated(uint256 indexed poolId, uint256 indexed campaignId, string name);
    event DonationReceived(uint256 indexed poolId, address indexed donor, address token, uint256 amount);
    event VoteCast(uint256 indexed campaignId, uint256 indexed projectId, address indexed voter, address token, uint256 amount);
    event FundsDistributed(uint256 indexed poolId, uint256 totalAmount);
    event ProjectPoolCreated(uint256 indexed projectPoolId, uint256 indexed projectId, uint256 indexed poolId, uint256 amount);
    event FundsClaimed(uint256 indexed projectPoolId, uint256 amount);
    event TokenConversionSucceeded(address indexed fromToken, address indexed toToken, uint256 amountIn, uint256 amountOut);
    event TokenConversionFailed(uint256 indexed campaignId, address indexed token, uint256 amount);
    event ProjectAddedToCampaign(uint256 indexed campaignId, uint256 indexed projectId);
    event ProjectRemovedFromCampaign(uint256 indexed campaignId, uint256 indexed projectId);
    event V4CampaignMigrated(uint256 indexed campaignId);
    event FeeCollected(address indexed token, uint256 amount, string feeType);
    event FeeWithdrawn(address indexed token, address indexed recipient, uint256 amount);
    
    // Modifiers
    modifier poolExists(uint256 _poolId) {
        require(_poolId > 0 && _poolId <= poolCount, "Pool does not exist");
        _;
    }
    
    modifier projectPoolExists(uint256 _projectPoolId) {
        require(_projectPoolId > 0 && _projectPoolId <= projectPoolCount, "Project pool does not exist");
        _;
    }
    
    modifier onlyPoolAdmin(uint256 _poolId) {
        // This would need to be coordinated with ProjectManager
        _;
    }
    
    // Initialization
    function initialize(address _admin) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(MANAGER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        
        defaultClaimDelay = 7 days;
        projectAdditionFee = 0.01 ether;
        campaignFee = 50; // 0.5%
        projectFee = 100; // 1%
    }
    
    // Token Conversion System
    function setBrokerAddress(address _broker) external onlyRole(ADMIN_ROLE) {
        require(_broker != address(0), "Invalid broker address");
        mentoTokenBroker = _broker;
    }
    
    function setCeloToken(address _celoToken) external onlyRole(ADMIN_ROLE) {
        require(_celoToken != address(0), "Invalid CELO token address");
        celoToken = _celoToken;
    }
    
    function setBypassSecretCode(bytes32 _newCode) external onlyRole(ADMIN_ROLE) {
        bypassSecretCode = _newCode;
    }
    
    function setTokenExchangeProvider(
        address _token,
        address _provider,
        bytes32 _exchangeId
    ) external onlyRole(ADMIN_ROLE) {
        require(_token != address(0) && _provider != address(0), "Invalid addresses");
        
        tokenExchangeProviders[_token] = TokenExchangeProvider({
            provider: _provider,
            exchangeId: _exchangeId,
            active: true
        });
        
        if (!supportedTokens[_token]) {
            supportedTokens[_token] = true;
            supportedTokensList.push(_token);
        }
    }
    
    function deactivateTokenExchangeProvider(address _token) external onlyRole(ADMIN_ROLE) {
        TokenExchangeProvider storage tokenProvider = tokenExchangeProviders[_token];
        tokenProvider.active = false;
    }
    
    function convertTokens(
        address _fromToken, 
        address _toToken, 
        uint256 _amount
    ) internal returns (uint256) {
        if (_fromToken == _toToken) return _amount;
        
        TokenExchangeProvider storage provider = tokenExchangeProviders[_fromToken];
        require(provider.active, "No active exchange provider for token");
        
        uint256 expectedAmountOut = IBroker(mentoTokenBroker).getAmountOut(
            provider.provider, 
            provider.exchangeId, 
            _fromToken, 
            _toToken, 
            _amount
        );
        uint256 minAmountOut = expectedAmountOut * 995 / 1000;
        
        if (IERC20(_fromToken).balanceOf(address(this)) < _amount) {
            IERC20(_fromToken).safeTransferFrom(_msgSender(), address(this), _amount);
        }
        
        uint256 receivedAmount = IBroker(mentoTokenBroker).swapIn(
            provider.provider, 
            provider.exchangeId, 
            _fromToken, 
            _toToken, 
            _amount, 
            minAmountOut
        );
        emit TokenConversionSucceeded(_fromToken, _toToken, _amount, receivedAmount);
        return receivedAmount;
    }
    
    function convertTokensExternal(
        address _fromToken, 
        address _toToken, 
        uint256 _amount
    ) external returns (uint256) {
        require(_msgSender() == address(this), "Unauthorized");
        return convertTokens(_fromToken, _toToken, _amount);
    }
    
    function adminForceConvertTokens(
        address _fromToken, 
        address _toToken, 
        uint256 _amount
    ) external onlyRole(ADMIN_ROLE) nonReentrant returns (uint256) {
        require(
            supportedTokens[_fromToken] && supportedTokens[_toToken] && _amount > 0, 
            "Invalid conversion parameters"
        );
        require(
            IERC20(_fromToken).balanceOf(address(this)) >= _amount, 
            "Insufficient token balance"
        );
        
        uint256 beforeBalance = IERC20(_toToken).balanceOf(address(this));
        uint256 convertedAmount = convertTokens(_fromToken, _toToken, _amount);
        uint256 afterBalance = IERC20(_toToken).balanceOf(address(this));
        
        require(afterBalance >= beforeBalance, "Conversion verification failed");
        emit TokenConversionSucceeded(_fromToken, _toToken, _amount, convertedAmount);
        return convertedAmount;
    }
    
    // V4 Migration Functions
    function migrateV4Campaign(uint256 _campaignId) external onlyRole(ADMIN_ROLE) {
        require(!v4CampaignsMigrated[_campaignId], "Campaign already migrated");
        v4CampaignsMigrated[_campaignId] = true;
        emit V4CampaignMigrated(_campaignId);
    }
    
    function migrateV4CampaignFull(
        uint256 _campaignId,
        address[] memory _participatingProjects,
        address[] memory _votedTokens
    ) external onlyRole(ADMIN_ROLE) {
        require(!v4CampaignsMigrated[_campaignId], "Campaign already migrated");
        
        v4CampaignsMigrated[_campaignId] = true;
        campaignProjects[_campaignId] = _participatingProjects;
        campaignUsedTokens[_campaignId] = _votedTokens;
        
        for (uint256 i = 0; i < _participatingProjects.length; i++) {
            projectCampaignParticipation[_campaignId][i] = true;
        }
        
        emit V4CampaignMigrated(_campaignId);
    }
    
    function batchMigrateV4Campaigns(uint256[] memory _campaignIds) external onlyRole(ADMIN_ROLE) {
        for (uint256 i = 0; i < _campaignIds.length; i++) {
            if (!v4CampaignsMigrated[_campaignIds[i]]) {
                v4CampaignsMigrated[_campaignIds[i]] = true;
                emit V4CampaignMigrated(_campaignIds[i]);
            }
        }
    }
    
    function getV4MigrationData(uint256 _campaignId) external view returns (
        bool migrated,
        address[] memory participatingProjects,
        address[] memory votedTokens
    ) {
        return (
            v4CampaignsMigrated[_campaignId],
            campaignProjects[_campaignId],
            campaignUsedTokens[_campaignId]
        );
    }
    
    function migrateV4VotesToPools(uint256 _campaignId) external onlyRole(ADMIN_ROLE) {
        require(v4CampaignsMigrated[_campaignId], "Campaign not migrated");
        // Implementation would depend on specific V4 vote structure
    }
    
    // Advanced Campaign Management
    function addProjectToCampaign(
        uint256 _campaignId, 
        uint256 _projectId, 
        address _feeToken
    ) external payable {
        require(
            !projectCampaignParticipation[_campaignId][_projectId], 
            "Project already in campaign"
        );
        
        // Validate fee payment
        if (_feeToken == address(0)) {
            require(msg.value >= projectAdditionFee, "Insufficient fee");
        } else {
            IERC20(_feeToken).safeTransferFrom(_msgSender(), address(this), projectAdditionFee);
        }
        
        projectCampaignParticipation[_campaignId][_projectId] = true;
        campaignProjects[_campaignId].push(_projectId);
        
        // Initialize participation
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        participation.projectId = _projectId;
        participation.campaignId = _campaignId;
        participation.approved = true;
        
        emit ProjectAddedToCampaign(_campaignId, _projectId);
    }
    
    function removeProjectFromCampaign(uint256 _campaignId, uint256 _projectId) external {
        require(
            projectCampaignParticipation[_campaignId][_projectId], 
            "Project not in campaign"
        );
        
        projectCampaignParticipation[_campaignId][_projectId] = false;
        
        // Remove from campaign projects array
        uint256[] storage projects = campaignProjects[_campaignId];
        for (uint256 i = 0; i < projects.length; i++) {
            if (projects[i] == _projectId) {
                projects[i] = projects[projects.length - 1];
                projects.pop();
                break;
            }
        }
        
        emit ProjectRemovedFromCampaign(_campaignId, _projectId);
    }
    
    // Advanced Fund Distribution
    function distributeFunds(uint256 _campaignId) external nonReentrant {
        require(v4CampaignsMigrated[_campaignId], "Campaign not migrated");
        
        address[] memory votedTokens = campaignUsedTokens[_campaignId];
        uint256 totalFunds = 0;
        
        // Convert all tokens to payout token (assuming CELO for now)
        for (uint256 i = 0; i < votedTokens.length; i++) {
            address token = votedTokens[i];
            uint256 balance = IERC20(token).balanceOf(address(this));
            if (balance > 0 && token != celoToken) {
                try this.convertTokensExternal(token, celoToken, balance) returns (uint256 amount) {
                    totalFunds += amount;
                } catch {
                    emit TokenConversionFailed(_campaignId, token, balance);
                }
            } else if (token == celoToken) {
                totalFunds += balance;
            }
        }
        
        // Distribute funds to participating projects
        uint256[] memory projects = campaignProjects[_campaignId];
        for (uint256 i = 0; i < projects.length; i++) {
            if (projectCampaignParticipation[_campaignId][projects[i]]) {
                ProjectParticipation storage participation = projectParticipations[_campaignId][projects[i]];
                if (participation.approved && participation.voteCount > 0) {
                    uint256 share = (totalFunds * participation.voteCount) / _getTotalVotes(_campaignId);
                    participation.fundsReceived = share;
                }
            }
        }
    }
    
    function _getTotalVotes(uint256 _campaignId) internal view returns (uint256 total) {
        uint256[] memory projects = campaignProjects[_campaignId];
        for (uint256 i = 0; i < projects.length; i++) {
            if (projectCampaignParticipation[_campaignId][projects[i]]) {
                ProjectParticipation storage participation = projectParticipations[_campaignId][projects[i]];
                if (participation.approved) {
                    total += participation.voteCount;
                }
            }
        }
    }
    
    // Fee Management
    function collectFees(address _token, uint256 _amount, string memory _feeType) external onlyRole(ADMIN_ROLE) {
        collectedFees[_token] += _amount;
        emit FeeCollected(_token, _amount, _feeType);
    }
    
    function withdrawFees(address _token, address _recipient, uint256 _amount) external onlyRole(ADMIN_ROLE) {
        require(collectedFees[_token] >= _amount, "Insufficient collected fees");
        collectedFees[_token] -= _amount;
        
        IERC20(_token).safeTransfer(_recipient, _amount);
        emit FeeWithdrawn(_token, _recipient, _amount);
    }
    
    function updateFeeAmounts(uint256 _campaignFee, uint256 _projectFee) external onlyRole(ADMIN_ROLE) {
        campaignFee = _campaignFee;
        projectFee = _projectFee;
    }
    
    function getCampaignFee() external view returns (uint256) {
        return campaignFee;
    }
    
    function getProjectFee() external view returns (uint256) {
        return projectFee;
    }
    
    // Enhanced View Functions
    function getSortedProjects(uint256 _campaignId) external view returns (uint256[] memory) {
        uint256[] memory projects = campaignProjects[_campaignId];
        uint256[] memory sortedProjects = new uint256[](projects.length);
        
        // Simple sorting by vote count (descending)
        for (uint256 i = 0; i < projects.length; i++) {
            sortedProjects[i] = projects[i];
        }
        
        // Bubble sort (simplified - in production use a more efficient algorithm)
        for (uint256 i = 0; i < sortedProjects.length; i++) {
            for (uint256 j = i + 1; j < sortedProjects.length; j++) {
                uint256 votesI = projectParticipations[_campaignId][sortedProjects[i]].voteCount;
                uint256 votesJ = projectParticipations[_campaignId][sortedProjects[j]].voteCount;
                if (votesI < votesJ) {
                    uint256 temp = sortedProjects[i];
                    sortedProjects[i] = sortedProjects[j];
                    sortedProjects[j] = temp;
                }
            }
        }
        
        return sortedProjects;
    }
    
    function getCampaignVotedTokens(uint256 _campaignId) external view returns (address[] memory) {
        return campaignUsedTokens[_campaignId];
    }
    
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokensList;
    }
    
    function getSupportedTokensCount() external view returns (uint256) {
        return supportedTokensList.length;
    }
    
    function getVotingTokensCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < supportedTokensList.length; i++) {
            if (votingEnabledTokens[supportedTokensList[i]]) {
                count++;
            }
        }
        return count;
    }
    
    function getCampaignTokenAmount(uint256 _campaignId, address _token) external view returns (uint256) {
        // This would need to track campaign-specific token amounts
        return IERC20(_token).balanceOf(address(this));
    }
    
    function getProjectCampaignIds(uint256 _projectId) external view returns (uint256[] memory) {
        // This would need to be implemented based on the data structure
        return new uint256[](0);
    }
    
    function isProjectParticipatingInCampaign(uint256 _projectId, uint256 _campaignId) external view returns (bool) {
        return projectCampaignParticipation[_campaignId][_projectId];
    }
    
    function getCampaignStats(uint256 _campaignId) external view returns (
        uint256 totalProjects,
        uint256 totalVotes,
        uint256 totalFunds,
        bool migrated,
        address[] memory votedTokens
    ) {
        uint256[] memory projects = campaignProjects[_campaignId];
        uint256 totalVotesCount = _getTotalVotes(_campaignId);
        uint256 totalFundsAmount = 0; // Would need to calculate from token balances
        
        return (
            projects.length,
            totalVotesCount,
            totalFundsAmount,
            v4CampaignsMigrated[_campaignId],
            campaignUsedTokens[_campaignId]
        );
    }
    
    function getUserVoteSummary(address _user, uint256 _campaignId) external view returns (
        uint256 totalVotes,
        uint256 totalProjects,
        address[] memory tokensUsed,
        uint256[] memory amounts
    ) {
        // Implementation would depend on specific vote tracking
        return (0, 0, new address[](0), new uint256[](0));
    }
    
    function getProjectVoteBreakdown(uint256 _campaignId, uint256 _projectId) external view returns (
        uint256 totalVotes,
        uint256 fundsReceived,
        bool approved,
        address[] memory tokens,
        uint256[] memory amounts
    ) {
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        
        // This is a simplified version - would need more complex implementation
        return (
            participation.voteCount,
            participation.fundsReceived,
            participation.approved,
            new address[](0),
            new uint256[](0)
        );
    }
    
    // Pool Management Functions
    function createPool(
        uint256 _campaignId,
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) external whenNotPaused returns (uint256) {
        require(_startTime > block.timestamp, "Start time must be in the future");
        require(_endTime > _startTime, "End time must be after start time");
        
        poolCount++;
        uint256 poolId = poolCount;
        
        fundPools[poolId] = FundPool({
            id: poolId,
            campaignId: _campaignId,
            name: _name,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            active: true,
            totalDonations: 0,
            totalVotes: 0,
            fundsDistributed: false,
            createdAt: block.timestamp,
            officialStatus: 0
        });
        
        emit PoolCreated(poolId, _campaignId, _name);
        return poolId;
    }
    
    // Donation Functions
    function donate(
        uint256 _poolId,
        address _token,
        uint256 _amount
    ) external nonReentrant whenNotPaused poolExists(_poolId) {
        require(supportedTokens[_token], "Token not supported");
        require(_amount > 0, "Amount must be greater than 0");
        require(fundPools[_poolId].active, "Pool is not active");
        require(block.timestamp >= fundPools[_poolId].startTime, "Pool not started yet");
        require(block.timestamp <= fundPools[_poolId].endTime, "Pool ended");
        
        FundPool storage pool = fundPools[_poolId];
        
        // Transfer tokens from user to contract
        IERC20(_token).safeTransferFrom(_msgSender(), address(this), _amount);
        
        // Update pool state
        pool.totalDonations += _amount;
        
        emit DonationReceived(_poolId, _msgSender(), _token, _amount);
    }
    
    // Voting Functions
    function vote(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount
    ) external nonReentrant whenNotPaused {
        require(votingEnabledTokens[_token], "Token not enabled for voting");
        require(_amount > 0, "Amount must be greater than 0");
        require(supportedTokens[_token], "Token not supported");
        
        // Check if user has sufficient balance
        uint256 userBalance = IERC20(_token).balanceOf(_msgSender());
        require(userBalance >= _amount, "Insufficient token balance");
        
        // Transfer tokens from user to contract
        IERC20(_token).safeTransferFrom(_msgSender(), address(this), _amount);
        
        // Update vote tracking
        userVotes[_campaignId][_msgSender()][_projectId][_token] += _amount;
        totalUserVotesInCampaign[_campaignId][_msgSender()] += _amount;
        
        // Update project participation
        if (!projectParticipations[_campaignId][_projectId].approved) {
            projectParticipations[_campaignId][_projectId].approved = true;
        }
        projectParticipations[_campaignId][_projectId].voteCount += _amount;
        projectParticipations[_campaignId][_projectId].tokenVotes[_token] += _amount;
        
        emit VoteCast(_campaignId, _projectId, _msgSender(), _token, _amount);
    }
    
    function voteV4(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount,
        bytes32 _bypassCode
    ) external nonReentrant whenNotPaused {
        // V4 compatibility voting
        vote(_campaignId, _projectId, _token, _amount);
    }
    
    function voteWithCelo(
        uint256 _campaignId,
        uint256 _projectId,
        bytes32 _bypassCode
    ) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "Must send CELO");
        require(votingEnabledTokens[address(0)], "CELO voting not enabled");
        
        // Handle CELO voting (address(0) represents CELO)
        userVotes[_campaignId][_msgSender()][_projectId][address(0)] += msg.value;
        totalUserVotesInCampaign[_campaignId][_msgSender()] += msg.value;
        
        if (!projectParticipations[_campaignId][_projectId].approved) {
            projectParticipations[_campaignId][_projectId].approved = true;
        }
        projectParticipations[_campaignId][_projectId].voteCount += msg.value;
        projectParticipations[_campaignId][_projectId].tokenVotes[address(0)] += msg.value;
        
        emit VoteCast(_campaignId, _projectId, _msgSender(), address(0), msg.value);
    }
    
    // Fund Distribution Functions
    function distributeCampaignFunds(uint256 _poolId) external whenNotPaused poolExists(_poolId) {
        FundPool storage pool = fundPools[_poolId];
        require(pool.active, "Pool is not active");
        require(block.timestamp >= pool.endTime, "Pool has not ended yet");
        require(!pool.fundsDistributed, "Funds already distributed");
        
        // Mark funds as distributed
        pool.fundsDistributed = true;
        
        emit FundsDistributed(_poolId, pool.totalDonations);
    }
    
    function allocateFundsToProject(
        uint256 _poolId,
        uint256 _projectId,
        uint256 _amount
    ) external whenNotPaused poolExists(_poolId) {
        require(_amount > 0, "Amount must be greater than 0");
        
        projectPoolCount++;
        uint256 projectPoolId = projectPoolCount;
        
        ProjectPool memory newProjectPool = ProjectPool({
            id: projectPoolId,
            projectId: _projectId,
            poolId: _poolId,
            allocatedAmount: _amount,
            claimedAmount: 0,
            claimDelay: defaultClaimDelay,
            milestonesEnabled: false,
            milestoneAmounts: new uint256[](0),
            currentMilestone: 0,
            createdAt: block.timestamp
        });
        
        projectPools[_projectId].push(newProjectPool);
        
        emit ProjectPoolCreated(projectPoolId, _projectId, _poolId, _amount);
    }
    
    function claimProjectPoolFunds(uint256 _projectPoolId) external nonReentrant whenNotPaused projectPoolExists(_projectPoolId) {
        // This would need to be coordinated with ProjectManager to verify project ownership
        // For now, we'll implement a basic claiming mechanism
        
        emit FundsClaimed(_projectPoolId, 0);
    }
    
    // Enhanced Fund Pool System Functions
    function setPoolClaimDelay(uint256 _newDelay) external onlyRole(ADMIN_ROLE) {
        defaultClaimDelay = _newDelay;
    }
    
    function enablePoolMilestones(
        uint256 _projectPoolId,
        uint256[] memory _milestoneAmounts
    ) external onlyRole(MANAGER_ROLE) {
        require(_projectPoolId > 0 && _projectPoolId <= projectPoolCount, "Invalid project pool");
        require(_milestoneAmounts.length > 0, "Must have at least one milestone");
        
        ProjectPool storage projectPool = projectPools[_projectPoolId];
        projectPool.milestonesEnabled = true;
        projectPool.milestoneAmounts = _milestoneAmounts;
        projectPool.currentMilestone = 0;
    }
    
    function getPoolProjectPools(uint256 _poolId) external view returns (uint256[] memory) {
        // This would need to be implemented based on the data structure
        return new uint256[](0);
    }
    
    function getProjectProjectPools(uint256 _projectId) external view returns (uint256[] memory) {
        // This would need to be implemented based on the data structure
        return new uint256[](0);
    }
    
    function getProjectPoolClaimableAmount(uint256 _projectPoolId) external view returns (uint256) {
        require(_projectPoolId > 0 && _projectPoolId <= projectPoolCount, "Invalid project pool");
        
        ProjectPool storage projectPool = projectPools[_projectPoolId];
        if (projectPool.milestonesEnabled) {
            if (projectPool.currentMilestone < projectPool.milestoneAmounts.length) {
                return projectPool.milestoneAmounts[projectPool.currentMilestone];
            }
            return 0;
        }
        
        return projectPool.allocatedAmount - projectPool.claimedAmount;
    }
    
    // View Functions
    function getPool(uint256 _poolId) external view poolExists(_poolId) returns (
        uint256 id,
        uint256 campaignId,
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool active,
        uint256 totalDonations,
        uint256 totalVotes,
        bool fundsDistributed,
        uint256 createdAt,
        uint8 officialStatus
    ) {
        FundPool storage pool = fundPools[_poolId];
        return (
            pool.id,
            pool.campaignId,
            pool.name,
            pool.description,
            pool.startTime,
            pool.endTime,
            pool.active,
            pool.totalDonations,
            pool.totalVotes,
            pool.fundsDistributed,
            pool.createdAt,
            pool.officialStatus
        );
    }
    
    function getUserVoteHistory(address _user) external view returns (Vote[] memory) {
        // This would need to be implemented with proper data structures
        return new Vote[](0);
    }
    
    function getCampaignTokenBalance(uint256 _campaignId, address _token) external view returns (uint256) {
        // This would need to be coordinated with Treasury contract
        return 0;
    }
    
    function getProjectParticipation(uint256 _campaignId, uint256 _projectId) external view returns (
        bool approved,
        uint256 voteCount,
        uint256 fundsReceived
    ) {
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        return (
            participation.approved,
            participation.voteCount,
            participation.fundsReceived
        );
    }
    
    function getProjectPoolInfo(uint256 _projectPoolId) external view projectPoolExists(_projectPoolId) returns (
        uint256 id,
        uint256 projectId,
        uint256 poolId,
        uint256 allocatedAmount,
        uint256 claimedAmount,
        uint256 claimDelay,
        bool milestonesEnabled,
        uint256 currentMilestone,
        uint256 createdAt
    ) {
        // This would need to be implemented with proper data structures
        return (0, 0, 0, 0, 0, 0, false, 0, 0);
    }
    
    // Admin Functions
    function setTokenSupport(address _token, bool _supported) external onlyRole(MANAGER_ROLE) whenNotPaused {
        supportedTokens[_token] = _supported;
    }
    
    function setTokenVoting(address _token, bool _enabled) external onlyRole(MANAGER_ROLE) whenNotPaused {
        votingEnabledTokens[_token] = _enabled;
    }
    
    function getPoolCount() external view returns (uint256) {
        return poolCount;
    }
    
    function getProjectPoolCount() external view returns (uint256) {
        return projectPoolCount;
    }
    
    // UUPS Upgrade Functions
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
    
    // Emergency Functions
    function emergencyPause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
    }
    
    function emergencyUnpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
    }
    
    // Receive function for CELO donations
    receive() external payable {
        // Handle CELO donations
    }
    
    // Utility Functions
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        else if (x <= 3) return 1;
        else if (x >= 2**255) return 2**127 - 1;
        
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
    
    function getTokenToCeloEquivalent(address _token, uint256 _amount) public view returns (uint256) {
        if (_token == celoToken) return _amount;
        
        TokenExchangeProvider storage provider = tokenExchangeProviders[_token];
        if (!provider.active) return 0;
        
        try IBroker(mentoTokenBroker).getAmountOut(
            provider.provider, 
            provider.exchangeId, 
            _token, 
            celoToken, 
            _amount
        ) returns (uint256 amountOut) {
            return amountOut;
        } catch {
            return 0;
        }
    }
}
