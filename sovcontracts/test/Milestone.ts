import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { network } from "hardhat";
import { parseEther, parseUnits, getAddress, zeroAddress } from "viem";

// Simple ERC20 token for testing
const ERC20_ABI = [
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "totalSupply", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

describe("MilestoneBasedFunding", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];
  const grantee = walletClients[1];
  const admin = walletClients[2];
  const other = walletClients[3];

  let seas4: any;
  let milestone: any;
  let celoToken: any;
  let testToken: any;
  let projectId: bigint;
  let campaignId: bigint;

  before(async function () {
    try {
      // Deploy a simple ERC20 token for testing (mock CELO)
      celoToken = await viem.deployContract("ERC20Mock", [
        "Celo",
        "CELO",
        parseEther("1000000"),
      ]);

      // Deploy minimal mock seas4 for testing
      seas4 = await viem.deployContract("MockSeas4", [celoToken.address]);

      // Deploy a test ERC20 token
      testToken = await viem.deployContract("ERC20Mock", [
        "Test Token",
        "TEST",
        parseEther("1000000"),
      ]);

      // Deploy milestone contract
      milestone = await viem.deployContract("MilestoneBasedFunding", [
        seas4.address,
      ]);

      // Add test token to seas4 as supported token
      const addTokenTx = await seas4.write.addSupportedToken([testToken.address], {
        account: deployer.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: addTokenTx });

      // Create a project in seas4
      const projectTx = await seas4.write.createProject(
        [
          "Test Project",
          "Test Description",
          "Bio",
          "Contract Info",
          "Additional Data",
          [],
          true,
        ],
        { account: deployer.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: projectTx });
      projectId = await seas4.read.nextProjectId();
      projectId = projectId - 1n;

      // Create a campaign in seas4
      const futureTime = BigInt(Math.floor(Date.now() / 1000) + 86400); // 1 day from now
      const campaignTx = await seas4.write.createCampaign(
        [
          "Test Campaign",
          "Campaign Description",
          "Main Info",
          "Additional Info",
          futureTime,
          futureTime + 86400n,
          10n, // adminFeePercentage
          5n, // maxWinners
          false, // useQuadraticDistribution
          false, // useCustomDistribution
          "",
          celoToken.address, // payoutToken
          celoToken.address, // feeToken
        ],
        {
          account: deployer.account,
          value: parseEther("2"), // campaign creation fee
        }
      );
      await publicClient.waitForTransactionReceipt({ hash: campaignTx });
      campaignId = await seas4.read.nextCampaignId();
      campaignId = campaignId - 1n;

      // Approve tokens for milestone contract
      const approveTx = await testToken.write.approve([milestone.address, parseEther("100000")], {
        account: deployer.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
    } catch (error) {
      console.error("Setup error:", error);
      throw error;
    }
  });

  describe("Grant Creation", function () {
    it("Should create a grant linked to a project", async function () {
      const grantAmount = parseEther("100");
      const siteFee = 3n; // 3%
      const reviewTimeLock = 86400n; // 1 day

      const tx = await milestone.write.createGrant(
        [
          projectId,
          0n, // EntityType.PROJECT
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          siteFee,
          reviewTimeLock,
          0n, // milestoneDeadline (0 = no deadline)
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );

      await viem.assertions.emit(tx, milestone, "GrantCreated");
      
      // Verify event details by checking contract state

      const grantCount = await milestone.read.getGrantCount();
      const grantId = grantCount - 1n;
      const grant = await milestone.read.getGrant([grantId]);
      assert.equal(Number(grant[0]), Number(grantId)); // id
      assert.equal(grant[1].toLowerCase(), grantee.account.address.toLowerCase());
      assert.equal(grant[2], projectId);
      assert.equal(Number(grant[3]), 0); // EntityType.PROJECT
      assert.equal(grant[4], siteFee);
      assert.equal(grant[5], reviewTimeLock);
      assert.equal(grant[6], 0n); // milestoneDeadline
      assert.equal(Number(grant[7]), 0); // GrantStatus.ACTIVE

      // Check escrowed amounts
      const tokenAmounts = await milestone.read.getGrantTokenAmounts([
        grantId,
        celoToken.address,
      ]);
      assert.equal(tokenAmounts[0], grantAmount); // totalAmount
      assert.equal(tokenAmounts[1], 0n); // releasedAmount
      assert.equal(tokenAmounts[2], grantAmount); // escrowedAmount
    });

    it("Should create a grant linked to a campaign", async function () {
      const grantAmount = parseEther("50");
      const siteFee = 2n; // 2%
      const reviewTimeLock = 3600n; // 1 hour

      const tx = await milestone.write.createGrant(
        [
          campaignId,
          1n, // EntityType.CAMPAIGN
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          siteFee,
          reviewTimeLock,
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );

      await viem.assertions.emit(tx, milestone, "GrantCreated");

      const grantCount = await milestone.read.getGrantCount();
      const grantId = grantCount - 1n;
      const grant = await milestone.read.getGrant([grantId]);
      assert.equal(Number(grant[3]), 1); // EntityType.CAMPAIGN
    });

    it("Should create a grant with multiple tokens", async function () {
      const celoAmount = parseEther("100");
      const testTokenAmount = parseEther("50");
      const siteFee = 3n;
      const reviewTimeLock = 86400n;

      const tx = await milestone.write.createGrant(
        [
          projectId,
          0n, // EntityType.PROJECT
          grantee.account.address,
          [celoToken.address, testToken.address],
          [celoAmount, testTokenAmount],
          siteFee,
          reviewTimeLock,
        ],
        {
          account: deployer.account,
          value: celoAmount,
        }
      );

      const grantCount = await milestone.read.getGrantCount();
      const grantId = grantCount - 1n;
      const grant = await milestone.read.getGrant([grantId]);
      const supportedTokens = grant[10]; // supportedTokens array (index shifted due to milestoneDeadline)
      assert.equal(supportedTokens.length, 2);
      assert.equal(supportedTokens[0].toLowerCase(), celoToken.address.toLowerCase());
      assert.equal(supportedTokens[1].toLowerCase(), testToken.address.toLowerCase());

      // Check both token amounts
      const celoAmounts = await milestone.read.getGrantTokenAmounts([
        grantId,
        celoToken.address,
      ]);
      assert.equal(celoAmounts[0], celoAmount);

      const testTokenAmounts = await milestone.read.getGrantTokenAmounts([
        grantId,
        testToken.address,
      ]);
      assert.equal(testTokenAmounts[0], testTokenAmount);
    });

    it("Should reject grant creation with invalid site fee", async function () {
      await assert.rejects(
        milestone.write.createGrant(
          [
            projectId,
            0n,
            grantee.account.address,
            [celoToken.address],
            [parseEther("100")],
            0n, // Invalid: below minimum
            86400n,
            0n, // milestoneDeadline
          ],
          {
            account: deployer.account,
            value: parseEther("100"),
          }
        ),
        /Site fee must be between 1-5%/
      );

      await assert.rejects(
        milestone.write.createGrant(
          [
            projectId,
            0n,
            grantee.account.address,
            [celoToken.address],
            [parseEther("100")],
            6n, // Invalid: above maximum
            86400n,
            0n, // milestoneDeadline
          ],
          {
            account: deployer.account,
            value: parseEther("100"),
          }
        ),
        /Site fee must be between 1-5%/
      );
    });

    it("Should reject grant creation with insufficient funds", async function () {
      await assert.rejects(
        milestone.write.createGrant(
          [
            projectId,
            0n,
            grantee.account.address,
            [celoToken.address],
            [parseEther("1000")],
            3n,
            86400n,
            0n, // milestoneDeadline
          ],
          {
            account: deployer.account,
            value: parseEther("500"), // Less than required
          }
        ),
        /Insufficient CELO sent/
      );
    });
  });

  describe("Milestone Submission", function () {
    let grantId: bigint;

    before(async function () {
      // Create a grant for milestone tests
      const grantAmount = parseEther("100");
      await milestone.write.createGrant(
        [
          projectId,
          0n,
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          3n, // 3% site fee
          86400n, // 1 day review time
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );
      grantId = await milestone.read.getGrantCount();
      grantId = grantId - 1n;
    });

    it("Should submit a milestone", async function () {
      const tx = await milestone.write.submitMilestone(
        [
          grantId,
          "Milestone 1",
          "Complete feature X",
          "QmHash123",
          30n, // 30% of grant
        ],
        {
          account: grantee.account,
        }
      );

      await viem.assertions.emit(tx, milestone, "MilestoneSubmitted");

      const milestoneCount = await milestone.read.getMilestoneCount();
      const milestoneId = milestoneCount - 1n;
      const milestoneData = await milestone.read.getMilestone([milestoneId]);
      assert.equal(Number(milestoneData[0]), Number(milestoneId)); // id
      assert.equal(milestoneData[1], grantId); // grantId
      assert.equal(milestoneData[2], "Milestone 1"); // title
      assert.equal(milestoneData[5], 30n); // percentage
      assert.equal(Number(milestoneData[6]), 1); // MilestoneStatus.SUBMITTED

      // Check payout amount (30% of 100 = 30)
      const payout = await milestone.read.getMilestonePayout([
        milestoneId,
        celoToken.address,
      ]);
      assert.equal(payout, parseEther("30"));
    });

    it("Should reject milestone submission with invalid percentage", async function () {
      await assert.rejects(
        milestone.write.submitMilestone(
          [grantId, "Invalid", "Desc", "Hash", 0n], // 0% invalid
          { account: grantee.account }
        ),
        /Invalid percentage/
      );

      await assert.rejects(
        milestone.write.submitMilestone(
          [grantId, "Invalid", "Desc", "Hash", 101n], // >100% invalid
          { account: grantee.account }
        ),
        /Invalid percentage/
      );
    });

    it("Should reject milestone submission exceeding 100% total", async function () {
      // Submit first milestone with 50%
      await milestone.write.submitMilestone(
        [grantId, "M1", "Desc", "Hash1", 50n],
        { account: grantee.account }
      );

      // Try to submit another with 60% (total would be 110%)
      await assert.rejects(
        milestone.write.submitMilestone(
          [grantId, "M2", "Desc", "Hash2", 60n],
          { account: grantee.account }
        ),
        /Total milestone percentage exceeds 100%/
      );
    });

    it("Should allow multiple milestones that sum to 100%", async function () {
      // Create a new grant
      const grantAmount = parseEther("200");
      await milestone.write.createGrant(
        [
          projectId,
          0n,
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          3n,
          86400n,
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );
      const newGrantId = (await milestone.read.getGrantCount()) - 1n;

      // Submit milestones that sum to 100%
      await milestone.write.submitMilestone(
        [newGrantId, "M1", "Desc1", "Hash1", 40n],
        { account: grantee.account }
      );
      await milestone.write.submitMilestone(
        [newGrantId, "M2", "Desc2", "Hash2", 30n],
        { account: grantee.account }
      );
      await milestone.write.submitMilestone(
        [newGrantId, "M3", "Desc3", "Hash3", 30n],
        { account: grantee.account }
      );

      const milestones = await milestone.read.getGrantMilestones([newGrantId]);
      assert.equal(milestones.length, 3);
    });
  });

  describe("Milestone Approval", function () {
    let grantId: bigint;
    let milestoneId: bigint;

    before(async function () {
      // Create grant and submit milestone
      const grantAmount = parseEther("100");
      await milestone.write.createGrant(
        [
          projectId,
          0n,
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          3n,
          86400n,
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );
      grantId = (await milestone.read.getGrantCount()) - 1n;

      await milestone.write.submitMilestone(
        [grantId, "Test Milestone", "Description", "QmHash", 50n],
        { account: grantee.account }
      );
      milestoneId = (await milestone.read.getMilestoneCount()) - 1n;
    });

    it("Should approve a milestone and release funds", async function () {
      const granteeBalanceBefore = await publicClient.getBalance({
        address: grantee.account.address,
      });

      const tx = await milestone.write.approveMilestone(
        [grantId, milestoneId, "Approved! Great work."],
        { account: deployer.account }
      );

      await viem.assertions.emit(tx, milestone, "MilestoneApproved");

      // Check milestone status
      const milestoneData = await milestone.read.getMilestone([milestoneId]);
      assert.equal(Number(milestoneData[6]), 4); // MilestoneStatus.PAID (enum: PENDING=0, SUBMITTED=1, APPROVED=2, REJECTED=3, PAID=4)
      assert.equal(String(milestoneData[10]).toLowerCase(), deployer.account.address.toLowerCase()); // approvedBy (index 10)
      assert.equal(milestoneData[11], "Approved! Great work."); // approvalMessage (index 11)

      // Check funds were released (50% of 100 = 50, minus 3% fee = 48.5)
      const granteeBalanceAfter = await publicClient.getBalance({
        address: grantee.account.address,
      });
      const expectedPayout = parseEther("48.5"); // 50 - 3% = 48.5
      assert.equal(
        granteeBalanceAfter - granteeBalanceBefore,
        expectedPayout
      );

      // Check grant tracking
      const tokenAmounts = await milestone.read.getGrantTokenAmounts([
        grantId,
        celoToken.address,
      ]);
      assert.equal(tokenAmounts[1], parseEther("50")); // releasedAmount
      assert.equal(tokenAmounts[2], parseEther("50")); // escrowedAmount (remaining)
    });

    it("Should reject a milestone", async function () {
      // Create new grant and milestone
      const grantAmount = parseEther("100");
      await milestone.write.createGrant(
        [
          projectId,
          0n,
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          3n,
          86400n,
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );
      const newGrantId = (await milestone.read.getGrantCount()) - 1n;

      await milestone.write.submitMilestone(
        [newGrantId, "Reject Test", "Desc", "Hash", 30n],
        { account: grantee.account }
      );
      const newMilestoneId = (await milestone.read.getMilestoneCount()) - 1n;

      const tx = await milestone.write.rejectMilestone(
        [newGrantId, newMilestoneId, "Needs more work"],
        { account: deployer.account }
      );

      await viem.assertions.emit(tx, milestone, "MilestoneRejected");

      const rejection = await milestone.read.getMilestoneRejection([
        newMilestoneId,
      ]);
      assert.equal(rejection[0], "Needs more work");
      assert.equal(
        rejection[1].toLowerCase(),
        deployer.account.address.toLowerCase()
      );

      // Funds should not be released
      const tokenAmounts = await milestone.read.getGrantTokenAmounts([
        newGrantId,
        celoToken.address,
      ]);
      assert.equal(tokenAmounts[1], 0n); // releasedAmount should be 0
    });

    it("Should allow resubmission after rejection", async function () {
      // Use the rejected milestone from previous test
      const milestones = await milestone.read.getGrantMilestones([
        (await milestone.read.getGrantCount()) - 1n,
      ]);
      const rejectedMilestoneId = milestones[Number(milestones.length) - 1];

      const tx = await milestone.write.resubmitMilestone(
        [
          (await milestone.read.getGrantCount()) - 1n,
          rejectedMilestoneId,
          "QmNewHash",
        ],
        { account: grantee.account }
      );

      await viem.assertions.emit(tx, milestone, "MilestoneResubmitted");

      const milestoneData = await milestone.read.getMilestone([
        rejectedMilestoneId,
      ]);
      assert.equal(Number(milestoneData[6]), 1); // MilestoneStatus.SUBMITTED (enum: PENDING=0, SUBMITTED=1, APPROVED=2, REJECTED=3, PAID=4)
      assert.equal(milestoneData[4], "QmNewHash"); // evidenceHash
    });
  });

  describe("Auto-Approval", function () {
    it("Should auto-approve milestone after review deadline", async function () {
      // Create grant with short review time
      const grantAmount = parseEther("100");
      const shortReviewTime = 5n; // 5 seconds

      await milestone.write.createGrant(
        [
          projectId,
          0n,
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          3n,
          shortReviewTime,
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );
      const grantId = (await milestone.read.getGrantCount()) - 1n;

      await milestone.write.submitMilestone(
        [grantId, "Auto Test", "Desc", "Hash", 40n],
        { account: grantee.account }
      );
      const milestoneId = (await milestone.read.getMilestoneCount()) - 1n;

      // Get milestone to find review deadline
      const initialMilestoneData = await milestone.read.getMilestone([milestoneId]);
      const reviewDeadline = initialMilestoneData[8]; // reviewDeadline field (index 8)
      
      // Advance time past review deadline using viem test client
      const testClient = await viem.getTestClient();
      await testClient.setNextBlockTimestamp({ timestamp: reviewDeadline + 1n });
      await testClient.mine({ blocks: 1 });

      // Check if can be auto-approved
      const canAutoApprove = await milestone.read.canAutoApproveMilestone([
        milestoneId,
      ]);
      assert.equal(canAutoApprove, true);

      // Auto-approve
      const tx = await milestone.write.checkAndAutoApproveMilestone(
        [grantId, milestoneId],
        { account: other.account }
      );

      await viem.assertions.emit(tx, milestone, "MilestoneApproved");

      const finalMilestoneData = await milestone.read.getMilestone([milestoneId]);
      assert.equal(Number(finalMilestoneData[6]), 4); // MilestoneStatus.PAID (enum: PENDING=0, SUBMITTED=1, APPROVED=2, REJECTED=3, PAID=4)
      assert.equal(finalMilestoneData[12], true); // autoApproved (index 12)
    });
  });

  describe("Grant Cancellation", function () {
    it("Should cancel a grant and refund escrowed funds", async function () {
      const grantAmount = parseEther("100");
      await milestone.write.createGrant(
        [
          projectId,
          0n,
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          3n,
          86400n,
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );
      const grantId = (await milestone.read.getGrantCount()) - 1n;

      const deployerBalanceBefore = await publicClient.getBalance({
        address: deployer.account.address,
      });

      const tx = await milestone.write.cancelGrant(
        [grantId, deployer.account.address],
        { account: deployer.account }
      );

      await viem.assertions.emit(tx, milestone, "GrantCancelled");

      const grant = await milestone.read.getGrant([grantId]);
      assert.equal(Number(grant[7]), 2); // GrantStatus.CANCELLED (enum: ACTIVE=0, COMPLETED=1, CANCELLED=2)

      // Check refund
      const deployerBalanceAfter = await publicClient.getBalance({
        address: deployer.account.address,
      });
      // Note: Balance check might be approximate due to gas costs
      assert(deployerBalanceAfter > deployerBalanceBefore);
    });
  });

  describe("Grant Completion", function () {
    it("Should mark grant as completed when all milestones are paid", async function () {
      const grantAmount = parseEther("200");
      await milestone.write.createGrant(
        [
          projectId,
          0n,
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          3n,
          86400n,
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );
      const grantId = (await milestone.read.getGrantCount()) - 1n;

      // Submit and approve milestones that sum to 100%
      await milestone.write.submitMilestone(
        [grantId, "M1", "Desc1", "Hash1", 50n],
        { account: grantee.account }
      );
      const m1Id = (await milestone.read.getMilestoneCount()) - 1n;

      await milestone.write.submitMilestone(
        [grantId, "M2", "Desc2", "Hash2", 50n],
        { account: grantee.account }
      );
      const m2Id = (await milestone.read.getMilestoneCount()) - 1n;

      // Approve both milestones
      await milestone.write.approveMilestone(
        [grantId, m1Id, "Approved"],
        { account: deployer.account }
      );
      await milestone.write.approveMilestone(
        [grantId, m2Id, "Approved"],
        { account: deployer.account }
      );

      // Check grant is completed
      const grant = await milestone.read.getGrant([grantId]);
      assert.equal(Number(grant[7]), 1); // GrantStatus.COMPLETED
      assert(grant[9] > 0n); // completedAt should be set (index 9)
    });
  });

  describe("Access Control", function () {
    it("Should only allow grantee to submit milestones", async function () {
      const grantAmount = parseEther("100");
      await milestone.write.createGrant(
        [
          projectId,
          0n,
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          3n,
          86400n,
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );
      const grantId = (await milestone.read.getGrantCount()) - 1n;

      await assert.rejects(
        milestone.write.submitMilestone(
          [grantId, "Test", "Desc", "Hash", 30n],
          { account: other.account }
        ),
        /Only grantee can call this function/
      );
    });

    it("Should only allow grant admin to approve/reject milestones", async function () {
      const grantAmount = parseEther("100");
      await milestone.write.createGrant(
        [
          projectId,
          0n,
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          3n,
          86400n,
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );
      const grantId = (await milestone.read.getGrantCount()) - 1n;

      await milestone.write.submitMilestone(
        [grantId, "Test", "Desc", "Hash", 30n],
        { account: grantee.account }
      );
      const milestoneId = (await milestone.read.getMilestoneCount()) - 1n;

      await assert.rejects(
        milestone.write.approveMilestone(
          [grantId, milestoneId, "Approved"],
          { account: other.account }
        ),
        /Only grant admin can call this function/
      );
    });
  });

  describe("End-to-End: Complete Grant Workflow", function () {
    it("Should complete full workflow: create grant, submit milestones, approve, and receive payment", async function () {
      // Step 1: Create a grant linked to a project
      const grantAmount = parseEther("1000");
      const siteFee = 3n; // 3%
      const reviewTimeLock = 3600n; // 1 hour

      const createGrantTx = await milestone.write.createGrant(
        [
          projectId,
          0n, // EntityType.PROJECT
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          siteFee,
          reviewTimeLock,
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );
      await publicClient.waitForTransactionReceipt({ hash: createGrantTx });

      const grantId = (await milestone.read.getGrantCount()) - 1n;
      
      // Verify grant was created
      const grant = await milestone.read.getGrant([grantId]);
      assert.equal(Number(grant[3]), 0); // EntityType.PROJECT
      assert.equal(grant[1].toLowerCase(), grantee.account.address.toLowerCase());
      assert.equal(Number(grant[6]), 0); // GrantStatus.ACTIVE

      // Check initial escrowed amount
      const initialTokenAmounts = await milestone.read.getGrantTokenAmounts([
        grantId,
        celoToken.address,
      ]);
      assert.equal(initialTokenAmounts[0], grantAmount); // totalAmount
      assert.equal(initialTokenAmounts[1], 0n); // releasedAmount
      assert.equal(initialTokenAmounts[2], grantAmount); // escrowedAmount

      // Step 2: Grantee submits first milestone (30% of grant)
      const milestone1Tx = await milestone.write.submitMilestone(
        [
          grantId,
          "Milestone 1: Project Setup",
          "Complete project initialization and setup infrastructure",
          "QmHashMilestone1",
          30n, // 30%
        ],
        { account: grantee.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: milestone1Tx });

      const milestone1Id = (await milestone.read.getMilestoneCount()) - 1n;
      const milestone1Data = await milestone.read.getMilestone([milestone1Id]);
      assert.equal(Number(milestone1Data[6]), 1); // MilestoneStatus.SUBMITTED
      assert.equal(milestone1Data[2], "Milestone 1: Project Setup");

      // Step 3: Admin approves first milestone
      const granteeBalanceBefore1 = await publicClient.getBalance({
        address: grantee.account.address,
      });

      const approve1Tx = await milestone.write.approveMilestone(
        [grantId, milestone1Id, "Great work on the setup! Approved."],
        { account: deployer.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: approve1Tx });

      // Verify milestone was paid (30% of 1000 = 300, minus 3% fee = 291)
      const milestone1After = await milestone.read.getMilestone([milestone1Id]);
      assert.equal(Number(milestone1After[6]), 4); // MilestoneStatus.PAID

      const granteeBalanceAfter1 = await publicClient.getBalance({
        address: grantee.account.address,
      });
      const expectedPayout1 = parseEther("291"); // 300 - 3% = 291
      assert.equal(
        granteeBalanceAfter1 - granteeBalanceBefore1,
        expectedPayout1
      );

      // Check grant tracking after first milestone
      const tokenAmountsAfter1 = await milestone.read.getGrantTokenAmounts([
        grantId,
        celoToken.address,
      ]);
      assert.equal(tokenAmountsAfter1[1], parseEther("300")); // releasedAmount
      assert.equal(tokenAmountsAfter1[2], parseEther("700")); // remaining escrowedAmount

      // Verify grant is still active after first milestone
      const grantAfter1 = await milestone.read.getGrant([grantId]);
      assert.equal(Number(grantAfter1[7]), 0); // GrantStatus.ACTIVE

      // Step 4: Grantee submits second milestone (40% of grant)
      const milestone2Tx = await milestone.write.submitMilestone(
        [
          grantId,
          "Milestone 2: Core Features",
          "Implement core functionality and features",
          "QmHashMilestone2",
          40n, // 40%
        ],
        { account: grantee.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: milestone2Tx });

      const milestone2Id = (await milestone.read.getMilestoneCount()) - 1n;
      const milestone2Data = await milestone.read.getMilestone([milestone2Id]);
      assert.equal(Number(milestone2Data[6]), 1); // MilestoneStatus.SUBMITTED

      // Step 5: Admin approves second milestone
      const granteeBalanceBefore2 = await publicClient.getBalance({
        address: grantee.account.address,
      });

      const approve2Tx = await milestone.write.approveMilestone(
        [grantId, milestone2Id, "Excellent progress! Core features look good."],
        { account: deployer.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: approve2Tx });

      // Verify second milestone was paid (40% of 1000 = 400, minus 3% fee = 388)
      const milestone2After = await milestone.read.getMilestone([milestone2Id]);
      assert.equal(Number(milestone2After[6]), 4); // MilestoneStatus.PAID

      const granteeBalanceAfter2 = await publicClient.getBalance({
        address: grantee.account.address,
      });
      const expectedPayout2 = parseEther("388"); // 400 - 3% = 388
      assert.equal(
        granteeBalanceAfter2 - granteeBalanceBefore2,
        expectedPayout2
      );

      // Step 6: Grantee submits final milestone (30% of grant)
      const milestone3Tx = await milestone.write.submitMilestone(
        [
          grantId,
          "Milestone 3: Final Polish",
          "Complete final testing, documentation, and deployment",
          "QmHashMilestone3",
          30n, // 30%
        ],
        { account: grantee.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: milestone3Tx });

      const milestone3Id = (await milestone.read.getMilestoneCount()) - 1n;

      // Step 7: Admin approves final milestone
      const granteeBalanceBefore3 = await publicClient.getBalance({
        address: grantee.account.address,
      });

      const approve3Tx = await milestone.write.approveMilestone(
        [grantId, milestone3Id, "Project completed successfully! Well done."],
        { account: deployer.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: approve3Tx });

      // Verify final milestone was paid (30% of 1000 = 300, minus 3% fee = 291)
      const milestone3After = await milestone.read.getMilestone([milestone3Id]);
      assert.equal(Number(milestone3After[6]), 4); // MilestoneStatus.PAID

      const granteeBalanceAfter3 = await publicClient.getBalance({
        address: grantee.account.address,
      });
      const expectedPayout3 = parseEther("291"); // 300 - 3% = 291
      assert.equal(
        granteeBalanceAfter3 - granteeBalanceBefore3,
        expectedPayout3
      );

      // Step 8: Verify grant is completed
      const finalGrant = await milestone.read.getGrant([grantId]);
      assert.equal(Number(finalGrant[7]), 1); // GrantStatus.COMPLETED
      assert(finalGrant[9] > 0n); // completedAt should be set (index 9)

      // Verify all funds were released (total: 300 + 400 + 300 = 1000)
      const finalTokenAmounts = await milestone.read.getGrantTokenAmounts([
        grantId,
        celoToken.address,
      ]);
      assert.equal(finalTokenAmounts[1], grantAmount); // releasedAmount = totalAmount
      assert.equal(finalTokenAmounts[2], 0n); // escrowedAmount = 0

      // Verify total payout to grantee (291 + 388 + 291 = 970, after 3% fees on each)
      // Note: Actual payout may be slightly less due to gas costs for milestone submissions
      const totalPayout = granteeBalanceAfter3 - granteeBalanceBefore1;
      const expectedTotalPayout = parseEther("970"); // 291 + 388 + 291
      const gasTolerance = parseEther("0.001"); // Allow 0.001 ETH tolerance for gas costs
      assert(
        totalPayout >= expectedTotalPayout - gasTolerance && 
        totalPayout <= expectedTotalPayout,
        `Total payout ${totalPayout} should be approximately ${expectedTotalPayout} (within ${gasTolerance} for gas costs)`
      );

      // Verify all milestones are in PAID status
      const allMilestones = await milestone.read.getGrantMilestones([grantId]);
      assert.equal(allMilestones.length, 3);
      for (const mId of allMilestones) {
        const mData = await milestone.read.getMilestone([mId]);
        assert.equal(Number(mData[6]), 4); // All should be PAID
      }
    });
  });

  describe("Finance Management", function () {
    it("Should add funds to an existing grant", async function () {
      const initialAmount = parseEther("100");
      await milestone.write.createGrant(
        [
          projectId,
          0n,
          grantee.account.address,
          [celoToken.address],
          [initialAmount],
          3n,
          86400n,
          0n, // milestoneDeadline
        ],
        {
          account: deployer.account,
          value: initialAmount,
        }
      );
      const grantId = (await milestone.read.getGrantCount()) - 1n;

      // Add more funds
      const additionalAmount = parseEther("50");
      const tx = await milestone.write.addFundsToGrant(
        [grantId, [celoToken.address], [additionalAmount]],
        {
          account: deployer.account,
          value: additionalAmount,
        }
      );

      await viem.assertions.emit(tx, milestone, "FundsAddedToGrant");

      const tokenAmounts = await milestone.read.getGrantTokenAmounts([
        grantId,
        celoToken.address,
      ]);
      assert.equal(tokenAmounts[0], initialAmount + additionalAmount); // totalAmount
      assert.equal(tokenAmounts[2], initialAmount + additionalAmount); // escrowedAmount
    });

    it("Should withdraw funds from grant before milestones are submitted", async function () {
      const grantAmount = parseEther("100");
      await milestone.write.createGrant(
        [
          projectId,
          0n,
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          3n,
          86400n,
          0n, // milestoneDeadline
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );
      const grantId = (await milestone.read.getGrantCount()) - 1n;

      const withdrawAmount = parseEther("30");
      const deployerBalanceBefore = await publicClient.getBalance({
        address: deployer.account.address,
      });

      const tx = await milestone.write.withdrawFundsFromGrant(
        [grantId, celoToken.address, withdrawAmount, deployer.account.address],
        { account: deployer.account }
      );

      await viem.assertions.emit(tx, milestone, "FundsWithdrawnFromGrant");

      const tokenAmounts = await milestone.read.getGrantTokenAmounts([
        grantId,
        celoToken.address,
      ]);
      assert.equal(tokenAmounts[0], grantAmount - withdrawAmount); // totalAmount
      assert.equal(tokenAmounts[2], grantAmount - withdrawAmount); // escrowedAmount

      const deployerBalanceAfter = await publicClient.getBalance({
        address: deployer.account.address,
      });
      assert(deployerBalanceAfter > deployerBalanceBefore);
    });

    it("Should reject withdrawal after milestones are submitted", async function () {
      const grantAmount = parseEther("100");
      await milestone.write.createGrant(
        [
          projectId,
          0n,
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          3n,
          86400n,
          0n, // milestoneDeadline
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );
      const grantId = (await milestone.read.getGrantCount()) - 1n;

      // Submit a milestone
      await milestone.write.submitMilestone(
        [grantId, "Test", "Desc", "Hash", 30n],
        { account: grantee.account }
      );

      // Try to withdraw - should fail
      await assert.rejects(
        milestone.write.withdrawFundsFromGrant(
          [
            grantId,
            celoToken.address,
            parseEther("10"),
            deployer.account.address,
          ],
          { account: deployer.account }
        ),
        /Cannot withdraw funds after milestones are submitted/
      );
    });
  });

  describe("Time-Based Penalties", function () {
    it("Should apply 5% penalty for late milestone submission", async function () {
      const grantAmount = parseEther("1000");
      const siteFee = 3n;
      const reviewTimeLock = 86400n;
      const milestoneDeadline = BigInt(Math.floor(Date.now() / 1000)) + 3600n; // 1 hour from now

      await milestone.write.createGrant(
        [
          projectId,
          0n,
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          siteFee,
          reviewTimeLock,
          milestoneDeadline,
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );
      const grantId = (await milestone.read.getGrantCount()) - 1n;

      // Advance time past deadline but within 1 month
      const testClient = await viem.getTestClient();
      await testClient.setNextBlockTimestamp({ timestamp: milestoneDeadline + 86400n }); // 1 day after deadline
      await testClient.mine({ blocks: 1 });

      // Submit milestone late
      const tx = await milestone.write.submitMilestone(
        [grantId, "Late Milestone", "Description", "Hash", 50n],
        { account: grantee.account }
      );

      await viem.assertions.emit(tx, milestone, "MilestonePenaltyApplied");

      const milestoneId = (await milestone.read.getMilestoneCount()) - 1n;
      const milestoneData = await milestone.read.getMilestone([milestoneId]);
      assert.equal(Number(milestoneData[15]), 5); // penaltyPercentage = 5%

      // Check payout is reduced by 5% (50% of 1000 = 500, minus 5% = 475)
      const payout = await milestone.read.getMilestonePayout([
        milestoneId,
        celoToken.address,
      ]);
      assert.equal(payout, parseEther("475")); // 500 - 5% = 475
    });

    it("Should lock milestone if submitted more than 1 month after deadline", async function () {
      const grantAmount = parseEther("1000");
      const siteFee = 3n;
      const reviewTimeLock = 86400n;
      const milestoneDeadline = BigInt(Math.floor(Date.now() / 1000)) + 3600n; // 1 hour from now

      await milestone.write.createGrant(
        [
          projectId,
          0n,
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          siteFee,
          reviewTimeLock,
          milestoneDeadline,
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );
      const grantId = (await milestone.read.getGrantCount()) - 1n;

      // Advance time more than 1 month past deadline
      const testClient = await viem.getTestClient();
      const oneMonth = 30n * 24n * 3600n; // 30 days in seconds
      await testClient.setNextBlockTimestamp({
        timestamp: milestoneDeadline + oneMonth + 86400n, // More than 1 month after deadline
      });
      await testClient.mine({ blocks: 1 });

      // Try to submit milestone - should fail (locked)
      await assert.rejects(
        milestone.write.submitMilestone(
          [grantId, "Too Late", "Description", "Hash", 50n],
          { account: grantee.account }
        ),
        /Milestone submission deadline has passed and milestone is locked/
      );
    });

    it("Should not apply penalty if submitted before deadline", async function () {
      const grantAmount = parseEther("1000");
      const siteFee = 3n;
      const reviewTimeLock = 86400n;
      const milestoneDeadline = BigInt(Math.floor(Date.now() / 1000)) + 86400n; // 1 day from now

      await milestone.write.createGrant(
        [
          projectId,
          0n,
          grantee.account.address,
          [celoToken.address],
          [grantAmount],
          siteFee,
          reviewTimeLock,
          milestoneDeadline,
        ],
        {
          account: deployer.account,
          value: grantAmount,
        }
      );
      const grantId = (await milestone.read.getGrantCount()) - 1n;

      // Submit milestone before deadline
      const tx = await milestone.write.submitMilestone(
        [grantId, "On Time", "Description", "Hash", 50n],
        { account: grantee.account }
      );

      const milestoneId = (await milestone.read.getMilestoneCount()) - 1n;
      const milestoneData = await milestone.read.getMilestone([milestoneId]);
      assert.equal(Number(milestoneData[15]), 0); // penaltyPercentage = 0%

      // Check payout is full amount (50% of 1000 = 500)
      const payout = await milestone.read.getMilestonePayout([
        milestoneId,
        celoToken.address,
      ]);
      assert.equal(payout, parseEther("500")); // No penalty
    });
  });
});

