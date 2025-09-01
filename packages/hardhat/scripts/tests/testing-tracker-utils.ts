import * as fs from "fs";
import * as path from "path";

export type TestStatus = "passed" | "failed" | "skipped" | "testing";
export type ModuleStatus = "not_tested" | "testing" | "passed" | "failed" | "partial";

export interface TestCase {
  name: string;
  description: string;
  status: TestStatus;
  executionTime: number;
  gasUsed?: number;
  error?: string;
  timestamp: string;
}

export interface FunctionTestResult {
  status: ModuleStatus;
  testCases: TestCase[];
  lastTested: string;
  coverage: number;
}

export interface ModuleTestResult {
  name: string;
  description: string;
  status: ModuleStatus;
  functions: Record<string, FunctionTestResult>;
  coverage: number;
  lastTested: string;
}

export interface TestScenarioResult {
  status: ModuleStatus;
  description: string;
  testCases: TestCase[];
  lastTested: string;
}

export interface TestingTracker {
  metadata: {
    version: string;
    lastUpdated: string;
    description: string;
    totalModules: number;
    totalFunctions: number;
  };
  modules: Record<string, ModuleTestResult>;
  testScenarios: Record<string, TestScenarioResult>;
  testResults: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    coverage: number;
    lastRun: string;
    executionTime: number;
    gasUsage: {
      total: number;
      average: number;
      max: number;
      min: number;
    };
  };
  deployment: {
    network: string;
    contracts: Record<string, string>;
    lastDeployed: string;
    deploymentHash: string;
  };
  notes: {
    knownIssues: string[];
    improvements: string[];
    nextSteps: string[];
  };
}

export class TestingTrackerManager {
  private trackerPath: string;
  private tracker: TestingTracker;

  constructor(network: string) {
    this.trackerPath = path.join(__dirname, "testing-tracker.json");
    this.tracker = this.loadTracker();
    this.updateMetadata();
  }

  private loadTracker(): TestingTracker {
    try {
      if (fs.existsSync(this.trackerPath)) {
        const data = fs.readFileSync(this.trackerPath, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn("⚠️ Could not load existing tracker, creating new one");
    }

    // Return default tracker structure
    return this.getDefaultTracker();
  }

  private getDefaultTracker(): TestingTracker {
    return {
      metadata: {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        description: "Comprehensive testing tracker for SovereignSeas V5 modules and functions",
        totalModules: 6,
        totalFunctions: 0
      },
      modules: {},
      testScenarios: {},
      testResults: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        coverage: 0,
        lastRun: "",
        executionTime: 0,
        gasUsage: {
          total: 0,
          average: 0,
          max: 0,
          min: 0
        }
      },
      deployment: {
        network: "",
        contracts: {},
        lastDeployed: "",
        deploymentHash: ""
      },
      notes: {
        knownIssues: [],
        improvements: [],
        nextSteps: []
      }
    };
  }

  private updateMetadata() {
    this.tracker.metadata.lastUpdated = new Date().toISOString();
    this.tracker.metadata.totalFunctions = this.countTotalFunctions();
  }

  private countTotalFunctions(): number {
    let count = 0;
    for (const module of Object.values(this.tracker.modules)) {
      count += Object.keys(module.functions).length;
    }
    return count;
  }

  public updateDeployment(network: string, contracts: Record<string, string>, deploymentHash: string) {
    this.tracker.deployment.network = network;
    this.tracker.deployment.contracts = contracts;
    this.tracker.deployment.lastDeployed = new Date().toISOString();
    this.tracker.deployment.deploymentHash = deploymentHash;
    this.saveTracker();
  }

  public startFunctionTest(moduleId: string, functionName: string, testName: string, description: string): string {
    const testCase: TestCase = {
      name: testName,
      description,
      status: "testing",
      executionTime: 0,
      timestamp: new Date().toISOString()
    };

    if (!this.tracker.modules[moduleId]) {
      this.tracker.modules[moduleId] = {
        name: moduleId,
        description: `${moduleId} module`,
        status: "testing",
        functions: {},
        coverage: 0,
        lastTested: new Date().toISOString()
      };
    }

    if (!this.tracker.modules[moduleId].functions[functionName]) {
      this.tracker.modules[moduleId].functions[functionName] = {
        status: "testing",
        testCases: [],
        lastTested: new Date().toISOString(),
        coverage: 0
      };
    }

    this.tracker.modules[moduleId].functions[functionName].testCases.push(testCase);
    this.tracker.modules[moduleId].functions[functionName].status = "testing";
    this.tracker.modules[moduleId].status = "testing";
    
    this.saveTracker();
    return testCase.timestamp; // Return timestamp as test ID
  }

  public completeFunctionTest(moduleId: string, functionName: string, testTimestamp: string, status: "passed" | "failed" | "skipped", executionTime: number, gasUsed?: number, error?: string) {
    const module = this.tracker.modules[moduleId];
    if (!module) return;

    const func = module.functions[functionName];
    if (!func) return;

    const testCase = func.testCases.find(tc => tc.timestamp === testTimestamp);
    if (testCase) {
      testCase.status = status;
      testCase.executionTime = executionTime;
      if (gasUsed) testCase.gasUsed = gasUsed;
      if (error) testCase.error = error;
    }

    // Update function status based on test results
    const testResults = func.testCases.map(tc => tc.status);
    if (testResults.every(r => r === "passed")) {
      func.status = "passed";
    } else if (testResults.some(r => r === "failed")) {
      func.status = "failed";
    } else if (testResults.some(r => r === "passed")) {
      func.status = "partial";
    } else if (testResults.every(r => r === "skipped")) {
      func.status = "not_tested";
    } else {
      func.status = "partial";
    }

    func.lastTested = new Date().toISOString();
    this.updateModuleCoverage(moduleId);
    this.saveTracker();
  }

  public startScenarioTest(scenarioId: string, testName: string, description: string): string {
    const testCase: TestCase = {
      name: testName,
      description,
      status: "testing",
      executionTime: 0,
      timestamp: new Date().toISOString()
    };

    if (!this.tracker.testScenarios[scenarioId]) {
      this.tracker.testScenarios[scenarioId] = {
        status: "testing",
        description: scenarioId,
        testCases: [],
        lastTested: new Date().toISOString()
      };
    }

    this.tracker.testScenarios[scenarioId].testCases.push(testCase);
    this.tracker.testScenarios[scenarioId].status = "testing";
    
    this.saveTracker();
    return testCase.timestamp;
  }

  public completeScenarioTest(scenarioId: string, testTimestamp: string, status: "passed" | "failed" | "skipped", executionTime: number, gasUsed?: number, error?: string) {
    const scenario = this.tracker.testScenarios[scenarioId];
    if (!scenario) return;

    const testCase = scenario.testCases.find(tc => tc.timestamp === testTimestamp);
    if (testCase) {
      testCase.status = status;
      testCase.executionTime = executionTime;
      if (gasUsed) testCase.gasUsed = gasUsed;
      if (error) testCase.error = error;
    }

    // Update scenario status
    const testResults = scenario.testCases.map(tc => tc.status);
    if (testResults.every(r => r === "passed")) {
      scenario.status = "passed";
    } else if (testResults.some(r => r === "failed")) {
      scenario.status = "failed";
    } else if (testResults.some(r => r === "passed")) {
      scenario.status = "partial";
    } else if (testResults.every(r => r === "skipped")) {
      scenario.status = "not_tested";
    } else {
      scenario.status = "partial";
    }

    scenario.lastTested = new Date().toISOString();
    this.saveTracker();
  }

  private updateModuleCoverage(moduleId: string) {
    const module = this.tracker.modules[moduleId];
    if (!module) return;

    const functions = Object.values(module.functions);
    if (functions.length === 0) return;

    const passedFunctions = functions.filter(f => f.status === "passed").length;
    const totalFunctions = functions.length;
    module.coverage = Math.round((passedFunctions / totalFunctions) * 100);
    module.lastTested = new Date().toISOString();

    // Update overall module status
    if (module.coverage === 100) {
      module.status = "passed";
    } else if (module.coverage > 0) {
      module.status = "partial";
    } else {
      module.status = "failed";
    }
  }

  public updateTestResults(totalTests: number, passedTests: number, failedTests: number, skippedTests: number, executionTime: number, gasUsage: { total: number; average: number; max: number; min: number }) {
    this.tracker.testResults.totalTests = totalTests;
    this.tracker.testResults.passedTests = passedTests;
    this.tracker.testResults.failedTests = failedTests;
    this.tracker.testResults.skippedTests = skippedTests;
    this.tracker.testResults.executionTime = executionTime;
    this.tracker.testResults.gasUsage = gasUsage;
    this.tracker.testResults.lastRun = new Date().toISOString();

    // Calculate overall coverage
    const totalFunctions = this.countTotalFunctions();
    const passedFunctions = Object.values(this.tracker.modules).reduce((sum, module) => {
      return sum + Object.values(module.functions).filter(f => f.status === "passed").length;
    }, 0);
    
    this.tracker.testResults.coverage = totalFunctions > 0 ? Math.round((passedFunctions / totalFunctions) * 100) : 0;

    this.saveTracker();
  }

  public addNote(type: "knownIssues" | "improvements" | "nextSteps", note: string) {
    if (!this.tracker.notes[type].includes(note)) {
      this.tracker.notes[type].push(note);
      this.saveTracker();
    }
  }

  public getTracker(): TestingTracker {
    return this.tracker;
  }

  public getModuleStatus(moduleId: string): string {
    return this.tracker.modules[moduleId]?.status || "not_tested";
  }

  public getFunctionStatus(moduleId: string, functionName: string): string {
    return this.tracker.modules[moduleId]?.functions[functionName]?.status || "not_tested";
  }

  public getCoverageReport(): { overall: number; modules: Record<string, number> } {
    const modules: Record<string, number> = {};
    let totalCoverage = 0;
    let moduleCount = 0;

    for (const [moduleId, module] of Object.entries(this.tracker.modules)) {
      modules[moduleId] = module.coverage;
      totalCoverage += module.coverage;
      moduleCount++;
    }

    return {
      overall: moduleCount > 0 ? Math.round(totalCoverage / moduleCount) : 0,
      modules
    };
  }

  private saveTracker() {
    try {
      this.updateMetadata();
      fs.writeFileSync(this.trackerPath, JSON.stringify(this.tracker, null, 2));
    } catch (error) {
      console.error("❌ Failed to save testing tracker:", error);
    }
  }

  public generateReport(): string {
    const coverage = this.getCoverageReport();
    let report = "\n📊 Testing Coverage Report\n";
    report += "=" .repeat(50) + "\n";
    report += `Overall Coverage: ${coverage.overall}%\n`;
    report += `Total Modules: ${this.tracker.metadata.totalModules}\n`;
    report += `Total Functions: ${this.tracker.metadata.totalFunctions}\n`;
    report += `Last Updated: ${this.tracker.metadata.lastUpdated}\n\n`;

    report += "Module Coverage:\n";
    for (const [moduleId, moduleCoverage] of Object.entries(coverage.modules)) {
      const status = this.getModuleStatus(moduleId);
      report += `  ${moduleId}: ${moduleCoverage}% (${status})\n`;
    }

    report += "\nTest Results:\n";
    report += `  Total Tests: ${this.tracker.testResults.totalTests}\n`;
    report += `  Passed: ${this.tracker.testResults.passedTests}\n`;
    report += `  Failed: ${this.tracker.testResults.failedTests}\n`;
    report += `  Skipped: ${this.tracker.testResults.skippedTests}\n`;
    report += `  Coverage: ${this.tracker.testResults.coverage}%\n`;

    if (this.tracker.notes.knownIssues.length > 0) {
      report += "\nKnown Issues:\n";
      this.tracker.notes.knownIssues.forEach(issue => {
        report += `  ⚠️  ${issue}\n`;
      });
    }

    if (this.tracker.notes.improvements.length > 0) {
      report += "\nImprovements:\n";
      this.tracker.notes.improvements.forEach(improvement => {
        report += `  💡 ${improvement}\n`;
      });
    }

    return report;
  }
}
