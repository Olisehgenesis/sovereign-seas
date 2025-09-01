import { loadLatestDeployment } from "./utils/deployments";
import { promisify } from "util";
import { spawn } from "child_process";

const execAsync = promisify(require("child_process").exec);

type ContractTuple = [string, string[]];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyOnce(address: string, args: string[], network: string) {
  console.log(`🚀 Starting verification for ${address} on ${network}`);
  
  return new Promise<{ address: string; ok: boolean; stdout?: string; stderr?: string }>((resolve) => {
    // Build the command arguments correctly
    const cmdArgs = ['hardhat', 'verify', '--network', network, address];
    if (args && args.length > 0) {
      cmdArgs.push(...args);
    }
    
    console.log(`📝 Command: npx ${cmdArgs.join(' ')}`);
    
    const child = spawn('npx', cmdArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';

    // Add timeout protection
    const timeout = setTimeout(() => {
      console.warn(`⏰ Timeout (60s) reached for ${address}, killing process...`);
      child.kill('SIGKILL');
      resolve({ address, ok: false, stdout, stderr });
    }, 60000); // 60 second timeout

    child.stdout?.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(`[${address}] ${output}`);
    });

    child.stderr?.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(`[${address}] ${output}`);
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        console.log(`✅ Verification completed for ${address}`);
        resolve({ address, ok: true, stdout, stderr });
      } else {
        console.log(`❌ Verification failed for ${address} with code ${code}`);
        resolve({ address, ok: false, stdout, stderr });
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      console.error(`💥 Process error for ${address}:`, error.message);
      resolve({ address, ok: false, stdout, stderr });
    });

    child.on('exit', (code, signal) => {
      clearTimeout(timeout);
      if (signal === 'SIGKILL') {
        console.log(`⏰ Process killed due to timeout for ${address}`);
      } else if (code !== null) {
        console.log(`🔚 Process exited for ${address} with code ${code}`);
      }
    });
  });
}

function isAlreadyVerifiedMessage(msg: string | undefined) {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes("already verified") ||
    m.includes("contract source code already verified") ||
    m.includes("has already been verified") ||
    m.includes("already been verified") ||
    m.includes("already exists")
  );
}

function isRateLimitMessage(msg: string | undefined) {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes("max calls per sec rate limit") ||
    m.includes("rate limit") ||
    m.includes("too many requests") ||
    m.includes("429") ||
    m.includes("throttled")
  );
}

function isNetworkError(msg: string | undefined) {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes("network error") ||
    m.includes("timeout") ||
    m.includes("connection") ||
    m.includes("econnreset") ||
    m.includes("enotfound")
  );
}

function isVerificationError(msg: string | undefined) {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes("verification failed") ||
    m.includes("compilation failed") ||
    m.includes("bytecode mismatch") ||
    m.includes("constructor arguments") ||
    m.includes("invalid address")
  );
}

async function verify(address: string, args: string[], network: string) {
  try {
    const result = await verifyOnce(address, args, network);
    
    if (result.ok) {
      return { address, ok: true };
    }
    
    // Check if already verified
    if (isAlreadyVerifiedMessage(result.stdout) || isAlreadyVerifiedMessage(result.stderr)) {
      console.log(`✅ Already verified: ${address}`);
      return { address, ok: true };
    }
    
    // Check for rate limiting - retry in next cycle
    if (isRateLimitMessage(result.stdout) || isRateLimitMessage(result.stderr)) {
      console.warn(`⚠️  Rate limited for ${address}. Will retry in next cycle...`);
      return { address, ok: false, retry: true };
    }
    
    // Check for network errors - retry in next cycle
    if (isNetworkError(result.stdout) || isNetworkError(result.stderr)) {
      console.warn(`🌐 Network error for ${address}. Will retry in next cycle...`);
      return { address, ok: false, retry: true };
    }
    
    // Check for verification errors - these are usually permanent failures
    if (isVerificationError(result.stdout) || isVerificationError(result.stderr)) {
      console.error(`❌ Verification error for ${address}:`);
      if (result.stdout) console.log(`   STDOUT: ${result.stdout}`);
      if (result.stderr) console.log(`   STDERR: ${result.stderr}`);
      return { address, ok: false, retry: false };
    }
    
    // Unknown error - log details and don't retry
    console.warn(`❓ Unknown verification failure for ${address}:`);
    if (result.stdout) console.log(`   STDOUT: ${result.stdout}`);
    if (result.stderr) console.log(`   STDERR: ${result.stderr}`);
    return { address, ok: false, retry: false };
    
  } catch (e: any) {
    console.error(`💥 Unexpected error for ${address}:`, e?.message || e);
    return { address, ok: false, retry: false };
  }
}

function isContractTuple(v: any): v is ContractTuple {
  return Array.isArray(v) && typeof v[0] === "string" && Array.isArray(v[1]);
}

async function main() {
  const network = process.argv[2] || process.env.HARDHAT_NETWORK || "alfajores";
  const latest = loadLatestDeployment(network);
  if (!latest) throw new Error(`No deployment found for network: ${network}`);
  const c = latest.record.contracts;

  const contracts = (
    [
      [c.projectsModule, []],
      [c.campaignsModule, []],
      [c.votingModule, []],
      [c.treasuryModule, []],
      [c.poolsModule, []],
      [c.migrationModule, []],
      [c.sovereignSeasV5, []],
    ] as ContractTuple[]
  ).filter((t) => isContractTuple(t) && t[0]);

  console.log(`🔍 Starting async verification for ${contracts.length} contracts on ${network}`);
  console.log(`⏱️  Verification cycle will repeat every 5 seconds`);
  console.log(`🚀 Contracts to verify:`);
  contracts.forEach(([addr, args], index) => {
    console.log(`   ${index + 1}. ${addr}${args.length > 0 ? ` (args: ${args.join(', ')})` : ''}`);
  });
  console.log('');

  let cycle = 1;
  const maxCycles = 10; // Maximum verification attempts
  
  while (cycle <= maxCycles) {
    console.log(`\n🔄 Verification Cycle ${cycle}/${maxCycles} - ${new Date().toLocaleTimeString()}`);
    console.log("=" .repeat(60));
    
    // Start all verifications in parallel
    const verificationPromises = contracts.map(([address, args]) => 
      verify(address, args, network)
    );
    
    const results = await Promise.all(verificationPromises);
    
    // Process results
    const successful = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok && !r.retry);
    const retryable = results.filter(r => !r.ok && r.retry);
    
    console.log(`\n📊 Cycle ${cycle} Results:`);
    console.log(`✅ Successful: ${successful.length}/${contracts.length}`);
    console.log(`❌ Failed: ${failed.length}/${contracts.length}`);
    console.log(`🔄 Retryable: ${retryable.length}/${contracts.length}`);
    
    // Show progress percentage
    const progressPercent = Math.round((successful.length / contracts.length) * 100);
    console.log(`📈 Progress: ${progressPercent}% complete`);
    
    if (successful.length === contracts.length) {
      console.log(`\n🎉 All contracts verified successfully!`);
      break;
    }
    
    if (failed.length > 0) {
      console.log(`\n⚠️  Failed verifications (non-retryable):`);
      failed.forEach(r => console.log(`   ${r.address}`));
    }
    
    if (retryable.length > 0) {
      console.log(`\n🔄 Retryable verifications (will retry next cycle):`);
      retryable.forEach(r => console.log(`   ${r.address}`));
    }
    
    if (cycle < maxCycles) {
      console.log(`\n⏳ Waiting 5 seconds before next cycle...`);
      await delay(5000);
    }
    
    cycle++;
  }
  
  if (cycle > maxCycles) {
    console.log(`\n⏰ Maximum verification cycles reached. Some contracts may not be verified.`);
  }
  
  console.log(`\n🏁 Verification process completed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
