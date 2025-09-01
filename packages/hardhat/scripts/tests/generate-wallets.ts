import * as fs from "fs";
import * as path from "path";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";

interface TestWalletInfo {
  index: number;
  address: string;
  privateKey: string;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  const outDir = path.join(__dirname, "..", "..", "wallets");
  ensureDir(outDir);

  const count = Number(process.argv[2] || 6);
  const rpcUrl = process.env.RPC_URL || "https://alfajores-forno.celo-testnet.org";

  const client = createWalletClient({ chain: celoAlfajores, transport: http(rpcUrl) });

  const wallets: TestWalletInfo[] = [];
  for (let i = 0; i < count; i++) {
    const pk = (globalThis.crypto?.getRandomValues
      ? Array.from(globalThis.crypto.getRandomValues(new Uint8Array(32)))
      : Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const privateKey = (`0x${pk}`) as `0x${string}`;
    const account = privateKeyToAccount(privateKey);
    wallets.push({ index: i + 1, address: account.address, privateKey });
  }

  const filePath = path.join(outDir, `alfajores-wallets.json`);
  fs.writeFileSync(filePath, JSON.stringify({ network: "alfajores", wallets }, null, 2));
  console.log(`Saved ${wallets.length} wallets to ${filePath}`);
  console.log("Fund these addresses with CELO on Alfajores, then rerun tests.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


