import fs from 'fs';
import path from 'path';
import {
  ImplementationVerificationReport,
  VerificationEngineState,
} from '../lib/twoAgentTypes';

const STORAGE_DIR = path.join(process.cwd(), 'storage');
const STATE_FILE_PATH = path.join(STORAGE_DIR, 'two_agent_verification_state.json');

export interface TwoAgentBackendState {
  version: string;
  lastUpdated: string;
  hasExecuted: boolean;
  status: 'VERIFICATION_PENDING' | 'VERIFICATION_BLOCKED' | 'VERIFIED' | 'NOT VERIFIED' | 'BLOCKED';
  engineState: VerificationEngineState;
  publishStatus: 'PUBLISH-READY' | 'DO NOT PUBLISH' | 'VERIFICATION_PENDING';
  publishVerdictBadge: '🟢 PUBLISH-READY' | '🔴 DO NOT PUBLISH' | '🟡 VERIFICATION PENDING' | '🟣 VERIFICATION BLOCKED';
  lastReport: ImplementationVerificationReport | null;
  lastMetaResults?: any;
}

const DEFAULT_STATE: TwoAgentBackendState = {
  version: '2.0.0-PROD',
  lastUpdated: new Date().toISOString(),
  hasExecuted: false,
  status: 'VERIFICATION_PENDING',
  engineState: 'VERIFICATION_PENDING',
  publishStatus: 'DO NOT PUBLISH',
  publishVerdictBadge: '🟡 VERIFICATION PENDING',
  lastReport: null,
  lastMetaResults: null,
};

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    try {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    } catch (err) {
      console.warn('[TwoAgent State] Could not create storage directory:', err);
    }
  }
}

export function getBackendVerificationState(): TwoAgentBackendState {
  ensureStorageDir();
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as TwoAgentBackendState;
      }
    }
  } catch (err) {
    console.warn('[TwoAgent State] Error reading backend verification state from disk:', err);
  }
  return { ...DEFAULT_STATE };
}

export function saveBackendVerificationReport(
  report: ImplementationVerificationReport,
  metaResults?: any
): TwoAgentBackendState {
  ensureStorageDir();

  const isRunnerBlocked =
    report.verificationRunnerStatus === 'FAIL' ||
    report.verificationRunnerStatus === 'BLOCKED' ||
    report.gates.GATE_0_RUNNER_HEALTH.status === 'FAIL' ||
    report.gates.GATE_0_RUNNER_HEALTH.status === 'BLOCKED';

  let status: TwoAgentBackendState['status'];
  let engineState: VerificationEngineState;
  let publishStatus: TwoAgentBackendState['publishStatus'];
  let publishVerdictBadge: TwoAgentBackendState['publishVerdictBadge'];

  if (isRunnerBlocked) {
    status = 'VERIFICATION_BLOCKED';
    engineState = 'VERIFICATION_BLOCKED';
    publishStatus = 'DO NOT PUBLISH';
    publishVerdictBadge = '🟣 VERIFICATION BLOCKED';
    report.finalAcceptanceStatus = 'VERIFICATION_BLOCKED';
    report.publishStatus = 'DO NOT PUBLISH';
    report.publishVerdictBadge = '🔴 DO NOT PUBLISH';
  } else if (
    report.finalAcceptanceStatus === 'VERIFIED' &&
    report.publishStatus === 'PUBLISH-READY' &&
    report.criticalFailures.length === 0
  ) {
    status = 'VERIFIED';
    engineState = 'PUBLISH_READY';
    publishStatus = 'PUBLISH-READY';
    publishVerdictBadge = '🟢 PUBLISH-READY';
  } else {
    status = 'NOT VERIFIED';
    engineState = 'FAILED';
    publishStatus = 'DO NOT PUBLISH';
    publishVerdictBadge = '🔴 DO NOT PUBLISH';
  }

  const newState: TwoAgentBackendState = {
    version: '2.0.0-PROD',
    lastUpdated: new Date().toISOString(),
    hasExecuted: true,
    status,
    engineState,
    publishStatus,
    publishVerdictBadge,
    lastReport: report,
    lastMetaResults: metaResults || null,
  };

  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(newState, null, 2), 'utf-8');
    console.log(`[TwoAgent State] 💾 Authoritative backend verification state saved. Status: ${status}, Publish: ${publishStatus}`);
  } catch (err) {
    console.error('[TwoAgent State] Error writing verification state to disk:', err);
  }

  return newState;
}

export function recordVerificationBlocked(errorMessage: string): TwoAgentBackendState {
  ensureStorageDir();
  const newState: TwoAgentBackendState = {
    version: '2.0.0-PROD',
    lastUpdated: new Date().toISOString(),
    hasExecuted: false,
    status: 'VERIFICATION_BLOCKED',
    engineState: 'VERIFICATION_BLOCKED',
    publishStatus: 'DO NOT PUBLISH',
    publishVerdictBadge: '🟣 VERIFICATION BLOCKED',
    lastReport: null,
    lastMetaResults: { error: errorMessage },
  };

  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(newState, null, 2), 'utf-8');
  } catch (err) {
    console.error('[TwoAgent State] Error writing blocked verification state:', err);
  }

  return newState;
}
