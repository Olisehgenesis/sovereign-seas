import * as fs from "fs";
import * as path from "path";
import { loadLatestDeployment } from "../utils/deployments";

export interface TestState {
  network: string;
  timestamp: string;
  deploymentPath?: string;
  seasToken?: string;
  wallets?: { address: string; privateKey?: string }[];
  projects?: { id: bigint; owner: string; name: string }[];
  campaigns?: { id: bigint; name: string; isERC20: boolean; tokenAddress?: string }[];
  votingSessions?: { id: bigint; campaignId: bigint; isActive: boolean }[];
  completedSteps?: string[];
  seasDistributed?: boolean;
  projectsCreated?: boolean;
  campaignsCreated?: boolean;
  votingCompleted?: boolean;
  distributionCompleted?: boolean;
  feesTested?: boolean;
  zeroFeesTested?: boolean;
  testFeesTested?: boolean;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function loadState(network: string): TestState | undefined {
  const dir = path.join(__dirname, "..", "..", "tests-state");
  const p = path.join(dir, `${network}.json`);
  if (!fs.existsSync(p)) return undefined;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function saveState(network: string, state: Partial<TestState>) {
  const dir = path.join(__dirname, "..", "..", "tests-state");
  ensureDir(dir);
  const p = path.join(dir, `${network}.json`);
  const existing = fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, "utf8")) as TestState) : {};
  const next: TestState = {
    network,
    timestamp: new Date().toISOString(),
    ...existing,
    ...state,
  } as TestState;
  
  // Convert BigInt values to strings for JSON serialization
  const serializableState = JSON.parse(JSON.stringify(next, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }));
  
  // Add debugging information
  const debugInfo = {
    ...serializableState,
    debug: {
      lastSaved: new Date().toISOString(),
      network: network,
      totalProjects: serializableState.projects?.length || 0,
      totalCampaigns: serializableState.campaigns?.length || 0,
      completedSteps: serializableState.completedSteps || [],
      campaignDetails: serializableState.campaigns?.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        isERC20: campaign.isERC20,
        tokenAddress: campaign.tokenAddress
      })) || [],
      projectDetails: serializableState.projects?.map(project => ({
        id: project.id,
        name: project.name,
        owner: project.owner
      })) || []
    }
  };
  
  fs.writeFileSync(p, JSON.stringify(debugInfo, null, 2));
  console.log(`💾 Test state saved with debug info: ${p}`);
  return next;
}

export function ensureDeployment(network: string) {
  const latest = loadLatestDeployment(network);
  if (!latest) throw new Error(`No deployment found for ${network}. Run deploy first.`);
  saveState(network, { deploymentPath: latest.path });
  return latest;
}


