#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { config } from "dotenv";

config();

// Role management script for Good Dollar Bridge
async function main() {
  const args = process.argv.slice(2);
  const action = args[0]; // grant, revoke, view
  const role = args[1]; // admin, operator, campaign-creator, deployer
  const address = args[2]; // address to grant/revoke role
  
  if (!action || !role) {
    console.log("❌ Missing arguments");
    console.log("Usage: npx hardhat run scripts/grant-roles.ts --network celo <action> <role> [address]");
    console.log("");
    console.log("Actions:");
    console.log("  grant <role> <address>  - Grant role to address");
    console.log("  revoke <role> <address> - Revoke role from address");
    console.log("  view <role>             - View addresses with role");
    console.log("  list                    - List all roles and members");
    console.log("");
    console.log("Roles:");
    console.log("  admin              - ADMIN_ROLE");
    console.log("  operator           - OPERATOR_ROLE");
    console.log("  campaign-creator   - CAMPAIGN_CREATOR_ROLE");
    console.log("  deployer           - DEPLOYER_ROLE (factory only)");
    console.log("  pauser             - PAUSER_ROLE");
    console.log("");
    console.log("Examples:");
    console.log("  npx hardhat run scripts/grant-roles.ts --network celo grant admin 0x1234...");
    console.log("  npx hardhat run scripts/grant-roles.ts --network celo view operator");
    console.log("  npx hardhat run scripts/grant-roles.ts --network celo list");
    process.exit(1);
  }
  
  try {
    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Deployer: ${deployer.address}`);
    
    // Get contract addresses from deployment info
    const deploymentInfo = await getDeploymentInfo();
    if (!deploymentInfo) {
      console.log("❌ No deployment info found. Deploy contracts first.");
      process.exit(1);
    }
    
    const { factory, firstBridge } = deploymentInfo.contracts;
    
    if (action === "list") {
      await listAllRoles(factory, firstBridge);
      return;
    }
    
    if (action === "view") {
      await viewRoleMembers(factory, firstBridge, role);
      return;
    }
    
    if (action === "grant" || action === "revoke") {
      if (!address) {
        console.log("❌ Address required for grant/revoke actions");
        process.exit(1);
      }
      
      if (!ethers.isAddress(address)) {
        console.log("❌ Invalid address format");
        process.exit(1);
      }
      
      await manageRole(factory, firstBridge, action, role, address);
      return;
    }
    
    console.log("❌ Unknown action:", action);
    
  } catch (error: any) {
    console.error("💥 Role management failed:", error.message);
    process.exit(1);
  }
}

async function getDeploymentInfo() {
  try {
    const fs = require("fs");
    const path = require("path");
    
    const deploymentsDir = path.join(__dirname, "../deployments");
    const files = fs.readdirSync(deploymentsDir);
    
    for (const file of files) {
      if (file.includes("good-dollar-bridge-deployment.json")) {
        const content = fs.readFileSync(path.join(deploymentsDir, file), "utf8");
        return JSON.parse(content);
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function listAllRoles(factoryAddress: string, bridgeAddress?: string) {
  console.log("📋 Listing All Roles and Members");
  console.log("=".repeat(50));
  
  // Factory roles
  console.log("🏭 Factory Contract Roles:");
  const factory = await ethers.getContractAt("SovereignSeasGoodDollarBridgeFactory", factoryAddress);
  
  const adminRole = await factory.ADMIN_ROLE();
  const operatorRole = await factory.OPERATOR_ROLE();
  const deployerRole = await factory.DEPLOYER_ROLE();
  
  console.log(`   ADMIN_ROLE: ${adminRole}`);
  console.log(`   OPERATOR_ROLE: ${operatorRole}`);
  console.log(`   DEPLOYER_ROLE: ${deployerRole}`);
  
  // Check who has DEFAULT_ADMIN_ROLE
  const defaultAdminRole = await factory.DEFAULT_ADMIN_ROLE();
  const defaultAdminMembers = await getRoleMembers(factory, defaultAdminRole);
  console.log(`   DEFAULT_ADMIN_ROLE members: ${defaultAdminMembers.join(", ") || "None"}`);
  
  // Check who has ADMIN_ROLE
  const adminMembers = await getRoleMembers(factory, adminRole);
  console.log(`   ADMIN_ROLE members: ${adminMembers.join(", ") || "None"}`);
  
  // Check who has OPERATOR_ROLE
  const operatorMembers = await getRoleMembers(factory, operatorRole);
  console.log(`   OPERATOR_ROLE members: ${operatorMembers.join(", ") || "None"}`);
  
  // Check who has DEPLOYER_ROLE
  const deployerMembers = await getRoleMembers(factory, deployerRole);
  console.log(`   DEPLOYER_ROLE members: ${deployerMembers.join(", ") || "None"}`);
  
  // Bridge roles (if deployed)
  if (bridgeAddress) {
    console.log("\n🌉 Bridge Contract Roles:");
    const bridge = await ethers.getContractAt("SovereignSeasGoodDollarBridge", bridgeAddress);
    
    const bridgeAdminRole = await bridge.ADMIN_ROLE();
    const bridgeOperatorRole = await bridge.OPERATOR_ROLE();
    const bridgeCampaignCreatorRole = await bridge.CAMPAIGN_CREATOR_ROLE();
    const bridgePauserRole = await bridge.PAUSER_ROLE();
    
    console.log(`   ADMIN_ROLE: ${bridgeAdminRole}`);
    console.log(`   OPERATOR_ROLE: ${bridgeOperatorRole}`);
    console.log(`   CAMPAIGN_CREATOR_ROLE: ${bridgeCampaignCreatorRole}`);
    console.log(`   PAUSER_ROLE: ${bridgePauserRole}`);
    
    // Check who has DEFAULT_ADMIN_ROLE
    const bridgeDefaultAdminRole = await bridge.DEFAULT_ADMIN_ROLE();
    const bridgeDefaultAdminMembers = await getRoleMembers(bridge, bridgeDefaultAdminRole);
    console.log(`   DEFAULT_ADMIN_ROLE members: ${bridgeDefaultAdminMembers.join(", ") || "None"}`);
    
    // Check who has ADMIN_ROLE
    const bridgeAdminMembers = await getRoleMembers(bridge, bridgeAdminRole);
    console.log(`   ADMIN_ROLE members: ${bridgeAdminMembers.join(", ") || "None"}`);
    
    // Check who has OPERATOR_ROLE
    const bridgeOperatorMembers = await getRoleMembers(bridge, bridgeOperatorRole);
    console.log(`   OPERATOR_ROLE members: ${bridgeOperatorMembers.join(", ") || "None"}`);
    
    // Check who has CAMPAIGN_CREATOR_ROLE
    const bridgeCampaignCreatorMembers = await getRoleMembers(bridge, bridgeCampaignCreatorRole);
    console.log(`   CAMPAIGN_CREATOR_ROLE members: ${bridgeCampaignCreatorMembers.join(", ") || "None"}`);
    
    // Check who has PAUSER_ROLE
    const bridgePauserMembers = await getRoleMembers(bridge, bridgePauserRole);
    console.log(`   PAUSER_ROLE members: ${bridgePauserMembers.join(", ") || "None"}`);
  }
}

async function viewRoleMembers(factoryAddress: string, bridgeAddress: string | undefined, role: string) {
  console.log(`👥 Viewing ${role.toUpperCase()} role members`);
  console.log("=".repeat(40));
  
  const factory = await ethers.getContractAt("SovereignSeasGoodDollarBridgeFactory", factoryAddress);
  
  if (role === "deployer") {
    const deployerRole = await factory.DEPLOYER_ROLE();
    const members = await getRoleMembers(factory, deployerRole);
    console.log(`DEPLOYER_ROLE members: ${members.join(", ") || "None"}`);
    return;
  }
  
  if (role === "admin" || role === "operator") {
    const roleHash = role === "admin" ? await factory.ADMIN_ROLE() : await factory.OPERATOR_ROLE();
    const members = await getRoleMembers(factory, roleHash);
    console.log(`${role.toUpperCase()}_ROLE members: ${members.join(", ") || "None"}`);
    
    if (bridgeAddress) {
      const bridge = await ethers.getContractAt("SovereignSeasGoodDollarBridge", bridgeAddress);
      const bridgeRoleHash = role === "admin" ? await bridge.ADMIN_ROLE() : await bridge.OPERATOR_ROLE();
      const bridgeMembers = await getRoleMembers(bridge, bridgeRoleHash);
      console.log(`Bridge ${role.toUpperCase()}_ROLE members: ${bridgeMembers.join(", ") || "None"}`);
    }
    return;
  }
  
  if (role === "campaign-creator" && bridgeAddress) {
    const bridge = await ethers.getContractAt("SovereignSeasGoodDollarBridge", bridgeAddress);
    const campaignCreatorRole = await bridge.CAMPAIGN_CREATOR_ROLE();
    const members = await getRoleMembers(bridge, campaignCreatorRole);
    console.log(`CAMPAIGN_CREATOR_ROLE members: ${members.join(", ") || "None"}`);
    return;
  }
  
  if (role === "pauser" && bridgeAddress) {
    const bridge = await ethers.getContractAt("SovereignSeasGoodDollarBridge", bridgeAddress);
    const pauserRole = await bridge.PAUSER_ROLE();
    const members = await getRoleMembers(bridge, pauserRole);
    console.log(`PAUSER_ROLE members: ${members.join(", ") || "None"}`);
    return;
  }
  
  console.log("❌ Unknown role:", role);
}

async function manageRole(factoryAddress: string, bridgeAddress: string | undefined, action: string, role: string, address: string) {
  console.log(`${action === "grant" ? "✅" : "❌"} ${action.toUpperCase()} ${role.toUpperCase()} role to ${address}`);
  console.log("=".repeat(50));
  
  const [deployer] = await ethers.getSigners();
  
  if (role === "deployer") {
    const factory = await ethers.getContractAt("SovereignSeasGoodDollarBridgeFactory", factoryAddress);
    const deployerRole = await factory.DEPLOYER_ROLE();
    
    if (action === "grant") {
      const tx = await factory.grantDeployerRole(address);
      await tx.wait();
      console.log(`✅ Granted DEPLOYER_ROLE to ${address}`);
    } else {
      const tx = await factory.revokeDeployerRole(address);
      await tx.wait();
      console.log(`❌ Revoked DEPLOYER_ROLE from ${address}`);
    }
    return;
  }
  
  if (role === "admin" || role === "operator") {
    // Grant/revoke on factory
    const factory = await ethers.getContractAt("SovereignSeasGoodDollarBridgeFactory", factoryAddress);
    const roleHash = role === "admin" ? await factory.ADMIN_ROLE() : await factory.OPERATOR_ROLE();
    
    if (action === "grant") {
      const tx = await factory.grantRole(roleHash, address);
      await tx.wait();
      console.log(`✅ Granted ${role.toUpperCase()}_ROLE to ${address} on Factory`);
    } else {
      const tx = await factory.revokeRole(roleHash, address);
      await tx.wait();
      console.log(`❌ Revoked ${role.toUpperCase()}_ROLE from ${address} on Factory`);
    }
    
    // Grant/revoke on bridge if deployed
    if (bridgeAddress) {
      const bridge = await ethers.getContractAt("SovereignSeasGoodDollarBridge", bridgeAddress);
      const bridgeRoleHash = role === "admin" ? await bridge.ADMIN_ROLE() : await bridge.OPERATOR_ROLE();
      
      if (action === "grant") {
        const tx = await bridge.grantRole(bridgeRoleHash, address);
        await tx.wait();
        console.log(`✅ Granted ${role.toUpperCase()}_ROLE to ${address} on Bridge`);
      } else {
        const tx = await bridge.revokeRole(bridgeRoleHash, address);
        await tx.wait();
        console.log(`❌ Revoked ${role.toUpperCase()}_ROLE from ${address} on Bridge`);
      }
    }
    return;
  }
  
  if (role === "campaign-creator" && bridgeAddress) {
    const bridge = await ethers.getContractAt("SovereignSeasGoodDollarBridge", bridgeAddress);
    
    if (action === "grant") {
      const tx = await bridge.grantCampaignCreatorRole(address);
      await tx.wait();
      console.log(`✅ Granted CAMPAIGN_CREATOR_ROLE to ${address}`);
    } else {
      const tx = await bridge.revokeCampaignCreatorRole(address);
      await tx.wait();
      console.log(`❌ Revoked CAMPAIGN_CREATOR_ROLE from ${address}`);
    }
    return;
  }
  
  if (role === "pauser" && bridgeAddress) {
    const bridge = await ethers.getContractAt("SovereignSeasGoodDollarBridge", bridgeAddress);
    const pauserRole = await bridge.PAUSER_ROLE();
    
    if (action === "grant") {
      const tx = await bridge.grantRole(pauserRole, address);
      await tx.wait();
      console.log(`✅ Granted PAUSER_ROLE to ${address}`);
    } else {
      const tx = await bridge.revokeRole(pauserRole, address);
      await tx.wait();
      console.log(`❌ Revoked PAUSER_ROLE from ${address}`);
    }
    return;
  }
  
  console.log("❌ Unknown role:", role);
}

async function getRoleMembers(contract: any, role: string): Promise<string[]> {
  try {
    // Get role member count
    const memberCount = await contract.getRoleMemberCount(role);
    const members: string[] = [];
    
    // Get each member
    for (let i = 0; i < memberCount; i++) {
      const member = await contract.getRoleMember(role, i);
      members.push(member);
    }
    
    return members;
  } catch (error) {
    console.log(`   Warning: Could not get members for role ${role}`);
    return [];
  }
}

// Error handling
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
