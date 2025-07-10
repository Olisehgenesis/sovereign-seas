// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.28;

// import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
// import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/utils/Pausable.sol";

// // Interface for SovereignSeasV4 contract
// interface ISovereignSeasV4 {
//     function isCampaignAdmin(uint256 _campaignId, address _admin) external view returns (bool);
//     function superAdmins(address _admin) external view returns (bool);
//     function getProject(uint256 _projectId) external view returns (
//         uint256 id, address owner, string memory name, string memory description,
//         bool transferrable, bool active, uint256 createdAt, uint256[] memory campaignIds
//     );
//     function getCampaign(uint256 _campaignId) external view returns (
//         uint256 id, address admin, string memory name, string memory description,
//         uint256 startTime, uint256 endTime, uint256 adminFeePercentage, uint256 maxWinners,
//         bool useQuadraticDistribution, bool useCustomDistribution, address payoutToken, bool active, uint256 totalFunds
//     );
// }

// contract SovereignSeasNFTEcosystem is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable, ReentrancyGuard, Pausable {
//     using SafeERC20 for IERC20;

//     // ==================== STATE VARIABLES ====================
//     ISovereignSeasV4 public sovereignSeasContract;
//     uint256 public defaultMintPrice = 1 ether; // 1 CELO = $1 default
//     uint256 public platformFeePercentage = 500; // 5% platform fee
//     uint256 private _nextTokenId = 1;
//     uint256 private _nextCollectionId = 1;

//     // ==================== ENUMS ====================
//     enum NFTType { PROJECT, CAMPAIGN, ACHIEVEMENT, MILESTONE, COLLECTION }
//     enum CollectionType { STANDARD, LIMITED, EXCLUSIVE, UTILITY, MEMBERSHIP, COMMEMORATIVE }
//     enum AccessLevel { PUBLIC, WHITELIST, HOLDER_ONLY, PREMIUM }
//     enum UtilityType { NONE, GOVERNANCE, STAKING, ACCESS, DISCOUNT, SPECIAL_FEATURES }

//     // ==================== STRUCTS ====================
//     struct Collection {
//         uint256 id;
//         uint256 projectId;
//         address creator;
//         string name;
//         string description;
//         string baseURI;
//         CollectionType collectionType;
//         AccessLevel accessLevel;
//         UtilityType utilityType;
//         uint256 maxSupply;
//         uint256 currentSupply;
//         uint256 mintPrice;
//         uint256 royaltyPercentage; // Creator royalty on secondary sales
//         uint256 startTime;
//         uint256 endTime;
//         bool isActive;
//         bool isPaused;
//         bool isRevealed;
//         string unrevealedURI;
//         uint256 createdAt;
//         // Advanced features
//         uint256 maxPerWallet;
//         uint256 maxPerTx;
//         bool hasWhitelist;
//         bool hasPresale;
//         uint256 presalePrice;
//         uint256 presaleStartTime;
//         uint256 presaleEndTime;
//         // Utility features
//         uint256 stakingRewardRate; // For staking utility
//         uint256 discountPercentage; // For discount utility
//         string[] specialFeatures; // Array of special feature descriptions
//         mapping(address => bool) whitelist;
//         mapping(address => uint256) mintedCount;
//         mapping(address => bool) holderBenefits;
//     }

//     struct NFTMetadata {
//         uint256 tokenId;
//         uint256 collectionId;
//         uint256 projectId;
//         NFTType nftType;
//         address creator;
//         address currentOwner;
//         uint256 mintedAt;
//         uint256 mintPrice;
//         string rarity;
//         bool hasUtility;
//         UtilityType utilityType;
//         uint256 stakingPower;
//         uint256 lastStakedTime;
//         bool isStaked;
//         mapping(string => string) customAttributes;
//     }

//     struct ProjectBenefits {
//         uint256 projectId;
//         address projectOwner;
//         uint256 totalEarnings;
//         uint256 totalCollections;
//         uint256 totalNFTsSold;
//         uint256 averagePrice;
//         bool hasVerifiedBadge;
//         uint256 reputationScore;
//         string[] achievements;
//         mapping(CollectionType => uint256) collectionTypeCount;
//     }

//     struct UserProfile {
//         address user;
//         uint256 totalNFTsOwned;
//         uint256 totalCollectionsSupported;
//         uint256 totalSpent;
//         uint256 reputationScore;
//         bool isPremiumMember;
//         uint256 stakingRewards;
//         uint256 loyaltyPoints;
//         string[] achievements;
//         mapping(uint256 => bool) supportedProjects;
//         mapping(UtilityType => uint256) utilityTokensOwned;
//     }

//     struct MarketplaceStats {
//         uint256 totalVolume;
//         uint256 totalSales;
//         uint256 averagePrice;
//         uint256 topSalePrice;
//         uint256 uniqueHolders;
//         mapping(address => uint256) userVolume;
//     }

//     // ==================== MAPPINGS ====================
//     mapping(uint256 => Collection) public collections;
//     mapping(uint256 => NFTMetadata) public nftMetadata;
//     mapping(uint256 => ProjectBenefits) public projectBenefits;
//     mapping(address => UserProfile) public userProfiles;
//     mapping(uint256 => uint256[]) public projectCollections; // projectId => collectionIds
//     mapping(uint256 => uint256[]) public collectionTokens; // collectionId => tokenIds
//     mapping(address => uint256[]) public userCollections; // user => collectionIds created
//     mapping(address => uint256[]) public userTokens; // user => tokenIds owned
//     mapping(address => uint256) public creatorEarnings;
//     mapping(address => uint256) public platformFees;
//     mapping(uint256 => MarketplaceStats) public collectionStats;
    
//     // Staking system
//     mapping(uint256 => bool) public stakedTokens;
//     mapping(address => uint256[]) public userStakedTokens;
//     mapping(address => uint256) public stakingRewards;
    
//     // Whitelist and access control
//     mapping(uint256 => mapping(address => bool)) public collectionWhitelists;
//     mapping(address => bool) public verifiedCreators;
//     mapping(address => bool) public premiumMembers;
    
//     // Utility features
//     mapping(uint256 => mapping(string => bool)) public tokenUtilities;
//     mapping(address => mapping(string => uint256)) public userUtilityUsage;

//     // ==================== EVENTS ====================
//     event CollectionCreated(uint256 indexed collectionId, uint256 indexed projectId, address indexed creator, string name, uint256 maxSupply, uint256 mintPrice);
//     event CollectionUpdated(uint256 indexed collectionId, address indexed updatedBy);
//     event NFTMinted(uint256 indexed tokenId, uint256 indexed collectionId, address indexed recipient, uint256 price, string rarity);
//     event CollectionRevealed(uint256 indexed collectionId, string revealedBaseURI);
//     event WhitelistAdded(uint256 indexed collectionId, address[] users);
//     event PresaleStarted(uint256 indexed collectionId, uint256 presalePrice, uint256 startTime, uint256 endTime);
//     event PublicSaleStarted(uint256 indexed collectionId, uint256 price);
//     event TokenStaked(uint256 indexed tokenId, address indexed staker, uint256 stakingPower);
//     event TokenUnstaked(uint256 indexed tokenId, address indexed staker, uint256 rewards);
//     event StakingRewardsClaimed(address indexed user, uint256 amount);
//     event UtilityActivated(uint256 indexed tokenId, string utilityType, address indexed user);
//     event CreatorVerified(address indexed creator, uint256 indexed projectId);
//     event PremiumMembershipGranted(address indexed user);
//     event AchievementUnlocked(address indexed user, string achievement);
//     event RoyaltyPaid(uint256 indexed tokenId, address indexed creator, uint256 amount);
//     event VolumeUpdate(uint256 indexed collectionId, uint256 volume, uint256 sales);

//     // ==================== MODIFIERS ====================
//     modifier onlyProjectOwner(uint256 _projectId) {
//         try sovereignSeasContract.getProject(_projectId) returns (
//             uint256, address projectOwner, string memory, string memory, bool, bool active, uint256, uint256[] memory
//         ) {
//             require(projectOwner == msg.sender && active, "Not project owner or project inactive");
//         } catch {
//             revert("Invalid project");
//         }
//         _;
//     }

//     modifier onlyCollectionCreator(uint256 _collectionId) {
//         require(collections[_collectionId].creator == msg.sender, "Not collection creator");
//         _;
//     }

//     modifier onlyAuthorized(uint256 _projectId) {
//         require(
//             owner() == msg.sender || 
//             sovereignSeasContract.superAdmins(msg.sender) ||
//             _isProjectOwner(msg.sender, _projectId),
//             "Not authorized"
//         );
//         _;
//     }

//     modifier validCollection(uint256 _collectionId) {
//         require(_collectionId > 0 && _collectionId < _nextCollectionId, "Invalid collection");
//         require(collections[_collectionId].isActive, "Collection not active");
//         _;
//     }

//     modifier whenSaleActive(uint256 _collectionId) {
//         Collection storage collection = collections[_collectionId];
//         require(block.timestamp >= collection.startTime, "Sale not started");
//         require(block.timestamp <= collection.endTime || collection.endTime == 0, "Sale ended");
//         require(!collection.isPaused, "Sale is paused");
//         _;
//     }

//     // ==================== CONSTRUCTOR ====================
//     constructor(
//         address _sovereignSeasContract,
//         string memory _name,
//         string memory _symbol
//     ) ERC721(_name, _symbol) Ownable(msg.sender) {
//         require(_sovereignSeasContract != address(0), "Invalid SovereignSeas contract");
//         sovereignSeasContract = ISovereignSeasV4(_sovereignSeasContract);
//     }

//     // ==================== COLLECTION MANAGEMENT ====================
//     function createCollection(
//         uint256 _projectId,
//         string memory _name,
//         string memory _description,
//         string memory _baseURI,
//         CollectionType _collectionType,
//         AccessLevel _accessLevel,
//         UtilityType _utilityType,
//         uint256 _maxSupply,
//         uint256 _mintPrice,
//         uint256 _royaltyPercentage,
//         uint256 _startTime,
//         uint256 _endTime,
//         uint256 _maxPerWallet,
//         uint256 _maxPerTx
//     ) external onlyProjectOwner(_projectId) returns (uint256) {
//         require(bytes(_name).length > 0, "Name cannot be empty");
//         require(_maxSupply > 0, "Max supply must be greater than 0");
//         require(_mintPrice >= defaultMintPrice || msg.sender == owner(), "Price below minimum");
//         require(_royaltyPercentage <= 1000, "Royalty too high"); // Max 10%
//         require(_maxPerWallet > 0 && _maxPerTx > 0, "Invalid limits");
//         require(_maxPerTx <= _maxPerWallet, "Max per tx exceeds wallet limit");

//         uint256 collectionId = _nextCollectionId++;
        
//         Collection storage newCollection = collections[collectionId];
//         newCollection.id = collectionId;
//         newCollection.projectId = _projectId;
//         newCollection.creator = msg.sender;
//         newCollection.name = _name;
//         newCollection.description = _description;
//         newCollection.baseURI = _baseURI;
//         newCollection.collectionType = _collectionType;
//         newCollection.accessLevel = _accessLevel;
//         newCollection.utilityType = _utilityType;
//         newCollection.maxSupply = _maxSupply;
//         newCollection.mintPrice = _mintPrice;
//         newCollection.royaltyPercentage = _royaltyPercentage;
//         newCollection.startTime = _startTime;
//         newCollection.endTime = _endTime;
//         newCollection.maxPerWallet = _maxPerWallet;
//         newCollection.maxPerTx = _maxPerTx;
//         newCollection.isActive = true;
//         newCollection.createdAt = block.timestamp;

//         // Setup utility features based on type
//         if (_utilityType == UtilityType.STAKING) {
//             newCollection.stakingRewardRate = 100; // Default 1% daily
//         } else if (_utilityType == UtilityType.DISCOUNT) {
//             newCollection.discountPercentage = 1000; // Default 10% discount
//         }

//         projectCollections[_projectId].push(collectionId);
//         userCollections[msg.sender].push(collectionId);
        
//         // Update project benefits
//         projectBenefits[_projectId].totalCollections++;
//         projectBenefits[_projectId].collectionTypeCount[_collectionType]++;

//         emit CollectionCreated(collectionId, _projectId, msg.sender, _name, _maxSupply, _mintPrice);
//         return collectionId;
//     }

//     function updateCollectionPrice(uint256 _collectionId, uint256 _newPrice) external onlyCollectionCreator(_collectionId) {
//         require(_newPrice >= defaultMintPrice || msg.sender == owner(), "Price below minimum");
//         collections[_collectionId].mintPrice = _newPrice;
//         emit CollectionUpdated(_collectionId, msg.sender);
//     }

//     function pauseCollection(uint256 _collectionId) external onlyCollectionCreator(_collectionId) {
//         collections[_collectionId].isPaused = true;
//         emit CollectionUpdated(_collectionId, msg.sender);
//     }

//     function unpauseCollection(uint256 _collectionId) external onlyCollectionCreator(_collectionId) {
//         collections[_collectionId].isPaused = false;
//         emit CollectionUpdated(_collectionId, msg.sender);
//     }

//     function revealCollection(uint256 _collectionId, string memory _revealedBaseURI) external onlyCollectionCreator(_collectionId) {
//         collections[_collectionId].baseURI = _revealedBaseURI;
//         collections[_collectionId].isRevealed = true;
//         emit CollectionRevealed(_collectionId, _revealedBaseURI);
//     }

//     // ==================== WHITELIST MANAGEMENT ====================
//     function addToWhitelist(uint256 _collectionId, address[] memory _users) external onlyCollectionCreator(_collectionId) {
//         Collection storage collection = collections[_collectionId];
//         collection.hasWhitelist = true;
        
//         for (uint256 i = 0; i < _users.length; i++) {
//             collection.whitelist[_users[i]] = true;
//         }
        
//         emit WhitelistAdded(_collectionId, _users);
//     }

//     function removeFromWhitelist(uint256 _collectionId, address[] memory _users) external onlyCollectionCreator(_collectionId) {
//         for (uint256 i = 0; i < _users.length; i++) {
//             collections[_collectionId].whitelist[_users[i]] = false;
//         }
//     }

//     function isWhitelisted(uint256 _collectionId, address _user) external view returns (bool) {
//         return collections[_collectionId].whitelist[_user];
//     }

//     // ==================== PRESALE MANAGEMENT ====================
//     function setupPresale(
//         uint256 _collectionId,
//         uint256 _presalePrice,
//         uint256 _startTime,
//         uint256 _endTime
//     ) external onlyCollectionCreator(_collectionId) {
//         require(_presalePrice > 0, "Invalid presale price");
//         require(_startTime < _endTime, "Invalid time range");
//         require(_startTime > block.timestamp, "Start time must be in future");
        
//         Collection storage collection = collections[_collectionId];
//         collection.hasPresale = true;
//         collection.presalePrice = _presalePrice;
//         collection.presaleStartTime = _startTime;
//         collection.presaleEndTime = _endTime;
        
//         emit PresaleStarted(_collectionId, _presalePrice, _startTime, _endTime);
//     }

//     // ==================== MINTING FUNCTIONS ====================
//     function mintNFT(uint256 _collectionId, uint256 _quantity, string memory _rarity) 
//         external 
//         payable 
//         nonReentrant 
//         whenNotPaused 
//         validCollection(_collectionId) 
//         whenSaleActive(_collectionId) 
//     {
//         Collection storage collection = collections[_collectionId];
//         require(_quantity > 0 && _quantity <= collection.maxPerTx, "Invalid quantity");
//         require(collection.currentSupply + _quantity <= collection.maxSupply, "Exceeds max supply");
//         require(collection.mintedCount[msg.sender] + _quantity <= collection.maxPerWallet, "Exceeds wallet limit");

//         uint256 currentPrice = _getCurrentPrice(_collectionId);
//         uint256 totalCost = currentPrice * _quantity;
//         require(msg.value >= totalCost, "Insufficient payment");

//         // Access control checks
//         if (collection.accessLevel == AccessLevel.WHITELIST) {
//             require(collection.whitelist[msg.sender], "Not whitelisted");
//         } else if (collection.accessLevel == AccessLevel.HOLDER_ONLY) {
//             require(_hasRequiredTokens(msg.sender, collection.projectId), "Must own project NFTs");
//         } else if (collection.accessLevel == AccessLevel.PREMIUM) {
//             require(premiumMembers[msg.sender], "Premium membership required");
//         }

//         // Mint NFTs
//         for (uint256 i = 0; i < _quantity; i++) {
//             uint256 tokenId = _nextTokenId++;
//             _safeMint(msg.sender, tokenId);
            
//             string memory tokenURI = _generateTokenURI(_collectionId, tokenId);
//             _setTokenURI(tokenId, tokenURI);
            
//             // Setup NFT metadata
//             NFTMetadata storage metadata = nftMetadata[tokenId];
//             metadata.tokenId = tokenId;
//             metadata.collectionId = _collectionId;
//             metadata.projectId = collection.projectId;
//             metadata.nftType = NFTType.COLLECTION;
//             metadata.creator = collection.creator;
//             metadata.currentOwner = msg.sender;
//             metadata.mintedAt = block.timestamp;
//             metadata.mintPrice = currentPrice;
//             metadata.rarity = _rarity;
//             metadata.hasUtility = collection.utilityType != UtilityType.NONE;
//             metadata.utilityType = collection.utilityType;
            
//             if (collection.utilityType == UtilityType.STAKING) {
//                 metadata.stakingPower = _calculateStakingPower(_rarity);
//             }
            
//             collectionTokens[_collectionId].push(tokenId);
//             userTokens[msg.sender].push(tokenId);
            
//             emit NFTMinted(tokenId, _collectionId, msg.sender, currentPrice, _rarity);
//         }

//         // Update counts and stats
//         collection.currentSupply += _quantity;
//         collection.mintedCount[msg.sender] += _quantity;
        
//         // Update user profile
//         userProfiles[msg.sender].totalNFTsOwned += _quantity;
//         userProfiles[msg.sender].totalSpent += totalCost;
//         userProfiles[msg.sender].supportedProjects[collection.projectId] = true;
//         userProfiles[msg.sender].utilityTokensOwned[collection.utilityType] += _quantity;

//         // Distribute payments
//         _distributePayments(_collectionId, totalCost);
        
//         // Update collection stats
//         collectionStats[_collectionId].totalVolume += totalCost;
//         collectionStats[_collectionId].totalSales += _quantity;
        
//         // Refund excess payment
//         if (msg.value > totalCost) {
//             payable(msg.sender).transfer(msg.value - totalCost);
//         }

//         // Check for achievements
//         _checkAchievements(msg.sender, collection.projectId);
//     }

//     function adminMintNFT(
//         uint256 _collectionId,
//         address _recipient,
//         string memory _rarity
//     ) external onlyAuthorized(collections[_collectionId].projectId) {
//         Collection storage collection = collections[_collectionId];
//         require(collection.currentSupply < collection.maxSupply, "Collection sold out");

//         uint256 tokenId = _nextTokenId++;
//         _safeMint(_recipient, tokenId);
        
//         string memory tokenURI = _generateTokenURI(_collectionId, tokenId);
//         _setTokenURI(tokenId, tokenURI);
        
//         // Setup metadata for admin mint
//         NFTMetadata storage metadata = nftMetadata[tokenId];
//         metadata.tokenId = tokenId;
//         metadata.collectionId = _collectionId;
//         metadata.projectId = collection.projectId;
//         metadata.nftType = NFTType.COLLECTION;
//         metadata.creator = collection.creator;
//         metadata.currentOwner = _recipient;
//         metadata.mintedAt = block.timestamp;
//         metadata.mintPrice = 0; // Free mint
//         metadata.rarity = _rarity;
//         metadata.hasUtility = collection.utilityType != UtilityType.NONE;
//         metadata.utilityType = collection.utilityType;

//         collection.currentSupply++;
//         collectionTokens[_collectionId].push(tokenId);
//         userTokens[_recipient].push(tokenId);

//         emit NFTMinted(tokenId, _collectionId, _recipient, 0, _rarity);
//     }

//     // ==================== STAKING SYSTEM ====================
//     function stakeToken(uint256 _tokenId) external {
//         require(ownerOf(_tokenId) == msg.sender, "Not token owner");
//         require(!stakedTokens[_tokenId], "Already staked");
//         require(nftMetadata[_tokenId].utilityType == UtilityType.STAKING, "Token not stakeable");

//         stakedTokens[_tokenId] = true;
//         nftMetadata[_tokenId].isStaked = true;
//         nftMetadata[_tokenId].lastStakedTime = block.timestamp;
//         userStakedTokens[msg.sender].push(_tokenId);

//         emit TokenStaked(_tokenId, msg.sender, nftMetadata[_tokenId].stakingPower);
//     }

//     function unstakeToken(uint256 _tokenId) external {
//         require(ownerOf(_tokenId) == msg.sender, "Not token owner");
//         require(stakedTokens[_tokenId], "Not staked");

//         uint256 rewards = calculateStakingRewards(_tokenId);
        
//         stakedTokens[_tokenId] = false;
//         nftMetadata[_tokenId].isStaked = false;
//         stakingRewards[msg.sender] += rewards;

//         // Remove from staked tokens array
//         _removeFromStakedArray(msg.sender, _tokenId);

//         emit TokenUnstaked(_tokenId, msg.sender, rewards);
//     }

//     function claimStakingRewards() external {
//         uint256 rewards = stakingRewards[msg.sender];
//         require(rewards > 0, "No rewards to claim");
        
//         stakingRewards[msg.sender] = 0;
//         payable(msg.sender).transfer(rewards);
        
//         emit StakingRewardsClaimed(msg.sender, rewards);
//     }

//     function calculateStakingRewards(uint256 _tokenId) public view returns (uint256) {
//         if (!stakedTokens[_tokenId]) return 0;
        
//         NFTMetadata storage metadata = nftMetadata[_tokenId];
//         uint256 timeStaked = block.timestamp - metadata.lastStakedTime;
//         uint256 dailyReward = (metadata.stakingPower * collections[metadata.collectionId].stakingRewardRate) / 10000;
        
//         return (dailyReward * timeStaked) / 1 days;
//     }

//     // ==================== UTILITY FUNCTIONS ====================
//     function activateUtility(uint256 _tokenId, string memory _utilityName) external {
//         require(ownerOf(_tokenId) == msg.sender, "Not token owner");
//         require(nftMetadata[_tokenId].hasUtility, "Token has no utility");
        
//         tokenUtilities[_tokenId][_utilityName] = true;
//         userUtilityUsage[msg.sender][_utilityName]++;
        
//         emit UtilityActivated(_tokenId, _utilityName, msg.sender);
//     }

//     function getDiscountPercentage(address _user, uint256 _collectionId) external view returns (uint256) {
//         if (!_hasUtilityTokens(_user, _collectionId, UtilityType.DISCOUNT)) return 0;
//         return collections[_collectionId].discountPercentage;
//     }

//     function hasGovernanceRights(address _user, uint256 _projectId) external view returns (bool) {
//         return _hasUtilityTokensForProject(_user, _projectId, UtilityType.GOVERNANCE);
//     }

//     // ==================== PREMIUM FEATURES ====================
//     function grantPremiumMembership(address _user) external onlyOwner {
//         premiumMembers[_user] = true;
//         userProfiles[_user].isPremiumMember = true;
//         emit PremiumMembershipGranted(_user);
//     }

//     function verifyCreator(address _creator, uint256 _projectId) external onlyOwner {
//         verifiedCreators[_creator] = true;
//         projectBenefits[_projectId].hasVerifiedBadge = true;
//         emit CreatorVerified(_creator, _projectId);
//     }

//     // ==================== INTERNAL FUNCTIONS ====================
//     function _getCurrentPrice(uint256 _collectionId) internal view returns (uint256) {
//         Collection storage collection = collections[_collectionId];
        
//         // Check if in presale period
//         if (collection.hasPresale && 
//             block.timestamp >= collection.presaleStartTime && 
//             block.timestamp <= collection.presaleEndTime) {
//             return collection.presalePrice;
//         }
        
//         return collection.mintPrice;
//     }

//     function _hasRequiredTokens(address _user, uint256 _projectId) internal view returns (bool) {
//         uint256[] memory userTokenIds = userTokens[_user];
//         for (uint256 i = 0; i < userTokenIds.length; i++) {
//             if (nftMetadata[userTokenIds[i]].projectId == _projectId) {
//                 return true;
//             }
//         }
//         return false;
//     }

//     function _hasUtilityTokens(address _user, uint256 _collectionId, UtilityType _utilityType) internal view returns (bool) {
//         uint256[] memory userTokenIds = userTokens[_user];
//         for (uint256 i = 0; i < userTokenIds.length; i++) {
//             NFTMetadata storage metadata = nftMetadata[userTokenIds[i]];
//             if (metadata.collectionId == _collectionId && metadata.utilityType == _utilityType) {
//                 return true;
//             }
//         }
//         return false;
//     }

//     function _hasUtilityTokensForProject(address _user, uint256 _projectId, UtilityType _utilityType) internal view returns (bool) {
//         uint256[] memory userTokenIds = userTokens[_user];
//         for (uint256 i = 0; i < userTokenIds.length; i++) {
//             NFTMetadata storage metadata = nftMetadata[userTokenIds[i]];
//             if (metadata.projectId == _projectId && metadata.utilityType == _utilityType) {
//                 return true;
//             }
//         }
//         return false;
//     }

//     function _isProjectOwner(address _user, uint256 _projectId) internal view returns (bool) {
//         try sovereignSeasContract.getProject(_projectId) returns (
//             uint256, address projectOwner, string memory, string memory, bool, bool active, uint256, uint256[] memory
//         ) {
//             return projectOwner == _user && active;
//         } catch {
//             return false;
//         }
//     }

//     function _generateTokenURI(uint256 _collectionId, uint256 _tokenId) internal view returns (string memory) {
//         Collection storage collection = collections[_collectionId];
//         if (!collection.isRevealed) {
//             return collection.unrevealedURI;
//         }
//         return string(abi.encodePacked(collection.baseURI, "/", _toString(_tokenId), ".json"));
//     }

//     function _calculateStakingPower(string memory _rarity) internal pure returns (uint256) {
//         bytes32 rarityHash = keccak256(bytes(_rarity));
//         if (rarityHash == keccak256(bytes("legendary"))) return 1000;
//         if (rarityHash == keccak256(bytes("epic"))) return 500;
//         if (rarityHash == keccak256(bytes("rare"))) return 250;
//         if (rarityHash == keccak256(bytes("uncommon"))) return 125;
//         return 100; // common
//     }

//     function _distributePayments(uint256 _collectionId, uint256 _totalAmount) internal {
//         Collection storage collection = collections[_collectionId];
        
//         // Platform fee
//         uint256 platformFee = (_totalAmount * platformFeePercentage) / 10000;
//         platformFees[owner()] += platformFee;
        
//         // Creator earnings
//         uint256 creatorAmount = _totalAmount - platformFee;
//         creatorEarnings[collection.creator] += creatorAmount;
        
//         // Update project benefits
//         projectBenefits[collection.projectId].totalEarnings += creatorAmount;
//         projectBenefits[collection.projectId].totalNFTsSold++;
//     }

//     function _checkAchievements(address _user, uint256 _projectId) internal {
//         UserProfile storage profile = userProfiles[_user];
        
//         // First NFT achievement
//         if (profile.totalNFTsOwned == 1) {
//             profile.achievements.push("First NFT Collector");
//             emit AchievementUnlocked(_user, "First NFT Collector");
//         }
        
//         // Collector achievements
//        // Collector achievements
//         if (profile.totalNFTsOwned == 10) {
//             profile.achievements.push("NFT Enthusiast");
//             emit AchievementUnlocked(_user, "NFT Enthusiast");
//         }
        
//         if (profile.totalNFTsOwned == 50) {
//             profile.achievements.push("Serious Collector");
//             emit AchievementUnlocked(_user, "Serious Collector");
//         }
        
//         if (profile.totalNFTsOwned == 100) {
//             profile.achievements.push("NFT Whale");
//             emit AchievementUnlocked(_user, "NFT Whale");
//         }
        
//         // Spending achievements
//         if (profile.totalSpent >= 100 ether) {
//             profile.achievements.push("Big Spender");
//             emit AchievementUnlocked(_user, "Big Spender");
//         }
        
//         // Project supporter achievement
//         if (profile.totalCollectionsSupported >= 5) {
//             profile.achievements.push("Project Supporter");
//             emit AchievementUnlocked(_user, "Project Supporter");
//         }
//     }

//     function _removeFromStakedArray(address _user, uint256 _tokenId) internal {
//         uint256[] storage stakedArray = userStakedTokens[_user];
//         for (uint256 i = 0; i < stakedArray.length; i++) {
//             if (stakedArray[i] == _tokenId) {
//                 stakedArray[i] = stakedArray[stakedArray.length - 1];
//                 stakedArray.pop();
//                 break;
//             }
//         }
//     }

//     function _toString(uint256 value) internal pure returns (string memory) {
//         if (value == 0) {
//             return "0";
//         }
//         uint256 temp = value;
//         uint256 digits;
//         while (temp != 0) {
//             digits++;
//             temp /= 10;
//         }
//         bytes memory buffer = new bytes(digits);
//         while (value != 0) {
//             digits -= 1;
//             buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
//             value /= 10;
//         }
//         return string(buffer);
//     }

//     // ==================== WITHDRAWAL FUNCTIONS ====================
//     function withdrawCreatorEarnings(address payable _recipient, uint256 _amount) external {
//         require(_recipient != address(0), "Invalid recipient");
//         uint256 earnings = creatorEarnings[msg.sender];
//         require(earnings > 0, "No earnings to withdraw");
        
//         uint256 amountToWithdraw = _amount == 0 ? earnings : _amount;
//         require(amountToWithdraw <= earnings, "Insufficient earnings");
        
//         creatorEarnings[msg.sender] -= amountToWithdraw;
//         _recipient.transfer(amountToWithdraw);
//     }

//     function withdrawPlatformFees(address payable _recipient, uint256 _amount) external onlyOwner {
//         require(_recipient != address(0), "Invalid recipient");
//         uint256 fees = platformFees[owner()];
//         require(fees > 0, "No fees to withdraw");
        
//         uint256 amountToWithdraw = _amount == 0 ? fees : _amount;
//         require(amountToWithdraw <= fees, "Insufficient fees");
        
//         platformFees[owner()] -= amountToWithdraw;
//         _recipient.transfer(amountToWithdraw);
//     }

//     // ==================== VIEW FUNCTIONS ====================
//     function getCollection(uint256 _collectionId) external view returns (
//         uint256 id, uint256 projectId, address creator, string memory name, string memory description,
//         CollectionType collectionType, AccessLevel accessLevel, UtilityType utilityType,
//         uint256 maxSupply, uint256 currentSupply, uint256 mintPrice, uint256 royaltyPercentage,
//         uint256 startTime, uint256 endTime, bool isActive, bool isPaused, bool isRevealed
//     ) {
//         Collection storage collection = collections[_collectionId];
//         return (
//             collection.id, collection.projectId, collection.creator, collection.name, collection.description,
//             collection.collectionType, collection.accessLevel, collection.utilityType,
//             collection.maxSupply, collection.currentSupply, collection.mintPrice, collection.royaltyPercentage,
//             collection.startTime, collection.endTime, collection.isActive, collection.isPaused, collection.isRevealed
//         );
//     }

//     function getCollectionDetails(uint256 _collectionId) external view returns (
//         uint256 maxPerWallet, uint256 maxPerTx, bool hasWhitelist, bool hasPresale,
//         uint256 presalePrice, uint256 presaleStartTime, uint256 presaleEndTime,
//         uint256 stakingRewardRate, uint256 discountPercentage
//     ) {
//         Collection storage collection = collections[_collectionId];
//         return (
//             collection.maxPerWallet, collection.maxPerTx, collection.hasWhitelist, collection.hasPresale,
//             collection.presalePrice, collection.presaleStartTime, collection.presaleEndTime,
//             collection.stakingRewardRate, collection.discountPercentage
//         );
//     }

//     function getTokenMetadata(uint256 _tokenId) external view returns (
//         uint256 collectionId, uint256 projectId, NFTType nftType, address creator, address currentOwner,
//         uint256 mintedAt, uint256 mintPrice, string memory rarity, bool hasUtility, UtilityType utilityType,
//         uint256 stakingPower, bool isStaked
//     ) {
//         NFTMetadata storage metadata = nftMetadata[_tokenId];
//         return (
//             metadata.collectionId, metadata.projectId, metadata.nftType, metadata.creator, metadata.currentOwner,
//             metadata.mintedAt, metadata.mintPrice, metadata.rarity, metadata.hasUtility, metadata.utilityType,
//             metadata.stakingPower, metadata.isStaked
//         );
//     }

//     function getUserProfile(address _user) external view returns (
//         uint256 totalNFTsOwned, uint256 totalCollectionsSupported, uint256 totalSpent,
//         uint256 reputationScore, bool isPremiumMember, uint256 stakingRewards, uint256 loyaltyPoints
//     ) {
//         UserProfile storage profile = userProfiles[_user];
//         return (
//             profile.totalNFTsOwned, profile.totalCollectionsSupported, profile.totalSpent,
//             profile.reputationScore, profile.isPremiumMember, profile.stakingRewards, profile.loyaltyPoints
//         );
//     }

//     function getProjectBenefits(uint256 _projectId) external view returns (
//         address projectOwner, uint256 totalEarnings, uint256 totalCollections, uint256 totalNFTsSold,
//         uint256 averagePrice, bool hasVerifiedBadge, uint256 reputationScore
//     ) {
//         ProjectBenefits storage benefits = projectBenefits[_projectId];
//         return (
//             benefits.projectOwner, benefits.totalEarnings, benefits.totalCollections, benefits.totalNFTsSold,
//             benefits.averagePrice, benefits.hasVerifiedBadge, benefits.reputationScore
//         );
//     }

//     function getCollectionStats(uint256 _collectionId) external view returns (
//         uint256 totalVolume, uint256 totalSales, uint256 averagePrice, uint256 topSalePrice, uint256 uniqueHolders
//     ) {
//         MarketplaceStats storage stats = collectionStats[_collectionId];
//         return (
//             stats.totalVolume, stats.totalSales, stats.averagePrice, stats.topSalePrice, stats.uniqueHolders
//         );
//     }

//     function getProjectCollections(uint256 _projectId) external view returns (uint256[] memory) {
//         return projectCollections[_projectId];
//     }

//     function getCollectionTokens(uint256 _collectionId) external view returns (uint256[] memory) {
//         return collectionTokens[_collectionId];
//     }

//     function getUserTokens(address _user) external view returns (uint256[] memory) {
//         return userTokens[_user];
//     }

//     function getUserStakedTokens(address _user) external view returns (uint256[] memory) {
//         return userStakedTokens[_user];
//     }

//     function getUserCollections(address _user) external view returns (uint256[] memory) {
//         return userCollections[_user];
//     }

//     function getCreatorEarnings(address _creator) external view returns (uint256) {
//         return creatorEarnings[_creator];
//     }

//     function getMintedCount(uint256 _collectionId, address _user) external view returns (uint256) {
//         return collections[_collectionId].mintedCount[_user];
//     }

//     function getCurrentPrice(uint256 _collectionId) external view returns (uint256) {
//         return _getCurrentPrice(_collectionId);
//     }

//     function isCollectionActive(uint256 _collectionId) external view returns (bool) {
//         Collection storage collection = collections[_collectionId];
//         return collection.isActive && !collection.isPaused &&
//                (block.timestamp >= collection.startTime) &&
//                (collection.endTime == 0 || block.timestamp <= collection.endTime);
//     }

//     function canMint(uint256 _collectionId, address _user, uint256 _quantity) external view returns (bool, string memory) {
//         Collection storage collection = collections[_collectionId];
        
//         if (!collection.isActive) return (false, "Collection not active");
//         if (collection.isPaused) return (false, "Collection paused");
//         if (block.timestamp < collection.startTime) return (false, "Sale not started");
//         if (collection.endTime > 0 && block.timestamp > collection.endTime) return (false, "Sale ended");
//         if (collection.currentSupply + _quantity > collection.maxSupply) return (false, "Exceeds max supply");
//         if (collection.mintedCount[_user] + _quantity > collection.maxPerWallet) return (false, "Exceeds wallet limit");
//         if (_quantity > collection.maxPerTx) return (false, "Exceeds per transaction limit");
        
//         if (collection.accessLevel == AccessLevel.WHITELIST && !collection.whitelist[_user]) {
//             return (false, "Not whitelisted");
//         }
//         if (collection.accessLevel == AccessLevel.HOLDER_ONLY && !_hasRequiredTokens(_user, collection.projectId)) {
//             return (false, "Must own project NFTs");
//         }
//         if (collection.accessLevel == AccessLevel.PREMIUM && !premiumMembers[_user]) {
//             return (false, "Premium membership required");
//         }
        
//         return (true, "Can mint");
//     }

//     // ==================== ADMIN FUNCTIONS ====================
//     function updateDefaultMintPrice(uint256 _newPrice) external onlyOwner {
//         defaultMintPrice = _newPrice;
//     }

//     function updatePlatformFeePercentage(uint256 _newPercentage) external onlyOwner {
//         require(_newPercentage <= 1000, "Fee too high"); // Max 10%
//         platformFeePercentage = _newPercentage;
//     }

//     function updateSovereignSeasContract(address _newContract) external onlyOwner {
//         require(_newContract != address(0), "Invalid address");
//         sovereignSeasContract = ISovereignSeasV4(_newContract);
//     }

//     function pauseContract() external onlyOwner {
//         _pause();
//     }

//     function unpauseContract() external onlyOwner {
//         _unpause();
//     }

//     function emergencyWithdraw() external onlyOwner {
//         uint256 balance = address(this).balance;
//         require(balance > 0, "No balance to withdraw");
//         payable(owner()).transfer(balance);
//     }

//     // ==================== REQUIRED OVERRIDES ====================
//     function _update(address to, uint256 tokenId, address auth)
//         internal
//         override(ERC721, ERC721Enumerable)
//         returns (address)
//     {
//         address previousOwner = super._update(to, tokenId, auth);
        
//         // Update metadata
//         if (to != address(0)) {
//             nftMetadata[tokenId].currentOwner = to;
            
//             // Update user arrays
//             if (previousOwner != address(0)) {
//                 _removeFromUserTokens(previousOwner, tokenId);
//             }
//             userTokens[to].push(tokenId);
//         }
        
//         return previousOwner;
//     }

//     function _removeFromUserTokens(address _user, uint256 _tokenId) internal {
//         uint256[] storage tokens = userTokens[_user];
//         for (uint256 i = 0; i < tokens.length; i++) {
//             if (tokens[i] == _tokenId) {
//                 tokens[i] = tokens[tokens.length - 1];
//                 tokens.pop();
//                 break;
//             }
//         }
//     }

//     function _increaseBalance(address account, uint128 value)
//         internal
//         override(ERC721, ERC721Enumerable)
//     {
//         super._increaseBalance(account, value);
//     }

//     function tokenURI(uint256 tokenId)
//         public
//         view
//         override(ERC721, ERC721URIStorage)
//         returns (string memory)
//     {
//         return super.tokenURI(tokenId);
//     }

//     function supportsInterface(bytes4 interfaceId)
//         public
//         view
//         override(ERC721, ERC721Enumerable, ERC721URIStorage)
//         returns (bool)
//     {
//         return super.supportsInterface(interfaceId);
//     }

//     // Accept CELO payments
//     receive() external payable {}
// }