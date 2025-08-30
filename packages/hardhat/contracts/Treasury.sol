// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Treasury is AccessControlUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;
    
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
    
    // Circuit Breaker State
    bool public circuitBreakerActive;
    string public circuitBreakerReason;
    uint256 public circuitBreakerActivatedAt;
    
    // Treasury State
    mapping(address => uint256) public tokenBalances;
    mapping(address => bool) public supportedTokens;
    mapping(address => bool) public votingEnabledTokens;
    
    // Fee Management
    uint256 public platformFeePercentage;
    uint256 public adminFeePercentage;
    address public feeCollector;
    
    // Emergency Withdrawal Limits
    mapping(address => uint256) public emergencyWithdrawalLimits;
    uint256 public defaultEmergencyWithdrawalLimit;
    
    // Enhanced Emergency Functions
    mapping(address => uint256) public collectedFees;
    
    // Events
    event CircuitBreakerTriggered(string reason, uint256 timestamp);
    event CircuitBreakerReset(uint256 timestamp);
    event EmergencyWithdrawal(address indexed token, uint256 amount, address indexed recipient);
    event FeesCollected(address indexed token, uint256 amount);
    event TokenSupportUpdated(address indexed token, bool supported);
    event VotingEnabledUpdated(address indexed token, bool enabled);
    event EmergencyPause(string reason);
    event EmergencyUnpause();
    
    // Modifiers
    modifier whenCircuitBreakerInactive() {
        require(!circuitBreakerActive, "Circuit breaker is active");
        _;
    }
    
    modifier onlyTreasurer() {
        require(hasRole(TREASURER_ROLE, _msgSender()), "Only treasurer can call this function");
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
        _grantRole(TREASURER_ROLE, _admin);
        
        circuitBreakerActive = false;
        platformFeePercentage = 50; // 0.5%
        adminFeePercentage = 100; // 1%
        feeCollector = _admin;
        defaultEmergencyWithdrawalLimit = 1000 ether; // Default limit
    }
    
    // Circuit Breaker Functions
    function triggerCircuitBreaker(string memory _reason) external onlyRole(EMERGENCY_ROLE) {
        require(!circuitBreakerActive, "Circuit breaker already active");
        
        circuitBreakerActive = true;
        circuitBreakerReason = _reason;
        circuitBreakerActivatedAt = block.timestamp;
        
        emit CircuitBreakerTriggered(_reason, block.timestamp);
    }
    
    function resetCircuitBreaker() external onlyRole(ADMIN_ROLE) {
        require(circuitBreakerActive, "Circuit breaker not active");
        
        circuitBreakerActive = false;
        circuitBreakerReason = "";
        circuitBreakerActivatedAt = 0;
        
        emit CircuitBreakerReset(block.timestamp);
    }
    
    // Emergency Functions
    function emergencyPause(string memory _reason) external onlyRole(EMERGENCY_ROLE) {
        _pause();
        emit EmergencyPause(_reason);
    }
    
    function emergencyUnpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
        emit EmergencyUnpause();
    }
    
    function emergencyWithdraw(
        address _token,
        uint256 _amount,
        address _recipient
    ) external onlyRole(EMERGENCY_ROLE) whenNotPaused {
        require(_recipient != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be greater than 0");
        
        uint256 availableBalance = getTokenBalance(_token);
        require(_amount <= availableBalance, "Insufficient balance");
        
        uint256 withdrawalLimit = emergencyWithdrawalLimits[_token] > 0 
            ? emergencyWithdrawalLimits[_token] 
            : defaultEmergencyWithdrawalLimit;
        
        require(_amount <= withdrawalLimit, "Amount exceeds withdrawal limit");
        
        if (_token == address(0)) {
            // CELO withdrawal
            require(address(this).balance >= _amount, "Insufficient CELO balance");
            (bool success, ) = _recipient.call{value: _amount}("");
            require(success, "CELO transfer failed");
        } else {
            // ERC20 withdrawal
            IERC20(_token).safeTransfer(_recipient, _amount);
        }
        
        // Update balances
        tokenBalances[_token] -= _amount;
        
        emit EmergencyWithdrawal(_token, _amount, _recipient);
    }
    
    // Enhanced Emergency Functions
    function emergencyTokenRecovery(
        address _token,
        address _recipient,
        uint256 _amount
    ) external onlyRole(EMERGENCY_ROLE) {
        bool tokensNeeded = false;
        
        // Check if tokens are needed for active campaigns
        // This would need to be coordinated with VotingEngine
        // For now, we'll just transfer the tokens
        
        IERC20(_token).safeTransfer(_recipient, _amount);
        // Event would be emitted here
    }
    
    // Advanced Token Management
    function addSupportedToken(address _token) external onlyRole(ADMIN_ROLE) {
        require(_token != address(0), "Invalid token address");
        require(!supportedTokens[_token], "Token already supported");
        
        supportedTokens[_token] = true;
        // Note: This would need to be synchronized with VotingEngine
        
        // Event would be emitted here
    }
    
    function removeSupportedToken(address _token) external onlyRole(ADMIN_ROLE) {
        require(supportedTokens[_token], "Token not supported");
        
        supportedTokens[_token] = false;
        votingEnabledTokens[_token] = false;
        
        // Note: This would need to be synchronized with VotingEngine
        
        // Event would be emitted here
    }
    
    function addVotingToken(address _token) external onlyRole(ADMIN_ROLE) {
        require(supportedTokens[_token], "Token must be supported first");
        votingEnabledTokens[_token] = true;
    }
    
    function removeVotingToken(address _token) external onlyRole(ADMIN_ROLE) {
        votingEnabledTokens[_token] = false;
    }
    
    // Enhanced Fee Management
    function collectFees(address _token, uint256 _amount, string memory _feeType) external onlyRole(ADMIN_ROLE) {
        collectedFees[_token] += _amount;
        // Event would be emitted here
    }
    
    function withdrawFees(address _token, address _recipient, uint256 _amount) external onlyRole(ADMIN_ROLE) {
        require(collectedFees[_token] >= _amount, "Insufficient collected fees");
        collectedFees[_token] -= _amount;
        
        IERC20(_token).safeTransfer(_recipient, _amount);
        // Event would be emitted here
    }
    
    function getCollectedFees(address _token) external view returns (uint256) {
        return collectedFees[_token];
    }
    
    // Token Management Functions
    function setTokenSupport(address _token, bool _supported) external onlyRole(MANAGER_ROLE) whenNotPaused {
        supportedTokens[_token] = _supported;
        emit TokenSupportUpdated(_token, _supported);
    }
    
    function setTokenVoting(address _token, bool _enabled) external onlyRole(MANAGER_ROLE) whenNotPaused {
        votingEnabledTokens[_token] = _enabled;
        emit VotingEnabledUpdated(_token, _enabled);
    }
    
    function setEmergencyWithdrawalLimit(address _token, uint256 _limit) external onlyRole(ADMIN_ROLE) {
        emergencyWithdrawalLimits[_token] = _limit;
    }
    
    function setDefaultEmergencyWithdrawalLimit(uint256 _limit) external onlyRole(ADMIN_ROLE) {
        defaultEmergencyWithdrawalLimit = _limit;
    }
    
    // Fee Management Functions
    function setPlatformFeePercentage(uint256 _percentage) external onlyRole(ADMIN_ROLE) {
        require(_percentage <= 1000, "Fee cannot exceed 10%");
        platformFeePercentage = _percentage;
    }
    
    function setAdminFeePercentage(uint256 _percentage) external onlyRole(ADMIN_ROLE) {
        require(_percentage <= 1000, "Fee cannot exceed 10%");
        adminFeePercentage = _percentage;
    }
    
    function setFeeCollector(address _collector) external onlyRole(ADMIN_ROLE) {
        require(_collector != address(0), "Invalid collector address");
        feeCollector = _collector;
    }
    
    // Balance Management Functions
    function depositToken(address _token, uint256 _amount) external payable whenNotPaused whenCircuitBreakerInactive {
        if (_token == address(0)) {
            // CELO deposit
            require(msg.value == _amount, "CELO amount mismatch");
            tokenBalances[address(0)] += msg.value;
        } else {
            // ERC20 deposit
            require(_amount > 0, "Amount must be greater than 0");
            IERC20(_token).safeTransferFrom(_msgSender(), address(this), _amount);
            tokenBalances[_token] += _amount;
        }
    }
    
    function withdrawToken(
        address _token,
        uint256 _amount,
        address _recipient
    ) external onlyRole(TREASURER_ROLE) whenNotPaused whenCircuitBreakerInactive {
        require(_recipient != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be greater than 0");
        
        uint256 availableBalance = getTokenBalance(_token);
        require(_amount <= availableBalance, "Insufficient balance");
        
        if (_token == address(0)) {
            // CELO withdrawal
            (bool success, ) = _recipient.call{value: _amount}("");
            require(success, "CELO transfer failed");
        } else {
            // ERC20 withdrawal
            IERC20(_token).safeTransfer(_recipient, _amount);
        }
        
        tokenBalances[_token] -= _amount;
    }
    
    // View Functions
    function getTokenBalance(address _token) public view returns (uint256) {
        if (_token == address(0)) {
            return address(this).balance;
        } else {
            return IERC20(_token).balanceOf(address(this));
        }
    }
    
    function getCircuitBreakerStatus() external view returns (
        bool active,
        string memory reason,
        uint256 activatedAt
    ) {
        return (circuitBreakerActive, circuitBreakerReason, circuitBreakerActivatedAt);
    }
    
    function getFeeInfo() external view returns (
        uint256 platformFee,
        uint256 adminFee,
        address collector
    ) {
        return (platformFeePercentage, adminFeePercentage, feeCollector);
    }
    
    function isTokenSupported(address _token) external view returns (bool) {
        return supportedTokens[_token];
    }
    
    function isVotingEnabled(address _token) external view returns (bool) {
        return votingEnabledTokens[_token];
    }
    
    function getEmergencyWithdrawalLimit(address _token) external view returns (uint256) {
        return emergencyWithdrawalLimits[_token] > 0 
            ? emergencyWithdrawalLimits[_token] 
            : defaultEmergencyWithdrawalLimit;
    }
    
    // Enhanced View Functions
    function getSupportedTokens() external view returns (address[] memory) {
        // This would need to be implemented based on the data structure
        // For now, return empty array
        return new address[](0);
    }
    
    function getSupportedTokensCount() external view returns (uint256) {
        // This would need to be calculated from the supported tokens
        return 0;
    }
    
    function getVotingTokensCount() external view returns (uint256) {
        // This would need to be calculated from the voting enabled tokens
        return 0;
    }
    
    function isTokenVotingEnabled(address _token) external view returns (bool) {
        return votingEnabledTokens[_token];
    }
    
    // UUPS Upgrade Functions
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
    
    // Receive function for CELO deposits
    receive() external payable {
        // Handle CELO deposits
        if (msg.value > 0) {
            tokenBalances[address(0)] += msg.value;
        }
    }
    
    // Fallback function
    fallback() external payable {
        // Handle unexpected CELO transfers
        if (msg.value > 0) {
            tokenBalances[address(0)] += msg.value;
        }
    }
}
