// tests/sovereign-seas-test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SovereignSeas Contract", function () {
  // Test variables
  let SovereignSeas: any;
  let sovereignSeas: Contract;
  let MockCELO: any;
  let mockCELO: Contract;
  let owner: SignerWithAddress;
  let admin: SignerWithAddress;
  let projectOwner1: SignerWithAddress;
  let projectOwner2: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;
  let accounts: SignerWithAddress[];
  
  // Campaign and project parameters
  const campaignName = "Ocean Conservation";
  const campaignDescription = "Fund projects that help protect our oceans";
  const projectName1 = "Coral Reef Restoration";
  const projectDescription1 = "Restore damaged coral reefs in the Pacific";
  const projectName2 = "Ocean Cleanup";
  const projectDescription2 = "Remove plastic from the Atlantic Ocean";
  
  // Constants for time calculations
  const oneDay = 24 * 60 * 60;
  const oneWeek = 7 * oneDay;

  before(async function () {
    // Get signers from Hardhat
    [owner, admin, projectOwner1, projectOwner2, voter1, voter2, voter3, ...accounts] = await ethers.getSigners();
    
    console.log("Test wallets initialized:");
    console.log(`Owner: ${owner.address}`);
    console.log(`Admin: ${admin.address}`);
    console.log(`Project Owner 1: ${projectOwner1.address}`);
    console.log(`Project Owner 2: ${projectOwner2.address}`);
    console.log(`Voter 1: ${voter1.address}`);
    console.log(`Voter 2: ${voter2.address}`);
    console.log(`Voter 3: ${voter3.address}`);
  });

  beforeEach(async function () {
    // Deploy mock CELO token
    MockCELO = await ethers.getContractFactory("MockCELO");
    mockCELO = await MockCELO.connect(owner).deploy("Mock CELO", "mCELO");
    console.log(`Mock CELO deployed at: ${await mockCELO.getAddress()}`);
    
    // Mint tokens to all accounts for testing
    for (const account of [admin, projectOwner1, projectOwner2, voter1, voter2, voter3]) {
      await mockCELO.connect(owner).mint(account.address, ethers.parseEther("1000"));
      console.log(`Minted 1000 CELO to ${account.address}`);
    }
    
    // Deploy SovereignSeas contract
    SovereignSeas = await ethers.getContractFactory("SovereignSeas");
    sovereignSeas = await SovereignSeas.connect(owner).deploy(await mockCELO.getAddress());
    console.log(`SovereignSeas deployed at: ${await sovereignSeas.getAddress()}`);
  });

  it("Should successfully complete a full campaign lifecycle with quadratic distribution", async function () {
    console.log("\n--- STARTING FULL CAMPAIGN LIFECYCLE TEST ---");
    
    // 1. Create a campaign
    console.log("\n1. Creating campaign");
    const startTime = Math.floor(Date.now() / 1000) + oneDay; // Start tomorrow
    const endTime = startTime + oneWeek; // End one week after start
    const adminFeePercentage = 5; // 5% admin fee
    const voteMultiplier = 3; // 3 votes per CELO
    const maxWinners = 2; // Top 2 projects win
    const useQuadraticDistribution = true; // Use quadratic distribution
    
    await sovereignSeas.connect(admin).createCampaign(
      campaignName,
      campaignDescription,
      startTime,
      endTime,
      adminFeePercentage,
      voteMultiplier,
      maxWinners,
      useQuadraticDistribution
    );
    
    const campaignCount = await sovereignSeas.getCampaignCount();
    expect(campaignCount).to.equal(1);
    console.log(`Campaign created with ID: ${campaignCount.sub(1)}`);
    
    const campaign = await sovereignSeas.getCampaign(0);
    expect(campaign.name).to.equal(campaignName);
    expect(campaign.admin).to.equal(admin.address);
    expect(campaign.maxWinners).to.equal(maxWinners);
    expect(campaign.useQuadraticDistribution).to.equal(useQuadraticDistribution);
    
    // 2. Submit projects
    console.log("\n2. Submitting projects");
    const githubLink1 = "https://github.com/project1/repo";
    const socialLink1 = "https://twitter.com/project1";
    const testingLink1 = "https://demo.project1.com";
    
    const githubLink2 = "https://github.com/project2/repo";
    const socialLink2 = "https://twitter.com/project2";
    const testingLink2 = "https://demo.project2.com";
    
    await sovereignSeas.connect(projectOwner1).submitProject(0, projectName1, projectDescription1, githubLink1, socialLink1, testingLink1);
    await sovereignSeas.connect(projectOwner2).submitProject(0, projectName2, projectDescription2, githubLink2, socialLink2, testingLink2);
    
    const projectCount = await sovereignSeas.getProjectCount(0);
    expect(projectCount).to.equal(2);
    console.log(`Projects submitted: ${projectCount}`);
    
    // 3. Approve projects
    console.log("\n3. Approving projects");
    await sovereignSeas.connect(admin).approveProject(0, 0);
    await sovereignSeas.connect(admin).approveProject(0, 1);
    
    const project1 = await sovereignSeas.getProject(0, 0);
    const project2 = await sovereignSeas.getProject(0, 1);
    expect(project1.approved).to.be.true;
    expect(project2.approved).to.be.true;
    
    // Verify links were saved correctly
    expect(project1.githubLink).to.equal(githubLink1);
    expect(project1.socialLink).to.equal(socialLink1);
    expect(project1.testingLink).to.equal(testingLink1);
    
    expect(project2.githubLink).to.equal(githubLink2);
    expect(project2.socialLink).to.equal(socialLink2);
    expect(project2.testingLink).to.equal(testingLink2);
    
    console.log("Both projects approved with links verified");
    
    // 4. Time travel to start of campaign
    console.log("\n4. Advancing time to campaign start");
    await ethers.provider.send("evm_increaseTime", [oneDay + 60]); // Add a minute for safety
    await ethers.provider.send("evm_mine");
    
    // 5. Approve token spending
    console.log("\n5. Approving token spending by voters");
    await mockCELO.connect(voter1).approve(await sovereignSeas.getAddress(), ethers.parseEther("100"));
    await mockCELO.connect(voter2).approve(await sovereignSeas.getAddress(), ethers.parseEther("150"));
    await mockCELO.connect(voter3).approve(await sovereignSeas.getAddress(), ethers.parseEther("200"));
    console.log("Token spending approved");
    
    // 6. Cast votes
    console.log("\n6. Casting votes");
    // Voter 1: 50 CELO to project 1
    await sovereignSeas.connect(voter1).vote(0, 0, ethers.parseEther("50"));
    console.log(`Voter 1 voted 50 CELO (${50 * voteMultiplier} votes) for Project 1`);
    
    // Voter 2: 100 CELO to project 1 and 50 CELO to project 2
    await sovereignSeas.connect(voter2).vote(0, 0, ethers.parseEther("100"));
    await sovereignSeas.connect(voter2).vote(0, 1, ethers.parseEther("50"));
    console.log(`Voter 2 voted 100 CELO (${100 * voteMultiplier} votes) for Project 1`);
    console.log(`Voter 2 voted 50 CELO (${50 * voteMultiplier} votes) for Project 2`);
    
    // Voter 3: 80 CELO to project 2
    await sovereignSeas.connect(voter3).vote(0, 1, ethers.parseEther("80"));
    console.log(`Voter 3 voted 80 CELO (${80 * voteMultiplier} votes) for Project 2`);
    
    // Check vote counts
    const project1Updated = await sovereignSeas.getProject(0, 0);
    const project2Updated = await sovereignSeas.getProject(0, 1);
    
    console.log(`\nProject 1 vote count: ${project1Updated.voteCount}`);
    console.log(`Project 2 vote count: ${project2Updated.voteCount}`);
    
    // Verify vote counts (project1: 150 CELO * 3 = 450 votes, project2: 130 CELO * 3 = 390 votes)
    expect(project1Updated.voteCount).to.equal(BigInt(450) * BigInt(10**18));
    expect(project2Updated.voteCount).to.equal(BigInt(390) * BigInt(10**18));
    
    // 7. Check campaign stats
    console.log("\n7. Checking campaign stats");
    const campaignUpdated = await sovereignSeas.getCampaign(0);
    const totalFundsCELO = ethers.formatEther(campaignUpdated.totalFunds);
    console.log(`Total funds in campaign: ${totalFundsCELO} CELO`);
    
    // 8. Time travel to end of campaign
    console.log("\n8. Advancing time to campaign end");
    await ethers.provider.send("evm_increaseTime", [oneWeek]);
    await ethers.provider.send("evm_mine");
    
    // 9. Distribute funds
    console.log("\n9. Distributing funds");
    
    // Get balances before distribution
    const ownerBalanceBefore = await mockCELO.balanceOf(owner.address);
    const adminBalanceBefore = await mockCELO.balanceOf(admin.address);
    const projectOwner1BalanceBefore = await mockCELO.balanceOf(projectOwner1.address);
    const projectOwner2BalanceBefore = await mockCELO.balanceOf(projectOwner2.address);
    
    // Distribute funds
    await sovereignSeas.connect(admin).distributeFunds(0);
    console.log("Funds distributed");
    
    // Get balances after distribution
    const ownerBalanceAfter = await mockCELO.balanceOf(owner.address);
    const adminBalanceAfter = await mockCELO.balanceOf(admin.address);
    const projectOwner1BalanceAfter = await mockCELO.balanceOf(projectOwner1.address);
    const projectOwner2BalanceAfter = await mockCELO.balanceOf(projectOwner2.address);
    
    // Calculate distributions
    const totalFunds = ethers.parseEther("280"); // 50 + 100 + 50 + 80 = 280 CELO
    const platformFee = totalFunds * BigInt(15) / BigInt(100); // 15% platform fee
    const adminFee = totalFunds * BigInt(adminFeePercentage) / BigInt(100); // 5% admin fee
    const remainingFunds = totalFunds - platformFee - adminFee;
    
    // Calculate quadratic distribution
    // Project 1 has 450 votes, sqrt(450) ≈ 21.21
    // Project 2 has 390 votes, sqrt(390) ≈ 19.75
    // Total sqrt weights: 21.21 + 19.75 = 40.96
    // Project 1 share: 21.21/40.96 ≈ 0.518 (51.8%)
    // Project 2 share: 19.75/40.96 ≈ 0.482 (48.2%)
    
    console.log("\n10. Verifying distribution");
    
    // Platform fee
    const platformFeeReceived = ownerBalanceAfter - ownerBalanceBefore;
    console.log(`Platform fee received: ${ethers.formatEther(platformFeeReceived)} CELO`);
    expect(platformFeeReceived).to.be.closeTo(platformFee, ethers.parseEther("0.01"));
    
    // Admin fee
    const adminFeeReceived = adminBalanceAfter - adminBalanceBefore;
    console.log(`Admin fee received: ${ethers.formatEther(adminFeeReceived)} CELO`);
    expect(adminFeeReceived).to.be.closeTo(adminFee, ethers.parseEther("0.01"));
    
    // Project 1 funds (should be approximately 51.8% of remaining funds)
    const project1FundsReceived = projectOwner1BalanceAfter - projectOwner1BalanceBefore;
    console.log(`Project 1 funds received: ${ethers.formatEther(project1FundsReceived)} CELO`);
    
    // Project 2 funds (should be approximately 48.2% of remaining funds)
    const project2FundsReceived = projectOwner2BalanceAfter - projectOwner2BalanceBefore;
    console.log(`Project 2 funds received: ${ethers.formatEther(project2FundsReceived)} CELO`);
    
    // Verify the distribution is close to expected quadratic distribution
    const project1ExpectedShare = remainingFunds * BigInt(518) / BigInt(1000); // 51.8%
    const project2ExpectedShare = remainingFunds * BigInt(482) / BigInt(1000); // 48.2%
    
    expect(project1FundsReceived).to.be.closeTo(project1ExpectedShare, ethers.utils.parseEther("0.5"));
    expect(project2FundsReceived).to.be.closeTo(project2ExpectedShare, ethers.utils.parseEther("0.5"));
    
    // 11. Verify campaign is now inactive
    const campaignFinal = await sovereignSeas.getCampaign(0);
    expect(campaignFinal.active).to.be.false;
    console.log("\nCampaign is now inactive");
    
    console.log("\n--- FULL CAMPAIGN LIFECYCLE TEST COMPLETED SUCCESSFULLY ---");
  });

  it("Should successfully complete a campaign with linear distribution and more winners", async function () {
    console.log("\n--- STARTING LINEAR DISTRIBUTION CAMPAIGN TEST ---");
    
    // 1. Create a campaign with linear distribution and 3 max winners
    console.log("\n1. Creating campaign with linear distribution");
    const startTime = Math.floor(Date.now() / 1000) + oneDay;
    const endTime = startTime + oneWeek;
    const adminFeePercentage = 8; // 8% admin fee
    const voteMultiplier = 2; // 2 votes per CELO
    const maxWinners = 3; // Top 3 projects win (though we only have 2 in this test)
    const useQuadraticDistribution = false; // Use linear distribution
    
    await sovereignSeas.connect(admin).createCampaign(
      "Ocean Awareness",
      "Raise awareness about ocean pollution",
      startTime,
      endTime,
      adminFeePercentage,
      voteMultiplier,
      maxWinners,
      useQuadraticDistribution
    );
    
    const campaignCount = await sovereignSeas.getCampaignCount();
    expect(campaignCount).to.equal(2); // This is the second campaign
    console.log(`Campaign created with ID: ${campaignCount.sub(1)}`);
    
    // 2-8. Same steps as before (abbreviated for brevity)
    // Test with empty optional fields
    await sovereignSeas.connect(projectOwner1).submitProject(1, "Ocean Documentary", "Educational film about ocean conservation", "", "https://instagram.com/oceandoc", "");
    await sovereignSeas.connect(projectOwner2).submitProject(1, "Beach Cleanup Initiative", "Organize beach cleanups worldwide", "https://github.com/beachcleanup", "", "");
    
    await sovereignSeas.connect(admin).approveProject(1, 0);
    await sovereignSeas.connect(admin).approveProject(1, 1);
    
    await ethers.provider.send("evm_increaseTime", [oneDay + 60]);
    await ethers.provider.send("evm_mine");
    
    await mockCELO.connect(voter1).approve(sovereignSeas.address, ethers.utils.parseEther("200"));
    await mockCELO.connect(voter2).approve(sovereignSeas.address, ethers.utils.parseEther("200"));
    await mockCELO.connect(voter3).approve(sovereignSeas.address, ethers.utils.parseEther("200"));
    
    // Different voting pattern
    await sovereignSeas.connect(voter1).vote(1, 0, ethers.utils.parseEther("75"));
    await sovereignSeas.connect(voter2).vote(1, 0, ethers.utils.parseEther("25"));
    await sovereignSeas.connect(voter2).vote(1, 1, ethers.utils.parseEther("75"));
    await sovereignSeas.connect(voter3).vote(1, 1, ethers.utils.parseEther("125"));
    
    console.log(`Votes cast - Project 1: 100 CELO (${100 * voteMultiplier} votes), Project 2: 200 CELO (${200 * voteMultiplier} votes)`);
    
    await ethers.provider.send("evm_increaseTime", [oneWeek]);
    await ethers.provider.send("evm_mine");
    
    // 9. Distribute funds
    console.log("\n9. Distributing funds (linear distribution)");
    
    // Get balances before distribution
    const ownerBalanceBefore = await mockCELO.balanceOf(owner.address);
    const adminBalanceBefore = await mockCELO.balanceOf(admin.address);
    const projectOwner1BalanceBefore = await mockCELO.balanceOf(projectOwner1.address);
    const projectOwner2BalanceBefore = await mockCELO.balanceOf(projectOwner2.address);
    
    // Distribute funds
    await sovereignSeas.connect(admin).distributeFunds(1);
    console.log("Funds distributed");
    
    // Get balances after distribution
    const ownerBalanceAfter = await mockCELO.balanceOf(owner.address);
    const adminBalanceAfter = await mockCELO.balanceOf(admin.address);
    const projectOwner1BalanceAfter = await mockCELO.balanceOf(projectOwner1.address);
    const projectOwner2BalanceAfter = await mockCELO.balanceOf(projectOwner2.address);
    
    // Calculate distributions
    const totalFunds = ethers.utils.parseEther("300"); // 75 + 25 + 75 + 125 = 300 CELO
    const platformFee = totalFunds.mul(15).div(100); // 15% platform fee
    const adminFee = totalFunds.mul(adminFeePercentage).div(100); // 8% admin fee
    const remainingFunds = totalFunds.sub(platformFee).sub(adminFee);
    
    // Linear distribution
    // Project 1 has 200 votes (33.33%)
    // Project 2 has 400 votes (66.67%)
    
    console.log("\n10. Verifying linear distribution");
    
    // Platform fee
    const platformFeeReceived = ownerBalanceAfter.sub(ownerBalanceBefore);
    console.log(`Platform fee received: ${ethers.utils.formatEther(platformFeeReceived)} CELO`);
    
    // Admin fee
    const adminFeeReceived = adminBalanceAfter.sub(adminBalanceBefore);
    console.log(`Admin fee received: ${ethers.utils.formatEther(adminFeeReceived)} CELO`);
    
    // Project 1 funds (should be approximately 33.33% of remaining funds)
    const project1FundsReceived = projectOwner1BalanceAfter.sub(projectOwner1BalanceBefore);
    console.log(`Project 1 funds received: ${ethers.utils.formatEther(project1FundsReceived)} CELO`);
    
    // Project 2 funds (should be approximately 66.67% of remaining funds)
    const project2FundsReceived = projectOwner2BalanceAfter.sub(projectOwner2BalanceBefore);
    console.log(`Project 2 funds received: ${ethers.utils.formatEther(project2FundsReceived)} CELO`);
    
    // Verify linear distribution
    const project1ExpectedShare = remainingFunds.mul(33333).div(100000); // 33.333%
    const project2ExpectedShare = remainingFunds.mul(66667).div(100000); // 66.667%
    
    expect(project1FundsReceived).to.be.closeTo(project1ExpectedShare, ethers.utils.parseEther("0.5"));
    expect(project2FundsReceived).to.be.closeTo(project2ExpectedShare, ethers.utils.parseEther("0.5"));
    
    console.log("\n--- LINEAR DISTRIBUTION CAMPAIGN TEST COMPLETED SUCCESSFULLY ---");
  });
});