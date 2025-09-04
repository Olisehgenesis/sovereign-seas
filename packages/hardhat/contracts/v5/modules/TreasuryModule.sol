// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../base/BaseModule.sol";

// Interface for Mento Broker (from V4)
interface IBroker {
    function swapIn(
        address exchangeProvider,
        bytes32 exchangeId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) external returns (uint256 amountOut);
    
    function getAmountOut(
        address exchangeProvider,
        bytes32 exchangeId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut);
    
    function exchangeProviders(uint256 index) external view returns (address);
}

/**
 * @title TreasuryModule - Enhanced with V4 Functionality and Mento Integration
 * @notice Manages funds, fees, token operations, and Mento integration in SovereignSeas V5
 * @dev Complete treasury functionality with V4 compatibility and advanced features
 */
contract TreasuryModule is BaseModule {
    using SafeERC20 for IERC20;

    // Token exchange provider struct (from V4)
    struct TokenExchangeProvider {
        address provider;
        bytes32 exchangeId;
        bool active;
        uint256 lastUpdate;
    }

    // Fee structure for better organization (from V4)
    struct FeeStructure {
        uint256 platformFeePercentage;
        uint256 campaignCreationFee;
        uint256 projectAdditionFee;
        uint256 projectCreationFee;
        uint256 emergencyWithdrawalDelay;
        bool feesEnabled;
    }

    // Custom Distribution Details struct (from V4)
    struct CustomDistributionDetails {
        uint256 projectId;
        uint256 amount;
        string comment;
        bytes jsonData;
    }

    // State variables
    mapping(address => uint256) public tokenBalances;
    mapping(address => bool) public supportedTokens;
    mapping(address => TokenExchangeProvider) public tokenExchangeProviders;
    mapping(address => uint256) public collectedFees;
    
    address[] public supportedTokensList;
    FeeStructure public feeStructure;

    // Mento Integration (from V4)
    IERC20 public celoToken;
    address public mentoTokenBroker;
    
    // Manual Token Rate System (NEW)
    mapping(address => uint256) public manualTokenRates;     // token => CELO rate (in wei)
    mapping(address => bool) public useManualRate;          // whether to use manual rate
    mapping(address => uint256) public lastRateUpdate;      // timestamp of last rate update
    mapping(address => uint256) public mentoFailures;       // Track Mento failures
    mapping(address => uint256) public manualRateUsage;     // Track manual rate usage
    mapping(address => uint256) public lastMentoAttempt;    // Last Mento attempt timestamp

    // Project Tipping System (NEW)
    struct ProjectTip {
        uint256 projectId;
        address tipper;
        address token;
        uint256 amount;
        string message;
        uint256 timestamp;
        bool claimed;
    }
    
    mapping(uint256 => ProjectTip[]) public projectTips;           // projectId => tips array
    mapping(uint256 => mapping(address => uint256)) public projectTokenBalances; // projectId => token => balance
    mapping(uint256 => uint256) public totalTipsReceived;          // projectId => total tips count
    mapping(address => uint256) public totalTipsGiven;             // tipper => total tips given
    mapping(address => uint256) public totalTipsByToken;           // token => total tips in this token
    
    uint256 public totalTipsCount;
    ProjectTip[] public allTips;

    // Platform constants (from V4)
    uint256 public constant PLATFORM_FEE = 15;
    uint256 public constant MAX_ADMIN_FEE = 30;
    uint256 public constant MAX_PLATFORM_FEE_PERCENTAGE = 25;
    uint256 public constant DEFAULT_SLIPPAGE_TOLERANCE = 995; // 0.5% slippage
    uint256 public constant SLIPPAGE_DENOMINATOR = 1000;

    // Configurable slippage tolerance
    uint256 public slippageTolerance = DEFAULT_SLIPPAGE_TOLERANCE;

    // Diversity bonus constants (from V4)
    uint256 public constant DIVERSITY_BONUS_THRESHOLD_80 = 800;
    uint256 public constant DIVERSITY_BONUS_THRESHOLD_60 = 600;
    uint256 public constant DIVERSITY_BONUS_THRESHOLD_40 = 400;
    uint256 public constant DIVERSITY_BONUS_THRESHOLD_20 = 200;
    uint256 public constant MAX_DIVERSITY_BONUS = 200;
    uint256 public constant HIGH_DIVERSITY_BONUS = 150;
    uint256 public constant MEDIUM_DIVERSITY_BONUS = 100;
    uint256 public constant LOW_DIVERSITY_BONUS = 50;
    uint256 public constant DIVERSITY_PRECISION = 1000;

    // Emergency settings
    mapping(address => uint256) public emergencyWithdrawals;
    mapping(address => uint256) public lastEmergencyWithdrawal;
    
    uint256 public nextTransactionId;
    uint256 public totalFeesCollected;

    // Events
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event TokenExchangeProviderSet(address indexed token, address indexed provider, bytes32 exchangeId);
    event TokenExchangeProviderDeactivated(address indexed token);
    event TokenConversionSucceeded(address indexed fromToken, address indexed toToken, uint256 fromAmount, uint256 toAmount);
    event TokenConversionFailed(uint256 indexed campaignId, address indexed token, uint256 amount);
    event FeeCollected(address indexed token, uint256 amount, string feeType);
    event FeeWithdrawn(address indexed token, address indexed recipient, uint256 amount);
    event FeeAmountUpdated(string feeType, uint256 previousAmount, uint256 newAmount);
    event BrokerUpdated(address indexed newBroker);
    event SlippageToleranceUpdated(uint256 oldSlippage, uint256 newSlippage);
    
    // Manual Rate System Events (NEW)
    event ManualRateSet(address indexed token, uint256 celoRate);
    event ManualRateRemoved(address indexed token);
    event EmergencyRateSet(address indexed token, uint256 celoRate);
    
    // Tipping Events
    event ProjectTipped(uint256 indexed projectId, address indexed tipper, address indexed token, uint256 amount, string message);
    event ProjectTipsClaimed(uint256 indexed projectId, address indexed projectOwner, address indexed token, uint256 amount);
    event ProjectTipsWithdrawn(uint256 indexed projectId, address indexed projectOwner, address indexed token, uint256 amount);
    event MentoConversionFailed(address indexed token, uint256 amount, string reason);
    event ManualRateUsed(address indexed token, uint256 amount, uint256 rate);
    event ConversionMethodUsed(address indexed token, string method, uint256 result);
    event FundsDistributedToProject(uint256 indexed campaignId, uint256 indexed projectId, uint256 amount, address token);
    event FundsDistributed(uint256 indexed campaignId);
    event CustomFundsDistributed(uint256 indexed campaignId, string distributionDetails);
    event FeeStructureUpdated(
        uint256 oldPlatformFee, uint256 newPlatformFee,
        uint256 oldCampaignFee, uint256 newCampaignFee,
        uint256 oldProjectAdditionFee, uint256 newProjectAdditionFee,
        uint256 oldProjectCreationFee, uint256 newProjectCreationFee,
        bool oldFeesEnabled, bool newFeesEnabled
    );
    event FeeAmountsUpdated(
        uint256 oldCampaignCreationFee, uint256 newCampaignCreationFee,
        uint256 oldProjectAdditionFee, uint256 newProjectAdditionFee,
        uint256 oldProjectCreationFee, uint256 newProjectCreationFee
    );
    event FeesToggled(bool oldFeesEnabled, bool newFeesEnabled);
    event FeesSetToZeroForTesting(
        uint256 oldCampaignCreationFee, uint256 oldProjectAdditionFee, uint256 oldProjectCreationFee
    );
    event TestFeesSet(
        uint256 oldCampaignCreationFee, uint256 newCampaignCreationFee,
        uint256 oldProjectAdditionFee, uint256 newProjectAdditionFee,
        uint256 oldProjectCreationFee, uint256 newProjectCreationFee
    );

    function initialize(address _proxy, bytes calldata _data) external override initializer {
        // Initialize base module
        require(_proxy != address(0), "TreasuryModule: Invalid proxy address");
        
        sovereignSeasProxy = ISovereignSeasV5(_proxy);
        moduleActive = true;

        // Initialize inherited contracts
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        // Set module-specific data
        moduleName = "Enhanced Treasury Module";
        moduleDescription = "Manages funds, fees, token operations, and Mento integration";
        moduleDependencies = new string[](0);
        
        nextTransactionId = 1;
        
        // Initialize fee structure (from V4)
        feeStructure = FeeStructure({
            platformFeePercentage: 15,
            campaignCreationFee: 0.5 ether,
            projectAdditionFee: 1 * 1e18,
            projectCreationFee: 0.5 ether,
            emergencyWithdrawalDelay: 24 hours,
            feesEnabled: true
        });
        
        emit ModuleInitialized(getModuleId(), _proxy);
    }

    function getModuleId() public pure override returns (string memory) {
        return "treasury";
    }

    function getModuleVersion() public pure override returns (string memory) {
        return "2.0.0";
    }

    // ==================== MENTO INTEGRATION (from V4) ====================

    /**
    * @notice Set Mento broker address
    */
    function updateBroker(address _newBroker) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "TreasuryModule: Admin role required");
        require(_newBroker != address(0), "TreasuryModule: Invalid broker address");
        mentoTokenBroker = _newBroker;
        emit BrokerUpdated(_newBroker);
    }

    /**
    * @notice Set CELO token address
    */
    function setCeloToken(address _celoToken) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "TreasuryModule: Admin role required");
        require(_celoToken != address(0), "TreasuryModule: Invalid CELO token address");
        celoToken = IERC20(_celoToken);
        
        // Automatically add CELO as supported token if not already
        if (!supportedTokens[_celoToken]) {
            supportedTokens[_celoToken] = true;
            supportedTokensList.push(_celoToken);
            emit TokenAdded(_celoToken);
        }
    }

    /**
    * @notice Get CELO equivalent for any token amount
    */
    function getTokenToCeloEquivalent(address _token, uint256 _amount) public view returns (uint256) {
        if (_token == address(celoToken)) return _amount;
        
        // Try Mento broker first
        TokenExchangeProvider storage provider = tokenExchangeProviders[_token];
        if (provider.active) {
            try IBroker(mentoTokenBroker).getAmountOut(
                provider.provider,
                provider.exchangeId,
                _token,
                address(celoToken),
                _amount
            ) returns (uint256 mentoAmount) {
                // Mento succeeded
                return mentoAmount;
            } catch {
                // Mento failed, try manual rate
                if (useManualRate[_token]) {
                    return (_amount * manualTokenRates[_token]) / 1e18;
                }
                // Both failed
                revert("TreasuryModule: No conversion rate available for token");
            }
        }
        
        // No Mento provider, try manual rate
        if (useManualRate[_token]) {
            return (_amount * manualTokenRates[_token]) / 1e18;
        }
        
        // Both failed
        revert("TreasuryModule: No conversion rate available for token");
    }

    /**
    * @notice Convert tokens using Mento
    */
    function convertTokens(
        address _fromToken,
        address _toToken,
        uint256 _amount
    ) public nonReentrant returns (uint256) {
        if (_fromToken == _toToken) return _amount;
        
        TokenExchangeProvider storage provider = tokenExchangeProviders[_fromToken];
        require(provider.active, "TreasuryModule: No active exchange provider for token");
        
        uint256 expectedAmountOut = IBroker(mentoTokenBroker).getAmountOut(
            provider.provider,
            provider.exchangeId,
            _fromToken,
            _toToken,
            _amount
        );
        uint256 minAmountOut = expectedAmountOut * slippageTolerance / SLIPPAGE_DENOMINATOR;
        
        // Check if contract has enough tokens
        if (IERC20(_fromToken).balanceOf(address(this)) < _amount) {
            IERC20(_fromToken).safeTransferFrom(getEffectiveCaller(), address(this), _amount);
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

    // ==================== TOKEN MANAGEMENT ====================

    /**
    * @notice Add supported token with exchange provider
    */
    function addSupportedToken(address _token) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "TreasuryModule: Admin role required");
        require(_token != address(0), "TreasuryModule: Invalid token address");
        require(!supportedTokens[_token], "TreasuryModule: Token already supported");
        
        supportedTokens[_token] = true;
        supportedTokensList.push(_token);
        
        emit TokenAdded(_token);
    }

    /**
    * @notice Set token exchange provider
    */
    function setTokenExchangeProvider(
        address _token,
        address _provider,
        bytes32 _exchangeId
    ) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "TreasuryModule: Admin role required");
        require(supportedTokens[_token], "TreasuryModule: Token not supported");
        require(_provider != address(0), "TreasuryModule: Invalid provider address");
        
        tokenExchangeProviders[_token] = TokenExchangeProvider({
            provider: _provider,
            exchangeId: _exchangeId,
            active: true,
            lastUpdate: block.timestamp
        });
        
        // Approve broker for token swaps
        IERC20(_token).approve(mentoTokenBroker, type(uint256).max);
        
        emit TokenExchangeProviderSet(_token, _provider, _exchangeId);
    }

    // ==================== FEE MANAGEMENT ====================

    /**
    * @notice Update fee structure (admin only)
    * @dev All global fees are in CELO. Campaigns can override with their own fee tokens.
    */
    function updateFeeStructure(
        uint256 _platformFeePercentage,
        uint256 _campaignCreationFee,
        uint256 _projectAdditionFee,
        uint256 _projectCreationFee,
        bool _feesEnabled
    ) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "TreasuryModule: Admin role required");
        require(_platformFeePercentage <= MAX_PLATFORM_FEE_PERCENTAGE, "TreasuryModule: Platform fee too high");
        
        uint256 oldPlatformFee = feeStructure.platformFeePercentage;
        uint256 oldCampaignFee = feeStructure.campaignCreationFee;
        uint256 oldProjectAdditionFee = feeStructure.projectAdditionFee;
        uint256 oldProjectCreationFee = feeStructure.projectCreationFee;
        bool oldFeesEnabled = feeStructure.feesEnabled;
        
        feeStructure.platformFeePercentage = _platformFeePercentage;
        feeStructure.campaignCreationFee = _campaignCreationFee;
        feeStructure.projectAdditionFee = _projectAdditionFee;
        feeStructure.projectCreationFee = _projectCreationFee;
        feeStructure.feesEnabled = _feesEnabled;
        
        emit FeeStructureUpdated(
            oldPlatformFee, _platformFeePercentage,
            oldCampaignFee, _campaignCreationFee,
            oldProjectAdditionFee, _projectAdditionFee,
            oldProjectCreationFee, _projectCreationFee,
            oldFeesEnabled, _feesEnabled
        );
    }

    /**
    * @notice Update specific fee amounts (admin only)
    * @dev All global fees are in CELO. Campaigns can override with their own fee tokens.
    */
    function updateFeeAmounts(
        uint256 _campaignCreationFee,
        uint256 _projectAdditionFee,
        uint256 _projectCreationFee
    ) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "TreasuryModule: Admin role required");
        
        uint256 oldCampaignFee = feeStructure.campaignCreationFee;
        uint256 oldProjectAdditionFee = feeStructure.projectAdditionFee;
        uint256 oldProjectCreationFee = feeStructure.projectCreationFee;
        
        feeStructure.campaignCreationFee = _campaignCreationFee;
        feeStructure.projectAdditionFee = _projectAdditionFee;
        feeStructure.projectCreationFee = _projectCreationFee;
        
        emit FeeAmountsUpdated(
            oldCampaignFee, _campaignCreationFee,
            oldProjectAdditionFee, _projectAdditionFee,
            oldProjectCreationFee, _projectCreationFee
        );
    }

    /**
    * @notice Toggle fees on/off (admin only)
    */
    function toggleFees(bool _feesEnabled) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "TreasuryModule: Admin role required");
        
        bool oldFeesEnabled = feeStructure.feesEnabled;
        feeStructure.feesEnabled = _feesEnabled;
        
        emit FeesToggled(oldFeesEnabled, _feesEnabled);
    }

    /**
    * @notice Set fees to zero for testing (admin only)
    * @dev Sets global CELO fees to zero. Campaigns with custom fee tokens are unaffected.
    */
    function setZeroFeesForTesting() external {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "TreasuryModule: Admin role required");
        
        uint256 oldCampaignFee = feeStructure.campaignCreationFee;
        uint256 oldProjectAdditionFee = feeStructure.projectAdditionFee;
        uint256 oldProjectCreationFee = feeStructure.projectCreationFee;
        
        feeStructure.campaignCreationFee = 0;
        feeStructure.projectAdditionFee = 0;
        feeStructure.projectCreationFee = 0;
        
        emit FeesSetToZeroForTesting(
            oldCampaignFee, oldProjectAdditionFee, oldProjectCreationFee
        );
    }

    /**
    * @notice Set fees to 0.1 CELO for testing (admin only)
    * @dev Sets global CELO fees to 0.1 CELO. Campaigns with custom fee tokens are unaffected.
    */
    function setTestFees() external {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "TreasuryModule: Admin role required");
        
        uint256 oldCampaignFee = feeStructure.campaignCreationFee;
        uint256 oldProjectAdditionFee = feeStructure.projectAdditionFee;
        uint256 oldProjectCreationFee = feeStructure.projectCreationFee;
        
        // Set to 0.1 CELO (0.1 * 10^18)
        uint256 testFeeAmount = 0.1e18;
        feeStructure.campaignCreationFee = testFeeAmount;
        feeStructure.projectAdditionFee = testFeeAmount;
        feeStructure.projectCreationFee = testFeeAmount;
        
        emit TestFeesSet(
            oldCampaignFee, testFeeAmount,
            oldProjectAdditionFee, testFeeAmount,
            oldProjectCreationFee, testFeeAmount
        );
    }

    /**
    * @notice Validate and collect fee (core V4 function)
    */
    function validateAndCollectFee(
        address _feeToken,
        uint256 _baseFee,
        string memory _feeType,
        uint256 _campaignId,
        address _payer
    ) external returns (bool) {
        require(supportedTokens[_feeToken], "TreasuryModule: Fee token not supported");
        
        if (canBypassFees(_campaignId, _payer)) return true;
        if (!feeStructure.feesEnabled) return true;
        
        uint256 feeAmount = _baseFee;
        
        // Convert fee to token equivalent if not CELO
        if (_feeToken != address(celoToken)) {
            feeAmount = (getExpectedConversionRate(address(celoToken), _feeToken, _baseFee) * 101) / 100; // 1% buffer
        }
        
        collectedFees[_feeToken] += feeAmount;
        emit FeeCollected(_feeToken, feeAmount, _feeType);
        
        return true;
    }

    /**
    * @notice Collect fee from module (called by other modules)
    * @param _payer The address that paid the fee
    * @param _amount The amount of fee collected
    * @param _feeType The type of fee being collected
    */
    function collectFee(address _payer, uint256 _amount, string calldata _feeType) external payable {
        // Allow calls from registered modules or the proxy
        require(
            _isRegisteredModule(msg.sender) || msg.sender == address(sovereignSeasProxy), 
            "TreasuryModule: Only modules or proxy can collect fees"
        );
        require(_amount > 0, "TreasuryModule: Fee amount must be positive");
        require(msg.value >= _amount, "TreasuryModule: Insufficient CELO sent for fee");
        
        // Transfer the CELO to this contract (it's already sent with the transaction)
        // The CELO is now in this contract's balance
        
        // Store the fee collection (using address(0) for native CELO)
        collectedFees[address(0)] += _amount;
        totalFeesCollected += _amount;
        
        // If more CELO was sent than required, refund the excess
        if (msg.value > _amount) {
            uint256 excess = msg.value - _amount;
            (bool success, ) = _payer.call{value: excess}("");
            require(success, "TreasuryModule: Failed to refund excess CELO");
        }
        
        emit FeeCollected(address(0), _amount, _feeType);
    }

    /**
    * @notice Check if an address is a registered module
    */
    function _isRegisteredModule(address _module) internal view returns (bool) {
        // Check if the address matches any of the registered module addresses
        string[] memory moduleIds = sovereignSeasProxy.getRegisteredModules();
        for (uint256 i = 0; i < moduleIds.length; i++) {
            if (sovereignSeasProxy.getModuleAddress(moduleIds[i]) == _module) {
                return true;
            }
        }
        return false;
    }

    /**
    * @notice Check if user can bypass fees
    */
    function canBypassFees(uint256 _campaignId, address _user) public returns (bool) {
        // Check if user is campaign admin
        if (_campaignId > 0) {
            bytes memory isAdminData = callModule("campaigns", abi.encodeWithSignature("isCampaignAdmin(uint256,address)", _campaignId, _user));
            if (isAdminData.length > 0) {
                bool isCampaignAdmin = abi.decode(isAdminData, (bool));
                if (isCampaignAdmin) return true;
            }
        }
        
        // Check if user has admin role
        return _isAdmin(_user);
    }

    /**
    * @notice Get expected conversion rate
    */
    function getExpectedConversionRate(
        address _fromToken,
        address _toToken,
        uint256 _amount
    ) public view returns (uint256) {
        if (_fromToken == _toToken) return _amount;
        
        TokenExchangeProvider storage provider = tokenExchangeProviders[_fromToken];
        require(provider.active, "TreasuryModule: No active exchange provider for token");
        
        return IBroker(mentoTokenBroker).getAmountOut(
            provider.provider,
            provider.exchangeId,
            _fromToken,
            _toToken,
            _amount
        );
    }

    // ==================== DISTRIBUTION FUNCTIONS (from V4) ====================

    /**
    * @notice Distribute funds from campaign
    */
    function distributeFunds(uint256 _campaignId) external nonReentrant {
        // Get campaign data
        bytes memory campaignData = callModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _campaignId));
        require(campaignData.length > 0, "TreasuryModule: Campaign not found");
        
        // Get sorted projects from voting module
        bytes memory sortedProjectsData = callModule("voting", abi.encodeWithSignature("getSortedProjects(uint256)", _campaignId));
        uint256[] memory sortedProjectIds = abi.decode(sortedProjectsData, (uint256[]));
        
        if (sortedProjectIds.length == 0) {
            emit FundsDistributed(_campaignId);
            return;
        }
        
        // Get campaign total funds and payout token
        // This would need campaign data structure - simplified for now
        uint256 totalFunds = 1000 * 1e18; // Placeholder
        address payoutToken = address(celoToken); // Placeholder
        
        // Calculate fees
        uint256 platformFeeAmount = (totalFunds * feeStructure.platformFeePercentage) / 100;
        uint256 remainingFunds = totalFunds - platformFeeAmount;
        
        // Transfer platform fee to treasury
        if (platformFeeAmount > 0) {
            collectedFees[payoutToken] += platformFeeAmount;
            emit FeeCollected(payoutToken, platformFeeAmount, "platform_distribution");
        }
        
        // Distribute remaining funds to projects
        _distributeToWinners(_campaignId, remainingFunds, payoutToken, true, sortedProjectIds.length);
        
        emit FundsDistributed(_campaignId);
    }

    /**
    * @notice Preview distribution without executing
    */
    function previewDistribution(
        uint256 _campaignId,
        uint256 _amount
    ) external returns (
        uint256[] memory projectIds,
        uint256[] memory projectedShares,
        uint256[] memory weights,
        string memory distributionType
    ) {
        // Get sorted project IDs
        bytes memory sortedProjectsData = callModule("voting", abi.encodeWithSignature("getSortedProjects(uint256)", _campaignId));
        uint256[] memory sortedProjectIds = abi.decode(sortedProjectsData, (uint256[]));
        
        if (sortedProjectIds.length == 0) {
            return (new uint256[](0), new uint256[](0), new uint256[](0), "No projects");
        }
        
        // Calculate platform fee
        uint256 platformFee = (_amount * feeStructure.platformFeePercentage) / 100;
        uint256 remainingFunds = _amount - platformFee;
        
        // Initialize arrays
        projectIds = sortedProjectIds;
        projectedShares = new uint256[](sortedProjectIds.length);
        weights = new uint256[](sortedProjectIds.length);
        
        // Calculate quadratic distribution with diversity bonuses
        distributionType = "Quadratic";
        _calculateQuadraticPreview(_campaignId, sortedProjectIds, remainingFunds, projectedShares, weights);
        
        return (projectIds, projectedShares, weights, distributionType);
    }

    /**
    * @notice Calculate quadratic distribution preview
    */
    function _calculateQuadraticPreview(
        uint256 _campaignId,
        uint256[] memory _sortedProjectIds,
        uint256 _remainingFunds,
        uint256[] memory _projectedShares,
        uint256[] memory _weights
    ) internal {
        uint256 totalWeight = 0;
        
        // Get total number of unique voters in the campaign
        bytes memory voterCountData = callModule("voting", abi.encodeWithSignature("getCampaignTotalVoters(uint256)", _campaignId));
        uint256 totalVoters = voterCountData.length > 0 ? abi.decode(voterCountData, (uint256)) : 1;
        
        // Calculate enhanced quadratic weights
        for (uint256 i = 0; i < _sortedProjectIds.length; i++) {
            bytes memory participationData = callModule("voting", abi.encodeWithSignature("getParticipation(uint256,uint256)", _campaignId, _sortedProjectIds[i]));
            if (participationData.length > 0) {
                (bool approved, uint256 voteCount,) = abi.decode(participationData, (bool, uint256, uint256));
                if (approved) {
                    uint256 baseWeight = _sqrt(voteCount);
                    uint256 voterDiversityBonus = _calculateVoterDiversityBonus(_campaignId, _sortedProjectIds[i], totalVoters);
                    _weights[i] = baseWeight + voterDiversityBonus;
                    totalWeight += _weights[i];
                }
            }
        }
        
        // Calculate projected shares
        for (uint256 i = 0; i < _sortedProjectIds.length; i++) {
            if (totalWeight > 0) {
                _projectedShares[i] = (_remainingFunds * _weights[i]) / totalWeight;
            }
        }
    }

    /**
    * @notice Calculate voter diversity bonus (from V4)
    */
    function _calculateVoterDiversityBonus(
        uint256 _campaignId,
        uint256 _projectId,
        uint256 _totalVoters
    ) internal returns (uint256) {
        // Get unique voters for this project
        bytes memory uniqueVotersData = callModule("voting", abi.encodeWithSignature("getProjectUniqueVoters(uint256,uint256)", _campaignId, _projectId));
        uint256 uniqueVoters = uniqueVotersData.length > 0 ? abi.decode(uniqueVotersData, (uint256)) : 0;
        
        if (_totalVoters == 0) return 0;
        
        // Calculate diversity ratio
        uint256 diversityRatio = (uniqueVoters * DIVERSITY_PRECISION) / _totalVoters;
        
        // Return bonus based on diversity thresholds
        if (diversityRatio >= DIVERSITY_BONUS_THRESHOLD_80) {
            return MAX_DIVERSITY_BONUS;
        } else if (diversityRatio >= DIVERSITY_BONUS_THRESHOLD_60) {
            return HIGH_DIVERSITY_BONUS;
        } else if (diversityRatio >= DIVERSITY_BONUS_THRESHOLD_40) {
            return MEDIUM_DIVERSITY_BONUS;
        } else if (diversityRatio >= DIVERSITY_BONUS_THRESHOLD_20) {
            return LOW_DIVERSITY_BONUS;
        }
        
        return 0;
    }

    /**
    * @notice Distribute to winning projects
    */
    function _distributeToWinners(
        uint256 _campaignId,
        uint256 _remainingFunds,
        address _payoutToken,
        bool _useQuadraticDistribution,
        uint256 _maxWinners
    ) internal {
        // Get sorted projects
        bytes memory sortedProjectsData = callModule("voting", abi.encodeWithSignature("getSortedProjects(uint256)", _campaignId));
        uint256[] memory sortedProjectIds = abi.decode(sortedProjectsData, (uint256[]));
        
        if (sortedProjectIds.length == 0) return;
        
        uint256 winnersCount = _maxWinners > 0 && _maxWinners < sortedProjectIds.length ? _maxWinners : sortedProjectIds.length;
        
        if (_useQuadraticDistribution) {
            _distributeQuadraticEnhanced(_campaignId, sortedProjectIds, winnersCount, _remainingFunds, _payoutToken);
        } else {
            _distributeProportional(sortedProjectIds, winnersCount, _remainingFunds, _payoutToken);
        }
    }

    /**
    * @notice Enhanced quadratic distribution (from V4)
    */
    function _distributeQuadraticEnhanced(
        uint256 _campaignId,
        uint256[] memory _sortedProjectIds,
        uint256 _actualWinners,
        uint256 _remainingFunds,
        address _payoutToken
    ) internal {
        uint256[] memory weights = new uint256[](_actualWinners);
        uint256 totalWeight = 0;
        
        // Get total voters for diversity calculation
        bytes memory voterCountData = callModule("voting", abi.encodeWithSignature("getCampaignTotalVoters(uint256)", _campaignId));
        uint256 totalVoters = voterCountData.length > 0 ? abi.decode(voterCountData, (uint256)) : 1;
        
        // Calculate enhanced quadratic weights
        for (uint256 i = 0; i < _actualWinners; i++) {
            bytes memory participationData = callModule("voting", abi.encodeWithSignature("getParticipation(uint256,uint256)", _campaignId, _sortedProjectIds[i]));
            if (participationData.length > 0) {
                (bool approved, uint256 voteCount,) = abi.decode(participationData, (bool, uint256, uint256));
                if (approved) {
                    uint256 baseWeight = _sqrt(voteCount);
                    uint256 voterDiversityBonus = _calculateVoterDiversityBonus(_campaignId, _sortedProjectIds[i], totalVoters);
                    weights[i] = baseWeight + voterDiversityBonus;
                    totalWeight += weights[i];
                }
            }
        }
        
        // Distribute based on enhanced quadratic weights
        for (uint256 i = 0; i < _actualWinners; i++) {
            if (totalWeight > 0) {
                uint256 projectShare = (_remainingFunds * weights[i]) / totalWeight;
                _transferProjectFunds(_campaignId, _sortedProjectIds[i], projectShare, _payoutToken);
            }
        }
    }

    /**
    * @notice Proportional distribution
    */
    function _distributeProportional(
        uint256[] memory _sortedProjectIds,
        uint256 _actualWinners,
        uint256 _remainingFunds,
        address _payoutToken
    ) internal {
        uint256 equalShare = _remainingFunds / _actualWinners;
        
        for (uint256 i = 0; i < _actualWinners; i++) {
            _transferProjectFunds(0, _sortedProjectIds[i], equalShare, _payoutToken);
        }
    }

    /**
    * @notice Transfer funds to project
    */
    function _transferProjectFunds(
        uint256 _campaignId,
        uint256 _projectId,
        uint256 _amount,
        address _token
    ) internal {
        if (_amount > 0) {
            // Get project owner
            bytes memory projectData = callModule("projects", abi.encodeWithSignature("getProject(uint256)", _projectId));
            if (projectData.length > 0) {
                (,address owner,,,,,) = abi.decode(projectData, (uint256,address,string,string,bool,bool,uint256));
                
                if (_token == address(celoToken)) {
                    payable(owner).transfer(_amount);
                } else {
                    IERC20(_token).safeTransfer(owner, _amount);
                }
                
                // Update project stats
                callModule("projects", abi.encodeWithSignature("updateProjectStats(uint256,uint256,uint256)", _projectId, _amount, 0));
                
                emit FundsDistributedToProject(_campaignId, _projectId, _amount, _token);
            }
        }
    }

    // ==================== V4 MIGRATION FUNCTIONS ====================

    /**
    * @notice Set core configuration from V4 migration
    */
    function setCoreConfigurationFromV4(
        address _celoToken,
        address _mentoTokenBroker,
        uint256 _campaignCreationFee,
        uint256 _projectAdditionFee
    ) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "TreasuryModule: Admin role required");
        celoToken = IERC20(_celoToken);
        mentoTokenBroker = _mentoTokenBroker;
        
        feeStructure.campaignCreationFee = _campaignCreationFee;
        feeStructure.projectAdditionFee = _projectAdditionFee;
        feeStructure.platformFeePercentage = PLATFORM_FEE;
        feeStructure.feesEnabled = true;
        feeStructure.emergencyWithdrawalDelay = 24 hours;
    }

    /**
    * @notice Add supported token from V4 migration
    */
    function addSupportedTokenFromV4(
        address _token,
        address _provider,
        bytes32 _exchangeId
    ) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "TreasuryModule: Admin role required");
        if (!supportedTokens[_token]) {
            supportedTokens[_token] = true;
            supportedTokensList.push(_token);
            emit TokenAdded(_token);
        }
        
        tokenExchangeProviders[_token] = TokenExchangeProvider({
            provider: _provider,
            exchangeId: _exchangeId,
            active: true,
            lastUpdate: block.timestamp
        });
        
        emit TokenExchangeProviderSet(_token, _provider, _exchangeId);
    }

    /**
    * @notice Set collected fees from V4 migration
    */
    function setCollectedFeesFromV4(address _token, uint256 _amount) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "TreasuryModule: Admin role required");
        if (_amount > 0) {
            collectedFees[_token] = _amount;
        }
    }

    // ==================== UTILITY FUNCTIONS ====================

    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    // ==================== VIEW FUNCTIONS ====================

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokensList;
    }

    function getFeeStructure() external view returns (
        uint256 platformFeePercentage,
        uint256 campaignCreationFee,
        uint256 projectAdditionFee,
        uint256 projectCreationFee,
        uint256 emergencyWithdrawalDelay,
        bool feesEnabled
    ) {
        return (
            feeStructure.platformFeePercentage,
            feeStructure.campaignCreationFee,
            feeStructure.projectAdditionFee,
            feeStructure.projectCreationFee,
            feeStructure.emergencyWithdrawalDelay,
            feeStructure.feesEnabled
        );
    }

    function getCeloToken() external view returns (address) {
        return address(celoToken);
    }

    function getCollectedFees(address _token) external view returns (uint256) {
        return collectedFees[_token];
    }

    // ==================== MANUAL RATE SYSTEM FUNCTIONS ====================

    /**
    * @notice Set manual token rate for CELO conversion
    * @param _token Token address
    * @param _celoRate Rate in wei (1 token = _celoRate wei CELO)
    */
    function setManualTokenRate(address _token, uint256 _celoRate) external {
        require(_isAdmin(getEffectiveCaller()), "TreasuryModule: Admin required");
        require(_celoRate > 0, "TreasuryModule: Rate must be positive");
        
        manualTokenRates[_token] = _celoRate;
        useManualRate[_token] = true;
        lastRateUpdate[_token] = block.timestamp;
        
        emit ManualRateSet(_token, _celoRate);
    }

    /**
    * @notice Remove manual token rate
    * @param _token Token address
    */
    function removeManualTokenRate(address _token) external {
        require(_isAdmin(getEffectiveCaller()), "TreasuryModule: Admin required");
        
        useManualRate[_token] = false;
        emit ManualRateRemoved(_token);
    }

    /**
    * @notice Emergency set token rate (overrides Mento)
    * @param _token Token address
    * @param _celoRate Rate in wei
    */
    function emergencySetTokenRate(address _token, uint256 _celoRate) external {
        require(_isAdmin(getEffectiveCaller()), "TreasuryModule: Admin required");
        require(_celoRate > 0, "TreasuryModule: Rate must be positive");
        
        // Force set manual rate even if Mento is active
        manualTokenRates[_token] = _celoRate;
        useManualRate[_token] = true;
        lastRateUpdate[_token] = block.timestamp;
        
        emit EmergencyRateSet(_token, _celoRate);
    }

    /**
    * @notice Enhanced conversion with logging and fallback
    * @param _token Token address
    * @param _amount Token amount
    * @return CELO equivalent amount
    */
    function getTokenToCeloEquivalentWithLogging(address _token, uint256 _amount) public returns (uint256) {
        if (_token == address(celoToken)) return _amount;
        
        uint256 result;
        string memory method;
        
        // Try Mento broker first
        TokenExchangeProvider storage provider = tokenExchangeProviders[_token];
        if (provider.active) {
            lastMentoAttempt[_token] = block.timestamp;
            
            try IBroker(mentoTokenBroker).getAmountOut(
                provider.provider,
                provider.exchangeId,
                _token,
                address(celoToken),
                _amount
            ) returns (uint256 mentoAmount) {
                // Mento succeeded
                result = mentoAmount;
                method = "mento";
                emit ConversionMethodUsed(_token, method, result);
                return result;
            } catch Error(string memory reason) {
                // Mento failed with specific error
                mentoFailures[_token]++;
                emit MentoConversionFailed(_token, _amount, reason);
                
                // Try manual rate fallback
                if (useManualRate[_token]) {
                    result = (_amount * manualTokenRates[_token]) / 1e18;
                    method = "manual_fallback";
                    manualRateUsage[_token]++;
                    emit ManualRateUsed(_token, _amount, manualTokenRates[_token]);
                    emit ConversionMethodUsed(_token, method, result);
                    return result;
                }
                
                revert(string(abi.encodePacked("Mento failed: ", reason, " and no manual rate set")));
            } catch {
                // Mento failed with unknown error
                mentoFailures[_token]++;
                emit MentoConversionFailed(_token, _amount, "Unknown error");
                
                // Try manual rate fallback
                if (useManualRate[_token]) {
                    result = (_amount * manualTokenRates[_token]) / 1e18;
                    method = "manual_fallback";
                    manualRateUsage[_token]++;
                    emit ManualRateUsed(_token, _amount, manualTokenRates[_token]);
                    emit ConversionMethodUsed(_token, method, result);
                    return result;
                }
                
                revert("Mento failed with unknown error and no manual rate set");
            }
        }
        
        // No Mento provider, try manual rate
        if (useManualRate[_token]) {
            result = (_amount * manualTokenRates[_token]) / 1e18;
            method = "manual_only";
            manualRateUsage[_token]++;
            emit ManualRateUsed(_token, _amount, manualTokenRates[_token]);
            emit ConversionMethodUsed(_token, method, result);
            return result;
        }
        
        revert("No Mento provider and no manual rate set");
    }

    /**
    * @notice Get token conversion information
    * @param _token Token address
    * @return hasMentoProvider Whether token has active Mento provider
    * @return hasManualRate Whether token has manual rate set
    * @return manualRate Manual rate value
    * @return mentoFailuresCount Number of Mento failures
    * @return manualUsageCount Number of manual rate usages
    * @return lastMentoAttemptTime Timestamp of last Mento attempt
    */
    function getTokenConversionInfo(address _token) external view returns (
        bool hasMentoProvider,
        bool hasManualRate,
        uint256 manualRate,
        uint256 mentoFailuresCount,
        uint256 manualUsageCount,
        uint256 lastMentoAttemptTime
    ) {
        TokenExchangeProvider storage provider = tokenExchangeProviders[_token];
        return (
            provider.active,
            useManualRate[_token],
            manualTokenRates[_token],
            mentoFailures[_token],
            manualRateUsage[_token],
            lastMentoAttempt[_token]
        );
    }

    /**
    * @notice Get conversion health status
    * @param _token Token address
    * @return isHealthy Whether conversion is healthy
    * @return status Status description
    * @return failureRate Failure rate percentage
    */
    function getConversionHealth(address _token) external view returns (
        bool isHealthy,
        string memory status,
        uint256 failureRate
    ) {
        uint256 totalAttempts = mentoFailures[_token] + manualRateUsage[_token];
        
        if (totalAttempts == 0) {
            return (true, "No conversion attempts", 0);
        }
        
        failureRate = (mentoFailures[_token] * 100) / totalAttempts;
        
        if (failureRate > 50) {
            return (false, "High failure rate", failureRate);
        } else if (failureRate > 20) {
            return (false, "Moderate failure rate", failureRate);
        } else {
            return (true, "Healthy", failureRate);
        }
    }

    receive() external payable {
        // Accept CELO payments
    }

}
