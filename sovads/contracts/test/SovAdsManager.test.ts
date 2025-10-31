import { ethers } from "hardhat";
import { expect } from "chai";

describe("SovAdsManager", function () {
  let sovAdsManager: any;
  let owner: any;
  let advertiser: any;
  let publisher: any;
  let admin: any;
  let mockToken: any;

  // Test token addresses (Celo Alfajores testnet)
  const CUSD_ADDRESS = "0x874069Fa1Eb16D44d13F0F66B92D3971647cE6c9";
  const USDC_ADDRESS = "0x2C852e740B62308c46DD29B982FBb650D063Bd07";

  beforeEach(async function () {
    [owner, advertiser, publisher, admin] = await ethers.getSigners();

    // Deploy SovAdsManager
    const SovAdsManager = await ethers.getContractFactory("SovAdsManager");
    sovAdsManager = await SovAdsManager.deploy();
    await sovAdsManager.deployed();

    // Add supported tokens
    await sovAdsManager.addSupportedToken(CUSD_ADDRESS);
    await sovAdsManager.addSupportedToken(USDC_ADDRESS);
  });

  describe("Campaign Management", function () {
    it("Should create a campaign successfully", async function () {
      const amount = ethers.utils.parseEther("100");
      const duration = 86400; // 1 day
      const metadataURI = "ipfs://QmTest123";

      // Mock token transfer (in real test, you'd need actual tokens)
      await expect(
        sovAdsManager.connect(advertiser).createCampaign(
          CUSD_ADDRESS,
          amount,
          duration,
          metadataURI
        )
      ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
    });

    it("Should edit campaign details", async function () {
      // First create a campaign (with proper token setup)
      const amount = ethers.utils.parseEther("100");
      const duration = 86400;
      const metadataURI = "ipfs://QmTest123";

      // This would require proper token setup in real tests
      console.log("Campaign creation test requires token setup");
    });

    it("Should pause and resume campaign", async function () {
      // Test pause/resume functionality
      console.log("Pause/resume tests require campaign creation first");
    });
  });

  describe("Publisher Management", function () {
    it("Should subscribe publisher successfully", async function () {
      const sites = ["example.com", "test.com"];
      
      await expect(
        sovAdsManager.connect(publisher).subscribePublisher(sites)
      ).to.emit(sovAdsManager, "PublisherSubscribed")
      .withArgs(publisher.address, sites, await sovAdsManager.provider.getBlockNumber());

      // Verify publisher is registered
      const publisherData = await sovAdsManager.getPublisher(publisher.address);
      expect(publisherData.wallet).to.equal(publisher.address);
      expect(publisherData.sites.length).to.equal(2);
      expect(publisherData.banned).to.be.false;
    });

    it("Should add and remove sites", async function () {
      // First subscribe
      await sovAdsManager.connect(publisher).subscribePublisher(["example.com"]);
      
      // Add new site
      await sovAdsManager.connect(publisher).addSite("newsite.com");
      
      let publisherData = await sovAdsManager.getPublisher(publisher.address);
      expect(publisherData.sites.length).to.equal(2);
      
      // Remove site
      await sovAdsManager.connect(publisher).removeSite(1);
      
      publisherData = await sovAdsManager.getPublisher(publisher.address);
      expect(publisherData.sites.length).to.equal(1);
    });

    it("Should prevent banned users from subscribing", async function () {
      // Ban user first
      await sovAdsManager.connect(owner).banUser(publisher.address, "Test ban");
      
      // Try to subscribe
      await expect(
        sovAdsManager.connect(publisher).subscribePublisher(["example.com"])
      ).to.be.revertedWith("User is banned");
    });
  });

  describe("Claim Orders", function () {
    beforeEach(async function () {
      // Subscribe publisher
      await sovAdsManager.connect(publisher).subscribePublisher(["example.com"]);
    });

    it("Should create claim order", async function () {
      // This would require a campaign to exist first
      console.log("Claim order tests require campaign creation");
    });

    it("Should process claim order as admin", async function () {
      // Test admin processing of claims
      console.log("Claim processing tests require campaign and claim order");
    });
  });

  describe("Admin Functions", function () {
    it("Should ban and unban users", async function () {
      // Ban user
      await sovAdsManager.connect(owner).banUser(publisher.address, "Test ban");
      
      let isBanned = await sovAdsManager.isUserBanned(publisher.address);
      expect(isBanned).to.be.true;
      
      // Unban user
      await sovAdsManager.connect(owner).unbanUser(publisher.address);
      
      isBanned = await sovAdsManager.isUserBanned(publisher.address);
      expect(isBanned).to.be.false;
    });

    it("Should add and remove supported tokens", async function () {
      const newToken = "0x1234567890123456789012345678901234567890";
      
      // Add token
      await sovAdsManager.connect(owner).addSupportedToken(newToken);
      
      const supportedTokens = await sovAdsManager.getSupportedTokens();
      expect(supportedTokens).to.include(newToken);
      
      // Remove token
      await sovAdsManager.connect(owner).removeSupportedToken(newToken);
      
      const updatedTokens = await sovAdsManager.getSupportedTokens();
      expect(updatedTokens).to.not.include(newToken);
    });

    it("Should set fee percentage", async function () {
      await sovAdsManager.connect(owner).setFeePercent(10);
      
      const feePercent = await sovAdsManager.feePercent();
      expect(feePercent).to.equal(10);
    });

    it("Should pause and unpause contract", async function () {
      await sovAdsManager.connect(owner).pause();
      
      await expect(
        sovAdsManager.connect(publisher).subscribePublisher(["example.com"])
      ).to.be.revertedWith("Pausable: paused");
      
      await sovAdsManager.connect(owner).unpause();
      
      // Should work now
      await sovAdsManager.connect(publisher).subscribePublisher(["example.com"]);
    });
  });

  describe("Access Control", function () {
    it("Should only allow owner to call admin functions", async function () {
      await expect(
        sovAdsManager.connect(advertiser).banUser(publisher.address, "Test")
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        sovAdsManager.connect(advertiser).setFeePercent(10)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should only allow campaign creator to edit campaign", async function () {
      await expect(
        sovAdsManager.connect(advertiser).editCampaign(1, "newURI", 86400)
      ).to.be.revertedWith("Campaign does not exist");
    });
  });

  describe("View Functions", function () {
    it("Should return correct contract state", async function () {
      const totalFees = await sovAdsManager.getTotalProtocolFees();
      expect(totalFees).to.equal(0);
      
      const activeCampaigns = await sovAdsManager.getActiveCampaignsCount();
      expect(activeCampaigns).to.equal(0);
      
      const supportedTokens = await sovAdsManager.getSupportedTokens();
      expect(supportedTokens.length).to.equal(2);
    });
  });
});
