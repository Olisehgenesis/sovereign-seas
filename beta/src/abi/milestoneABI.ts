export const milestoneABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_seas4Contract",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ReentrancyGuardReentrantCall",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        }
      ],
      "name": "SafeERC20FailedOperation",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "feeType",
          "type": "string"
        }
      ],
      "name": "FeeCollected",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "grantId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "addedBy",
          "type": "address"
        }
      ],
      "name": "FundsAddedToGrant",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "grantId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "withdrawnBy",
          "type": "address"
        }
      ],
      "name": "FundsWithdrawnFromGrant",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "grantId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "admin",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "addedBy",
          "type": "address"
        }
      ],
      "name": "GrantAdminAdded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "grantId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "admin",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "removedBy",
          "type": "address"
        }
      ],
      "name": "GrantAdminRemoved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "grantId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "cancelledBy",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address[]",
          "name": "tokens",
          "type": "address[]"
        },
        {
          "indexed": false,
          "internalType": "uint256[]",
          "name": "refundedAmounts",
          "type": "uint256[]"
        }
      ],
      "name": "GrantCancelled",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "grantId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "grantee",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "completedAt",
          "type": "uint256"
        }
      ],
      "name": "GrantCompleted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "grantId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "linkedEntityId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "enum MilestoneBasedFunding.EntityType",
          "name": "entityType",
          "type": "uint8"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "grantee",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address[]",
          "name": "tokens",
          "type": "address[]"
        },
        {
          "indexed": false,
          "internalType": "uint256[]",
          "name": "amounts",
          "type": "uint256[]"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "siteFeePercentage",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "reviewTimeLock",
          "type": "uint256"
        }
      ],
      "name": "GrantCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "grantId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "milestoneId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "approver",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "message",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "autoApproved",
          "type": "bool"
        }
      ],
      "name": "MilestoneApproved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "grantId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "milestoneId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "grantee",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "siteFee",
          "type": "uint256"
        }
      ],
      "name": "MilestoneFundsReleased",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "grantId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "milestoneId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "MilestoneLocked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "grantId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "milestoneId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "penaltyPercentage",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "MilestonePenaltyApplied",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "grantId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "milestoneId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "rejector",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "message",
          "type": "string"
        }
      ],
      "name": "MilestoneRejected",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "grantId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "milestoneId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "newEvidenceHash",
          "type": "string"
        }
      ],
      "name": "MilestoneResubmitted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "grantId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "milestoneId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "grantee",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "evidenceHash",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "percentage",
          "type": "uint256"
        }
      ],
      "name": "MilestoneSubmitted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "MAX_SITE_FEE",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MIN_SITE_FEE",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_grantId",
          "type": "uint256"
        },
        {
          "internalType": "address[]",
          "name": "_tokens",
          "type": "address[]"
        },
        {
          "internalType": "uint256[]",
          "name": "_amounts",
          "type": "uint256[]"
        }
      ],
      "name": "addFundsToGrant",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_grantId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_admin",
          "type": "address"
        }
      ],
      "name": "addGrantAdmin",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_grantId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_milestoneId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "_message",
          "type": "string"
        }
      ],
      "name": "approveMilestone",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_milestoneId",
          "type": "uint256"
        }
      ],
      "name": "canAutoApproveMilestone",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_grantId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_refundTo",
          "type": "address"
        }
      ],
      "name": "cancelGrant",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "celoToken",
      "outputs": [
        {
          "internalType": "contract IERC20",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_grantId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_milestoneId",
          "type": "uint256"
        }
      ],
      "name": "checkAndAutoApproveMilestone",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "collectedFees",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_linkedEntityId",
          "type": "uint256"
        },
        {
          "internalType": "enum MilestoneBasedFunding.EntityType",
          "name": "_entityType",
          "type": "uint8"
        },
        {
          "internalType": "address",
          "name": "_grantee",
          "type": "address"
        },
        {
          "internalType": "address[]",
          "name": "_tokens",
          "type": "address[]"
        },
        {
          "internalType": "uint256[]",
          "name": "_amounts",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256",
          "name": "_siteFeePercentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_reviewTimeLock",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_milestoneDeadline",
          "type": "uint256"
        }
      ],
      "name": "createGrant",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_grantId",
          "type": "uint256"
        }
      ],
      "name": "getGrant",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "grantee",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "linkedEntityId",
          "type": "uint256"
        },
        {
          "internalType": "enum MilestoneBasedFunding.EntityType",
          "name": "entityType",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "siteFeePercentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "reviewTimeLock",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "milestoneDeadline",
          "type": "uint256"
        },
        {
          "internalType": "enum MilestoneBasedFunding.GrantStatus",
          "name": "status",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "completedAt",
          "type": "uint256"
        },
        {
          "internalType": "address[]",
          "name": "supportedTokens",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_grantId",
          "type": "uint256"
        }
      ],
      "name": "getGrantAdmins",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getGrantCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_grantId",
          "type": "uint256"
        }
      ],
      "name": "getGrantMilestones",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_grantId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_token",
          "type": "address"
        }
      ],
      "name": "getGrantTokenAmounts",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "totalAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "releasedAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "escrowedAmount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_milestoneId",
          "type": "uint256"
        }
      ],
      "name": "getMilestone",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "grantId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "evidenceHash",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "percentage",
          "type": "uint256"
        },
        {
          "internalType": "enum MilestoneBasedFunding.MilestoneStatus",
          "name": "status",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "submittedAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "reviewDeadline",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "approvedAt",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "approvedBy",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "approvalMessage",
          "type": "string"
        },
        {
          "internalType": "bool",
          "name": "autoApproved",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "paidAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "deadline",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "penaltyPercentage",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isLocked",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getMilestoneCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_milestoneId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_token",
          "type": "address"
        }
      ],
      "name": "getMilestonePayout",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_milestoneId",
          "type": "uint256"
        }
      ],
      "name": "getMilestoneRejection",
      "outputs": [
        {
          "internalType": "string",
          "name": "rejectionMessage",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "rejectedBy",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "rejectedAt",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "grantAdmins",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "grantHasMilestone",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "grantMilestones",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "grants",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "grantee",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "linkedEntityId",
          "type": "uint256"
        },
        {
          "internalType": "enum MilestoneBasedFunding.EntityType",
          "name": "entityType",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "siteFeePercentage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "reviewTimeLock",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "milestoneDeadline",
          "type": "uint256"
        },
        {
          "internalType": "enum MilestoneBasedFunding.GrantStatus",
          "name": "status",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "completedAt",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "isGrantAdmin",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "milestones",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "grantId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "evidenceHash",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "percentage",
          "type": "uint256"
        },
        {
          "internalType": "enum MilestoneBasedFunding.MilestoneStatus",
          "name": "status",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "submittedAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "reviewDeadline",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "approvedAt",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "approvedBy",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "approvalMessage",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "rejectionMessage",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "rejectedBy",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "rejectedAt",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "autoApproved",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "paidAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "deadline",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "penaltyPercentage",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isLocked",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextGrantId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextMilestoneId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_grantId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_milestoneId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "_message",
          "type": "string"
        }
      ],
      "name": "rejectMilestone",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_grantId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_admin",
          "type": "address"
        }
      ],
      "name": "removeGrantAdmin",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_grantId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_milestoneId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "_newEvidenceHash",
          "type": "string"
        }
      ],
      "name": "resubmitMilestone",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "seas4Contract",
      "outputs": [
        {
          "internalType": "contract ISovereignSeasV4",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_grantId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "_title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_description",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_evidenceHash",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "_percentage",
          "type": "uint256"
        }
      ],
      "name": "submitMilestone",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_seas4Contract",
          "type": "address"
        }
      ],
      "name": "updateSeas4Contract",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_grantId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_token",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_recipient",
          "type": "address"
        }
      ],
      "name": "withdrawFundsFromGrant",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ] as const;

