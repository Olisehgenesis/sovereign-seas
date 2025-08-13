// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./SovereignSeasGoodDollarBridge.sol";

/**
 * @title SovereignSeasGoodDollarBridgeFactory
 * @dev Enhanced factory contract for deploying and managing SovereignSeasGoodDollarBridge instances
 * Includes bulk operations, analytics, and advanced management features
 */
contract SovereignSeasGoodDollarBridgeFactory is AccessControlUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant DEPLOYER_ROLE = keccak256("DEPLOYER_ROLE");
    
    // Bridge implementation and deployed bridges
    address public bridgeImplementation;
    mapping(address => BridgeInfo) public deployedBridges;
    address[] public allBridges;
    
    // Network and ecosystem mappings
    mapping(string => address[]) public bridgesByNetwork; // network name -> bridges
    mapping(address => string) public bridgeNetworks; // bridge -> network name
    mapping(address => BridgeStats) public bridgeStatistics;
    
    // Global settings
    uint256 public deploymentFee = 0.01 ether; // Fee to deploy a bridge
    uint256 public maxBridgesPerUser = 10; // Max bridges per user
    mapping(address => uint256) public userBridgeCount;
    
    // Templates for common configurations
    mapping(string => BridgeTemplate) public bridgeTemplates;
    string[] public templateNames;
    
    // Events
    event BridgeDeployed(
        address indexed bridge, 
        address indexed sovereignSeas, 
        address indexed admin,
        string network,
        string template
    );
    event ImplementationUpdated(address indexed oldImplementation, address indexed newImplementation);
    event BridgeRemoved(address indexed bridge, string reason);
    event BridgeUpgraded(address indexed bridge, address indexed newImplementation);
    event TemplateAdded(string indexed templateName, BridgeTemplate template);
    event BridgeStatsUpdated(address indexed bridge, BridgeStats stats);
    event DeploymentFeeUpdated(uint256 oldFee, uint256 newFee);
    event MaxBridgesPerUserUpdated(uint256 oldMax, uint256 newMax);
    
    // Structs
    struct BridgeInfo {
        address bridge;
        address sovereignSeas;
        address admin;
        string network;
        string template;
        uint256 deployedAt;
        bool isActive;
        string description;
        address deployedBy;
    }
    
    struct BridgeStats {
        uint256 totalProjects;
        uint256 totalCampaigns;
        uint256 totalGoodDollarDistributed;
        uint256 totalUsers;
        uint256 lastUpdated;
    }
    
    struct BridgeTemplate {
        string name;
        string description;
        uint256 defaultGoodDollarPoolSize;
        uint256 projectCreationReward;
        bool isActive;
        address creator;
        uint256 createdAt;
    }
    
    struct DeploymentParams {
        address sovereignSeas;
        address admin;
        string network;
        string template;
        string description;
    }
    
    struct BridgeAnalytics {
        uint256 totalBridges;
        uint256 activeBridges;
        uint256 totalProjects;
        uint256 totalCampaigns;
        uint256 totalGoodDollarDistributed;
        string[] networks;
        uint256[] bridgesPerNetwork;
    }
    
    // Modifiers
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Only admin can call this function");
        _;
    }
    
    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender), "Only operator can call this function");
        _;
    }
    
    modifier onlyDeployer() {
        require(hasRole(DEPLOYER_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender), "Only deployer can call this function");
        _;
    }
    
    modifier validBridge(address _bridge) {
        require(deployedBridges[_bridge].isActive, "Bridge not found or inactive");
        _;
    }
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initialize the factory - FIXED VERSION
     */
    function initialize(address _admin, address _bridgeImplementation) external initializer {
        require(_admin != address(0), "Invalid admin address");
        require(_bridgeImplementation != address(0), "Invalid implementation address");
        
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        bridgeImplementation = _bridgeImplementation;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(DEPLOYER_ROLE, _admin);
        
        // Add default templates
        _addDefaultTemplates();
    }
    
    /**
     * @dev Deploy a new bridge contract
     */
    function deployBridge(DeploymentParams memory params) 
        external 
        payable 
        onlyDeployer 
        returns (address bridgeAddress) 
    {
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        require(userBridgeCount[msg.sender] < maxBridgesPerUser, "Max bridges per user exceeded");
        require(bytes(params.network).length > 0, "Network name required");
        
        return _deployBridgeInternal(params);
    }
    
    /**
     * @dev Deploy multiple bridges in batch
     */
    function deployBridgesBatch(DeploymentParams[] memory _deployments) 
        external 
        payable 
        onlyDeployer 
        returns (address[] memory bridgeAddresses) 
    {
        require(msg.value >= deploymentFee * _deployments.length, "Insufficient deployment fee");
        require(userBridgeCount[msg.sender] + _deployments.length <= maxBridgesPerUser, "Would exceed max bridges per user");
        
        bridgeAddresses = new address[](_deployments.length);
        
        for (uint256 i = 0; i < _deployments.length; i++) {
            // Deploy bridge directly without calling deployBridge to avoid msg.value issues
            bridgeAddresses[i] = _deployBridgeInternal(_deployments[i]);
        }
        
        return bridgeAddresses;
    }
    
    /**
     * @dev Create project through specific bridge
     */
    function createProjectThroughBridge(
        address _bridge,
        SovereignSeasGoodDollarBridge.ProjectCreationParams memory params
    ) external validBridge(_bridge) returns (uint256 projectId) {
        SovereignSeasGoodDollarBridge bridge = SovereignSeasGoodDollarBridge(payable(_bridge));
        projectId = bridge.createProjectWithReward(params);
        
        // Update bridge statistics
        _updateBridgeStats(_bridge, "project");
        
        return projectId;
    }
    
    /**
     * @dev Create campaign through specific bridge
     */
    function createCampaignThroughBridge(
        address _bridge,
        SovereignSeasGoodDollarBridge.CampaignCreationParams memory params
    ) external payable validBridge(_bridge) returns (uint256 campaignId) {
        SovereignSeasGoodDollarBridge bridge = SovereignSeasGoodDollarBridge(payable(_bridge));
        campaignId = bridge.createCampaignWithGoodDollarPool{value: msg.value}(params);
        
        // Update bridge statistics
        _updateBridgeStats(_bridge, "campaign");
        
        return campaignId;
    }
    
    /**
     * @dev Add a new bridge template
     */
    function addBridgeTemplate(BridgeTemplate memory template) external onlyAdmin {
        require(bytes(template.name).length > 0, "Template name required");
        require(!bridgeTemplates[template.name].isActive, "Template already exists");
        
        template.creator = msg.sender;
        template.createdAt = block.timestamp;
        template.isActive = true;
        
        bridgeTemplates[template.name] = template;
        templateNames.push(template.name);
        
        emit TemplateAdded(template.name, template);
    }
    
    /**
     * @dev Update bridge implementation
     */
    function updateImplementation(address _newImplementation) external onlyAdmin {
        require(_newImplementation != address(0), "Invalid implementation address");
        require(_newImplementation != address(bridgeImplementation), "Same implementation");
        
        address oldImplementation = bridgeImplementation;
        bridgeImplementation = _newImplementation;
        
        emit ImplementationUpdated(oldImplementation, _newImplementation);
    }
    
    /**
     * @dev Upgrade specific bridge
     */
    function upgradeBridge(address _bridge, address _newImplementation) external onlyAdmin validBridge(_bridge) {
        // This would require implementing upgrade logic in the bridge contract
        // For now, emit event for tracking
        emit BridgeUpgraded(_bridge, _newImplementation);
    }
    
    /**
     * @dev Remove a bridge from the registry
     */
    function removeBridge(address _bridge, string memory _reason) external onlyAdmin validBridge(_bridge) {
        deployedBridges[_bridge].isActive = false;
        
        // Remove from network mapping
        string memory network = bridgeNetworks[_bridge];
        address[] storage networkBridges = bridgesByNetwork[network];
        for (uint256 i = 0; i < networkBridges.length; i++) {
            if (networkBridges[i] == _bridge) {
                networkBridges[i] = networkBridges[networkBridges.length - 1];
                networkBridges.pop();
                break;
            }
        }
        
        // Remove from allBridges array
        for (uint256 i = 0; i < allBridges.length; i++) {
            if (allBridges[i] == _bridge) {
                allBridges[i] = allBridges[allBridges.length - 1];
                allBridges.pop();
                break;
            }
        }
        
        // Decrease user bridge count
        userBridgeCount[deployedBridges[_bridge].deployedBy]--;
        
        emit BridgeRemoved(_bridge, _reason);
    }
    
    /**
     * @dev Update deployment fee
     */
    function updateDeploymentFee(uint256 _newFee) external onlyAdmin {
        uint256 oldFee = deploymentFee;
        deploymentFee = _newFee;
        emit DeploymentFeeUpdated(oldFee, _newFee);
    }
    
    /**
     * @dev Update max bridges per user
     */
    function updateMaxBridgesPerUser(uint256 _newMax) external onlyAdmin {
        uint256 oldMax = maxBridgesPerUser;
        maxBridgesPerUser = _newMax;
        emit MaxBridgesPerUserUpdated(oldMax, _newMax);
    }
    
    /**
     * @dev Grant deployer role to user
     */
    function grantDeployerRole(address _user) external onlyAdmin {
        grantRole(DEPLOYER_ROLE, _user);
    }
    
    /**
     * @dev Revoke deployer role from user
     */
    function revokeDeployerRole(address _user) external onlyAdmin {
        revokeRole(DEPLOYER_ROLE, _user);
    }
    
    /**
     * @dev Withdraw deployment fees
     */
    function withdrawFees(address _recipient) external onlyAdmin {
        require(_recipient != address(0), "Invalid recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        payable(_recipient).transfer(balance);
    }
    
    /**
     * @dev Internal function to deploy a bridge (used by batch deployment)
     */
    function _deployBridgeInternal(DeploymentParams memory params) internal returns (address bridgeAddress) {
        _validateDeploymentParams(params);
        
        // Create proxy
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(bridgeImplementation),
            abi.encodeWithSelector(
                SovereignSeasGoodDollarBridge.initialize.selector,
                params.sovereignSeas,
                params.admin
            )
        );
        
        bridgeAddress = address(proxy);
        
        // Register the bridge
        BridgeInfo storage info = deployedBridges[bridgeAddress];
        info.bridge = bridgeAddress;
        info.sovereignSeas = params.sovereignSeas;
        info.admin = params.admin;
        info.network = params.network;
        info.template = params.template;
        info.deployedAt = block.timestamp;
        info.isActive = true;
        info.description = params.description;
        info.deployedBy = msg.sender;
        
        allBridges.push(bridgeAddress);
        bridgesByNetwork[params.network].push(bridgeAddress);
        bridgeNetworks[bridgeAddress] = params.network;
        userBridgeCount[msg.sender]++;
        
        // Apply template settings if specified
        if (bytes(params.template).length > 0 && bridgeTemplates[params.template].isActive) {
            _applyTemplate(bridgeAddress, params.template);
        }
        
        emit BridgeDeployed(
            bridgeAddress, 
            params.sovereignSeas, 
            params.admin,
            params.network,
            params.template
        );
        
        return bridgeAddress;
    }

    /**
     * @dev Internal function to validate deployment parameters
     */
    function _validateDeploymentParams(DeploymentParams memory params) internal view {
        require(params.sovereignSeas != address(0), "Invalid SovereignSeas address");
        require(params.admin != address(0), "Invalid admin address");
        
        if (bytes(params.template).length > 0) {
            require(bridgeTemplates[params.template].isActive, "Invalid or inactive template");
        }
    }
    
    /**
     * @dev Apply template settings to bridge
     */
    function _applyTemplate(address _bridge, string memory _templateName) internal {
        BridgeTemplate memory template = bridgeTemplates[_templateName];
        SovereignSeasGoodDollarBridge bridge = SovereignSeasGoodDollarBridge(payable(_bridge));
        
        // Apply template settings
        if (template.defaultGoodDollarPoolSize > 0) {
            bridge.updateGoodDollarPoolSize(template.defaultGoodDollarPoolSize);
        }
        if (template.projectCreationReward > 0) {
            bridge.updateProjectCreationReward(template.projectCreationReward);
        }
    }
    
    /**
     * @dev Update bridge statistics
     */
    function _updateBridgeStats(address _bridge, string memory _action) internal {
        BridgeStats storage stats = bridgeStatistics[_bridge];
        
        if (keccak256(bytes(_action)) == keccak256(bytes("project"))) {
            stats.totalProjects++;
        } else if (keccak256(bytes(_action)) == keccak256(bytes("campaign"))) {
            stats.totalCampaigns++;
        }
        
        stats.lastUpdated = block.timestamp;
        
        emit BridgeStatsUpdated(_bridge, stats);
    }
    
    /**
     * @dev Add default templates
     */
    function _addDefaultTemplates() internal {
        // Standard template
        bridgeTemplates["standard"] = BridgeTemplate({
            name: "standard",
            description: "Standard configuration for most use cases",
            defaultGoodDollarPoolSize: 1000 * 1e18, // 1000 G$
            projectCreationReward: 50 * 1e18, // 50 G$
            isActive: true,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        templateNames.push("standard");
        
        // High reward template
        bridgeTemplates["high-reward"] = BridgeTemplate({
            name: "high-reward",
            description: "Higher rewards for active ecosystems",
            defaultGoodDollarPoolSize: 5000 * 1e18, // 5000 G$
            projectCreationReward: 200 * 1e18, // 200 G$
            isActive: true,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        templateNames.push("high-reward");
        
        // Minimal template
        bridgeTemplates["minimal"] = BridgeTemplate({
            name: "minimal",
            description: "Minimal rewards for testing or small ecosystems",
            defaultGoodDollarPoolSize: 500 * 1e18, // 500 G$
            projectCreationReward: 25 * 1e18, // 25 G$
            isActive: true,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        templateNames.push("minimal");
    }
    
    /**
     * @dev View functions
     */
    function getAllBridges() external view returns (address[] memory) {
        return allBridges;
    }
    
    function getActiveBridges() external view returns (address[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allBridges.length; i++) {
            if (deployedBridges[allBridges[i]].isActive) {
                activeCount++;
            }
        }
        
        address[] memory activeBridges = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allBridges.length; i++) {
            if (deployedBridges[allBridges[i]].isActive) {
                activeBridges[index] = allBridges[i];
                index++;
            }
        }
        
        return activeBridges;
    }
    
    function getBridgesByNetwork(string memory _network) external view returns (address[] memory) {
        return bridgesByNetwork[_network];
    }
    
    function getBridgeInfo(address _bridge) external view returns (BridgeInfo memory) {
        return deployedBridges[_bridge];
    }
    
    function getBridgeStats(address _bridge) external view returns (BridgeStats memory) {
        return bridgeStatistics[_bridge];
    }
    
    function getTemplate(string memory _templateName) external view returns (BridgeTemplate memory) {
        return bridgeTemplates[_templateName];
    }
    
    function getAllTemplates() external view returns (string[] memory) {
        return templateNames;
    }
    
    function getUserBridges(address _user) external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < allBridges.length; i++) {
            if (deployedBridges[allBridges[i]].deployedBy == _user && deployedBridges[allBridges[i]].isActive) {
                count++;
            }
        }
        
        address[] memory userBridges = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allBridges.length; i++) {
            if (deployedBridges[allBridges[i]].deployedBy == _user && deployedBridges[allBridges[i]].isActive) {
                userBridges[index] = allBridges[i];
                index++;
            }
        }
        
        return userBridges;
    }
    
    function getEcosystemAnalytics() external view returns (BridgeAnalytics memory analytics) {
        analytics.totalBridges = allBridges.length;
        
        uint256 activeCount = 0;
        uint256 totalProjects = 0;
        uint256 totalCampaigns = 0;
        uint256 totalGoodDollar = 0;
        
        for (uint256 i = 0; i < allBridges.length; i++) {
            if (deployedBridges[allBridges[i]].isActive) {
                activeCount++;
                BridgeStats memory stats = bridgeStatistics[allBridges[i]];
                totalProjects += stats.totalProjects;
                totalCampaigns += stats.totalCampaigns;
                totalGoodDollar += stats.totalGoodDollarDistributed;
            }
        }
        
        analytics.activeBridges = activeCount;
        analytics.totalProjects = totalProjects;
        analytics.totalCampaigns = totalCampaigns;
        analytics.totalGoodDollarDistributed = totalGoodDollar;
        
        // Note: For networks and bridgesPerNetwork, you'd need to implement
        // logic to collect unique networks and count bridges per network
    }
    
    function isDeployedBridge(address _bridge) external view returns (bool) {
        return deployedBridges[_bridge].isActive;
    }
    
    function getBridgeCount() external view returns (uint256) {
        return allBridges.length;
    }
    
    function getActiveBridgeCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < allBridges.length; i++) {
            if (deployedBridges[allBridges[i]].isActive) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev Authorize upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}
    
    /**
     * @dev Receive function for deployment fees
     */
    receive() external payable {}
}