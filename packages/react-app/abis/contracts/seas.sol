// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SovereignSeas
 * @dev A decentralized voting system where users vote on their favorite projects using CELO tokens
 */
contract SovereignSeas is Ownable(msg.sender), ReentrancyGuard {
    // CELO token interface
    IERC20 public celoToken;

    // Platform fee (15%)
    uint256 public constant PLATFORM_FEE = 15;

    // Campaign struct
    struct Campaign {
        uint256 id;
        address admin;
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 adminFeePercentage;
        uint256 voteMultiplier; // 1-5 votes per CELO
        uint256 maxWinners; // Maximum number of winning projects
        bool useQuadraticDistribution; // Whether to distribute funds quadratically
        bool active;
        uint256 totalFunds;
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
        bool approved;
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
    event ProjectSubmitted(uint256 indexed campaignId, uint256 indexed projectId, address indexed owner);
    event ProjectApproved(uint256 indexed campaignId, uint256 indexed projectId);
    event VoteCast(
        address indexed voter, uint256 indexed campaignId, uint256 indexed projectId, uint256 amount, uint256 voteCount
    );
    event FundsDistributed(uint256 indexed campaignId);

    /**
     * @dev Constructor sets the CELO token address
     * @param _celoToken Address of the CELO token
     */
    constructor(address _celoToken) {
        celoToken = IERC20(_celoToken);
    }

    /**
     * @dev Create a new campaign
     * @param _name Campaign name
     * @param _description Campaign description
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
        uint256 _startTime,
        uint256 _endTime,
        uint256 _adminFeePercentage,
        uint256 _voteMultiplier,
        uint256 _maxWinners,
        bool _useQuadraticDistribution
    ) external {
        require(_startTime > block.timestamp, "Start time must be in the future");
        require(_endTime > _startTime, "End time must be after start time");
        require(_adminFeePercentage <= 30, "Admin fee too high");
        require(_voteMultiplier >= 1 && _voteMultiplier <= 5, "Vote multiplier must be 1-5");

        uint256 campaignId = campaigns.length;
        campaigns.push(
            Campaign({
                id: campaignId,
                admin: msg.sender,
                name: _name,
                description: _description,
                startTime: _startTime,
                endTime: _endTime,
                adminFeePercentage: _adminFeePercentage,
                voteMultiplier: _voteMultiplier,
                maxWinners: _maxWinners,
                useQuadraticDistribution: _useQuadraticDistribution,
                active: true,
                totalFunds: 0
            })
        );

        emit CampaignCreated(campaignId, msg.sender, _name);
    }

    /**
     * @dev Submit a project to a campaign
     * @param _campaignId Campaign ID
     * @param _name Project name
     * @param _description Project description
     * @param _githubLink GitHub repository link (optional, can be empty)
     * @param _socialLink Social media link (optional, can be empty)
     * @param _testingLink Testing/demo link (optional, can be empty)
     */
    function submitProject(
        uint256 _campaignId,
        string memory _name,
        string memory _description,
        string memory _githubLink,
        string memory _socialLink,
        string memory _testingLink
    ) external {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        require(block.timestamp < campaign.endTime, "Campaign has ended");

        uint256 projectId = campaignProjects[_campaignId].length;
        campaignProjects[_campaignId].push(
            Project({
                id: projectId,
                campaignId: _campaignId,
                owner: payable(msg.sender),
                name: _name,
                description: _description,
                githubLink: _githubLink,
                socialLink: _socialLink,
                testingLink: _testingLink,
                approved: false,
                voteCount: 0,
                fundsReceived: 0
            })
        );

        emit ProjectSubmitted(_campaignId, projectId, msg.sender);
    }

    /**
     * @dev Approve a project for voting
     * @param _campaignId Campaign ID
     * @param _projectId Project ID
     */
    function approveProject(uint256 _campaignId, uint256 _projectId) external {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.admin, "Only campaign admin can approve");
        require(_projectId < campaignProjects[_campaignId].length, "Project does not exist");

        Project storage project = campaignProjects[_campaignId][_projectId];
        require(!project.approved, "Project already approved");

        project.approved = true;

        emit ProjectApproved(_campaignId, _projectId);
    }

    /**
     * @dev Vote for a project using CELO tokens
     * @param _campaignId Campaign ID
     * @param _projectId Project ID
     * @param _amount Amount of CELO to vote with
     */
    function vote(uint256 _campaignId, uint256 _projectId, uint256 _amount) external nonReentrant {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        require(block.timestamp >= campaign.startTime, "Campaign has not started");
        require(block.timestamp <= campaign.endTime, "Campaign has ended");
        require(_projectId < campaignProjects[_campaignId].length, "Project does not exist");

        Project storage project = campaignProjects[_campaignId][_projectId];
        require(project.approved, "Project is not approved");
        require(_amount > 0, "Amount must be greater than 0");

        // Calculate vote count based on vote multiplier
        uint256 voteCount = _amount * campaign.voteMultiplier;

        // Transfer CELO tokens from voter to contract
        require(celoToken.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");

        // Update vote tracking
        userVotes[_campaignId][msg.sender][_projectId] += _amount;
        totalUserVotesInCampaign[_campaignId][msg.sender] += _amount;

        // Update project vote count
        project.voteCount += voteCount;

        // Update campaign total funds
        campaign.totalFunds += _amount;

        // Record vote in user history
        userVoteHistory[msg.sender].push(
            Vote({
                voter: msg.sender,
                campaignId: _campaignId,
                projectId: _projectId,
                amount: _amount,
                voteCount: voteCount
            })
        );

        emit VoteCast(msg.sender, _campaignId, _projectId, _amount, voteCount);
    }

    /**
     * @dev Distribute funds after campaign ends
     * @param _campaignId Campaign ID
     */
    function distributeFunds(uint256 _campaignId) external nonReentrant {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(
            msg.sender == campaign.admin || msg.sender == owner(),
            "Only campaign admin or platform owner can distribute"
        );
        require(campaign.active, "Campaign already finalized");
        require(block.timestamp > campaign.endTime, "Campaign has not ended");

        // Mark campaign as inactive
        campaign.active = false;

        // Get total votes in campaign
        uint256 totalVotes = 0;
        for (uint256 i = 0; i < campaignProjects[_campaignId].length; i++) {
            if (campaignProjects[_campaignId][i].approved) {
                totalVotes += campaignProjects[_campaignId][i].voteCount;
            }
        }

        // If no votes, return funds to platform
        if (totalVotes == 0) {
            celoToken.transfer(owner(), campaign.totalFunds);
            emit FundsDistributed(_campaignId);
            return;
        }

        // Calculate fees
        uint256 platformFeeAmount = (campaign.totalFunds * PLATFORM_FEE) / 100;
        uint256 adminFeeAmount = (campaign.totalFunds * campaign.adminFeePercentage) / 100;
        uint256 remainingFunds = campaign.totalFunds - platformFeeAmount - adminFeeAmount;

        // Transfer platform fee
        celoToken.transfer(owner(), platformFeeAmount);

        // Transfer admin fee
        celoToken.transfer(campaign.admin, adminFeeAmount);

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
            celoToken.transfer(owner(), remainingFunds);
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
                if (project.approved && project.voteCount > 0) {
                    uint256 projectShare = (remainingFunds * weights[i]) / totalWeight;
                    project.fundsReceived = projectShare;
                    celoToken.transfer(project.owner, projectShare);
                }
            }
        } else {
            // Linear distribution (direct proportional to votes)
            uint256 totalWinningVotes = 0;
            for (uint256 i = 0; i < actualWinners; i++) {
                totalWinningVotes += sortedProjects[i].voteCount;
            }

            // Distribute based on vote proportion
            for (uint256 i = 0; i < actualWinners; i++) {
                Project storage project = campaignProjects[_campaignId][sortedProjects[i].id];
                if (project.approved && project.voteCount > 0) {
                    uint256 projectShare = (remainingFunds * project.voteCount) / totalWinningVotes;
                    project.fundsReceived = projectShare;
                    celoToken.transfer(project.owner, projectShare);
                }
            }
        }

        emit FundsDistributed(_campaignId);
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
     * @return Campaign details
     */
    function getCampaign(uint256 _campaignId) external view returns (Campaign memory) {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        return campaigns[_campaignId];
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

        // Create a memory array of approved projects
        uint256 approvedCount = 0;
        for (uint256 i = 0; i < projectCount; i++) {
            if (campaignProjects[_campaignId][i].approved) {
                approvedCount++;
            }
        }

        Project[] memory projects = new Project[](approvedCount);
        uint256 index = 0;
        for (uint256 i = 0; i < projectCount; i++) {
            if (campaignProjects[_campaignId][i].approved) {
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
