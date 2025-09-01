import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import { ensureDeployment, loadState, saveState } from "./state";

async function main() {
  const network = "alfajores";
  const rpcUrl = process.env.RPC_URL || "https://alfajores-forno.celo-testnet.org";
  const publicClient = createPublicClient({ chain: celoAlfajores, transport: http(rpcUrl) });

  const latest = ensureDeployment(network);
  console.log(`Using deployment: ${latest.path}`);

  const walletsPath = path.join(__dirname, "..", "..", "wallets", `${network}-wallets.json`);
  if (!fs.existsSync(walletsPath)) throw new Error(`Wallet file missing: ${walletsPath}`);
  const wallets = (JSON.parse(fs.readFileSync(walletsPath, "utf8")) as { wallets: { privateKey: `0x${string}`; address: string }[] }).wallets;

  // Ensure funded
  for (const w of wallets) {
    const bal = await publicClient.getBalance({ address: w.address as `0x${string}` });
    if (bal < parseEther("0.6")) {
      console.log(`Waiting for funding: ${w.address} (have ${bal})`);
      throw new Error("Please fund test wallets with CELO and rerun");
    }
  }

  const admin = privateKeyToAccount(wallets[0].privateKey);
  const adminClient = createWalletClient({ chain: celoAlfajores, transport: http(rpcUrl), account: admin });

  // TODO: call ProjectsModule.createProject via proxy selector routing using viem (requires ABI). For brevity, we store step marker only.
  saveState(network, { wallets, projects: [], campaigns: [] });
  console.log("State saved. Implement detailed calls as needed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


