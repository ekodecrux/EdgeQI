export interface TestCase {
  id: string;
  projectId?: string;
  requirementId?: string;
  title: string;
  description: string;
  preconditions: string;
  steps: { action: string; expectedResult: string }[];
  testData: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  type: 'Positive' | 'Negative' | 'Edge' | 'Boundary';
  automationStatus: 'Automatable' | 'Needs Manual' | 'Automated';
  confidenceScore: number;
}

export interface RequirementDoc {
  id: string;
  projectId?: string;
  title: string;
  content: string;
  sourceType: 'file' | 'text' | 'url' | 'voice' | 'crawler';
  parsedAt: string;
  suggestedModules: string[];
}

export interface DefectHotspot {
  moduleName: string;
  historicalDefectsCount: number;
  predictedRiskScore: number; // 0 - 100
  commonFailureType: string;
  developerPattern: string;
  recommendation: string;
}

export interface ImpactReport {
  changeTrigger: string;
  impactedModule: string;
  riskScore: number;
  impactedTestCaseIds: string[];
  traceabilityMatrix: { [key: string]: string[] };
}

export interface AutomationFeasibility {
  testCaseId: string;
  isAutomatable: 'Yes' | 'No' | 'Partial';
  confidenceScore: number;
  suggestedFramework: string;
  suggestedLocators: { type: string; value: string; priority: number }[];
  detectedTestingChallenges: string[];
  estimatedEffortMinutes: number;
}

export interface ScriptFile {
  fileName: string;
  framework: 'Playwright' | 'Selenium' | 'Cypress' | 'Robot';
  language: 'TypeScript' | 'Java' | 'Python' | 'JavaScript';
  code: string;
}

export interface TestExecutionResult {
  id: string;
  testCaseId: string;
  title: string;
  framework: string;
  status: 'passed' | 'failed' | 'running' | 'healed' | 'pending';
  startTime: string;
  durationMs: number;
  logs: string[];
  screenshot?: string; // Base64 or mock URL
  healedDetails?: {
    originalLocator: string;
    newHealedLocator: string;
    confidence: number;
    strategy: string;
    status: 'Auto-Healed' | 'Pending Approval';
  };
}

export interface PerformanceConfig {
  testType: 'Browser' | 'API';
  endpointOrJourney: string;
  virtualUsers: number;
  durationSeconds: number;
  rampUpTimeSeconds: number;
  rpsLimit?: number;
  metrics?: {
    avgResponseTimeMs: number;
    p90Ms: number;
    p95Ms: number;
    p99Ms: number;
    throughputTps: number;
    errorRate: number;
    cpuUtilization: number;
    memoryUtilization: number;
  };
  timeSeries?: Array<{
    time: number;       // seconds elapsed
    vus: number;
    rps: number;
    latencyMs: number;
  }>;
  aiRecommendations?: string[];
}

export interface SecurityVulnerability {
  id: string;
  title: string;
  type: 'SAST' | 'DAST' | 'SCA' | 'Container';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  toolExposedBy: string;
  vulnerabilityClass: string; // e.g. "SQL Injection", "XSS", "OWASP #3"
  remediationCode: string;
  complianceLabels: string[]; // ['GDPR', 'HIPAA', 'SOC2']
  status: 'Open' | 'Remediated';
}

export interface AgentStep {
  id: string;
  name: string;
  agentName: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  progress: number;
  output?: string;
}

export interface RAGDocument {
  id: string;
  name: string;
  size: string;
  type: string;
  ingestedAt: string;
  chunksCount: number;
  status: 'Ingested' | 'Processing';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userEmail: string;
  action: string;
  agentRole?: string;
  affectedEntity: string;
  details: string;
  latencyMs?: number;
  costEstimate?: number;
}
