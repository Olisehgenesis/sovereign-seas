// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.28;

// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// // Interface for SovereignSeas V4 contract
// interface ISovereignSeas {
//     function vote(uint256 _campaignId, uint256 _projectId, address _token, uint256 _amount, bytes32 _bypassCode) external;
//     function voteWithCelo(uint256 _campaignId, uint256 _projectId, bytes32 _bypassCode) external payable;
//     function getTokenToCeloEquivalent(address _token, uint256 _amount) external view returns (uint256);
//     function isTokenSupported(address _token) external view returns (bool);
//     function getCampaign(uint256 _campaignId) external view returns (
//         uint256 id, 
//         address admin, 
//         string memory name, 
//         string memory description,
//         uint256 startTime, 
//         uint256 endTime, 
//         uint256 adminFeePercentage,
//         uint256 maxWinners, 
//         bool useQuadraticDistribution, 
//         bool useCustomDistribution,
//         address payoutToken, 
//         bool active, 
//         uint256 totalFunds
//     );
//     function getParticipation(uint256 _campaignId, uint256 _projectId) external view returns (
//         bool approved, uint256 voteCount, uint256 fundsReceived
//     );
// }

// // Interface for Mento Broker
// interface IMentoBroker {
//     function swapIn(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut);
//     function getAmountOut(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 amountOut);
// }

// // Interface for Ubeswap V3 Router for tokens not supported by Mento
// interface IUbeswapV3Router {
//     struct ExactInputSingleParams {
//         address tokenIn;
//         address tokenOut;
//         uint24 fee;
//         address recipient;
//         uint256 deadline;
//         uint256 amountIn;
//         uint256 amountOutMinimum;
//         uint160 sqrtPriceLimitX96;
//     }
    
//     function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
// }

// // Interface for Ubeswap V3 Quoter for price estimation
// interface IUbeswapV3Quoter {
//     function quoteExactInputSingle(
//         address tokenIn,
//         address tokenOut,
//         uint24 fee,
//         uint256 amountIn,
//         uint160 sqrtPriceLimitX96
//     ) external returns (uint256 amountOut);
// }

// contract TokenVoter is Ownable(msg.sender), ReentrancyGuard {
//     using SafeERC20 for IERC20;

//     // Contract addresses
//     ISovereignSeas public sovereignSeas;
//     IMentoBroker public mentoBroker;
//     IUbeswapV3Router public ubeswapRouter;
//     IUbeswapV3Quoter public ubeswapQuoter;
    
//     // Base token address (CELO)
//     IERC20 public immutable celoToken;
    
//     // Configuration
//     uint256 public constant SLIPPAGE_TOLERANCE = 250; // 2.5%
//     uint256 public constant DEADLINE_BUFFER = 300; // 5 minutes
//     uint24 public constant DEFAULT_FEE = 3000; // 0.3%
    
//     // Mappings
//     mapping(address => TokenConfig) public tokenConfigs;
//     mapping(address => bool) public supportedTokens;
//     mapping(address => string) public tokenNames;
//     mapping(address => string) public tokenSymbols;
//     mapping(address => uint8) public tokenDecimals;
//     mapping(address => uint256) public tokenBalances;
//     mapping(uint256 => mapping(address => uint256)) public userVotesByCampaign;
//     mapping(address => VoteRecord[]) public userVoteHistory;
    
//     // Arrays
//     address[] public supportedTokensList;
    
//     // Structs
//     struct TokenInfo {
//         address tokenAddress;
//         string name;
//         string symbol;
//         uint8 decimals;
//         bool useMento;
//         bool useUbeswap;
//         address exchangeProvider;
//         bytes32 exchangeId;
//         uint24 ubeswapFee;
//         bool active;
//         uint256 addedTimestamp;
//     }
    
//     struct TokenConfig {
//         bool useMento;
//         bool useUbeswap;
//         address exchangeProvider; // For Mento
//         bytes32 exchangeId; // For Mento
//         uint24 ubeswapFee; // For Ubeswap
//         bool active;
//     }
    
//     struct VoteRecord {
//         uint256 campaignId;
//         uint256 projectId;
//         address token;
//         uint256 amount;
//         uint256 celoEquivalent;
//         uint256 timestamp;
//     }
    
//     struct VoteEstimate {
//         uint256 celoEquivalent;
//         uint256 estimatedImpact;
//         uint256 slippageAmount;
//         bool canVote;
//         string reason;
//     }
    
//     // Events
//     event TokenAdded(address indexed token, string name, string symbol, uint8 decimals);
//     event TokenRemoved(address indexed token);
//     event TokenConfigured(address indexed token, bool useMento, bool useUbeswap, uint24 fee);
//     event VoteCast(address indexed voter, uint256 indexed campaignId, uint256 indexed projectId, address token, uint256 amount, uint256 celoEquivalent);
//     event TokenConverted(address indexed fromToken, address indexed toToken, uint256 amountIn, uint256 amountOut);
//     event ContractUpdated(string contractType, address newAddress);
    
//     // Custom errors
//     error TokenNotSupported(address token);
//     error InsufficientBalance(address token, uint256 required, uint256 available);
//     error CampaignNotActive(uint256 campaignId);
//     error ProjectNotApproved(uint256 campaignId, uint256 projectId);
//     error ConversionFailed(address fromToken, address toToken, uint256 amount);
//     error InvalidConfiguration(string reason);
    
//     constructor(
//         address _sovereignSeas,
//         address _mentoBroker,
//         address _ubeswapRouter,
//         address _ubeswapQuoter,
//         address _celoToken
//     ) {
//         require(_sovereignSeas != address(0), "Invalid SovereignSeas address");
//         require(_celoToken != address(0), "Invalid CELO token address");
        
//         sovereignSeas = ISovereignSeas(_sovereignSeas);
//         mentoBroker = IMentoBroker(_mentoBroker);
//         ubeswapRouter = IUbeswapV3Router(_ubeswapRouter);
//         ubeswapQuoter = IUbeswapV3Quoter(_ubeswapQuoter);
        
//         celoToken = IERC20(_celoToken);
        
//         // Configure CELO as base token
//         _addToken(_celoToken, "Celo", "CELO", 18, false, false, address(0), bytes32(0), 0);
//     }
    
//     // Token Management Functions
//     function addToken(
//         address _token,
//         string memory _name,
//         string memory _symbol,
//         uint8 _decimals,
//         bool _useMento,
//         bool _useUbeswap,
//         address _exchangeProvider,
//         bytes32 _exchangeId,
//         uint24 _ubeswapFee
//     ) external onlyOwner {
//         require(_token != address(0), "Invalid token address");
//         require(!supportedTokens[_token], "Token already supported");
        
//         _addToken(_token, _name, _symbol, _decimals, _useMento, _useUbeswap, _exchangeProvider, _exchangeId, _ubeswapFee);
//     }
    
//     function _addToken(
//         address _token,
//         string memory _name,
//         string memory _symbol,
//         uint8 _decimals,
//         bool _useMento,
//         bool _useUbeswap,
//         address _exchangeProvider,
//         bytes32 _exchangeId,
//         uint24 _ubeswapFee
//     ) internal {
//         if (_useMento && (_exchangeProvider == address(0) || _exchangeId == bytes32(0))) {
//             revert InvalidConfiguration("Mento configuration incomplete");
//         }
        
//         if (_useUbeswap && _ubeswapFee == 0 && _token != address(celoToken)) {
//             revert InvalidConfiguration("Ubeswap fee cannot be zero for non-CELO tokens");
//         }
        
//         if (!_useMento && !_useUbeswap && _token != address(celoToken)) {
//             revert InvalidConfiguration("Token must use at least one exchange method");
//         }
        
//         // Store token information
//         tokenNames[_token] = _name;
//         tokenSymbols[_token] = _symbol;
//         tokenDecimals[_token] = _decimals;
        
//         // Configure token
//         tokenConfigs[_token] = TokenConfig({
//             useMento: _useMento,
//             useUbeswap: _useUbeswap,
//             exchangeProvider: _exchangeProvider,
//             exchangeId: _exchangeId,
//             ubeswapFee: _ubeswapFee,
//             active: true
//         });
        
//         supportedTokens[_token] = true;
//         supportedTokensList.push(_token);
        
//         emit TokenAdded(_token, _name, _symbol, _decimals);
//         emit TokenConfigured(_token, _useMento, _useUbeswap, _ubeswapFee);
//     }
    
//     function removeToken(address _token) external onlyOwner {
//         require(_token != address(celoToken), "Cannot remove base CELO token");
//         require(supportedTokens[_token], "Token not supported");
        
//         supportedTokens[_token] = false;
//         tokenConfigs[_token].active = false;
        
//         // Remove from supported tokens list
//         for (uint256 i = 0; i < supportedTokensList.length; i++) {
//             if (supportedTokensList[i] == _token) {
//                 supportedTokensList[i] = supportedTokensList[supportedTokensList.length - 1];
//                 supportedTokensList.pop();
//                 break;
//             }
//         }
        
//         emit TokenRemoved(_token);
//     }
    
//     // Batch add tokens function for easier deployment
//     function addTokensBatch(
//         address[] memory _tokens,
//         string[] memory _names,
//         string[] memory _symbols,
//         uint8[] memory _decimals,
//         bool[] memory _useMento,
//         bool[] memory _useUbeswap,
//         address[] memory _exchangeProviders,
//         bytes32[] memory _exchangeIds,
//         uint24[] memory _ubeswapFees
//     ) external onlyOwner {
//         require(_tokens.length == _names.length && 
//                 _names.length == _symbols.length &&
//                 _symbols.length == _decimals.length &&
//                 _decimals.length == _useMento.length &&
//                 _useMento.length == _useUbeswap.length &&
//                 _useUbeswap.length == _exchangeProviders.length &&
//                 _exchangeProviders.length == _exchangeIds.length &&
//                 _exchangeIds.length == _ubeswapFees.length, 
//                 "Array lengths must match");
        
//         for (uint256 i = 0; i < _tokens.length; i++) {
//             if (!supportedTokens[_tokens[i]]) {
//                 _addToken(
//                     _tokens[i],
//                     _names[i],
//                     _symbols[i],
//                     _decimals[i],
//                     _useMento[i],
//                     _useUbeswap[i],
//                     _exchangeProviders[i],
//                     _exchangeIds[i],
//                     _ubeswapFees[i]
//                 );
//             }
//         }
//     }

//     // Configuration functions
//     function configureToken(
//         address _token,
//         bool _useMento,
//         bool _useUbeswap,
//         address _exchangeProvider,
//         bytes32 _exchangeId,
//         uint24 _ubeswapFee
//     ) external onlyOwner {
//         require(supportedTokens[_token], "Token not supported");
//         _configureToken(_token, _useMento, _useUbeswap, _exchangeProvider, _exchangeId, _ubeswapFee);
//     }
    
//     function _configureToken(
//         address _token,
//         bool _useMento,
//         bool _useUbeswap,
//         address _exchangeProvider,
//         bytes32 _exchangeId,
//         uint24 _ubeswapFee
//     ) internal {
//         if (_useMento && (_exchangeProvider == address(0) || _exchangeId == bytes32(0))) {
//             revert InvalidConfiguration("Mento configuration incomplete");
//         }
        
//         if (_useUbeswap && _ubeswapFee == 0 && _token != address(celoToken)) {
//             revert InvalidConfiguration("Ubeswap fee cannot be zero for non-CELO tokens");
//         }
        
//         if (!_useMento && !_useUbeswap && _token != address(celoToken)) {
//             revert InvalidConfiguration("Token must use at least one exchange method");
//         }
        
//         tokenConfigs[_token] = TokenConfig({
//             useMento: _useMento,
//             useUbeswap: _useUbeswap,
//             exchangeProvider: _exchangeProvider,
//             exchangeId: _exchangeId,
//             ubeswapFee: _ubeswapFee,
//             active: true
//         });
        
//         if (!supportedTokens[_token]) {
//             supportedTokens[_token] = true;
//             supportedTokensList.push(_token);
//         }
        
//         emit TokenConfigured(_token, _useMento, _useUbeswap, _ubeswapFee);
//     }
    
//     // Update contract addresses
//     function updateSovereignSeas(address _newAddress) external onlyOwner {
//         require(_newAddress != address(0), "Invalid address");
//         sovereignSeas = ISovereignSeas(_newAddress);
//         emit ContractUpdated("SovereignSeas", _newAddress);
//     }
    
//     function updateMentoBroker(address _newAddress) external onlyOwner {
//         mentoBroker = IMentoBroker(_newAddress);
//         emit ContractUpdated("MentoBroker", _newAddress);
//     }
    
//     function updateUbeswapRouter(address _newAddress) external onlyOwner {
//         ubeswapRouter = IUbeswapV3Router(_newAddress);
//         emit ContractUpdated("UbeswapRouter", _newAddress);
//     }
    
//     function updateUbeswapQuoter(address _newAddress) external onlyOwner {
//         ubeswapQuoter = IUbeswapV3Quoter(_newAddress);
//         emit ContractUpdated("UbeswapQuoter", _newAddress);
//     }
    
//     // Voting functions
//     function vote(
//         uint256 _campaignId,
//         uint256 _projectId,
//         address _token,
//         uint256 _amount,
//         bytes32 _bypassCode
//     ) external nonReentrant {
//         _executeVote(_campaignId, _projectId, _token, _amount, _bypassCode);
//     }
    
//     function _executeVote(
//         uint256 _campaignId,
//         uint256 _projectId,
//         address _token,
//         uint256 _amount,
//         bytes32 _bypassCode
//     ) internal {
//         if (!supportedTokens[_token]) revert TokenNotSupported(_token);
//         if (!tokenConfigs[_token].active) revert TokenNotSupported(_token);
        
//         // Validate campaign and project
//         _validateCampaignAndProject(_campaignId, _projectId);
        
//         // Check user balance
//         uint256 userBalance = IERC20(_token).balanceOf(msg.sender);
//         if (userBalance < _amount) revert InsufficientBalance(_token, _amount, userBalance);
        
//         // Transfer tokens from user
//         IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
//         // Convert to CELO equivalent if needed
//         uint256 celoEquivalent;
//         if (_token == address(celoToken)) {
//             celoEquivalent = _amount;
//         } else {
//             celoEquivalent = _convertToCeloEquivalent(_token, _amount);
//         }
        
//         // Cast vote through SovereignSeas
//         if (_token == address(celoToken)) {
//             sovereignSeas.voteWithCelo{value: _amount}(_campaignId, _projectId, _bypassCode);
//         } else {
//             // Approve SovereignSeas to spend tokens
//             IERC20(_token).approve(address(sovereignSeas), _amount);
//             sovereignSeas.vote(_campaignId, _projectId, _token, _amount, _bypassCode);
//         }
        
//         // Record vote
//         userVotesByCampaign[_campaignId][msg.sender] += celoEquivalent;
//         userVoteHistory[msg.sender].push(VoteRecord({
//             campaignId: _campaignId,
//             projectId: _projectId,
//             token: _token,
//             amount: _amount,
//             celoEquivalent: celoEquivalent,
//             timestamp: block.timestamp
//         }));
        
//         emit VoteCast(msg.sender, _campaignId, _projectId, _token, _amount, celoEquivalent);
//     }
    
//     // Batch voting function
//     function batchVote(
//         uint256[] calldata _campaignIds,
//         uint256[] calldata _projectIds,
//         address[] calldata _tokens,
//         uint256[] calldata _amounts,
//         bytes32 _bypassCode
//     ) external nonReentrant {
//         require(_campaignIds.length == _projectIds.length && 
//                 _projectIds.length == _tokens.length && 
//                 _tokens.length == _amounts.length, 
//                 "Array lengths must match");
        
//         for (uint256 i = 0; i < _campaignIds.length; i++) {
//             _executeVote(_campaignIds[i], _projectIds[i], _tokens[i], _amounts[i], _bypassCode);
//         }
//     }
    
//     // Estimation functions
//     function estimateVote(
//         uint256 _campaignId,
//         uint256 _projectId,
//         address _token,
//         uint256 _amount
//     ) external view returns (VoteEstimate memory) {
//         if (!supportedTokens[_token]) {
//             return VoteEstimate({
//                 celoEquivalent: 0,
//                 estimatedImpact: 0,
//                 slippageAmount: 0,
//                 canVote: false,
//                 reason: "Token not supported"
//             });
//         }
        
//         if (!tokenConfigs[_token].active) {
//             return VoteEstimate({
//                 celoEquivalent: 0,
//                 estimatedImpact: 0,
//                 slippageAmount: 0,
//                 canVote: false,
//                 reason: "Token configuration inactive"
//             });
//         }
        
//         // Check campaign and project status
//         try this.validateCampaignAndProject(_campaignId, _projectId) {
//             // Campaign and project are valid
//         } catch {
//             return VoteEstimate({
//                 celoEquivalent: 0,
//                 estimatedImpact: 0,
//                 slippageAmount: 0,
//                 canVote: false,
//                 reason: "Campaign inactive or project not approved"
//             });
//         }
        
//         // Calculate CELO equivalent
//         uint256 celoEquivalent;
//         if (_token == address(celoToken)) {
//             celoEquivalent = _amount;
//         } else {
//             try this.getCeloEquivalent(_token, _amount) returns (uint256 equivalent) {
//                 celoEquivalent = equivalent;
//             } catch {
//                 return VoteEstimate({
//                     celoEquivalent: 0,
//                     estimatedImpact: 0,
//                     slippageAmount: 0,
//                     canVote: false,
//                     reason: "Unable to calculate CELO equivalent"
//                 });
//             }
//         }
        
//         // Calculate slippage
//         uint256 slippageAmount = (celoEquivalent * SLIPPAGE_TOLERANCE) / 10000;
        
//         // Get current project votes for impact estimation
//         (, uint256 currentVotes,) = sovereignSeas.getParticipation(_campaignId, _projectId);
//         uint256 estimatedImpact = currentVotes > 0 ? (celoEquivalent * 100) / (currentVotes + celoEquivalent) : 100;
        
//         return VoteEstimate({
//             celoEquivalent: celoEquivalent,
//             estimatedImpact: estimatedImpact,
//             slippageAmount: slippageAmount,
//             canVote: true,
//             reason: "Vote can be cast"
//         });
//     }
    
//     function estimateBatchVote(
//         uint256[] calldata _campaignIds,
//         uint256[] calldata _projectIds,
//         address[] calldata _tokens,
//         uint256[] calldata _amounts
//     ) external view returns (VoteEstimate[] memory) {
//         require(_campaignIds.length == _projectIds.length && 
//                 _projectIds.length == _tokens.length && 
//                 _tokens.length == _amounts.length, 
//                 "Array lengths must match");
        
//         VoteEstimate[] memory estimates = new VoteEstimate[](_campaignIds.length);
        
//         for (uint256 i = 0; i < _campaignIds.length; i++) {
//             estimates[i] = this.estimateVote(_campaignIds[i], _projectIds[i], _tokens[i], _amounts[i]);
//         }
        
//         return estimates;
//     }
    
//     // Conversion functions
//     function _convertToCeloEquivalent(address _token, uint256 _amount) internal view returns (uint256) {
//         TokenConfig memory config = tokenConfigs[_token];
        
//         if (config.useMento) {
//             return mentoBroker.getAmountOut(
//                 config.exchangeProvider,
//                 config.exchangeId,
//                 _token,
//                 address(celoToken),
//                 _amount
//             );
//         } else if (config.useUbeswap) {
//             try ubeswapQuoter.quoteExactInputSingle(
//                 _token,
//                 address(celoToken),
//                 config.ubeswapFee,
//                 _amount,
//                 0
//             ) returns (uint256 amountOut) {
//                 return amountOut;
//             } catch {
//                 revert ConversionFailed(_token, address(celoToken), _amount);
//             }
//         } else {
//             revert ConversionFailed(_token, address(celoToken), _amount);
//         }
//     }
    
//     function _convertToken(address _fromToken, address _toToken, uint256 _amount) internal returns (uint256) {
//         if (_fromToken == _toToken) return _amount;
        
//         TokenConfig memory config = tokenConfigs[_fromToken];
        
//         if (config.useMento) {
//             return mentoBroker.swapIn(
//                 config.exchangeProvider,
//                 config.exchangeId,
//                 _fromToken,
//                 _toToken,
//                 _amount,
//                 0 // Will be calculated with slippage
//             );
//         } else if (config.useUbeswap) {
//             IERC20(_fromToken).approve(address(ubeswapRouter), _amount);
            
//             IUbeswapV3Router.ExactInputSingleParams memory params = IUbeswapV3Router.ExactInputSingleParams({
//                 tokenIn: _fromToken,
//                 tokenOut: _toToken,
//                 fee: config.ubeswapFee,
//                 recipient: address(this),
//                 deadline: block.timestamp + DEADLINE_BUFFER,
//                 amountIn: _amount,
//                 amountOutMinimum: 0, // Will be calculated with slippage
//                 sqrtPriceLimitX96: 0
//             });
            
//             return ubeswapRouter.exactInputSingle(params);
//         } else {
//             revert ConversionFailed(_fromToken, _toToken, _amount);
//         }
//     }
    
//     // Helper functions
//     function _validateCampaignAndProject(uint256 _campaignId, uint256 _projectId) internal view {
//         (,,,,,,,,, address payoutToken, bool active,) = sovereignSeas.getCampaign(_campaignId);
//         if (!active) revert CampaignNotActive(_campaignId);
        
//         (bool approved,,) = sovereignSeas.getParticipation(_campaignId, _projectId);
//         if (!approved) revert ProjectNotApproved(_campaignId, _projectId);
//     }
    
//     // External validation function for estimates
//     function validateCampaignAndProject(uint256 _campaignId, uint256 _projectId) external view {
//         _validateCampaignAndProject(_campaignId, _projectId);
//     }
    
//     // External function for CELO equivalent calculation
//     function getCeloEquivalent(address _token, uint256 _amount) external view returns (uint256) {
//         return _convertToCeloEquivalent(_token, _amount);
//     }
    
//     // View functions
//     function getSupportedTokens() external view returns (address[] memory) {
//         return supportedTokensList;
//     }
    
//     function getAllTokensInfo() external view returns (TokenInfo[] memory) {
//         TokenInfo[] memory tokensInfo = new TokenInfo[](supportedTokensList.length);
        
//         for (uint256 i = 0; i < supportedTokensList.length; i++) {
//             address token = supportedTokensList[i];
//             TokenConfig memory config = tokenConfigs[token];
            
//             tokensInfo[i] = TokenInfo({
//                 tokenAddress: token,
//                 name: tokenNames[token],
//                 symbol: tokenSymbols[token],
//                 decimals: tokenDecimals[token],
//                 useMento: config.useMento,
//                 useUbeswap: config.useUbeswap,
//                 exchangeProvider: config.exchangeProvider,
//                 exchangeId: config.exchangeId,
//                 ubeswapFee: config.ubeswapFee,
//                 active: config.active,
//                 addedTimestamp: block.timestamp // This won't be accurate for existing tokens
//             });
//         }
        
//         return tokensInfo;
//     }
    
//     function getTokenInfo(address _token) external view returns (TokenInfo memory) {
//         require(supportedTokens[_token], "Token not supported");
        
//         TokenConfig memory config = tokenConfigs[_token];
        
//         return TokenInfo({
//             tokenAddress: _token,
//             name: tokenNames[_token],
//             symbol: tokenSymbols[_token],
//             decimals: tokenDecimals[_token],
//             useMento: config.useMento,
//             useUbeswap: config.useUbeswap,
//             exchangeProvider: config.exchangeProvider,
//             exchangeId: config.exchangeId,
//             ubeswapFee: config.ubeswapFee,
//             active: config.active,
//             addedTimestamp: block.timestamp
//         });
//     }
    
//     function getTokenConfig(address _token) external view returns (TokenConfig memory) {
//         return tokenConfigs[_token];
//     }
    
//     function getUserVoteHistory(address _user) external view returns (VoteRecord[] memory) {
//         return userVoteHistory[_user];
//     }
    
//     function getUserVotesInCampaign(uint256 _campaignId, address _user) external view returns (uint256) {
//         return userVotesByCampaign[_campaignId][_user];
//     }
    
//     function isTokenSupported(address _token) external view returns (bool) {
//         return supportedTokens[_token] && tokenConfigs[_token].active;
//     }
    
//     function getSupportedTokensCount() external view returns (uint256) {
//         return supportedTokensList.length;
//     }
    
//     function getTokensByExchangeMethod(bool _useMento, bool _useUbeswap) external view returns (address[] memory) {
//         uint256 count = 0;
        
//         // Count matching tokens
//         for (uint256 i = 0; i < supportedTokensList.length; i++) {
//             address token = supportedTokensList[i];
//             TokenConfig memory config = tokenConfigs[token];
            
//             if (config.active && 
//                 ((_useMento && config.useMento) || (_useUbeswap && config.useUbeswap))) {
//                 count++;
//             }
//         }
        
//         // Create result array
//         address[] memory result = new address[](count);
//         uint256 index = 0;
        
//         for (uint256 i = 0; i < supportedTokensList.length; i++) {
//             address token = supportedTokensList[i];
//             TokenConfig memory config = tokenConfigs[token];
            
//             if (config.active && 
//                 ((_useMento && config.useMento) || (_useUbeswap && config.useUbeswap))) {
//                 result[index] = token;
//                 index++;
//             }
//         }
        
//         return result;
//     }
    
//     // Emergency functions
//     function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
//         if (_token == address(0)) {
//             payable(owner()).transfer(_amount);
//         } else {
//             IERC20(_token).safeTransfer(owner(), _amount);
//         }
//     }
    
//     function pauseToken(address _token) external onlyOwner {
//         tokenConfigs[_token].active = false;
//     }
    
//     function unpauseToken(address _token) external onlyOwner {
//         tokenConfigs[_token].active = true;
//     }
    
//     // Receive function for native CELO
//     receive() external payable {}
// }