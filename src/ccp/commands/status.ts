import { existsSync, readFileSync } from 'node:fs';
import { type SessionStatus, makeSessionStatus } from '../artifacts/session-status';
import { taskStatePath } from '../task-paths';
import type { TaskState } from '../task-state-machine';
import { getCurrentTaskId } from './shared/current-task';

export async function runStatus(args: {
  repoRoot: string;
  taskId?: string;
}): Promise<SessionStatus | null> {
  const taskId = args.taskId ?? getCurrentTaskId(args.repoRoot);
  if (!taskId) return null;

  const statePath = taskStatePath(args.repoRoot, taskId);
  if (!existsSync(statePath)) return null;

  const stateRecord = JSON.parse(readFileSync(statePath, 'utf-8')) as { state?: string };
  // Cast to TaskState: state.json is written by the state machine, so the value
  // will always be a valid TaskState. If somehow it isn't, we fall back to
  // 'COMPLETED' as a safe placeholder (read-only path, no mutation risk).
  const currentState = (stateRecord.state ?? 'COMPLETED') as TaskState;

  return makeSessionStatus({
    taskId,
    currentState,
    currentStep: '—',
    // v1 placeholder: riskTier is not yet persisted in state.json; cast is safe
    // because this is a read-only display path and 'low' is the safest default.
    riskTier: 'low',
    pendingApprovals: [],
    lastMeaningfulEvent: null,
    nextAction: deriveNextAction(currentState),
  });
}

function deriveNextAction(state: TaskState): string {
  switch (state) {
    case 'NEW_IDEA':
      return 'run /grill <idea>';
    case 'GRILLING':
      return 'answer questions or type "done"';
    case 'SHARED_UNDERSTANDING':
      return 'run /plan';
    case 'PLANNING':
      return 'wait for plan to be drafted';
    case 'AWAITING_PLAN_APPROVAL':
      return 'approve / reject / modify';
    case 'EXECUTING':
      return 'wait or watch progress';
    case 'AWAITING_TOOL_APPROVAL':
      return 'approve or deny tool call';
    case 'VERIFYING':
      return 'wait';
    case 'AWAITING_HUMAN_REVIEW':
      return 'run /remember or close';
    case 'PERSISTING_KNOWLEDGE':
      return 'approve each capture';
    case 'COMPLETED':
      return 'task done — start a new one';
    case 'FAILED_RECOVERABLE':
      return 'fix and run /run --resume';
    case 'FAILED_BLOCKED':
      return 'replan or /abort';
    case 'ABORTED':
      return 'task aborted — start a new one';
  }
}
