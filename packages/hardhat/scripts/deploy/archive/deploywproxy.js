import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying WorkingCeloVotingProxy...\n");

  // Contract addresses for Celo Mainnet
  const SOVEREIGN_SEAS_ADDRESS = "0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a"; // Your SovereignSeas contract
  const WCELO_ADDRESS = "0x471EcE3750Da237f93B8E339c536989b8978a438"; // Wrapped CELO on Celo
  
  // The WORKING Universal Router V1 2 address is hardcoded in the contract
  // This is the one from your successful transaction: 0x643770E279d5D0733F21d6DC03A8efbABf3255B4

  console.log("📋 Deployment Configuration:");
  console.log(`- SovereignSeas: ${SOVEREIGN_SEAS_ADDRESS}`);
  console.log(`- WCELO: ${WCELO_ADDRESS}`);
  console.log(`- Universal Router V1 2: 0x643770E279d5D0733F21d6DC03A8efbABf3255B4 (hardcoded)`);
  console.log("");

  // Deploy the contract
  const WorkingCeloVotingProxy = await ethers.getContractFactory("WorkingCeloVotingProxy");
  
  const proxy = await WorkingCeloVotingProxy.deploy(
    SOVEREIGN_SEAS_ADDRESS,
    WCELO_ADDRESS
  );

  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  console.log(`✅ WorkingCeloVotingProxy deployed to: ${proxyAddress}\n`);

  // Verify the configuration
  console.log("🔍 Verifying deployment...");
  
  const config = await proxy.getConfiguration();
  console.log("Configuration:");
  console.log(`- Router: ${config.routerAddr}`);
  console.log(`- SovereignSeas: ${config.sovereignSeasAddr}`);
  console.log(`- WCELO: ${config.celoAddr}`);
  console.log(`- Slippage: ${config.currentSlippage} (${Number(config.currentSlippage)/100}%)`);

  console.log("\n🎯 Next steps:");
  console.log("1. Update your .env file with the new proxy address:");
  console.log(`   ENHANCED_CELO_VOTING_PROXY_ADDRESS=${proxyAddress}`);
  console.log("2. Run your test script to vote with G$ tokens");
  console.log("3. The proxy will automatically use the working Universal Router V1 2");

  // If on a testnet or if you want to verify on mainnet
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\n⏳ Waiting before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
    
    try {
      await hre.run("verify:verify", {
        address: proxyAddress,
        constructorArguments: [
          SOVEREIGN_SEAS_ADDRESS,
          WCELO_ADDRESS
        ],
      });
      console.log("✅ Contract verified on block explorer");
    } catch (error) {
      console.log("⚠️ Verification failed (this is normal if contract is already verified)");
      console.log(error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });