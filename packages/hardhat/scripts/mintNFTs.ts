import { ethers } from "hardhat";
import * as dotenv from 'dotenv';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';

dotenv.config();

// Configuration
const CONFIG = {
  SOVEREIGN_SEAS_V4_ADDRESS: process.env.SOVEREIGN_SEAS_V4_ADDRESS,
  NFT_CONTRACT_ADDRESS: process.env.SOVEREIGN_SEAS_NFT_ADDRESS,
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  RPC_URL: process.env.CELO_RPC_URL || 'https://rpc.ankr.com/celo',
  PINATA_API_KEY: process.env.PINATA_API_KEY,
  PINATA_SECRET: process.env.PINATA_SECRET,
};

// NFT Types and Tiers
const NFTType = {
  PROJECT: 0,
  CAMPAIGN: 1,
  ACHIEVEMENT: 2,
  MILESTONE: 3
};

const NFTTier = {
  BASIC: 0,
  SUPPORTER: 1
};

// Project data structure
interface ProjectData {
  id: number;
  owner: string;
  name: string;
  description: string;
  transferrable: boolean;
  active: boolean;
  createdAt: number;
  campaignIds: number[];
  bio: string;
  contractInfo: string;
  additionalData: string;
  contracts: string[];
}

interface ParsedProjectData {
  tagline: string;
  category: string;
  tags: string[];
  location: string;
  website: string;
  projectType: string;
  maturityLevel: string;
  status: string;
  logo: string;
  social: any;
  keyFeatures: string[];
  techStack: string[];
  blockchain: string;
  contactEmail: string;
  teamMembers: string[];
}

class Project {
  public parsedData: ParsedProjectData;

  constructor(
    public basicData: any,
    public metadata: any
  ) {
    this.parsedData = this.extractParsedData();
  }

  private parseJSON(jsonString: string): any {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn(`Failed to parse JSON: ${error}`);
      return {};
    }
  }

  private extractParsedData(): ParsedProjectData {
    const bioData = this.parseJSON(this.metadata.bio);
    const contractInfo = this.parseJSON(this.metadata.contractInfo);
    const additional = this.parseJSON(this.metadata.additionalData);

    return {
      tagline: bioData.tagline || '',
      category: bioData.category || 'Unknown',
      tags: bioData.tags || [],
      location: bioData.location || '',
      website: bioData.website || '',
      projectType: bioData.projectType || 'dapp',
      maturityLevel: bioData.maturityLevel || 'early',
      status: bioData.status || 'active',
      logo: additional.logo || '',
      social: additional.social || {},
      keyFeatures: additional.keyFeatures || [],
      techStack: contractInfo.techStack || [],
      blockchain: contractInfo.blockchain || 'Celo',
      contactEmail: additional.contactEmail || '',
      teamMembers: additional.teamMembers || [],
    };
  }

  generateNFTMetadata(nftType: 'basic' | 'supporter' = 'supporter') {
    const isSupporter = nftType === 'supporter';
    
    return {
      name: isSupporter ? `${this.basicData.name} Supporter Badge` : `${this.basicData.name} Contributor NFT`,
      description: isSupporter 
        ? `Official supporter badge for ${this.basicData.name}. ${this.basicData.description.substring(0, 100)}...`
        : `Contributor NFT for ${this.basicData.name} project. ${this.basicData.description.substring(0, 100)}...`,
      
      image: this.parsedData.logo || `https://api.dicebear.com/7.x/shapes/svg?seed=${this.basicData.name}`,
      
      attributes: [
        { trait_type: "Project ID", value: this.basicData.id },
        { trait_type: "Project Name", value: this.basicData.name },
        { trait_type: "Category", value: this.parsedData.category },
        { trait_type: "Type", value: isSupporter ? "Supporter" : "Contributor" },
        { trait_type: "Blockchain", value: this.parsedData.blockchain },
        { trait_type: "Project Type", value: this.parsedData.projectType },
        { trait_type: "Maturity Level", value: this.parsedData.maturityLevel },
        { trait_type: "Status", value: this.parsedData.status },
        { trait_type: "Created At", value: new Date(this.basicData.createdAt * 1000).toISOString() },
        ...(this.parsedData.tags.length > 0 ? [{ trait_type: "Tags", value: this.parsedData.tags.join(", ") }] : []),
        ...(this.parsedData.location ? [{ trait_type: "Location", value: this.parsedData.location }] : []),
      ],
      
      external_url: this.parsedData.website,
      background_color: this.generateColorFromName(this.basicData.name),
      
      project: {
        id: this.basicData.id,
        owner: this.basicData.owner,
        name: this.basicData.name,
        category: this.parsedData.category,
        blockchain: this.parsedData.blockchain,
        techStack: this.parsedData.techStack,
        keyFeatures: this.parsedData.keyFeatures,
        social: this.parsedData.social,
        contracts: this.metadata.contracts
      }
    };
  }

  private generateColorFromName(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = Math.abs(hash).toString(16).substring(0, 6);
    return color.padEnd(6, '0');
  }
}

class SovereignSeasNFTMinter {
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;
  private sovereignSeasContract: ethers.Contract;
  private nftContract: ethers.Contract;

  constructor() {
    if (!CONFIG.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }
    if (!CONFIG.SOVEREIGN_SEAS_V4_ADDRESS) {
      throw new Error("SOVEREIGN_SEAS_V4_ADDRESS environment variable is required");
    }
    if (!CONFIG.NFT_CONTRACT_ADDRESS) {
      throw new Error("SOVEREIGN_SEAS_NFT_ADDRESS environment variable is required");
    }

    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, this.provider);
    
    this.sovereignSeasContract = new ethers.Contract(
      CONFIG.SOVEREIGN_SEAS_V4_ADDRESS,
      [
        "function getProject(uint256 _projectId) external view returns (uint256 id, address owner, string memory name, string memory description, bool transferrable, bool active, uint256 createdAt, uint256[] memory campaignIds)",
        "function getProjectMetadata(uint256 _projectId) external view returns (string memory bio, string memory contractInfo, string memory additionalData, address[] memory contracts)",
        "function getProjectCount() external view returns (uint256)",
        "function superAdmins(address _admin) external view returns (bool)"
      ],
      this.wallet
    );
    
    this.nftContract = new ethers.Contract(
      CONFIG.NFT_CONTRACT_ADDRESS,
      [
        "function mintBasicNFT(address _to, string memory _tokenURI, uint8 _nftType, uint256 _relatedId, string memory _category, string memory _description, bool _isLimited, uint256 _maxSupply) external payable",
        "function mintSupporterNFT(address _to, string memory _tokenURI, uint8 _nftType, uint256 _relatedId, string memory _category, string memory _description, bool _isLimited, uint256 _maxSupply) external payable",
        "function basicMintPrice() external view returns (uint256)",
        "function supporterMintPrice() external view returns (uint256)",
        "function getNFTsByRelatedId(uint256 _relatedId, uint8 _nftType) external view returns (uint256[] memory)",
        "function getNFTMetadata(uint256 _tokenId) external view returns (tuple(uint8 nftType, uint8 tier, uint256 relatedId, address creator, uint256 mintedAt, string category, string description, bool isLimited, uint256 maxSupply, uint256 currentSupply, uint256 mintPrice))"
      ],
      this.wallet
    );
  }

  async getProject(projectId: number): Promise<Project> {
    try {
      console.log(`📖 Fetching project ${projectId} data...`);
      
      const [basicData, metadata] = await Promise.all([
        this.sovereignSeasContract.getProject(projectId),
        this.sovereignSeasContract.getProjectMetadata(projectId)
      ]);
      
      const project = new Project(basicData, metadata);
      
      console.log(`✅ Project loaded: ${project.basicData.name}`);
      console.log(`   Owner: ${project.basicData.owner}`);
      console.log(`   Category: ${project.parsedData.category}`);
      console.log(`   Status: ${project.parsedData.status}`);
      console.log(`   Active: ${project.basicData.active}`);
      
      return project;
      
    } catch (error) {
      console.error(`❌ Error fetching project ${projectId}:`, error);
      throw error;
    }
  }

  async getAllProjects(): Promise<Project[]> {
    try {
      console.log("📚 Fetching all projects...");
      
      const projectCount = await this.sovereignSeasContract.getProjectCount();
      const totalProjects = Number(projectCount);
      
      console.log(`📊 Total projects: ${totalProjects}`);
      
      const projects: Project[] = [];
      for (let i = 0; i < totalProjects; i++) {
        try {
          const project = await this.getProject(i);
          projects.push(project);
        } catch (error) {
          console.warn(`⚠️ Could not load project ${i}:`, error);
        }
      }
      
      return projects;
    } catch (error) {
      console.error("❌ Error fetching all projects:", error);
      throw error;
    }
  }

  async getProjectNFTs(projectId: number): Promise<number[]> {
    try {
      const nfts = await this.nftContract.getNFTsByRelatedId(projectId, NFTType.PROJECT);
      return nfts.map((id: bigint) => Number(id));
    } catch (error) {
      console.warn(`Could not fetch NFTs for project ${projectId}:`, error);
      return [];
    }
  }

  async uploadMetadataToIPFS(metadata: any): Promise<string> {
    if (!CONFIG.PINATA_API_KEY || !CONFIG.PINATA_SECRET) {
      throw new Error("PINATA_API_KEY and PINATA_SECRET are required for IPFS upload");
    }

    try {
      console.log(`📤 Uploading metadata to IPFS...`);
      
      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': CONFIG.PINATA_API_KEY,
          'pinata_secret_api_key': CONFIG.PINATA_SECRET,
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      const ipfsUrl = `https://ipfs.io/ipfs/${result.IpfsHash}`;
      
      console.log(`   IPFS Hash: ${result.IpfsHash}`);
      console.log(`   IPFS URL: ${ipfsUrl}`);
      
      return ipfsUrl;
      
    } catch (error) {
      console.error("❌ IPFS upload failed:", error);
      throw error;
    }
  }

  async mintProjectSupporterNFT(projectId: number, recipient: string, customMetadata?: any) {
    try {
      console.log(`\n💎 Minting Supporter NFT for Project ${projectId}...`);
      
      // Get project data
      const project = await this.getProject(projectId);
      
      if (!project.basicData.active) {
        throw new Error(`Project ${projectId} is not active`);
      }
      
      // Generate or use custom metadata
      const metadata = customMetadata || project.generateNFTMetadata('supporter');
      const tokenURI = await this.uploadMetadataToIPFS(metadata);
      
      // Get supporter mint price
      const supporterPrice = await this.nftContract.supporterMintPrice();
      console.log(`💰 Supporter NFT Price: ${ethers.formatEther(supporterPrice)} CELO`);
      
      // Mint the NFT
      const tx = await this.nftContract.mintSupporterNFT(
        recipient,
        tokenURI,
        NFTType.PROJECT,
        projectId,
        project.parsedData.category,
        `Supporter NFT for ${project.basicData.name}`,
        false, // not limited
        0, // no max supply
        {
          value: supporterPrice,
          gasLimit: 500000
        }
      );
      
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      
      console.log(`✅ Supporter NFT minted successfully!`);
      console.log(`   Transaction: https://celoscan.io/tx/${tx.hash}`);
      console.log(`   Gas used: ${receipt?.gasUsed}`);
      
      // Revenue distribution info
      console.log(`\n💰 Revenue Distribution (${ethers.formatEther(supporterPrice)} CELO):`);
      console.log(`   Project Owner (75%): ${ethers.formatEther(supporterPrice * 75n / 100n)} CELO → ${project.basicData.owner}`);
      console.log(`   Contract Admin (20%): ${ethers.formatEther(supporterPrice * 20n / 100n)} CELO`);
      console.log(`   Unallocated (5%): ${ethers.formatEther(supporterPrice * 5n / 100n)} CELO`);
      
      return {
        success: true,
        txHash: tx.hash,
        receipt,
        metadata,
        tokenURI,
        project
      };
      
    } catch (error) {
      console.error(`❌ Error minting supporter NFT for project ${projectId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async mintProjectBasicNFT(projectId: number, recipient: string, customMetadata?: any) {
    try {
      console.log(`\n🔑 Minting Basic NFT for Project ${projectId}...`);
      
      // Get project data
      const project = await this.getProject(projectId);
      
      if (!project.basicData.active) {
        throw new Error(`Project ${projectId} is not active`);
      }
      
      // Generate metadata
      const metadata = customMetadata || project.generateNFTMetadata('basic');
      const tokenURI = await this.uploadMetadataToIPFS(metadata);
      
      // Get basic mint price
      const basicPrice = await this.nftContract.basicMintPrice();
      console.log(`💰 Basic NFT Price: ${ethers.formatEther(basicPrice)} CELO`);
      
      // Mint the NFT
      const tx = await this.nftContract.mintBasicNFT(
        recipient,
        tokenURI,
        NFTType.PROJECT,
        projectId,
        project.parsedData.category,
        `Basic NFT for ${project.basicData.name}`,
        false, // not limited
        0, // no max supply
        {
          value: basicPrice,
          gasLimit: 500000
        }
      );
      
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      
      console.log(`✅ Basic NFT minted successfully!`);
      console.log(`   Transaction: https://celoscan.io/tx/${tx.hash}`);
      console.log(`   Gas used: ${receipt?.gasUsed}`);
      
      return {
        success: true,
        txHash: tx.hash,
        receipt,
        metadata,
        tokenURI,
        project
      };
      
    } catch (error) {
      console.error(`❌ Error minting basic NFT for project ${projectId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async getContractInfo() {
    try {
      const [
        projectCount,
        basicPrice,
        supporterPrice,
        isSuperAdmin
      ] = await Promise.all([
        this.sovereignSeasContract.getProjectCount(),
        this.nftContract.basicMintPrice(),
        this.nftContract.supporterMintPrice(),
        this.sovereignSeasContract.superAdmins(this.wallet.address)
      ]);
      
      return {
        projectCount: Number(projectCount),
        basicPrice: ethers.formatEther(basicPrice),
        supporterPrice: ethers.formatEther(supporterPrice),
        walletAddress: this.wallet.address,
        isSuperAdmin: isSuperAdmin
      };
    } catch (error) {
      console.error("Error getting contract info:", error);
      return null;
    }
  }
}

// Main execution function
async function main() {
  try {
    console.log("🚀 SovereignSeas NFT Minter Starting...");
    console.log("=".repeat(60));
    
    const minter = new SovereignSeasNFTMinter();
    
    // Display contract info
    console.log("📋 Contract Information:");
    const info = await minter.getContractInfo();
    if (info) {
      console.log(`   SovereignSeas Contract: ${CONFIG.SOVEREIGN_SEAS_V4_ADDRESS}`);
      console.log(`   NFT Contract: ${CONFIG.NFT_CONTRACT_ADDRESS}`);
      console.log(`   Total Projects: ${info.projectCount}`);
      console.log(`   Basic NFT Price: ${info.basicPrice} CELO`);
      console.log(`   Supporter NFT Price: ${info.supporterPrice} CELO`);
      console.log(`   Wallet: ${info.walletAddress}`);
      console.log(`   Super Admin: ${info.isSuperAdmin ? '✅' : '❌'}`);
    }
    
    // Example operations
    const projectId = 0; // Project ID to work with
    const recipient = minter.wallet.address; // Mint to self for demo
    
    // 1. Get specific project data
    console.log(`\n📖 Loading Project ${projectId}...`);
    const project = await minter.getProject(projectId);
    
    // Display project info
    console.log(`\n📊 Project ${projectId} Details:`);
    console.log(`   Name: ${project.basicData.name}`);
    console.log(`   Owner: ${project.basicData.owner}`);
    console.log(`   Category: ${project.parsedData.category}`);
    console.log(`   Blockchain: ${project.parsedData.blockchain}`);
    console.log(`   Tags: ${project.parsedData.tags.join(', ')}`);
    console.log(`   Active: ${project.basicData.active}`);
    console.log(`   Campaigns: ${project.basicData.campaignIds.length}`);
    
    // 2. Check existing NFTs
    const existingNFTs = await minter.getProjectNFTs(projectId);
    console.log(`   Existing NFTs: ${existingNFTs.length}`);
    
    // 3. Mint supporter NFT (anyone can mint)
    console.log(`\n💎 Minting Supporter NFT for Project ${projectId}...`);
    const supporterResult = await minter.mintProjectSupporterNFT(projectId, recipient);
    
    if (supporterResult.success) {
      console.log(`✅ Supporter NFT minted successfully!`);
    } else {
      console.log(`❌ Supporter NFT minting failed: ${supporterResult.error}`);
    }
    
    // 4. Mint basic NFT (requires authorization)
    console.log(`\n🔑 Minting Basic NFT for Project ${projectId}...`);
    const basicResult = await minter.mintProjectBasicNFT(projectId, recipient);
    
    if (basicResult.success) {
      console.log(`✅ Basic NFT minted successfully!`);
    } else {
      console.log(`❌ Basic NFT minting failed: ${basicResult.error}`);
    }
    
    // 5. Example: Get all projects and their stats
    console.log(`\n📚 Loading All Projects Summary...`);
    const allProjects = await minter.getAllProjects();
    
    console.log(`\n📈 Projects Summary:`);
    allProjects.forEach(proj => {
      console.log(`   ${proj.basicData.id}: ${proj.basicData.name} (${proj.parsedData.category}) - ${proj.basicData.active ? 'Active' : 'Inactive'}`);
    });
    
    console.log(`\n✅ Script completed successfully!`);
    
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }
}

// Export for use as module
export { SovereignSeasNFTMinter, Project, NFTType, NFTTier };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
} 