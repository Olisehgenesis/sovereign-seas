import { network } from "hardhat";
import { getAddress } from "viem";

/**
 * Script to create 10 sample projects and 3 campaigns on Base networks
 * 
 * Usage:
 *   SEAS_CONTRACT_ADDRESS=0x... pnpm run create:projects-campaigns:base
 *   SEAS_CONTRACT_ADDRESS=0x... pnpm run create:projects-campaigns:base-sepolia
 */

// Sample project data
const PROJECT_TEMPLATES = [
  {
    name: "DeFi Yield Optimizer",
    description: "An advanced DeFi protocol that automatically optimizes yield farming strategies across multiple chains.",
    bio: JSON.stringify({
      tagline: "Maximize Your DeFi Yields Automatically",
      category: "DeFi",
      tags: ["yield-farming", "defi", "automation"],
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      network: "Base",
    }),
    additionalData: JSON.stringify({
      teamMembers: [{ name: "Alice Developer", role: "Founder" }],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "NFT Marketplace Pro",
    description: "A next-generation NFT marketplace with advanced trading features and royalties management.",
    bio: JSON.stringify({
      tagline: "The Future of NFT Trading",
      category: "NFT",
      tags: ["nft", "marketplace", "trading"],
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      network: "Base",
    }),
    additionalData: JSON.stringify({
      teamMembers: [{ name: "Bob Creator", role: "CEO" }],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "DAO Governance Platform",
    description: "A comprehensive DAO governance platform enabling decentralized decision-making and voting.",
    bio: JSON.stringify({
      tagline: "Empower Your Community",
      category: "DAO",
      tags: ["dao", "governance", "voting"],
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      network: "Base",
    }),
    additionalData: JSON.stringify({
      teamMembers: [{ name: "Charlie Governance", role: "Lead Developer" }],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "Cross-Chain Bridge",
    description: "A secure bridge protocol enabling seamless asset transfers between Base and other networks.",
    bio: JSON.stringify({
      tagline: "Bridge Assets Across Chains",
      category: "Infrastructure",
      tags: ["bridge", "cross-chain"],
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      network: "Base",
    }),
    additionalData: JSON.stringify({
      teamMembers: [{ name: "David Bridge", role: "CTO" }],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "Gaming Metaverse",
    description: "An immersive blockchain-based gaming metaverse where players can own assets and trade items.",
    bio: JSON.stringify({
      tagline: "Play, Own, Earn",
      category: "Gaming",
      tags: ["gaming", "metaverse", "nft"],
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      network: "Base",
    }),
    additionalData: JSON.stringify({
      teamMembers: [{ name: "Eve Gamer", role: "Game Director" }],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "Lending Protocol",
    description: "A decentralized lending and borrowing platform with flexible interest rates.",
    bio: JSON.stringify({
      tagline: "Lend and Borrow with Confidence",
      category: "DeFi",
      tags: ["lending", "borrowing", "defi"],
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      network: "Base",
    }),
    additionalData: JSON.stringify({
      teamMembers: [{ name: "Frank Lender", role: "Protocol Lead" }],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "Identity Verification",
    description: "A decentralized identity verification system using zero-knowledge proofs.",
    bio: JSON.stringify({
      tagline: "Privacy-Preserving Identity",
      category: "Identity",
      tags: ["identity", "kyc", "zkp"],
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      network: "Base",
    }),
    additionalData: JSON.stringify({
      teamMembers: [{ name: "Grace Privacy", role: "Research Lead" }],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "Stablecoin Protocol",
    description: "A decentralized stablecoin protocol maintaining price stability through algorithmic mechanisms.",
    bio: JSON.stringify({
      tagline: "Stable Money for Digital Economy",
      category: "Stablecoin",
      tags: ["stablecoin", "defi"],
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      network: "Base",
    }),
    additionalData: JSON.stringify({
      teamMembers: [{ name: "Henry Stable", role: "Protocol Architect" }],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "Oracle Network",
    description: "A decentralized oracle network providing reliable price feeds to smart contracts.",
    bio: JSON.stringify({
      tagline: "Reliable Data for Smart Contracts",
      category: "Infrastructure",
      tags: ["oracle", "data-feeds"],
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      network: "Base",
    }),
    additionalData: JSON.stringify({
      teamMembers: [{ name: "Iris Data", role: "Network Lead" }],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
  {
    name: "Social Impact Platform",
    description: "A blockchain-based platform connecting social impact projects with donors.",
    bio: JSON.stringify({
      tagline: "Transparent Social Impact",
      category: "Social Impact",
      tags: ["social-impact", "donations"],
    }),
    contractInfo: JSON.stringify({
      mainContract: "0x0000000000000000000000000000000000000000",
      network: "Base",
    }),
    additionalData: JSON.stringify({
      teamMembers: [{ name: "Jack Impact", role: "Founder" }],
    }),
    contracts: [] as string[],
    transferrable: true,
  },
];

// Base token addresses (WETH for Base networks)
const BASE_TOKEN_ADDRESSES: Record<string, string> = {
  base: "0x4200000000000000000000000000000000000006",
  baseSepolia: "0x4200000000000000000000000000000000000006",
};

async function main() {
  const networkName = process.argv.find((arg) => arg === "--network") 
    ? process.argv[process.argv.indexOf("--network") + 1] 
    : process.env.HARDHAT_NETWORK || "hardhat";

  if (networkName !== "base" && networkName !== "baseSepolia") {
    console.error("❌ This script is designed for Base networks only.");
    console.error("   Please run with: --network base or --network baseSepolia");
    process.exit(1);
  }

  const seasAddress = process.env.SEAS_CONTRACT_ADDRESS;
  if (!seasAddress) {
    console.error("❌ Error: SEAS_CONTRACT_ADDRESS environment variable is required");
    process.exit(1);
  }

  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];

  const baseTokenAddress = BASE_TOKEN_ADDRESSES[networkName];

  console.log("\n=== Creating Projects and Campaigns on Base ===");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.account.address);
  console.log("Seas Contract:", seasAddress);
  console.log("Base Token:", baseTokenAddress);
  console.log("Projects to create:", PROJECT_TEMPLATES.length);
  console.log("Campaigns to create: 3\n");

  // Get the contract instance
  const contractArtifact = await viem.getContractAt(
    "SovereignSeasV4",
    getAddress(seasAddress)
  );

  // Verify contract exists
  try {
    const code = await publicClient.getBytecode({
      address: getAddress(seasAddress),
    });
    if (!code || code === "0x") {
      console.error(`❌ No contract found at address ${seasAddress}`);
      process.exit(1);
    }
    console.log("✓ Contract verified at address\n");
  } catch (error: any) {
    console.error("❌ Error verifying contract:", error.message || error);
    process.exit(1);
  }

  // Create projects
  const createdProjects: bigint[] = [];
  console.log("=== Creating Projects ===");
  for (let i = 0; i < PROJECT_TEMPLATES.length; i++) {
    const project = PROJECT_TEMPLATES[i];
    console.log(`[${i + 1}/${PROJECT_TEMPLATES.length}] Creating: ${project.name}`);

    try {
      const contractAddresses = project.contracts.map((addr) => getAddress(addr));
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

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      const newProjectCount = await contractArtifact.read.getProjectCount();
      const projectId = newProjectCount - 1n;
      createdProjects.push(projectId);
      console.log(`  ✓ Project ID: ${projectId}\n`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}\n`);
    }
  }

  // Create campaigns
  console.log("\n=== Creating Campaigns ===");
  const now = BigInt(Math.floor(Date.now() / 1000));
  const campaigns = [
    {
      name: "Q1 2024 Innovation Grant",
      description: "Supporting innovative projects building on Base",
      startTime: now + 3600n, // 1 hour from now
      endTime: now + 2592000n, // 30 days from now
      projectIds: createdProjects.slice(0, 4), // First 4 projects
    },
    {
      name: "DeFi Ecosystem Growth",
      description: "Focused on DeFi protocols and infrastructure",
      startTime: now + 7200n, // 2 hours from now
      endTime: now + 5184000n, // 60 days from now
      projectIds: createdProjects.slice(4, 7), // Next 3 projects
    },
    {
      name: "Community Choice Awards",
      description: "Community-driven funding for top projects",
      startTime: now + 10800n, // 3 hours from now
      endTime: now + 7776000n, // 90 days from now
      projectIds: createdProjects.slice(7), // Last 3 projects
    },
  ];

  const createdCampaigns: bigint[] = [];
  for (let i = 0; i < campaigns.length; i++) {
    const campaign = campaigns[i];
    console.log(`[${i + 1}/3] Creating campaign: ${campaign.name}`);

    try {
      // Create campaign (fee is 2 ETH equivalent, but we'll use bypass or pay fee)
      const txHash = await contractArtifact.write.createCampaign(
        [
          campaign.name,
          campaign.description,
          "", // mainInfo
          "", // additionalInfo
          campaign.startTime,
          campaign.endTime,
          5n, // adminFeePercentage (5%)
          10n, // maxWinners
          false, // useQuadraticDistribution
          false, // useCustomDistribution
          "", // customDistributionData
          baseTokenAddress, // payoutToken
          baseTokenAddress, // feeToken
        ],
        { 
          account: deployer.account,
          value: 2000000000000000000n, // 2 ETH fee
        }
      );

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      const newCampaignCount = await contractArtifact.read.getCampaignCount();
      const campaignId = newCampaignCount - 1n;
      createdCampaigns.push(campaignId);
      console.log(`  ✓ Campaign ID: ${campaignId}`);

      // Add projects to campaign
      for (const projectId of campaign.projectIds) {
        try {
          await contractArtifact.write.addProjectToCampaign(
            [campaignId, projectId, baseTokenAddress],
            {
              account: deployer.account,
              value: 1000000000000000000n, // 1 ETH fee
            }
          );
          await contractArtifact.write.approveProject([campaignId, projectId], {
            account: deployer.account,
          });
          console.log(`    ✓ Added project ${projectId}`);
        } catch (error: any) {
          console.error(`    ⚠ Failed to add project ${projectId}: ${error.message}`);
        }
      }
      console.log("");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}\n`);
    }
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`✓ Created ${createdProjects.length} projects`);
  console.log(`✓ Created ${createdCampaigns.length} campaigns`);
  console.log("\nProject IDs:", createdProjects.map(id => id.toString()).join(", "));
  console.log("Campaign IDs:", createdCampaigns.map(id => id.toString()).join(", "));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
