// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

interface ISovereignSeasProjects {
    function getProject(uint256 _projectId)
        external
        view
        returns (
            uint256 id,
            address owner,
            string memory name,
            string memory description,
            bool transferrable,
            bool active,
            uint256 createdAt,
            uint256[] memory campaignIds
        );
}

/**
 * @title BuilderRewardsNFT
 * @notice ERC1155 fragments that represent co-owned Builder credentials.
 *         Each builder can register a slot gated by Sovereign Seas projects,
 *         mint up to 27 fragments priced at >= 2 CELO, and continue to earn
 *         a 0.5% fee on every sale while protocol + air pools earn 0.3%/0.2%.
 */
contract BuilderRewardsNFT is ERC1155, AccessControl, ReentrancyGuard, Pausable {
    using SafeCast for uint256;

    bytes32 public constant METADATA_ROLE = keccak256("METADATA_ROLE");

    uint256 public constant FRAGMENTS_PER_SLOT = 27;
    uint256 public constant MIN_FRAGMENT_PRICE = 2 ether; // 2 CELO minimum

    uint256 private constant FEE_DENOMINATOR = 10_000; // basis points
    uint256 private constant BUILDER_FEE_BP = 50; // 0.5%
    uint256 private constant PROTOCOL_FEE_BP = 30; // 0.3%
    uint256 private constant AIR_FEE_BP = 20; // 0.2%

    ISovereignSeasProjects public immutable seasContract;

    address public protocolTreasury;
    address public airTreasury;

    uint256 private _nextBuilderId;

    struct BuilderSlot {
        address builder;
        uint64 projectCount;
        uint64 tier;
        uint64 fragmentsSold;
        uint128 fragmentPrice;
        uint128 flowPrice;
        bytes metadata; // encrypted base64 blob stored on-chain
        bool active;
    }

    uint256 private constant MIN_BID_DURATION = 1 hours;
    uint256 private constant MAX_BID_DURATION = 30 days;

    struct Bid {
        address bidder;
        uint96 amount; // fragments requested
        uint128 pricePerFragment;
        uint64 expiry;
        bool active;
    }

    mapping(uint256 => BuilderSlot) public builderSlots;
    mapping(address => uint256) public builderIds;
    mapping(uint256 => uint256) public nextBidId;
    mapping(uint256 => mapping(uint256 => Bid)) public bids;
    uint256 public totalBidEscrow;

    event BuilderSlotCreated(
        uint256 indexed builderId,
        address indexed builder,
        uint128 fragmentPrice,
        bytes metadata
    );
    event BuilderSlotUpdated(uint256 indexed builderId, uint128 fragmentPrice, uint128 flowPrice);
    event MetadataUpdated(uint256 indexed builderId, bytes metadata);
    event FragmentsPurchased(
        uint256 indexed builderId,
        address indexed buyer,
        uint256 amount,
        uint128 pricePerFragment
    );
    event BidPlaced(
        uint256 indexed builderId,
        uint256 indexed bidId,
        address indexed bidder,
        uint96 amount,
        uint128 pricePerFragment,
        uint64 expiry
    );
    event BidCanceled(uint256 indexed builderId, uint256 indexed bidId);
    event BidAccepted(
        uint256 indexed builderId,
        uint256 indexed bidId,
        address indexed seller,
        uint96 amount,
        uint128 pricePerFragment
    );
    event FeeRecipientsUpdated(address protocolTreasury, address airTreasury);
    event BuilderSlotStatusUpdated(uint256 indexed builderId, bool active);
    event BuilderSlotReassigned(
        uint256 indexed builderId,
        address indexed previousBuilder,
        address indexed newBuilder
    );
    event EmergencyWithdrawal(address indexed to, uint256 amount);

    constructor(
        address _seasContract,
        address _protocolTreasury,
        address _airTreasury,
        string memory baseUri
    ) ERC1155(baseUri) {
        require(_seasContract != address(0), "BuilderRewardsNFT: invalid seas");
        require(_protocolTreasury != address(0), "BuilderRewardsNFT: invalid protocol");
        require(_airTreasury != address(0), "BuilderRewardsNFT: invalid air");

        seasContract = ISovereignSeasProjects(_seasContract);
        protocolTreasury = _protocolTreasury;
        airTreasury = _airTreasury;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(METADATA_ROLE, msg.sender);

        _nextBuilderId = 1; // start IDs at 1
    }

    /* -------------------------------------------------------------------------- */
    /*                              Builder Management                             */
    /* -------------------------------------------------------------------------- */

    function registerBuilderSlot(
        uint256[] calldata projectIds,
        uint128 fragmentPrice,
        uint128 flowPrice,
        bytes calldata metadata
    ) external whenNotPaused returns (uint256 builderId) {
        require(projectIds.length > 0, "BuilderRewardsNFT: project list empty");
        require(metadata.length > 0, "BuilderRewardsNFT: metadata required");
        require(fragmentPrice >= MIN_FRAGMENT_PRICE, "BuilderRewardsNFT: price below minimum");
        require(flowPrice >= MIN_FRAGMENT_PRICE, "BuilderRewardsNFT: flow price below minimum");
        require(builderIds[msg.sender] == 0, "BuilderRewardsNFT: slot exists");

        uint64 projectCount = _validateAndCountProjects(msg.sender, projectIds);
        uint64 tier = _tierForProjectCount(projectCount);

        builderId = _nextBuilderId;
        _nextBuilderId++;

        builderIds[msg.sender] = builderId;
        builderSlots[builderId] = BuilderSlot({
            builder: msg.sender,
            projectCount: projectCount,
            tier: tier,
            fragmentsSold: 0,
            fragmentPrice: fragmentPrice,
            flowPrice: flowPrice,
            metadata: metadata,
            active: true
        });

        emit BuilderSlotCreated(builderId, msg.sender, fragmentPrice, metadata);
    }

    function updateFragmentPrice(uint256 builderId, uint128 newPrice) external whenNotPaused {
        BuilderSlot storage slot = _requireSlotOwner(builderId);
        require(slot.fragmentsSold < FRAGMENTS_PER_SLOT, "BuilderRewardsNFT: sold out");
        require(newPrice >= MIN_FRAGMENT_PRICE, "BuilderRewardsNFT: price below minimum");
        slot.fragmentPrice = newPrice;
        emit BuilderSlotUpdated(builderId, newPrice, slot.flowPrice);
    }

    function updateFlowPrice(uint256 builderId, uint128 newFlowPrice) external whenNotPaused {
        BuilderSlot storage slot = _requireSlotOwner(builderId);
        require(newFlowPrice >= MIN_FRAGMENT_PRICE, "BuilderRewardsNFT: flow price below minimum");
        slot.flowPrice = newFlowPrice;
        emit BuilderSlotUpdated(builderId, slot.fragmentPrice, newFlowPrice);
    }

    function deactivateBuilderSlot(uint256 builderId) external whenNotPaused {
        BuilderSlot storage slot = _requireSlotOwner(builderId);
        require(slot.active, "BuilderRewardsNFT: already inactive");
        slot.active = false;
        emit BuilderSlotStatusUpdated(builderId, false);
    }

    function activateBuilderSlot(uint256 builderId) external whenNotPaused {
        BuilderSlot storage slot = _requireSlotOwner(builderId);
        require(!slot.active, "BuilderRewardsNFT: already active");
        slot.active = true;
        emit BuilderSlotStatusUpdated(builderId, true);
    }

    function updateMetadataForSlot(
        uint256 builderId,
        bytes calldata newMetadata
    ) external {
        BuilderSlot storage slot = builderSlots[builderId];
        require(slot.builder != address(0), "BuilderRewardsNFT: slot missing");
        require(
            msg.sender == slot.builder || hasRole(METADATA_ROLE, msg.sender),
            "BuilderRewardsNFT: not authorized"
        );
        require(newMetadata.length > 0, "BuilderRewardsNFT: metadata required");
        slot.metadata = newMetadata;
        emit MetadataUpdated(builderId, newMetadata);
    }

    /* -------------------------------------------------------------------------- */
    /*                               Primary Market                               */
    /* -------------------------------------------------------------------------- */

    function buyFragments(uint256 builderId, uint96 amount) external payable nonReentrant whenNotPaused {
        require(amount > 0, "BuilderRewardsNFT: amount zero");
        BuilderSlot storage slot = builderSlots[builderId];
        require(slot.builder != address(0) && slot.active, "BuilderRewardsNFT: slot inactive");
        require(slot.fragmentsSold + amount <= FRAGMENTS_PER_SLOT, "BuilderRewardsNFT: exceeds supply");

        uint256 totalCost = uint256(slot.fragmentPrice) * amount;
        require(msg.value == totalCost, "BuilderRewardsNFT: incorrect payment");

        slot.fragmentsSold += uint64(amount);
        _mint(msg.sender, builderId, amount, "");

        emit FragmentsPurchased(builderId, msg.sender, amount, slot.fragmentPrice);

        _settlePrimarySale(totalCost, slot.builder);
    }

    /* -------------------------------------------------------------------------- */
    /*                               Secondary Market                             */
    /* -------------------------------------------------------------------------- */

    function placeBid(
        uint256 builderId,
        uint96 amount,
        uint128 pricePerFragment,
        uint64 expiry
    ) external payable nonReentrant whenNotPaused returns (uint256 bidId) {
        require(amount > 0, "BuilderRewardsNFT: amount zero");
        BuilderSlot storage slot = builderSlots[builderId];
        require(slot.builder != address(0), "BuilderRewardsNFT: slot missing");
        require(slot.fragmentsSold == FRAGMENTS_PER_SLOT, "BuilderRewardsNFT: not sold out");
        require(pricePerFragment >= slot.flowPrice, "BuilderRewardsNFT: below flow price");
        require(expiry > block.timestamp, "BuilderRewardsNFT: invalid expiry");
        uint256 duration = uint256(expiry) - block.timestamp;
        require(duration >= MIN_BID_DURATION && duration <= MAX_BID_DURATION, "BuilderRewardsNFT: expiry out of bounds");

        uint256 total = uint256(pricePerFragment) * amount;
        require(msg.value == total, "BuilderRewardsNFT: incorrect escrow");
        totalBidEscrow += total;

        bidId = nextBidId[builderId];
        nextBidId[builderId] = bidId + 1;

        bids[builderId][bidId] = Bid({
            bidder: msg.sender,
            amount: amount,
            pricePerFragment: pricePerFragment,
            expiry: expiry,
            active: true
        });

        emit BidPlaced(builderId, bidId, msg.sender, amount, pricePerFragment, expiry);
    }

    function cancelBid(uint256 builderId, uint256 bidId) external nonReentrant {
        Bid storage bid = bids[builderId][bidId];
        require(bid.active, "BuilderRewardsNFT: bid inactive");
        require(bid.bidder == msg.sender, "BuilderRewardsNFT: not bidder");

        uint256 refund = uint256(bid.pricePerFragment) * bid.amount;
        totalBidEscrow -= refund;
        bid.amount = 0;
        bid.active = false;

        (bool sent, ) = msg.sender.call{value: refund}("");
        require(sent, "BuilderRewardsNFT: refund failed");

        emit BidCanceled(builderId, bidId);
    }

    function cancelExpiredBid(uint256 builderId, uint256 bidId) external nonReentrant {
        Bid storage bid = bids[builderId][bidId];
        require(bid.active, "BuilderRewardsNFT: bid inactive");
        require(block.timestamp > bid.expiry, "BuilderRewardsNFT: bid active");

        uint256 refund = uint256(bid.pricePerFragment) * bid.amount;
        totalBidEscrow -= refund;
        bid.amount = 0;
        bid.active = false;

        (bool sent, ) = bid.bidder.call{value: refund}("");
        require(sent, "BuilderRewardsNFT: refund failed");

        emit BidCanceled(builderId, bidId);
    }

    function acceptBid(
        uint256 builderId,
        uint256 bidId,
        uint96 amount
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "BuilderRewardsNFT: amount zero");
        Bid storage bid = bids[builderId][bidId];
        require(bid.active, "BuilderRewardsNFT: bid inactive");
        require(bid.amount >= amount, "BuilderRewardsNFT: insufficient bid size");
        require(block.timestamp <= bid.expiry, "BuilderRewardsNFT: bid expired");
        require(balanceOf(msg.sender, builderId) >= amount, "BuilderRewardsNFT: insufficient balance");

        BuilderSlot storage slot = builderSlots[builderId];
        require(slot.builder != address(0), "BuilderRewardsNFT: slot missing");

        uint256 saleValue = uint256(bid.pricePerFragment) * amount;
        totalBidEscrow -= saleValue;

        bid.amount -= amount;
        if (bid.amount == 0) {
            bid.active = false;
        }

        _safeTransferFrom(msg.sender, bid.bidder, builderId, amount, "");

        _settleSecondarySale(saleValue, msg.sender, slot.builder);

        emit BidAccepted(builderId, bidId, msg.sender, amount, bid.pricePerFragment);
    }

    /* -------------------------------------------------------------------------- */
    /*                                   Admin                                    */
    /* -------------------------------------------------------------------------- */

    function setFeeRecipients(address protocol, address air) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(protocol != address(0) && air != address(0), "BuilderRewardsNFT: zero address");
        protocolTreasury = protocol;
        airTreasury = air;
        emit FeeRecipientsUpdated(protocol, air);
    }
    function reassignBuilderSlot(uint256 builderId, address newBuilder)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newBuilder != address(0), "BuilderRewardsNFT: zero address");
        BuilderSlot storage slot = builderSlots[builderId];
        require(slot.builder != address(0), "BuilderRewardsNFT: slot missing");
        require(builderIds[newBuilder] == 0, "BuilderRewardsNFT: new builder has slot");

        address previousBuilder = slot.builder;
        builderIds[previousBuilder] = 0;
        builderIds[newBuilder] = builderId;
        slot.builder = newBuilder;

        emit BuilderSlotReassigned(builderId, previousBuilder, newBuilder);
    }

    function emergencyWithdraw(address payable recipient, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(recipient != address(0), "BuilderRewardsNFT: zero address");
        uint256 available = withdrawableBalance();
        require(amount <= available, "BuilderRewardsNFT: amount exceeds withdrawable");
        (bool sent, ) = recipient.call{value: amount}("");
        require(sent, "BuilderRewardsNFT: withdraw failed");
        emit EmergencyWithdrawal(recipient, amount);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /* -------------------------------------------------------------------------- */
    /*                                   Views                                    */
    /* -------------------------------------------------------------------------- */

    function getBuilderSlot(uint256 builderId) external view returns (BuilderSlot memory) {
        return builderSlots[builderId];
    }

    function uri(uint256 builderId) public view override returns (string memory) {
        BuilderSlot storage slot = builderSlots[builderId];
        require(slot.builder != address(0), "BuilderRewardsNFT: slot missing");
        if (slot.metadata.length > 0) {
            return string(slot.metadata);
        }
        return super.uri(builderId);
    }

    function remainingFragments(uint256 builderId) external view returns (uint256) {
        BuilderSlot storage slot = builderSlots[builderId];
        require(slot.builder != address(0), "BuilderRewardsNFT: slot missing");
        return FRAGMENTS_PER_SLOT - slot.fragmentsSold;
    }

    function getBuilderCount() external view returns (uint256) {
        return _nextBuilderId - 1;
    }

    function getBuilderIds(uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        uint256 total = _nextBuilderId - 1;
        if (offset >= total || limit == 0) {
            return new uint256[](0);
        }

        uint256 cappedLimit = limit;
        uint256 remaining = total - offset;
        if (cappedLimit > remaining) {
            cappedLimit = remaining;
        }

        uint256[] memory ids = new uint256[](cappedLimit);
        for (uint256 i = 0; i < cappedLimit; i++) {
            ids[i] = offset + i + 1;
        }
        return ids;
    }

    function getBid(uint256 builderId, uint256 bidId) external view returns (Bid memory) {
        return bids[builderId][bidId];
    }

    function getActiveBids(
        uint256 builderId,
        uint256 startBidId,
        uint256 endBidId
    ) external view returns (Bid[] memory) {
        require(endBidId >= startBidId, "BuilderRewardsNFT: invalid range");
        BuilderSlot storage slot = builderSlots[builderId];
        require(slot.builder != address(0), "BuilderRewardsNFT: slot missing");

        uint256 activeCount;
        for (uint256 i = startBidId; i <= endBidId; i++) {
            Bid storage bid = bids[builderId][i];
            if (bid.active && bid.amount > 0 && block.timestamp <= bid.expiry) {
                activeCount++;
            }
        }

        Bid[] memory activeBids = new Bid[](activeCount);
        uint256 index;
        for (uint256 i = startBidId; i <= endBidId; i++) {
            Bid storage bid = bids[builderId][i];
            if (bid.active && bid.amount > 0 && block.timestamp <= bid.expiry) {
                activeBids[index] = bid;
                index++;
            }
        }

        return activeBids;
    }

    function withdrawableBalance() public view returns (uint256) {
        uint256 balance = address(this).balance;
        if (balance <= totalBidEscrow) {
            return 0;
        }
        return balance - totalBidEscrow;
    }

    /* -------------------------------------------------------------------------- */
    /*                                Internal Logic                              */
    /* -------------------------------------------------------------------------- */

    function _settlePrimarySale(uint256 saleValue, address builder) internal {
        _sendValue(builder, saleValue);
    }

    function _settleSecondarySale(uint256 saleValue, address seller, address builder) internal {
        uint256 builderFee = (saleValue * BUILDER_FEE_BP) / FEE_DENOMINATOR;
        uint256 protocolFee = (saleValue * PROTOCOL_FEE_BP) / FEE_DENOMINATOR;
        uint256 airFee = (saleValue * AIR_FEE_BP) / FEE_DENOMINATOR;

        uint256 sellerProceeds = saleValue - builderFee - protocolFee - airFee;

        _sendValue(seller, sellerProceeds);
        _sendValue(builder, builderFee);
        _sendValue(protocolTreasury, protocolFee);
        _sendValue(airTreasury, airFee);
    }

    function _sendValue(address recipient, uint256 amount) internal {
        if (amount == 0) return;
        (bool sent, ) = recipient.call{value: amount}("");
        require(sent, "BuilderRewardsNFT: transfer failed");
    }

    function _requireSlotOwner(uint256 builderId) internal view returns (BuilderSlot storage) {
        BuilderSlot storage slot = builderSlots[builderId];
        require(slot.builder == msg.sender, "BuilderRewardsNFT: not builder");
        return slot;
    }

    function _validateAndCountProjects(
        address builder,
        uint256[] calldata projectIds
    ) internal view returns (uint64) {
        uint256 length = projectIds.length;
        uint256 previousId = type(uint256).min;
        uint256 ownedCount = 0;

        for (uint256 i = 0; i < length; i++) {
            uint256 projectId = projectIds[i];
            if (i > 0) {
                require(projectId > previousId, "BuilderRewardsNFT: duplicate project id");
            }
            previousId = projectId;

            (, address owner, , , , bool active, , ) = seasContract.getProject(projectId);
            require(owner == builder, "BuilderRewardsNFT: not project owner");
            require(active, "BuilderRewardsNFT: project inactive");
            ownedCount += 1;
        }

        require(ownedCount > 0, "BuilderRewardsNFT: no valid projects");
        return ownedCount.toUint64();
    }

    function _tierForProjectCount(uint64 projectCount) internal pure returns (uint64) {
        if (projectCount >= 10) return 4;
        if (projectCount >= 6) return 3;
        if (projectCount >= 3) return 2;
        return 1;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    receive() external payable {}
}

