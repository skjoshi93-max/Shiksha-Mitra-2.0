/**
 * Agent 1 - Implementation Agent
 * Responsibilities:
 * 1. Receive user requirement.
 * 2. Analyze scope & create explicit Change Scope Manifest.
 * 3. Take pre-modification Safe Snapshot.
 * 4. Apply changes.
 * 5. Run basic syntax / build checks.
 * 6. Hand off to Agent 2 with status "Implementation complete; verification pending."
 * 
 * STRICT RULE: Agent 1 MUST NEVER self-approve or declare changes "verified" or "publish-ready".
 */

import { ChangeScopeManifest, SafeSnapshotRecord } from './twoAgentTypes';
import { SafeSnapshotManager } from './safeSnapshotManager';

export interface Agent1HandoffPayload {
  manifest: ChangeScopeManifest;
  snapshot: SafeSnapshotRecord;
  preCheckPassed: boolean;
  statusMessage: string;
  timestamp: string;
}

export class Agent1Implementer {
  /**
   * Initialize a new change request with an explicit Change Scope Manifest
   */
  public static createChangeScopeManifest(params: {
    requestedFeature: string;
    userPrompt: string;
    expectedFiles: string[];
    expectedModules?: string[];
    expectedRoutes?: string[];
    expectedServices?: string[];
    expectedDataChanges?: string[];
  }): ChangeScopeManifest {
    const timestamp = new Date().toISOString();
    const manifestId = `CSM-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const manifest: ChangeScopeManifest = {
      manifestId,
      requestedFeature: params.requestedFeature,
      userPrompt: params.userPrompt,
      expectedFiles: params.expectedFiles,
      expectedModules: params.expectedModules || [],
      expectedRoutes: params.expectedRoutes || [],
      expectedServices: params.expectedServices || [],
      expectedDataChanges: params.expectedDataChanges || [],
      declaredBy: 'AGENT_1_IMPLEMENTER',
      createdAt: timestamp,
      actualModifiedFiles: [...params.expectedFiles],
      scopeViolationDetected: false,
    };

    console.log(`[Agent 1 - Implementer] 📝 Created Change Scope Manifest: ${manifestId} for "${params.requestedFeature}"`);
    return manifest;
  }

  /**
   * Execute pre-modification snapshot and prepare handoff to Agent 2
   */
  public static prepareHandoff(params: {
    manifest: ChangeScopeManifest;
    actualModifiedFiles?: string[];
    preCheckSyntaxPassed: boolean;
  }): Agent1HandoffPayload {
    // 1. Take Safe Snapshot
    const snapshot = SafeSnapshotManager.createSnapshot({
      description: `Pre-modification snapshot for task: ${params.manifest.requestedFeature}`,
      manifestId: params.manifest.manifestId,
      filesTracked: params.manifest.expectedFiles,
      createdBy: 'AGENT_1',
    });

    // 2. Attach actual modified files
    if (params.actualModifiedFiles) {
      params.manifest.actualModifiedFiles = params.actualModifiedFiles;
    }

    // 3. Status rule: Agent 1 MUST ONLY state "Implementation complete; verification pending."
    const statusMessage = 'Implementation complete; verification pending.';

    console.log(`[Agent 1 - Implementer] 🤝 Handoff prepared: "${statusMessage}". Transferred to Agent 2.`);

    return {
      manifest: params.manifest,
      snapshot,
      preCheckPassed: params.preCheckSyntaxPassed,
      statusMessage,
      timestamp: new Date().toISOString(),
    };
  }
}
