/**
 * Two-Agent AI Implementation & Independent Verification Engine - Type Definitions
 * Enforces strict separation between Agent 1 (Implementer) and Agent 2 (Verifier).
 */

export type VerificationEngineState =
  | 'IDLE'
  | 'VERIFICATION_PENDING'
  | 'IMPLEMENTING'
  | 'VERIFYING'
  | 'FAILED'
  | 'FIXING'
  | 'RETESTING'
  | 'VERIFIED'
  | 'PUBLISH_READY'
  | 'ROLLED_BACK'
  | 'VERIFICATION_BLOCKED'
  | 'BLOCKED';

export type TestStatus =
  | 'PASS'
  | 'FAIL'
  | 'BLOCKED'
  | 'NOT_APPLICABLE'
  | 'NOT_EXECUTED';

export type TestSeverity =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW';

export type GateId =
  | 'GATE_0_RUNNER_HEALTH'
  | 'GATE_1_SYNTAX_TYPE_BUILD'
  | 'GATE_2_UNIT_TESTS'
  | 'GATE_3_FEATURE_INTEGRATION'
  | 'GATE_4_LIVE_FUNCTIONAL'
  | 'GATE_5_ADVERSARIAL_NEGATIVE'
  | 'GATE_6_DATA_PERSISTENCE'
  | 'GATE_7_API_CONTRACT'
  | 'GATE_8_UI_RENDERING'
  | 'GATE_9_IMPORT_EXPORT'
  | 'GATE_10_REGRESSION'
  | 'GATE_11_CHANGE_SCOPE'
  | 'GATE_12_ACCEPTANCE_GATE';

export interface TestResult {
  testId: string;
  category: string;
  description: string;
  applicable: boolean;
  executed: boolean;
  status: TestStatus;
  severity: TestSeverity;
  evidence: string;
  durationMs?: number;
  error?: string;
  stackTrace?: string;
  affectedFiles?: string[];
  remediation?: string;
  timestamp: string;
}

export interface GateExecutionResult {
  gateId: GateId;
  gateName: string;
  gateNumber: number;
  description: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIPPED' | 'NOT_APPLICABLE';
  mandatory: boolean;
  applicable: boolean;
  tests: TestResult[];
  passCount: number;
  failCount: number;
  blockedCount: number;
  notApplicableCount: number;
  notExecutedCount: number;
  durationMs: number;
  errorSummary?: string;
}

export interface ChangeScopeManifest {
  manifestId: string;
  requestedFeature: string;
  userPrompt: string;
  expectedFiles: string[];
  expectedModules: string[];
  expectedRoutes: string[];
  expectedServices: string[];
  expectedDataChanges: string[];
  declaredBy: 'AGENT_1_IMPLEMENTER';
  createdAt: string;
  actualModifiedFiles?: string[];
  scopeViolationDetected?: boolean;
  unauthorizedModifications?: string[];
}

export interface SafeSnapshotRecord {
  snapshotId: string;
  timestamp: string;
  description: string;
  manifestId?: string;
  filesSummary: {
    totalFilesTracked: number;
    fileKeys: string[];
  };
  stateBackup?: any;
  isKnownGood: boolean;
  createdBy: 'AGENT_1' | 'SYSTEM' | 'USER';
  healthStatus?: 'HEALTHY' | 'UNHEALTHY';
}

export interface DiagnosticFeedback {
  feedbackId: string;
  timestamp: string;
  failedGate: GateId;
  failedTests: TestResult[];
  rootCauseAnalysis: string;
  suggestedFixes: string[];
  retryAttempt: number;
  maxRetries: number;
  isFatal: boolean;
}

export interface ImplementationVerificationReport {
  reportId: string;
  timestamp: string;
  taskDescription: string;
  agent1Status: 'IMPLEMENTATION COMPLETE' | 'FAILED' | 'PENDING';
  agent2Status: 'VERIFICATION COMPLETE' | 'FAILED' | 'BLOCKED' | 'PENDING';
  changeScopeStatus: 'PASS' | 'FAIL' | 'PENDING';
  verificationRunnerStatus: 'PASS' | 'FAIL' | 'BLOCKED' | 'PENDING';
  buildStatus: 'PASS' | 'FAIL' | 'PENDING';
  unitTestsScore: { pass: number; total: number; ratio: string };
  integrationTestsScore: { pass: number; total: number; ratio: string };
  liveFunctionalTestsScore: { pass: number; total: number; ratio: string };
  adversarialTestsScore: { pass: number; total: number; ratio: string };
  apiTestsScore: { pass: number; total: number; ratio: string };
  uiTestsScore: { pass: number; total: number; ratio: string; isNA?: boolean };
  dataPersistenceScore: { pass: number; total: number; ratio: string };
  importExportScore: { pass: number; total: number; ratio: string; isNA?: boolean };
  regressionScore: { pass: number; total: number; ratio: string };
  aiContentIntegrityStatus: 'PASS' | 'FAIL' | 'N/A';
  scientificIntegrityStatus: 'PASS' | 'FAIL' | 'N/A';
  criticalFailures: string[];
  warnings: string[];
  automaticFixAttempts: number;
  rollbackTriggered: boolean;
  rollbackSucceeded?: boolean;
  finalAcceptanceStatus: 'VERIFIED' | 'NOT VERIFIED' | 'VERIFICATION_PENDING' | 'VERIFICATION_BLOCKED' | 'BLOCKED';
  publishStatus: 'PUBLISH-READY' | 'DO NOT PUBLISH' | 'VERIFICATION_PENDING';
  publishVerdictBadge: '🟢 PUBLISH-READY' | '🔴 DO NOT PUBLISH' | '🟡 VERIFICATION PENDING' | '🟣 VERIFICATION BLOCKED';
  evidenceList: string[];
  rawFormattedReport: string;
  gates: Record<GateId, GateExecutionResult>;
}

export interface MetaTestScenarioResult {
  scenarioId: string;
  scenarioName: string;
  description: string;
  simulatedFault: string;
  expectedOutcome: 'BLOCK_PUBLISH' | 'TRIGGER_RETRY' | 'TRIGGER_ROLLBACK' | 'PASS_AFTER_FIX';
  actualOutcome: string;
  blockedPublishConfirmed: boolean;
  rollbackConfirmed?: boolean;
  passed: boolean;
  evidence: string;
}
