// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockSeas4
 * @dev Minimal mock of SovereignSeasV4 for testing milestone contract
 */
contract MockSeas4 is Ownable {
    IERC20 public celoToken;
    uint256 public nextProjectId;
    uint256 public nextCampaignId;
    
    mapping(uint256 => Project) public projects;
    mapping(uint256 => Campaign) public campaigns;
    mapping(address => bool) public superAdmins;
    mapping(address => bool) public supportedTokens;
    mapping(uint256 => mapping(address => bool)) public campaignAdmins;
    mapping(uint256 => uint256[]) private campaignProjects; // Track projects in campaigns
    mapping(uint256 => mapping(uint256 => bool)) private projectInCampaign; // Track if project is in campaign
    address public mentoTokenBroker;
    mapping(address => TokenExchangeProvider) private _tokenExchangeProviders;
    
    struct TokenExchangeProvider {
        address provider;
        bytes32 exchangeId;
        bool active;
    }
    
    struct Project {
        uint256 id;
        address owner;
        string name;
        string description;
        bool active;
        uint256 createdAt;
    }
    
    struct Campaign {
        uint256 id;
        address admin;
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 adminFeePercentage;
        uint256 maxWinners;
        bool useQuadraticDistribution;
        bool useCustomDistribution;
        address payoutToken;
        bool active;
        uint256 totalFunds;
    }
    
    constructor(address _celoToken) Ownable(msg.sender) {
        celoToken = IERC20(_celoToken);
        superAdmins[msg.sender] = true;
        supportedTokens[_celoToken] = true;
        mentoTokenBroker = address(0); // Can be set later
    }
    
    function addSupportedToken(address _token) external onlyOwner {
        supportedTokens[_token] = true;
    }
    
    function createProject(
        string memory _name,
        string memory _description,
        string memory,
        string memory,
        string memory,
        address[] memory,
        bool
    ) external {
        uint256 projectId = nextProjectId++;
        projects[projectId] = Project({
            id: projectId,
            owner: msg.sender,
            name: _name,
            description: _description,
            active: true,
            createdAt: block.timestamp
        });
    }
    
    function createCampaign(
        string memory _name,
        string memory _description,
        string memory,
        string memory,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _adminFeePercentage,
        uint256 _maxWinners,
        bool,
        bool,
        string memory,
        address _payoutToken,
        address
    ) external payable {
        uint256 campaignId = nextCampaignId++;
        campaigns[campaignId] = Campaign({
            id: campaignId,
            admin: msg.sender,
            name: _name,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            adminFeePercentage: _adminFeePercentage,
            maxWinners: _maxWinners,
            useQuadraticDistribution: false,
            useCustomDistribution: false,
            payoutToken: _payoutToken,
            active: true,
            totalFunds: 0
        });
        campaignAdmins[campaignId][msg.sender] = true;
    }
    
    function getProject(uint256 _projectId) external view returns (
        uint256 id,
        address owner,
        string memory name,
        string memory description,
        bool,
        bool active,
        uint256 createdAt,
        uint256[] memory
    ) {
        Project memory p = projects[_projectId];
        return (p.id, p.owner, p.name, p.description, false, p.active, p.createdAt, new uint256[](0));
    }
    
    function getCampaign(uint256 _campaignId) external view returns (
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
    ) {
        Campaign memory c = campaigns[_campaignId];
        return (
            c.id, c.admin, c.name, c.description, c.startTime, c.endTime,
            c.adminFeePercentage, c.maxWinners, c.useQuadraticDistribution,
            c.useCustomDistribution, c.payoutToken, c.active, c.totalFunds
        );
    }
    
    function isCampaignAdmin(uint256 _campaignId, address _admin) external view returns (bool) {
        return campaigns[_campaignId].admin == _admin || campaignAdmins[_campaignId][_admin] || superAdmins[_admin];
    }
    
    function addProjectToCampaign(uint256 _campaignId, uint256 _projectId, address) external payable {
        require(campaigns[_campaignId].active && projects[_projectId].active, "Campaign or project not active");
        require(!projectInCampaign[_campaignId][_projectId], "Project already in campaign");
        require(msg.sender == projects[_projectId].owner || campaignAdmins[_campaignId][msg.sender] || superAdmins[msg.sender], "Not authorized");
        
        campaignProjects[_campaignId].push(_projectId);
        projectInCampaign[_campaignId][_projectId] = true;
    }
    
    function getCampaignProjects(uint256 _campaignId) external view returns (uint256[] memory) {
        return campaignProjects[_campaignId];
    }
    
    function getSortedProjects(uint256 _campaignId) external view returns (uint256[] memory) {
        return campaignProjects[_campaignId];
    }
    
    function getProjectOwner(uint256 _projectId) external view returns (address) {
        return projects[_projectId].owner;
    }
    
    function getTokenToCeloEquivalent(address _token, uint256 _amount) external view returns (uint256) {
        // Simple 1:1 conversion for testing
        if (_token == address(celoToken)) return _amount;
        return _amount; // Mock: assume 1:1 for all tokens
    }
    
    function tokenExchangeProviders(address _token) external view returns (address provider, bytes32 exchangeId, bool active) {
        TokenExchangeProvider memory providerData = _tokenExchangeProviders[_token];
        return (providerData.provider, providerData.exchangeId, providerData.active);
    }
    
    function setTokenExchangeProvider(address _token, address _provider, bytes32 _exchangeId, bool _active) external onlyOwner {
        _tokenExchangeProviders[_token] = TokenExchangeProvider(_provider, _exchangeId, _active);
    }
    
    function setMentoTokenBroker(address _broker) external onlyOwner {
        mentoTokenBroker = _broker;
    }
}

