import { network } from "hardhat";
import { getAddress } from "viem";

/**
 * Script to create a tournament and add 19 projects (IDs 0-18)
 * 
 * Usage:
 *   pnpm run create:tournament:with-projects --network celoSepolia
 * 
 * Requirements:
 *   - TOURNAMENT_CONTRACT_ADDRESS environment variable set
 *   - SEAS_CONTRACT_ADDRESS environment variable set (optional, defaults to Celo Sepolia)
 *   - CELO_SEPOLIA_PRIVATE_KEY or PRIVATE_KEY environment variable set
 * 
 * This script:
 * 1. Creates a tournament with 1 hour (3600 seconds) stage duration
 * 2. Adds projects 0-18 (19 projects total) to the tournament
 * 3. Approves all projects for the tournament
 */

// Celo token addresses for different networks
const CELO_TOKEN_ADDRESSES: Record<string, string> = {
  celo: "0x471EcE3750Da237f93B8E339c536989b8978a438",
  celoSepolia: "0x471EcE3750Da237f93B8E339c536989b8978a438",
};

// Tournament contract addresses
const TOURNAMENT_CONTRACT_ADDRESSES: Record<string, string> = {
  celo: process.env.TOURNAMENT_CONTRACT_ADDRESS || "",
  celoSepolia: process.env.TOURNAMENT_CONTRACT_ADDRESS || "0x00242eBD746962a79c9726e5B81c474bDc6091e0",
};

// SovereignSeasV4 contract addresses
const SEAS_CONTRACT_ADDRESSES: Record<string, string> = {
  celo: process.env.SEAS_CONTRACT_ADDRESS || "0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a",
  celoSepolia: process.env.SEAS_CONTRACT_ADDRESS || "0x73Ac3CE3358a892f69238C7009CA4da4b0dd1470",
};

// Tournament configuration
const STAGE_DURATION_SECONDS = 60 * 60; // 1 hour (minimum required by contract)
const PROJECT_COUNT = 19; // Projects 0-18
const SOVSEAS_CAMPAIGN_ID = 0n; // 0 means not tied to a campaign
const AUTO_PROGRESS = false; // Manual stage progression
const DISQUALIFY_ENABLED = true; // Allow project disqualification

async function main() {
  // Get network name from command line arguments
  const networkName = process.argv.find((arg) => arg === "--network")
    ? process.argv[process.argv.indexOf("--network") + 1]
    : process.env.HARDHAT_NETWORK || "hardhat";

  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];

  // Get addresses for the current network
  const celoTokenAddress = CELO_TOKEN_ADDRESSES[networkName] || CELO_TOKEN_ADDRESSES.celoSepolia;
  const tournamentAddress = TOURNAMENT_CONTRACT_ADDRESSES[networkName] || process.env.TOURNAMENT_CONTRACT_ADDRESS;
  const seasAddress = SEAS_CONTRACT_ADDRESSES[networkName] || process.env.SEAS_CONTRACT_ADDRESS;

  if (!tournamentAddress) {
    console.error("❌ Error: TOURNAMENT_CONTRACT_ADDRESS is required");
    console.error("\nPlease set the tournament contract address:");
    console.error("  1. Set environment variable: TOURNAMENT_CONTRACT_ADDRESS=0x...");
    console.error("  2. Or update TOURNAMENT_CONTRACT_ADDRESSES in this script");
    console.error("\nExample:");
    console.error("  TOURNAMENT_CONTRACT_ADDRESS=0x... pnpm run create:tournament:with-projects --network celoSepolia");
    process.exit(1);
  }

  if (!seasAddress) {
    console.error("❌ Error: SEAS_CONTRACT_ADDRESS is required");
    process.exit(1);
  }

  console.log("\n=== Creating Tournament with Projects ===");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.account.address);
  console.log("Tournament Contract:", tournamentAddress);
  console.log("Seas4 Contract:", seasAddress);
  console.log("Celo Token:", celoTokenAddress);
  console.log("Stage Duration:", STAGE_DURATION_SECONDS, "seconds (1 hour)");
  console.log("Projects to add:", PROJECT_COUNT, "(IDs 0-18)");
  console.log("\n");

  // Verify contracts exist
  try {
    const tournamentCode = await publicClient.getBytecode({
      address: getAddress(tournamentAddress),
    });
    if (!tournamentCode || tournamentCode === "0x") {
      console.error(`❌ No tournament contract found at address ${tournamentAddress}`);
      process.exit(1);
    }
    console.log("✓ Tournament contract verified");

    const seasCode = await publicClient.getBytecode({
      address: getAddress(seasAddress),
    });
    if (!seasCode || seasCode === "0x") {
      console.error(`❌ No Seas4 contract found at address ${seasAddress}`);
      process.exit(1);
    }
    console.log("✓ Seas4 contract verified\n");
  } catch (error: any) {
    console.error("❌ Error verifying contracts:", error.message || error);
    process.exit(1);
  }

  // Get contract instances
  const tournamentContract = await viem.getContractAt(
    "SovereignTournament",
    getAddress(tournamentAddress)
  );

  const seasContract = await viem.getContractAt(
    "SovereignSeasV4",
    getAddress(seasAddress)
  );

  // Check current project count
  let currentProjectCount = 0n;
  try {
    currentProjectCount = await seasContract.read.getProjectCount();
    console.log(`Current project count in Seas4: ${currentProjectCount}`);
    
    if (currentProjectCount < BigInt(PROJECT_COUNT)) {
      console.warn(`⚠ Warning: Only ${currentProjectCount} projects exist, but trying to add ${PROJECT_COUNT}`);
      console.warn("  The script will add as many projects as available.");
    }
  } catch (error: any) {
    console.warn("⚠ Could not read project count:", error.message || error);
    console.warn("  Continuing anyway...\n");
  }

  // Create tournament
  console.log("\n--- Step 1: Creating Tournament ---");
  try {
    const createTxHash = await tournamentContract.write.createTournament(
      [
        SOVSEAS_CAMPAIGN_ID,
        BigInt(STAGE_DURATION_SECONDS),
        getAddress(celoTokenAddress),
        AUTO_PROGRESS,
        DISQUALIFY_ENABLED,
      ],
      { account: deployer.account }
    );

    console.log(`✓ Tournament creation transaction sent: ${createTxHash}`);

    // Wait for transaction receipt
    const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTxHash });
    console.log(`✓ Transaction confirmed in block ${createReceipt.blockNumber}`);

    // Get the tournament ID
    const nextTournamentId = await tournamentContract.read.nextTournamentId();
    const tournamentId = nextTournamentId - 1n;

    console.log(`✓ Tournament created with ID: ${tournamentId}\n`);

    // Add projects to tournament
    console.log("--- Step 2: Adding Projects to Tournament ---");
    
    // Generate project IDs (0-18)
    const projectIds: bigint[] = [];
    const maxProjectId = currentProjectCount > 0n 
      ? BigInt(Math.min(Number(currentProjectCount), PROJECT_COUNT)) 
      : BigInt(PROJECT_COUNT);
    
    for (let i = 0; i < Number(maxProjectId); i++) {
      projectIds.push(BigInt(i));
    }

    console.log(`Adding ${projectIds.length} projects to tournament...\n`);

    // Add projects in batches (to avoid gas limits)
    const BATCH_SIZE = 10;
    let addedCount = 0;

    for (let i = 0; i < projectIds.length; i += BATCH_SIZE) {
      const batch = projectIds.slice(i, i + BATCH_SIZE);
      
      try {
        if (batch.length === 1) {
          // Single project
          const addTxHash = await tournamentContract.write.addProject(
            [tournamentId, batch[0]],
            { account: deployer.account }
          );
          console.log(`  [${i + 1}-${Math.min(i + batch.length, projectIds.length)}/${projectIds.length}] Adding project ${batch[0]}...`);
          console.log(`    Transaction: ${addTxHash}`);
          
          const addReceipt = await publicClient.waitForTransactionReceipt({ hash: addTxHash });
          console.log(`    ✓ Confirmed in block ${addReceipt.blockNumber}`);
          addedCount += batch.length;
        } else {
          // Batch add
          const batchTxHash = await tournamentContract.write.addProjectsBatch(
            [tournamentId, batch],
            { account: deployer.account }
          );
          console.log(`  [${i + 1}-${Math.min(i + batch.length, projectIds.length)}/${projectIds.length}] Adding projects ${batch[0]}-${batch[batch.length - 1]}...`);
          console.log(`    Transaction: ${batchTxHash}`);
          
          const batchReceipt = await publicClient.waitForTransactionReceipt({ hash: batchTxHash });
          console.log(`    ✓ Confirmed in block ${batchReceipt.blockNumber}`);
          addedCount += batch.length;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`    ❌ Error adding batch:`, error.message || error);
        console.error(`    Continuing with next batch...\n`);
      }
    }

    console.log(`\n✓ Added ${addedCount} projects to tournament\n`);

    // Approve all projects
    console.log("--- Step 3: Approving Projects ---");
    
    try {
      const approveTxHash = await tournamentContract.write.approveMultipleProjects(
        [tournamentId, projectIds],
        { account: deployer.account }
      );
      
      console.log(`✓ Approval transaction sent: ${approveTxHash}`);
      
      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
      console.log(`✓ Approval confirmed in block ${approveReceipt.blockNumber}\n`);
    } catch (error: any) {
      console.error(`❌ Error approving projects:`, error.message || error);
      console.error(`  You may need to approve projects manually\n`);
    }

    // Summary
    console.log("\n=== Summary ===");
    console.log(`✓ Tournament created with ID: ${tournamentId}`);
    console.log(`✓ Stage duration: ${STAGE_DURATION_SECONDS} seconds (1 hour)`);
    console.log(`✓ Projects added: ${addedCount}`);
    console.log(`✓ Projects approved: ${addedCount}`);
    console.log("\n📝 Next Steps:");
    console.log("1. Start the tournament:");
    console.log(`   Tournament ID: ${tournamentId}`);
    console.log(`   Contract: ${tournamentAddress}`);
    console.log("2. View on explorer:");
    if (networkName === "celo") {
      console.log(`   https://celoscan.io/address/${tournamentAddress}`);
    } else if (networkName === "celoSepolia") {
      console.log(`   https://sepolia.celoscan.io/address/${tournamentAddress}`);
    }
    console.log("3. View tournament on frontend:");
    console.log(`   /explorer/tournament/${tournamentId}`);
  } catch (error: any) {
    console.error("\n❌ Error creating tournament:", error.message || error);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

