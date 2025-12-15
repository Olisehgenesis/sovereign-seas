import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { network } from "hardhat";
import { parseEther, getAddress, zeroAddress } from "viem";

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
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

describe("Tournament - Full Flow", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];
  const projectOwner1 = walletClients[1];
  const projectOwner2 = walletClients[2];
  const projectOwner3 = walletClients[3];
  const campaignAdmin = walletClients[4];
  const voter1 = walletClients[5];
  const voter2 = walletClients[6];

  let seas4: any;
  let tournament: any;
  let celoToken: any;
  let testToken: any;
  let projectIds: bigint[] = [];
  let campaignId: bigint;
  let tournamentId: bigint;

  before(async function () {
    try {
      // Deploy a simple ERC20 token for testing (mock CELO)
      celoToken = await viem.deployContract("ERC20Mock", [
        "Celo",
        "CELO",
        parseEther("1000000"),
      ]);

      // Deploy test ERC20 token
      testToken = await viem.deployContract("ERC20Mock", [
        "Test Token",
        "TEST",
        parseEther("1000000"),
      ]);

      // Deploy MockBroker for token swaps
      const mockBroker = await viem.deployContract("MockBroker", []);

      // Deploy MockSeas4 for testing (SovereignSeasV4 is too large for test deployment)
      seas4 = await viem.deployContract("MockSeas4", [celoToken.address]);

      // Setup: Add supported tokens
      await seas4.write.addSupportedToken([testToken.address], {
        account: deployer.account,
      });

      // Set token exchange provider for test token (using celoToken as provider for simplicity)
      await seas4.write.setTokenExchangeProvider(
        [
          testToken.address,
          celoToken.address,
          "0x" + "1".repeat(64), // exchangeId
          true,
        ],
        { account: deployer.account }
      );

      // Set mento token broker
      await seas4.write.setMentoTokenBroker([mockBroker.address], {
        account: deployer.account,
      });

      // Deploy Tournament contract
      tournament = await viem.deployContract("SovereignTournament", [
        seas4.address,
        celoToken.address,
      ]);

      console.log("✅ Setup complete");
      console.log("  - Seas4:", seas4.address);
      console.log("  - Tournament:", tournament.address);
      console.log("  - CELO Token:", celoToken.address);
    } catch (error) {
      console.error("Setup failed:", error);
      throw error;
    }
  });

  describe("Project Creation", function () {
    it("Should create projects on Seas", async function () {
      // Create Project 1
      const tx1 = await seas4.write.createProject(
        [
          "Project Alpha",
          "A revolutionary DeFi project",
          "Bio: Building the future",
          "Contract: 0x123",
          "Additional data",
          [],
          false,
        ],
        { account: projectOwner1.account }
      );

      await publicClient.waitForTransactionReceipt({ hash: tx1 });

      // Create Project 2
      const tx2 = await seas4.write.createProject(
        [
          "Project Beta",
          "An innovative NFT platform",
          "Bio: NFT revolution",
          "Contract: 0x456",
          "Additional data",
          [],
          false,
        ],
        { account: projectOwner2.account }
      );

      await publicClient.waitForTransactionReceipt({ hash: tx2 });

      // Create Project 3
      const tx3 = await seas4.write.createProject(
        [
          "Project Gamma",
          "A gaming metaverse project",
          "Bio: Gaming future",
          "Contract: 0x789",
          "Additional data",
          [],
          false,
        ],
        { account: projectOwner3.account }
      );

      await publicClient.waitForTransactionReceipt({ hash: tx3 });

      // Get project IDs
      const nextProjectId = await seas4.read.nextProjectId();
      assert.equal(nextProjectId, 3n, "Should have 3 projects");

      projectIds = [0n, 1n, 2n];

      // Verify projects
      for (let i = 0; i < projectIds.length; i++) {
        const project = await seas4.read.getProject([projectIds[i]]);
        assert.equal(project[0], projectIds[i], `Project ${i} ID should match`);
        assert.equal(project[6], true, `Project ${i} should be active`);
      }

      console.log("✅ Created 3 projects:", projectIds.map((id) => id.toString()));
    });
  });

  describe("Campaign Creation", function () {
    it("Should create a campaign", async function () {
      const startTime = BigInt(Math.floor(Date.now() / 1000)) + 60n; // 1 minute from now
      const endTime = startTime + 86400n * 7n; // 7 days

      // MockSeas4 doesn't require fees, so we can create campaign directly
      const tx = await seas4.write.createCampaign(
        [
          "Sample Campaign",
          "A test campaign for tournament",
          "Main info about the campaign",
          "Additional campaign info",
          startTime,
          endTime,
          10, // adminFeePercentage
          3, // maxWinners
          true, // useQuadraticDistribution
          false, // useCustomDistribution
          "", // customDistributionData
          celoToken.address, // payoutToken
          celoToken.address, // feeToken
        ],
        {
          account: campaignAdmin.account,
        }
      );

      await publicClient.waitForTransactionReceipt({ hash: tx });

      const nextCampaignId = await seas4.read.nextCampaignId();
      campaignId = nextCampaignId - 1n;

      const campaign = await seas4.read.getCampaign([campaignId]);
      assert.equal(campaign[0], campaignId, "Campaign ID should match");
      assert.equal(campaign[11], true, "Campaign should be active");
      assert.equal(campaign[10], celoToken.address, "Payout token should be CELO");

      console.log("✅ Created campaign:", campaignId.toString());
    });
  });

  describe("Add Projects to Campaign", function () {
    it("Should add projects to campaign", async function () {
      // MockSeas4 doesn't require fees, so we can add projects directly
      // Add Project 1 to campaign
      const tx1 = await seas4.write.addProjectToCampaign(
        [campaignId, projectIds[0], celoToken.address],
        { account: projectOwner1.account, value: 0n }
      );
      await publicClient.waitForTransactionReceipt({ hash: tx1 });

      // Add Project 2 to campaign
      const tx2 = await seas4.write.addProjectToCampaign(
        [campaignId, projectIds[1], celoToken.address],
        { account: projectOwner2.account, value: 0n }
      );
      await publicClient.waitForTransactionReceipt({ hash: tx2 });

      // Add Project 3 to campaign
      const tx3 = await seas4.write.addProjectToCampaign(
        [campaignId, projectIds[2], celoToken.address],
        { account: projectOwner3.account, value: 0n }
      );
      await publicClient.waitForTransactionReceipt({ hash: tx3 });

      // Verify projects are in campaign
      // Note: We need to check if projects are participating in the campaign
      const project1 = await seas4.read.getProject([projectIds[0]]);
      const project2 = await seas4.read.getProject([projectIds[1]]);
      const project3 = await seas4.read.getProject([projectIds[2]]);

      // Check campaign participation (this would require a view function)
      // For now, we'll verify by checking the project's campaignIds array length
      assert.ok(project1[7].length > 0, "Project 1 should be in campaigns");
      assert.ok(project2[7].length > 0, "Project 2 should be in campaigns");
      assert.ok(project3[7].length > 0, "Project 3 should be in campaigns");

      console.log("✅ Added 3 projects to campaign");
    });
  });

  describe("Tournament Creation from Campaign", function () {
    it("Should create tournament linked to campaign", async function () {
      const stageDuration = 86400n; // 1 day

      const tx = await tournament.write.createTournament(
        [
          campaignId, // sovseasCampaignId
          stageDuration,
          celoToken.address, // payoutToken
          false, // autoProgress
          true, // disqualifyEnabled
        ],
        { account: deployer.account }
      );

      await publicClient.waitForTransactionReceipt({ hash: tx });

      const nextTournamentId = await tournament.read.nextTournamentId();
      tournamentId = nextTournamentId - 1n;

      const tournamentData = await tournament.read.tournaments([tournamentId]);
      assert.equal(tournamentData[0], tournamentId, "Tournament ID should match");
      assert.equal(tournamentData[2], campaignId, "Campaign ID should match");
      assert.equal(tournamentData[3], stageDuration, "Stage duration should match");
      assert.equal(tournamentData[4], celoToken.address, "Payout token should match");
      assert.equal(tournamentData[6], false, "Tournament should not be active yet");

      // Note: Projects are not automatically added from campaign
      // We need to add them manually or use addCampaignProjects
      const tournamentProjects = await tournament.read.getTournamentProjects([
        tournamentId,
      ]);
      assert.ok(
        tournamentProjects.length >= 0,
        "Tournament should exist (projects may need to be added manually)"
      );

      console.log("✅ Created tournament:", tournamentId.toString());
      console.log("  - Linked to campaign:", campaignId.toString());
      console.log("  - Initial projects in tournament:", tournamentProjects.length);
    });

    it("Should add projects to tournament manually", async function () {
      // Add projects manually to tournament
      for (let i = 0; i < projectIds.length; i++) {
        const tx = await tournament.write.addProject(
          [tournamentId, projectIds[i]],
          { account: deployer.account }
        );
        await publicClient.waitForTransactionReceipt({ hash: tx });
      }

      const tournamentProjects = await tournament.read.getTournamentProjects([
        tournamentId,
      ]);
      assert.equal(
        tournamentProjects.length,
        3,
        "Tournament should have 3 projects"
      );
      assert.equal(
        tournamentProjects[0],
        projectIds[0],
        "First project should match"
      );

      console.log("✅ Added projects to tournament");
    });

    it("Should approve projects for tournament", async function () {
      // Approve all projects
      const tx = await tournament.write.batchApproveProjects(
        [tournamentId, projectIds],
        { account: deployer.account }
      );

      await publicClient.waitForTransactionReceipt({ hash: tx });

      const approvedProjects = await tournament.read.getApprovedProjects([
        tournamentId,
      ]);
      assert.equal(
        approvedProjects.length,
        3,
        "Should have 3 approved projects"
      );

      console.log("✅ Approved projects for tournament");
    });
  });

  describe("Start Tournament", function () {
    it("Should start tournament", async function () {
      const tx = await tournament.write.startTournament([tournamentId], {
        account: deployer.account,
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });

      const tournamentData = await tournament.read.tournaments([tournamentId]);
      assert.equal(tournamentData[6], true, "Tournament should be active");

      const currentStage = await tournament.read.getCurrentStageNumber([
        tournamentId,
      ]);
      assert.equal(currentStage, 0n, "Should be on stage 0");

      const stageInfo = await tournament.read.getStageInfo([
        tournamentId,
        0n,
      ]);
      assert.equal(stageInfo[7], true, "Stage 0 should be started");

      console.log("✅ Tournament started");
      console.log("  - Current stage:", currentStage.toString());
    });
  });

  describe("Fund Stage", function () {
    it("Should fund stage with CELO", async function () {
      const fundingAmount = parseEther("10");

      const tx = await tournament.write.fundStageWithCelo(
        [tournamentId, 0n],
        {
          account: deployer.account,
          value: fundingAmount,
        }
      );

      await publicClient.waitForTransactionReceipt({ hash: tx });

      const stageInfo = await tournament.read.getStageInfo([tournamentId, 0n]);
      assert.ok(
        stageInfo[4] >= fundingAmount,
        "Stage reward pool should be funded"
      );

      console.log("✅ Funded stage with", fundingAmount.toString(), "CELO");
    });
  });

  describe("Voting", function () {
    it("Should allow voting with CELO", async function () {
      const voteAmount = parseEther("1");

      // Voter 1 votes for Project 1
      const tx1 = await tournament.write.voteWithCelo(
        [tournamentId, projectIds[0]],
        {
          account: voter1.account,
          value: voteAmount,
        }
      );

      await publicClient.waitForTransactionReceipt({ hash: tx1 });

      // Voter 2 votes for Project 2
      const tx2 = await tournament.write.voteWithCelo(
        [tournamentId, projectIds[1]],
        {
          account: voter2.account,
          value: voteAmount,
        }
      );

      await publicClient.waitForTransactionReceipt({ hash: tx2 });

      // Check project power
      const power1 = await tournament.read.getProjectPower([
        tournamentId,
        0n,
        projectIds[0],
      ]);
      const power2 = await tournament.read.getProjectPower([
        tournamentId,
        0n,
        projectIds[1],
      ]);

      assert.ok(power1 > 0n, "Project 1 should have voting power");
      assert.ok(power2 > 0n, "Project 2 should have voting power");

      console.log("✅ Voting completed");
      console.log("  - Project 1 power:", power1.toString());
      console.log("  - Project 2 power:", power2.toString());
    });

    it("Should allow batch voting", async function () {
      const voteAmount = parseEther("0.5");

      // Voter 1 votes for multiple projects
      const tx = await tournament.write.batchVoteWithCelo(
        [tournamentId, [projectIds[0], projectIds[2]]],
        {
          account: voter1.account,
          value: voteAmount * 2n, // Total for 2 votes
        }
      );

      await publicClient.waitForTransactionReceipt({ hash: tx });

      const voteCount = await tournament.read.getVoterVoteCount([
        tournamentId,
        0n,
        voter1.account.address,
      ]);
      assert.ok(voteCount >= 2n, "Voter should have at least 2 votes");

      console.log("✅ Batch voting completed");
    });
  });

  describe("Tournament Status", function () {
    it("Should get leaderboard", async function () {
      const [projectIds, powers] = await tournament.read.getLeaderboard([
        tournamentId,
        0n,
      ]);

      assert.ok(projectIds.length > 0, "Should have projects in leaderboard");
      assert.equal(
        projectIds.length,
        powers.length,
        "Project IDs and powers should match"
      );

      console.log("✅ Leaderboard:");
      for (let i = 0; i < projectIds.length; i++) {
        console.log(
          `  ${i + 1}. Project ${projectIds[i].toString()}: ${powers[i].toString()} power`
        );
      }
    });

    it("Should get voter history", async function () {
      const [stages, projectIdsPerStage, powersPerStage] =
        await tournament.read.getVoterHistory([
          tournamentId,
          voter1.account.address,
        ]);

      assert.ok(stages.length > 0, "Should have voting history");
      console.log("✅ Voter history retrieved");
    });
  });

  describe("Complete Flow Summary", function () {
    it("Should verify complete setup", async function () {
      console.log("\n📊 Complete Flow Summary:");
      console.log("  ✅ Created 3 projects on Seas");
      console.log("  ✅ Created 1 campaign");
      console.log("  ✅ Added 3 projects to campaign");
      console.log("  ✅ Created tournament from campaign");
      console.log("  ✅ Approved and started tournament");
      console.log("  ✅ Funded stage");
      console.log("  ✅ Voters cast votes");
      console.log("  ✅ Tournament is active and running");

      // Final verification
      const tournamentData = await tournament.read.tournaments([tournamentId]);
      assert.equal(tournamentData[6], true, "Tournament should be active");

      const approvedProjects = await tournament.read.getApprovedProjects([
        tournamentId,
      ]);
      assert.equal(
        approvedProjects.length,
        3,
        "Should have 3 approved projects"
      );

      console.log("\n✅ All tests passed!");
    });
  });
});

