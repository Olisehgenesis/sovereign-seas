import { ethers } from "hardhat";
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🚀 Deploying SovereignSeasV6 using Hardhat...');
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log('📋 Configuration:');
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Balance: ${ethers.formatEther(await deployer.provider!.getBalance(deployer.address))} CELO`);

  // Get the V4 contract address from environment or use a default
  const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;
  if (!SOVEREIGN_SEAS_V4_ADDRESS) {
    throw new Error('SOVEREIGN_SEAS_V4_ADDRESS environment variable is required');
  }
  console.log(`   V4 Contract: ${SOVEREIGN_SEAS_V4_ADDRESS}`);

  try {
    // Deploy V6 contract
    console.log('\n📦 Deploying SovereignSeasV6 contract...');
    
    const SovereignSeasV6 = await ethers.getContractFactory("SovereignSeasV6");
    const v6Contract = await SovereignSeasV6.deploy();
    
    console.log(`   Deploy transaction: ${v6Contract.deploymentTransaction()?.hash}`);
    console.log('   Waiting for deployment confirmation...');

    // Wait for deployment
    await v6Contract.waitForDeployment();
    const contractAddress = await v6Contract.getAddress();
    console.log(`   ✅ Contract deployed at: ${contractAddress}`);

    // Initialize the contract
    console.log('\n🔧 Initializing contract...');
    
    const initTx = await v6Contract.initialize(deployer.address);
    console.log(`   Initialize transaction: ${initTx.hash}`);
    console.log('   Waiting for initialization confirmation...');

    await initTx.wait();
    console.log('   ✅ Contract initialized successfully');

    // Set contract addresses after initialization
    console.log('\n🔧 Setting contract addresses...');
    
    // Get V4 data for configuration
    const v4Contract = await ethers.getContractAt("SovereignSeasV4", SOVEREIGN_SEAS_V4_ADDRESS);
    
    let mentoBroker = ethers.ZeroAddress;
    let celoToken = ethers.ZeroAddress;
    
    try {
      mentoBroker = await v4Contract.mentoTokenBroker();
      celoToken = await v4Contract.celoToken();
    } catch (error) {
      console.log('   ⚠️  Could not read V4 contract data (contract might not be deployed or accessible)');
    }
    
    // Set native token and cUSD token addresses (CELO mainnet addresses)
    const nativeToken = '0x471EcE3750Da237f93B8E339c536989b8978a438'; // CELO
    const cusdToken = '0x765DE816845861e75A25fCA122bb6898B8B1282a'; // cUSD
    
    const setAddressesTx = await v6Contract.setContractAddresses(nativeToken, cusdToken);
    console.log(`   Set addresses transaction: ${setAddressesTx.hash}`);
    console.log('   Waiting for confirmation...');

    await setAddressesTx.wait();
    console.log('   ✅ Contract addresses set successfully');

    // Set broker and CELO token if available
    if (mentoBroker !== ethers.ZeroAddress) {
      console.log('\n🔧 Setting broker address...');
      const setBrokerTx = await v6Contract.setBrokerAddress(mentoBroker);
      await setBrokerTx.wait();
      console.log('   ✅ Broker address set');
    }

    if (celoToken !== ethers.ZeroAddress) {
      console.log('\n🔧 Setting CELO token address...');
      const setCeloTx = await v6Contract.setCeloToken(celoToken);
      await setCeloTx.wait();
      console.log('   ✅ CELO token address set');
    }

    // Get V4 data for verification
    console.log('\n📊 Verifying V4 contract data...');
    
    let v4ProjectCount = 0n;
    let v4CampaignCount = 0n;
    
    try {
      // V4 uses nextProjectId and nextCampaignId for counting
      v4ProjectCount = await v4Contract.nextProjectId();
      v4CampaignCount = await v4Contract.nextCampaignId();
      
      console.log(`   V4 Projects: ${v4ProjectCount}`);
      console.log(`   V4 Campaigns: ${v4CampaignCount}`);
      
      // Test basic V4 functionality
      if (v4ProjectCount > 0n || v4CampaignCount > 0n) {
        console.log('\n🧪 Testing V4 contract access...');
        
        // Try to read a project if it exists
        if (v4ProjectCount > 0n) {
          try {
            const project = await v4Contract.projects(0);
            console.log(`   ✅ V4 Project #0 accessible: ${project.name}`);
          } catch (error) {
            console.log('   ⚠️  Could not read V4 project data');
          }
        }
        
        // Try to read a campaign if it exists
        if (v4CampaignCount > 0n) {
          try {
            const campaign = await v4Contract.campaigns(0);
            console.log(`   ✅ V4 Campaign #0 accessible: ${campaign.name}`);
          } catch (error) {
            console.log('   ⚠️  Could not read V4 campaign data');
          }
        }
      }
    } catch (error) {
      console.log('   ⚠️  Could not read V4 data (contract might not be deployed or accessible)');
    }

    // Get deployment transaction details
    const deployTx = v6Contract.deploymentTransaction()!;
    const deployReceipt = await deployTx.wait();
    const initReceipt = await initTx.wait();

    // Create deployment JSON
    const deploymentData = {
      network: 'celo',
      contract: 'SovereignSeasV6',
      address: contractAddress,
      deployer: deployer.address,
      transactionHash: deployTx.hash,
      initTransactionHash: initTx.hash,
      blockNumber: deployReceipt?.blockNumber,
      timestamp: new Date().toISOString(),
      configuration: {
        v4Contract: SOVEREIGN_SEAS_V4_ADDRESS,
        mentoBroker: mentoBroker,
        celoToken: celoToken,
        nativeToken: nativeToken,
        cusdToken: cusdToken,
        admin: deployer.address
      },
      verification: {
        v4Projects: Number(v4ProjectCount),
        v4Campaigns: Number(v4CampaignCount)
      }
    };

    const deploymentPath = join(__dirname, '../deployments/v6-deployment-hardhat.json');
    writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    console.log(`\n📄 Deployment data saved to: ${deploymentPath}`);

    // Display deployment summary
    console.log('\n🎉 Deployment Summary:');
    console.log(`   Contract: ${contractAddress}`);
    console.log(`   Network: Celo`);
    console.log(`   Admin: ${deployer.address}`);
    console.log(`   V4 Contract: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`   Native Token: ${nativeToken}`);
    console.log(`   cUSD Token: ${cusdToken}`);
    console.log(`   Gas Used: ${deployReceipt?.gasUsed}`);
    console.log(`   Block: ${deployReceipt?.blockNumber}`);

    return {
      contractAddress,
      transactionHash: deployTx.hash,
      initTransactionHash: initTx.hash,
      deploymentData
    };

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

// Main execution
main()
  .then(() => {
    console.log('\n✅ Deployment completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });
