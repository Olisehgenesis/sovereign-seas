import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Test wallet configuration
//load test wallets from wallets/alfajores-wallets.json
const TEST_WALLETS = JSON.parse(fs.readFileSync(path.join(__dirname, '../wallets/alfajores-wallets.json'), 'utf8')).wallets;
const TEST_WALLET_1 = TEST_WALLETS[0];
const TEST_WALLET_2 = TEST_WALLETS[1];
const TEST_WALLET_3 = TEST_WALLETS[2];
const TEST_WALLET_4 = TEST_WALLETS[3];
const TEST_WALLET_5 = TEST_WALLETS[4];
const TEST_WALLET_6 = TEST_WALLETS[5];
const V4_ABI = [
  // Project functions
  "function createProject(string memory _name, string memory _description, tuple(string,string,string) _metadata, address[] memory _contracts, bool _transferrable) external payable returns (uint256)",
  "function getProject(uint256 _projectId) external view returns (address,string,string,string,string,string,address[],bool,bool,uint256)",
  "function nextProjectId() external view returns (uint256)",
  "function getProjectCampaigns(uint256 _projectId) external view returns (uint256[])",
  
  // Campaign functions
  "function createCampaign(string memory _name, string memory _description, tuple(string,string) _metadata, uint256 _startTime, uint256 _endTime, uint256 _adminFeePercentage, uint256 _maxWinners, bool _useQuadraticDistribution, bool _useCustomDistribution, string memory _customDistributionData, address _payoutToken) external payable returns (uint256)",
  "function getCampaign(uint256 _campaignId) external view returns (address,string,string,uint256,uint256,uint256,uint256,bool,bool,address,bool,uint256)",
  "function nextCampaignId() external view returns (uint256)",
  "function getCampaignProjects(uint256 _campaignId) external view returns (uint256[])",
  
  // Project-Campaign interaction
  "function addProjectToCampaign(uint256 _campaignId, uint256 _projectId) external payable",
  "function approveProject(uint256 _campaignId, uint256 _projectId) external",
  
  // Voting functions
  "function vote(uint256 _campaignId, uint256 _projectId, address _token, uint256 _amount) external payable",
  "function getParticipation(uint256 _campaignId, uint256 _projectId) external view returns (bool,uint256,uint256)",
  
  // Distribution
  "function distributeFunds(uint256 _campaignId) external",
  
  // Admin functions
  "function addSuperAdmin(address _newSuperAdmin) external",
  "function isAdmin(address _user) external view returns (bool)",
  
  // Token management
  "function addSupportedToken(address _token) external",
  "function supportedTokens(address _token) external view returns (bool)",
  
  // Events
  "event ProjectCreated(uint256 indexed projectId, address indexed owner)",
  "event CampaignCreated(uint256 indexed campaignId, address indexed admin, string name)",
  "event ProjectAddedToCampaign(uint256 indexed campaignId, uint256 indexed projectId)",
  "event ProjectApproved(uint256 indexed campaignId, uint256 indexed projectId)",
  "event VoteCast(address indexed voter, uint256 indexed campaignId, uint256 indexed projectId, address token, uint256 amount, uint256 celoEquivalent)",
  "event FundsDistributed(uint256 indexed campaignId)"
];

// V5 Contract ABI (simplified for testing)
const V5_ABI = [
  "function callModule(string _moduleId, bytes _data) external payable returns (bytes memory)",
  "function registerModule(string _moduleId, address _moduleAddress, string[] _dependencies) external",
  "function hasRole(bytes32 role, address account) external view returns (bool)"
];

// Migration Module ABI
const MIGRATION_ABI = [
  "function setV4Contract(address _v4Contract) external",
  "function startMigration() external",
  "function migrateProjects(uint256 _batchSize) external",
  "function migrateCampaigns(uint256 _batchSize) external",
  "function migrateVotingData(uint256 _batchSize) external",
  "function validateMigration() external view returns (bool)",
  "function getMigrationStatus() external view returns (uint8)",
  "function getV4ToV5ProjectMapping(uint256 _v4Id) external view returns (uint256)",
  "function getV4ToV5CampaignMapping(uint256 _v4Id) external view returns (uint256)"
];

interface TestResults {
  v4ContractAddress: string;
  v5ContractAddress: string;
  migrationModuleAddress: string;
  testWallets: typeof TEST_WALLETS;
  projects: {
    [key: string]: {
      id: number;
      owner: string;
      name: string;
    };
  };
  campaigns: {
    [key: string]: {
      id: number;
      admin: string;
      name: string;
      projects: number[];
    };
  };
  votes: Array<{
    campaignId: number;
    projectId: number;
    voter: string;
    amount: string;
  }>;
  migrationResults: {
    projectsMigrated: number;
    campaignsMigrated: number;
    votingDataMigrated: boolean;
    validationPassed: boolean;
  };
}

async function main() {
  console.log('🚀 Starting Comprehensive V4 to V5 Migration Test');
  console.log('================================================');
  
  const results: TestResults = {
    v4ContractAddress: "0x1F3c0902e2c05D53Af2Cd00bd3F0a62EC4000942", // Provided V4 contract
    v5ContractAddress: "",
    migrationModuleAddress: "",
    testWallets: TEST_WALLETS,
    projects: {},
    campaigns: {},
    votes: [],
    migrationResults: {
      projectsMigrated: 0,
      campaignsMigrated: 0,
      votingDataMigrated: false,
      validationPassed: false
    }
  };

  // Setup provider and main wallet
  const provider = new ethers.JsonRpcProvider(process.env.CELO_RPC_URL);
  const mainWallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
  console.log(`📡 Using RPC: ${process.env.CELO_RPC_URL}`);
  console.log(`👤 Main wallet: ${mainWallet.address}`);
  
  // Check main wallet balance
  const balance = await provider.getBalance(mainWallet.address);
  console.log(`💰 Main wallet balance: ${ethers.formatEther(balance)} CELO`);
  
  if (balance < ethers.parseEther("1")) {
    console.log("❌ Insufficient balance for testing");
    return;
  }

  // Load V5 deployment info
  const deploymentPath = path.join(__dirname, '../deployments/alfajores/latest.json');
  let v5Deployment;
  try {
    v5Deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    results.v5ContractAddress = v5Deployment.contracts.sovereignSeasV5;
    results.migrationModuleAddress = v5Deployment.contracts.migrationModule;
    console.log(`🏗️ V5 Contract: ${results.v5ContractAddress}`);
    console.log(`🔄 Migration Module: ${results.migrationModuleAddress}`);
  } catch (error) {
    console.log("❌ Could not load V5 deployment info");
    return;
  }

  // Create V4 contract instance
  const v4Contract = new ethers.Contract(results.v4ContractAddress, V4_ABI, mainWallet);
  
  // Create V5 contract instance
  const v5Contract = new ethers.Contract(results.v5ContractAddress, V5_ABI, mainWallet);
  
  // Create migration module instance
  const migrationModule = new ethers.Contract(results.migrationModuleAddress, MIGRATION_ABI, mainWallet);

  try {
    // Step 1: Setup test wallets and distribute CELO
    console.log('\n📋 Step 1: Setting up test wallets and distributing CELO');
    console.log('=======================================================');
    
    await setupTestWallets(mainWallet, provider, results);

    // Step 2: Create projects for each test wallet
    console.log('\n📋 Step 2: Creating projects for test wallets');
    console.log('=============================================');
    
    await createTestProjects(v4Contract, results);

    // Step 3: Create campaigns for wallets 3 and 4
    console.log('\n📋 Step 3: Creating campaigns for wallets 3 and 4');
    console.log('================================================');
    
    await createTestCampaigns(v4Contract, results);

    // Step 4: Add projects to campaigns
    console.log('\n📋 Step 4: Adding projects to campaigns');
    console.log('======================================');
    
    await addProjectsToCampaigns(v4Contract, results);

    // Step 5: Test voting and approval
    console.log('\n📋 Step 5: Testing voting and approval');
    console.log('=====================================');
    
    await testVotingAndApproval(v4Contract, results);

    // Step 6: Shorten campaign timelines for testing
    console.log('\n📋 Step 6: Shortening campaign timelines');
    console.log('========================================');
    
    await shortenCampaignTimelines(v4Contract, results);

    // Step 7: Distribute funds
    console.log('\n📋 Step 7: Distributing campaign funds');
    console.log('======================================');
    
    await distributeCampaignFunds(v4Contract, results);

    // Step 8: Execute migration to V5
    console.log('\n📋 Step 8: Executing migration to V5');
    console.log('====================================');
    
    await executeMigration(v4Contract, v5Contract, migrationModule, results);

    // Step 9: Validate migration results
    console.log('\n📋 Step 9: Validating migration results');
    console.log('======================================');
    
    await validateMigrationResults(migrationModule, results);

    // Save test results
    console.log('\n💾 Saving test results...');
    const resultsPath = path.join(__dirname, '../../test-results/migration-test-results.json');
    fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`✅ Test results saved to: ${resultsPath}`);

    console.log('\n🎉 Migration test completed successfully!');
    console.log('==========================================');
    console.log(`📊 Projects created: ${Object.keys(results.projects).length}`);
    console.log(`📊 Campaigns created: ${Object.keys(results.campaigns).length}`);
    console.log(`📊 Votes cast: ${results.votes.length}`);
    console.log(`📊 Projects migrated: ${results.migrationResults.projectsMigrated}`);
    console.log(`📊 Campaigns migrated: ${results.migrationResults.campaignsMigrated}`);
    console.log(`📊 Migration validation: ${results.migrationResults.validationPassed ? 'PASSED' : 'FAILED'}`);

  } catch (error: any) {
    console.error('❌ Migration test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

async function setupTestWallets(mainWallet: ethers.Wallet, provider: ethers.JsonRpcProvider, results: TestResults) {
  console.log('💰 Checking test wallet balances...');
  
  // Define required balances for different activities
  const requiredBalances = [
    ethers.parseEther("0.2"), // wallet1: For voting (0.1 CELO)
    ethers.parseEther("0.2"), // wallet2: For voting (0.2 CELO) 
    ethers.parseEther("3.0"), // wallet3: For campaign creation (2 CELO) + project addition (1 CELO)
    ethers.parseEther("3.0"), // wallet4: For campaign creation (2 CELO) + project addition (1 CELO)
    ethers.parseEther("0.1"), // wallet5: Reserve
    ethers.parseEther("0.1")  // wallet6: Reserve
  ];
  
  for (let i = 0; i < TEST_WALLETS.length; i++) {
    try {
      const wallet = TEST_WALLETS[i] as { address: string; privateKey: string };
      const currentBalance = await provider.getBalance(wallet.address);
      const requiredBalance = requiredBalances[i] || ethers.parseEther("0.1");
      
      const walletName = `wallet${i + 1}`;
      if (currentBalance >= requiredBalance) {
        console.log(`   ✅ ${walletName}: ${ethers.formatEther(currentBalance)} CELO (sufficient)`);
      } else {
        const needed = requiredBalance - currentBalance;
        console.log(`   ⚠️ ${walletName}: ${ethers.formatEther(currentBalance)} CELO (needs ${ethers.formatEther(needed)} more)`);
        
        // Only send if main wallet has enough
        const mainBalance = await provider.getBalance(mainWallet.address);
        if (mainBalance >= needed + ethers.parseEther("0.01")) { // Add gas buffer
          const tx = await mainWallet.sendTransaction({
            to: wallet.address,
            value: needed
          });
          await tx.wait();
          
          const newBalance = await provider.getBalance(wallet.address);
          console.log(`   ✅ ${walletName}: Funded to ${ethers.formatEther(newBalance)} CELO`);
        } else {
          console.log(`   ❌ ${walletName}: Cannot fund - main wallet insufficient balance`);
        }
      }
    } catch (error: any) {
      console.log(`   ❌ wallet${i + 1}: Error checking/funding - ${error.message}`);
    }
  }
}

async function createTestProjects(v4Contract: ethers.Contract, results: TestResults) {
  const projectData = [
    { walletIndex: 0, name: 'Test Project 1', description: 'A test project for wallet 1' },
    { walletIndex: 1, name: 'Test Project 2', description: 'A test project for wallet 2' },
    { walletIndex: 2, name: 'Test Project 3', description: 'A test project for wallet 3' },
    { walletIndex: 3, name: 'Test Project 4', description: 'A test project for wallet 4' }
  ];

  for (const project of projectData) {
    try {
      const walletInfo = TEST_WALLETS[project.walletIndex] as { address: string; privateKey: string };
      const wallet = new ethers.Wallet(walletInfo.privateKey, v4Contract.runner!.provider);
      const contractWithWallet = v4Contract.connect(wallet);
      
      // Check if project already exists
      const nextId = await v4Contract.nextProjectId();
      const existingProject = await v4Contract.getProject(nextId - 1).catch(() => null);
      
      if (existingProject && existingProject[1] === project.name) {
        console.log(`   ⚠️ ${project.name} already exists, using existing project`);
        results.projects[`wallet${project.walletIndex + 1}`] = {
          id: Number(nextId) - 1,
          owner: wallet.address,
          name: project.name
        };
        continue;
      }

      const metadata = ["Test bio", "Test contract info", "Test additional data"];
      const contracts: string[] = [];
      const transferrable = false;
      
      const tx = await (contractWithWallet as any).createProject(
        project.name,
        project.description,
        metadata[0], // bio
        metadata[1], // contract info
        metadata[2], // additional data
        contracts,
        transferrable
      );
      
      const receipt = await tx.wait();
      const projectId = Number(nextId); // The new project ID
      
      results.projects[`wallet${project.walletIndex + 1}`] = {
        id: projectId,
        owner: wallet.address,
        name: project.name
      };
      
      console.log(`   ✅ Created ${project.name} (ID: ${projectId}) by ${wallet.address}`);
    } catch (error: any) {
      console.log(`   ❌ Failed to create ${project.name}: ${error.message}`);
    }
  }
}

async function createTestCampaigns(v4Contract: ethers.Contract, results: TestResults) {
  const campaignData = [
    { walletIndex: 2, name: 'Test Campaign 3', description: 'A test campaign for wallet 3' },
    { walletIndex: 3, name: 'Test Campaign 4', description: 'A test campaign for wallet 4' }
  ];

  for (const campaign of campaignData) {
    try {
      const walletInfo = TEST_WALLETS[campaign.walletIndex] as { address: string; privateKey: string };
      const wallet = new ethers.Wallet(walletInfo.privateKey, v4Contract.runner!.provider);
      const contractWithWallet = v4Contract.connect(wallet);
      
      // Check if campaign already exists
      const nextId = await v4Contract.nextCampaignId();
      const existingCampaign = await v4Contract.getCampaign(nextId - 1).catch(() => null);
      
      if (existingCampaign && existingCampaign[1] === campaign.name) {
        console.log(`   ⚠️ ${campaign.name} already exists, using existing campaign`);
        results.campaigns[`wallet${campaign.walletIndex + 1}`] = {
          id: Number(nextId) - 1,
          admin: wallet.address,
          name: campaign.name,
          projects: []
        };
        continue;
      }

      const metadata = ["Test main info", "Test additional info"];
      const startTime = Math.floor(Date.now() / 1000) + 60; // Start in 1 minute
      const endTime = startTime + 3600; // End in 1 hour
      const adminFeePercentage = 0;
      const maxWinners = 0;
      const useQuadraticDistribution = true;
      const useCustomDistribution = false;
      const customDistributionData = "";
      const payoutToken = "0x0000000000000000000000000000000000000000"; // Native CELO
      
      const tx = await (contractWithWallet as any).createCampaign(
        campaign.name,
        campaign.description,
        metadata,
        startTime,
        endTime,
        adminFeePercentage,
        maxWinners,
        useQuadraticDistribution,
        useCustomDistribution,
        customDistributionData,
        payoutToken,
        { value: ethers.parseEther("2") } // Campaign creation fee
      );
      
      const receipt = await tx.wait();
      const campaignId = Number(nextId); // The new campaign ID
      
      results.campaigns[`wallet${campaign.walletIndex + 1}`] = {
        id: campaignId,
        admin: wallet.address,
        name: campaign.name,
        projects: []
      };
      
      console.log(`   ✅ Created ${campaign.name} (ID: ${campaignId}) by ${wallet.address}`);
    } catch (error: any) {
      console.log(`   ❌ Failed to create ${campaign.name}: ${error.message}`);
    }
  }
}

async function addProjectsToCampaigns(v4Contract: ethers.Contract, results: TestResults) {
  // Add project 2 to campaign 3
  // Add project 3 to campaign 4
  const additions = [
    { campaignWalletIndex: 2, projectWalletIndex: 1 }, // wallet3 -> wallet2
    { campaignWalletIndex: 3, projectWalletIndex: 2 }  // wallet4 -> wallet3
  ];

  for (const addition of additions) {
    try {
      const campaignWalletInfo = TEST_WALLETS[addition.campaignWalletIndex] as { address: string; privateKey: string };
      const campaignWallet = new ethers.Wallet(campaignWalletInfo.privateKey, v4Contract.runner!.provider);
      const contractWithWallet = v4Contract.connect(campaignWallet);
      
      const campaignId = results.campaigns[`wallet${addition.campaignWalletIndex + 1}`].id;
      const projectId = results.projects[`wallet${addition.projectWalletIndex + 1}`].id;
      
      const tx = await (contractWithWallet as any).addProjectToCampaign(
        campaignId,
        projectId,
        { value: ethers.parseEther("1") } // Project addition fee
      );
      
      await tx.wait();
      
      results.campaigns[`wallet${addition.campaignWalletIndex + 1}`].projects.push(projectId);
      
      console.log(`   ✅ Added project ${projectId} to campaign ${campaignId}`);
    } catch (error: any) {
      console.log(`   ❌ Failed to add project to campaign: ${error.message}`);
    }
  }
}

async function testVotingAndApproval(v4Contract: ethers.Contract, results: TestResults) {
  // Approve projects in campaigns
  console.log('   🗳️ Approving projects in campaigns...');
  
  for (const [campaignWallet, campaign] of Object.entries(results.campaigns)) {
    try {
      const walletInfo = TEST_WALLETS[campaignWallet as keyof typeof TEST_WALLETS] as { address: string; privateKey: string };
      const wallet = new ethers.Wallet(walletInfo.privateKey, v4Contract.runner!.provider);
      const contractWithWallet = v4Contract.connect(wallet);
      
      for (const projectId of campaign.projects) {
        const tx = await (contractWithWallet as any).approveProject(campaign.id, projectId);
        await tx.wait();
        console.log(`   ✅ Approved project ${projectId} in campaign ${campaign.id}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Failed to approve projects in campaign ${campaign.id}: ${error.message}`);
    }
  }

  // Cast votes
  console.log('   🗳️ Casting votes...');
  
  const voteData = [
    { voterIndex: 0, campaignIndex: 2, projectIndex: 1, amount: '0.1' }, // wallet1 votes for wallet2's project in wallet3's campaign
    { voterIndex: 1, campaignIndex: 3, projectIndex: 2, amount: '0.2' }  // wallet2 votes for wallet3's project in wallet4's campaign
  ];

  for (const vote of voteData) {
    try {
      const voterWalletInfo = TEST_WALLETS[vote.voterIndex] as { address: string; privateKey: string };
      const voterWallet = new ethers.Wallet(voterWalletInfo.privateKey, v4Contract.runner!.provider);
      const contractWithWallet = v4Contract.connect(voterWallet);
      
      const campaignId = results.campaigns[`wallet${vote.campaignIndex + 1}`].id;
      const projectId = results.projects[`wallet${vote.projectIndex + 1}`].id;
      const tokenAddress = "0x0000000000000000000000000000000000000000"; // Native CELO
      
      const tx = await (contractWithWallet as any).vote(
        campaignId,
        projectId,
        tokenAddress,
        ethers.parseEther(vote.amount),
        { value: ethers.parseEther(vote.amount) }
      );
      
      await tx.wait();
      
      results.votes.push({
        campaignId,
        projectId,
        voter: voterWallet.address,
        amount: vote.amount
      });
      
      console.log(`   ✅ Vote cast: wallet${vote.voterIndex + 1} voted ${vote.amount} CELO for project ${projectId} in campaign ${campaignId}`);
    } catch (error: any) {
      console.log(`   ❌ Failed to cast vote: ${error.message}`);
    }
  }
}

async function shortenCampaignTimelines(v4Contract: ethers.Contract, results: TestResults) {
  console.log('   ⏰ Shortening campaign timelines for testing...');
  
  // Note: This would require admin access to modify campaign end times
  // For testing purposes, we'll assume campaigns are already set to short timelines
  console.log('   ⚠️ Campaign timeline shortening requires admin access - assuming short timelines for testing');
}

async function distributeCampaignFunds(v4Contract: ethers.Contract, results: TestResults) {
  console.log('   💰 Distributing campaign funds...');
  
  for (const [campaignWallet, campaign] of Object.entries(results.campaigns)) {
    try {
      const walletInfo = TEST_WALLETS[campaignWallet as keyof typeof TEST_WALLETS] as { address: string; privateKey: string };
      const wallet = new ethers.Wallet(walletInfo.privateKey, v4Contract.runner!.provider);
      const contractWithWallet = v4Contract.connect(wallet);
      
      const tx = await (contractWithWallet as any).distributeFunds(campaign.id);
      await tx.wait();
      
      console.log(`   ✅ Funds distributed for campaign ${campaign.id}`);
    } catch (error: any) {
      console.log(`   ⚠️ Fund distribution for campaign ${campaign.id}: ${error.message}`);
    }
  }
}

async function executeMigration(v4Contract: ethers.Contract, v5Contract: ethers.Contract, migrationModule: ethers.Contract, results: TestResults) {
  console.log('   🔄 Setting up V4 contract reference...');
  
  try {
    // Set V4 contract address in migration module
    const setV4Tx = await migrationModule.setV4Contract(results.v4ContractAddress);
    await setV4Tx.wait();
    console.log('   ✅ V4 contract reference set');
    
    // Start migration
    console.log('   🚀 Starting migration...');
    const startTx = await migrationModule.startMigration();
    await startTx.wait();
    console.log('   ✅ Migration started');
    
    // Migrate projects
    console.log('   📦 Migrating projects...');
    const migrateProjectsTx = await migrationModule.migrateProjects(10); // Batch size of 10
    await migrateProjectsTx.wait();
    console.log('   ✅ Projects migration completed');
    
    // Migrate campaigns
    console.log('   🎯 Migrating campaigns...');
    const migrateCampaignsTx = await migrationModule.migrateCampaigns(10); // Batch size of 10
    await migrateCampaignsTx.wait();
    console.log('   ✅ Campaigns migration completed');
    
    // Migrate voting data
    console.log('   🗳️ Migrating voting data...');
    const migrateVotingTx = await migrationModule.migrateVotingData(10); // Batch size of 10
    await migrateVotingTx.wait();
    console.log('   ✅ Voting data migration completed');
    
    results.migrationResults.votingDataMigrated = true;
    
  } catch (error: any) {
    console.log(`   ❌ Migration failed: ${error.message}`);
  }
}

async function validateMigrationResults(migrationModule: ethers.Contract, results: TestResults) {
  console.log('   🔍 Validating migration results...');
  
  try {
    // Check migration status
    const status = await migrationModule.getMigrationStatus();
    console.log(`   📊 Migration status: ${status}`);
    
    // Validate migration
    const isValid = await migrationModule.validateMigration();
    results.migrationResults.validationPassed = isValid;
    console.log(`   📊 Migration validation: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    // Check project mappings
    for (const [wallet, project] of Object.entries(results.projects)) {
      try {
        const v5ProjectId = await migrationModule.getV4ToV5ProjectMapping(project.id);
        if (v5ProjectId > 0) {
          results.migrationResults.projectsMigrated++;
          console.log(`   ✅ Project ${project.id} mapped to V5 project ${v5ProjectId}`);
        }
      } catch (error) {
        console.log(`   ⚠️ Could not verify mapping for project ${project.id}`);
      }
    }
    
    // Check campaign mappings
    for (const [wallet, campaign] of Object.entries(results.campaigns)) {
      try {
        const v5CampaignId = await migrationModule.getV4ToV5CampaignMapping(campaign.id);
        if (v5CampaignId > 0) {
          results.migrationResults.campaignsMigrated++;
          console.log(`   ✅ Campaign ${campaign.id} mapped to V5 campaign ${v5CampaignId}`);
        }
      } catch (error) {
        console.log(`   ⚠️ Could not verify mapping for campaign ${campaign.id}`);
      }
    }
    
  } catch (error: any) {
    console.log(`   ❌ Validation failed: ${error.message}`);
  }
}

main().catch(console.error);
