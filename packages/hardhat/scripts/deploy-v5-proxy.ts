import { ethers } from "hardhat";
import { Contract } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying SovereignSeas V5 Proxy Architecture with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Deploy ProjectManager
  console.log("\n1. Deploying ProjectManager...");
  const ProjectManager = await ethers.getContractFactory("ProjectManager");
  const projectManager = await ProjectManager.deploy();
  await projectManager.deployed();
  console.log("ProjectManager deployed to:", projectManager.address);
  
  // Deploy VotingEngine
  console.log("\n2. Deploying VotingEngine...");
  const VotingEngine = await ethers.getContractFactory("VotingEngine");
  const votingEngine = await VotingEngine.deploy();
  await votingEngine.deployed();
  console.log("VotingEngine deployed to:", votingEngine.address);
  
  // Deploy Treasury
  console.log("\n3. Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy();
  await treasury.deployed();
  console.log("Treasury deployed to:", treasury.address);
  
  // Deploy SovereignSeasV5Proxy
  console.log("\n4. Deploying SovereignSeasV5Proxy...");
  const SovereignSeasV5Proxy = await ethers.getContractFactory("SovereignSeasV5Proxy");
  const sovereignSeasV5Proxy = await SovereignSeasV5Proxy.deploy();
  await sovereignSeasV5Proxy.deployed();
  console.log("SovereignSeasV5Proxy deployed to:", sovereignSeasV5Proxy.address);
  
  // Initialize the proxy
  console.log("\n5. Initializing SovereignSeasV5Proxy...");
  await sovereignSeasV5Proxy.initialize(
    deployer.address,
    projectManager.address,
    votingEngine.address,
    treasury.address
  );
  console.log("SovereignSeasV5Proxy initialized successfully");
  
  // Verify roles are set correctly
  console.log("\n6. Verifying role assignments...");
  
  const ADMIN_ROLE = await sovereignSeasV5Proxy.ADMIN_ROLE();
  const MANAGER_ROLE = await sovereignSeasV5Proxy.MANAGER_ROLE();
  const EMERGENCY_ROLE = await sovereignSeasV5Proxy.EMERGENCY_ROLE();
  const UPGRADER_ROLE = await sovereignSeasV5Proxy.UPGRADER_ROLE();
  
  console.log("ADMIN_ROLE:", ADMIN_ROLE);
  console.log("MANAGER_ROLE:", MANAGER_ROLE);
  console.log("EMERGENCY_ROLE:", EMERGENCY_ROLE);
  console.log("UPGRADER_ROLE:", UPGRADER_ROLE);
  
  // Verify deployer has all roles
  const hasAdminRole = await sovereignSeasV5Proxy.hasRole(ADMIN_ROLE, deployer.address);
  const hasManagerRole = await sovereignSeasV5Proxy.hasRole(MANAGER_ROLE, deployer.address);
  const hasEmergencyRole = await sovereignSeasV5Proxy.hasRole(EMERGENCY_ROLE, deployer.address);
  const hasUpgraderRole = await sovereignSeasV5Proxy.hasRole(UPGRADER_ROLE, deployer.address);
  
  console.log("Deployer has ADMIN_ROLE:", hasAdminRole);
  console.log("Deployer has MANAGER_ROLE:", hasManagerRole);
  console.log("Deployer has EMERGENCY_ROLE:", hasEmergencyRole);
  console.log("Deployer has UPGRADER_ROLE:", hasUpgraderRole);
  
  // Test basic functionality
  console.log("\n7. Testing basic functionality...");
  
  // Test project creation
  try {
    const projectId = await sovereignSeasV5Proxy.createProjectV6(
      "Test Project",
      "Test Description",
      "Test Bio",
      "Test Contract Info",
      "Test Additional Data",
      [],
      false
    );
    console.log("✅ Project created successfully with ID:", projectId.toString());
  } catch (error) {
    console.log("❌ Project creation failed:", error.message);
  }
  
  // Test campaign creation
  try {
    const startTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const endTime = startTime + 86400; // 24 hours later
    
    const campaignId = await sovereignSeasV5Proxy.createCampaignV6(
      "Test Campaign",
      "Test Campaign Description",
      startTime,
      endTime,
      "Test Main Info",
      "Test Additional Info",
      100, // 1% admin fee
      5, // max 5 winners
      false, // no quadratic distribution
      false, // no custom distribution
      "",
      ethers.constants.AddressZero // no payout token
    );
    console.log("✅ Campaign created successfully with ID:", campaignId.toString());
  } catch (error) {
    console.log("❌ Campaign creation failed:", error.message);
  }
  
  // Test pool creation
  try {
    const startTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const endTime = startTime + 86400; // 24 hours later
    
    const poolId = await sovereignSeasV5Proxy.createPool(
      1, // campaign ID
      "Test Pool",
      "Test Pool Description",
      startTime,
      endTime
    );
    console.log("✅ Pool created successfully with ID:", poolId.toString());
  } catch (error) {
    console.log("❌ Pool creation failed:", error.message);
  }
  
  // Test view functions
  try {
    const projectCount = await sovereignSeasV5Proxy.getProjectCount();
    const campaignCount = await sovereignSeasV5Proxy.getCampaignCount();
    const poolCount = await sovereignSeasV5Proxy.getPoolCount();
    
    console.log("✅ View functions working:");
    console.log("  - Project count:", projectCount.toString());
    console.log("  - Campaign count:", campaignCount.toString());
    console.log("  - Pool count:", poolCount.toString());
  } catch (error) {
    console.log("❌ View functions failed:", error.message);
  }
  
  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log("ProjectManager:", projectManager.address);
  console.log("VotingEngine:", votingEngine.address);
  console.log("Treasury:", treasury.address);
  console.log("SovereignSeasV5Proxy:", sovereignSeasV5Proxy.address);
  
  console.log("\n🔗 Proxy Contract Functions:");
  console.log("- All V6 functions are accessible through the proxy");
  console.log("- Functions are automatically routed to appropriate mini contracts");
  console.log("- Circuit breaker and emergency functions are centralized");
  console.log("- Upgradeable architecture maintained");
  
  console.log("\n📊 Architecture Benefits:");
  console.log("- Modular design with focused responsibilities");
  console.log("- Easier maintenance and debugging");
  console.log("- Smaller attack surface per contract");
  console.log("- Team can work on different modules independently");
  console.log("- Gas efficient deployment and upgrades");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
