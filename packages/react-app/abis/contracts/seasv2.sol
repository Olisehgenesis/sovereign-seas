// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SovereignSeas V2
 * @dev A decentralized voting system where users vote on their favorite projects using native CELO tokens
 */
contract SovereignSeas is Ownable(msg.sender), ReentrancyGuard {
    // Platform fee (15%)
    uint256 public constant PLATFORM_FEE = 15;

    // Creation fees
    uint256 public constant CAMPAIGN_CREATION_FEE = 2 ether; // 2 CELO
    uint256 public constant PROJECT_CREATION_FEE = 1 ether;  // 1 CELO

    // Total accumulated fees
    uint256 public totalCreationFees;

    // Super admins mapping
    mapping(address => bool) public superAdmins;

    // Campaign struct
    struct Campaign {
        uint256 id;
        address admin;
        string name;
        string description;
        string logo;          // Added logo field
        string demoVideo;     // Added demo video field
        uint256 startTime;
        uint256 endTime;
        uint256 adminFeePercentage;
        uint256 voteMultiplier; // 1-5 votes per CELO
        uint256 maxWinners; // Maximum number of winning projects
        bool useQuadraticDistribution; // Whether to distribute funds quadratically
        bool active;
        uint256 totalFunds;
        mapping(address => bool) campaignAdmins; // Multiple admins for a campaign
    }

    // Project struct
    struct Project {
        uint256 id;
        uint256 campaignId;
        address payable owner;
        string name;
        string description;
        string githubLink; // Optional GitHub repository link
        string socialLink; // Optional social media link
        string testingLink; // Optional testing/demo link
        string logo;       // Added logo field
        string demoVideo;  // Added demo video field
        address[] contracts; // Added contracts list field
        bool approved;
        bool active;       // Flag to mark if project is active
        uint256 voteCount;
        uint256 fundsReceived;
    }

    // Vote struct
    struct Vote {
        address voter;
        uint256 campaignId;
        uint256 projectId;
        uint256 amount;
        uint256 voteCount;
    }

    // Storage
    Campaign[] public campaigns;
    mapping(uint256 => Project[]) public campaignProjects;
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userVotes; // campaignId => user => projectId => voteAmount
    mapping(uint256 => mapping(address => uint256)) public totalUserVotesInCampaign; // campaignId => user => totalVotes
    mapping(address => Vote[]) public userVoteHistory;

    // Events
    event CampaignCreated(uint256 indexed campaignId, address indexed admin, string name);
    event CampaignUpdated(uint256 indexed campaignId, address indexed updatedBy);
    event CampaignDeactivated(uint256 indexed campaignId, address indexed deactivatedBy);
    event ProjectSubmitted(uint256 indexed campaignId, uint256 indexed projectId, address indexed owner);
    event ProjectUpdated(uint256 indexed campaignId, uint256 indexed projectId, address indexed updatedBy);
    event ProjectApproved(uint256 indexed campaignId, uint256 indexed projectId);
    event ProjectDeactivated(uint256 indexed campaignId, uint256 indexed projectId, address indexed deactivatedBy);
    event VoteCast(
        address indexed voter, uint256 indexed campaignId, uint256 indexed projectId, uint256 amount, uint256 voteCount
    );
    event FundsDistributed(uint256 indexed campaignId);
    event SuperAdminAdded(address indexed newSuperAdmin, address indexed addedBy);
    event SuperAdminRemoved(address indexed superAdmin, address indexed removedBy);
    event CampaignAdminAdded(uint256 indexed campaignId, address indexed newAdmin, address indexed addedBy);
    event CampaignAdminRemoved(uint256 indexed campaignId, address indexed admin, address indexed removedBy);
    event CreationFeesWithdrawn(address indexed superAdmin, uint256 amount);

    /**
     * @dev Constructor adds deployer as super admin
     */
    constructor() {
        superAdmins[msg.sender] = true;
    }

    /**
     * @dev Modifier to check if caller is a super admin
     */
    modifier onlySuperAdmin() {
        require(superAdmins[msg.sender], "Only super admin can call this function");
        _;
    }

    /**
     * @dev Modifier to check if caller is a campaign admin
     */
    modifier onlyCampaignAdmin(uint256 _campaignId) {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        require(
            msg.sender == campaigns[_campaignId].admin || 
            campaigns[_campaignId].campaignAdmins[msg.sender] || 
            superAdmins[msg.sender],
            "Only campaign admin or super admin can call this function"
        );
        _;
    }

    /**
     * @dev Add a new super admin
     * @param _newSuperAdmin Address of the new super admin
     */
    function addSuperAdmin(address _newSuperAdmin) external onlySuperAdmin {
        require(_newSuperAdmin != address(0), "Invalid address");
        require(!superAdmins[_newSuperAdmin], "Already a super admin");
        
        superAdmins[_newSuperAdmin] = true;
        emit SuperAdminAdded(_newSuperAdmin, msg.sender);
    }

    /**
     * @dev Remove a super admin
     * @param _superAdmin Address of the super admin to remove
     */
    function removeSuperAdmin(address _superAdmin) external onlySuperAdmin {
        require(_superAdmin != msg.sender, "Cannot remove yourself");
        require(superAdmins[_superAdmin], "Not a super admin");
        
        superAdmins[_superAdmin] = false;
        emit SuperAdminRemoved(_superAdmin, msg.sender);
    }

    /**
     * @dev Add a campaign admin
     * @param _campaignId Campaign ID
     * @param _newAdmin Address of the new campaign admin
     */
    function addCampaignAdmin(uint256 _campaignId, address _newAdmin) external onlyCampaignAdmin(_campaignId) {
        require(_newAdmin != address(0), "Invalid address");
        require(!campaigns[_campaignId].campaignAdmins[_newAdmin], "Already an admin for this campaign");
        
        campaigns[_campaignId].campaignAdmins[_newAdmin] = true;
        emit CampaignAdminAdded(_campaignId, _newAdmin, msg.sender);
    }

    /**
     * @dev Remove a campaign admin
     * @param _campaignId Campaign ID
     * @param _admin Address of the admin to remove
     */
    function removeCampaignAdmin(uint256 _campaignId, address _admin) external onlyCampaignAdmin(_campaignId) {
        require(_admin != campaigns[_campaignId].admin, "Cannot remove primary admin");
        require(campaigns[_campaignId].campaignAdmins[_admin], "Not an admin for this campaign");
        
        campaigns[_campaignId].campaignAdmins[_admin] = false;
        emit CampaignAdminRemoved(_campaignId, _admin, msg.sender);
    }

    /**
     * @dev Check if an address is a campaign admin
     * @param _campaignId Campaign ID
     * @param _admin Address to check
     * @return Boolean indicating if the address is a campaign admin
     */
    function isCampaignAdmin(uint256 _campaignId, address _admin) external view returns (bool) {
        if (_campaignId >= campaigns.length) return false;
        return campaigns[_campaignId].admin == _admin || 
               campaigns[_campaignId].campaignAdmins[_admin] || 
               superAdmins[_admin];
    }

    /**
     * @dev Create a new campaign
     * @param _name Campaign name
     * @param _description Campaign description
     * @param _logo Campaign logo URL/IPFS hash
     * @param _demoVideo Campaign demo video URL/IPFS hash
     * @param _startTime Start time (unix timestamp)
     * @param _endTime End time (unix timestamp)
     * @param _adminFeePercentage Percentage fee for the admin (must be reasonable)
     * @param _voteMultiplier Vote multiplier (1-5)
     * @param _maxWinners Maximum number of winning projects (0 for no limit)
     * @param _useQuadraticDistribution Whether to distribute funds quadratically
     */
    function createCampaign(
        string memory _name,
        string memory _description,
        string memory _logo,
        string memory _demoVideo,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _adminFeePercentage,
        uint256 _voteMultiplier,
        uint256 _maxWinners,
        bool _useQuadraticDistribution
    ) external payable {
        require(_startTime > block.timestamp, "Start time must be in the future");
        require(_endTime > _startTime, "End time must be after start time");
        require(_adminFeePercentage <= 30, "Admin fee too high");
        require(_voteMultiplier >= 1 && _voteMultiplier <= 5, "Vote multiplier must be 1-5");

        // Collect campaign creation fee
        require(msg.value == CAMPAIGN_CREATION_FEE, "Must send exact campaign creation fee");
        totalCreationFees += CAMPAIGN_CREATION_FEE;

        uint256 campaignId = campaigns.length;
        Campaign storage newCampaign = campaigns.push();
        
        newCampaign.id = campaignId;
        newCampaign.admin = msg.sender;
        newCampaign.name = _name;
        newCampaign.description = _description;
        newCampaign.logo = _logo;
        newCampaign.demoVideo = _demoVideo;
        newCampaign.startTime = _startTime;
        newCampaign.endTime = _endTime;
        newCampaign.adminFeePercentage = _adminFeePercentage;
        newCampaign.voteMultiplier = _voteMultiplier;
        newCampaign.maxWinners = _maxWinners;
        newCampaign.useQuadraticDistribution = _useQuadraticDistribution;
        newCampaign.active = true;
        newCampaign.totalFunds = 0;
        
        // Add creator as campaign admin
        newCampaign.campaignAdmins[msg.sender] = true;

        emit CampaignCreated(campaignId, msg.sender, _name);
    }

    /**
     * @dev Update campaign details (only non-critical parameters)
     * @param _campaignId Campaign ID
     * @param _name New campaign name
     * @param _description New campaign description
     * @param _logo New campaign logo
     * @param _demoVideo New campaign demo video
     * @param _startTime New start time (only if campaign hasn't started)
     * @param _endTime New end time
     * @param _adminFeePercentage New admin fee percentage
     */
    function updateCampaign(
        uint256 _campaignId,
        string memory _name,
        string memory _description,
        string memory _logo,
        string memory _demoVideo,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _adminFeePercentage
    ) external onlyCampaignAdmin(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        
        // Can only update start time if campaign hasn't started yet
        if (block.timestamp < campaign.startTime) {
            require(_startTime > block.timestamp, "Start time must be in the future");
            require(_endTime > _startTime, "End time must be after start time");
            campaign.startTime = _startTime;
        } else {
            require(_endTime > block.timestamp, "End time must be in the future");
        }
        
        campaign.name = _name;
        campaign.description = _description;
        campaign.logo = _logo;
        campaign.demoVideo = _demoVideo;
        campaign.endTime = _endTime;
        
        // Admin fee can only be reduced, not increased
        require(_adminFeePercentage <= campaign.adminFeePercentage, "Cannot increase admin fee");
        campaign.adminFeePercentage = _adminFeePercentage;
        
        emit CampaignUpdated(_campaignId, msg.sender);
    }

    /**
     * @dev Submit a project to a campaign
     * @param _campaignId Campaign ID
     * @param _name Project name
     * @param _description Project description
     * @param _githubLink GitHub repository link (optional)
     * @param _socialLink Social media link (optional)
     * @param _testingLink Testing/demo link (optional)
     * @param _logo Project logo URL/IPFS hash (optional)
     * @param _demoVideo Project demo video URL/IPFS hash (optional)
     * @param _contracts Array of contract addresses related to the project (optional)
     */
    function submitProject(
        uint256 _campaignId,
        string memory _name,
        string memory _description,
        string memory _githubLink,
        string memory _socialLink,
        string memory _testingLink,
        string memory _logo,
        string memory _demoVideo,
        address[] memory _contracts
    ) external payable {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        require(block.timestamp < campaign.endTime, "Campaign has ended");

        // Check if the submitter is a campaign admin
        bool isAdmin = (msg.sender == campaign.admin || 
                        campaign.campaignAdmins[msg.sender] || 
                        superAdmins[msg.sender]);

        // Only collect fee if not admin
        if (!isAdmin) {
            require(msg.value == PROJECT_CREATION_FEE, "Must send exact project creation fee");
            totalCreationFees += PROJECT_CREATION_FEE;
        }

        uint256 projectId = campaignProjects[_campaignId].length;
        Project memory newProject = Project({
            id: projectId,
            campaignId: _campaignId,
            owner: payable(msg.sender),
            name: _name,
            description: _description,
            githubLink: _githubLink,
            socialLink: _socialLink,
            testingLink: _testingLink,
            logo: _logo,
            demoVideo: _demoVideo,
            contracts: _contracts,
            // Auto-approve if submitted by admin
            approved: isAdmin,
            active: true,
            voteCount: 0,
            fundsReceived: 0
        });
        
        campaignProjects[_campaignId].push(newProject);

        emit ProjectSubmitted(_campaignId, projectId, msg.sender);
    }

    /**
     * @dev Update project details (only by project owner)
     * @param _campaignId Campaign ID
     * @param _projectId Project ID
     * @param _name New project name
     * @param _description New project description
     * @param _githubLink New GitHub repository link
     * @param _socialLink New social media link
     * @param _testingLink New testing/demo link
     * @param _logo New project logo
     * @param _demoVideo New project demo video
     * @param _contracts New array of contract addresses
     */
    function updateProject(
        uint256 _campaignId,
        uint256 _projectId,
        string memory _name,
        string memory _description,
        string memory _githubLink,
        string memory _socialLink,
        string memory _testingLink,
        string memory _logo,
        string memory _demoVideo,
        address[] memory _contracts
    ) external {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        require(block.timestamp < campaign.endTime, "Campaign has ended");
        require(_projectId < campaignProjects[_campaignId].length, "Project does not exist");
        
        Project storage project = campaignProjects[_campaignId][_projectId];
        require(msg.sender == project.owner || campaign.campaignAdmins[msg.sender] || superAdmins[msg.sender], 
                "Only project owner or admins can update");
        require(project.active, "Project is not active");
        
        // Don't allow updates to approved projects with votes to maintain fairness
        if (project.approved && project.voteCount > 0) {
            // For approved projects with votes, only allow updating links and media
            project.githubLink = _githubLink;
            project.socialLink = _socialLink;
            project.testingLink = _testingLink;
            project.logo = _logo;
            project.demoVideo = _demoVideo;
            project.contracts = _contracts;
        } else {
            // For unapproved projects or those without votes, allow full updates
            project.name = _name;
            project.description = _description;
            project.githubLink = _githubLink;
            project.socialLink = _socialLink;
            project.testingLink = _testingLink;
            project.logo = _logo;
            project.demoVideo = _demoVideo;
            project.contracts = _contracts;
        }
        
        emit ProjectUpdated(_campaignId, _projectId, msg.sender);
    }

    /**
     * @dev Approve a project for voting
     * @param _campaignId Campaign ID
     * @param _projectId Project ID
     */
    function approveProject(uint256 _campaignId, uint256 _projectId) external onlyCampaignAdmin(_campaignId) {
        require(_projectId < campaignProjects[_campaignId].length, "Project does not exist");

        Project storage project = campaignProjects[_campaignId][_projectId];
        require(!project.approved, "Project already approved");
        require(project.active, "Project is not active");

        project.approved = true;

        emit ProjectApproved(_campaignId, _projectId);
    }
    
    /**
     * @dev Deactivate a project (only by campaign admin or super admin)
     * @param _campaignId Campaign ID
     * @param _projectId Project ID
     */
    function deactivateProject(uint256 _campaignId, uint256 _projectId) external onlyCampaignAdmin(_campaignId) {
        require(_projectId < campaignProjects[_campaignId].length, "Project does not exist");
        
        Project storage project = campaignProjects[_campaignId][_projectId];
        require(project.active, "Project is already inactive");
        
        // Can only deactivate projects that haven't received votes
        require(project.voteCount == 0, "Cannot deactivate project with votes");
        
        project.active = false;
        
        emit ProjectDeactivated(_campaignId, _projectId, msg.sender);
    }
    
    /**
     * @dev Deactivate a campaign (only by super admin)
     * @param _campaignId Campaign ID
     */
    function deactivateCampaign(uint256 _campaignId) external onlySuperAdmin {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign already inactive");
        
        // If campaign has funds, check if it's started
        if (campaign.totalFunds > 0) {
            // Only allow deactivation if campaign hasn't started
            require(block.timestamp < campaign.startTime, "Cannot deactivate active campaign with funds");
            
            // Return funds to platform
            (bool success, ) = payable(owner()).call{value: campaign.totalFunds}("");
            require(success, "Transfer to owner failed");
        }
        
        campaign.active = false;
        
        emit CampaignDeactivated(_campaignId, msg.sender);
    }

    /**
     * @dev Vote for a project using native CELO tokens
     * @param _campaignId Campaign ID
     * @param _projectId Project ID
     */
    function vote(uint256 _campaignId, uint256 _projectId) external payable nonReentrant {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        require(block.timestamp >= campaign.startTime, "Campaign has not started");
        require(block.timestamp <= campaign.endTime, "Campaign has ended");
        require(_projectId < campaignProjects[_campaignId].length, "Project does not exist");

        Project storage project = campaignProjects[_campaignId][_projectId];
        require(project.approved, "Project is not approved");
        require(project.active, "Project is not active");
        require(msg.value > 0, "Amount must be greater than 0");

        uint256 amount = msg.value;

        // Calculate vote count based on vote multiplier
        uint256 voteCount = amount * campaign.voteMultiplier;

        // Update vote tracking
        userVotes[_campaignId][msg.sender][_projectId] += amount;
        totalUserVotesInCampaign[_campaignId][msg.sender] += amount;

        // Update project vote count
        project.voteCount += voteCount;

        // Update campaign total funds
        campaign.totalFunds += amount;

        // Record vote in user history
        userVoteHistory[msg.sender].push(
            Vote({
                voter: msg.sender,
                campaignId: _campaignId,
                projectId: _projectId,
                amount: amount,
                voteCount: voteCount
            })
        );

        emit VoteCast(msg.sender, _campaignId, _projectId, amount, voteCount);
    }

    /**
 * @dev Distribute funds after campaign ends
 * @param _campaignId Campaign ID
 */
function distributeFunds(uint256 _campaignId) external nonReentrant onlyCampaignAdmin(_campaignId) {
    Campaign storage campaign = campaigns[_campaignId];
    require(campaign.active, "Campaign already finalized");
    require(block.timestamp > campaign.endTime || superAdmins[msg.sender], "Campaign has not ended or caller is not super admin");

    // Mark campaign as inactive
    campaign.active = false;

    // Get total votes in campaign
    uint256 totalVotes = 0;
    for (uint256 i = 0; i < campaignProjects[_campaignId].length; i++) {
        if (campaignProjects[_campaignId][i].approved && campaignProjects[_campaignId][i].active) {
            totalVotes += campaignProjects[_campaignId][i].voteCount;
        }
    }

    // If no votes, return funds to platform
    if (totalVotes == 0) {
        (bool success, ) = payable(owner()).call{value: campaign.totalFunds}("");
        require(success, "Transfer to owner failed");
        emit FundsDistributed(_campaignId);
        return;
    }

    // Calculate fees
    uint256 platformFeeAmount = (campaign.totalFunds * PLATFORM_FEE) / 100;
    uint256 adminFeeAmount = (campaign.totalFunds * campaign.adminFeePercentage) / 100;
    uint256 remainingFunds = campaign.totalFunds - platformFeeAmount - adminFeeAmount;

    // Transfer platform fee
    (bool platformFeeSuccess, ) = payable(owner()).call{value: platformFeeAmount}("");
    require(platformFeeSuccess, "Platform fee transfer failed");

    // Transfer admin fee
    (bool adminFeeSuccess, ) = payable(campaign.admin).call{value: adminFeeAmount}("");
    require(adminFeeSuccess, "Admin fee transfer failed");

    // Determine winning projects
    Project[] memory sortedProjects = getSortedProjectsByCampaign(_campaignId);

    // Determine number of winners
    uint256 winnersCount;
    if (campaign.maxWinners == 0 || campaign.maxWinners >= sortedProjects.length) {
        // If maxWinners is 0 or greater than available projects, all projects with votes win
        winnersCount = sortedProjects.length;
    } else {
        winnersCount = campaign.maxWinners;
    }

    // Only count projects with votes
    uint256 actualWinners = 0;
    for (uint256 i = 0; i < winnersCount; i++) {
        if (i < sortedProjects.length && sortedProjects[i].voteCount > 0) {
            actualWinners++;
        } else {
            break;
        }
    }

    if (actualWinners == 0) {
        // No winners with votes, return funds to platform
        (bool returnSuccess, ) = payable(owner()).call{value: remainingFunds}("");
        require(returnSuccess, "Transfer to owner failed");
        return;
    }

    // Calculate distribution
    if (campaign.useQuadraticDistribution) {
        // Quadratic distribution (square root of votes for weighting)
        uint256[] memory weights = new uint256[](actualWinners);
        uint256 totalWeight = 0;

        // Calculate square roots of vote counts as weights
        for (uint256 i = 0; i < actualWinners; i++) {
            // Use sqrt approximation: a reasonable approximation for uint
            weights[i] = sqrt(sortedProjects[i].voteCount);
            totalWeight += weights[i];
        }

        // Distribute based on quadratic weights
        for (uint256 i = 0; i < actualWinners; i++) {
            Project storage project = campaignProjects[_campaignId][sortedProjects[i].id];
            if (project.approved && project.active && project.voteCount > 0) {
                uint256 projectShare = (remainingFunds * weights[i]) / totalWeight;
                project.fundsReceived = projectShare;
                (bool success, ) = project.owner.call{value: projectShare}("");
                require(success, "Transfer to project owner failed");
            }
        }
    } else {
        // Linear distribution (direct proportional to votes)
        
        // First, check if there are projects with tied votes at the cutoff position
        uint256 lastPosition = actualWinners - 1;
        uint256 tiedCount = 1; // At least the last winner is in this position
        uint256 cutoffVotes = 0;
        
        if (actualWinners > 0 && actualWinners < sortedProjects.length) {
            cutoffVotes = sortedProjects[lastPosition].voteCount;
            
            // Count additional projects that have the same votes as the last position
            for (uint256 i = actualWinners; i < sortedProjects.length; i++) {
                if (sortedProjects[i].voteCount == cutoffVotes) {
                    tiedCount++;
                } else {
                    break; // No more tied projects
                }
            }
        }
        
        // Total winning votes (excluding ties if needed)
        uint256 totalWinningVotes = 0;
        for (uint256 i = 0; i < lastPosition; i++) {
            totalWinningVotes += sortedProjects[i].voteCount;
        }
        
        // Handle distribution based on whether there are ties
        if (tiedCount > 1) {
            // There are tied projects at the cutoff position
            
            // Calculate share for definite winners (positions 0 to lastPosition-1)
            for (uint256 i = 0; i < lastPosition; i++) {
                Project storage project = campaignProjects[_campaignId][sortedProjects[i].id];
                if (project.approved && project.active && project.voteCount > 0) {
                    uint256 projectShare = (remainingFunds * project.voteCount) / totalWinningVotes;
                    project.fundsReceived = projectShare;
                    (bool success, ) = project.owner.call{value: projectShare}("");
                    require(success, "Transfer to project owner failed");
                }
            }
            
            // Calculate remaining funds after paying definite winners
            uint256 remainingForTied = remainingFunds;
            for (uint256 i = 0; i < lastPosition; i++) {
                remainingForTied -= (remainingFunds * sortedProjects[i].voteCount) / totalWinningVotes;
            }
            
            // Divide the remaining portion equally among tied projects
            uint256 tieShare = remainingForTied / tiedCount;
            
            // Distribute to tied projects at the cutoff position
            for (uint256 i = lastPosition; i < lastPosition + tiedCount; i++) {
                if (i < sortedProjects.length) {
                    Project storage project = campaignProjects[_campaignId][sortedProjects[i].id];
                    if (project.approved && project.active && project.voteCount > 0) {
                        project.fundsReceived = tieShare;
                        (bool success, ) = project.owner.call{value: tieShare}("");
                        require(success, "Transfer to project owner failed");
                    }
                }
            }
        } else {
            // No ties, proceed with normal distribution
            totalWinningVotes += cutoffVotes; // Add last position votes
            
            for (uint256 i = 0; i < actualWinners; i++) {
                Project storage project = campaignProjects[_campaignId][sortedProjects[i].id];
                if (project.approved && project.active && project.voteCount > 0) {
                    uint256 projectShare = (remainingFunds * project.voteCount) / totalWinningVotes;
                    project.fundsReceived = projectShare;
                    (bool success, ) = project.owner.call{value: projectShare}("");
                    require(success, "Transfer to project owner failed");
                }
            }
        }
    }

    emit FundsDistributed(_campaignId);
}

    /**
     * @dev Allows super admins to withdraw creation fees
     * @param _amount Amount to withdraw (0 to withdraw all)
     */
    function withdrawCreationFees(uint256 _amount) external nonReentrant onlySuperAdmin {
        uint256 withdrawAmount = _amount == 0 ? totalCreationFees : _amount;
        require(withdrawAmount <= totalCreationFees, "Insufficient creation fees");
        
        totalCreationFees -= withdrawAmount;
        
        (bool success, ) = payable(msg.sender).call{value: withdrawAmount}("");
        require(success, "Transfer failed");
        
        emit CreationFeesWithdrawn(msg.sender, withdrawAmount);
    }
    
    /**
     * @dev Get available creation fees for withdrawal
     * @return Total accumulated creation fees
     */
    function getAvailableCreationFees() external view returns (uint256) {
        return totalCreationFees;
    }

    // View functions

    /**
     * @dev Get campaign count
     * @return Number of campaigns
     */
    function getCampaignCount() external view returns (uint256) {
        return campaigns.length;
    }

    /**
     * @dev Get project count for a campaign
     * @param _campaignId Campaign ID
     * @return Number of projects
     */
    function getProjectCount(uint256 _campaignId) external view returns (uint256) {
        return campaignProjects[_campaignId].length;
    }

    /**
     * @dev Get votes for a project from a user
     * @param _campaignId Campaign ID
     * @param _user User address
     * @param _projectId Project ID
     * @return Amount of CELO tokens used for voting
     */
    function getUserVotesForProject(uint256 _campaignId, address _user, uint256 _projectId)
        external
        view
        returns (uint256)
    {
        return userVotes[_campaignId][_user][_projectId];
    }

    /**
     * @dev Get total votes for a user in a campaign
     * @param _campaignId Campaign ID
     * @param _user User address
     * @return Total amount of CELO tokens used for voting
     */
    function getUserTotalVotesInCampaign(uint256 _campaignId, address _user) external view returns (uint256) {
        return totalUserVotesInCampaign[_campaignId][_user];
    }

    /**
     * @dev Get campaign details
     * @param _campaignId Campaign ID
     * @return id Campaign ID
     * @return admin Campaign admin address
     * @return name Campaign name
     * @return description Campaign description
     * @return logo Campaign logo URL/IPFS hash
     * @return demoVideo Campaign demo video URL/IPFS hash
     * @return startTime Campaign start time
     * @return endTime Campaign end time
     * @return adminFeePercentage Admin fee percentage
     * @return voteMultiplier Vote multiplier
     * @return maxWinners Maximum number of winners
     * @return useQuadraticDistribution Whether quadratic distribution is used
     * @return active Whether campaign is active
     * @return totalFunds Total funds collected
     */
    function getCampaign(uint256 _campaignId) external view returns (
        uint256 id,
        address admin,
        string memory name,
        string memory description,
        string memory logo,
        string memory demoVideo,
        uint256 startTime,
        uint256 endTime,
        uint256 adminFeePercentage,
        uint256 voteMultiplier,
        uint256 maxWinners,
        bool useQuadraticDistribution,
        bool active,
        uint256 totalFunds
    ) {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        
        return (
            campaign.id,
            campaign.admin,
            campaign.name,
            campaign.description,
            campaign.logo,
            campaign.demoVideo,
            campaign.startTime,
            campaign.endTime,
            campaign.adminFeePercentage,
            campaign.voteMultiplier,
            campaign.maxWinners,
            campaign.useQuadraticDistribution,
            campaign.active,
            campaign.totalFunds
        );
    }

    /**
     * @dev Get project details
     * @param _campaignId Campaign ID
     * @param _projectId Project ID
     * @return Project details
     */
    function getProject(uint256 _campaignId, uint256 _projectId) external view returns (Project memory) {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        require(_projectId < campaignProjects[_campaignId].length, "Project does not exist");
        return campaignProjects[_campaignId][_projectId];
    }

    /**
     * @dev Get user vote history
     * @param _user User address
     * @return Array of user votes
     */
    function getUserVoteHistory(address _user) external view returns (Vote[] memory) {
        return userVoteHistory[_user];
    }

    /**
     * @dev Helper function to get sorted projects by vote count (descending)
     * @param _campaignId Campaign ID
     * @return Sorted array of projects
     */
    function getSortedProjectsByCampaign(uint256 _campaignId) internal view returns (Project[] memory) {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        uint256 projectCount = campaignProjects[_campaignId].length;

        // Create a memory array of approved and active projects
        uint256 approvedCount = 0;
        for (uint256 i = 0; i < projectCount; i++) {
            if (campaignProjects[_campaignId][i].approved && campaignProjects[_campaignId][i].active) {
                approvedCount++;
            }
        }

        Project[] memory projects = new Project[](approvedCount);
        uint256 index = 0;
        for (uint256 i = 0; i < projectCount; i++) {
            if (campaignProjects[_campaignId][i].approved && campaignProjects[_campaignId][i].active) {
                projects[index] = campaignProjects[_campaignId][i];
                index++;
            }
        }

        // Sort projects by vote count (descending)
        for (uint256 i = 0; i < projects.length; i++) {
            for (uint256 j = i + 1; j < projects.length; j++) {
                if (projects[j].voteCount > projects[i].voteCount) {
                    Project memory temp = projects[i];
                    projects[i] = projects[j];
                    projects[j] = temp;
                }
            }
        }

        return projects;
    }

    /**
     * @dev Get sorted list of projects for a campaign (for frontend)
     * @param _campaignId Campaign ID
     * @return Sorted array of projects
     */
    function getSortedProjects(uint256 _campaignId) external view returns (Project[] memory) {
        return getSortedProjectsByCampaign(_campaignId);
    }

    /**
     * @dev Helper function to calculate square root of a number
     * @param x The number to calculate the square root of
     * @return y The square root of x
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}