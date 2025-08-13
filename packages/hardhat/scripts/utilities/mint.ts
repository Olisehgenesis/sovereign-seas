import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const provider = new ethers.providers.JsonRpcProvider("https://alfajores-forno.celo-testnet.org");
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  console.error("Private key not found in .env file");
  process.exit(1);
}

const wallet = new ethers.Wallet(privateKey, provider);

// Address of the mcelo token contract (replace with actual mcelo contract address)
const MCeloTokenAddress = "0x3FC1f6138F4b0F5Da3E1927412Afe5c68ed4527b";
const recipient = "0xB8f936be2B12406391B4232647593Cdb62dF2203";
const amount = ethers.utils.parseUnits("1000", 18); // Assuming 18 decimal places

const abi = [
  "function cmint(address to, uint256 amount) public returns (bool)"
];

async function mintToken() {
  try {
    const contract = new ethers.Contract(MCeloTokenAddress, abi, wallet);
    const tx = await contract.cmint(recipient, amount);
    console.log("Transaction sent: ", tx.hash);
    await tx.wait();
    console.log("Transaction confirmed");
  } catch (error) {
    console.error("Error minting mcelo:", error);
  }
}

mintToken();
