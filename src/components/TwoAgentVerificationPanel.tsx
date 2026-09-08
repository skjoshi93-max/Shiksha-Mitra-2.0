import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Play,
  RotateCcw,
  Camera,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Download,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  History,
  FileCode,
  Check,
  ChevronDown,
  ChevronRight,
  Shield,
  Server,
  Lock,
} from 'lucide-react';
import {
  GateId,
  ImplementationVerificationReport,
  SafeSnapshotRecord,
  VerificationEngineState,
  MetaTestScenarioResult,
  ChangeScopeManifest,
} from '../lib/twoAgentTypes';

interface BackendVerificationStatusResponse {
  success: boolean;
  engine: string;
  version: string;
  status: 'VERIFICATION_PENDING' | 'VERIFICATION_BLOCKED' | 'VERIFIED' | 'NOT VERIFIED' | 'BLOCKED';
  engineState: VerificationEngineState;
  publishStatus: 'PUBLISH-READY' | 'DO NOT PUBLISH' | 'VERIFICATION_PENDING';
  publishVerdictBadge: string;
  hasExecuted: boolean;
  lastReport: ImplementationVerificationReport | null;
  lastMetaResults?: any;
  snapshotsAvailable: number;
}

export const TwoAgentVerificationPanel: React.FC = () => {
  const [engineState, setEngineState] = useState<VerificationEngineState>('VERIFICATION_PENDING');
  const [statusText, setStatusText] = useState<string>('VERIFICATION_PENDING');
  const [publishStatus, setPublishStatus] = useState<string>('DO NOT PUBLISH');
  const [publishBadge, setPublishBadge] = useState<string>('🟡 VERIFICATION PENDING');
  const [isRunning, setIsRunning] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'pipeline' | 'report' | 'snapshots' | 'metatest' | 'manifest'>('pipeline');
  const [report, setReport] = useState<ImplementationVerificationReport | null>(null);
  const [snapshots, setSnapshots] = useState<SafeSnapshotRecord[]>([]);
  const [metaResults, setMetaResults] = useState<{
    passed: boolean;
    scenarios: MetaTestScenarioResult[];
    summary: string;
  } | null>(null);
  const [expandedGates, setExpandedGates] = useState<Record<string, boolean>>({
    GATE_0_RUNNER_HEALTH: true,
    GATE_12_ACCEPTANCE_GATE: true,
  });
  const [copySuccess, setCopySuccess] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // New Manifest Form State
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newExpectedFiles, setNewExpectedFiles] = useState('src/components/SettingsView.tsx, src/types.ts');
  const [activeManifest, setActiveManifest] = useState<ChangeScopeManifest | null>(null);

  // Fetch backend-authoritative status
  const fetchBackendStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/dev/verification/status', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data: BackendVerificationStatusResponse = await res.json();
        setStatusText(data.status || 'VERIFICATION_PENDING');
        setEngineState(data.engineState || 'VERIFICATION_PENDING');
        setPublishStatus(data.publishStatus || 'DO NOT PUBLISH');
        setPublishBadge(data.publishVerdictBadge || '🟡 VERIFICATION PENDING');
        if (data.lastReport) {
          setReport(data.lastReport);
        }
        if (data.lastMetaResults) {
          setMetaResults(data.lastMetaResults);
        }
      }
    } catch (err) {
      console.warn('[TwoAgent UI] Error fetching verification status from backend:', err);
    }
  }, []);

  // Fetch snapshots from backend
  const fetchSnapshots = useCallback(async () => {
    try {
      const res = await fetch('/api/dev/snapshots', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.snapshots)) {
          setSnapshots(data.snapshots);
        }
      }
    } catch (err) {
      console.warn('[TwoAgent UI] Error fetching snapshots from backend:', err);
    }
  }, []);

  useEffect(() => {
    fetchBackendStatus();
    fetchSnapshots();
  }, [fetchBackendStatus, fetchSnapshots]);

  const toggleGateExpand = (gateId: string) => {
    setExpandedGates((prev) => ({ ...prev, [gateId]: !prev[gateId] }));
  };

  // Trigger backend execution of the full 13-gate verification suite
  const handleRunFullVerification = async () => {
    setIsRunning(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const res = await fetch('/api/dev/verification/run-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskDescription: activeManifest ? activeManifest.requestedFeature : 'Full Portal Independent Verification Run',
          manifest: activeManifest || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
        setStatusText(data.status);
        setEngineState(data.engineState);
        setPublishStatus(data.publishStatus);
        setPublishBadge(data.publishVerdictBadge || data.publishBadge);
        setActionSuccessMsg(`Backend execution complete. Final Acceptance: ${data.status}`);
      } else {
        setStatusText(data.status || 'VERIFICATION_BLOCKED');
        setEngineState('VERIFICATION_BLOCKED');
        setPublishStatus('DO NOT PUBLISH');
        setPublishBadge('🟣 VERIFICATION BLOCKED');
        setActionErrorMsg(data.error?.message || 'Verification runner failed on backend execution');
      }

      await fetchSnapshots();
    } catch (err: any) {
      console.error('[TwoAgent UI] Error triggering verification on backend:', err);
      setStatusText('VERIFICATION_BLOCKED');
      setEngineState('VERIFICATION_BLOCKED');
      setPublishStatus('DO NOT PUBLISH');
      setPublishBadge('🟣 VERIFICATION BLOCKED');
      setActionErrorMsg(`Backend runner network error: ${err?.message || 'Failed to reach server'}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Trigger backend execution of the meta-test suite
  const handleRunMetaTest = async () => {
    setIsRunning(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const res = await fetch('/api/dev/verification/run-meta-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (data.success && data.metaResults) {
        setMetaResults(data.metaResults);
        setActionSuccessMsg(data.metaResults.summary);
      } else {
        setActionErrorMsg(data.error?.message || 'Meta-test execution failed on backend');
      }

      await fetchBackendStatus();
      await fetchSnapshots();
    } catch (err: any) {
      console.error('[TwoAgent UI] Error running meta-tests:', err);
      setActionErrorMsg(`Meta-test error: ${err?.message || 'Failed to reach server'}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Create snapshot on backend
  const handleCreateSnapshot = async () => {
    const desc = window.prompt('Enter snapshot description:', `Manual Snapshot ${new Date().toLocaleTimeString()}`);
    if (!desc) return;

    try {
      const res = await fetch('/api/dev/snapshots/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: desc,
          createdBy: 'USER',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(`Snapshot ${data.snapshot.snapshotId} created successfully on backend!`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
        await fetchSnapshots();
      } else {
        setActionErrorMsg(data.error?.message || 'Failed to create snapshot');
      }
    } catch (err: any) {
      setActionErrorMsg(`Snapshot creation error: ${err?.message}`);
    }
  };

  // Rollback to snapshot on backend
  const handleRollback = async (snapId: string) => {
    if (!window.confirm(`Are you sure you want to rollback to snapshot ${snapId}? This will revert recent state changes on the backend.`)) {
      return;
    }

    try {
      const res = await fetch('/api/dev/snapshots/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: snapId }),
      });

      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(`Rollback to ${snapId} succeeded! Post-rollback health check PASSED.`);
        setTimeout(() => setActionSuccessMsg(null), 5000);
        await fetchBackendStatus();
        await fetchSnapshots();
      } else {
        setActionErrorMsg(`Rollback failed: ${data.error || data.error?.message}`);
      }
    } catch (err: any) {
      setActionErrorMsg(`Rollback error: ${err?.message}`);
    }
  };

  // Submit manifest & trigger Agent 2 verification cycle on backend
  const handleCreateManifestAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeatureName.trim()) return;

    const files = newExpectedFiles.split(',').map((s) => s.trim()).filter(Boolean);
    setIsRunning(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const res = await fetch('/api/dev/verification/agent1-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedFeature: newFeatureName,
          userPrompt: `Implement ${newFeatureName}`,
          expectedFiles: files,
          actualModifiedFiles: files,
        }),
      });

      const data = await res.json();
      if (data.success && data.verificationCycle) {
        setActiveManifest(data.handoff?.manifest || null);
        setReport(data.verificationCycle.report);
        setStatusText(data.status || data.verificationCycle.report.finalAcceptanceStatus);
        setEngineState(data.engineState || data.verificationCycle.engineState);
        setPublishStatus(data.publishStatus);
        setPublishBadge(data.publishVerdictBadge);
        setActionSuccessMsg(`Agent 1 manifest submitted & Agent 2 verification evaluated on backend.`);
        setNewFeatureName('');
        setActiveSubTab('pipeline');
      } else {
        setActionErrorMsg(data.error?.message || 'Agent handoff execution failed on backend');
      }

      await fetchSnapshots();
    } catch (err: any) {
      setActionErrorMsg(`Agent handoff error: ${err?.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Copy formatted report from backend state
  const handleCopyReport = () => {
    if (report?.rawFormattedReport) {
      navigator.clipboard.writeText(report.rawFormattedReport);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  // Export report as TXT
  const handleDownloadReport = () => {
    if (!report?.rawFormattedReport) return;
    const blob = new Blob([report.rawFormattedReport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Implementation_Verification_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isVerifiedAndPublishReady = statusText === 'VERIFIED' && publishStatus === 'PUBLISH-READY';
  const isBlocked = statusText === 'VERIFICATION_BLOCKED' || engineState === 'VERIFICATION_BLOCKED';
  const isPending = statusText === 'VERIFICATION_PENDING' || engineState === 'VERIFICATION_PENDING';

  return (
    <div className="card-3d p-6 rounded-3xl space-y-6 border border-slate-300 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-2xl">
      {/* Authoritative Backend Control Surface Identity Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 dark:bg-indigo-950/60 dark:border-indigo-800 px-3.5 py-1 text-xs font-black text-indigo-900 dark:text-indigo-200">
              <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Agent 1 (Implementer) ⇄ Agent 2 (Independent Verifier)</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-[11px] font-black text-emerald-900 dark:text-emerald-200">
              <Server className="h-3.5 w-3.5 text-emerald-600" />
              <span>Backend Execution Layer Authoritative</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-black text-slate-700 dark:text-slate-300">
              <Lock className="h-3.5 w-3.5 text-slate-500" />
              <span>Manual Overrides Blocked</span>
            </div>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Two-Agent Verification & Acceptance Engine
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium max-w-3xl">
            Control Surface Only: All 13 gates, change-scope checks, and publication decisions execute strictly through the application's actual backend/development execution layer and/or <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-bold">npm run verify</code>.
          </p>
        </div>

        {/* Machine-Enforced Authoritative Backend State Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 border shadow-sm ${
              isVerifiedAndPublishReady
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700'
                : isRunning
                ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-700 animate-pulse'
                : isBlocked
                ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-700'
                : isPending
                ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700'
                : 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700'
            }`}
          >
            <Activity className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            <span>STATE: {statusText}</span>
          </div>

          <div
            className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 border shadow-sm ${
              isVerifiedAndPublishReady
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            <span>{publishBadge}</span>
          </div>

          <button
            type="button"
            onClick={handleRunFullVerification}
            disabled={isRunning}
            className="btn-3d-indigo py-2.5 px-4 text-xs font-black gap-2 shadow-md"
          >
            <Play className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Executing on Backend...' : 'Run All 13 Gates (Backend)'}</span>
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {actionErrorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-2">
          <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveSubTab('pipeline')}
          className={`px-4 py-2 font-black rounded-xl transition-all flex items-center gap-2 ${
            activeSubTab === 'pipeline'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Backend Verification Pipeline (Gates 0-12)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('report')}
          className={`px-4 py-2 font-black rounded-xl transition-all flex items-center gap-2 ${
            activeSubTab === 'report'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck className="h-3.5 w-3.5" />
          <span>Authoritative Implementation Report</span>
          {report && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20">
              {report.publishVerdictBadge}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('snapshots')}
          className={`px-4 py-2 font-black rounded-xl transition-all flex items-center gap-2 ${
            activeSubTab === 'snapshots'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Safe Snapshots ({snapshots.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('metatest')}
          className={`px-4 py-2 font-black rounded-xl transition-all flex items-center gap-2 ${
            activeSubTab === 'metatest'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Architecture Meta-Tests</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('manifest')}
          className={`px-4 py-2 font-black rounded-xl transition-all flex items-center gap-2 ${
            activeSubTab === 'manifest'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCode className="h-3.5 w-3.5" />
          <span>Declare Change Scope Manifest</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: VERIFICATION PIPELINE DASHBOARD (GATES 0 - 12) */}
      {/* ========================================================================= */}
      {activeSubTab === 'pipeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="text-xs space-y-1">
              <span className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>13-Gate Independent Execution Matrix</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold">
                  SERVER-SIDE EXECUTED
                </span>
              </span>
              <p className="text-slate-500 text-[11px]">
                Deterministic server-side execution of Unit, Feature, Live API, Adversarial, Persistence, Scope, and Runner Health gates.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunFullVerification}
              disabled={isRunning}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${isRunning ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isRunning ? 'Running...' : 'Execute Suite'}</span>
            </button>
          </div>

          {/* Gate Cards Grid */}
          <div className="space-y-3">
            {report ? (
              Object.values(report.gates).map((gate) => {
                const isExpanded = !!expandedGates[gate.gateId];
                const isPass = gate.status === 'PASS';
                const isGateBlocked = gate.status === 'BLOCKED';

                return (
                  <div
                    key={gate.gateId}
                    className={`rounded-2xl border transition-all ${
                      isPass
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                        : isGateBlocked
                        ? 'border-purple-300 bg-purple-50/40 dark:bg-purple-950/20'
                        : 'border-rose-300 bg-rose-50/40 dark:bg-rose-950/20'
                    }`}
                  >
                    <div
                      onClick={() => toggleGateExpand(gate.gateId)}
                      className="p-4 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        {isPass ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        ) : isGateBlocked ? (
                          <ShieldAlert className="h-5 w-5 text-purple-600 shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-slate-500">
                              GATE {gate.gateNumber}:
                            </span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {gate.gateName}
                            </span>
                            {gate.gateId === 'GATE_0_RUNNER_HEALTH' && (
                              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] font-bold">
                                WATCHDOG GATE
                              </span>
                            )}
                            {gate.gateId === 'GATE_12_ACCEPTANCE_GATE' && (
                              <span className="bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded text-[10px] font-bold">
                                MACHINE-ENFORCED GATE
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">{gate.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-[11px]">
                          <span className="font-black text-slate-800 dark:text-slate-200">
                            {gate.passCount}/{gate.tests.length} PASS
                          </span>
                          <span className="text-slate-400 block text-[10px]">
                            {gate.durationMs}ms
                          </span>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                            isPass
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isGateBlocked
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {gate.status}
                        </span>

                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Test Items Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-200/60 dark:border-slate-800/80 space-y-2">
                        {gate.tests.map((test) => (
                          <div
                            key={test.testId}
                            className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-slate-500">
                                  [{test.testId}]
                                </span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {test.description}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  test.status === 'PASS'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {test.status}
                              </span>
                            </div>
                            <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/80 p-2 rounded-lg break-all">
                              {test.evidence}
                            </p>
                            {test.error && (
                              <p className="text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg">
                                Error: {test.error}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
                <ShieldCheck className="h-8 w-8 text-amber-500 mx-auto" />
                <div className="space-y-1">
                  <div className="text-xs font-black text-amber-900 dark:text-amber-300">
                    STATUS: VERIFICATION_PENDING
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    Agent 2 has not yet executed independent verification tests on this build. Status remains <strong className="text-rose-600">DO NOT PUBLISH</strong> until the backend verification engine completes all 13 mandatory gates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunFullVerification}
                  disabled={isRunning}
                  className="btn-3d-indigo py-2 px-5 text-xs font-bold"
                >
                  {isRunning ? 'Running Verification on Backend...' : 'Execute Full Backend Verification'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: IMPLEMENTATION VERIFICATION REPORT */}
      {/* ========================================================================= */}
      {activeSubTab === 'report' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Authoritative Backend Implementation Verification Report</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                /api/dev/verification/report
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyReport}
                disabled={!report}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1"
              >
                {copySuccess ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copySuccess ? 'Copied!' : 'Copy Report'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadReport}
                disabled={!report}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export (.txt)</span>
              </button>
            </div>
          </div>

          {report ? (
            <div className="p-4 rounded-2xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto shadow-inner border border-slate-800 space-y-4">
              <pre className="whitespace-pre-wrap leading-relaxed">{report.rawFormattedReport}</pre>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 space-y-2">
              <div className="font-bold text-amber-600">VERIFICATION_PENDING</div>
              <p>No backend verification run has completed for this build yet. Run verification on the backend to compile the official acceptance report.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SAFE SNAPSHOTS & ROLLBACK */}
      {/* ========================================================================= */}
      {activeSubTab === 'snapshots' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="text-xs space-y-1">
              <span className="font-black text-slate-800 dark:text-slate-200">
                Safe Snapshot & Rollback Archive
              </span>
              <p className="text-slate-500 text-[11px]">
                Server-side point-in-time state snapshots created prior to code changes. Enables instantaneous rollback with automatic post-recovery health check.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCreateSnapshot}
              className="btn-3d-indigo py-2 px-4 text-xs font-bold flex items-center gap-1.5"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Create Snapshot (Backend)</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {snapshots.length > 0 ? (
              snapshots.map((snap) => (
                <div
                  key={snap.snapshotId}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {snap.snapshotId}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                        {snap.createdBy}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(snap.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{snap.description}</p>
                    <p className="text-[11px] text-slate-500">
                      Tracked {snap.filesSummary.totalFilesTracked} files: {snap.filesSummary.fileKeys.slice(0, 3).join(', ')}...
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRollback(snap.snapshotId)}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restore Snapshot</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="p-6 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500">
                No snapshots stored on backend. Click "Create Snapshot" to record a baseline snapshot.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ARCHITECTURE META-TESTS */}
      {/* ========================================================================= */}
      {activeSubTab === 'metatest' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="text-xs space-y-1">
              <span className="font-black text-slate-800 dark:text-slate-200">
                Self-Verification Meta-Test Studio (Backend Executed)
              </span>
              <p className="text-slate-500 text-[11px]">
                Validates that Agent 2 and the Acceptance Gate strictly block publication on runner failures, scope violations, regressions, and timeouts.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunMetaTest}
              disabled={isRunning}
              className="btn-3d-indigo py-2 px-4 text-xs font-bold flex items-center gap-1.5"
            >
              <Sparkles className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Running Meta-Tests...' : 'Execute Meta-Tests (Backend)'}</span>
            </button>
          </div>

          {metaResults ? (
            <div className="space-y-3">
              <div
                className={`p-4 rounded-2xl border font-bold text-xs flex items-center gap-2 ${
                  metaResults.passed
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                {metaResults.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />}
                <span>{metaResults.summary}</span>
              </div>

              <div className="space-y-2.5">
                {Array.isArray(metaResults.scenarios) && metaResults.scenarios.map((sc) => (
                  <div
                    key={sc.scenarioId}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-500">[{sc.scenarioId}]</span>
                        <span className="font-black text-slate-900 dark:text-white">{sc.scenarioName}</span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          sc.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sc.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400">{sc.description}</p>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                      <div><strong>Fault Injected:</strong> {sc.simulatedFault}</div>
                      <div><strong>Expected Result:</strong> {sc.expectedOutcome}</div>
                      <div><strong>Actual Evidence:</strong> {sc.evidence}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 space-y-2">
              <Sparkles className="h-6 w-6 text-indigo-500 mx-auto" />
              <p>Click "Execute Meta-Tests (Backend)" to run simulated failure scenarios against the verification engine.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CHANGE SCOPE MANIFEST CREATOR */}
      {/* ========================================================================= */}
      {activeSubTab === 'manifest' && (
        <div className="space-y-4">
          <form onSubmit={handleCreateManifestAndSubmit} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileCode className="h-4 w-4 text-indigo-600" />
              <span>Declare Agent 1 Change Scope Manifest & Trigger Agent 2</span>
            </h4>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Requested Feature / Task Name:
              </label>
              <input
                type="text"
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
                placeholder="e.g., Update NCERT Thumbnail Rendering Cache"
                className="input-3d-recessed w-full px-4 py-2 font-bold text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Expected Files to Modify (Comma Separated):
              </label>
              <input
                type="text"
                value={newExpectedFiles}
                onChange={(e) => setNewExpectedFiles(e.target.value)}
                className="input-3d-recessed w-full px-4 py-2 font-bold text-slate-900 dark:text-white font-mono text-[11px]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isRunning}
              className="btn-3d-indigo py-2.5 px-6 font-black text-xs flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              <span>{isRunning ? 'Submitting & Verifying...' : 'Submit Manifest & Run Agent 2 Independent Verification (Backend)'}</span>
            </button>
          </form>

          {activeManifest && (
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-indigo-950 dark:text-indigo-200">
                  Active Manifest: {activeManifest.manifestId}
                </span>
                <span className="bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                  {activeManifest.declaredBy}
                </span>
              </div>
              <p className="font-bold text-slate-800 dark:text-slate-200">{activeManifest.requestedFeature}</p>
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                Declared Scope: {activeManifest.expectedFiles.join(', ')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
