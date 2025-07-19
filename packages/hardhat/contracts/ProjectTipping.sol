// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ISovereignSeasV4 {
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
    
    function getProjectMetadata(uint256 _projectId) external view returns (
        string memory bio, 
        string memory contractInfo, 
        string memory additionalData, 
        address[] memory contracts
    );
    
    function isTokenSupported(address _token) external view returns (bool);
    function getProjectCount() external view returns (uint256);
    function celoToken() external view returns (address);
    function getTokenToCeloEquivalent(address _token, uint256 _amount) external view returns (uint256);
}

contract ProjectTipping is Ownable(msg.sender), ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State Variables
    ISovereignSeasV4 public sovereignSeas;
    IERC20 public celoToken;
    
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 2; // 2% platform fee
    uint256 public minimumTipAmount = 0.01 * 1e18; // Minimum tip in CELO equivalent
    bool public tippingEnabled = true;
    
    // Core Mappings
    mapping(uint256 => mapping(address => uint256)) public projectTipsByToken; // projectId -> token -> amount
    mapping(uint256 => address[]) public projectTippedTokens; // projectId -> token addresses
    mapping(uint256 => mapping(address => bool)) public isTokenTippedToProject; // projectId -> token -> bool
    mapping(uint256 => uint256) public totalProjectTipsInCelo; // projectId -> total tips in CELO equivalent
    mapping(address => mapping(uint256 => mapping(address => uint256))) public userTipsToProject; // user -> projectId -> token -> amount
    mapping(address => uint256[]) public userTippedProjects; // user -> projectIds
    mapping(address => mapping(uint256 => bool)) public hasUserTippedProject; // user -> projectId -> bool
    mapping(uint256 => uint256) public projectTipperCount; // projectId -> number of unique tippers
    mapping(uint256 => address[]) public projectTippers; // projectId -> tipper addresses
    mapping(uint256 => mapping(address => bool)) public isProjectTipper; // projectId -> tipper -> bool
    mapping(address => uint256) public collectedFees; // token -> collected fees
    
    // Structs
    struct TipInfo {
        address tipper;
        uint256 projectId;
        address token;
        uint256 amount;
        uint256 celoEquivalent;
        uint256 timestamp;
        string message;
    }
    
    struct ProjectTipSummary {
        uint256 projectId;
        address projectOwner;
        string projectName;
        uint256 totalTipsInCelo;
        uint256 tipperCount;
        address[] tippedTokens;
        uint256[] tokenAmounts;
        bool isActive;
    }
    
    struct UserTipSummary {
        address user;
        uint256 totalTippedInCelo;
        uint256 projectCount;
        uint256[] tippedProjectIds;
        TipInfo[] recentTips;
    }
    
    // Arrays
    TipInfo[] public allTips;
    uint256[] public tippedProjectIds;
    mapping(uint256 => bool) public hasBeenTipped;
    
    // Events
    event TipSent(
        address indexed tipper,
        uint256 indexed projectId,
        address indexed token,
        uint256 amount,
        uint256 celoEquivalent,
        string message
    );
    event TipWithdrawn(
        uint256 indexed projectId,
        address indexed projectOwner,
        address indexed token,
        uint256 amount
    );
    event PlatformFeeCollected(address indexed token, uint256 amount);
    event PlatformFeeWithdrawn(address indexed token, address indexed recipient, uint256 amount);
    event TippingStatusChanged(bool enabled);
    event MinimumTipAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event EmergencyWithdraw(address indexed token, address indexed recipient, uint256 amount);

    // Modifiers
    modifier onlyProjectOwner(uint256 _projectId) {
        (, address owner,,,,,,) = sovereignSeas.getProject(_projectId);
        require(owner == msg.sender, "Only project owner can withdraw tips");
        _;
    }
    
    modifier validProject(uint256 _projectId) {
        require(_projectId < sovereignSeas.getProjectCount(), "Invalid project ID");
        (,,,,,bool active,,) = sovereignSeas.getProject(_projectId);
        require(active, "Project is not active");
        _;
    }
    
    modifier tippingIsEnabled() {
        require(tippingEnabled, "Tipping is currently disabled");
        _;
    }

    constructor(address _sovereignSeas) {
        require(_sovereignSeas != address(0), "Invalid SovereignSeas address");
        sovereignSeas = ISovereignSeasV4(_sovereignSeas);
        celoToken = IERC20(sovereignSeas.celoToken());
    }

    // Tipping Functions
    function tipProject(
        uint256 _projectId,
        address _token,
        uint256 _amount,
        string memory _message
    ) external nonReentrant validProject(_projectId) tippingIsEnabled {
        require(_token != address(celoToken), "Use tipProjectWithCelo for CELO tips");
        require(_amount > 0, "Tip amount must be greater than 0");
        require(sovereignSeas.isTokenSupported(_token), "Token not supported");
        
        uint256 celoEquivalent = sovereignSeas.getTokenToCeloEquivalent(_token, _amount);
        require(celoEquivalent >= minimumTipAmount, "Tip amount below minimum");
        
        // Transfer tokens
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        _processTip(_projectId, _token, _amount, celoEquivalent, _message);
    }
    
    function tipProjectWithCelo(
        uint256 _projectId,
        string memory _message
    ) external payable nonReentrant validProject(_projectId) tippingIsEnabled {
        require(msg.value > 0, "Must send CELO to tip");
        require(msg.value >= minimumTipAmount, "Tip amount below minimum");
        
        address celoAddress = address(celoToken);
        uint256 celoEquivalent = msg.value;
        
        _processTip(_projectId, celoAddress, msg.value, celoEquivalent, _message);
    }
    
    function _processTip(
        uint256 _projectId,
        address _token,
        uint256 _amount,
        uint256 _celoEquivalent,
        string memory _message
    ) internal {
        // Calculate platform fee
        uint256 platformFee = (_amount * PLATFORM_FEE_PERCENTAGE) / 100;
        uint256 tipAmount = _amount - platformFee;
        
        // Update tip data
        projectTipsByToken[_projectId][_token] += tipAmount;
        totalProjectTipsInCelo[_projectId] += _celoEquivalent;
        userTipsToProject[msg.sender][_projectId][_token] += tipAmount;
        collectedFees[_token] += platformFee;
        
        // Track tipped tokens for project
        if (!isTokenTippedToProject[_projectId][_token]) {
            projectTippedTokens[_projectId].push(_token);
            isTokenTippedToProject[_projectId][_token] = true;
        }
        
        // Track user's tipped projects
        if (!hasUserTippedProject[msg.sender][_projectId]) {
            userTippedProjects[msg.sender].push(_projectId);
            hasUserTippedProject[msg.sender][_projectId] = true;
        }
        
        // Track project tippers
        if (!isProjectTipper[_projectId][msg.sender]) {
            projectTippers[_projectId].push(msg.sender);
            isProjectTipper[_projectId][msg.sender] = true;
            projectTipperCount[_projectId]++;
        }
        
        // Track globally tipped projects
        if (!hasBeenTipped[_projectId]) {
            tippedProjectIds.push(_projectId);
            hasBeenTipped[_projectId] = true;
        }
        
        // Record tip
        TipInfo memory newTip = TipInfo({
            tipper: msg.sender,
            projectId: _projectId,
            token: _token,
            amount: tipAmount,
            celoEquivalent: _celoEquivalent,
            timestamp: block.timestamp,
            message: _message
        });
        allTips.push(newTip);
        
        emit TipSent(msg.sender, _projectId, _token, tipAmount, _celoEquivalent, _message);
        emit PlatformFeeCollected(_token, platformFee);
    }

    // Withdrawal Functions
    function withdrawTips(uint256 _projectId, address _token) external nonReentrant onlyProjectOwner(_projectId) {
        uint256 amount = projectTipsByToken[_projectId][_token];
        require(amount > 0, "No tips to withdraw for this token");
        
        projectTipsByToken[_projectId][_token] = 0;
        
        if (_token == address(celoToken)) {
            payable(msg.sender).transfer(amount);
        } else {
            IERC20(_token).safeTransfer(msg.sender, amount);
        }
        
        emit TipWithdrawn(_projectId, msg.sender, _token, amount);
    }
    
    function withdrawAllTips(uint256 _projectId) external nonReentrant onlyProjectOwner(_projectId) {
        address[] memory tokens = projectTippedTokens[_projectId];
        require(tokens.length > 0, "No tips to withdraw");
        
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 amount = projectTipsByToken[_projectId][token];
            
            if (amount > 0) {
                projectTipsByToken[_projectId][token] = 0;
                
                if (token == address(celoToken)) {
                    payable(msg.sender).transfer(amount);
                } else {
                    IERC20(token).safeTransfer(msg.sender, amount);
                }
                
                emit TipWithdrawn(_projectId, msg.sender, token, amount);
            }
        }
    }

    // Admin Functions
    function withdrawPlatformFees(address _token, address _recipient, uint256 _amount) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        uint256 feeBalance = collectedFees[_token];
        require(feeBalance > 0, "No fees to withdraw");
        
        uint256 amountToWithdraw = _amount == 0 ? feeBalance : _amount;
        require(amountToWithdraw <= feeBalance, "Insufficient fee balance");
        
        collectedFees[_token] -= amountToWithdraw;
        
        if (_token == address(celoToken)) {
            payable(_recipient).transfer(amountToWithdraw);
        } else {
            IERC20(_token).safeTransfer(_recipient, amountToWithdraw);
        }
        
        emit PlatformFeeWithdrawn(_token, _recipient, amountToWithdraw);
    }
    
    function toggleTipping() external onlyOwner {
        tippingEnabled = !tippingEnabled;
        emit TippingStatusChanged(tippingEnabled);
    }
    
    function setMinimumTipAmount(uint256 _newMinimum) external onlyOwner {
        uint256 oldMinimum = minimumTipAmount;
        minimumTipAmount = _newMinimum;
        emit MinimumTipAmountUpdated(oldMinimum, _newMinimum);
    }
    
    function emergencyWithdraw(address _token, address _recipient, uint256 _amount) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        
        if (_token == address(celoToken)) {
            uint256 balance = address(this).balance;
            uint256 amountToWithdraw = _amount == 0 ? balance : _amount;
            require(amountToWithdraw <= balance, "Insufficient balance");
            payable(_recipient).transfer(amountToWithdraw);
        } else {
            uint256 balance = IERC20(_token).balanceOf(address(this));
            uint256 amountToWithdraw = _amount == 0 ? balance : _amount;
            require(amountToWithdraw <= balance, "Insufficient balance");
            IERC20(_token).safeTransfer(_recipient, amountToWithdraw);
        }
        
        emit EmergencyWithdraw(_token, _recipient, _amount);
    }

    // View Functions - Project Information
    function getProjectTipSummary(uint256 _projectId) external view returns (ProjectTipSummary memory) {
        (, address owner, string memory name,,,bool active,,) = sovereignSeas.getProject(_projectId);
        
        address[] memory tokens = projectTippedTokens[_projectId];
        uint256[] memory amounts = new uint256[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            amounts[i] = projectTipsByToken[_projectId][tokens[i]];
        }
        
        return ProjectTipSummary({
            projectId: _projectId,
            projectOwner: owner,
            projectName: name,
            totalTipsInCelo: totalProjectTipsInCelo[_projectId],
            tipperCount: projectTipperCount[_projectId],
            tippedTokens: tokens,
            tokenAmounts: amounts,
            isActive: active
        });
    }
    
    function getProjectTipsByToken(uint256 _projectId, address _token) external view returns (uint256) {
        return projectTipsByToken[_projectId][_token];
    }
    
    function getProjectTotalTipsInCelo(uint256 _projectId) external view returns (uint256) {
        return totalProjectTipsInCelo[_projectId];
    }
    
    function getProjectTippedTokens(uint256 _projectId) external view returns (address[] memory) {
        return projectTippedTokens[_projectId];
    }
    
    function getProjectTippers(uint256 _projectId) external view returns (address[] memory) {
        return projectTippers[_projectId];
    }
    
    function getProjectTipperCount(uint256 _projectId) external view returns (uint256) {
        return projectTipperCount[_projectId];
    }

    // View Functions - User Information
    function getUserTipSummary(address _user) external view returns (UserTipSummary memory) {
        uint256[] memory projects = userTippedProjects[_user];
        uint256 totalTippedInCelo = 0;
        
        // Calculate total tipped in CELO equivalent
        for (uint256 i = 0; i < projects.length; i++) {
            uint256 projectId = projects[i];
            address[] memory tokens = projectTippedTokens[projectId];
            
            for (uint256 j = 0; j < tokens.length; j++) {
                address token = tokens[j];
                uint256 userTipAmount = userTipsToProject[_user][projectId][token];
                if (userTipAmount > 0) {
                    uint256 celoEquivalent = sovereignSeas.getTokenToCeloEquivalent(token, userTipAmount);
                    totalTippedInCelo += celoEquivalent;
                }
            }
        }
        
        // Get recent tips (last 10)
        TipInfo[] memory recentTips = getUserRecentTips(_user, 10);
        
        return UserTipSummary({
            user: _user,
            totalTippedInCelo: totalTippedInCelo,
            projectCount: projects.length,
            tippedProjectIds: projects,
            recentTips: recentTips
        });
    }
    
    function getUserTipsToProject(address _user, uint256 _projectId, address _token) external view returns (uint256) {
        return userTipsToProject[_user][_projectId][_token];
    }
    
    function getUserTippedProjects(address _user) external view returns (uint256[] memory) {
        return userTippedProjects[_user];
    }
    
    function getUserRecentTips(address _user, uint256 _limit) public view returns (TipInfo[] memory) {
        uint256 userTipCount = 0;
        
        // Count user's tips
        for (uint256 i = 0; i < allTips.length; i++) {
            if (allTips[i].tipper == _user) {
                userTipCount++;
            }
        }
        
        if (userTipCount == 0) {
            return new TipInfo[](0);
        }
        
        uint256 returnCount = userTipCount > _limit ? _limit : userTipCount;
        TipInfo[] memory recentTips = new TipInfo[](returnCount);
        uint256 index = 0;
        
        // Get most recent tips (reverse order)
        for (uint256 i = allTips.length; i > 0 && index < returnCount; i--) {
            if (allTips[i-1].tipper == _user) {
                recentTips[index] = allTips[i-1];
                index++;
            }
        }
        
        return recentTips;
    }

    // View Functions - Global Information
    function getAllTippedProjects() external view returns (uint256[] memory) {
        return tippedProjectIds;
    }
    
    function getTopTippedProjects(uint256 _limit) external view returns (uint256[] memory projectIds, uint256[] memory tipAmounts) {
        uint256[] memory tipped = tippedProjectIds;
        uint256 returnCount = tipped.length > _limit ? _limit : tipped.length;
        
        // Create arrays for sorting
        uint256[] memory sortedIds = new uint256[](tipped.length);
        uint256[] memory sortedAmounts = new uint256[](tipped.length);
        
        for (uint256 i = 0; i < tipped.length; i++) {
            sortedIds[i] = tipped[i];
            sortedAmounts[i] = totalProjectTipsInCelo[tipped[i]];
        }
        
        // Bubble sort (descending order)
        for (uint256 i = 0; i < sortedIds.length; i++) {
            for (uint256 j = i + 1; j < sortedIds.length; j++) {
                if (sortedAmounts[j] > sortedAmounts[i]) {
                    // Swap amounts
                    (sortedAmounts[i], sortedAmounts[j]) = (sortedAmounts[j], sortedAmounts[i]);
                    // Swap ids
                    (sortedIds[i], sortedIds[j]) = (sortedIds[j], sortedIds[i]);
                }
            }
        }
        
        // Return top projects
        uint256[] memory topIds = new uint256[](returnCount);
        uint256[] memory topAmounts = new uint256[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            topIds[i] = sortedIds[i];
            topAmounts[i] = sortedAmounts[i];
        }
        
        return (topIds, topAmounts);
    }
    
    function getAllTips() external view returns (TipInfo[] memory) {
        return allTips;
    }
    
    function getRecentTips(uint256 _limit) external view returns (TipInfo[] memory) {
        uint256 returnCount = allTips.length > _limit ? _limit : allTips.length;
        TipInfo[] memory recentTips = new TipInfo[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            recentTips[i] = allTips[allTips.length - 1 - i];
        }
        
        return recentTips;
    }
    
    function getTotalTipsCount() external view returns (uint256) {
        return allTips.length;
    }
    
    function getPlatformFeeBalance(address _token) external view returns (uint256) {
        return collectedFees[_token];
    }
    
    function getContractStats() external view returns (
        uint256 totalTips,
        uint256 totalProjectsTipped,
        uint256 totalUniqueUsers,
        bool isEnabled,
        uint256 minTipAmount
    ) {
        // Count unique users
        address[] memory uniqueUsers = new address[](allTips.length);
        uint256 uniqueCount = 0;
        
        for (uint256 i = 0; i < allTips.length; i++) {
            address tipper = allTips[i].tipper;
            bool isUnique = true;
            
            for (uint256 j = 0; j < uniqueCount; j++) {
                if (uniqueUsers[j] == tipper) {
                    isUnique = false;
                    break;
                }
            }
            
            if (isUnique) {
                uniqueUsers[uniqueCount] = tipper;
                uniqueCount++;
            }
        }
        
        return (
            allTips.length,
            tippedProjectIds.length,
            uniqueCount,
            tippingEnabled,
            minimumTipAmount
        );
    }

    // Utility Functions
    function canUserTipProject(address _user, uint256 _projectId, address _token, uint256 _amount) external view returns (bool canTip, string memory reason) {
        if (!tippingEnabled) return (false, "Tipping is disabled");
        if (_projectId >= sovereignSeas.getProjectCount()) return (false, "Invalid project ID");
        if (!sovereignSeas.isTokenSupported(_token)) return (false, "Token not supported");
        if (_amount == 0) return (false, "Amount must be greater than 0");
        
        (,,,,,bool active,,) = sovereignSeas.getProject(_projectId);
        if (!active) return (false, "Project is not active");
        
        uint256 celoEquivalent;
        if (_token == address(celoToken)) {
            celoEquivalent = _amount;
        } else {
            celoEquivalent = sovereignSeas.getTokenToCeloEquivalent(_token, _amount);
        }
        
        if (celoEquivalent < minimumTipAmount) return (false, "Amount below minimum tip");
        
        return (true, "");
    }
    
    function getProjectWithTipInfo(uint256 _projectId) external view returns (
        uint256 id,
        address owner,
        string memory name,
        string memory description,
        bool active,
        uint256 totalTipsInCelo,
        uint256 tipperCount,
        address[] memory tippedTokens
    ) {
        (id, owner, name, description,, active,,) = sovereignSeas.getProject(_projectId);
        return (
            id,
            owner,
            name,
            description,
            active,
            totalProjectTipsInCelo[_projectId],
            projectTipperCount[_projectId],
            projectTippedTokens[_projectId]
        );
    }

    // Receive function to accept CELO
    receive() external payable {
        // Contract can receive CELO
    }
}