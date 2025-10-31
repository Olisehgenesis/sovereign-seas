// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title SovAdsManager
 * @dev Decentralized Ad Network Manager Contract
 * @notice Manages campaigns, publishers, claim orders, and admin functions
 */
contract SovAdsManager is Ownable, ReentrancyGuard, Pausable {
    
    // ============ STRUCTS ============
    
    struct Campaign {
        uint256 id;
        address creator;
        address token; // ERC20 token used for funding
        uint256 amount; // Total budget
        uint256 startTime;
        uint256 endTime;
        string metadata; // JSON metadata stored on-chain
        bool active;
        uint256 spent; // Amount spent from campaign
        bool paused;
    }
    
    struct ClaimOrder {
        uint256 id;
        address publisher;
        uint256 campaignId;
        uint256 requestedAmount;
        uint256 approvedAmount;
        bool processed;
        bool rejected;
        string reason; // Reason for rejection
        uint256 createdAt;
        uint256 processedAt;
    }
    
    struct Publisher {
        address wallet;
        string[] sites; // Array of website domains
        bool banned;
        uint256 totalEarned;
        uint256 totalClaimed;
        bool verified;
        uint256 subscriptionDate;
    }
    
    // ============ STATE VARIABLES ============
    
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => ClaimOrder) public claimOrders;
    mapping(address => Publisher) public publishers;
    mapping(address => bool) public isPublisher;
    mapping(address => bool) public supportedTokens;
    mapping(address => bool) public bannedUsers;
    
    // Arrays for iteration
    address[] public supportedTokensList;
    uint256[] public activeCampaigns;
    
    uint256 public campaignCount;
    uint256 public claimOrderCount;
    uint256 public feePercent = 5; // 5% protocol fee
    uint256 public protocolFees;
    
    // ============ EVENTS ============
    
    event CampaignCreated(
        uint256 indexed id,
        address indexed creator,
        address indexed token,
        uint256 amount,
        uint256 startTime,
        uint256 endTime,
        string metadata
    );
    
    event CampaignEdited(
        uint256 indexed id,
        string newMetadata,
        uint256 newEndTime
    );
    
    event CampaignPaused(uint256 indexed id);
    event CampaignResumed(uint256 indexed id);
    
    event PublisherSubscribed(
        address indexed publisher,
        string[] sites,
        uint256 subscriptionDate
    );
    
    event SiteAdded(address indexed publisher, string site);
    event SiteRemoved(address indexed publisher, string site);
    
    event ClaimOrderCreated(
        uint256 indexed orderId,
        address indexed publisher,
        uint256 indexed campaignId,
        uint256 requestedAmount
    );
    
    event ClaimOrderProcessed(
        uint256 indexed orderId,
        uint256 approvedAmount,
        bool rejected,
        string reason
    );
    
    event PublisherBanned(address indexed publisher, string reason);
    event PublisherUnbanned(address indexed publisher);
    
    event FundsDisbursed(
        uint256 indexed campaignId,
        address indexed recipient,
        uint256 amount
    );
    
    event FeeCollected(address indexed admin, uint256 amount);
    
    event SupportedTokenAdded(address indexed token);
    event SupportedTokenRemoved(address indexed token);
    
    // ============ MODIFIERS ============
    
    modifier onlyPublisher() {
        require(isPublisher[msg.sender], "Not a publisher");
        require(!bannedUsers[msg.sender], "Publisher is banned");
        _;
    }
    
    modifier campaignExists(uint256 _campaignId) {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        _;
    }
    
    modifier campaignActive(uint256 _campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        require(!campaign.paused, "Campaign is paused");
        require(block.timestamp >= campaign.startTime, "Campaign has not started");
        require(block.timestamp <= campaign.endTime, "Campaign has ended");
        _;
    }
    
    modifier onlyCampaignCreator(uint256 _campaignId) {
        require(campaigns[_campaignId].creator == msg.sender, "Not campaign creator");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor() {
        // Add default supported tokens (cUSD, USDC, etc.)
        // These will be set during deployment
    }
    
    // ============ CAMPAIGN FUNCTIONS ============
    
    /**
     * @dev Create a new campaign
     * @param _token ERC20 token address for funding
     * @param _amount Campaign budget amount
     * @param _duration Campaign duration in seconds
     * @param _metadata JSON metadata stored on-chain
     */
    function createCampaign(
        address _token,
        uint256 _amount,
        uint256 _duration,
        string calldata _metadata
    ) external whenNotPaused nonReentrant {
        require(supportedTokens[_token], "Token not supported");
        require(_amount > 0, "Amount must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        require(bytes(_metadata).length > 0, "Metadata required");

        // Transfer tokens from creator to contract
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);

        campaignCount++;
        uint256 campaignId = campaignCount;

        campaigns[campaignId] = Campaign({
            id: campaignId,
            creator: msg.sender,
            token: _token,
            amount: _amount,
            startTime: block.timestamp,
            endTime: block.timestamp + _duration,
            metadata: _metadata,
            active: true,
            spent: 0,
            paused: false
        });

        activeCampaigns.push(campaignId);

        emit CampaignCreated(
            campaignId,
            msg.sender,
            _token,
            _amount,
            block.timestamp,
            block.timestamp + _duration,
            _metadata
        );
    }
    
    /**
     * @dev Edit campaign details
     * @param _campaignId Campaign ID to edit
     * @param _metadata New JSON metadata
     * @param _newDuration New duration (extends from current time)
     */
    function editCampaign(
        uint256 _campaignId,
        string calldata _metadata,
        uint256 _newDuration
    ) external campaignExists(_campaignId) onlyCampaignCreator(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        require(!campaign.paused, "Campaign is paused");

        campaign.metadata = _metadata;
        campaign.endTime = block.timestamp + _newDuration;

        emit CampaignEdited(_campaignId, _metadata, campaign.endTime);
    }
    
    /**
     * @dev Pause a campaign
     * @param _campaignId Campaign ID to pause
     */
    function pauseCampaign(uint256 _campaignId) 
        external 
        campaignExists(_campaignId) 
        onlyCampaignCreator(_campaignId) 
    {
        campaigns[_campaignId].paused = true;
        emit CampaignPaused(_campaignId);
    }
    
    /**
     * @dev Resume a paused campaign
     * @param _campaignId Campaign ID to resume
     */
    function resumeCampaign(uint256 _campaignId) 
        external 
        campaignExists(_campaignId) 
        onlyCampaignCreator(_campaignId) 
    {
        campaigns[_campaignId].paused = false;
        emit CampaignResumed(_campaignId);
    }
    
    // ============ PUBLISHER FUNCTIONS ============
    
    /**
     * @dev Subscribe as a publisher with initial sites
     * @param _sites Array of website domains
     */
    function subscribePublisher(string[] calldata _sites) external whenNotPaused {
        require(!isPublisher[msg.sender], "Already subscribed");
        require(_sites.length > 0, "At least one site required");
        require(!bannedUsers[msg.sender], "User is banned");
        
        Publisher storage publisher = publishers[msg.sender];
        publisher.wallet = msg.sender;
        publisher.banned = false;
        publisher.totalEarned = 0;
        publisher.totalClaimed = 0;
        publisher.verified = false;
        publisher.subscriptionDate = block.timestamp;
        
        // Add sites
        for (uint256 i = 0; i < _sites.length; i++) {
            publisher.sites.push(_sites[i]);
        }
        
        isPublisher[msg.sender] = true;
        
        emit PublisherSubscribed(msg.sender, _sites, block.timestamp);
    }
    
    /**
     * @dev Add a new site to publisher's list
     * @param _site Website domain to add
     */
    function addSite(string calldata _site) external onlyPublisher {
        require(bytes(_site).length > 0, "Site cannot be empty");
        
        publishers[msg.sender].sites.push(_site);
        emit SiteAdded(msg.sender, _site);
    }
    
    /**
     * @dev Remove a site from publisher's list
     * @param _siteIndex Index of site to remove
     */
    function removeSite(uint256 _siteIndex) external onlyPublisher {
        Publisher storage publisher = publishers[msg.sender];
        require(_siteIndex < publisher.sites.length, "Invalid site index");
        
        string memory siteToRemove = publisher.sites[_siteIndex];
        
        // Remove site by swapping with last element
        publisher.sites[_siteIndex] = publisher.sites[publisher.sites.length - 1];
        publisher.sites.pop();
        
        emit SiteRemoved(msg.sender, siteToRemove);
    }
    
    /**
     * @dev Get publisher's sites
     * @param _publisher Publisher address
     * @return Array of site domains
     */
    function getPublisherSites(address _publisher) external view returns (string[] memory) {
        return publishers[_publisher].sites;
    }
    
    // ============ CLAIM ORDER FUNCTIONS ============
    
    /**
     * @dev Create a claim order for rewards
     * @param _campaignId Campaign ID to claim from
     * @param _requestedAmount Amount to claim
     */
    function createClaimOrder(
        uint256 _campaignId,
        uint256 _requestedAmount
    ) external onlyPublisher campaignExists(_campaignId) campaignActive(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(_requestedAmount > 0, "Amount must be greater than 0");
        require(
            campaign.spent + _requestedAmount <= campaign.amount,
            "Exceeds campaign budget"
        );
        
        claimOrderCount++;
        uint256 orderId = claimOrderCount;
        
        claimOrders[orderId] = ClaimOrder({
            id: orderId,
            publisher: msg.sender,
            campaignId: _campaignId,
            requestedAmount: _requestedAmount,
            approvedAmount: 0,
            processed: false,
            rejected: false,
            reason: "",
            createdAt: block.timestamp,
            processedAt: 0
        });
        
        emit ClaimOrderCreated(orderId, msg.sender, _campaignId, _requestedAmount);
    }
    
    /**
     * @dev Process a claim order (Admin only)
     * @param _orderId Order ID to process
     * @param _approvedAmount Amount to approve (can be different from requested)
     * @param _rejected Whether to reject the order
     * @param _reason Reason for rejection or approval
     */
    function processClaimOrder(
        uint256 _orderId,
        uint256 _approvedAmount,
        bool _rejected,
        string calldata _reason
    ) external onlyOwner {
        require(_orderId > 0 && _orderId <= claimOrderCount, "Order does not exist");
        
        ClaimOrder storage order = claimOrders[_orderId];
        require(!order.processed, "Order already processed");
        
        order.processed = true;
        order.processedAt = block.timestamp;
        order.reason = _reason;
        
        if (_rejected) {
            order.rejected = true;
            order.approvedAmount = 0;
        } else {
            order.rejected = false;
            order.approvedAmount = _approvedAmount;
            
            // Transfer approved amount to publisher
            Campaign storage campaign = campaigns[order.campaignId];
            require(
                campaign.spent + _approvedAmount <= campaign.amount,
                "Exceeds campaign budget"
            );
            
            // Calculate fee
            uint256 fee = (_approvedAmount * feePercent) / 100;
            uint256 netAmount = _approvedAmount - fee;
            
            // Update campaign spent amount
            campaign.spent += _approvedAmount;
            
            // Update publisher stats
            publishers[order.publisher].totalEarned += netAmount;
            publishers[order.publisher].totalClaimed += netAmount;
            
            // Add to protocol fees
            protocolFees += fee;
            
            // Transfer tokens to publisher
            IERC20(campaign.token).transfer(order.publisher, netAmount);
        }
        
        emit ClaimOrderProcessed(_orderId, order.approvedAmount, order.rejected, _reason);
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Ban a user
     * @param _user User address to ban
     * @param _reason Reason for banning
     */
    function banUser(address _user, string calldata _reason) external onlyOwner {
        require(_user != address(0), "Invalid address");
        require(!bannedUsers[_user], "User already banned");
        
        bannedUsers[_user] = true;
        if (isPublisher[_user]) {
            publishers[_user].banned = true;
        }
        
        emit PublisherBanned(_user, _reason);
    }
    
    /**
     * @dev Unban a user
     * @param _user User address to unban
     */
    function unbanUser(address _user) external onlyOwner {
        require(bannedUsers[_user], "User not banned");
        
        bannedUsers[_user] = false;
        if (isPublisher[_user]) {
            publishers[_user].banned = false;
        }
        
        emit PublisherUnbanned(_user);
    }
    
    /**
     * @dev Disburse funds manually (Admin only)
     * @param _campaignId Campaign ID
     * @param _recipient Recipient address
     * @param _amount Amount to disburse
     */
    function disburseFunds(
        uint256 _campaignId,
        address _recipient,
        uint256 _amount
    ) external onlyOwner campaignExists(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(_amount > 0, "Amount must be greater than 0");
        require(
            campaign.spent + _amount <= campaign.amount,
            "Exceeds campaign budget"
        );
        
        campaign.spent += _amount;
        IERC20(campaign.token).transfer(_recipient, _amount);
        
        emit FundsDisbursed(_campaignId, _recipient, _amount);
    }
    
    /**
     * @dev Collect protocol fees
     * @param _token Token address to collect fees from
     * @param _amount Amount to collect
     */
    function collectFees(address _token, uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= protocolFees, "Exceeds available fees");
        
        protocolFees -= _amount;
        IERC20(_token).transfer(owner(), _amount);
        
        emit FeeCollected(owner(), _amount);
    }
    
    /**
     * @dev Add supported ERC20 token
     * @param _token Token address to add
     */
    function addSupportedToken(address _token) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        require(!supportedTokens[_token], "Token already supported");
        
        supportedTokens[_token] = true;
        supportedTokensList.push(_token);
        
        emit SupportedTokenAdded(_token);
    }
    
    /**
     * @dev Remove supported ERC20 token
     * @param _token Token address to remove
     */
    function removeSupportedToken(address _token) external onlyOwner {
        require(supportedTokens[_token], "Token not supported");
        
        supportedTokens[_token] = false;
        
        // Remove from array
        for (uint256 i = 0; i < supportedTokensList.length; i++) {
            if (supportedTokensList[i] == _token) {
                supportedTokensList[i] = supportedTokensList[supportedTokensList.length - 1];
                supportedTokensList.pop();
                break;
            }
        }
        
        emit SupportedTokenRemoved(_token);
    }
    
    /**
     * @dev Set protocol fee percentage
     * @param _feePercent New fee percentage (basis points)
     */
    function setFeePercent(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= 1000, "Fee cannot exceed 10%"); // Max 10%
        feePercent = _feePercent;
    }
    
    /**
     * @dev Pause the entire contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the entire contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get campaign details
     * @param _campaignId Campaign ID
     * @return Campaign struct
     */
    function getCampaign(uint256 _campaignId) external view returns (Campaign memory) {
        return campaigns[_campaignId];
    }
    
    /**
     * @dev Get claim order details
     * @param _orderId Order ID
     * @return ClaimOrder struct
     */
    function getClaimOrder(uint256 _orderId) external view returns (ClaimOrder memory) {
        return claimOrders[_orderId];
    }
    
    /**
     * @dev Get publisher details
     * @param _publisher Publisher address
     * @return Publisher struct
     */
    function getPublisher(address _publisher) external view returns (Publisher memory) {
        return publishers[_publisher];
    }
    
    /**
     * @dev Get all supported tokens
     * @return Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokensList;
    }
    
    /**
     * @dev Get active campaigns count
     * @return Number of active campaigns
     */
    function getActiveCampaignsCount() external view returns (uint256) {
        return activeCampaigns.length;
    }
    
    /**
     * @dev Get total protocol fees
     * @return Total accumulated fees
     */
    function getTotalProtocolFees() external view returns (uint256) {
        return protocolFees;
    }
    
    /**
     * @dev Check if user is banned
     * @param _user User address
     * @return True if banned
     */
    function isUserBanned(address _user) external view returns (bool) {
        return bannedUsers[_user];
    }
}
