/**
 * Standalone Independent Two-Agent Verification Script
 * Deterministically executes all 13 gates and meta-tests from CLI or automated build runner.
 * 
 * Exit Code 0: VERIFIED / PUBLISH-READY
 * Exit Code 1: NOT VERIFIED / BLOCKED / CRITICAL FAILURE
 */

import { TwoAgentVerificationEngine } from './lib/twoAgentVerificationEngine';
import {
  saveBackendVerificationReport,
  recordVerificationBlocked,
} from './server/twoAgentStateStore';

async function main() {
  console.log('============================================================');
  console.log('TWO-AGENT INDEPENDENT VERIFICATION & ACCEPTANCE ENGINE');
  console.log('Executing deterministic 13-gate verification pipeline...');
  console.log('============================================================\n');

  try {
    // 1. Run Meta-Test Suite first to verify the verification engine itself
    console.log('--- PHASE 1: Meta-Testing Verification Engine Watchdogs ---');
    const metaResults = await TwoAgentVerificationEngine.runMetaTestSuite();
    console.log(metaResults.summary);
    metaResults.scenarios.forEach((s) => {
      console.log(`  [${s.passed ? 'PASS' : 'FAIL'}] ${s.scenarioName}: ${s.evidence}`);
    });

    if (!metaResults.passed) {
      console.error('\n❌ CRITICAL: Meta-Test Suite failed! Acceptance engine compromised. Publication BLOCKED.');
      recordVerificationBlocked('Meta-Test Suite watchdog failed');
      process.exit(1);
    }

    console.log('\n--- PHASE 2: Executing Full 13-Gate Production Verification ---');
    const report = await TwoAgentVerificationEngine.runFullVerificationPipeline({
      taskDescription: 'Production Portal Two-Agent Independent Verification',
    });

    console.log('\n' + report.rawFormattedReport + '\n');

    // Save authoritative verification state to backend disk store
    saveBackendVerificationReport(report, metaResults);

    if (report.publishStatus === 'PUBLISH-READY' && report.finalAcceptanceStatus === 'VERIFIED') {
      console.log('✅ VERIFIED: All mandatory gates passed. System is PUBLISH-READY.');
      process.exit(0);
    } else {
      console.error('🔴 DO NOT PUBLISH: One or more gates failed or runner was blocked.');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ UNHANDLED RUNNER EXCEPTION in Verification Pipeline:');
    console.error(error?.stack || error?.message || error);
    console.error('\nSTATUS: NOT VERIFIED / BLOCKED');
    console.error('PUBLISH: BLOCKED');
    recordVerificationBlocked(error?.message || 'Unhandled runner exception in verify_two_agent');
    process.exit(1);
  }
}

main();
