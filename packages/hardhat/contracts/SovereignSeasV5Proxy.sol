// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./ProjectManager.sol";
import "./VotingEngine.sol";
import "./Treasury.sol";

contract SovereignSeasV5Proxy is 
    Initializable, 
    AccessControlUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    UUPSUpgradeable 
{
    
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // Mini Contract Addresses
    ProjectManager public projectManager;
    VotingEngine public votingEngine;
    Treasury public treasury;
    
    // Circuit Breaker State (mirrored from Treasury)
    bool public circuitBreakerActive;
    string public circuitBreakerReason;
    uint256 public circuitBreakerActivatedAt;
    
    // Events
    event MiniContractUpdated(string contractType, address oldAddress, address newAddress);
    event CircuitBreakerTriggered(string reason, uint256 timestamp);
    event CircuitBreakerReset(uint256 timestamp);
    
    // Modifiers
    modifier whenCircuitBreakerInactive() {
        require(!circuitBreakerActive, "Circuit breaker is active");
        _;
    }
    
    modifier onlyMiniContract() {
        require(
            _msgSender() == address(projectManager) ||
            _msgSender() == address(votingEngine) ||
            _msgSender() == address(treasury),
            "Only mini contracts can call this function"
        );
        _;
    }
    
    // Initialization
    function initialize(
        address _admin,
        address _projectManager,
        address _votingEngine,
        address _treasury
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(MANAGER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        
        projectManager = ProjectManager(_projectManager);
        votingEngine = VotingEngine(_votingEngine);
        treasury = Treasury(_treasury);
        
        // Initialize mini contracts
        projectManager.initialize(_admin);
        votingEngine.initialize(_admin);
        treasury.initialize(_admin);
        
        // Sync circuit breaker state
        _syncCircuitBreakerState();
    }
    
    // Mini Contract Management
    function updateProjectManager(address _newAddress) external onlyRole(ADMIN_ROLE) {
        require(_newAddress != address(0), "Invalid address");
        address oldAddress = address(projectManager);
        projectManager = ProjectManager(_newAddress);
        emit MiniContractUpdated("ProjectManager", oldAddress, _newAddress);
    }
    
    function updateVotingEngine(address _newAddress) external onlyRole(ADMIN_ROLE) {
        require(_newAddress != address(0), "Invalid address");
        address oldAddress = address(votingEngine);
        votingEngine = VotingEngine(_newAddress);
        emit MiniContractUpdated("VotingEngine", oldAddress, _newAddress);
    }
    
    function updateTreasury(address _newAddress) external onlyRole(ADMIN_ROLE) {
        require(_newAddress != address(0), "Invalid address");
        address oldAddress = address(treasury);
        treasury = Treasury(_newAddress);
        emit MiniContractUpdated("Treasury", oldAddress, _newAddress);
    }
    
    // Circuit Breaker Management (Proxy to Treasury)
    function triggerCircuitBreaker(string memory _reason) external onlyRole(EMERGENCY_ROLE) {
        treasury.triggerCircuitBreaker(_reason);
        _syncCircuitBreakerState();
        emit CircuitBreakerTriggered(_reason, block.timestamp);
    }
    
    function resetCircuitBreaker() external onlyRole(ADMIN_ROLE) {
        treasury.resetCircuitBreaker();
        _syncCircuitBreakerState();
        emit CircuitBreakerReset(block.timestamp);
    }
    
    // Emergency Functions (Proxy to Treasury)
    function emergencyPause(string memory _reason) external onlyRole(EMERGENCY_ROLE) {
        treasury.emergencyPause(_reason);
        _pause();
    }
    
    function emergencyUnpause() external onlyRole(EMERGENCY_ROLE) {
        treasury.emergencyUnpause();
        _unpause();
    }
    
    function emergencyWithdraw(
        address _token,
        uint256 _amount,
        address _recipient
    ) external onlyRole(EMERGENCY_ROLE) whenNotPaused {
        treasury.emergencyWithdraw(_token, _amount, _recipient);
    }
    
    // Project Management Functions (Proxy to ProjectManager)
    function createProjectV6(
        string memory _name,
        string memory _description,
        string memory _bio,
        string memory _contractInfo,
        string memory _additionalData,
        address[] memory _contracts,
        bool _transferrable
    ) external whenNotPaused whenCircuitBreakerInactive returns (uint256) {
        return projectManager.createProjectV6(
            _name, _description, _bio, _contractInfo, 
            _additionalData, _contracts, _transferrable
        );
    }
    
    function updateProject(
        uint256 _projectId,
        string memory _name,
        string memory _description,
        string memory _bio,
        string memory _contractInfo,
        string memory _additionalData,
        address[] memory _contracts,
        bool _transferrable
    ) external whenNotPaused whenCircuitBreakerInactive {
        projectManager.updateProject(
            _projectId, _name, _description, _bio,
            _contractInfo, _additionalData, _contracts, _transferrable
        );
    }
    
    function transferProjectOwnership(uint256 _projectId, address _newOwner) 
        external whenNotPaused whenCircuitBreakerInactive {
        projectManager.transferProjectOwnership(_projectId, _newOwner);
    }
    
    // Campaign Management Functions (Proxy to ProjectManager)
    function createCampaignV6(
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        string memory _mainInfo,
        string memory _additionalInfo,
        uint256 _adminFeePercentage,
        uint256 _maxWinners,
        bool _useQuadraticDistribution,
        bool _useCustomDistribution,
        string memory _customDistributionData,
        address _payoutToken
    ) external whenNotPaused whenCircuitBreakerInactive returns (uint256) {
        return projectManager.createCampaignV6(
            _name, _description, _startTime, _endTime,
            _mainInfo, _additionalInfo, _adminFeePercentage,
            _maxWinners, _useQuadraticDistribution,
            _useCustomDistribution, _customDistributionData, _payoutToken
        );
    }
    
    function updateCampaign(
        uint256 _campaignId,
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        string memory _mainInfo,
        string memory _additionalInfo,
        uint256 _adminFeePercentage,
        uint256 _maxWinners,
        bool _useQuadraticDistribution,
        bool _useCustomDistribution,
        string memory _customDistributionData,
        address _payoutToken
    ) external whenNotPaused whenCircuitBreakerInactive {
        projectManager.updateCampaign(
            _campaignId, _name, _description, _startTime, _endTime,
            _mainInfo, _additionalInfo, _adminFeePercentage,
            _maxWinners, _useQuadraticDistribution,
            _useCustomDistribution, _customDistributionData, _payoutToken
        );
    }
    
    function addCampaignAdmin(uint256 _campaignId, address _newAdmin) 
        external whenNotPaused whenCircuitBreakerInactive {
        projectManager.addCampaignAdmin(_campaignId, _newAdmin);
    }
    
    function removeCampaignAdmin(uint256 _campaignId, address _admin) 
        external whenNotPaused whenCircuitBreakerInactive {
        projectManager.removeCampaignAdmin(_campaignId, _admin);
    }
    
    // Voting and Funding Functions (Proxy to VotingEngine)
    function createPool(
        uint256 _campaignId,
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) external whenNotPaused whenCircuitBreakerInactive returns (uint256) {
        return votingEngine.createPool(_campaignId, _name, _description, _startTime, _endTime);
    }
    
    function donate(
        uint256 _poolId,
        address _token,
        uint256 _amount
    ) external whenNotPaused whenCircuitBreakerInactive {
        votingEngine.donate(_poolId, _token, _amount);
    }
    
    function vote(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount
    ) external whenNotPaused whenCircuitBreakerInactive {
        votingEngine.vote(_campaignId, _projectId, _token, _amount);
    }
    
    function voteV4(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount,
        bytes32 _bypassCode
    ) external whenNotPaused whenCircuitBreakerInactive {
        votingEngine.voteV4(_campaignId, _projectId, _token, _amount, _bypassCode);
    }
    
    function voteWithCelo(
        uint256 _campaignId,
        uint256 _projectId,
        bytes32 _bypassCode
    ) external payable whenNotPaused whenCircuitBreakerInactive {
        votingEngine.voteWithCelo{value: msg.value}(_campaignId, _projectId, _bypassCode);
    }
    
    function distributeCampaignFunds(uint256 _poolId) external whenNotPaused whenCircuitBreakerInactive {
        votingEngine.distributeCampaignFunds(_poolId);
    }
    
    function allocateFundsToProject(
        uint256 _poolId,
        uint256 _projectId,
        uint256 _amount
    ) external whenNotPaused whenCircuitBreakerInactive {
        votingEngine.allocateFundsToProject(_poolId, _projectId, _amount);
    }
    
    // Treasury Functions (Proxy to Treasury)
    function setTokenSupport(address _token, bool _supported) external onlyRole(MANAGER_ROLE) whenNotPaused {
        treasury.setTokenSupport(_token, _supported);
        votingEngine.setTokenSupport(_token, _supported);
    }
    
    function setTokenVoting(address _token, bool _enabled) external onlyRole(MANAGER_ROLE) whenNotPaused {
        treasury.setTokenVoting(_token, _enabled);
        votingEngine.setTokenVoting(_token, _enabled);
    }
    
    function collectFees(address _token) external whenNotPaused whenCircuitBreakerInactive {
        treasury.collectFees(_token);
    }
    
    // View Functions (Proxy to appropriate mini contracts)
    function getProject(uint256 _projectId) external view returns (
        uint256 id,
        address payable owner,
        string memory name,
        string memory description,
        bool active,
        uint256 createdAt,
        string memory bio,
        string memory contractInfo,
        string memory additionalData,
        address[] memory contracts,
        bool transferrable,
        uint8 officialStatus
    ) {
        return projectManager.getProject(_projectId);
    }
    
    function getCampaign(uint256 _campaignId) external view returns (
        uint256 id,
        address admin,
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool active,
        uint256 totalFunds,
        uint256 createdAt,
        bool autoPoolCreated,
        uint256[] memory poolIds,
        string memory mainInfo,
        string memory additionalInfo,
        uint256 adminFeePercentage,
        uint256 maxWinners,
        bool useQuadraticDistribution,
        bool useCustomDistribution,
        string memory customDistributionData,
        address payoutToken,
        uint8 officialStatus
    ) {
        return projectManager.getCampaign(_campaignId);
    }
    
    function getPool(uint256 _poolId) external view returns (
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
        return votingEngine.getPool(_poolId);
    }
    
    function getProjectCount() external view returns (uint256) {
        return projectManager.getProjectCount();
    }
    
    function getCampaignCount() external view returns (uint256) {
        return projectManager.getCampaignCount();
    }
    
    function getPoolCount() external view returns (uint256) {
        return votingEngine.getPoolCount();
    }
    
    function getTokenBalance(address _token) external view returns (uint256) {
        return treasury.getTokenBalance(_token);
    }
    
    function getCircuitBreakerStatus() external view returns (
        bool active,
        string memory reason,
        uint256 activatedAt
    ) {
        return treasury.getCircuitBreakerStatus();
    }
    
    function isTokenSupported(address _token) external view returns (bool) {
        return treasury.isTokenSupported(_token);
    }
    
    function isVotingEnabled(address _token) external view returns (bool) {
        return treasury.isVotingEnabled(_token);
    }
    
    // Internal Functions
    function _syncCircuitBreakerState() internal {
        (bool active, string memory reason, uint256 activatedAt) = treasury.getCircuitBreakerStatus();
        circuitBreakerActive = active;
        circuitBreakerReason = reason;
        circuitBreakerActivatedAt = activatedAt;
    }
    
    // UUPS Upgrade Functions
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
    
    // Receive function for CELO donations
    receive() external payable {
        // Forward CELO to Treasury
        (bool success, ) = address(treasury).call{value: msg.value}("");
        require(success, "CELO transfer to Treasury failed");
    }
    
    // Fallback function to handle unknown calls
    fallback() external payable {
        // This could be extended to handle dynamic function routing
        revert("Function not found");
    }
    
    // Additional Pool Management (Proxy to VotingEngine)
    function createAdditionalPool(
        uint256 _campaignId,
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyRole(MANAGER_ROLE) whenNotPaused whenCircuitBreakerInactive returns (uint256) {
        return votingEngine.createAdditionalPool(_campaignId, _name, _description, _startTime, _endTime);
    }
    
    function setPoolClaimDelay(uint256 _newDelay) external onlyRole(ADMIN_ROLE) {
        votingEngine.setPoolClaimDelay(_newDelay);
    }
    
    function enablePoolMilestones(
        uint256 _projectPoolId,
        uint256[] memory _milestoneAmounts
    ) external onlyRole(MANAGER_ROLE) {
        votingEngine.enablePoolMilestones(_projectPoolId, _milestoneAmounts);
    }
    
    function getPoolProjectPools(uint256 _poolId) external view returns (uint256[] memory) {
        return votingEngine.getPoolProjectPools(_poolId);
    }
    
    function getProjectProjectPools(uint256 _projectId) external view returns (uint256[] memory) {
        return votingEngine.getProjectProjectPools(_projectId);
    }
    
    function getProjectPoolClaimableAmount(uint256 _projectPoolId) external view returns (uint256) {
        return votingEngine.getProjectPoolClaimableAmount(_projectPoolId);
    }
    
    // Token Conversion View Functions (Proxy to VotingEngine)
    function getTokenToCeloEquivalent(address _token, uint256 _amount) external view returns (uint256) {
        return votingEngine.getTokenToCeloEquivalent(_token, _amount);
    }
    
    // Enhanced Campaign View Functions
    function getCampaignFundBreakdown(uint256 _campaignId) external view returns (
        uint256 totalFunds,
        uint256 platformFees,
        uint256 adminFees,
        uint256 remainingFunds,
        address[] memory votedTokens,
        uint256[] memory tokenAmounts
    ) {
        // This would need to be implemented based on the data structure
        // For now, return default values
        return (0, 0, 0, 0, new address[](0), new uint256[](0));
    }
    
    function getCampaignTokenBalance(uint256 _campaignId, address _token) external view returns (uint256) {
        return votingEngine.getCampaignTokenBalance(_campaignId, _token);
    }
    
    function getCampaignAdminFeePercentage(uint256 _campaignId) external view returns (uint256) {
        // This would need to be implemented based on the data structure
        return 0;
    }
    
    function getCampaignMaxWinners(uint256 _campaignId) external view returns (uint256) {
        // This would need to be implemented based on the data structure
        return 0;
    }
    
    function isCampaignUsingQuadraticDistribution(uint256 _campaignId) external view returns (bool) {
        // This would need to be implemented based on the data structure
        return false;
    }
    
    function isCampaignUsingCustomDistribution(uint256 _campaignId) external view returns (bool) {
        // This would need to be implemented based on the data structure
        return false;
    }
    
    function getCampaignCustomDistributionData(uint256 _campaignId) external view returns (string memory) {
        // This would need to be implemented based on the data structure
        return "";
    }
    
    function getCampaignPayoutToken(uint256 _campaignId) external view returns (address) {
        // This would need to be implemented based on the data structure
        return address(0);
    }
    
    // Legacy Super Admin Functions (Not implemented in V5, but kept for compatibility)
    function migrateSuperAdminToAccessControl(address _superAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // In V5, we use AccessControl instead of super admins
        // This function is kept for compatibility but does nothing
    }
    
    function addSuperAdmin(address _newSuperAdmin) external onlyRole(ADMIN_ROLE) {
        // In V5, we use AccessControl instead of super admins
        // This function is kept for compatibility but does nothing
    }
    
    function removeSuperAdmin(address _superAdmin) external onlyRole(ADMIN_ROLE) {
        // In V5, we use AccessControl instead of super admins
        // This function is kept for compatibility but does nothing
    }
    
    function migrateAllSuperAdminsToAccessControl() external onlyRole(DEFAULT_ADMIN_ROLE) {
        // In V5, we use AccessControl instead of super admins
        // This function is kept for compatibility but does nothing
    }
    
    function isSuperAdmin(address _user) external view returns (bool) {
        // In V5, we use AccessControl instead of super admins
        // This function is kept for compatibility but returns false
        return false;
    }
    
    function hasAccessControl(address _user, bytes32 _role) external view returns (bool) {
        return hasRole(_role, _user);
    }
    
    // Additional Utility Functions
    function areTokensNeededForActiveCampaigns(address _token) external view returns (bool) {
        // This would need to be implemented based on the data structure
        // For now, return false
        return false;
    }
}
