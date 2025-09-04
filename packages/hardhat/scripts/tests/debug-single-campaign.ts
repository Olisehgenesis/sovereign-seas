import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData, decodeAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import { loadLatestDeployment } from "../utils/deployments";

// Import ABIs
import SOVEREIGN_SEAS_V5_ABI from "../../artifacts/contracts/v5/SovereignSeasV5.sol/SovereignSeasV5.json";
import CAMPAIGNS_MODULE_ABI from "../../artifacts/contracts/v5/modules/CampaignsModule.sol/CampaignsModule.json";
import PROJECTS_MODULE_ABI from "../../artifacts/contracts/v5/modules/ProjectsModule.sol/ProjectsModule.json";
import VOTING_MODULE_ABI from "../../artifacts/contracts/v5/modules/VotingModule.sol/VotingModule.json";
import SEASTOKEN_ABI from "../../artifacts/contracts/SEASToken.sol/SEASToken.json";

class DebugSingleCampaign {
  private publicClient: any;
  private deployment: any;
  private wallets!: any[];

  constructor() {
    this.publicClient = createPublicClient({ 
      chain: celoAlfajores, 
      transport: http("https://alfajores-forno.celo-testnet.org") 
    });
  }

  private async initialize() {
    console.log("🚀 Initializing Debug Single Campaign Test...");
    
    // Load deployment
    this.deployment = await loadLatestDeployment("alfajores");
    console.log(`📦 Loaded deployment: ${this.deployment.path}`);
    
    // Load wallets
    const walletsData = require("../../wallets/alfajores-wallets.json");
    this.wallets = walletsData.wallets;
    console.log(`👛 Loaded ${this.wallets.length} test wallets`);
  }

  private async getCampaignDetails(campaignId: number) {
    console.log(`\n🔍 Getting details for Campaign ${campaignId}...`);
    
    try {
      // Get basic campaign info
      const campaignData = encodeFunctionData({
        abi: CAMPAIGNS_MODULE_ABI.abi,
        functionName: "getCampaign",
        args: [BigInt(campaignId)]
      });
      
      const campaignResult = await this.publicClient.readContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI.abi,
        functionName: "staticCallModule",
        args: ["campaigns", campaignData],
      });
      
      const [admin, name, description, status, active, startTime, endTime, totalFunds] = decodeAbiParameters(
        [
          { type: "address" }, // admin
          { type: "string" },  // name
          { type: "string" },  // description
          { type: "uint8" },   // status (enum)
          { type: "bool" },    // active
          { type: "uint256" }, // startTime
          { type: "uint256" }, // endTime
          { type: "uint256" }  // totalFunds
        ],
        campaignResult
      );
      
      console.log(`📋 Campaign ${campaignId} Details:`);
      console.log(`   Name: "${name}"`);
      console.log(`   Admin: ${admin}`);
      console.log(`   Active: ${active}`);
      console.log(`   Status: ${status}`);
      console.log(`   Start Time: ${new Date(Number(startTime) * 1000).toISOString()}`);
      console.log(`   End Time: ${new Date(Number(endTime) * 1000).toISOString()}`);
      console.log(`   Total Funds: ${totalFunds}`);
      
      // Try to get ERC20 campaign config to see token details
      try {
        const erc20ConfigData = encodeFunctionData({
          abi: CAMPAIGNS_MODULE_ABI.abi,
          functionName: "getERC20CampaignConfig",
          args: [BigInt(campaignId)]
        });
        
        const erc20ConfigResult = await this.publicClient.readContract({
          address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI.abi,
          functionName: "staticCallModule",
          args: ["campaigns", erc20ConfigData],
        });
        
        const [campaignType, isERC20Campaign, allowedTokens, tokenWeights, projectAdditionFeeToken, projectAdditionFeeAmount] = decodeAbiParameters(
          [
            { type: "uint8" },     // campaignType
            { type: "bool" },      // isERC20Campaign
            { type: "address[]" }, // allowedTokens
            { type: "uint256[]" }, // tokenWeights
            { type: "address" },   // projectAdditionFeeToken
            { type: "uint256" }    // projectAdditionFeeAmount
          ],
          erc20ConfigResult
        );
        
        console.log(`\n💰 Campaign ${campaignId} Token Configuration:`);
        console.log(`   Campaign Type: ${campaignType}`);
        console.log(`   Is ERC20 Campaign: ${isERC20Campaign}`);
        console.log(`   Allowed Tokens: ${allowedTokens.join(", ")}`);
        console.log(`   Token Weights: ${tokenWeights.join(", ")}`);
        console.log(`   Project Addition Fee Token: ${projectAdditionFeeToken}`);
        console.log(`   Project Addition Fee Amount: ${projectAdditionFeeAmount}`);
        
        return {
          id: BigInt(campaignId),
          name,
          admin,
          active,
          isERC20: isERC20Campaign,
          allowedTokens,
          tokenWeights,
          projectAdditionFeeToken,
          projectAdditionFeeAmount
        };
        
      } catch (error) {
        console.log(`   ⚠️  Could not get ERC20 config (might be a standard campaign): ${error.message}`);
        return {
          id: BigInt(campaignId),
          name,
          admin,
          active,
          isERC20: false,
          allowedTokens: [],
          tokenWeights: [],
          projectAdditionFeeToken: "0x0000000000000000000000000000000000000000",
          projectAdditionFeeAmount: 0n
        };
      }
      
    } catch (error) {
      console.error(`❌ Failed to get campaign ${campaignId}:`, error.message);
      throw error;
    }
  }

  private async getProjectDetails(projectId: number) {
    console.log(`\n🔍 Getting details for Project ${projectId}...`);
    
    try {
      const projectData = encodeFunctionData({
        abi: PROJECTS_MODULE_ABI.abi,
        functionName: "getProject",
        args: [BigInt(projectId)]
      });
      
      const projectResult = await this.publicClient.readContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI.abi,
        functionName: "staticCallModule",
        args: ["projects", projectData],
      });
      
      const [owner, name, description, status, active, createdAt, updatedAt] = decodeAbiParameters(
        [
          { type: "address" }, // owner
          { type: "string" },  // name
          { type: "string" },  // description
          { type: "uint8" },   // status (enum)
          { type: "bool" },    // active
          { type: "uint256" }, // createdAt
          { type: "uint256" }  // updatedAt
        ],
        projectResult
      );
      
      console.log(`📋 Project ${projectId} Details:`);
      console.log(`   Name: "${name}"`);
      console.log(`   Owner: ${owner}`);
      console.log(`   Active: ${active}`);
      console.log(`   Status: ${status}`);
      console.log(`   Created: ${new Date(Number(createdAt) * 1000).toISOString()}`);
      console.log(`   Updated: ${new Date(Number(updatedAt) * 1000).toISOString()}`);
      
      return {
        id: BigInt(projectId),
        name,
        owner: owner.toLowerCase(),
        active
      };
      
    } catch (error) {
      console.error(`❌ Failed to get project ${projectId}:`, error.message);
      throw error;
    }
  }

  private async checkProjectInCampaign(campaignId: number, projectId: number) {
    console.log(`\n🔍 Checking if Project ${projectId} is in Campaign ${campaignId}...`);
    
    try {
      const isInCampaignData = encodeFunctionData({
        abi: VOTING_MODULE_ABI.abi,
        functionName: "isProjectInCampaign",
        args: [BigInt(campaignId), BigInt(projectId)],
      });
      
      const isInCampaignResult = await this.publicClient.readContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI.abi,
        functionName: "staticCallModule",
        args: ["voting", isInCampaignData],
      });
      
      const isInCampaign = decodeAbiParameters([{ type: "bool" }], isInCampaignResult)[0];
      console.log(`   📊 Project ${projectId} is in Campaign ${campaignId}: ${isInCampaign}`);
      
      if (isInCampaign) {
        // Get participation details
        const participationData = encodeFunctionData({
          abi: VOTING_MODULE_ABI.abi,
          functionName: "getParticipationWithPosition",
          args: [BigInt(campaignId), BigInt(projectId)],
        });
        
        const participationResult = await this.publicClient.readContract({
          address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI.abi,
          functionName: "staticCallModule",
          args: ["voting", participationData],
        });
        
        const [approved, voteCount, votingPower, fundsReceived, uniqueVoters, currentPosition, previousPosition, positionChange, percentageChange, isRising] = decodeAbiParameters(
          [
            { type: "bool" },    // approved
            { type: "uint256" }, // voteCount
            { type: "uint256" }, // votingPower
            { type: "uint256" }, // fundsReceived
            { type: "uint256" }, // uniqueVoters
            { type: "uint256" }, // currentPosition
            { type: "uint256" }, // previousPosition
            { type: "uint256" }, // positionChange
            { type: "uint256" }, // percentageChange
            { type: "bool" }     // isRising
          ],
          participationResult
        );
        
        console.log(`   📊 Participation Status:`);
        console.log(`      Approved: ${approved}`);
        console.log(`      Vote Count: ${voteCount}`);
        console.log(`      Voting Power: ${votingPower}`);
        console.log(`      Funds Received: ${fundsReceived}`);
        console.log(`      Unique Voters: ${uniqueVoters}`);
        console.log(`      Current Position: ${currentPosition}`);
      }
      
      return isInCampaign;
      
    } catch (error) {
      console.error(`❌ Failed to check project in campaign:`, error.message);
      return false;
    }
  }

  private async addProjectToCampaign(campaign: any, project: any) {
    console.log(`\n💰 Adding Project ${project.id} to Campaign ${campaign.id}...`);
    
    try {
      let wallet: any;
      let account: any;
      let walletClient: any;
      
      // Check if project owner is the contract address (migration issue)
      if (project.owner === this.deployment.record.contracts.sovereignSeasV5.toLowerCase()) {
        console.log(`   ⚠️  Project owner is the contract address - this is likely a migration issue`);
        console.log(`   🔧 Using campaign admin wallet instead for project addition`);
        
        // Use campaign admin wallet (first wallet) for this edge case
        wallet = this.wallets[0];
        account = privateKeyToAccount(wallet.privateKey as `0x${string}`);
        walletClient = createWalletClient({
          chain: celoAlfajores,
          transport: http("https://alfajores-forno.celo-testnet.org"),
          account,
        });
        
        console.log(`   👤 Using campaign admin wallet: ${wallet.address}`);
      } else {
        // Find a wallet that can pay the fee (use project owner or first wallet)
        wallet = this.wallets.find(w => w.address.toLowerCase() === project.owner) || this.wallets[0];
        account = privateKeyToAccount(wallet.privateKey as `0x${string}`);
        walletClient = createWalletClient({
          chain: celoAlfajores,
          transport: http("https://alfajores-forno.celo-testnet.org"),
          account,
        });
        
        console.log(`   👤 Using wallet: ${wallet.address}`);
      }
      
      // Determine fee token and amount
      let feeToken: string;
      let feeAmount: bigint;
      let value: bigint = 0n;
      
      if (campaign.isERC20 && campaign.projectAdditionFeeToken && campaign.projectAdditionFeeToken !== "0x0000000000000000000000000000000000000000") {
        // ERC20 campaign - pay fee in ERC20 tokens
        feeToken = campaign.projectAdditionFeeToken;
        feeAmount = campaign.projectAdditionFeeAmount;
        
        console.log(`   💰 ERC20 Campaign - Fee: ${feeAmount} tokens of ${feeToken}`);
        
        // Approve ERC20 tokens first
        console.log(`   🔐 Approving ${feeAmount} ERC20 tokens for project addition...`);
        const approveHash = await walletClient.writeContract({
          address: feeToken as `0x${string}`,
          abi: SEASTOKEN_ABI.abi,
          functionName: "approve",
          args: [this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`, feeAmount],
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
        console.log(`   ✅ ERC20 tokens approved`);
        
      } else {
        // CELO campaign - pay fee in CELO
        feeToken = "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9"; // CELO token address
        feeAmount = parseEther("0.0001"); // Small CELO fee
        value = feeAmount;
        
        console.log(`   💰 CELO Campaign - Fee: ${feeAmount} CELO`);
      }
      
      // Add project to campaign
      console.log(`   📝 Calling addProjectToCampaign with:`);
      console.log(`      Campaign ID: ${campaign.id}`);
      console.log(`      Project ID: ${project.id}`);
      console.log(`      Fee Token: ${feeToken}`);
      console.log(`      Fee Amount: ${feeAmount}`);
      console.log(`      Value: ${value}`);
      
      const addProjectData = encodeFunctionData({
        abi: VOTING_MODULE_ABI.abi,
        functionName: "addProjectToCampaign",
        args: [campaign.id, project.id, feeToken],
      });
      
      const addProjectHash = await walletClient.writeContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI.abi,
        functionName: "callModule",
        args: ["voting", addProjectData],
        value,
      });
      
      console.log(`   ⏳ Adding project transaction: ${addProjectHash}`);
      await this.publicClient.waitForTransactionReceipt({ hash: addProjectHash });
      console.log(`   ✅ Project ${project.id} added to campaign ${campaign.id}`);
      
      return true;
      
    } catch (error) {
      console.error(`   ❌ Failed to add project to campaign:`, error.message);
      console.error(`   🔍 Full error:`, error);
      return false;
    }
  }

  private async approveProject(campaign: any, project: any) {
    console.log(`\n🔐 Approving Project ${project.id} in Campaign ${campaign.id}...`);
    
    try {
      // Use campaign creator wallet (first wallet) for approval
      const campaignCreatorAccount = privateKeyToAccount(this.wallets[0].privateKey as `0x${string}`);
      const campaignCreatorClient = createWalletClient({
        chain: celoAlfajores,
        transport: http("https://alfajores-forno.celo-testnet.org"),
        account: campaignCreatorAccount,
      });
      
      const approveData = encodeFunctionData({
        abi: VOTING_MODULE_ABI.abi,
        functionName: "approveProject",
        args: [campaign.id, project.id],
      });
      
      const approveHash = await campaignCreatorClient.writeContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI.abi,
        functionName: "callModule",
        args: ["voting", approveData],
      });
      
      console.log(`   ⏳ Approval transaction: ${approveHash}`);
      await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
      console.log(`   ✅ Project ${project.id} approved in campaign ${campaign.id}`);
      
      return true;
      
    } catch (error) {
      console.error(`   ❌ Failed to approve project:`, error.message);
      console.error(`   🔍 Full error:`, error);
      return false;
    }
  }

  private async voteForProject(campaign: any, project: any) {
    console.log(`\n🗳️  Voting for Project ${project.id} in Campaign ${campaign.id}...`);
    
    try {
      // Use first wallet for voting
      const wallet = this.wallets[0];
      const account = privateKeyToAccount(wallet.privateKey as `0x${string}`);
      const walletClient = createWalletClient({
        chain: celoAlfajores,
        transport: http("https://alfajores-forno.celo-testnet.org"),
        account,
      });
      
      console.log(`   👤 Using wallet: ${wallet.address}`);
      
      // Determine voting power based on campaign type
      let votingPower: bigint;
      let value: bigint = 0n;
      
      if (campaign.isERC20 && campaign.allowedTokens.length > 0) {
        // ERC20 campaign - voting power based on token balance
        const balanceResult = await this.publicClient.readContract({
          address: campaign.allowedTokens[0] as `0x${string}`,
          abi: SEASTOKEN_ABI.abi,
          functionName: "balanceOf",
          args: [wallet.address as `0x${string}`],
        });
        
        votingPower = BigInt(balanceResult as string);
        console.log(`   💰 ERC20 balance: ${votingPower} tokens`);
        
        // For ERC20 voting, we need to approve the tokens first
        if (votingPower > 0n) {
          console.log(`   🔐 Approving ${votingPower} ERC20 tokens for voting...`);
          const approveHash = await walletClient.writeContract({
            address: campaign.allowedTokens[0] as `0x${string}`,
            abi: SEASTOKEN_ABI.abi,
            functionName: "approve",
            args: [this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`, votingPower],
          });
          
          await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
          console.log(`   ✅ ERC20 tokens approved for voting`);
        }
        
      } else {
        // CELO campaign - voting power based on CELO balance
        const balance = await this.publicClient.getBalance({ address: wallet.address as `0x${string}` });
        votingPower = balance;
        console.log(`   💰 CELO balance: ${Number(balance) / 1e18} CELO`);
      }
      
      if (votingPower === 0n) {
        console.log(`   ⚠️  No voting power available for wallet ${wallet.address}`);
        return false;
      }
      
      // Vote for the project
      let voteFunctionName: string;
      let voteArgs: any[];
      
      if (campaign.isERC20 && campaign.allowedTokens.length > 0) {
        // ERC20 campaign - use vote function with token address
        voteFunctionName = "vote";
        voteArgs = [campaign.id, project.id, campaign.allowedTokens[0], votingPower];
        console.log(`   🗳️  Voting with ERC20 token: ${campaign.allowedTokens[0]}, amount: ${votingPower}`);
      } else {
        // CELO campaign - use voteWithCelo function
        voteFunctionName = "voteWithCelo";
        voteArgs = [campaign.id, project.id];
        value = votingPower; // Send CELO as value
        console.log(`   🗳️  Voting with CELO, amount: ${votingPower}`);
      }
      
      const voteData = encodeFunctionData({
        abi: VOTING_MODULE_ABI.abi,
        functionName: voteFunctionName,
        args: voteArgs,
      });
      
      const voteHash = await walletClient.writeContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI.abi,
        functionName: "callModule",
        args: ["voting", voteData],
        value,
      });
      
      console.log(`   ⏳ Voting transaction: ${voteHash}`);
      await this.publicClient.waitForTransactionReceipt({ hash: voteHash });
      console.log(`   ✅ Successfully voted for project ${project.id} with ${votingPower} voting power`);
      
      return true;
      
    } catch (error) {
      console.error(`   ❌ Failed to vote for project:`, error.message);
      console.error(`   🔍 Full error:`, error);
      return false;
    }
  }

  async run() {
    try {
      await this.initialize();
      
      const campaignId = 5;
      const projectId = 14;
      
      console.log(`\n🎯 Debugging Campaign ${campaignId} and Project ${projectId}`);
      console.log("=".repeat(60));
      
      // Get campaign details
      const campaign = await this.getCampaignDetails(campaignId);
      
      // Get project details
      const project = await this.getProjectDetails(projectId);
      
      // Check if project is already in campaign
      const isInCampaign = await this.checkProjectInCampaign(campaignId, projectId);
      
      if (!isInCampaign) {
        // Try to add project to campaign
        const added = await this.addProjectToCampaign(campaign, project);
        
        if (added) {
          // Try to approve project
          const approved = await this.approveProject(campaign, project);
          
          if (approved) {
            // Try to vote for project
            await this.voteForProject(campaign, project);
          } else {
            console.log(`   ❌ Cannot vote - project approval failed`);
          }
        } else {
          console.log(`   ❌ Cannot proceed - project addition failed`);
        }
      } else {
        console.log(`\n✅ Project ${projectId} is already in campaign ${campaignId}`);
        
        // Check if project is approved before voting
        const participationData = encodeFunctionData({
          abi: VOTING_MODULE_ABI.abi,
          functionName: "getParticipationWithPosition",
          args: [BigInt(campaignId), BigInt(projectId)],
        });
        
        const participationResult = await this.publicClient.readContract({
          address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI.abi,
          functionName: "staticCallModule",
          args: ["voting", participationData],
        });
        
        const [approved, voteCount, votingPower, fundsReceived, uniqueVoters, currentPosition, previousPosition, positionChange, percentageChange, isRising] = decodeAbiParameters(
          [
            { type: "bool" },    // approved
            { type: "uint256" }, // voteCount
            { type: "uint256" }, // votingPower
            { type: "uint256" }, // fundsReceived
            { type: "uint256" }, // uniqueVoters
            { type: "uint256" }, // currentPosition
            { type: "uint256" }, // previousPosition
            { type: "uint256" }, // positionChange
            { type: "uint256" }, // percentageChange
            { type: "bool" }     // isRising
          ],
          participationResult
        );
        
        console.log(`   📊 Current Participation Status:`);
        console.log(`      Approved: ${approved}`);
        console.log(`      Vote Count: ${voteCount}`);
        console.log(`      Voting Power: ${votingPower}`);
        
        if (approved) {
          console.log(`   ✅ Project is approved - proceeding to vote`);
          await this.voteForProject(campaign, project);
        } else {
          console.log(`   ⚠️  Project is NOT approved - attempting to approve first`);
          const approved = await this.approveProject(campaign, project);
          
          if (approved) {
            console.log(`   ✅ Project approved - proceeding to vote`);
            await this.voteForProject(campaign, project);
          } else {
            console.log(`   ❌ Cannot vote - project approval failed`);
          }
        }
      }
      
      console.log("\n" + "=".repeat(60));
      console.log("🎉 Debug test completed!");
      console.log("=".repeat(60));
      
    } catch (error) {
      console.error("❌ Debug test failed:", error);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const debug = new DebugSingleCampaign();
  await debug.run();
}

if (require.main === module) {
  main().catch(console.error);
}

export { DebugSingleCampaign };
