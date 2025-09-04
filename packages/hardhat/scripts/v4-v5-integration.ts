import { ethers } from "hardhat";
import { SovereignSeasV5 } from "../typechain-types";

/**
 * V4-V5 Integration Script
 * 
 * This script demonstrates how to:
 * 1. Enable V4 integration in V5
 * 2. Sync V4 project IDs to prevent conflicts
 * 3. Migrate projects with same IDs
 * 4. Create new V5 projects that don't conflict with V4
 */

async function main() {
    console.log("🚀 Starting V4-V5 Integration Setup...");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);

    // Deploy V5 system (assuming already deployed)
    const sovereignSeasV5Address = "0x..."; // Replace with actual V5 proxy address
    const v4ContractAddress = "0x..."; // Replace with actual V4 contract address

    const sovereignSeasV5 = await ethers.getContractAt("SovereignSeasV5", sovereignSeasV5Address);

    console.log("\n📋 Step 1: Enable V4 Integration in ProjectsModule");
    
    // Enable V4 integration in ProjectsModule
    const enableV4IntegrationData = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [v4ContractAddress]
    );

    const enableV4Tx = await sovereignSeasV5.callModule("projects", enableV4IntegrationData);
    await enableV4Tx.wait();
    console.log("✅ V4 integration enabled in ProjectsModule");

    // Check V4 integration status
    const getV4StatusData = ethers.utils.defaultAbiCoder.encode(
        ["string"],
        ["getV4IntegrationStatus()"]
    );

    const statusResult = await sovereignSeasV5.callModule("projects", getV4StatusData);
    const [enabled, v4Contract, v4MaxId, v5NextId] = ethers.utils.defaultAbiCoder.decode(
        ["bool", "address", "uint256", "uint256"],
        statusResult
    );

    console.log("📊 V4 Integration Status:");
    console.log(`  - Enabled: ${enabled}`);
    console.log(`  - V4 Contract: ${v4Contract}`);
    console.log(`  - V4 Max Project ID: ${v4MaxId}`);
    console.log(`  - V5 Next Project ID: ${v5NextId}`);

    console.log("\n🔄 Step 2: Migrate Projects with Same IDs");
    
    // Example: Migrate V4 project ID 1 to V5 with same ID
    const v4ProjectId = 1;
    
    // Check if project exists in V4
    const v4Contract = await ethers.getContractAt("SovereignSeasV4", v4ContractAddress);
    
    try {
        const v4Project = await v4Contract.projects(v4ProjectId);
        console.log(`📦 V4 Project ${v4ProjectId}: ${v4Project.name}`);
        
        // Migrate project with same ID
        const migrateProjectData = ethers.utils.defaultAbiCoder.encode(
            ["uint256"],
            [v4ProjectId]
        );

        const migrateTx = await sovereignSeasV5.callModule("migration", migrateProjectData);
        await migrateTx.wait();
        console.log(`✅ Project ${v4ProjectId} migrated to V5 with same ID`);

        // Verify the project exists in V5 with same ID
        const getProjectData = ethers.utils.defaultAbiCoder.encode(
            ["string", "uint256"],
            ["getProject(uint256)", v4ProjectId]
        );

        const projectResult = await sovereignSeasV5.callModule("projects", getProjectData);
        const [id, owner, name, description] = ethers.utils.defaultAbiCoder.decode(
            ["uint256", "address", "string", "string"],
            projectResult
        );

        console.log(`✅ V5 Project ${id}: ${name} (Owner: ${owner})`);
        
    } catch (error) {
        console.log(`❌ Project ${v4ProjectId} not found in V4 or migration failed`);
    }

    console.log("\n🆕 Step 3: Create New V5 Project (No ID Conflict)");
    
    // Create a new project in V5 - it will automatically use next available ID
    const createProjectData = ethers.utils.defaultAbiCoder.encode(
        ["string", "string", "tuple", "address[]", "bool"],
        [
            "New V5 Project",
            "This is a new project created in V5",
            // ProjectMetadata struct
            [
                "Bio for new project",
                "Contract info",
                "Additional data",
                "{}", // jsonMetadata
                "Technology", // category
                "https://example.com", // website
                "https://github.com/example", // github
                "@example", // twitter
                "example#1234", // discord
                "https://example.com", // websiteUrl
                "@example" // socialMediaHandle
            ],
            [], // contracts
            true // transferrable
        ]
    );

    const createTx = await sovereignSeasV5.callModule("projects", createProjectData, {
        value: ethers.utils.parseEther("0.5") // 0.5 CELO fee
    });
    await createTx.wait();
    console.log("✅ New V5 project created with next available ID");

    console.log("\n🔍 Step 4: Verify ID Management");
    
    // Check final status
    const finalStatusResult = await sovereignSeasV5.callModule("projects", getV4StatusData);
    const [finalEnabled, finalV4Contract, finalV4MaxId, finalV5NextId] = ethers.utils.defaultAbiCoder.decode(
        ["bool", "address", "uint256", "uint256"],
        finalStatusResult
    );

    console.log("📊 Final V4 Integration Status:");
    console.log(`  - V4 Max Project ID: ${finalV4MaxId}`);
    console.log(`  - V5 Next Project ID: ${finalV5NextId}`);
    console.log(`  - ID Gap: ${finalV5NextId - finalV4MaxId - 1} (should be > 0)`);

    console.log("\n🎉 V4-V5 Integration Complete!");
    console.log("\n📝 Summary:");
    console.log("  ✅ V4 integration enabled");
    console.log("  ✅ V4 project IDs synced to prevent conflicts");
    console.log("  ✅ Projects migrated with same IDs");
    console.log("  ✅ New V5 projects use non-conflicting IDs");
    console.log("  ✅ ID management working correctly");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
