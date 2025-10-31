import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.argv[2];
  const constructorArgs = process.argv.slice(3);

  if (!contractAddress) {
    console.error("❌ Please provide contract address");
    console.log("Usage: npx hardhat run scripts/verify.ts --network <network> <contract-address> [constructor-args...]");
    process.exit(1);
  }

  console.log("🔍 Verifying contract at:", contractAddress);
  console.log("🌐 Network:", await ethers.provider.getNetwork());

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
    });
    
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract already verified");
    } else {
      console.error("❌ Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
