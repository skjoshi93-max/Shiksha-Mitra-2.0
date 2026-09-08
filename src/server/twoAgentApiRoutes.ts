/**
 * Two-Agent AI Implementation & Independent Verification Engine - Express API Router
 * Endpoints for status inspection, full pipeline execution, snapshots, rollback, and meta-tests.
 * 
 * Machine-Enforced Backend Source of Truth:
 * - The frontend is ONLY a control/display surface.
 * - All gate execution, acceptance evaluation, and publication gating occur server-side.
 * - Prevents manual status spoofing or bypassing Agent 2 verification.
 */

import { Router, Request, Response } from 'express';
import { TwoAgentVerificationEngine } from '../lib/twoAgentVerificationEngine';
import { SafeSnapshotManager } from '../lib/safeSnapshotManager';
import { Agent1Implementer } from '../lib/agent1Implementer';
import { Agent2Verifier } from '../lib/agent2Verifier';
import {
  getBackendVerificationState,
  saveBackendVerificationReport,
  recordVerificationBlocked,
} from './twoAgentStateStore';

export const twoAgentRouter = Router();

/**
 * GET /api/dev/verification/status
 * Returns current machine-authoritative backend verification state and report
 */
twoAgentRouter.get('/status', (req: Request, res: Response) => {
  const backendState = getBackendVerificationState();
  res.json({
    success: true,
    engine: 'Two-Agent Independent Verification & Acceptance Engine',
    version: backendState.version,
    status: backendState.status,
    engineState: backendState.engineState,
    publishStatus: backendState.publishStatus,
    publishVerdictBadge: backendState.publishVerdictBadge,
    hasExecuted: backendState.hasExecuted,
    lastReport: backendState.lastReport,
    lastMetaResults: backendState.lastMetaResults,
    snapshotsAvailable: SafeSnapshotManager.getAllSnapshots().length,
  });
});

/**
 * POST /api/dev/verification/run-all
 * Triggers complete 13-gate independent verification suite on the backend
 */
twoAgentRouter.post('/run-all', async (req: Request, res: Response) => {
  try {
    const { taskDescription, hostUrl, manifest } = req.body || {};
    const report = await TwoAgentVerificationEngine.runFullVerificationPipeline({
      taskDescription: taskDescription || 'Full Portal Independent Verification Run',
      hostUrl: hostUrl || `${req.protocol}://${req.get('host')}`,
      manifest: manifest || undefined,
    });

    const savedState = saveBackendVerificationReport(report);

    res.json({
      success: true,
      report,
      status: savedState.status,
      engineState: savedState.engineState,
      publishStatus: savedState.publishStatus,
      publishBadge: savedState.publishVerdictBadge,
      publishVerdictBadge: savedState.publishVerdictBadge,
    });
  } catch (err: any) {
    console.error('[TwoAgent API] Error executing full verification pipeline:', err);
    const blockedState = recordVerificationBlocked(err?.message || 'Verification runner failed');
    res.status(500).json({
      success: false,
      status: blockedState.status,
      engineState: blockedState.engineState,
      publishStatus: blockedState.publishStatus,
      publishVerdictBadge: blockedState.publishVerdictBadge,
      error: {
        code: 'VERIFICATION_BLOCKED',
        message: err?.message || 'Verification pipeline encountered unexpected error',
      },
    });
  }
});

/**
 * POST /api/dev/verification/run-meta-test
 * Executes meta-test suite to verify the Two-Agent system itself on the backend
 */
twoAgentRouter.post('/run-meta-test', async (req: Request, res: Response) => {
  try {
    const metaResults = await TwoAgentVerificationEngine.runMetaTestSuite();
    res.json({
      success: true,
      metaResults,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'META_TEST_ERROR',
        message: err?.message || 'Meta-test execution failed',
      },
    });
  }
});

/**
 * GET /api/dev/snapshots
 * Returns list of point-in-time Safe Snapshots from backend store
 */
twoAgentRouter.get('/snapshots', (req: Request, res: Response) => {
  const snapshots = SafeSnapshotManager.getAllSnapshots();
  res.json({
    success: true,
    count: snapshots.length,
    snapshots,
  });
});

/**
 * POST /api/dev/snapshots/create
 * Creates a new point-in-time safe snapshot on the backend
 */
twoAgentRouter.post('/snapshots/create', (req: Request, res: Response) => {
  try {
    const { description, filesTracked, createdBy } = req.body || {};
    const snapshot = SafeSnapshotManager.createSnapshot({
      description: description || 'Manual developer safe snapshot',
      filesTracked,
      createdBy: createdBy || 'USER',
    });

    res.json({
      success: true,
      snapshot,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SNAPSHOT_CREATION_FAILED',
        message: err?.message || 'Failed creating snapshot',
      },
    });
  }
});

/**
 * POST /api/dev/snapshots/rollback
 * Reverts to a specific snapshot and runs post-rollback health verification on backend
 */
twoAgentRouter.post('/snapshots/rollback', (req: Request, res: Response) => {
  try {
    const { snapshotId } = req.body || {};
    if (!snapshotId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SNAPSHOT_ID',
          message: 'snapshotId is required for rollback',
        },
      });
    }

    const rollbackResult = SafeSnapshotManager.rollbackToSnapshot(snapshotId);
    res.json({
      success: rollbackResult.success,
      restoredSnapshot: rollbackResult.restoredSnapshot,
      postRollbackHealthCheck: rollbackResult.postRollbackHealthCheck,
      error: rollbackResult.error,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ROLLBACK_FAILED',
        message: err?.message || 'Rollback execution failed',
      },
    });
  }
});

/**
 * POST /api/dev/verification/agent1-submit
 * Agent 1 submits change manifest & triggers Agent 2 independent verification on backend
 */
twoAgentRouter.post('/agent1-submit', async (req: Request, res: Response) => {
  try {
    const { requestedFeature, userPrompt, expectedFiles, actualModifiedFiles } = req.body || {};

    const manifest = Agent1Implementer.createChangeScopeManifest({
      requestedFeature: requestedFeature || 'Developer Feature Update',
      userPrompt: userPrompt || 'Apply code changes',
      expectedFiles: expectedFiles || ['src/App.tsx'],
    });

    const handoff = Agent1Implementer.prepareHandoff({
      manifest,
      actualModifiedFiles: actualModifiedFiles || expectedFiles,
      preCheckSyntaxPassed: true,
    });

    const verificationCycle = await Agent2Verifier.verifyHandoff(handoff, {
      hostUrl: `${req.protocol}://${req.get('host')}`,
    });

    const savedState = saveBackendVerificationReport(verificationCycle.report);

    res.json({
      success: true,
      handoff,
      verificationCycle,
      status: savedState.status,
      engineState: savedState.engineState,
      publishStatus: savedState.publishStatus,
      publishVerdictBadge: savedState.publishVerdictBadge,
    });
  } catch (err: any) {
    console.error('[TwoAgent API] Error processing agent handoff:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'HANDOFF_EXECUTION_FAILED',
        message: err?.message || 'Failed processing Two-Agent handoff',
      },
    });
  }
});

/**
 * GET /api/dev/verification/report
 * Returns the exact formatted Implementation Verification Report from backend
 */
twoAgentRouter.get('/report', async (req: Request, res: Response) => {
  const backendState = getBackendVerificationState();
  if (backendState.lastReport) {
    return res.type('text/plain').send(backendState.lastReport.rawFormattedReport);
  }

  // If no report has been executed yet, return authoritative PENDING notice
  const pendingReport = `========================================
IMPLEMENTATION VERIFICATION REPORT
========================================

Status: VERIFICATION_PENDING
Message: Agent 2 has not yet executed independent verification tests on this build.

Action Required:
Run 'npm run verify' or trigger 'Run All 13 Gates' via the backend verification pipeline.

Publish Status: 🔴 DO NOT PUBLISH
========================================`;

  res.type('text/plain').send(pendingReport);
});
