// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SovereignSeas Admin Contract
 * @dev Handles administrative functions and fee collection for the SovereignSeas ecosystem
 */
contract SovSeasAdmin is Ownable, ReentrancyGuard {
    // Platform fee (15%)
    uint256 public constant PLATFORM_FEE = 15;

    // Creation fees
    uint256 public constant CAMPAIGN_CREATION_FEE = 2 ether; // 2 CELO
    uint256 public constant ENTITY_CREATION_FEE = 1 ether;  // 1 CELO
    uint256 public constant POLL_CREATION_FEE = 0.5 ether;  // 0.5 CELO
    uint256 public constant COMMENT_FEE = 0.01 ether;      // 0.01 CELO

    // Total accumulated fees
    uint256 public totalCreationFees;

    // Super admins mapping
    mapping(address => bool) public superAdmins;

    // Events
    event SuperAdminAdded(address indexed newSuperAdmin, address indexed addedBy);
    event SuperAdminRemoved(address indexed superAdmin, address indexed removedBy);
    event CreationFeesWithdrawn(address indexed superAdmin, uint256 amount);
    event FeeCollected(address indexed from, uint256 amount, string feeType);

    /**
     * @dev Constructor adds deployer as super admin
     */
    constructor() Ownable(msg.sender) {
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
     * @dev Check if an address is a super admin
     * @param _admin Address to check
     * @return Boolean indicating if the address is a super admin
     */
    function isSuperAdmin(address _admin) external view returns (bool) {
        return superAdmins[_admin];
    }

    /**
     * @dev Collect campaign creation fee
     */
    function collectCampaignFee() external payable {
        require(msg.value == CAMPAIGN_CREATION_FEE, "Must send exact campaign creation fee");
        totalCreationFees += CAMPAIGN_CREATION_FEE;
        emit FeeCollected(msg.sender, msg.value, "CampaignCreation");
    }

    /**
     * @dev Collect entity creation fee
     */
    function collectEntityFee() external payable {
        require(msg.value == ENTITY_CREATION_FEE, "Must send exact entity creation fee");
        totalCreationFees += ENTITY_CREATION_FEE;
        emit FeeCollected(msg.sender, msg.value, "EntityCreation");
    }

    /**
     * @dev Collect poll creation fee
     */
    function collectPollFee() external payable {
        require(msg.value == POLL_CREATION_FEE, "Must send exact poll creation fee");
        totalCreationFees += POLL_CREATION_FEE;
        emit FeeCollected(msg.sender, msg.value, "PollCreation");
    }

    /**
     * @dev Collect comment fee
     */
    function collectCommentFee() external payable {
        require(msg.value == COMMENT_FEE, "Must send exact comment fee");
        totalCreationFees += COMMENT_FEE;
        emit FeeCollected(msg.sender, msg.value, "Comment");
    }

    /**
     * @dev Allow the contract to receive funds
     */
    receive() external payable {
        totalCreationFees += msg.value;
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

    /**
     * @dev Calculate admin and platform fees
     * @param _totalAmount Total amount to calculate fees from
     * @param _adminFeePercentage Admin fee percentage
     * @return platformFee Platform fee amount
     * @return adminFee Admin fee amount
     * @return remaining Remaining amount after fees
     */
    function calculateFees(uint256 _totalAmount, uint256 _adminFeePercentage) 
        external 
        pure 
        returns (uint256 platformFee, uint256 adminFee, uint256 remaining) 
    {
        platformFee = (_totalAmount * PLATFORM_FEE) / 100;
        adminFee = (_totalAmount * _adminFeePercentage) / 100;
        remaining = _totalAmount - platformFee - adminFee;
        return (platformFee, adminFee, remaining);
    }
}