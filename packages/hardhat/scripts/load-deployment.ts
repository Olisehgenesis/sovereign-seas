import { loadLatestDeployment, listDeploymentFiles } from "./utils/deployments";

async function main() {
  const args = process.argv.slice(2);
  const network = args[0] || process.env.HARDHAT_NETWORK || "hardhat";

  const latest = loadLatestDeployment(network);
  if (!latest) {
    console.log(`No deployment found for network: ${network}`);
    const all = listDeploymentFiles(network);
    if (all.length === 0) {
      process.exit(0);
    }
  } else {
    console.log(`Latest deployment for ${network}: ${latest.path}`);
    console.log(JSON.stringify(latest.record, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


