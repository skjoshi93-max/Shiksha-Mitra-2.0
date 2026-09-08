/**
 * Agent 2 - Independent Verification Agent
 * Responsibilities:
 * 1. Operates completely independently from Agent 1.
 * 2. Rejects self-proclaimed "PASS" or "Complete" statements from Agent 1 without proof.
 * 3. Inspects modified files and detects Scope Violations.
 * 4. Executes actual tests across all 13 gates (Gates 0 to 12).
 * 5. If tests fail, produces structured Diagnostic Feedback for Agent 1.
 * 6. Manages Fix -> Retest loop (default max 3 attempts).
 * 7. On persistent failure, triggers automated Rollback to last known-good snapshot.
 * 8. Machine-enforces Acceptance Gate publication decisions.
 */

import {
  ImplementationVerificationReport,
  DiagnosticFeedback,
  VerificationEngineState,
  ChangeScopeManifest,
} from './twoAgentTypes';
import { TwoAgentVerificationEngine } from './twoAgentVerificationEngine';
import { SafeSnapshotManager } from './safeSnapshotManager';
import { Agent1HandoffPayload } from './agent1Implementer';

export interface VerificationCycleResult {
  report: ImplementationVerificationReport;
  engineState: VerificationEngineState;
  feedback?: DiagnosticFeedback;
  rollbackTriggered: boolean;
  rollbackSucceeded?: boolean;
  attemptsUsed: number;
}

export class Agent2Verifier {
  private static MAX_AUTO_REPAIR_ATTEMPTS = 3;

  /**
   * Execute independent verification on an Agent 1 handoff payload
   */
  public static async verifyHandoff(
    handoff: Agent1HandoffPayload,
    options: {
      hostUrl?: string;
      currentAttempt?: number;
    } = {}
  ): Promise<VerificationCycleResult> {
    const attempt = options.currentAttempt || 1;
    console.log(`[Agent 2 - Independent Verifier] 🔍 Beginning Independent Verification (Attempt ${attempt}/${this.MAX_AUTO_REPAIR_ATTEMPTS})...`);

    // 1. Independent Scope Inspection
    const manifest = handoff.manifest;
    const actualFiles = manifest.actualModifiedFiles || manifest.expectedFiles;
    const unauthorizedFiles = actualFiles.filter((f) => !manifest.expectedFiles.includes(f));

    if (unauthorizedFiles.length > 0) {
      manifest.scopeViolationDetected = true;
      manifest.unauthorizedModifications = unauthorizedFiles;
      console.warn(`[Agent 2 - Independent Verifier] ⚠️ SCOPE VIOLATION DETECTED: Unauthorized modifications to ${unauthorizedFiles.join(', ')}`);
    }

    // 2. Execute full 13-gate verification engine
    const report = await TwoAgentVerificationEngine.runFullVerificationPipeline({
      taskDescription: manifest.requestedFeature,
      manifest,
      hostUrl: options.hostUrl,
    });

    report.automaticFixAttempts = attempt - 1;

    // 3. Evaluate results
    if (report.publishStatus === 'PUBLISH-READY' && report.finalAcceptanceStatus === 'VERIFIED') {
      console.log(`[Agent 2 - Independent Verifier] ✅ Verification Complete: All gates passed. PUBLISH-READY.`);
      return {
        report,
        engineState: 'PUBLISH_READY',
        rollbackTriggered: false,
        attemptsUsed: attempt,
      };
    }

    // 4. Handle Failure Condition
    console.warn(`[Agent 2 - Independent Verifier] ❌ Verification FAILED or BLOCKED on Gate(s). Evaluating retry loop...`);

    const failedGateEntry = Object.entries(report.gates).find(
      ([_, g]) => g.status === 'FAIL' || g.status === 'BLOCKED'
    );
    const failedGate = (failedGateEntry ? failedGateEntry[0] : 'GATE_0_RUNNER_HEALTH') as any;

    const feedback: DiagnosticFeedback = {
      feedbackId: `FB-${Date.now()}`,
      timestamp: new Date().toISOString(),
      failedGate,
      failedTests: report.criticalFailures.map((cf) => ({
        testId: 'CRIT-FAIL',
        category: 'Failure Diagnostic',
        description: cf,
        applicable: true,
        executed: true,
        status: 'FAIL',
        severity: 'CRITICAL',
        evidence: cf,
        timestamp: new Date().toISOString(),
      })),
      rootCauseAnalysis: `Gate ${failedGate} encountered failure during execution: ${report.criticalFailures.join('; ')}`,
      suggestedFixes: [
        'Inspect affected module implementation and restore schema contracts',
        'Ensure runner watchdog has full read/write access and valid exit codes',
        'Remove any unapproved modifications outside declared manifest scope',
      ],
      retryAttempt: attempt,
      maxRetries: this.MAX_AUTO_REPAIR_ATTEMPTS,
      isFatal: attempt >= this.MAX_AUTO_REPAIR_ATTEMPTS,
    };

    // 5. Persistent Failure: Trigger Automated Rollback
    if (attempt >= this.MAX_AUTO_REPAIR_ATTEMPTS) {
      console.error(`[Agent 2 - Independent Verifier] 🛑 Maximum repair attempts (${this.MAX_AUTO_REPAIR_ATTEMPTS}) exhausted. Initiating Safe Snapshot Rollback...`);

      const rollbackResult = SafeSnapshotManager.rollbackToSnapshot(handoff.snapshot.snapshotId);
      report.rollbackTriggered = true;
      report.rollbackSucceeded = rollbackResult.success;
      report.finalAcceptanceStatus = 'BLOCKED';
      report.publishStatus = 'DO NOT PUBLISH';
      report.publishVerdictBadge = '🔴 DO NOT PUBLISH';
      report.rawFormattedReport = TwoAgentVerificationEngine.formatImplementationReport(report);

      return {
        report,
        engineState: 'ROLLED_BACK',
        feedback,
        rollbackTriggered: true,
        rollbackSucceeded: rollbackResult.success,
        attemptsUsed: attempt,
      };
    }

    return {
      report,
      engineState: 'FIXING',
      feedback,
      rollbackTriggered: false,
      attemptsUsed: attempt,
    };
  }
}
