// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Interface for main contract communication
interface ISovereignSeasV5 {
    function hasModuleAccess(address _user, bytes32 _role) external view returns (bool);
    function callModule(string memory _moduleName, bytes memory _data) external returns (bytes memory);
}

// Interface for Mento Broker
interface IBroker {
    function swapIn(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) external returns (uint256 amountOut);
    function getAmountOut(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 amountOut);
    function exchangeProviders(uint256 index) external view returns (address);
}

// Token Exchange Provider struct
struct TokenExchangeProvider {
    address provider;
    bytes32 exchangeId;
    bool active;
}

// Custom Distribution Details struct
struct CustomDistributionDetails {
    uint256 projectId;
    uint256 amount;
    string comment;
    bytes jsonData;
}

// Fee structure for better organization
struct FeeStructure {
    uint256 platformFeePercentage;
    uint256 campaignCreationFee;
    uint256 projectAdditionFee;
    uint256 emergencyWithdrawalDelay;
    bool feesEnabled;
}

/**
 * @title TreasuryModule - SovereignSeasV5 Treasury and Token Management
 * @dev Handles all treasury operations, fees, token exchanges, and fund distributions
 */
contract TreasuryModule is Initializable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;
    
    // State variables
    ISovereignSeasV5 public mainContract;
    
    // Token management
    mapping(address => bool) public supportedTokens;
    mapping(address => TokenExchangeProvider) public tokenExchangeProviders;
    address[] public supportedTokensList;
    
    // Fee management
    mapping(address => uint256) public collectedFees;
    FeeStructure public feeStructure;

    
    // Treasury settings
    IERC20 public celoToken;
    address public mentoTokenBroker;
    
    // Platform constants
    uint256 public constant PLATFORM_FEE = 15;
    uint256 public constant MAX_ADMIN_FEE = 30;
    
    // Emergency settings
    mapping(address => uint256) public emergencyWithdrawals;
    mapping(address => uint256) public lastEmergencyWithdrawal;
    
    // Constants and configurable parameters
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // Configurable parameters (instead of magic numbers)
    uint256 public constant MAX_PLATFORM_FEE_PERCENTAGE = 25; // 25% maximum platform fee
    uint256 public constant DEFAULT_SLIPPAGE_TOLERANCE = 995; // 0.5% slippage (995/1000)
    uint256 public constant SLIPPAGE_DENOMINATOR = 1000;
    uint256 public constant DIVERSITY_BONUS_THRESHOLD_80 = 800; // 80% diversity threshold
    uint256 public constant DIVERSITY_BONUS_THRESHOLD_60 = 600; // 60% diversity threshold  
    uint256 public constant DIVERSITY_BONUS_THRESHOLD_40 = 400; // 40% diversity threshold
    uint256 public constant DIVERSITY_BONUS_THRESHOLD_20 = 200; // 20% diversity threshold
    uint256 public constant MAX_DIVERSITY_BONUS = 200; // 20% maximum bonus
    uint256 public constant HIGH_DIVERSITY_BONUS = 150; // 15% bonus
    uint256 public constant MEDIUM_DIVERSITY_BONUS = 100; // 10% bonus
    uint256 public constant LOW_DIVERSITY_BONUS = 50; // 5% bonus
    uint256 public constant DIVERSITY_PRECISION = 1000; // Precision for diversity calculations
    
    // Configurable slippage tolerance (can be updated by admin)
    uint256 public slippageTolerance = DEFAULT_SLIPPAGE_TOLERANCE;
    
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

    event EmergencyTokenRecovery(address indexed token, address indexed recipient, uint256 amount, bool tokensNeededForActiveCampaigns);
    event FundsDistributedToProject(uint256 indexed campaignId, uint256 indexed projectId, uint256 amount, address token);
    event ProjectFundsDistributedDetailed(uint256 indexed campaignId, uint256 indexed projectId, uint256 amount, address token, string comment, bytes jsonData);
    event FundsDistributed(uint256 indexed campaignId);
    event CustomFundsDistributed(uint256 indexed campaignId, string distributionDetails);
    event FeeStructureUpdated(uint256 platformFee, uint256 campaignFee, uint256 projectFee, bool feesEnabled);
    event SlippageToleranceUpdated(uint256 oldSlippage, uint256 newSlippage);

    // Modifiers
    modifier onlyMainContract() {
        require(msg.sender == address(mainContract), "TreasuryModule: Only main contract can call");
        _;
    }
    
    modifier hasRole(bytes32 role) {
        require(mainContract.hasModuleAccess(msg.sender, role), "TreasuryModule: Access denied");
        _;
    }
    
    modifier validAddress(address _addr) {
        require(_addr != address(0), "TreasuryModule: Invalid address");
        _;
    }

    function initialize(address _main) external initializer {
        __ReentrancyGuard_init();
        mainContract = ISovereignSeasV5(_main);
        
        // Initialize fee structure
        feeStructure = FeeStructure({
            platformFeePercentage: 15,
            campaignCreationFee: 2 * 1e18,
            projectAdditionFee: 1 * 1e18,
            emergencyWithdrawalDelay: 24 hours,
            feesEnabled: true
        });
    }

    // Token Management Functions
    function addSupportedToken(address _token) external hasRole(ADMIN_ROLE) validAddress(_token) {
        require(!supportedTokens[_token], "TreasuryModule: Token already supported");
        
        supportedTokens[_token] = true;
        supportedTokensList.push(_token);
        
        emit TokenAdded(_token);
    }
    
    function removeSupportedToken(address _token) external hasRole(ADMIN_ROLE) {
        require(supportedTokens[_token], "TreasuryModule: Token not supported");
        require(_token != address(celoToken), "TreasuryModule: Cannot remove base CELO token");
        
        supportedTokens[_token] = false;
        
        // Remove from supportedTokensList
        for (uint256 i = 0; i < supportedTokensList.length; i++) {
            if (supportedTokensList[i] == _token) {
                supportedTokensList[i] = supportedTokensList[supportedTokensList.length - 1];
                supportedTokensList.pop();
                break;
            }
        }
        
        emit TokenRemoved(_token);
    }
    
    function setTokenExchangeProvider(
        address _token,
        address _provider,
        bytes32 _exchangeId
    ) external hasRole(ADMIN_ROLE) validAddress(_token) validAddress(_provider) {
        require(supportedTokens[_token], "TreasuryModule: Token not supported");
        
        tokenExchangeProviders[_token] = TokenExchangeProvider({
            provider: _provider,
            exchangeId: _exchangeId,
            active: true
        });
        
        // Approve broker for token swaps
        IERC20(_token).approve(mentoTokenBroker, type(uint256).max);
        
        emit TokenExchangeProviderSet(_token, _provider, _exchangeId);
    }
    
    function updateTokenExchangeProvider(
        address _token,
        address _newProvider,
        bytes32 _newExchangeId
    ) external hasRole(ADMIN_ROLE) validAddress(_token) validAddress(_newProvider) {
        require(tokenExchangeProviders[_token].active, "TreasuryModule: No active exchange provider");
        
        // Reset approval for old broker
        IERC20(_token).approve(mentoTokenBroker, 0);
        
        tokenExchangeProviders[_token] = TokenExchangeProvider({
            provider: _newProvider,
            exchangeId: _newExchangeId,
            active: true
        });
        
        // Approve new broker
        IERC20(_token).approve(mentoTokenBroker, type(uint256).max);
        
        emit TokenExchangeProviderSet(_token, _newProvider, _newExchangeId);
    }
    
    function deactivateTokenExchangeProvider(address _token) external hasRole(ADMIN_ROLE) {
        require(tokenExchangeProviders[_token].active, "TreasuryModule: Provider not active");
        
        tokenExchangeProviders[_token].active = false;
        IERC20(_token).approve(mentoTokenBroker, 0);
        
        emit TokenExchangeProviderDeactivated(_token);
    }

    // Broker Management
    function updateBroker(address _newBroker) external hasRole(ADMIN_ROLE) validAddress(_newBroker) {
        mentoTokenBroker = _newBroker;
        emit BrokerUpdated(_newBroker);
    }
    
    function setCeloToken(address _celoToken) external hasRole(ADMIN_ROLE) validAddress(_celoToken) {
        celoToken = IERC20(_celoToken);
        
        // Automatically add CELO as supported token if not already
        if (!supportedTokens[_celoToken]) {
            supportedTokens[_celoToken] = true;
            supportedTokensList.push(_celoToken);
            emit TokenAdded(_celoToken);
        }
    }

    // Fee Management Functions
    
    function updateSlippageTolerance(uint256 _newSlippageTolerance) external hasRole(ADMIN_ROLE) {
        require(_newSlippageTolerance >= 900 && _newSlippageTolerance <= 999, "TreasuryModule: Invalid slippage tolerance"); // Between 0.1% and 10%
        uint256 oldSlippage = slippageTolerance;
        slippageTolerance = _newSlippageTolerance;
        emit SlippageToleranceUpdated(oldSlippage, _newSlippageTolerance);
    }
    
    function updateFeeStructure(
        uint256 _platformFeePercentage,
        uint256 _campaignCreationFee,
        uint256 _projectAdditionFee,
        uint256 _emergencyWithdrawalDelay,
        bool _feesEnabled
    ) external hasRole(ADMIN_ROLE) {
        require(_platformFeePercentage <= MAX_PLATFORM_FEE_PERCENTAGE, "TreasuryModule: Platform fee too high"); // Max 25%
        
        uint256 oldCampaignFee = feeStructure.campaignCreationFee;
        uint256 oldProjectFee = feeStructure.projectAdditionFee;
        
        feeStructure.platformFeePercentage = _platformFeePercentage;
        feeStructure.campaignCreationFee = _campaignCreationFee;
        feeStructure.projectAdditionFee = _projectAdditionFee;
        feeStructure.emergencyWithdrawalDelay = _emergencyWithdrawalDelay;
        feeStructure.feesEnabled = _feesEnabled;
        
        emit FeeAmountUpdated("campaignCreation", oldCampaignFee, _campaignCreationFee);
        emit FeeAmountUpdated("projectAddition", oldProjectFee, _projectAdditionFee);
        emit FeeStructureUpdated(_platformFeePercentage, _campaignCreationFee, _projectAdditionFee, _feesEnabled);
    }
    
    function collectFee(address _token, uint256 _amount, string memory _feeType) external onlyMainContract {
        require(supportedTokens[_token], "TreasuryModule: Token not supported");
        require(feeStructure.feesEnabled, "TreasuryModule: Fees are disabled");
        
        collectedFees[_token] += _amount;
        emit FeeCollected(_token, _amount, _feeType);
    }
    
    function withdrawFees(
        address _token,
        address _recipient,
        uint256 _amount
    ) external hasRole(ADMIN_ROLE) validAddress(_recipient) {
        uint256 feeBalance = collectedFees[_token];
        require(feeBalance > 0, "TreasuryModule: No fees collected for this token");
        
        uint256 amountToWithdraw = _amount == 0 ? feeBalance : _amount;
        require(amountToWithdraw <= feeBalance, "TreasuryModule: Insufficient fee balance");
        
        collectedFees[_token] -= amountToWithdraw;
        
        if (_token == address(celoToken)) {
            payable(_recipient).transfer(amountToWithdraw);
        } else {
            IERC20(_token).safeTransfer(_recipient, amountToWithdraw);
        }
        
        emit FeeWithdrawn(_token, _recipient, amountToWithdraw);
    }

    // Token Conversion Functions
    function getTokenToCeloEquivalent(address _token, uint256 _amount) public view returns (uint256) {
        if (_token == address(celoToken)) return _amount;
        
        TokenExchangeProvider storage provider = tokenExchangeProviders[_token];
        require(provider.active, "TreasuryModule: No active exchange provider for token");
        
        return IBroker(mentoTokenBroker).getAmountOut(
            provider.provider,
            provider.exchangeId,
            _token,
            address(celoToken),
            _amount
        );
    }
    
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
        uint256 minAmountOut = expectedAmountOut * slippageTolerance / SLIPPAGE_DENOMINATOR; // Use configurable slippage
        
        // Check if contract has enough tokens, if not try to get them from msg.sender
        if (IERC20(_fromToken).balanceOf(address(this)) < _amount) {
            IERC20(_fromToken).safeTransferFrom(msg.sender, address(this), _amount);
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
    
    function convertTokensExternal(
        address _fromToken,
        address _toToken,
        uint256 _amount
        ) external onlyMainContract returns (uint256) {
        return convertTokens(_fromToken, _toToken, _amount);
    }
    
    function adminForceConvertTokens(
        address _fromToken,
        address _toToken,
        uint256 _amount
    ) external hasRole(ADMIN_ROLE) nonReentrant returns (uint256) {
        require(supportedTokens[_fromToken] && supportedTokens[_toToken], "TreasuryModule: Invalid tokens");
        require(_amount > 0, "TreasuryModule: Amount must be greater than 0");
        require(IERC20(_fromToken).balanceOf(address(this)) >= _amount, "TreasuryModule: Insufficient balance");
        
        uint256 beforeBalance = IERC20(_toToken).balanceOf(address(this));
        uint256 convertedAmount = convertTokens(_fromToken, _toToken, _amount);
        uint256 afterBalance = IERC20(_toToken).balanceOf(address(this));
        
        require(afterBalance >= beforeBalance, "TreasuryModule: Conversion verification failed");
        
        emit TokenConversionSucceeded(_fromToken, _toToken, _amount, convertedAmount);
        return convertedAmount;
    }

    // Fund Distribution Functions
    function distributeFunds(uint256 _campaignId) external nonReentrant onlyMainContract {
        // Get campaign data from campaigns module
        bytes memory campaignData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _campaignId));
        (, , , , , uint256 endTime, uint256 adminFeePercentage, uint256 maxWinners, bool useQuadraticDistribution, bool useCustomDistribution, address payoutToken, bool active, uint256 totalFunds) = abi.decode(campaignData, (uint256, address, string, string, uint256, uint256, uint256, uint256, bool, bool, address, bool, uint256));
        
        require(active && block.timestamp > endTime, "TreasuryModule: Campaign not ready for distribution");
        
        if (useCustomDistribution) {
            _distributeCustom(_campaignId);
            return;
        }
        
        // Get campaign token amounts
        bytes memory tokenAmountData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaignVotedTokens(uint256)", _campaignId));
        address[] memory votedTokens = abi.decode(tokenAmountData, (address[]));
        
        uint256 totalPayoutTokenAmount = 0;
        
        // Get current payout token balance
        bytes memory payoutAmountData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaignTokenAmount(uint256,address)", _campaignId, payoutToken));
        totalPayoutTokenAmount = abi.decode(payoutAmountData, (uint256));
        
        // Convert all non-payout tokens to payout token
        for (uint256 i = 0; i < votedTokens.length; i++) {
            address token = votedTokens[i];
            if (token != payoutToken) {
                bytes memory tokenBalanceData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaignTokenAmount(uint256,address)", _campaignId, token));
                uint256 tokenAmount = abi.decode(tokenBalanceData, (uint256));
                
                if (tokenAmount > 0) {
                    try this.convertTokensExternal(token, payoutToken, tokenAmount) returns (uint256 convertedAmount) {
                        totalPayoutTokenAmount += convertedAmount;
                    } catch {
                        emit TokenConversionFailed(_campaignId, token, tokenAmount);
                    }
                }
            }
        }
        
        if (totalPayoutTokenAmount == 0) {
            emit FundsDistributed(_campaignId);
            return;
        }
        
        // Calculate fees
        uint256 platformFeeAmount = (totalPayoutTokenAmount * feeStructure.platformFeePercentage) / 100;
        uint256 adminFeeAmount = (totalPayoutTokenAmount * adminFeePercentage) / 100;
        uint256 remainingFunds = totalPayoutTokenAmount - platformFeeAmount - adminFeeAmount;
        
        // Transfer platform fee to treasury
        if (platformFeeAmount > 0) {
            collectedFees[payoutToken] += platformFeeAmount;
            emit FeeCollected(payoutToken, platformFeeAmount, "platform_distribution");
        }
        
        // Transfer admin fee
        if (adminFeeAmount > 0) {
            bytes memory adminData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _campaignId));
            (, address admin, , , , , , , , , , , ) = abi.decode(adminData, (uint256, address, string, string, uint256, uint256, uint256, uint256, bool, bool, address, bool, uint256));
            
            if (payoutToken == address(celoToken)) {
                payable(admin).transfer(adminFeeAmount);
            } else {
                IERC20(payoutToken).safeTransfer(admin, adminFeeAmount);
            }
        }
        
        // Distribute remaining funds to projects
        _distributeToWinners(_campaignId, remainingFunds, payoutToken, useQuadraticDistribution, maxWinners);
        
        emit FundsDistributed(_campaignId);
    }
    
    function manualDistributeDetailed(
        uint256 _campaignId,
        CustomDistributionDetails[] memory _distributions,
        address _token
    ) external nonReentrant onlyMainContract {
        require(supportedTokens[_token], "TreasuryModule: Token not supported");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _distributions.length; i++) {
            totalAmount += _distributions[i].amount;
        }
        
        // Check balance
        if (_token == address(celoToken)) {
            require(address(this).balance >= totalAmount, "TreasuryModule: Insufficient CELO funds");
        } else {
            require(IERC20(_token).balanceOf(address(this)) >= totalAmount, "TreasuryModule: Insufficient token funds");
        }
        
        // Distribute to each project
        for (uint256 i = 0; i < _distributions.length; i++) {
            CustomDistributionDetails memory dist = _distributions[i];
            
            if (dist.amount > 0) {
                // Get project owner from projects module
                bytes memory projectData = mainContract.callModule("projects", abi.encodeWithSignature("getProject(uint256)", dist.projectId));
                (, address owner, , , , , , ) = abi.decode(projectData, (uint256, address, string, string, bool, bool, uint256, uint256[]));
                
                if (_token == address(celoToken)) {
                    payable(owner).transfer(dist.amount);
                } else {
                    IERC20(_token).safeTransfer(owner, dist.amount);
                }
                
                emit ProjectFundsDistributedDetailed(_campaignId, dist.projectId, dist.amount, _token, dist.comment, dist.jsonData);
            }
        }
        
        emit CustomFundsDistributed(_campaignId, "Detailed distribution completed");
    }

    // Emergency Functions
    function emergencyTokenRecovery(
        address _token,
        address _recipient,
        uint256 _amount,
        bool _forceRecovery
    ) external hasRole(EMERGENCY_ROLE) validAddress(_recipient) {
        bool tokensNeeded = _areTokensNeededForActiveCampaigns(_token);
        require(!tokensNeeded || _forceRecovery, "TreasuryModule: Tokens needed for active campaigns");
        
        uint256 balance;
        uint256 amountToRecover;
        
        if (_token == address(celoToken)) {
            balance = address(this).balance;
            amountToRecover = _amount == 0 ? balance : _amount;
            require(amountToRecover <= balance, "TreasuryModule: Insufficient CELO balance");
            payable(_recipient).transfer(amountToRecover);
        } else {
            balance = IERC20(_token).balanceOf(address(this));
            amountToRecover = _amount == 0 ? balance : _amount;
            require(amountToRecover <= balance, "TreasuryModule: Insufficient token balance");
            IERC20(_token).safeTransfer(_recipient, amountToRecover);
        }
        
        // Record emergency withdrawal
        emergencyWithdrawals[_token] += amountToRecover;
        lastEmergencyWithdrawal[_token] = block.timestamp;
        
        emit EmergencyTokenRecovery(_token, _recipient, amountToRecover, tokensNeeded);
    }

    // Internal helper functions
    function _distributeCustom(uint256 _campaignId) internal {
        // Mark campaign as inactive through campaigns module
        mainContract.callModule("campaigns", abi.encodeWithSignature("deactivateCampaign(uint256)", _campaignId));
        
        // Get custom distribution data
        bytes memory metadataData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaignMetadata(uint256)", _campaignId));
        (, , string memory customDistributionData) = abi.decode(metadataData, (string, string, string));
        
        emit CustomFundsDistributed(_campaignId, customDistributionData);
    }
    
    function _distributeToWinners(
        uint256 _campaignId,
        uint256 _remainingFunds,
        address _payoutToken,
        bool _useQuadraticDistribution,
        uint256 _maxWinners
    ) internal {
        // Get sorted projects from voting module
        bytes memory sortedProjectsData = mainContract.callModule("voting", abi.encodeWithSignature("getSortedProjects(uint256)", _campaignId));
        uint256[] memory sortedProjectIds = abi.decode(sortedProjectsData, (uint256[]));
        
        if (sortedProjectIds.length == 0) {
            // Return funds to treasury if no projects
            collectedFees[_payoutToken] += _remainingFunds;
            return;
        }
        
        uint256 winnersCount = _maxWinners == 0 || _maxWinners >= sortedProjectIds.length ? sortedProjectIds.length : _maxWinners;
        uint256 actualWinners = 0;
        
        // Count actual winners (projects with votes)
        for (uint256 i = 0; i < winnersCount && i < sortedProjectIds.length; i++) {
            bytes memory participationData = mainContract.callModule("voting", abi.encodeWithSignature("getParticipation(uint256,uint256)", _campaignId, sortedProjectIds[i]));
            (, uint256 voteCount, ) = abi.decode(participationData, (bool, uint256, uint256));
            
            if (voteCount > 0) actualWinners++;
            else break;
        }
        
        if (actualWinners == 0) {
            collectedFees[_payoutToken] += _remainingFunds;
            return;
        }
        
        // Distribute based on method
        if (_useQuadraticDistribution) {
            _distributeQuadraticEnhanced(_campaignId, sortedProjectIds, actualWinners, _remainingFunds, _payoutToken);
        } else {
            _distributeProportional(_campaignId, sortedProjectIds, actualWinners, _remainingFunds, _payoutToken);
        }
    }
    
    function _distributeQuadratic(
        uint256 _campaignId,
        uint256[] memory _sortedProjectIds,
        uint256 _actualWinners,
        uint256 _remainingFunds,
        address _payoutToken
    ) internal {
        uint256[] memory weights = new uint256[](_actualWinners);
        uint256 totalWeight = 0;
        
        // Calculate quadratic weights
        for (uint256 i = 0; i < _actualWinners; i++) {
            bytes memory participationData = mainContract.callModule("voting", abi.encodeWithSignature("getParticipation(uint256,uint256)", _campaignId, _sortedProjectIds[i]));
            (, uint256 voteCount, ) = abi.decode(participationData, (bool, uint256, uint256));
            
            weights[i] = _sqrt(voteCount);
            totalWeight += weights[i];
        }
        
        // Distribute based on quadratic weights
        for (uint256 i = 0; i < _actualWinners; i++) {
            uint256 projectShare = (_remainingFunds * weights[i]) / totalWeight;
            _transferProjectFunds(_campaignId, _sortedProjectIds[i], projectShare, _payoutToken);
        }
    }
    
    // Calculate proportional distribution preview
    function _calculateProportionalPreview(
        uint256 _campaignId,
        uint256[] memory _sortedProjectIds,
        uint256 _actualWinners,
        uint256 _remainingFunds,
        uint256[] memory _projectIds,
        uint256[] memory _projectedShares,
        uint256[] memory _weights
    ) internal {
        uint256 totalWinningVotes = 0;
        
        // Calculate total winning votes first
        for (uint256 i = 0; i < _actualWinners; i++) {
            _projectIds[i] = _sortedProjectIds[i];
            
            bytes memory participationData = mainContract.callModule("voting", abi.encodeWithSignature("getParticipation(uint256,uint256)", _campaignId, _sortedProjectIds[i]));
            (, uint256 voteCount, ) = abi.decode(participationData, (bool, uint256, uint256));
            
            _weights[i] = voteCount;
            totalWinningVotes += voteCount;
        }
        
        // Calculate projected shares
        for (uint256 i = 0; i < _actualWinners; i++) {
            _projectedShares[i] = (_remainingFunds * _weights[i]) / totalWinningVotes;
        }
    }
    
    // Proportional distribution for actual fund distribution
    function _distributeProportional(
        uint256 _campaignId,
        uint256[] memory _sortedProjectIds,
        uint256 _actualWinners,
        uint256 _remainingFunds,
        address _payoutToken
    ) internal {
        uint256 totalWinningVotes = 0;
        
        // Calculate total winning votes
        for (uint256 i = 0; i < _actualWinners; i++) {
            bytes memory participationData = mainContract.callModule("voting", abi.encodeWithSignature("getParticipation(uint256,uint256)", _campaignId, _sortedProjectIds[i]));
            (, uint256 voteCount, ) = abi.decode(participationData, (bool, uint256, uint256));
            totalWinningVotes += voteCount;
        }
        
        // Distribute proportionally
        for (uint256 i = 0; i < _actualWinners; i++) {
            bytes memory participationData = mainContract.callModule("voting", abi.encodeWithSignature("getParticipation(uint256,uint256)", _campaignId, _sortedProjectIds[i]));
            (, uint256 voteCount, ) = abi.decode(participationData, (bool, uint256, uint256));
            
            uint256 projectShare = (_remainingFunds * voteCount) / totalWinningVotes;
            _transferProjectFunds(_campaignId, _sortedProjectIds[i], projectShare, _payoutToken);
        }
    }
    
    // Enhanced quadratic distribution that accounts for number of voters
    function _distributeQuadraticEnhanced(
        uint256 _campaignId,
        uint256[] memory _sortedProjectIds,
        uint256 _actualWinners,
        uint256 _remainingFunds,
        address _payoutToken
    ) internal {
        uint256[] memory weights = new uint256[](_actualWinners);
        uint256 totalWeight = 0;
        
        // Get total number of unique voters in the campaign
        bytes memory voterCountData = mainContract.callModule("voting", abi.encodeWithSignature("getCampaignTotalVoters(uint256)", _campaignId));
        uint256 totalVoters = abi.decode(voterCountData, (uint256));
        
        // Calculate enhanced quadratic weights that consider both vote count and voter diversity
        for (uint256 i = 0; i < _actualWinners; i++) {
            bytes memory participationData = mainContract.callModule("voting", abi.encodeWithSignature("getParticipation(uint256,uint256)", _campaignId, _sortedProjectIds[i]));
            (, uint256 voteCount, ) = abi.decode(participationData, (bool, uint256, uint256));
            
            // Enhanced quadratic formula: sqrt(votes) * (1 + voter_diversity_bonus)
            uint256 baseWeight = _sqrt(voteCount);
            uint256 voterDiversityBonus = _calculateVoterDiversityBonus(_campaignId, _sortedProjectIds[i], totalVoters);
            weights[i] = baseWeight + voterDiversityBonus;
            totalWeight += weights[i];
        }
        
        // Distribute based on enhanced quadratic weights
        for (uint256 i = 0; i < _actualWinners; i++) {
            uint256 projectShare = (_remainingFunds * weights[i]) / totalWeight;
            _transferProjectFunds(_campaignId, _sortedProjectIds[i], projectShare, _payoutToken);
        }
    }
    
    // Calculate voter diversity bonus to encourage broader participation
    function _calculateVoterDiversityBonus(
        uint256 _campaignId,
        uint256 _projectId,
        uint256 _totalVoters
    ) internal returns (uint256) {
        // Get unique voters for this project
        bytes memory uniqueVotersData = mainContract.callModule("voting", abi.encodeWithSignature("getProjectUniqueVoters(uint256,uint256)", _campaignId, _projectId));
        uint256 uniqueVoters = abi.decode(uniqueVotersData, (uint256));
        
        // Calculate diversity ratio (unique voters / total campaign voters)
        uint256 diversityRatio = (uniqueVoters * DIVERSITY_PRECISION) / _totalVoters; // Use basis points for precision
        
        // Bonus increases with diversity, capped at 20% of base weight
        if (diversityRatio >= DIVERSITY_BONUS_THRESHOLD_80) { // 80%+ diversity
            return MAX_DIVERSITY_BONUS; // 20% bonus
        } else if (diversityRatio >= DIVERSITY_BONUS_THRESHOLD_60) { // 60%+ diversity
            return HIGH_DIVERSITY_BONUS; // 15% bonus
        } else if (diversityRatio >= DIVERSITY_BONUS_THRESHOLD_40) { // 40%+ diversity
            return MEDIUM_DIVERSITY_BONUS; // 10% bonus
        } else if (diversityRatio >= DIVERSITY_BONUS_THRESHOLD_20) { // 20%+ diversity
            return LOW_DIVERSITY_BONUS; // 5% bonus
        }
        
        return 0; // No bonus for low diversity
    }

    // Preview distribution without actually distributing funds
    function previewDistribution(
        uint256 _campaignId,
        uint256 _amount
    ) external returns (
        uint256[] memory projectIds,
        uint256[] memory projectedShares,
        uint256[] memory weights,
        string memory distributionType
    ) {
        // Get campaign details
        bytes memory campaignData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _campaignId));
        (, , , , , , uint256 adminFeePercentage, uint256 maxWinners, bool useQuadraticDistribution, , address payoutToken, , ) = abi.decode(campaignData, (uint256, address, string, string, uint256, uint256, uint256, uint256, bool, bool, address, bool, uint256));
        
        // Get sorted project IDs
        bytes memory sortedProjectsData = mainContract.callModule("voting", abi.encodeWithSignature("getSortedProjects(uint256)", _campaignId));
        uint256[] memory sortedProjectIds = abi.decode(sortedProjectsData, (uint256[]));
        
        if (sortedProjectIds.length == 0) {
            return (new uint256[](0), new uint256[](0), new uint256[](0), "No projects");
        }
        
        // Calculate admin fee
        uint256 adminFee = (_amount * adminFeePercentage) / 10000;
        uint256 remainingFunds = _amount - adminFee;
        
        // Determine actual winners
        uint256 actualWinners = maxWinners > 0 ? 
            (maxWinners < sortedProjectIds.length ? maxWinners : sortedProjectIds.length) : 
            sortedProjectIds.length;
        
        // Initialize arrays
        projectIds = new uint256[](actualWinners);
        projectedShares = new uint256[](actualWinners);
        weights = new uint256[](actualWinners);
        
        if (useQuadraticDistribution) {
            distributionType = "Quadratic";
            _calculateQuadraticPreview(_campaignId, sortedProjectIds, actualWinners, remainingFunds, projectIds, projectedShares, weights);
        } else {
            distributionType = "Proportional";
            _calculateProportionalPreview(_campaignId, sortedProjectIds, actualWinners, remainingFunds, projectIds, projectedShares, weights);
        }
        
        return (projectIds, projectedShares, weights, distributionType);
    }
    
    // Calculate quadratic distribution preview
    function _calculateQuadraticPreview(
        uint256 _campaignId,
        uint256[] memory _sortedProjectIds,
        uint256 _actualWinners,
        uint256 _remainingFunds,
        uint256[] memory _projectIds,
        uint256[] memory _projectedShares,
        uint256[] memory _weights
    ) internal {
        uint256 totalWeight = 0;
        
        // Get total number of unique voters in the campaign
        bytes memory voterCountData = mainContract.callModule("voting", abi.encodeWithSignature("getCampaignTotalVoters(uint256)", _campaignId));
        uint256 totalVoters = abi.decode(voterCountData, (uint256));
        
        // Calculate weights first
        for (uint256 i = 0; i < _actualWinners; i++) {
            _projectIds[i] = _sortedProjectIds[i];
            
            bytes memory participationData = mainContract.callModule("voting", abi.encodeWithSignature("getParticipation(uint256,uint256)", _campaignId, _sortedProjectIds[i]));
            (, uint256 voteCount, ) = abi.decode(participationData, (bool, uint256, uint256));
            
            uint256 baseWeight = _sqrt(voteCount);
            uint256 voterDiversityBonus = _calculateVoterDiversityBonus(_campaignId, _sortedProjectIds[i], totalVoters);
            _weights[i] = baseWeight + voterDiversityBonus;
            totalWeight += _weights[i];
        }
        
        // Calculate projected shares
        for (uint256 i = 0; i < _actualWinners; i++) {
            _projectedShares[i] = (_remainingFunds * _weights[i]) / totalWeight;
        }
    }
    
    function _transferProjectFunds(
        uint256 _campaignId,
        uint256 _projectId,
        uint256 _amount,
        address _token
    ) internal {
        if (_amount > 0) {
            // Get project owner
            bytes memory projectData = mainContract.callModule("projects", abi.encodeWithSignature("getProject(uint256)", _projectId));
            (, address owner, , , , , , ) = abi.decode(projectData, (uint256, address, string, string, bool, bool, uint256, uint256[]));
            
            if (_token == address(celoToken)) {
                payable(owner).transfer(_amount);
            } else {
                IERC20(_token).safeTransfer(owner, _amount);
            }
            
            // Update project stats
            mainContract.callModule("projects", abi.encodeWithSignature("updateProjectStats(uint256,uint256,uint256)", _projectId, _amount, 0));
            
            emit FundsDistributedToProject(_campaignId, _projectId, _amount, _token);
        }
    }
    
    function _areTokensNeededForActiveCampaigns(address _token) internal returns (bool) {
        // Get all active campaigns
        bytes memory activeCampaignsData = mainContract.callModule("campaigns", abi.encodeWithSignature("getActiveCampaigns()"));
        uint256[] memory activeCampaigns = abi.decode(activeCampaignsData, (uint256[]));
        
        for (uint256 i = 0; i < activeCampaigns.length; i++) {
            bytes memory tokenAmountData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaignTokenAmount(uint256,address)", activeCampaigns[i], _token));
            uint256 tokenAmount = abi.decode(tokenAmountData, (uint256));
            
            if (tokenAmount > 0) return true;
        }
        
        return false;
    }
    
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    // Fee validation and collection
    function canBypassFees(uint256 _campaignId, address _user) external returns (bool) {
        // Check if user is campaign admin
    if (_campaignId >= 0) {
            bytes memory isAdminData = mainContract.callModule("campaigns", abi.encodeWithSignature("isCampaignAdmin(uint256,address)", _campaignId, _user));
            bool isCampaignAdmin = abi.decode(isAdminData, (bool));
            if (isCampaignAdmin) return true;
        }
        
        // Check if user has admin role
        return mainContract.hasModuleAccess(_user, ADMIN_ROLE);
    }
    
    function validateAndCollectFee(
        address _feeToken,
        uint256 _baseFee,
        string memory _feeType,
        uint256 _campaignId,
        address _payer
    ) external onlyMainContract returns (bool) {
        require(supportedTokens[_feeToken], "TreasuryModule: Fee token not supported");
        
        if (this.canBypassFees(_campaignId, _payer)) return true;
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

    // View Functions
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokensList;
    }
    
    function isTokenSupported(address _token) external view returns (bool) {
        return supportedTokens[_token];
    }
    
    function getTokenExchangeProvider(address _token) external view returns (
        address provider,
        bytes32 exchangeId,
        bool active
    ) {
        TokenExchangeProvider storage tokenProvider = tokenExchangeProviders[_token];
        return (tokenProvider.provider, tokenProvider.exchangeId, tokenProvider.active);
    }
    
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
    
    function getFeeStructure() external view returns (
        uint256 platformFeePercentage,
        uint256 campaignCreationFee,
        uint256 projectAdditionFee,
        uint256 emergencyWithdrawalDelay,
        bool feesEnabled
    ) {
        return (
            feeStructure.platformFeePercentage,
            feeStructure.campaignCreationFee,
            feeStructure.projectAdditionFee,
            feeStructure.emergencyWithdrawalDelay,
            feeStructure.feesEnabled
        );
    }
    
    function getCollectedFees(address _token) external view returns (uint256) {
        return collectedFees[_token];
    }
    
    function getTreasuryBalance(address _token) external view returns (uint256) {
        if (_token == address(celoToken)) {
            return address(this).balance;
        } else {
            return IERC20(_token).balanceOf(address(this));
        }
    }
    
    function getTreasuryBalances() external view returns (
        address[] memory tokens,
        uint256[] memory balances
    ) {
        tokens = supportedTokensList;
        balances = new uint256[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == address(celoToken)) {
                balances[i] = address(this).balance;
            } else {
                balances[i] = IERC20(tokens[i]).balanceOf(address(this));
            }
        }
    }

    // Receive function to accept CELO
    receive() external payable {
        // Allow contract to receive CELO
    }

    // Module info
    function getModuleName() external pure returns (string memory) {
        return "treasury";
    }
    
    function getModuleVersion() external pure returns (uint256) {
        return 5;
    }
}