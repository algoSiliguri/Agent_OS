import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  abortTaskLifecycle,
  completeTaskLifecycle,
  createTaskLifecycle,
  prepareTaskLifecycleTransition,
  transitionTaskLifecycle,
} from '../../../../../src/ccp/commands/shared/task-lifecycle';
import { writeTaskState } from '../../../../../src/ccp/commands/shared/task-loader';
import { taskStatePath } from '../../../../../src/ccp/task-paths';
import { readEvents } from '../../../../../src/core/event-log';
import { sessionEventsPath } from '../../../../../src/core/runtime-paths';

function fixture(taskId = 'T-001'): { dir: string; taskId: string } {
  const dir = mkdtempSync(join(tmpdir(), 'aos-tlc-'));
  mkdirSync(join(dir, '.agent-os', 'runtime'), { recursive: true });
  mkdirSync(join(dir, '.agent-os', 'tasks', taskId), { recursive: true });
  return { dir, taskId };
}

describe('task-lifecycle', () => {
  it('creates a task event and initial NEW_IDEA state with session binding', () => {
    const { dir, taskId } = fixture();

    createTaskLifecycle({
      repoRoot: dir,
      sessionId: 's1',
      taskId,
      goal: 'ship lifecycle Module',
      userType: 'developer',
    });

    const state = JSON.parse(readFileSync(taskStatePath(dir, taskId), 'utf-8'));
    expect(state.state).toBe('NEW_IDEA');
    expect(state.session_id).toBe('s1');
    const events = readEvents(sessionEventsPath(dir, 's1'));
    expect(events).toHaveLength(1);
    expect(events[0]!.event_type).toBe('TASK_CREATED');
    expect(events[0]!.payload.goal).toBe('ship lifecycle Module');
  });

  it('validates, emits policy, projects transition, and writes task state', () => {
    const { dir, taskId } = fixture();
    writeTaskState(dir, taskId, 'AWAITING_PLAN_APPROVAL');

    const result = transitionTaskLifecycle({
      repoRoot: dir,
      sessionId: 's1',
      taskId,
      allowedFrom: ['AWAITING_PLAN_APPROVAL'],
      to: 'EXECUTING',
      triggeredBy: '/run',
      policy: {
        subjectName: '/run',
        actionRequested: 'enter EXECUTING',
      },
    });

    expect(result).toEqual({
      from: 'AWAITING_PLAN_APPROVAL',
      to: 'EXECUTING',
      transitioned: true,
    });
    expect(JSON.parse(readFileSync(taskStatePath(dir, taskId), 'utf-8')).state).toBe('EXECUTING');
    const events = readEvents(sessionEventsPath(dir, 's1'));
    expect(events.map((event) => event.event_type)).toEqual([
      'POLICY_DECISION',
      'TASK_STATE_TRANSITION',
    ]);
    expect(events[0]!.payload.decision).toBe('allow');
    expect(events[1]!.payload.from).toBe('AWAITING_PLAN_APPROVAL');
    expect(events[1]!.payload.to).toBe('EXECUTING');
  });

  it('emits a block policy and preserves state when the current state is not allowed', () => {
    const { dir, taskId } = fixture();
    writeTaskState(dir, taskId, 'GRILLING');

    expect(() =>
      transitionTaskLifecycle({
        repoRoot: dir,
        sessionId: 's1',
        taskId,
        allowedFrom: ['AWAITING_PLAN_APPROVAL'],
        to: 'EXECUTING',
        triggeredBy: '/run',
        policy: {
          subjectName: '/run',
          actionRequested: 'enter EXECUTING',
        },
      }),
    ).toThrow(/AWAITING_PLAN_APPROVAL/);

    expect(JSON.parse(readFileSync(taskStatePath(dir, taskId), 'utf-8')).state).toBe('GRILLING');
    const events = readEvents(sessionEventsPath(dir, 's1'));
    expect(events).toHaveLength(1);
    expect(events[0]!.event_type).toBe('POLICY_DECISION');
    expect(events[0]!.payload.decision).toBe('block');
    expect(events[0]!.payload.reason_code).toBe('wrong_state');
  });

  it('allows already-in-target entry without emitting a duplicate transition', () => {
    const { dir, taskId } = fixture();
    writeTaskState(dir, taskId, 'VERIFYING');

    const result = transitionTaskLifecycle({
      repoRoot: dir,
      sessionId: 's1',
      taskId,
      allowedFrom: ['VERIFYING', 'AWAITING_HUMAN_REVIEW', 'FAILED_RECOVERABLE'],
      to: 'VERIFYING',
      triggeredBy: '/verify',
      policy: {
        subjectName: '/verify',
        actionRequested: 'enter VERIFYING',
      },
    });

    expect(result).toEqual({ from: 'VERIFYING', to: 'VERIFYING', transitioned: false });
    const events = readEvents(sessionEventsPath(dir, 's1'));
    expect(events.map((event) => event.event_type)).toEqual(['POLICY_DECISION']);
    expect(events[0]!.payload.decision).toBe('allow');
  });

  it('can authorize a transition before committing the state mutation', () => {
    const { dir, taskId } = fixture();
    writeTaskState(dir, taskId, 'AWAITING_PLAN_APPROVAL');

    const prepared = prepareTaskLifecycleTransition({
      repoRoot: dir,
      sessionId: 's1',
      taskId,
      allowedFrom: ['AWAITING_PLAN_APPROVAL'],
      to: 'EXECUTING',
      triggeredBy: '/run',
      policy: {
        subjectName: '/run',
        actionRequested: 'enter EXECUTING',
      },
    });

    expect(prepared.transitioned).toBe(true);
    expect(JSON.parse(readFileSync(taskStatePath(dir, taskId), 'utf-8')).state).toBe(
      'AWAITING_PLAN_APPROVAL',
    );
    expect(readEvents(sessionEventsPath(dir, 's1')).map((event) => event.event_type)).toEqual([
      'POLICY_DECISION',
    ]);

    prepared.commit();

    expect(JSON.parse(readFileSync(taskStatePath(dir, taskId), 'utf-8')).state).toBe('EXECUTING');
    expect(readEvents(sessionEventsPath(dir, 's1')).map((event) => event.event_type)).toEqual([
      'POLICY_DECISION',
      'TASK_STATE_TRANSITION',
    ]);
  });

  it('completes a task by transitioning state before emitting TASK_COMPLETED', () => {
    const { dir, taskId } = fixture();
    writeTaskState(dir, taskId, 'PERSISTING_KNOWLEDGE');

    const result = completeTaskLifecycle({
      repoRoot: dir,
      sessionId: 's1',
      taskId,
      allowedFrom: ['PERSISTING_KNOWLEDGE'],
      triggeredBy: '/remember (done)',
    });

    expect(result).toEqual({
      from: 'PERSISTING_KNOWLEDGE',
      to: 'COMPLETED',
      transitioned: true,
    });
    expect(JSON.parse(readFileSync(taskStatePath(dir, taskId), 'utf-8')).state).toBe('COMPLETED');
    const events = readEvents(sessionEventsPath(dir, 's1'));
    expect(events.map((event) => event.event_type)).toEqual([
      'TASK_STATE_TRANSITION',
      'TASK_COMPLETED',
    ]);
    expect(events[0]!.payload.to).toBe('COMPLETED');
  });

  it('aborts a task by transitioning state before emitting TASK_ABORTED', () => {
    const { dir, taskId } = fixture();
    writeTaskState(dir, taskId, 'QUICK_TASKING');

    const result = abortTaskLifecycle({
      repoRoot: dir,
      sessionId: 's1',
      taskId,
      allowedFrom: ['QUICK_TASKING'],
      triggeredBy: '/quick-task (escalated → aborted)',
      reason: 'quick task escalated to full workflow',
    });

    expect(result).toEqual({
      from: 'QUICK_TASKING',
      to: 'ABORTED',
      transitioned: true,
    });
    expect(JSON.parse(readFileSync(taskStatePath(dir, taskId), 'utf-8')).state).toBe('ABORTED');
    const events = readEvents(sessionEventsPath(dir, 's1'));
    expect(events.map((event) => event.event_type)).toEqual([
      'TASK_STATE_TRANSITION',
      'TASK_ABORTED',
    ]);
    expect(events[1]!.payload.reason).toBe('quick task escalated to full workflow');
  });
});
