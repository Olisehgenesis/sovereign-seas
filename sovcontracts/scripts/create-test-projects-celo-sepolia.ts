import { network } from "hardhat";
import { getAddress } from "viem";

/**
 * Script to create 10 test projects with rich metadata on Celo Sepolia
 * 
 * Usage:
 *   pnpm run create:test-projects:celo-sepolia
 * 
 * Requirements:
 *   - CELO_SEPOLIA_PRIVATE_KEY or PRIVATE_KEY environment variable set
 *   - Contract deployed at: 0x73Ac3CE3358a892f69238C7009CA4da4b0dd1470
 * 
 * This script creates 10 diverse projects with complete metadata including:
 * - Basic information (name, description, tagline, category, tags)
 * - Media & links (logo, demo video, website, social media)
 * - Technical details (tech stack, blockchain, smart contracts)
 * - Team information
 * - Milestones and roadmap
 * - Project metrics and status
 * 
 * All projects will be owned by the wallet address used to run the script.
 */

// Celo Sepolia contract address
const CELO_SEPOLIA_CONTRACT_ADDRESS = "0x73Ac3CE3358a892f69238C7009CA4da4b0dd1470";

// Sample project data with rich metadata
const PROJECT_TEMPLATES = [
  {
    name: "DeFi Yield Optimizer",
    description: "An advanced DeFi protocol that automatically optimizes yield farming strategies across multiple chains, maximizing returns while minimizing risks.",
    bio: JSON.stringify({
      tagline: "Maximize Your DeFi Yields Automatically",
      category: "DeFi",
      tags: ["yield-farming", "defi", "automation", "multi-chain"],
      location: "Global",
      establishedDate: "2024-01-15",
      website: "https://defiyield.example.com",
      logo: "https://example.com/logos/defiyield.png",
      demoVideo: "https://youtube.com/watch?v=example1",
      demoUrl: "https://demo.defiyield.example.com",
      githubRepo: "https://github.com/defiyield/protocol",
      karmaGapProfile: "https://karmagap.com/defiyield",
      documentation: "https://docs.defiyield.example.com",
      twitter: "https://twitter.com/defiyield",
      linkedin: "https://linkedin.com/company/defiyield",
      discord: "https://discord.gg/defiyield",
      telegram: "https://t.me/defiyield",
      youtube: "https://youtube.com/@defiyield",
      contactEmail: "contact@defiyield.example.com",
      businessEmail: "business@defiyield.example.com",
      techStack: ["Solidity", "TypeScript", "React", "Node.js"],
      blockchain: "Celo",
      smartContracts: [],
      license: "MIT",
      developmentStage: "production",
      keyFeatures: ["Auto-compounding", "Risk management", "Multi-chain support"],
      innovation: "First automated yield optimizer on Celo",
      useCases: ["Yield farming", "Liquidity provision", "Staking"],
      targetAudience: "DeFi enthusiasts and liquidity providers",
      status: "active",
      launchDate: "2024-02-01",
      userCount: "1250",
      transactionVolume: "5000000",
      tvl: "2500000",
      projectType: "dapp",
      maturityLevel: "production",
      openSource: true,
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      tokenContract: "0x0000000000000000000000000000000000000000",
      governanceContract: "0x0000000000000000000000000000000000000000",
      network: "Celo Sepolia",
      chainId: 11142220,
    }),
    additionalData: JSON.stringify({
      teamMembers: [
        {
          name: "Alice Developer",
          role: "Founder & Lead Developer",
          email: "alice@defiyield.example.com",
          linkedin: "https://linkedin.com/in/alice",
          twitter: "https://twitter.com/alice",
        },
      ],
      milestones: [
        {
          title: "MVP Launch",
          description: "Initial protocol deployment",
          targetDate: "2024-02-01",
          status: "completed",
        },
        {
          title: "Multi-chain Support",
          description: "Add support for Ethereum and Polygon",
          targetDate: "2024-06-01",
          status: "in-progress",
        },
      ],
      auditReports: [],
      kycCompliant: false,
      regulatoryCompliance: [],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "NFT Marketplace Pro",
    description: "A next-generation NFT marketplace with advanced trading features, royalties management, and cross-chain compatibility.",
    bio: JSON.stringify({
      tagline: "The Future of NFT Trading",
      category: "NFT",
      tags: ["nft", "marketplace", "trading", "royalties"],
      location: "San Francisco, USA",
      establishedDate: "2023-11-20",
      website: "https://nftmarketpro.example.com",
      logo: "https://example.com/logos/nftmarket.png",
      demoVideo: "https://youtube.com/watch?v=example2",
      demoUrl: "https://demo.nftmarketpro.example.com",
      githubRepo: "https://github.com/nftmarketpro/platform",
      karmaGapProfile: "https://karmagap.com/nftmarketpro",
      documentation: "https://docs.nftmarketpro.example.com",
      twitter: "https://twitter.com/nftmarketpro",
      linkedin: "https://linkedin.com/company/nftmarketpro",
      discord: "https://discord.gg/nftmarketpro",
      telegram: "https://t.me/nftmarketpro",
      contactEmail: "hello@nftmarketpro.example.com",
      techStack: ["Solidity", "Next.js", "IPFS", "Web3.js"],
      blockchain: "Celo",
      smartContracts: [],
      license: "Apache-2.0",
      developmentStage: "production",
      keyFeatures: ["Royalty management", "Bulk trading", "Cross-chain"],
      innovation: "First marketplace with automatic royalty distribution",
      useCases: ["NFT trading", "Digital art", "Collectibles"],
      targetAudience: "NFT creators and collectors",
      status: "active",
      launchDate: "2024-01-10",
      userCount: "850",
      transactionVolume: "1200000",
      tvl: "500000",
      projectType: "dapp",
      maturityLevel: "production",
      openSource: true,
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      marketplaceContract: "0x0000000000000000000000000000000000000000",
      network: "Celo Sepolia",
      chainId: 11142220,
    }),
    additionalData: JSON.stringify({
      teamMembers: [
        {
          name: "Bob Creator",
          role: "CEO & Co-founder",
          email: "bob@nftmarketpro.example.com",
        },
      ],
      milestones: [
        {
          title: "Beta Launch",
          description: "Public beta release",
          targetDate: "2024-01-10",
          status: "completed",
        },
      ],
      auditReports: [],
      kycCompliant: false,
      regulatoryCompliance: [],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "DAO Governance Platform",
    description: "A comprehensive DAO governance platform enabling decentralized decision-making, voting, and treasury management.",
    bio: JSON.stringify({
      tagline: "Empower Your Community with Decentralized Governance",
      category: "DAO",
      tags: ["dao", "governance", "voting", "treasury"],
      location: "Remote",
      establishedDate: "2023-09-05",
      website: "https://daogov.example.com",
      logo: "https://example.com/logos/daogov.png",
      githubRepo: "https://github.com/daogov/platform",
      documentation: "https://docs.daogov.example.com",
      twitter: "https://twitter.com/daogov",
      discord: "https://discord.gg/daogov",
      contactEmail: "info@daogov.example.com",
      techStack: ["Solidity", "Vue.js", "The Graph", "Subgraph"],
      blockchain: "Celo",
      smartContracts: [],
      license: "GPL-3.0",
      developmentStage: "production",
      keyFeatures: ["Quadratic voting", "Treasury management", "Proposal system"],
      innovation: "Advanced governance mechanisms for DAOs",
      useCases: ["DAO governance", "Community voting", "Treasury management"],
      targetAudience: "DAO communities and organizations",
      status: "active",
      launchDate: "2024-03-15",
      userCount: "320",
      transactionVolume: "800000",
      tvl: "1500000",
      projectType: "protocol",
      maturityLevel: "production",
      openSource: true,
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      governanceContract: "0x0000000000000000000000000000000000000000",
      network: "Celo Sepolia",
      chainId: 11142220,
    }),
    additionalData: JSON.stringify({
      teamMembers: [
        {
          name: "Charlie Governance",
          role: "Lead Developer",
          email: "charlie@daogov.example.com",
        },
      ],
      milestones: [
        {
          title: "V1 Release",
          description: "Initial governance platform",
          targetDate: "2024-03-15",
          status: "completed",
        },
      ],
      auditReports: [],
      kycCompliant: false,
      regulatoryCompliance: [],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "Cross-Chain Bridge",
    description: "A secure and efficient bridge protocol enabling seamless asset transfers between Celo and other blockchain networks.",
    bio: JSON.stringify({
      tagline: "Bridge Assets Across Chains Seamlessly",
      category: "Infrastructure",
      tags: ["bridge", "cross-chain", "infrastructure", "interoperability"],
      location: "Singapore",
      establishedDate: "2023-12-10",
      website: "https://celobridge.example.com",
      logo: "https://example.com/logos/bridge.png",
      githubRepo: "https://github.com/celobridge/protocol",
      documentation: "https://docs.celobridge.example.com",
      twitter: "https://twitter.com/celobridge",
      discord: "https://discord.gg/celobridge",
      contactEmail: "support@celobridge.example.com",
      techStack: ["Solidity", "Rust", "TypeScript", "Cosmos SDK"],
      blockchain: "Celo",
      smartContracts: [],
      license: "MIT",
      developmentStage: "production",
      keyFeatures: ["Multi-chain support", "Fast transfers", "Low fees"],
      innovation: "First native bridge for Celo ecosystem",
      useCases: ["Asset transfers", "Cross-chain DeFi", "Interoperability"],
      targetAudience: "DeFi users and developers",
      status: "active",
      launchDate: "2024-04-01",
      userCount: "2100",
      transactionVolume: "15000000",
      tvl: "8000000",
      projectType: "infrastructure",
      maturityLevel: "production",
      openSource: true,
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      bridgeContract: "0x0000000000000000000000000000000000000000",
      network: "Celo Sepolia",
      chainId: 11142220,
    }),
    additionalData: JSON.stringify({
      teamMembers: [
        {
          name: "David Bridge",
          role: "CTO",
          email: "david@celobridge.example.com",
        },
      ],
      milestones: [
        {
          title: "Mainnet Launch",
          description: "Production deployment",
          targetDate: "2024-04-01",
          status: "completed",
        },
      ],
      auditReports: [],
      kycCompliant: false,
      regulatoryCompliance: [],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "Gaming Metaverse",
    description: "An immersive blockchain-based gaming metaverse where players can own assets, trade items, and participate in tournaments.",
    bio: JSON.stringify({
      tagline: "Play, Own, Earn in the Metaverse",
      category: "Gaming",
      tags: ["gaming", "metaverse", "nft", "play-to-earn"],
      location: "Tokyo, Japan",
      establishedDate: "2023-10-15",
      website: "https://metagame.example.com",
      logo: "https://example.com/logos/metagame.png",
      demoVideo: "https://youtube.com/watch?v=example3",
      demoUrl: "https://play.metagame.example.com",
      githubRepo: "https://github.com/metagame/world",
      documentation: "https://docs.metagame.example.com",
      twitter: "https://twitter.com/metagame",
      discord: "https://discord.gg/metagame",
      youtube: "https://youtube.com/@metagame",
      contactEmail: "info@metagame.example.com",
      techStack: ["Unity", "Solidity", "Web3.js", "IPFS"],
      blockchain: "Celo",
      smartContracts: [],
      license: "Proprietary",
      developmentStage: "production",
      keyFeatures: ["NFT items", "Tournaments", "Play-to-earn"],
      innovation: "First gaming metaverse on Celo",
      useCases: ["Gaming", "Virtual worlds", "NFT trading"],
      targetAudience: "Gamers and NFT collectors",
      status: "active",
      launchDate: "2024-05-01",
      userCount: "5000",
      transactionVolume: "3000000",
      tvl: "2000000",
      projectType: "gaming",
      maturityLevel: "production",
      openSource: false,
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      gameContract: "0x0000000000000000000000000000000000000000",
      network: "Celo Sepolia",
      chainId: 11142220,
    }),
    additionalData: JSON.stringify({
      teamMembers: [
        {
          name: "Eve Gamer",
          role: "Game Director",
          email: "eve@metagame.example.com",
        },
      ],
      milestones: [
        {
          title: "Alpha Release",
          description: "Early access launch",
          targetDate: "2024-05-01",
          status: "completed",
        },
      ],
      auditReports: [],
      kycCompliant: false,
      regulatoryCompliance: [],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "Lending Protocol",
    description: "A decentralized lending and borrowing platform with flexible interest rates and multiple collateral types.",
    bio: JSON.stringify({
      tagline: "Lend and Borrow with Confidence",
      category: "DeFi",
      tags: ["lending", "borrowing", "defi", "money-markets"],
      location: "London, UK",
      establishedDate: "2023-08-20",
      website: "https://celolend.example.com",
      logo: "https://example.com/logos/lend.png",
      githubRepo: "https://github.com/celolend/protocol",
      documentation: "https://docs.celolend.example.com",
      twitter: "https://twitter.com/celolend",
      discord: "https://discord.gg/celolend",
      contactEmail: "hello@celolend.example.com",
      techStack: ["Solidity", "TypeScript", "React", "The Graph"],
      blockchain: "Celo",
      smartContracts: [],
      license: "MIT",
      developmentStage: "production",
      keyFeatures: ["Multiple collaterals", "Flexible rates", "Liquidation protection"],
      innovation: "First native lending protocol on Celo",
      useCases: ["Lending", "Borrowing", "Yield generation"],
      targetAudience: "DeFi users and liquidity providers",
      status: "active",
      launchDate: "2024-01-20",
      userCount: "1800",
      transactionVolume: "25000000",
      tvl: "12000000",
      projectType: "protocol",
      maturityLevel: "production",
      openSource: true,
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      lendingContract: "0x0000000000000000000000000000000000000000",
      network: "Celo Sepolia",
      chainId: 11142220,
    }),
    additionalData: JSON.stringify({
      teamMembers: [
        {
          name: "Frank Lender",
          role: "Protocol Lead",
          email: "frank@celolend.example.com",
        },
      ],
      milestones: [
        {
          title: "Mainnet Launch",
          description: "Protocol deployment",
          targetDate: "2024-01-20",
          status: "completed",
        },
      ],
      auditReports: [],
      kycCompliant: false,
      regulatoryCompliance: [],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "Identity Verification",
    description: "A decentralized identity verification system using zero-knowledge proofs for privacy-preserving KYC/AML compliance.",
    bio: JSON.stringify({
      tagline: "Privacy-Preserving Identity Verification",
      category: "Identity",
      tags: ["identity", "kyc", "zkp", "privacy"],
      location: "Zurich, Switzerland",
      establishedDate: "2023-11-01",
      website: "https://zkidentity.example.com",
      logo: "https://example.com/logos/zkidentity.png",
      githubRepo: "https://github.com/zkidentity/protocol",
      documentation: "https://docs.zkidentity.example.com",
      twitter: "https://twitter.com/zkidentity",
      discord: "https://discord.gg/zkidentity",
      contactEmail: "contact@zkidentity.example.com",
      techStack: ["Solidity", "Circom", "SnarkJS", "TypeScript"],
      blockchain: "Celo",
      smartContracts: [],
      license: "Apache-2.0",
      developmentStage: "production",
      keyFeatures: ["ZK proofs", "Privacy-preserving", "Compliance"],
      innovation: "First ZK-based identity on Celo",
      useCases: ["KYC", "AML", "Identity verification"],
      targetAudience: "Financial institutions and DeFi protocols",
      status: "active",
      launchDate: "2024-06-01",
      userCount: "450",
      transactionVolume: "500000",
      tvl: "0",
      projectType: "infrastructure",
      maturityLevel: "production",
      openSource: true,
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      identityContract: "0x0000000000000000000000000000000000000000",
      network: "Celo Sepolia",
      chainId: 11142220,
    }),
    additionalData: JSON.stringify({
      teamMembers: [
        {
          name: "Grace Privacy",
          role: "Research Lead",
          email: "grace@zkidentity.example.com",
        },
      ],
      milestones: [
        {
          title: "Beta Launch",
          description: "Public beta",
          targetDate: "2024-06-01",
          status: "completed",
        },
      ],
      auditReports: [],
      kycCompliant: true,
      regulatoryCompliance: ["GDPR", "SOC 2"],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "Stablecoin Protocol",
    description: "A decentralized stablecoin protocol maintaining price stability through algorithmic mechanisms and collateral backing.",
    bio: JSON.stringify({
      tagline: "Stable Money for the Digital Economy",
      category: "Stablecoin",
      tags: ["stablecoin", "defi", "monetary-policy", "algorithmic"],
      location: "New York, USA",
      establishedDate: "2023-07-10",
      website: "https://stablecoin.example.com",
      logo: "https://example.com/logos/stablecoin.png",
      githubRepo: "https://github.com/stablecoin/protocol",
      documentation: "https://docs.stablecoin.example.com",
      twitter: "https://twitter.com/stablecoin",
      discord: "https://discord.gg/stablecoin",
      contactEmail: "info@stablecoin.example.com",
      techStack: ["Solidity", "Python", "TypeScript", "React"],
      blockchain: "Celo",
      smartContracts: [],
      license: "MIT",
      developmentStage: "production",
      keyFeatures: ["Algorithmic stability", "Multi-collateral", "Governance"],
      innovation: "First algorithmic stablecoin on Celo",
      useCases: ["Payments", "Store of value", "DeFi"],
      targetAudience: "Users and DeFi protocols",
      status: "active",
      launchDate: "2024-02-15",
      userCount: "3500",
      transactionVolume: "50000000",
      tvl: "30000000",
      projectType: "protocol",
      maturityLevel: "production",
      openSource: true,
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      stablecoinContract: "0x0000000000000000000000000000000000000000",
      network: "Celo Sepolia",
      chainId: 11142220,
    }),
    additionalData: JSON.stringify({
      teamMembers: [
        {
          name: "Henry Stable",
          role: "Protocol Architect",
          email: "henry@stablecoin.example.com",
        },
      ],
      milestones: [
        {
          title: "Mainnet Launch",
          description: "Protocol deployment",
          targetDate: "2024-02-15",
          status: "completed",
        },
      ],
      auditReports: [],
      kycCompliant: false,
      regulatoryCompliance: [],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "Oracle Network",
    description: "A decentralized oracle network providing reliable price feeds and off-chain data to smart contracts on Celo.",
    bio: JSON.stringify({
      tagline: "Reliable Data for Smart Contracts",
      category: "Infrastructure",
      tags: ["oracle", "data-feeds", "infrastructure", "price-feeds"],
      location: "Berlin, Germany",
      establishedDate: "2023-09-25",
      website: "https://celooracle.example.com",
      logo: "https://example.com/logos/oracle.png",
      githubRepo: "https://github.com/celooracle/network",
      documentation: "https://docs.celooracle.example.com",
      twitter: "https://twitter.com/celooracle",
      discord: "https://discord.gg/celooracle",
      contactEmail: "support@celooracle.example.com",
      techStack: ["Solidity", "Go", "TypeScript", "Node.js"],
      blockchain: "Celo",
      smartContracts: [],
      license: "MIT",
      developmentStage: "production",
      keyFeatures: ["Price feeds", "Multi-source", "Decentralized"],
      innovation: "First native oracle network for Celo",
      useCases: ["Price feeds", "Data oracles", "Off-chain data"],
      targetAudience: "DeFi protocols and developers",
      status: "active",
      launchDate: "2024-03-01",
      userCount: "120",
      transactionVolume: "2000000",
      tvl: "0",
      projectType: "infrastructure",
      maturityLevel: "production",
      openSource: true,
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      oracleContract: "0x0000000000000000000000000000000000000000",
      network: "Celo Sepolia",
      chainId: 11142220,
    }),
    additionalData: JSON.stringify({
      teamMembers: [
        {
          name: "Iris Data",
          role: "Network Lead",
          email: "iris@celooracle.example.com",
        },
      ],
      milestones: [
        {
          title: "Network Launch",
          description: "Oracle network deployment",
          targetDate: "2024-03-01",
          status: "completed",
        },
      ],
      auditReports: [],
      kycCompliant: false,
      regulatoryCompliance: [],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "Social Impact Platform",
    description: "A blockchain-based platform connecting social impact projects with donors and tracking impact metrics transparently.",
    bio: JSON.stringify({
      tagline: "Transparent Social Impact on Blockchain",
      category: "Social Impact",
      tags: ["social-impact", "donations", "transparency", "tracking"],
      location: "Nairobi, Kenya",
      establishedDate: "2023-12-05",
      website: "https://socialimpact.example.com",
      logo: "https://example.com/logos/socialimpact.png",
      githubRepo: "https://github.com/socialimpact/platform",
      documentation: "https://docs.socialimpact.example.com",
      twitter: "https://twitter.com/socialimpact",
      discord: "https://discord.gg/socialimpact",
      contactEmail: "hello@socialimpact.example.com",
      techStack: ["Solidity", "Next.js", "IPFS", "The Graph"],
      blockchain: "Celo",
      smartContracts: [],
      license: "GPL-3.0",
      developmentStage: "production",
      keyFeatures: ["Impact tracking", "Transparent donations", "Project verification"],
      innovation: "First social impact platform on Celo",
      useCases: ["Donations", "Impact tracking", "Project funding"],
      targetAudience: "Donors and social impact organizations",
      status: "active",
      launchDate: "2024-04-20",
      userCount: "680",
      transactionVolume: "1200000",
      tvl: "800000",
      projectType: "dapp",
      maturityLevel: "production",
      openSource: true,
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      platformContract: "0x0000000000000000000000000000000000000000",
      network: "Celo Sepolia",
      chainId: 11142220,
    }),
    additionalData: JSON.stringify({
      teamMembers: [
        {
          name: "Jack Impact",
          role: "Founder",
          email: "jack@socialimpact.example.com",
        },
      ],
      milestones: [
        {
          title: "Platform Launch",
          description: "Public launch",
          targetDate: "2024-04-20",
          status: "completed",
        },
      ],
      auditReports: [],
      kycCompliant: false,
      regulatoryCompliance: [],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
];

async function main() {
  // Get network name from command line arguments
  const networkName = process.argv.find((arg) => arg === "--network")
    ? process.argv[process.argv.indexOf("--network") + 1]
    : process.env.HARDHAT_NETWORK || "hardhat";

  if (networkName !== "celoSepolia") {
    console.error("❌ This script is designed for Celo Sepolia network only.");
    console.error("   Please run with: --network celoSepolia");
    process.exit(1);
  }

  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];

  console.log("\n=== Creating Test Projects on Celo Sepolia ===");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.account.address);
  console.log("Contract Address:", CELO_SEPOLIA_CONTRACT_ADDRESS);
  console.log("Number of Projects:", PROJECT_TEMPLATES.length);
  console.log("\n");

  // Get the contract instance
  const contractArtifact = await viem.getContractAt(
    "SovereignSeasV4",
    getAddress(CELO_SEPOLIA_CONTRACT_ADDRESS)
  );

  // Verify contract exists
  try {
    const code = await publicClient.getBytecode({
      address: getAddress(CELO_SEPOLIA_CONTRACT_ADDRESS),
    });
    if (!code || code === "0x") {
      console.error(`❌ No contract found at address ${CELO_SEPOLIA_CONTRACT_ADDRESS}`);
      process.exit(1);
    }
    console.log("✓ Contract verified at address\n");
  } catch (error: any) {
    console.error("❌ Error verifying contract:", error.message || error);
    process.exit(1);
  }

  // Get current project count
  try {
    const projectCount = await contractArtifact.read.getProjectCount();
    console.log(`Current project count: ${projectCount}\n`);
  } catch (error) {
    console.log("Could not read project count (this is okay)\n");
  }

  const createdProjects: Array<{ id: bigint; name: string; txHash: string }> = [];

  // Create each project
  for (let i = 0; i < PROJECT_TEMPLATES.length; i++) {
    const project = PROJECT_TEMPLATES[i];
    console.log(`[${i + 1}/${PROJECT_TEMPLATES.length}] Creating project: ${project.name}`);

    try {
      // Convert contracts array to addresses
      const contractAddresses = project.contracts.map((addr) => getAddress(addr));

      // Create the project
      const txHash = await contractArtifact.write.createProject(
        [
          project.name,
          project.description,
          project.bio,
          project.contractInfo,
          project.additionalData,
          contractAddresses,
          project.transferrable,
        ],
        { account: deployer.account }
      );

      console.log(`  ✓ Transaction sent: ${txHash}`);

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log(`  ✓ Transaction confirmed in block ${receipt.blockNumber}`);

      // Get the new project ID (it should be the current project count - 1)
      const newProjectCount = await contractArtifact.read.getProjectCount();
      const projectId = newProjectCount - 1n;

      createdProjects.push({
        id: projectId,
        name: project.name,
        txHash: txHash,
      });

      console.log(`  ✓ Project created with ID: ${projectId}\n`);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`  ❌ Error creating project "${project.name}":`, error.message || error);
      console.error(`  Continuing with next project...\n`);
    }
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Successfully created ${createdProjects.length} projects:\n`);
  createdProjects.forEach((project) => {
    console.log(`  Project ID ${project.id}: ${project.name}`);
    console.log(`    Transaction: ${project.txHash}`);
    console.log(`    Explorer: https://sepolia.celoscan.io/tx/${project.txHash}\n`);
  });

  console.log("\n✅ All projects created successfully!");
  console.log("\n📝 Next Steps:");
  console.log("1. Verify projects on the frontend");
  console.log("2. Check project details using getProject() and getProjectMetadata()");
  console.log(`3. View on explorer: https://sepolia.celoscan.io/address/${CELO_SEPOLIA_CONTRACT_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
