import * as fs from "fs";
import * as path from "path";

export interface DeploymentRecord {
  network: string;
  deployer: string;
  timestamp: string;
  contracts: {
    projectsModule: string;
    campaignsModule: string;
    votingModule: string;
    treasuryModule: string;
    poolsModule: string;
    migrationModule: string;
    sovereignSeasV5: string;
    seasToken?: string;
  };
}

const rootDir = path.join(__dirname, "..", "..");
const deploymentsRootDir = path.join(rootDir, "deployments");

function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getNetworkDir(network: string): string {
  return path.join(deploymentsRootDir, network);
}

function generateFilenameTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

export function saveDeployment(network: string, record: DeploymentRecord): string {
  ensureDirectoryExists(deploymentsRootDir);
  const netDir = getNetworkDir(network);
  ensureDirectoryExists(netDir);

  const date = new Date(record.timestamp || Date.now());
  const filename = `${generateFilenameTimestamp(date)}.json`;
  const filePath = path.join(netDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));

  const latestPath = path.join(netDir, "latest.json");
  fs.writeFileSync(latestPath, JSON.stringify(record, null, 2));

  return filePath;
}

export function listDeploymentFiles(network: string): string[] {
  const netDir = getNetworkDir(network);
  if (!fs.existsSync(netDir)) {
    return [];
  }
  return fs
    .readdirSync(netDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(netDir, f));
}

export function loadLatestDeployment(network: string): { path: string; record: DeploymentRecord } | undefined {
  const netDir = getNetworkDir(network);
  const latestPath = path.join(netDir, "latest.json");
  if (fs.existsSync(latestPath)) {
    const record = JSON.parse(fs.readFileSync(latestPath, "utf8")) as DeploymentRecord;
    return { path: latestPath, record };
  }

  const files = listDeploymentFiles(network).filter((p) => !p.endsWith("latest.json"));
  if (files.length === 0) {
    return undefined;
  }
  const withStats = files.map((p) => ({ p, mtime: fs.statSync(p).mtimeMs }));
  withStats.sort((a, b) => b.mtime - a.mtime);
  const newest = withStats[0].p;
  const record = JSON.parse(fs.readFileSync(newest, "utf8")) as DeploymentRecord;
  return { path: newest, record };
}

export function loadDeploymentByPath(filePath: string): DeploymentRecord | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as DeploymentRecord;
}


