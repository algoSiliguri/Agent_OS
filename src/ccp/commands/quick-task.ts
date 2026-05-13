import { emitAndProject } from '../../core/projector';
import type { UiAdapter } from '../../pi/ui';
import { makeEnvelope } from '../artifacts/envelope';
import { writeArtifact } from '../artifacts/io';
import { buildQuickTaskCompletedEvent, buildQuickTaskStartedEvent } from '../ccp-events';
import { allocateNextTaskId } from '../task-id';
import { taskArtifactPath } from '../task-paths';
import { setCurrentTaskId } from './shared/current-task';
import {
  abortTaskLifecycle,
  createTaskLifecycle,
  transitionTaskLifecycle,
} from './shared/task-lifecycle';

export interface QuickTaskArgs {
  repoRoot: string;
  sessionId: string;
  taskSummary: string;
  ui: UiAdapter;
}

export type QuickTaskStatus = 'PASS_QUICK' | 'FAIL' | 'ESCALATED_TO_FULL_WORKFLOW';

export interface QuickTaskResult {
  taskId: string;
  artifactPath: string;
  status: QuickTaskStatus;
}

export async function runQuickTask(args: QuickTaskArgs): Promise<QuickTaskResult> {
  const taskId = allocateNextTaskId(args.repoRoot);
  setCurrentTaskId(args.repoRoot, taskId);

  createTaskLifecycle({
    repoRoot: args.repoRoot,
    sessionId: args.sessionId,
    taskId,
    goal: args.taskSummary,
    userType: 'developer',
  });

  // Escalation check before any edits
  const escalate = await args.ui.select(
    `[${taskId}] /quick-task: Does this change touch shared interfaces, migrations, public API, or >3 files?`,
    ['no — proceed with quick-task', 'yes — escalate to full workflow'],
  );

  if (escalate.startsWith('yes')) {
    transitionTaskLifecycle({
      repoRoot: args.repoRoot,
      sessionId: args.sessionId,
      taskId,
      allowedFrom: ['NEW_IDEA'],
      to: 'QUICK_TASKING',
      triggeredBy: '/quick-task (escalated)',
    });
    emitAndProject(
      args.repoRoot,
      args.sessionId,
      buildQuickTaskStartedEvent({ sessionId: args.sessionId, taskId }),
    );

    const env = makeEnvelope({ taskId, artifactType: 'QuickTaskRecord' });
    writeArtifact(args.repoRoot, taskId, 'quick-task', {
      ...env,
      artifact_type: 'QuickTaskRecord',
      task_summary: args.taskSummary,
      files_changed: [],
      verification_command: '',
      status: 'ESCALATED_TO_FULL_WORKFLOW',
      escalation_reason: 'Scope exceeds quick-task bounds — use /grill to start full workflow',
    });

    emitAndProject(
      args.repoRoot,
      args.sessionId,
      buildQuickTaskCompletedEvent({
        sessionId: args.sessionId,
        taskId,
        status: 'ESCALATED_TO_FULL_WORKFLOW',
        filesChanged: 0,
      }),
    );
    abortTaskLifecycle({
      repoRoot: args.repoRoot,
      sessionId: args.sessionId,
      taskId,
      allowedFrom: ['QUICK_TASKING'],
      triggeredBy: '/quick-task (escalated → aborted)',
      reason: 'quick task escalated to full workflow',
    });

    return {
      taskId,
      artifactPath: taskArtifactPath(args.repoRoot, taskId, 'quick-task'),
      status: 'ESCALATED_TO_FULL_WORKFLOW',
    };
  }

  transitionTaskLifecycle({
    repoRoot: args.repoRoot,
    sessionId: args.sessionId,
    taskId,
    allowedFrom: ['NEW_IDEA'],
    to: 'QUICK_TASKING',
    triggeredBy: '/quick-task',
  });
  emitAndProject(
    args.repoRoot,
    args.sessionId,
    buildQuickTaskStartedEvent({ sessionId: args.sessionId, taskId }),
  );

  const filesRaw = await args.ui.input(
    `[${taskId}] Which files were changed? (comma-separated paths)`,
  );
  const filesChanged = filesRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const verificationCommand = await args.ui.input(
    `[${taskId}] Verification command (e.g. npm test, or press enter to skip):`,
  );

  const statusChoice = await args.ui.select(`[${taskId}] Outcome?`, ['PASS_QUICK', 'FAIL']);
  const status = statusChoice as 'PASS_QUICK' | 'FAIL';

  const env = makeEnvelope({ taskId, artifactType: 'QuickTaskRecord' });
  writeArtifact(args.repoRoot, taskId, 'quick-task', {
    ...env,
    artifact_type: 'QuickTaskRecord',
    task_summary: args.taskSummary,
    files_changed: filesChanged,
    verification_command: verificationCommand,
    status,
  });

  emitAndProject(
    args.repoRoot,
    args.sessionId,
    buildQuickTaskCompletedEvent({
      sessionId: args.sessionId,
      taskId,
      status,
      filesChanged: filesChanged.length,
    }),
  );

  const nextState = status === 'PASS_QUICK' ? 'AWAITING_HUMAN_REVIEW' : 'FAILED_RECOVERABLE';
  transitionTaskLifecycle({
    repoRoot: args.repoRoot,
    sessionId: args.sessionId,
    taskId,
    allowedFrom: ['QUICK_TASKING'],
    to: nextState,
    triggeredBy: `/quick-task (${status})`,
  });

  return {
    taskId,
    artifactPath: taskArtifactPath(args.repoRoot, taskId, 'quick-task'),
    status,
  };
}
