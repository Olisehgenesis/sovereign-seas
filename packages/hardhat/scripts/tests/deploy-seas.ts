import hre from "hardhat";
import { saveDeployment, loadLatestDeployment, DeploymentRecord } from "../utils/deployments";

const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;
  
  console.log(`Deploying SEAS from ${deployer.address} on ${network}`);
  const factory = await ethers.getContractFactory("SEASToken");
  const token = await factory.deploy(await deployer.getAddress());
  await token.waitForDeployment();
  
  const tokenAddress = await token.getAddress();
  console.log(`SEAS deployed at ${tokenAddress}`);
  
  // Load existing deployment or create new one
  const existingDeployment = loadLatestDeployment(network);
  let deploymentRecord: DeploymentRecord;
  
  if (existingDeployment) {
    // Update existing deployment with SEAS token
    deploymentRecord = {
      ...existingDeployment.record,
      contracts: {
        ...existingDeployment.record.contracts,
        seasToken: tokenAddress
      },
      timestamp: new Date().toISOString()
    };
  } else {
    // Create new deployment record with only SEAS token
    deploymentRecord = {
      network,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        projectsModule: "",
        campaignsModule: "",
        votingModule: "",
        treasuryModule: "",
        poolsModule: "",
        migrationModule: "",
        sovereignSeasV5: "",
        seasToken: tokenAddress
      }
    };
  }
  
  // Save the updated deployment
  const deploymentPath = saveDeployment(network, deploymentRecord);
  console.log(`Deployment saved to: ${deploymentPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


