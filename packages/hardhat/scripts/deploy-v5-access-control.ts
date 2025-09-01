import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";

describe("SovereignSeas V5 Access Control Deployment", function () {
  async function deployV5System() {
    const [deployer, admin, user1, user2] = await ethers.getSigners();

    // Deploy the main proxy contract
    const SovereignSeasV5 = await ethers.getContractFactory("SovereignSeasV5");
    const sovereignSeasV5 = await SovereignSeasV5.deploy();
    await sovereignSeasV5.waitForDeployment();

    // Deploy modules
    const ProjectsModule = await ethers.getContractFactory("ProjectsModule");
    const projectsModule = await ProjectsModule.deploy();
    await projectsModule.waitForDeployment();

    const CampaignsModule = await ethers.getContractFactory("CampaignsModule");
    const campaignsModule = await CampaignsModule.deploy();
    await campaignsModule.waitForDeployment();

    const VotingModule = await ethers.getContractFactory("VotingModule");
    const votingModule = await VotingModule.waitForDeployment();

    const TreasuryModule = await ethers.getContractFactory("TreasuryModule");
    const treasuryModule = await TreasuryModule.deploy();
    await treasuryModule.waitForDeployment();

    const PoolsModule = await ethers.getContractFactory("PoolsModule");
    const poolsModule = await PoolsModule.deploy();
    await poolsModule.waitForDeployment();

    const MigrationModule = await ethers.getContractFactory("MigrationModule");
    const migrationModule = await MigrationModule.deploy();
    await migrationModule.waitForDeployment();

    return {
      sovereignSeasV5,
      projectsModule,
      campaignsModule,
      votingModule,
      treasuryModule,
      poolsModule,
      migrationModule,
      deployer,
      admin,
      user1,
      user2,
    };
  }

  describe("Deployment", function () {
    it("Should deploy all contracts successfully", async function () {
      const {
        sovereignSeasV5,
        projectsModule,
        campaignsModule,
        votingModule,
        treasuryModule,
        poolsModule,
        migrationModule,
      } = await loadFixture(deployV5System);

      expect(await sovereignSeasV5.getAddress()).to.be.properAddress;
      expect(await projectsModule.getAddress()).to.be.properAddress;
      expect(await campaignsModule.getAddress()).to.be.properAddress;
      expect(await votingModule.getAddress()).to.be.properAddress;
      expect(await treasuryModule.getAddress()).to.be.properAddress;
      expect(await poolsModule.getAddress()).to.be.properAddress;
      expect(await migrationModule.getAddress()).to.be.properAddress;
    });
  });

  describe("Initialization", function () {
    it("Should initialize proxy with deployer as admin", async function () {
      const { sovereignSeasV5, deployer } = await loadFixture(deployV5System);

      // Initialize the proxy
      await sovereignSeasV5.initialize(deployer.address);

      // Check that deployer has all roles
      expect(await sovereignSeasV5.hasRole(await sovereignSeasV5.ADMIN_ROLE(), deployer.address)).to.be.true;
      expect(await sovereignSeasV5.hasRole(await sovereignSeasV5.MANAGER_ROLE(), deployer.address)).to.be.true;
      expect(await sovereignSeasV5.hasRole(await sovereignSeasV5.OPERATOR_ROLE(), deployer.address)).to.be.true;
      expect(await sovereignSeasV5.hasRole(await sovereignSeasV5.EMERGENCY_ROLE(), deployer.address)).to.be.true;
      expect(await sovereignSeasV5.hasRole(await sovereignSeasV5.PROJECTS_ADMIN_ROLE(), deployer.address)).to.be.true;
      expect(await sovereignSeasV5.hasRole(await sovereignSeasV5.CAMPAIGNS_ADMIN_ROLE(), deployer.address)).to.be.true;
      expect(await sovereignSeasV5.hasRole(await sovereignSeasV5.VOTING_ADMIN_ROLE(), deployer.address)).to.be.true;
      expect(await sovereignSeasV5.hasRole(await sovereignSeasV5.TREASURY_ADMIN_ROLE(), deployer.address)).to.be.true;
      expect(await sovereignSeasV5.hasRole(await sovereignSeasV5.POOLS_ADMIN_ROLE(), deployer.address)).to.be.true;
      expect(await sovereignSeasV5.hasRole(await sovereignSeasV5.MIGRATION_ADMIN_ROLE(), deployer.address)).to.be.true;
    });

    it("Should initialize modules with proxy address", async function () {
      const { sovereignSeasV5, projectsModule, deployer } = await loadFixture(deployV5System);

      // Initialize proxy first
      await sovereignSeasV5.initialize(deployer.address);

      // Grant module-specific admin roles
      await sovereignSeasV5.grantRole(await sovereignSeasV5.PROJECTS_ADMIN_ROLE(), deployer.address);
      await sovereignSeasV5.grantRole(await sovereignSeasV5.CAMPAIGNS_ADMIN_ROLE(), deployer.address);
      await sovereignSeasV5.grantRole(await sovereignSeasV5.VOTING_ADMIN_ROLE(), deployer.address);
      await sovereignSeasV5.grantRole(await sovereignSeasV5.TREASURY_ADMIN_ROLE(), deployer.address);
      await sovereignSeasV5.grantRole(await sovereignSeasV5.POOLS_ADMIN_ROLE(), deployer.address);
      await sovereignSeasV5.grantRole(await sovereignSeasV5.MIGRATION_ADMIN_ROLE(), deployer.address);

      // Initialize module
      await projectsModule.initialize(await sovereignSeasV5.getAddress(), "0x");

      // Check that module has correct proxy address
      expect(await projectsModule.sovereignSeasProxy()).to.equal(await sovereignSeasV5.getAddress());
      expect(await projectsModule.isActive()).to.be.true;
    });
  });

  describe("Module Registration", function () {
    it("Should register modules successfully", async function () {
      const { sovereignSeasV5, projectsModule, campaignsModule, deployer } = await loadFixture(deployV5System);

      // Initialize proxy
      await sovereignSeasV5.initialize(deployer.address);

      // Register modules
      await sovereignSeasV5.registerModule("projects", await projectsModule.getAddress(), []);
      await sovereignSeasV5.registerModule("campaigns", await campaignsModule.getAddress(), []);

      // Check registration
      expect(await sovereignSeasV5.isModuleRegistered("projects")).to.be.true;
      expect(await sovereignSeasV5.isModuleRegistered("campaigns")).to.be.true;
      expect(await sovereignSeasV5.getModuleAddress("projects")).to.equal(await projectsModule.getAddress());
      expect(await sovereignSeasV5.getModuleAddress("campaigns")).to.equal(await campaignsModule.getAddress());
    });
  });

  describe("Access Control", function () {
    it("Should enforce admin-only module registration", async function () {
      const { sovereignSeasV5, projectsModule, user1 } = await loadFixture(deployV5System);

      // Try to register module as non-admin
      await expect(
        sovereignSeasV5.connect(user1).registerModule("projects", await projectsModule.getAddress(), [])
      ).to.be.revertedWith("SovereignSeasV5: Admin role required");
    });

    it("Should enforce admin-only module updates", async function () {
      const { sovereignSeasV5, projectsModule, campaignsModule, deployer, user1 } = await loadFixture(deployV5System);

      // Initialize and register module
      await sovereignSeasV5.initialize(deployer.address);
      await sovereignSeasV5.registerModule("projects", await projectsModule.getAddress(), []);

      // Try to update module as non-admin
      await expect(
        sovereignSeasV5.connect(user1).updateModuleAddress("projects", await campaignsModule.getAddress())
      ).to.be.revertedWith("SovereignSeasV5: Admin role required");
    });
  });

  describe("Module Communication", function () {
    it("Should allow modules to call each other through proxy", async function () {
      const { sovereignSeasV5, projectsModule, campaignsModule, deployer } = await loadFixture(deployV5System);

      // Initialize and register modules
      await sovereignSeasV5.initialize(deployer.address);
      await sovereignSeasV5.registerModule("projects", await projectsModule.getAddress(), []);
      await sovereignSeasV5.registerModule("campaigns", await campaignsModule.getAddress(), []);

      // Initialize modules
      await projectsModule.initialize(await sovereignSeasV5.getAddress(), "0x");
      await campaignsModule.initialize(await sovereignSeasV5.getAddress(), "0x");

      // This test would require the modules to have actual cross-module communication functions
      // For now, we just verify the setup is correct
      expect(await projectsModule.sovereignSeasProxy()).to.equal(await sovereignSeasV5.getAddress());
      expect(await campaignsModule.sovereignSeasProxy()).to.equal(await sovereignSeasV5.getAddress());
    });
  });

  describe("Value Forwarding", function () {
    it("Should forward ETH value correctly to modules", async function () {
      const { sovereignSeasV5, projectsModule, deployer, user1 } = await loadFixture(deployV5System);

      // Initialize and register module
      await sovereignSeasV5.initialize(deployer.address);
      await sovereignSeasV5.registerModule("projects", await projectsModule.getAddress(), []);
      await projectsModule.initialize(await sovereignSeasV5.getAddress(), "0x");

      // Get initial balances
      const initialProxyBalance = await ethers.provider.getBalance(await sovereignSeasV5.getAddress());
      const initialModuleBalance = await ethers.provider.getBalance(await projectsModule.getAddress());

      // Call module with value
      const createProjectData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string", "tuple(string,string,string,string[],string,string,string,string,string,string,string)", "address[]", "bool"],
        [
          "Test Project",
          "Test Description",
          ["bio", "contractInfo", "additionalData", ["tag1"], "category", "website", "github", "twitter", "discord", "websiteUrl", "socialMediaHandle"],
          [],
          false
        ]
      );

      await sovereignSeasV5.connect(user1).callModule("projects", createProjectData, { value: ethers.parseEther("0.5") });

      // Check that value was forwarded
      const finalProxyBalance = await ethers.provider.getBalance(await sovereignSeasV5.getAddress());
      const finalModuleBalance = await ethers.provider.getBalance(await projectsModule.getAddress());

      expect(finalProxyBalance).to.equal(initialProxyBalance);
      expect(finalModuleBalance).to.equal(initialModuleBalance.add(ethers.parseEther("0.5")));
    });
  });
});
