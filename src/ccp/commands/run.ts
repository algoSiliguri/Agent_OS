import { eventLogPath } from '../../core/runtime-paths';
// src/ccp/commands/run.ts
import { appendJsonlEventAtomic } from '../../core/session-store';
import { makeEnvelope } from '../artifacts/envelope';
import { readArtifact, writeArtifact } from '../artifacts/io';
import {
  buildCommandCompletedEvent,
  buildCommandFailedEvent,
  buildCommandStartedEvent,
  buildTaskStateTransitionEvent,
} from '../ccp-events';
import type { StepExecutionResult, StepExecutor } from './shared/step-executor';
import { requireTaskState, writeTaskState } from './shared/task-loader';

export interface RunArgs {
  repoRoot: string;
  sessionId: string;
  taskId: string;
  executor: StepExecutor;
  resume?: boolean;
}

export type RunOutcome = 'verifying' | 'failed_recoverable' | 'failed_blocked';

export async function runRun(args: RunArgs): Promise<{ outcome: RunOutcome }> {
  const allowedPre = args.resume ? ['FAILED_RECOVERABLE'] : ['AWAITING_PLAN_APPROVAL'];
  requireTaskState(args.repoRoot, args.taskId, allowedPre);
  const log = eventLogPath(args.repoRoot);

  const plan = readArtifact(args.repoRoot, args.taskId, 'plan') as unknown as {
    steps: Array<{
      id: string;
      commands: Array<{ command: string; approval_tier: 1 | 2 | 3 | 4 }>;
      expected_files: Array<{ path: string; operation: 'read' | 'create' | 'modify' | 'delete' }>;
    }>;
    artifact_id: string;
  };

  let priorSteps: Array<StepExecutionResult & { step_id: string }> = [];
  let startedAt = new Date().toISOString();
  if (args.resume) {
    const existing = readArtifact(args.repoRoot, args.taskId, 'execution') as unknown as {
      started_at: string;
      steps: Array<StepExecutionResult & { step_id: string }>;
    };
    priorSteps = existing.steps.filter((s) => s.status === 'completed');
    startedAt = existing.started_at;
  }

  appendJsonlEventAtomic(
    log,
    buildTaskStateTransitionEvent({
      sessionId: args.sessionId,
      taskId: args.taskId,
      from: args.resume ? 'FAILED_RECOVERABLE' : 'AWAITING_PLAN_APPROVAL',
      to: 'EXECUTING',
      triggeredBy: args.resume ? '/run --resume' : '/run',
    }),
  );
  writeTaskState(args.repoRoot, args.taskId, 'EXECUTING');

  const completed = new Set(priorSteps.map((s) => s.step_id));
  const collectedSteps: Array<StepExecutionResult & { step_id: string }> = [...priorSteps];
  let outcome: RunOutcome = 'verifying';

  for (const step of plan.steps) {
    if (completed.has(step.id)) continue;

    appendJsonlEventAtomic(
      log,
      buildCommandStartedEvent({
        sessionId: args.sessionId,
        taskId: args.taskId,
        stepId: step.id,
        command: step.commands[0]?.command ?? '(no command)',
      }),
    );

    const result = await args.executor.executeStep({ stepId: step.id, step });
    collectedSteps.push({ ...result, step_id: step.id });

    if (result.status === 'completed') {
      appendJsonlEventAtomic(
        log,
        buildCommandCompletedEvent({
          sessionId: args.sessionId,
          taskId: args.taskId,
          stepId: step.id,
          command: step.commands[0]?.command ?? '(no command)',
          exitCode: 0,
        }),
      );
      continue;
    }

    appendJsonlEventAtomic(
      log,
      buildCommandFailedEvent({
        sessionId: args.sessionId,
        taskId: args.taskId,
        stepId: step.id,
        exitCode: 1,
        summary: result.failure?.summary ?? 'step failed',
      }),
    );
    outcome = result.failure?.recoverable === false ? 'failed_blocked' : 'failed_recoverable';
    break;
  }

  const env = makeEnvelope({ taskId: args.taskId, artifactType: 'ExecutionRecord' });
  writeArtifact(args.repoRoot, args.taskId, 'execution', {
    ...env,
    artifact_type: 'ExecutionRecord',
    plan_id: plan.artifact_id,
    harness: 'pi',
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    steps: collectedSteps,
    final_state:
      outcome === 'verifying'
        ? 'VERIFYING'
        : outcome === 'failed_recoverable'
          ? 'FAILED_RECOVERABLE'
          : 'FAILED_BLOCKED',
  });

  if (outcome === 'verifying') {
    appendJsonlEventAtomic(
      log,
      buildTaskStateTransitionEvent({
        sessionId: args.sessionId,
        taskId: args.taskId,
        from: 'EXECUTING',
        to: 'VERIFYING',
        triggeredBy: '/run (steps complete)',
      }),
    );
    writeTaskState(args.repoRoot, args.taskId, 'VERIFYING');
  } else if (outcome === 'failed_recoverable') {
    appendJsonlEventAtomic(
      log,
      buildTaskStateTransitionEvent({
        sessionId: args.sessionId,
        taskId: args.taskId,
        from: 'EXECUTING',
        to: 'FAILED_RECOVERABLE',
        triggeredBy: '/run (step failed)',
      }),
    );
    writeTaskState(args.repoRoot, args.taskId, 'FAILED_RECOVERABLE');
  } else {
    appendJsonlEventAtomic(
      log,
      buildTaskStateTransitionEvent({
        sessionId: args.sessionId,
        taskId: args.taskId,
        from: 'EXECUTING',
        to: 'FAILED_BLOCKED',
        triggeredBy: '/run (unrecoverable)',
      }),
    );
    writeTaskState(args.repoRoot, args.taskId, 'FAILED_BLOCKED');
  }

  return { outcome };
}
