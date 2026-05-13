import { emitAndProject } from '../../../core/projector';
import {
  buildTaskAbortedEvent,
  buildTaskCompletedEvent,
  buildTaskCreatedEvent,
  buildTaskStateTransitionEvent,
} from '../../ccp-events';
import { type TaskState, transitionTask } from '../../task-state-machine';
import { emitPolicyDecision } from './policy-decision-writer';
import { requireTaskState, writeTaskState } from './task-loader';

interface TaskLifecyclePolicy {
  subjectName: string;
  actionRequested: string;
  allowReason?: string;
  blockReasonCode?: string;
  source?: string;
}

export interface TransitionTaskLifecycleArgs {
  repoRoot: string;
  sessionId: string;
  taskId: string;
  allowedFrom: ReadonlyArray<TaskState>;
  to: TaskState;
  triggeredBy: string;
  policy?: TaskLifecyclePolicy;
}

export interface TransitionTaskLifecycleResult {
  from: TaskState;
  to: TaskState;
  transitioned: boolean;
}

export interface PreparedTaskLifecycleTransition extends TransitionTaskLifecycleResult {
  commit(): TransitionTaskLifecycleResult;
}

export interface CreateTaskLifecycleArgs {
  repoRoot: string;
  sessionId: string;
  taskId: string;
  goal: string;
  userType: 'developer' | 'mixed' | 'non_developer';
}

export interface CompleteTaskLifecycleArgs {
  repoRoot: string;
  sessionId: string;
  taskId: string;
  allowedFrom: ReadonlyArray<TaskState>;
  triggeredBy: string;
}

export interface AbortTaskLifecycleArgs extends CompleteTaskLifecycleArgs {
  reason: string;
}

export function createTaskLifecycle(args: CreateTaskLifecycleArgs): void {
  emitAndProject(
    args.repoRoot,
    args.sessionId,
    buildTaskCreatedEvent({
      sessionId: args.sessionId,
      taskId: args.taskId,
      goal: args.goal,
      userType: args.userType,
    }),
  );
  writeTaskState(args.repoRoot, args.taskId, 'NEW_IDEA', args.sessionId);
}

export function prepareTaskLifecycleTransition(
  args: TransitionTaskLifecycleArgs,
): PreparedTaskLifecycleTransition {
  let from: TaskState;
  try {
    from = requireTaskState(args.repoRoot, args.taskId, [...args.allowedFrom]) as TaskState;
    if (from !== args.to) {
      transitionTask(from, args.to);
    }
  } catch (e) {
    if (args.policy !== undefined) {
      emitPolicyDecision(args.repoRoot, args.sessionId, {
        taskId: args.taskId,
        subjectType: 'phase_transition',
        subjectName: args.policy.subjectName,
        actionRequested: args.policy.actionRequested,
        decision: 'block',
        reasonCode: args.policy.blockReasonCode ?? 'wrong_state',
        reason: (e as Error).message,
        source: args.policy.source ?? 'command_handler',
      });
    }
    throw e;
  }

  if (args.policy !== undefined) {
    emitPolicyDecision(args.repoRoot, args.sessionId, {
      taskId: args.taskId,
      subjectType: 'phase_transition',
      subjectName: args.policy.subjectName,
      actionRequested: args.policy.actionRequested,
      decision: 'allow',
      reasonCode: 'state_ok',
      reason: args.policy.allowReason ?? `state in ${args.allowedFrom.join(' | ')}`,
      source: args.policy.source ?? 'command_handler',
    });
  }

  let committed = false;
  const result = { from, to: args.to, transitioned: from !== args.to };
  return {
    ...result,
    commit(): TransitionTaskLifecycleResult {
      if (committed) {
        throw new Error(`task transition already committed: ${from} -> ${args.to}`);
      }
      committed = true;
      if (!result.transitioned) {
        return result;
      }

      emitAndProject(
        args.repoRoot,
        args.sessionId,
        buildTaskStateTransitionEvent({
          sessionId: args.sessionId,
          taskId: args.taskId,
          from,
          to: args.to,
          triggeredBy: args.triggeredBy,
        }),
      );
      writeTaskState(args.repoRoot, args.taskId, args.to);

      return result;
    },
  };
}

export function transitionTaskLifecycle(
  args: TransitionTaskLifecycleArgs,
): TransitionTaskLifecycleResult {
  return prepareTaskLifecycleTransition(args).commit();
}

export function completeTaskLifecycle(
  args: CompleteTaskLifecycleArgs,
): TransitionTaskLifecycleResult {
  const result = transitionTaskLifecycle({
    repoRoot: args.repoRoot,
    sessionId: args.sessionId,
    taskId: args.taskId,
    allowedFrom: args.allowedFrom,
    to: 'COMPLETED',
    triggeredBy: args.triggeredBy,
  });
  emitAndProject(
    args.repoRoot,
    args.sessionId,
    buildTaskCompletedEvent({ sessionId: args.sessionId, taskId: args.taskId }),
  );
  return result;
}

export function abortTaskLifecycle(args: AbortTaskLifecycleArgs): TransitionTaskLifecycleResult {
  const result = transitionTaskLifecycle({
    repoRoot: args.repoRoot,
    sessionId: args.sessionId,
    taskId: args.taskId,
    allowedFrom: args.allowedFrom,
    to: 'ABORTED',
    triggeredBy: args.triggeredBy,
  });
  emitAndProject(
    args.repoRoot,
    args.sessionId,
    buildTaskAbortedEvent({
      sessionId: args.sessionId,
      taskId: args.taskId,
      reason: args.reason,
    }),
  );
  return result;
}
