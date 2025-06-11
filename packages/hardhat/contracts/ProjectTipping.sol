// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Interface for the deployed SovereignSeasV4 contract
interface ISovereignSeas {
    // Structs matching the deployed contract
    struct ProjectMetadata { 
        string bio; 
        string contractInfo; 
        string additionalData; 
    }
    
    struct Project {
        uint256 id;
        address payable owner;
        string name;
        string description;
        ProjectMetadata metadata;
        address[] contracts;
        bool transferrable;
        uint256[] campaignIds;
        bool active;
        uint256 createdAt;
    }

    // View functions from deployed contract
    function projects(uint256 projectId) external view returns (
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
    
    function supportedTokens(address token) external view returns (bool);
    function getSupportedTokens() external view returns (address[] memory);
    function nextProjectId() external view returns (uint256);
    function owner() external view returns (address);
    function celoToken() external view returns (address);
    function mentoTokenBroker() external view returns (address);
    function getTokenToCeloEquivalent(address token, uint256 amount) external view returns (uint256);
    function collectedFees(address token) external view returns (uint256);
    function superAdmins(address admin) external view returns (bool);
    function cUSD() external view returns (address); // Add this to get cUSD from SovereignSeas
}

/**
 * @title ProjectTipping
 * @dev Standalone contract for direct project tipping functionality
 * Users can tip projects with CELO, cUSD, or other supported tokens with optional messages
 * Tips can be general project tips or campaign-specific tips
 */
contract ProjectTipping is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    // Reference to the main SovereignSeas contract
    ISovereignSeas public immutable sovereignSeas;
    IERC20 public immutable celoToken;
    address public immutable broker;
    address public immutable cUSD;
    
    // Tipping-specific storage
    mapping(uint256 => mapping(address => uint256)) public projectTips; // projectId => token => total tips
    mapping(uint256 => uint256) public projectTipCount; // projectId => number of tips received
    mapping(uint256 => Tip[]) public projectTipHistory; // projectId => array of tips
    mapping(address => Tip[]) public userTipHistory; // user => array of tips given
    mapping(address => uint256) public userTotalTipped; // user => total CELO equivalent tipped
    
    // Campaign-specific tipping storage (using string campaign IDs)
    mapping(string => mapping(uint256 => mapping(address => uint256))) public campaignProjectTips; // campaignId => projectId => token => amount
    mapping(string => mapping(uint256 => uint256)) public campaignProjectTipCount; // campaignId => projectId => tip count
    mapping(string => mapping(uint256 => Tip[])) public campaignProjectTipHistory; // campaignId => projectId => tips
    mapping(string => mapping(address => uint256)) public campaignUserTips; // campaignId => user => total CELO equivalent
    mapping(string => uint256) public campaignTotalTips; // campaignId => total tips in CELO equivalent
    
    // String campaign tracking
    mapping(string => bool) public validCampaigns; // Track valid campaign IDs
    string[] public campaignIdsList; // List of all campaign IDs that have received tips
    mapping(string => bool) private campaignInList; // Track if campaign is in list
    
    // Global tipping statistics
    uint256 public totalTipsAllTime; // Total tips in CELO equivalent
    uint256 public totalTipTransactions; // Total number of tip transactions
    mapping(address => uint256) public tokenTotalTips; // token => total tips in that token
    mapping(address => uint256) public collectedFees; // Track platform fees collected
    
    uint256 public tippingFeePercentage = 2; // 2% platform fee on tips
    bool public tippingEnabled = true;
    uint256 public minimumTipAmount = 0.01 ether; // Minimum tip amount (adjustable)
    
    // Structs
    struct Tip {
        address tipper;
        uint256 projectId;
        string campaignId; // empty string if general project tip
        address token;
        uint256 amount;
        uint256 celoEquivalent;
        string message;
        uint256 timestamp;
        uint256 tipId;
        bool isCampaignSpecific;
    }
    
    struct TipSummary {
        uint256 totalTips;
        uint256 tipCount;
        address[] tippedTokens;
        uint256[] tokenAmounts;
        uint256 campaignTips; // campaign-specific tips
        uint256 generalTips; // general project tips
    }
    
    struct CampaignTipSummary {
        uint256 totalTips;
        uint256 tipCount;
        uint256 projectCount; // number of projects tipped in campaign
        address[] tippedTokens;
        uint256[] tokenAmounts;
    }
    
    struct UserTipStats {
        uint256 totalTipped;
        uint256 tipCount;
        uint256 campaignTips;
        uint256 projectTips;
        address[] tippedTokens;
        uint256[] tokenAmounts;
    }
    
    // Events
    event ProjectTipped(
        address indexed tipper,
        uint256 indexed projectId,
        string indexed campaignId, // empty string if general tip
        address token,
        uint256 amount,
        uint256 celoEquivalent,
        string message,
        uint256 tipId,
        bool isCampaignSpecific
    );
    
    event TippingFeeUpdated(uint256 previousFee, uint256 newFee);
    event TippingStatusUpdated(bool enabled);
    event MinimumTipAmountUpdated(uint256 previousAmount, uint256 newAmount);
    event TipRefunded(address indexed tipper, uint256 indexed projectId, address token, uint256 amount, string reason);
    event CampaignRegistered(string indexed campaignId, address indexed registeredBy);
    event FeeCollected(address indexed token, uint256 amount, string feeType);
    
    // Modifiers
    modifier tippingActive() {
        require(tippingEnabled, "Tipping is currently disabled");
        _;
    }
    
    modifier validTipAmount(uint256 _amount) {
        require(_amount >= minimumTipAmount, "Tip amount below minimum");
        _;
    }
    
    modifier validCampaign(string memory _campaignId) {
        if (bytes(_campaignId).length > 0) {
            require(validCampaigns[_campaignId], "Campaign not registered");
        }
        _;
    }
    
    modifier activeProject(uint256 _projectId) {
        (, , , , , bool active, , ) = sovereignSeas.projects(_projectId);
        require(active, "Project is not active");
        _;
    }
    
    modifier onlySuperAdmin() {
        require(sovereignSeas.superAdmins(msg.sender) || msg.sender == owner(), "Only super admin can call this function");
        _;
    }
    
    modifier validAddress(address _addr) {
        require(_addr != address(0), "Invalid address");
        _;
    }
    
    constructor(
        address _sovereignSeasContract,
        address _initialOwner
    ) 
        Ownable(_initialOwner)
        validAddress(_sovereignSeasContract) 
        validAddress(_initialOwner) 
    {
        sovereignSeas = ISovereignSeas(_sovereignSeasContract);
        celoToken = IERC20(sovereignSeas.celoToken());
        broker = sovereignSeas.mentoTokenBroker();
        cUSD = sovereignSeas.cUSD();
    }
    
    // Campaign Management Functions
    
    /**
     * @dev Register a campaign for tipping (only super admin)
     */
    function registerCampaign(string memory _campaignId) external onlySuperAdmin {
        require(bytes(_campaignId).length > 0, "Invalid campaign ID");
        require(!validCampaigns[_campaignId], "Campaign already registered");
        
        validCampaigns[_campaignId] = true;
        
        if (!campaignInList[_campaignId]) {
            campaignIdsList.push(_campaignId);
            campaignInList[_campaignId] = true;
        }
        
        emit CampaignRegistered(_campaignId, msg.sender);
    }
    
    /**
     * @dev Register multiple campaigns at once
     */
    function registerCampaigns(string[] memory _campaignIds) external onlySuperAdmin {
        for (uint256 i = 0; i < _campaignIds.length; i++) {
            if (bytes(_campaignIds[i]).length > 0 && !validCampaigns[_campaignIds[i]]) {
                validCampaigns[_campaignIds[i]] = true;
                
                if (!campaignInList[_campaignIds[i]]) {
                    campaignIdsList.push(_campaignIds[i]);
                    campaignInList[_campaignIds[i]] = true;
                }
                
                emit CampaignRegistered(_campaignIds[i], msg.sender);
            }
        }
    }
    
    /**
     * @dev Deregister a campaign from tipping
     */
    function deregisterCampaign(string memory _campaignId) external onlySuperAdmin {
        require(validCampaigns[_campaignId], "Campaign not registered");
        validCampaigns[_campaignId] = false;
    }
    
    /**
     * @dev Check if project participates in a specific campaign
     * For now, assumes all active projects can participate in registered campaigns
     */
    function projectParticipatesInCampaign(uint256 _projectId, string memory _campaignId) public view returns (bool) {
        (, , , , , bool active, , ) = sovereignSeas.projects(_projectId);
        require(active, "Project not active");
        return validCampaigns[_campaignId];
    }
    
    /**
     * @dev Tip a project with CELO (native)
     */
    function tipProjectWithCelo(
        uint256 _projectId,
        string memory _campaignId,
        string memory _message
    ) external payable nonReentrant tippingActive validTipAmount(msg.value) activeProject(_projectId) validCampaign(_campaignId) {
        if (bytes(_campaignId).length > 0) {
            require(projectParticipatesInCampaign(_projectId, _campaignId), "Project not in specified campaign");
        }
        
        uint256 celoEquivalent = msg.value; // CELO is 1:1 with itself
        _processTip(_projectId, _campaignId, address(celoToken), msg.value, celoEquivalent, _message, true);
    }
    
    /**
     * @dev Tip a project with cUSD or other ERC20 tokens
     */
    function tipProject(
        uint256 _projectId,
        string memory _campaignId,
        address _token,
        uint256 _amount,
        string memory _message
    ) external nonReentrant tippingActive validTipAmount(_amount) activeProject(_projectId) validCampaign(_campaignId) {
        require(_token != address(celoToken), "Use tipProjectWithCelo for CELO tips");
        require(sovereignSeas.supportedTokens(_token), "Token not supported for tipping");
        
        if (bytes(_campaignId).length > 0) {
            require(projectParticipatesInCampaign(_projectId, _campaignId), "Project not in specified campaign");
        }
        
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        uint256 celoEquivalent = sovereignSeas.getTokenToCeloEquivalent(_token, _amount);
        _processTip(_projectId, _campaignId, _token, _amount, celoEquivalent, _message, false);
    }
    
    /**
     * @dev Internal function to process tips
     */
    function _processTip(
        uint256 _projectId,
        string memory _campaignId,
        address _token,
        uint256 _amount,
        uint256 _celoEquivalent,
        string memory _message,
        bool _isNativeCelo
    ) internal {
        // Calculate platform fee
        uint256 platformFee = (_amount * tippingFeePercentage) / 100;
        uint256 netAmount = _amount - platformFee;
        uint256 netCeloEquivalent = _isNativeCelo ? netAmount : sovereignSeas.getTokenToCeloEquivalent(_token, netAmount);
        
        bool isCampaignSpecific = bytes(_campaignId).length > 0;
        
        // Update project tip data
        projectTips[_projectId][_token] += netAmount;
        projectTipCount[_projectId]++;
        
        // Update campaign-specific data if applicable
        if (isCampaignSpecific) {
            campaignProjectTips[_campaignId][_projectId][_token] += netAmount;
            campaignProjectTipCount[_campaignId][_projectId]++;
            campaignUserTips[_campaignId][msg.sender] += netCeloEquivalent;
            campaignTotalTips[_campaignId] += netCeloEquivalent;
            
            if (!campaignInList[_campaignId]) {
                campaignIdsList.push(_campaignId);
                campaignInList[_campaignId] = true;
            }
        }
        
        // Update global statistics
        userTotalTipped[msg.sender] += netCeloEquivalent;
        tokenTotalTips[_token] += netAmount;
        totalTipsAllTime += netCeloEquivalent;
        totalTipTransactions++;
        
        // Create tip record
        uint256 tipId = projectTipHistory[_projectId].length;
        Tip memory newTip = Tip({
            tipper: msg.sender,
            projectId: _projectId,
            campaignId: _campaignId,
            token: _token,
            amount: netAmount,
            celoEquivalent: netCeloEquivalent,
            message: _message,
            timestamp: block.timestamp,
            tipId: tipId,
            isCampaignSpecific: isCampaignSpecific
        });
        
        // Store tip in histories
        projectTipHistory[_projectId].push(newTip);
        userTipHistory[msg.sender].push(newTip);
        
        if (isCampaignSpecific) {
            campaignProjectTipHistory[_campaignId][_projectId].push(newTip);
        }
        
        // Get project owner from the main contract
        (, address projectOwner, , , , , , ) = sovereignSeas.projects(_projectId);
        
        // Transfer net amount to project owner
        if (_isNativeCelo) {
            payable(projectOwner).transfer(netAmount);
            if (platformFee > 0) {
                payable(owner()).transfer(platformFee);
            }
        } else {
            IERC20(_token).safeTransfer(projectOwner, netAmount);
            if (platformFee > 0) {
                IERC20(_token).safeTransfer(owner(), platformFee);
            }
        }
        
        // Track platform fee
        if (platformFee > 0) {
            collectedFees[_token] += platformFee;
            emit FeeCollected(_token, platformFee, "tipping");
        }
        
        emit ProjectTipped(
            msg.sender,
            _projectId,
            _campaignId,
            _token,
            netAmount,
            netCeloEquivalent,
            _message,
            tipId,
            isCampaignSpecific
        );
    }
    
    // Admin Functions
    
    /**
     * @dev Update tipping fee percentage (only owner)
     */
    function updateTippingFee(uint256 _newFeePercentage) external onlyOwner {
        require(_newFeePercentage <= 10, "Fee cannot exceed 10%");
        uint256 previousFee = tippingFeePercentage;
        tippingFeePercentage = _newFeePercentage;
        emit TippingFeeUpdated(previousFee, _newFeePercentage);
    }
    
    /**
     * @dev Set minimum tip amount
     */
    function setMinimumTipAmount(uint256 _minimumAmount) external onlyOwner {
        uint256 previousAmount = minimumTipAmount;
        minimumTipAmount = _minimumAmount;
        emit MinimumTipAmountUpdated(previousAmount, _minimumAmount);
    }
    
    /**
     * @dev Enable or disable tipping (only owner)
     */
    function setTippingStatus(bool _enabled) external onlyOwner {
        tippingEnabled = _enabled;
        emit TippingStatusUpdated(_enabled);
    }
    
    /**
     * @dev Emergency refund function (super admin only)
     */
    function emergencyRefund(
        address _tipper,
        uint256 _projectId,
        address _token,
        uint256 _amount,
        string memory _reason
    ) external onlySuperAdmin nonReentrant {
        require(sovereignSeas.supportedTokens(_token), "Token not supported");
        
        if (_token == address(celoToken)) {
            require(address(this).balance >= _amount, "Insufficient CELO balance");
            payable(_tipper).transfer(_amount);
        } else {
            require(IERC20(_token).balanceOf(address(this)) >= _amount, "Insufficient token balance");
            IERC20(_token).safeTransfer(_tipper, _amount);
        }
        
        emit TipRefunded(_tipper, _projectId, _token, _amount, _reason);
    }
    
    /**
     * @dev Withdraw collected fees (only owner)
     */
    function withdrawFees(address _token, address _recipient, uint256 _amount) external onlyOwner validAddress(_recipient) {
        uint256 feeBalance = collectedFees[_token];
        require(feeBalance > 0, "No fees collected for this token");
        uint256 amountToWithdraw = _amount == 0 ? feeBalance : _amount;
        require(amountToWithdraw <= feeBalance, "Insufficient fee balance");
        
        collectedFees[_token] -= amountToWithdraw;
        
        if (_token == address(celoToken)) {
            payable(_recipient).transfer(amountToWithdraw);
        } else {
            IERC20(_token).safeTransfer(_recipient, amountToWithdraw);
        }
    }
    
    // View Functions
    
    /**
     * @dev Get comprehensive project tip summary
     */
    function getProjectTipSummary(uint256 _projectId) external view returns (TipSummary memory) {
        address[] memory allTokens = sovereignSeas.getSupportedTokens();
        uint256 tokenCount = 0;
        
        for (uint256 i = 0; i < allTokens.length; i++) {
            if (projectTips[_projectId][allTokens[i]] > 0) {
                tokenCount++;
            }
        }
        
        address[] memory tippedTokens = new address[](tokenCount);
        uint256[] memory tokenAmounts = new uint256[](tokenCount);
        uint256 index = 0;
        uint256 totalCeloEquivalent = 0;
        uint256 campaignTipsTotal = 0;
        uint256 generalTipsTotal = 0;
        
        for (uint256 i = 0; i < allTokens.length; i++) {
            uint256 amount = projectTips[_projectId][allTokens[i]];
            if (amount > 0) {
                tippedTokens[index] = allTokens[i];
                tokenAmounts[index] = amount;
                totalCeloEquivalent += sovereignSeas.getTokenToCeloEquivalent(allTokens[i], amount);
                index++;
            }
        }
        
        // Calculate campaign vs general tips
        Tip[] memory tips = projectTipHistory[_projectId];
        for (uint256 i = 0; i < tips.length; i++) {
            if (tips[i].isCampaignSpecific) {
                campaignTipsTotal += tips[i].celoEquivalent;
            } else {
                generalTipsTotal += tips[i].celoEquivalent;
            }
        }
        
        return TipSummary({
            totalTips: totalCeloEquivalent,
            tipCount: projectTipCount[_projectId],
            tippedTokens: tippedTokens,
            tokenAmounts: tokenAmounts,
            campaignTips: campaignTipsTotal,
            generalTips: generalTipsTotal
        });
    }
    
    /**
     * @dev Get campaign-specific tip summary
     */
    function getCampaignTipSummary(string memory _campaignId) external view returns (CampaignTipSummary memory) {
        require(bytes(_campaignId).length > 0, "Invalid campaign ID");
        
        address[] memory allTokens = sovereignSeas.getSupportedTokens();
        uint256 tokenCount = 0;
        uint256 projectCount = 0;
        uint256 nextProjectId = sovereignSeas.nextProjectId();
        
        // Count projects that received tips in this campaign
        for (uint256 projectId = 0; projectId < nextProjectId; projectId++) {
            if (campaignProjectTipCount[_campaignId][projectId] > 0) {
                projectCount++;
            }
        }
        
        // Count tokens used for tipping in this campaign
        for (uint256 i = 0; i < allTokens.length; i++) {
            for (uint256 projectId = 0; projectId < nextProjectId; projectId++) {
                if (campaignProjectTips[_campaignId][projectId][allTokens[i]] > 0) {
                    tokenCount++;
                    break;
                }
            }
        }
        
        address[] memory tippedTokens = new address[](tokenCount);
        uint256[] memory tokenAmounts = new uint256[](tokenCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allTokens.length; i++) {
            uint256 totalForToken = 0;
            for (uint256 projectId = 0; projectId < nextProjectId; projectId++) {
                totalForToken += campaignProjectTips[_campaignId][projectId][allTokens[i]];
            }
            if (totalForToken > 0) {
                tippedTokens[index] = allTokens[i];
                tokenAmounts[index] = totalForToken;
                index++;
            }
        }
        
        return CampaignTipSummary({
            totalTips: campaignTotalTips[_campaignId],
            tipCount: _getCampaignTotalTipCount(_campaignId),
            projectCount: projectCount,
            tippedTokens: tippedTokens,
            tokenAmounts: tokenAmounts
        });
    }
    
    // Helper functions
    function _getCampaignTotalTipCount(string memory _campaignId) internal view returns (uint256) {
        uint256 total = 0;
        uint256 nextProjectId = sovereignSeas.nextProjectId();
        for (uint256 projectId = 0; projectId < nextProjectId; projectId++) {
            total += campaignProjectTipCount[_campaignId][projectId];
        }
        return total;
    }
    
    // Standard view functions
    function getProjectTipHistory(uint256 _projectId) external view returns (Tip[] memory) {
        return projectTipHistory[_projectId];
    }
    
    function getCampaignProjectTipHistory(string memory _campaignId, uint256 _projectId) external view returns (Tip[] memory) {
        return campaignProjectTipHistory[_campaignId][_projectId];
    }
    
    function getUserTipHistory(address _user) external view returns (Tip[] memory) {
        return userTipHistory[_user];
    }
    
    function getAllCampaignIds() external view returns (string[] memory) {
        return campaignIdsList;
    }
    
    function isCampaignRegistered(string memory _campaignId) external view returns (bool) {
        return validCampaigns[_campaignId];
    }
    
    function getTippingConfig() external view returns (bool, uint256, address, uint256) {
        return (tippingEnabled, tippingFeePercentage, cUSD, minimumTipAmount);
    }
    
    // Receive function to accept CELO
    receive() external payable {
        // Contract can receive CELO for tipping
    }
}