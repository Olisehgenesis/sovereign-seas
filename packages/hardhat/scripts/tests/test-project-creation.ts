import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function testProjectCreation() {
  console.log('🧪 Testing Project Creation');
  console.log('============================');

  // Load deployment info
  const deploymentPath = path.join(__dirname, '../../deployments/alfajores/latest.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  console.log(`📡 Using RPC: ${process.env.CELO_RPC_URL}`);
  console.log(`👤 Deployer: ${deployment.deployer}`);
  console.log(`🏗️  Main Contract: ${deployment.contracts.sovereignSeasV5}`);

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.CELO_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  // Check wallet balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} CELO`);

  // Create proxy contract interface
  const proxyContract = new ethers.Contract(
    deployment.contracts.sovereignSeasV5,
    [
      'function callModule(string _moduleId, bytes _data) external payable returns (bytes memory)',
    ],
    wallet
  );

  // Test data for project creation
  const projectName = "Test Project";
  const projectDescription = "A test project to verify functionality";
  const metadata = [
    "Test bio",                    // bio
    "Test contract info",          // contractInfo
    "Test additional data",        // additionalData
    JSON.stringify({ tags: ["test", "verification"] }), // jsonMetadata
    "Test",                        // category
    "https://test.com",            // website
    "https://github.com/test",     // github
    "https://twitter.com/test",    // twitter
    "https://discord.gg/test",     // discord
    "https://test.com",            // websiteUrl
    "@test"                        // socialMediaHandle
  ];
  const contracts = [];
  const transferrable = false;

  // Encode the createProject function call
  const createProjectData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string', 'tuple(string,string,string,string,string,string,string,string,string,string,string)', 'address[]', 'bool'],
    [projectName, projectDescription, metadata, contracts, transferrable]
  );

  const functionData = ethers.concat([
    ethers.id('createProject(string,string,tuple(string,string,string,string,string,string,string,string,string,string,string),address[],bool)').slice(0, 10),
    createProjectData
  ]);

  try {
    console.log('\n🚀 Attempting to create project...');
    console.log(`📝 Project name: ${projectName}`);
    console.log(`📝 Project description: ${projectDescription}`);
    console.log(`💰 Sending 0.5 CELO as fee`);
    
    // Try to create project with fee
    const tx = await proxyContract.callModule(
      'projects',
      functionData,
      { value: ethers.parseEther('0.5') }
    );
    
    console.log(`📝 Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Project created successfully! Gas used: ${receipt.gasUsed}`);
    
    // Check if project was created
    const projectsModule = new ethers.Contract(
      deployment.contracts.projectsModule,
      ['function getProjectCount() external view returns (uint256)'],
      provider
    );
    
    const projectCount = await projectsModule.getProjectCount();
    console.log(`📊 New project count: ${projectCount}`);

  } catch (error: any) {
    console.error('❌ Project creation failed:', error.message);
    
    // Try without fee to see if that's the issue
    console.log('\n🔄 Trying without fee...');
    try {
      const txNoFee = await proxyContract.callModule(
        'projects',
        functionData
      );
      
      console.log(`📝 No-fee transaction hash: ${txNoFee.hash}`);
      const receipt = await txNoFee.wait();
      console.log(`✅ Project created without fee! Gas used: ${receipt.gasUsed}`);
      
    } catch (noFeeError: any) {
      console.error('❌ No-fee creation also failed:', noFeeError.message);
    }
  }
}

testProjectCreation().catch(console.error);
